import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import logging
from collections import defaultdict, deque
import json
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import IsolationForest
import asyncio
from database import get_db_manager

logger = logging.getLogger(__name__)

class EnhancedPatternRecognition:
    def __init__(self):
        self.pattern_cache = {}
        self.anomaly_detector = IsolationForest(contamination=0.1, random_state=42)
        self.performance_patterns = defaultdict(list)
        self.process_patterns = defaultdict(list)
        self.learning_buffer = deque(maxlen=1000)
        
    async def analyze_performance_patterns(self, performance_data: List[Dict]) -> Dict:
        """Enhanced performance pattern analysis with continuous learning"""
        try:
            if not performance_data:
                return {'patterns': [], 'insights': [], 'recommendations': []}
            
            # Convert to DataFrame for analysis
            df = pd.DataFrame(performance_data)
            
            # Detect performance anomalies
            anomalies = await self.detect_performance_anomalies(df)
            
            # Identify performance clusters
            clusters = await self.identify_performance_clusters(df)
            
            # Generate insights from patterns
            insights = await self.generate_performance_insights(df, anomalies, clusters)
            
            # Create actionable recommendations
            recommendations = await self.create_performance_recommendations(insights)
            
            # Learn from this analysis
            await self.learn_from_performance_analysis(performance_data, insights)
            
            return {
                'patterns': clusters,
                'anomalies': anomalies,
                'insights': insights,
                'recommendations': recommendations,
                'confidence': self.calculate_analysis_confidence(df, anomalies, clusters)
            }
            
        except Exception as e:
            logger.error(f"Performance pattern analysis failed: {e}")
            return {'patterns': [], 'insights': [], 'recommendations': []}
    
    async def detect_performance_anomalies(self, df: pd.DataFrame) -> List[Dict]:
        """Detect performance anomalies using machine learning"""
        try:
            if len(df) < 3:
                return []
            
            # Prepare features for anomaly detection
            features = []
            if 'actual' in df.columns:
                features.append('actual')
            if 'expected' in df.columns:
                features.append('expected')
            if 'processing_time' in df.columns:
                features.append('processing_time')
            
            if not features:
                return []
            
            # Scale features
            scaler = StandardScaler()
            X = scaler.fit_transform(df[features].fillna(0))
            
            # Detect anomalies
            anomaly_labels = self.anomaly_detector.fit_predict(X)
            
            anomalies = []
            for idx, label in enumerate(anomaly_labels):
                if label == -1:  # Anomaly detected
                    anomaly_data = df.iloc[idx].to_dict()
                    anomalies.append({
                        'user_id': anomaly_data.get('user_id', f'user_{idx}'),
                        'user_name': anomaly_data.get('user_name', 'Unknown'),
                        'anomaly_type': self.classify_anomaly_type(anomaly_data),
                        'severity': self.calculate_anomaly_severity(anomaly_data),
                        'details': anomaly_data,
                        'recommendations': self.get_anomaly_recommendations(anomaly_data)
                    })
            
            return anomalies
            
        except Exception as e:
            logger.error(f"Anomaly detection failed: {e}")
            return []
    
    async def identify_performance_clusters(self, df: pd.DataFrame) -> List[Dict]:
        """Identify performance clusters using DBSCAN"""
        try:
            if len(df) < 3:
                return []
            
            # Prepare clustering features
            features = ['actual', 'expected']
            available_features = [f for f in features if f in df.columns]
            
            if not available_features:
                return []
            
            # Scale features
            scaler = StandardScaler()
            X = scaler.fit_transform(df[available_features].fillna(0))
            
            # Perform clustering
            clustering = DBSCAN(eps=0.5, min_samples=2)
            cluster_labels = clustering.fit_predict(X)
            
            # Analyze clusters
            clusters = []
            unique_labels = set(cluster_labels)
            
            for label in unique_labels:
                if label == -1:  # Noise points
                    continue
                
                cluster_mask = cluster_labels == label
                cluster_data = df[cluster_mask]
                
                cluster_info = {
                    'cluster_id': int(label),
                    'size': len(cluster_data),
                    'avg_performance': float(cluster_data['actual'].mean()) if 'actual' in cluster_data.columns else 0,
                    'performance_range': {
                        'min': float(cluster_data['actual'].min()) if 'actual' in cluster_data.columns else 0,
                        'max': float(cluster_data['actual'].max()) if 'actual' in cluster_data.columns else 0
                    },
                    'members': cluster_data[['user_id', 'user_name']].to_dict('records') if 'user_id' in cluster_data.columns else [],
                    'characteristics': self.analyze_cluster_characteristics(cluster_data)
                }
                
                clusters.append(cluster_info)
            
            return sorted(clusters, key=lambda x: x['avg_performance'], reverse=True)
            
        except Exception as e:
            logger.error(f"Clustering failed: {e}")
            return []
    
    def classify_anomaly_type(self, data: Dict) -> str:
        """Classify the type of performance anomaly"""
        actual = data.get('actual', 0)
        expected = data.get('expected', 0)
        
        if actual < expected * 0.7:
            return 'underperformance'
        elif actual > expected * 1.3:
            return 'overperformance'
        elif data.get('processing_time', 0) > 5:
            return 'slow_processing'
        else:
            return 'general_anomaly'
    
    def calculate_anomaly_severity(self, data: Dict) -> str:
        """Calculate severity of anomaly"""
        actual = data.get('actual', 0)
        expected = data.get('expected', 0)
        
        if expected > 0:
            deviation = abs(actual - expected) / expected
            if deviation > 0.5:
                return 'high'
            elif deviation > 0.3:
                return 'medium'
            else:
                return 'low'
        
        return 'medium'
    
    def get_anomaly_recommendations(self, data: Dict) -> List[str]:
        """Get recommendations for handling anomaly"""
        anomaly_type = self.classify_anomaly_type(data)
        
        recommendations = {
            'underperformance': [
                'Provide additional training',
                'Review workload distribution',
                'Check for process bottlenecks'
            ],
            'overperformance': [
                'Analyze best practices',
                'Consider for mentoring role',
                'Increase workload capacity'
            ],
            'slow_processing': [
                'Optimize process workflow',
                'Check system performance',
                'Provide efficiency training'
            ],
            'general_anomaly': [
                'Monitor closely',
                'Investigate root causes',
                'Adjust expectations if needed'
            ]
        }
        
        return recommendations.get(anomaly_type, ['Monitor and investigate'])
    
    async def generate_performance_insights(self, df: pd.DataFrame, anomalies: List[Dict], clusters: List[Dict]) -> List[Dict]:
        """Generate actionable insights from performance analysis"""
        insights = []
        
        try:
            # Overall performance insight
            if 'actual' in df.columns and 'expected' in df.columns:
                avg_actual = df['actual'].mean()
                avg_expected = df['expected'].mean()
                performance_ratio = avg_actual / avg_expected if avg_expected > 0 else 1
                
                insights.append({
                    'type': 'overall_performance',
                    'title': 'Performance Overview',
                    'description': f'Average performance is {performance_ratio:.1%} of expected levels',
                    'impact': 'high' if abs(performance_ratio - 1) > 0.2 else 'medium',
                    'metric_value': performance_ratio,
                    'recommendation': 'Focus on underperforming areas' if performance_ratio < 0.9 else 'Maintain current performance'
                })
            
            # Anomaly insights
            if anomalies:
                high_severity_count = sum(1 for a in anomalies if a['severity'] == 'high')
                insights.append({
                    'type': 'anomaly_detection',
                    'title': 'Performance Anomalies Detected',
                    'description': f'{len(anomalies)} anomalies found, {high_severity_count} high severity',
                    'impact': 'high' if high_severity_count > 0 else 'medium',
                    'metric_value': len(anomalies),
                    'recommendation': 'Address high severity anomalies immediately'
                })
            
            # Cluster insights
            if clusters:
                best_cluster = max(clusters, key=lambda x: x['avg_performance'])
                worst_cluster = min(clusters, key=lambda x: x['avg_performance'])
                
                performance_gap = best_cluster['avg_performance'] - worst_cluster['avg_performance']
                
                insights.append({
                    'type': 'performance_distribution',
                    'title': 'Performance Distribution Analysis',
                    'description': f'Performance gap of {performance_gap:.1f} points between best and worst performing groups',
                    'impact': 'high' if performance_gap > 20 else 'medium',
                    'metric_value': performance_gap,
                    'recommendation': 'Share best practices from top performers with underperforming groups'
                })
            
            return insights
            
        except Exception as e:
            logger.error(f"Insight generation failed: {e}")
            return []
    
    async def create_performance_recommendations(self, insights: List[Dict]) -> List[Dict]:
        """Create actionable recommendations based on insights"""
        recommendations = []
        
        try:
            for insight in insights:
                if insight['impact'] == 'high':
                    if insight['type'] == 'overall_performance':
                        if insight['metric_value'] < 0.8:
                            recommendations.append({
                                'priority': 'urgent',
                                'category': 'performance_improvement',
                                'title': 'Critical Performance Gap',
                                'description': 'Overall performance is significantly below expectations',
                                'actions': [
                                    'Conduct immediate performance review',
                                    'Identify and address root causes',
                                    'Implement performance improvement plan'
                                ],
                                'expected_impact': 'Improve overall performance by 15-25%',
                                'timeframe': '2-4 weeks'
                            })
                    
                    elif insight['type'] == 'anomaly_detection':
                        recommendations.append({
                            'priority': 'high',
                            'category': 'anomaly_resolution',
                            'title': 'Address Performance Anomalies',
                            'description': 'Multiple performance anomalies require attention',
                            'actions': [
                                'Investigate anomaly root causes',
                                'Provide targeted support to affected users',
                                'Monitor for pattern recurrence'
                            ],
                            'expected_impact': 'Reduce performance variability by 30%',
                            'timeframe': '1-2 weeks'
                        })
                    
                    elif insight['type'] == 'performance_distribution':
                        recommendations.append({
                            'priority': 'medium',
                            'category': 'knowledge_sharing',
                            'title': 'Implement Best Practice Sharing',
                            'description': 'Large performance gaps indicate opportunity for knowledge transfer',
                            'actions': [
                                'Document best practices from top performers',
                                'Organize knowledge sharing sessions',
                                'Implement mentoring program'
                            ],
                            'expected_impact': 'Reduce performance gap by 40%',
                            'timeframe': '4-6 weeks'
                        })
            
            return sorted(recommendations, key=lambda x: {'urgent': 3, 'high': 2, 'medium': 1}.get(x['priority'], 0), reverse=True)
            
        except Exception as e:
            logger.error(f"Recommendation creation failed: {e}")
            return []
    
    def analyze_cluster_characteristics(self, cluster_data: pd.DataFrame) -> Dict:
        """Analyze characteristics of a performance cluster"""
        try:
            characteristics = {}
            
            if 'role' in cluster_data.columns:
                role_distribution = cluster_data['role'].value_counts().to_dict()
                characteristics['role_distribution'] = role_distribution
                characteristics['dominant_role'] = cluster_data['role'].mode().iloc[0] if not cluster_data['role'].mode().empty else 'Unknown'
            
            if 'actual' in cluster_data.columns:
                characteristics['performance_stats'] = {
                    'mean': float(cluster_data['actual'].mean()),
                    'std': float(cluster_data['actual'].std()),
                    'median': float(cluster_data['actual'].median())
                }
            
            return characteristics
            
        except Exception as e:
            logger.error(f"Cluster analysis failed: {e}")
            return {}
    
    def calculate_analysis_confidence(self, df: pd.DataFrame, anomalies: List[Dict], clusters: List[Dict]) -> float:
        """Calculate confidence in the analysis results"""
        try:
            confidence_factors = []
            
            # Sample size factor
            sample_size = len(df)
            size_confidence = min(1.0, sample_size / 20)  # Full confidence with 20+ samples
            confidence_factors.append(size_confidence)
            
            # Data quality factor
            if 'actual' in df.columns and 'expected' in df.columns:
                non_null_ratio = (df[['actual', 'expected']].notna().all(axis=1)).mean()
                confidence_factors.append(non_null_ratio)
            
            # Pattern consistency factor
            if clusters:
                cluster_sizes = [c['size'] for c in clusters]
                consistency = 1.0 - (np.std(cluster_sizes) / np.mean(cluster_sizes)) if cluster_sizes else 0.5
                confidence_factors.append(max(0.3, consistency))
            
            return float(np.mean(confidence_factors)) if confidence_factors else 0.5
            
        except Exception as e:
            logger.error(f"Confidence calculation failed: {e}")
            return 0.5
    
    async def learn_from_performance_analysis(self, performance_data: List[Dict], insights: List[Dict]):
        """Learn from performance analysis for continuous improvement"""
        try:
            learning_record = {
                'timestamp': datetime.now().isoformat(),
                'data_size': len(performance_data),
                'insights_generated': len(insights),
                'analysis_type': 'performance_pattern_recognition'
            }
            
            self.learning_buffer.append(learning_record)
            
            # Save to database for long-term learning
            db = await get_db_manager()
            if db:
                await db.save_ai_output(
                    'pattern_recognition_performance',
                    {'performance_data': performance_data},
                    {'insights': insights, 'learning_record': learning_record},
                    'system',
                    self.calculate_analysis_confidence(pd.DataFrame(performance_data), [], [])
                )
            
        except Exception as e:
            logger.error(f"Learning from analysis failed: {e}")
    
    async def process_anomalies(self, process_data: List[Dict]) -> Dict:
        """Process anomaly detection for real-time monitoring"""
        try:
            if not process_data:
                return {'anomalies': [], 'patterns': [], 'recommendations': []}
            
            # Convert to DataFrame
            df = pd.DataFrame(process_data)
            
            # Detect processing anomalies
            anomalies = []
            
            for idx, row in df.iterrows():
                processing_time = row.get('processing_time', 0)
                event_type = row.get('event_type', 'unknown')
                
                # Define normal processing time ranges by event type
                normal_ranges = {
                    'bordereau.created': (0, 2),
                    'bordereau.updated': (0, 1),
                    'sla.breach': (0, 0.5),
                    'ov.created': (0, 3)
                }
                
                normal_range = normal_ranges.get(event_type, (0, 5))
                
                if processing_time > normal_range[1] * 2:  # 2x normal time
                    anomalies.append({
                        'event_type': event_type,
                        'processing_time': processing_time,
                        'expected_range': normal_range,
                        'severity': 'high' if processing_time > normal_range[1] * 5 else 'medium',
                        'timestamp': row.get('timestamp', datetime.now().isoformat()),
                        'recommendations': [
                            'Check system resources',
                            'Review process efficiency',
                            'Monitor for recurring issues'
                        ]
                    })
            
            return {
                'anomalies': anomalies,
                'patterns': await self.identify_process_patterns(df),
                'recommendations': await self.generate_process_recommendations(anomalies)
            }
            
        except Exception as e:
            logger.error(f"Process anomaly detection failed: {e}")
            return {'anomalies': [], 'patterns': [], 'recommendations': []}
    
    async def identify_process_patterns(self, df: pd.DataFrame) -> List[Dict]:
        """Identify patterns in process data"""
        try:
            patterns = []
            
            # Time-based patterns
            if 'timestamp' in df.columns:
                df['hour'] = pd.to_datetime(df['timestamp']).dt.hour
                hourly_counts = df.groupby('hour').size()
                
                peak_hour = hourly_counts.idxmax()
                peak_count = hourly_counts.max()
                
                patterns.append({
                    'type': 'temporal',
                    'description': f'Peak activity at hour {peak_hour} with {peak_count} events',
                    'peak_hour': int(peak_hour),
                    'peak_count': int(peak_count)
                })
            
            # Event type patterns
            if 'event_type' in df.columns:
                event_counts = df['event_type'].value_counts()
                
                patterns.append({
                    'type': 'event_distribution',
                    'description': f'Most common event: {event_counts.index[0]} ({event_counts.iloc[0]} occurrences)',
                    'distribution': event_counts.to_dict()
                })
            
            return patterns
            
        except Exception as e:
            logger.error(f"Process pattern identification failed: {e}")
            return []
    
    async def generate_process_recommendations(self, anomalies: List[Dict]) -> List[Dict]:
        """Generate recommendations based on process anomalies"""
        try:
            recommendations = []
            
            if not anomalies:
                return recommendations
            
            high_severity_count = sum(1 for a in anomalies if a['severity'] == 'high')
            
            if high_severity_count > 0:
                recommendations.append({
                    'priority': 'urgent',
                    'title': 'Critical Process Performance Issues',
                    'description': f'{high_severity_count} high-severity processing anomalies detected',
                    'actions': [
                        'Investigate system performance immediately',
                        'Check for resource bottlenecks',
                        'Review recent system changes'
                    ]
                })
            
            # Group anomalies by event type
            event_anomalies = defaultdict(list)
            for anomaly in anomalies:
                event_anomalies[anomaly['event_type']].append(anomaly)
            
            for event_type, event_anomaly_list in event_anomalies.items():
                if len(event_anomaly_list) > 1:
                    recommendations.append({
                        'priority': 'medium',
                        'title': f'Recurring Issues with {event_type}',
                        'description': f'{len(event_anomaly_list)} anomalies detected for {event_type} events',
                        'actions': [
                            f'Optimize {event_type} processing',
                            'Review event handling logic',
                            'Consider process redesign'
                        ]
                    })
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Process recommendation generation failed: {e}")
            return []

# Global instance
enhanced_pattern_recognition = EnhancedPatternRecognition()