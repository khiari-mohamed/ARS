import shap
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from typing import Dict, List, Any
import logging

logger = logging.getLogger(__name__)

class ExplainableAI:
    def __init__(self):
        self.explainer = None
        self.model = None
        self.feature_names = None
    
    def explain_sla_prediction(self, features: np.ndarray, feature_names: List[str]) -> Dict[str, Any]:
        """Explain SLA prediction using SHAP values"""
        try:
            # Create a simple model for SLA prediction explanation
            # In production, use your actual trained model
            if self.model is None:
                self.model = RandomForestClassifier(n_estimators=50, random_state=42)
                # Create dummy training data for demonstration
                dummy_X = np.random.rand(100, len(feature_names))
                dummy_y = np.random.randint(0, 3, 100)  # 0: low risk, 1: medium, 2: high
                self.model.fit(dummy_X, dummy_y)
                self.explainer = shap.TreeExplainer(self.model)
                self.feature_names = feature_names
            
            # Get SHAP values
            shap_values = self.explainer.shap_values(features.reshape(1, -1))
            
            # Get prediction
            prediction = self.model.predict(features.reshape(1, -1))[0]
            prediction_proba = self.model.predict_proba(features.reshape(1, -1))[0]
            
            # Create explanation
            explanation = {
                'prediction': int(prediction),
                'prediction_probability': float(prediction_proba[prediction]),
                'risk_level': ['Low', 'Medium', 'High'][prediction],
                'feature_importance': {},
                'shap_values': {},
                'top_factors': []
            }
            
            # Feature importance from model
            for i, (name, importance) in enumerate(zip(feature_names, self.model.feature_importances_)):
                explanation['feature_importance'][name] = float(importance)
            
            # SHAP values for each class
            for class_idx, class_name in enumerate(['Low Risk', 'Medium Risk', 'High Risk']):
                explanation['shap_values'][class_name] = {}
                for i, name in enumerate(feature_names):
                    explanation['shap_values'][class_name][name] = float(shap_values[class_idx][0][i])
            
            # Top contributing factors for the predicted class
            shap_for_prediction = shap_values[prediction][0]
            feature_contributions = list(zip(feature_names, shap_for_prediction, features))
            feature_contributions.sort(key=lambda x: abs(x[1]), reverse=True)
            
            for name, shap_val, feature_val in feature_contributions[:5]:
                explanation['top_factors'].append({
                    'feature': name,
                    'value': float(feature_val),
                    'contribution': float(shap_val),
                    'impact': 'increases' if shap_val > 0 else 'decreases'
                })
            
            return explanation
            
        except Exception as e:
            logger.error(f"Error in SLA explanation: {e}")
            return {'error': str(e)}
    
    def explain_priority_scoring(self, priority_data: Dict) -> Dict[str, Any]:
        """Explain priority scoring decisions"""
        try:
            factors = {
                'sla_urgency': priority_data.get('sla_urgency', 0),
                'volume': priority_data.get('volume', 1),
                'client_importance': priority_data.get('client_importance', 1),
                'days_left': priority_data.get('days_left', 0)
            }
            
            # Calculate weights used in priority calculation
            weights = {
                'sla_urgency': 2.0,
                'volume': 1.0,
                'client_importance': 1.5,
                'deadline_urgency': 1.0
            }
            
            deadline_urgency = max(0, 10 - factors['days_left'])
            
            # Calculate contributions
            contributions = {
                'sla_urgency': factors['sla_urgency'] * weights['sla_urgency'],
                'volume': factors['volume'] * weights['volume'],
                'client_importance': factors['client_importance'] * weights['client_importance'],
                'deadline_urgency': deadline_urgency * weights['deadline_urgency']
            }
            
            total_score = sum(contributions.values())
            
            # Calculate percentages
            percentages = {k: (v / total_score * 100) if total_score > 0 else 0 
                          for k, v in contributions.values()}
            
            explanation = {
                'total_priority_score': total_score,
                'factor_contributions': contributions,
                'factor_percentages': percentages,
                'ranking_factors': [
                    {
                        'factor': 'SLA Urgency',
                        'value': factors['sla_urgency'],
                        'weight': weights['sla_urgency'],
                        'contribution': contributions['sla_urgency'],
                        'percentage': percentages['sla_urgency']
                    },
                    {
                        'factor': 'Volume',
                        'value': factors['volume'],
                        'weight': weights['volume'],
                        'contribution': contributions['volume'],
                        'percentage': percentages['volume']
                    },
                    {
                        'factor': 'Client Importance',
                        'value': factors['client_importance'],
                        'weight': weights['client_importance'],
                        'contribution': contributions['client_importance'],
                        'percentage': percentages['client_importance']
                    },
                    {
                        'factor': 'Deadline Urgency',
                        'value': deadline_urgency,
                        'weight': weights['deadline_urgency'],
                        'contribution': contributions['deadline_urgency'],
                        'percentage': percentages['deadline_urgency']
                    }
                ]
            }
            
            # Sort by contribution
            explanation['ranking_factors'].sort(key=lambda x: x['contribution'], reverse=True)
            
            return explanation
            
        except Exception as e:
            logger.error(f"Error in priority explanation: {e}")
            return {'error': str(e)}

# Global explainer instance
explainer = ExplainableAI()