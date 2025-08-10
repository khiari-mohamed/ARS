import numpy as np
import pandas as pd
from sklearn.cluster import DBSCAN, KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from sklearn.ensemble import IsolationForest
from sklearn.neighbors import LocalOutlierFactor
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from collections import Counter, defaultdict
import logging
from typing import Dict, List, Any, Tuple
from datetime import datetime, timedelta
import re

logger = logging.getLogger(__name__)

class RecurringIssueDetector:
    def __init__(self):
        self.vectorizer = None
        self.clusters = None
        self.cluster_model = None
        
    def preprocess_text(self, text: str) -> str:
        """Preprocess text for pattern analysis"""
        if not text:
            return ""
        
        text = text.lower()
        text = re.sub(r'[^\w\sàâäéèêëïîôöùûüÿç]', ' ', text)
        text = ' '.join(text.split())
        
        return text
    
    def detect_recurring_complaints(self, complaints: List[Dict]) -> Dict[str, Any]:
        """Detect recurring complaint patterns"""
        try:
            if len(complaints) < 3:
                return {'recurring_groups': [], 'summary': 'Insufficient data for pattern detection'}
            
            # Extract and preprocess complaint descriptions
            descriptions = [self.preprocess_text(c.get('description', '')) for c in complaints]
            
            # Vectorize descriptions
            self.vectorizer = TfidfVectorizer(
                max_features=1000,
                ngram_range=(1, 3),
                stop_words='french',
                min_df=2,
                max_df=0.8
            )
            
            tfidf_matrix = self.vectorizer.fit_transform(descriptions)
            
            # Calculate similarity matrix
            similarity_matrix = cosine_similarity(tfidf_matrix)
            
            # Find similar complaints using clustering
            self.cluster_model = DBSCAN(
                eps=0.3,
                min_samples=2,
                metric='precomputed'
            )
            
            # Convert similarity to distance
            distance_matrix = 1 - similarity_matrix
            clusters = self.cluster_model.fit_predict(distance_matrix)
            
            # Group complaints by clusters
            recurring_groups = defaultdict(list)
            for i, cluster_id in enumerate(clusters):
                if cluster_id != -1:  # -1 means noise/outlier
                    recurring_groups[cluster_id].append({
                        'complaint_id': complaints[i].get('id', i),
                        'description': complaints[i].get('description', ''),
                        'date': complaints[i].get('date', datetime.now().isoformat()),
                        'client': complaints[i].get('client', 'Unknown'),
                        'type': complaints[i].get('type', 'General'),
                        'similarity_score': float(np.mean([similarity_matrix[i][j] for j in range(len(complaints)) if clusters[j] == cluster_id and i != j]))
                    })
            
            # Filter groups with at least 2 complaints
            significant_groups = {k: v for k, v in recurring_groups.items() if len(v) >= 2}
            
            # Calculate pattern statistics
            pattern_stats = []
            for group_id, group_complaints in significant_groups.items():
                # Extract common keywords
                group_descriptions = [c['description'] for c in group_complaints]
                group_tfidf = self.vectorizer.transform(group_descriptions)
                feature_names = self.vectorizer.get_feature_names_out()
                
                # Get top keywords for this group
                mean_tfidf = np.mean(group_tfidf.toarray(), axis=0)
                top_indices = np.argsort(mean_tfidf)[-10:][::-1]
                top_keywords = [feature_names[i] for i in top_indices if mean_tfidf[i] > 0]
                
                # Calculate time pattern
                dates = [datetime.fromisoformat(c['date']) for c in group_complaints]
                date_range = (max(dates) - min(dates)).days
                
                pattern_stats.append({
                    'group_id': int(group_id),
                    'complaint_count': len(group_complaints),
                    'complaints': group_complaints,
                    'top_keywords': top_keywords[:5],
                    'date_range_days': date_range,
                    'avg_similarity': float(np.mean([c['similarity_score'] for c in group_complaints])),
                    'clients_affected': len(set(c['client'] for c in group_complaints)),
                    'pattern_strength': 'high' if len(group_complaints) >= 5 else 'medium'
                })
            
            # Sort by complaint count
            pattern_stats.sort(key=lambda x: x['complaint_count'], reverse=True)
            
            return {
                'recurring_groups': pattern_stats,
                'total_groups': len(significant_groups),
                'total_recurring_complaints': sum(len(group) for group in significant_groups.values()),
                'recurrence_rate': sum(len(group) for group in significant_groups.values()) / len(complaints) * 100,
                'summary': f"Detected {len(significant_groups)} recurring patterns affecting {sum(len(group) for group in significant_groups.values())} complaints"
            }
            
        except Exception as e:
            logger.error(f"Recurring issue detection failed: {e}")
            raise
    
    def detect_process_anomalies(self, process_data: List[Dict]) -> Dict[str, Any]:
        """Detect anomalies in process execution"""
        try:
            if len(process_data) < 10:
                return {'anomalies': [], 'summary': 'Insufficient data for anomaly detection'}
            
            # Extract features for anomaly detection
            features = []
            feature_names = ['processing_time', 'steps_count', 'error_count', 'resource_usage', 'complexity_score']
            
            for process in process_data:
                features.append([
                    process.get('processing_time', 0),
                    process.get('steps_count', 0),
                    process.get('error_count', 0),
                    process.get('resource_usage', 0),
                    process.get('complexity_score', 1)
                ])
            
            X = np.array(features)
            
            # Standardize features
            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(X)
            
            # Apply multiple anomaly detection methods
            isolation_forest = IsolationForest(contamination=0.1, random_state=42)
            lof = LocalOutlierFactor(n_neighbors=5, contamination=0.1)
            
            # Get anomaly scores
            iso_scores = isolation_forest.fit_predict(X_scaled)
            iso_anomaly_scores = isolation_forest.score_samples(X_scaled)
            
            lof_scores = lof.fit_predict(X_scaled)
            lof_anomaly_scores = lof.negative_outlier_factor_
            
            # Combine results
            anomalies = []
            for i, (process, iso_score, iso_anomaly, lof_score, lof_anomaly) in enumerate(
                zip(process_data, iso_scores, iso_anomaly_scores, lof_scores, lof_anomaly_scores)
            ):
                if iso_score == -1 or lof_score == -1:  # Anomaly detected
                    anomaly_strength = abs(iso_anomaly) + abs(lof_anomaly)
                    
                    # Identify which features are anomalous
                    feature_deviations = []
                    for j, (feature_name, value) in enumerate(zip(feature_names, features[i])):
                        feature_mean = np.mean(X[:, j])
                        feature_std = np.std(X[:, j])
                        z_score = abs((value - feature_mean) / feature_std) if feature_std > 0 else 0
                        
                        if z_score > 2:  # Significant deviation
                            feature_deviations.append({
                                'feature': feature_name,
                                'value': float(value),
                                'z_score': float(z_score),
                                'deviation_type': 'high' if value > feature_mean else 'low'
                            })
                    
                    anomalies.append({
                        'process_id': process.get('id', i),
                        'anomaly_score': float(anomaly_strength),
                        'severity': 'high' if anomaly_strength > 1.5 else 'medium',
                        'detected_by': ['isolation_forest'] if iso_score == -1 else [] + ['lof'] if lof_score == -1 else [],
                        'feature_deviations': feature_deviations,
                        'process_data': process,
                        'recommendations': self._generate_anomaly_recommendations(feature_deviations)
                    })
            
            # Sort by anomaly score
            anomalies.sort(key=lambda x: x['anomaly_score'], reverse=True)
            
            return {
                'anomalies': anomalies,
                'total_processes': len(process_data),
                'anomaly_count': len(anomalies),
                'anomaly_rate': len(anomalies) / len(process_data) * 100,
                'summary': f"Detected {len(anomalies)} anomalous processes out of {len(process_data)} total processes"
            }
            
        except Exception as e:
            logger.error(f"Process anomaly detection failed: {e}")
            raise
    
    def _generate_anomaly_recommendations(self, feature_deviations: List[Dict]) -> List[str]:
        """Generate recommendations based on anomalous features"""
        recommendations = []
        
        for deviation in feature_deviations:
            feature = deviation['feature']
            deviation_type = deviation['deviation_type']
            
            if feature == 'processing_time':
                if deviation_type == 'high':
                    recommendations.append("Investigate process bottlenecks and optimize workflow")
                else:
                    recommendations.append("Verify process completion - unusually fast processing detected")
            
            elif feature == 'error_count':
                if deviation_type == 'high':
                    recommendations.append("Review error logs and implement error prevention measures")
            
            elif feature == 'resource_usage':
                if deviation_type == 'high':
                    recommendations.append("Optimize resource allocation and check for resource leaks")
                else:
                    recommendations.append("Verify process execution - low resource usage detected")
            
            elif feature == 'complexity_score':
                if deviation_type == 'high':
                    recommendations.append("Consider breaking down complex processes into smaller steps")
        
        return recommendations if recommendations else ["Review process execution for potential issues"]

