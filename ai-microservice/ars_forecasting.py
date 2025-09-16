"""
Real ARS Forecasting and Capacity Planning Module
Transforms generic forecasting into ARS-specific business intelligence
"""

import pandas as pd
import numpy as np
from prophet import Prophet
from datetime import datetime, timedelta
from typing import Dict, List, Any
import logging

logger = logging.getLogger(__name__)

async def generate_client_forecast(historical_data: List[Dict], forecast_days: int, client_name: str) -> Dict:
    """Generate forecast for a specific client using Prophet"""
    try:
        # Prepare data for Prophet
        df_data = []
        for record in historical_data:
            df_data.append({
                'ds': record['reception_date'],
                'y': record['bordereau_count']
            })
        
        df = pd.DataFrame(df_data)
        df['ds'] = pd.to_datetime(df['ds'])
        df = df.sort_values('ds')
        
        # Handle missing dates (fill with 0)
        date_range = pd.date_range(start=df['ds'].min(), end=df['ds'].max(), freq='D')
        df_complete = pd.DataFrame({'ds': date_range})
        df = df_complete.merge(df, on='ds', how='left').fillna(0)
        
        # Create and fit Prophet model
        model = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=True,
            daily_seasonality=False,
            changepoint_prior_scale=0.05,
            seasonality_prior_scale=10.0
        )
        
        # Add custom seasonalities for ARS business patterns
        model.add_seasonality(name='monthly', period=30.5, fourier_order=5)
        
        model.fit(df)
        
        # Create future dataframe
        future = model.make_future_dataframe(periods=forecast_days)
        forecast = model.predict(future)
        
        # Extract forecast results
        forecast_results = []
        for i, row in forecast.tail(forecast_days).iterrows():
            predicted_value = max(0, row['yhat'])  # No negative bordereaux
            lower_bound = max(0, row['yhat_lower'])
            upper_bound = max(0, row['yhat_upper'])
            
            forecast_results.append({
                'date': row['ds'].strftime('%Y-%m-%d'),
                'predicted_bordereaux': int(round(predicted_value)),
                'lower_bound': int(round(lower_bound)),
                'upper_bound': int(round(upper_bound)),
                'confidence_interval': int(round(upper_bound - lower_bound))
            })
        
        # Calculate model accuracy
        historical_predictions = forecast.head(len(df))
        mape = np.mean(np.abs((df['y'] - historical_predictions['yhat']) / np.maximum(df['y'], 1))) * 100
        
        return {
            'client_name': client_name,
            'forecast': forecast_results,
            'model_accuracy': {
                'mape': float(mape),
                'historical_avg': float(df['y'].mean()),
                'forecast_avg': float(np.mean([f['predicted_bordereaux'] for f in forecast_results]))
            },
            'trend_analysis': analyze_forecast_trend(forecast_results)
        }
        
    except Exception as e:
        logger.error(f"Client forecast generation failed: {e}")
        raise

async def calculate_staffing_requirements(client_forecast: Dict, client_name: str, db_manager) -> List[Dict]:
    """Calculate staffing requirements based on forecast"""
    try:
        # Get current agent performance metrics
        agents = await db_manager.get_agent_performance_metrics()
        
        # Calculate average processing capacity per agent
        if agents:
            total_capacity = sum([a.get('total_bordereaux', 0) for a in agents])
            active_agents = len([a for a in agents if a.get('total_bordereaux', 0) > 0])
            avg_capacity_per_agent = total_capacity / max(active_agents, 1) if active_agents > 0 else 5
        else:
            avg_capacity_per_agent = 5  # Default assumption
        
        staffing_reco = []
        
        # Calculate requirements for each forecast day
        for forecast_day in client_forecast['forecast']:
            predicted_load = forecast_day['predicted_bordereaux']
            upper_bound = forecast_day['upper_bound']
            
            # Calculate required agents (use upper bound for safety)
            required_agents_conservative = max(1, int(np.ceil(upper_bound / avg_capacity_per_agent)))
            required_agents_optimistic = max(1, int(np.ceil(predicted_load / avg_capacity_per_agent)))
            
            staffing_reco.append({
                'date': forecast_day['date'],
                'client_name': client_name,
                'predicted_load': predicted_load,
                'required_agents_conservative': required_agents_conservative,
                'required_agents_optimistic': required_agents_optimistic,
                'load_category': categorize_load(predicted_load, client_forecast['model_accuracy']['historical_avg'])
            })
        
        return staffing_reco
        
    except Exception as e:
        logger.error(f"Staffing calculation failed: {e}")
        return []

def aggregate_client_forecasts(client_forecasts: Dict) -> Dict:
    """Aggregate forecasts across all clients"""
    try:
        if not client_forecasts:
            return {'total_forecast': [], 'summary': 'No forecasts available'}
        
        # Get all dates
        all_dates = set()
        for forecast in client_forecasts.values():
            for day in forecast['forecast']:
                all_dates.add(day['date'])
        
        # Aggregate by date
        total_forecast = []
        for date in sorted(all_dates):
            total_predicted = 0
            total_lower = 0
            total_upper = 0
            
            for forecast in client_forecasts.values():
                day_data = next((d for d in forecast['forecast'] if d['date'] == date), None)
                if day_data:
                    total_predicted += day_data['predicted_bordereaux']
                    total_lower += day_data['lower_bound']
                    total_upper += day_data['upper_bound']
            
            total_forecast.append({
                'date': date,
                'total_predicted_bordereaux': total_predicted,
                'total_lower_bound': total_lower,
                'total_upper_bound': total_upper,
                'confidence_interval': total_upper - total_lower
            })
        
        return {
            'total_forecast': total_forecast,
            'summary': f'Aggregated forecast for {len(client_forecasts)} clients over {len(total_forecast)} days'
        }
        
    except Exception as e:
        logger.error(f"Forecast aggregation failed: {e}")
        return {'total_forecast': [], 'error': str(e)}

