import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.neighbors import LocalOutlierFactor
from sklearn.svm import OneClassSVM
from sklearn.preprocessing import StandardScaler
from scipy import stats
import logging

logger = logging.getLogger(__name__)

class SophisticatedAnomalyDetection:
    def __init__(self):
        self.models = {
            'isolation_forest': IsolationForest(contamination=0.1, random_state=42),
            'lof': LocalOutlierFactor(contamination=0.1),
            'one_class_svm': OneClassSVM(gamma='scale', nu=0.1)
        }
        self.scaler = StandardScaler()
        
    def detect_performance_anomalies(self, performance_data):
        """Sophisticated anomaly detection for performance data"""
        try:
            if len(performance_data) < 5:
                return {'anomalies': [], 'summary': 'Insufficient data for anomaly detection'}
            
            # Extract features
            features = self._extract_performance_features(performance_data)
            features_scaled = self.scaler.fit_transform(features)
            
            # Multi-algorithm anomaly detection
            anomaly_results = {}
            
            # Isolation Forest
            iso_forest = self.models['isolation_forest']
            iso_predictions = iso_forest.fit_predict(features_scaled)
            iso_scores = iso_forest.score_samples(features_scaled)
            anomaly_results['isolation_forest'] = {
                'predictions': iso_predictions,
                'scores': iso_scores
            }
            
            # Local Outlier Factor
            lof = LocalOutlierFactor(contamination=0.1)
            lof_predictions = lof.fit_predict(features_scaled)
            lof_scores = lof.negative_outlier_factor_
            anomaly_results['lof'] = {
                'predictions': lof_predictions,
                'scores': lof_scores
            }
            
            # One-Class SVM
            svm = self.models['one_class_svm']
            svm_predictions = svm.fit_predict(features_scaled)
            svm_scores = svm.score_samples(features_scaled)
            anomaly_results['svm'] = {
                'predictions': svm_predictions,
                'scores': svm_scores
            }
            
            # Statistical anomaly detection
            statistical_anomalies = self._statistical_anomaly_detection(features)
            
            # Ensemble anomaly detection
            ensemble_anomalies = self._ensemble_anomaly_detection(anomaly_results, performance_data)
            
            # Combine results
            final_anomalies = self._combine_anomaly_results(
                ensemble_anomalies, statistical_anomalies, performance_data, features
            )
            
            return {
                'anomalies': final_anomalies,
                'total_records': len(performance_data),
                'anomaly_count': len(final_anomalies),
                'detection_methods': ['isolation_forest', 'lof', 'one_class_svm', 'statistical'],
                'confidence_threshold': 0.7
            }
            
        except Exception as e:
            logger.error(f"Sophisticated anomaly detection failed: {e}")
            return {'anomalies': [], 'error': str(e)}
    
    def _extract_performance_features(self, performance_data):
        """Extract numerical features for anomaly detection"""
        features = []
        for record in performance_data:
            feature_vector = [
                record.get('processing_time', 0),
                record.get('throughput', 0),
                record.get('error_rate', 0),
                record.get('resource_utilization', 0.5),
                record.get('sla_compliance', 1.0),
                record.get('queue_length', 0),
                record.get('response_time', 0)
            ]
            features.append(feature_vector)
        return np.array(features)
    
    def _statistical_anomaly_detection(self, features):
        """Statistical-based anomaly detection using Z-score and IQR"""
        anomalies = []
        
        for i, feature_vector in enumerate(features):
            is_anomaly = False
            anomaly_reasons = []
            
            for j, value in enumerate(feature_vector):
                # Z-score method
                if len(features) > 3:
                    z_score = np.abs(stats.zscore(features[:, j]))[i]
                    if z_score > 2.5:
                        is_anomaly = True
                        anomaly_reasons.append(f'High Z-score ({z_score:.2f}) for feature {j}')
                
                # IQR method
                q1, q3 = np.percentile(features[:, j], [25, 75])
                iqr = q3 - q1
                lower_bound = q1 - 1.5 * iqr
                upper_bound = q3 + 1.5 * iqr
                
                if value < lower_bound or value > upper_bound:
                    is_anomaly = True
                    anomaly_reasons.append(f'Outside IQR bounds for feature {j}')
            
            if is_anomaly:
                anomalies.append({
                    'index': i,
                    'method': 'statistical',
                    'reasons': anomaly_reasons,
                    'confidence': min(0.9, len(anomaly_reasons) * 0.3)
                })
        
        return anomalies
    
    def _ensemble_anomaly_detection(self, anomaly_results, performance_data):
        """Ensemble method combining multiple algorithms"""
        ensemble_anomalies = []
        n_records = len(performance_data)
        
        for i in range(n_records):
            anomaly_votes = 0
            confidence_scores = []
            methods_detected = []
            
            # Check each algorithm
            for method, results in anomaly_results.items():
                if results['predictions'][i] == -1:  # Anomaly detected
                    anomaly_votes += 1
                    methods_detected.append(method)
                    confidence_scores.append(abs(results['scores'][i]))
            
            # Require at least 2 algorithms to agree
            if anomaly_votes >= 2:
                avg_confidence = np.mean(confidence_scores) if confidence_scores else 0.5
                ensemble_anomalies.append({
                    'index': i,
                    'methods': methods_detected,
                    'votes': anomaly_votes,
                    'confidence': min(0.95, avg_confidence),
                    'consensus': anomaly_votes >= 3
                })
        
        return ensemble_anomalies
    
    def _combine_anomaly_results(self, ensemble_anomalies, statistical_anomalies, performance_data, features):
        """Combine ensemble and statistical anomaly results"""
        final_anomalies = []
        all_anomaly_indices = set()
        
        # Add ensemble anomalies
        for anomaly in ensemble_anomalies:
            all_anomaly_indices.add(anomaly['index'])
        
        # Add statistical anomalies
        for anomaly in statistical_anomalies:
            all_anomaly_indices.add(anomaly['index'])
        
        # Create final anomaly records
        for idx in all_anomaly_indices:
            record = performance_data[idx]
            feature_vector = features[idx]
            
            # Find matching ensemble result
            ensemble_match = next((a for a in ensemble_anomalies if a['index'] == idx), None)
            statistical_match = next((a for a in statistical_anomalies if a['index'] == idx), None)
            
            # Determine severity
            severity = 'medium'
            if ensemble_match and ensemble_match.get('consensus'):
                severity = 'high'
            elif ensemble_match and ensemble_match.get('votes', 0) >= 3:
                severity = 'high'
            elif statistical_match and statistical_match.get('confidence', 0) > 0.8:
                severity = 'high'
            
            # Generate explanation
            explanation = self._generate_anomaly_explanation(record, feature_vector, ensemble_match, statistical_match)
            
            final_anomalies.append({
                'record_id': record.get('id', f'record_{idx}'),
                'record_data': record,
                'severity': severity,
                'confidence': max(
                    ensemble_match.get('confidence', 0) if ensemble_match else 0,
                    statistical_match.get('confidence', 0) if statistical_match else 0
                ),
                'detection_methods': (ensemble_match.get('methods', []) if ensemble_match else []) + 
                                   (['statistical'] if statistical_match else []),
                'explanation': explanation,
                'recommended_actions': self._generate_anomaly_actions(severity, explanation)
            })
        
        return sorted(final_anomalies, key=lambda x: x['confidence'], reverse=True)
    
    def _generate_anomaly_explanation(self, record, features, ensemble_match, statistical_match):
        """Generate human-readable explanation for anomaly"""
        explanations = []
        
        if record.get('processing_time', 0) > 100:
            explanations.append('Temps de traitement anormalement élevé')
        
        if record.get('error_rate', 0) > 0.1:
            explanations.append('Taux d\'erreur supérieur à la normale')
        
        if record.get('sla_compliance', 1) < 0.8:
            explanations.append('Conformité SLA en dessous des standards')
        
        if ensemble_match and ensemble_match.get('consensus'):
            explanations.append('Détecté par consensus de plusieurs algorithmes')
        
        if statistical_match:
            explanations.append('Valeurs statistiquement aberrantes détectées')
        
        return explanations if explanations else ['Comportement anormal détecté par IA']
    
    def _generate_anomaly_actions(self, severity, explanations):
        """Generate recommended actions for anomaly"""
        actions = []
        
        if severity == 'high':
            actions.append('Investigation immédiate requise')
            actions.append('Vérifier les ressources système')
        
        if 'Temps de traitement' in str(explanations):
            actions.append('Optimiser les processus de traitement')
        
        if 'erreur' in str(explanations).lower():
            actions.append('Analyser les causes d\'erreur')
        
        if 'SLA' in str(explanations):
            actions.append('Réviser les processus SLA')
        
        return actions if actions else ['Surveillance continue recommandée']

sophisticated_anomaly_detection = SophisticatedAnomalyDetection()