class TemporalPatternAnalyzer:
    def __init__(self):
        pass
    
    def analyze_temporal_patterns(self, events: List[Dict]) -> Dict[str, Any]:
        """Analyze temporal patterns in events"""
        try:
            if len(events) < 10:
                return {'patterns': [], 'summary': 'Insufficient data for temporal analysis'}
            
            # Convert dates and extract temporal features
            temporal_data = []
            for event in events:
                event_date = datetime.fromisoformat(event['date'])
                temporal_data.append({
                    'event': event,
                    'datetime': event_date,
                    'hour': event_date.hour,
                    'day_of_week': event_date.weekday(),
                    'day_of_month': event_date.day,
                    'month': event_date.month,
                    'quarter': (event_date.month - 1) // 3 + 1
                })
            
            patterns = []
            
            # Hourly patterns
            hourly_counts = Counter(item['hour'] for item in temporal_data)
            peak_hours = [hour for hour, count in hourly_counts.most_common(3)]
            patterns.append({
                'type': 'hourly',
                'pattern': 'Peak activity hours',
                'details': {
                    'peak_hours': peak_hours,
                    'hourly_distribution': dict(hourly_counts),
                    'peak_hour_percentage': hourly_counts[peak_hours[0]] / len(events) * 100 if peak_hours else 0
                }
            })
            
            # Weekly patterns
            weekly_counts = Counter(item['day_of_week'] for item in temporal_data)
            day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
            peak_days = [day_names[day] for day, count in weekly_counts.most_common(2)]
            patterns.append({
                'type': 'weekly',
                'pattern': 'Peak activity days',
                'details': {
                    'peak_days': peak_days,
                    'weekly_distribution': {day_names[day]: count for day, count in weekly_counts.items()},
                    'weekday_vs_weekend': {
                        'weekday': sum(count for day, count in weekly_counts.items() if day < 5),
                        'weekend': sum(count for day, count in weekly_counts.items() if day >= 5)
                    }
                }
            })
            
            # Monthly patterns
            monthly_counts = Counter(item['month'] for item in temporal_data)
            month_names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
            patterns.append({
                'type': 'monthly',
                'pattern': 'Seasonal trends',
                'details': {
                    'monthly_distribution': {month_names[month-1]: count for month, count in monthly_counts.items()},
                    'peak_months': [month_names[month-1] for month, count in monthly_counts.most_common(3)]
                }
            })
            
            # Detect cyclical patterns
            cyclical_patterns = self._detect_cyclical_patterns(temporal_data)
            if cyclical_patterns:
                patterns.extend(cyclical_patterns)
            
            return {
                'patterns': patterns,
                'total_events': len(events),
                'date_range': {
                    'start': min(item['datetime'] for item in temporal_data).isoformat(),
                    'end': max(item['datetime'] for item in temporal_data).isoformat()
                },
                'summary': f"Analyzed {len(events)} events and found {len(patterns)} temporal patterns"
            }
            
        except Exception as e:
            logger.error(f"Temporal pattern analysis failed: {e}")
            raise
    
    def _detect_cyclical_patterns(self, temporal_data: List[Dict]) -> List[Dict]:
        """Detect cyclical patterns in temporal data"""
        patterns = []
        
        # Group events by day and look for recurring patterns
        daily_counts = defaultdict(int)
        for item in temporal_data:
            date_key = item['datetime'].date()
            daily_counts[date_key] += 1
        
        # Convert to time series
        dates = sorted(daily_counts.keys())
        counts = [daily_counts[date] for date in dates]
        
        if len(counts) >= 14:  # Need at least 2 weeks of data
            # Simple cycle detection using autocorrelation
            mean_count = np.mean(counts)
            normalized_counts = [count - mean_count for count in counts]
            
            # Check for weekly cycles (7-day pattern)
            if len(normalized_counts) >= 14:
                weekly_correlation = np.corrcoef(normalized_counts[:-7], normalized_counts[7:])[0, 1]
                if abs(weekly_correlation) > 0.5:
                    patterns.append({
                        'type': 'cyclical',
                        'pattern': 'Weekly cycle detected',
                        'details': {
                            'cycle_length': 7,
                            'correlation': float(weekly_correlation),
                            'strength': 'strong' if abs(weekly_correlation) > 0.7 else 'moderate'
                        }
                    })
        
        return patterns

# Global instances
recurring_detector = RecurringIssueDetector()
temporal_analyzer = TemporalPatternAnalyzer()