async def calculate_overall_capacity_gap(staffing_recommendations: List[Dict], db_manager) -> Dict:
    """Calculate overall capacity gap across all clients"""
    try:
        # Get current available agents
        agents = await db_manager.get_agent_performance_metrics()
        available_agents = len([a for a in agents if a.get('last_activity') and 
                              (datetime.now() - a['last_activity']).days < 7])
        
        # Calculate daily requirements
        daily_requirements = {}
        for reco in staffing_recommendations:
            date = reco['date']
            if date not in daily_requirements:
                daily_requirements[date] = {
                    'conservative': 0,
                    'optimistic': 0,
                    'clients': []
                }
            daily_requirements[date]['conservative'] += reco['required_agents_conservative']
            daily_requirements[date]['optimistic'] += reco['required_agents_optimistic']
            daily_requirements[date]['clients'].append(reco['client_name'])
        
        # Calculate gaps
        capacity_analysis = []
        for date, requirements in daily_requirements.items():
            conservative_gap = max(0, requirements['conservative'] - available_agents)
            optimistic_gap = max(0, requirements['optimistic'] - available_agents)
            
            capacity_analysis.append({
                'date': date,
                'available_agents': available_agents,
                'required_conservative': requirements['conservative'],
                'required_optimistic': requirements['optimistic'],
                'gap_conservative': conservative_gap,
                'gap_optimistic': optimistic_gap,
                'utilization_rate': min(1.0, requirements['optimistic'] / max(available_agents, 1)),
                'affected_clients': len(requirements['clients']),
                'risk_level': 'HIGH' if conservative_gap > 2 else 'MEDIUM' if conservative_gap > 0 else 'LOW'
            })
        
        # Summary statistics
        avg_gap_conservative = np.mean([c['gap_conservative'] for c in capacity_analysis])
        max_gap_conservative = max([c['gap_conservative'] for c in capacity_analysis]) if capacity_analysis else 0
        high_risk_days = len([c for c in capacity_analysis if c['risk_level'] == 'HIGH'])
        
        return {
            'daily_analysis': capacity_analysis,
            'summary': {
                'current_available_agents': available_agents,
                'avg_daily_gap': float(avg_gap_conservative),
                'max_daily_gap': int(max_gap_conservative),
                'high_risk_days': high_risk_days,
                'total_forecast_days': len(capacity_analysis)
            },
            'recommendations': generate_capacity_recommendations(capacity_analysis, available_agents)
        }
        
    except Exception as e:
        logger.error(f"Capacity gap calculation failed: {e}")
        return {'error': str(e)}

def analyze_forecast_trend(forecast_results: List[Dict]) -> Dict:
    """Analyze trend in forecast results"""
    try:
        values = [f['predicted_bordereaux'] for f in forecast_results]
        
        if len(values) < 2:
            return {'trend': 'insufficient_data'}
        
        # Simple trend analysis
        first_half = np.mean(values[:len(values)//2])
        second_half = np.mean(values[len(values)//2:])
        
        trend_change = (second_half - first_half) / max(first_half, 1) * 100
        
        if trend_change > 10:
            trend = 'increasing'
        elif trend_change < -10:
            trend = 'decreasing'
        else:
            trend = 'stable'
        
        return {
            'trend': trend,
            'trend_change_percent': float(trend_change),
            'first_half_avg': float(first_half),
            'second_half_avg': float(second_half),
            'volatility': float(np.std(values))
        }
        
    except Exception as e:
        logger.error(f"Trend analysis failed: {e}")
        return {'trend': 'error', 'error': str(e)}

def categorize_load(predicted_load: int, historical_avg: float) -> str:
    """Categorize predicted load relative to historical average"""
    if predicted_load > historical_avg * 1.5:
        return 'HIGH'
    elif predicted_load > historical_avg * 1.2:
        return 'ABOVE_AVERAGE'
    elif predicted_load < historical_avg * 0.8:
        return 'BELOW_AVERAGE'
    elif predicted_load < historical_avg * 0.5:
        return 'LOW'
    else:
        return 'NORMAL'

def generate_capacity_recommendations(capacity_analysis: List[Dict], available_agents: int) -> List[str]:
    """Generate actionable capacity recommendations"""
    recommendations = []
    
    high_risk_days = [c for c in capacity_analysis if c['risk_level'] == 'HIGH']
    medium_risk_days = [c for c in capacity_analysis if c['risk_level'] == 'MEDIUM']
    
    if high_risk_days:
        max_gap = max([c['gap_conservative'] for c in high_risk_days])
        recommendations.append(f'URGENT: Recruter {max_gap} agents supplémentaires pour couvrir les pics de charge')
        recommendations.append('Considérer l\'externalisation temporaire pour les périodes critiques')
    
    if medium_risk_days:
        recommendations.append('Prévoir des heures supplémentaires ou du personnel temporaire')
    
    if len(high_risk_days) > len(capacity_analysis) * 0.3:
        recommendations.append('Revoir la stratégie de capacité à long terme')
    
    avg_utilization = np.mean([c['utilization_rate'] for c in capacity_analysis])
    if avg_utilization > 0.9:
        recommendations.append('Taux d\'utilisation élevé - risque de burnout des équipes')
    
    return recommendations or ['Capacité actuelle suffisante pour la charge prévue']