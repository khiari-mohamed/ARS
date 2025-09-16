import numpy as np
import pandas as pd
from sklearn.cluster import KMeans, DBSCAN, AgglomerativeClustering
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score
from sklearn.decomposition import PCA
import logging

logger = logging.getLogger(__name__)

class AdvancedClustering:
    def __init__(self):
        self.scaler = StandardScaler()
        self.best_model = None
        self.best_score = -1
        
    def cluster_problematic_processes(self, process_data):
        """Advanced clustering for problematic processes"""
        try:
            if len(process_data) < 3:
                return {'clusters': [], 'summary': 'Insufficient data for clustering'}
            
            # Prepare features
            features = self._extract_process_features(process_data)
            if features.shape[0] < 3:
                return {'clusters': [], 'summary': 'Insufficient features for clustering'}
            
            # Scale features
            features_scaled = self.scaler.fit_transform(features)
            
            # Try multiple clustering algorithms
            clustering_results = []
            
            # K-Means clustering
            for n_clusters in range(2, min(6, len(process_data))):
                kmeans = KMeans(n_clusters=n_clusters, random_state=42)
                labels = kmeans.fit_predict(features_scaled)
                score = silhouette_score(features_scaled, labels)
                clustering_results.append({
                    'algorithm': 'kmeans',
                    'n_clusters': n_clusters,
                    'labels': labels,
                    'score': score,
                    'model': kmeans
                })
            
            # DBSCAN clustering
            dbscan = DBSCAN(eps=0.5, min_samples=2)
            dbscan_labels = dbscan.fit_predict(features_scaled)
            if len(set(dbscan_labels)) > 1:
                dbscan_score = silhouette_score(features_scaled, dbscan_labels)
                clustering_results.append({
                    'algorithm': 'dbscan',
                    'labels': dbscan_labels,
                    'score': dbscan_score,
                    'model': dbscan
                })
            
            # Select best clustering
            best_result = max(clustering_results, key=lambda x: x['score'])
            self.best_model = best_result['model']
            self.best_score = best_result['score']
            
            # Generate cluster analysis
            clusters = self._analyze_clusters(process_data, best_result['labels'], features)
            
            return {
                'clusters': clusters,
                'algorithm_used': best_result['algorithm'],
                'silhouette_score': best_result['score'],
                'total_processes': len(process_data),
                'problematic_clusters': [c for c in clusters if c['severity'] in ['high', 'critical']]
            }
            
        except Exception as e:
            logger.error(f"Advanced clustering failed: {e}")
            return {'clusters': [], 'error': str(e)}
    
    def _extract_process_features(self, process_data):
        """Extract numerical features from process data"""
        features = []
        for process in process_data:
            feature_vector = [
                process.get('processing_time', 0),
                process.get('error_rate', 0),
                process.get('delay_frequency', 0),
                process.get('resource_utilization', 0.5),
                process.get('complexity_score', 1),
                process.get('sla_breach_rate', 0)
            ]
            features.append(feature_vector)
        return np.array(features)
    
    def _analyze_clusters(self, process_data, labels, features):
        """Analyze clusters to identify problematic patterns"""
        clusters = []
        unique_labels = set(labels)
        
        for label in unique_labels:
            if label == -1:  # Noise in DBSCAN
                continue
                
            cluster_indices = [i for i, l in enumerate(labels) if l == label]
            cluster_processes = [process_data[i] for i in cluster_indices]
            cluster_features = features[cluster_indices]
            
            # Calculate cluster statistics
            avg_processing_time = np.mean(cluster_features[:, 0])
            avg_error_rate = np.mean(cluster_features[:, 1])
            avg_delay_freq = np.mean(cluster_features[:, 2])
            
            # Determine severity
            severity = 'low'
            if avg_error_rate > 0.1 or avg_delay_freq > 0.2:
                severity = 'high'
            elif avg_error_rate > 0.05 or avg_delay_freq > 0.1:
                severity = 'medium'
            
            if avg_processing_time > np.mean(features[:, 0]) * 1.5:
                severity = 'critical' if severity == 'high' else 'high'
            
            clusters.append({
                'cluster_id': int(label),
                'process_count': len(cluster_processes),
                'processes': [p.get('process_name', f'Process_{i}') for i, p in enumerate(cluster_processes)],
                'avg_processing_time': float(avg_processing_time),
                'avg_error_rate': float(avg_error_rate),
                'avg_delay_frequency': float(avg_delay_freq),
                'severity': severity,
                'recommendations': self._generate_cluster_recommendations(severity, avg_processing_time, avg_error_rate)
            })
        
        return sorted(clusters, key=lambda x: {'critical': 4, 'high': 3, 'medium': 2, 'low': 1}[x['severity']], reverse=True)
    
    def _generate_cluster_recommendations(self, severity, processing_time, error_rate):
        """Generate recommendations for cluster"""
        recommendations = []
        
        if severity == 'critical':
            recommendations.append('Action immédiate requise - processus critique détecté')
            recommendations.append('Réassignation des ressources prioritaire')
        elif severity == 'high':
            recommendations.append('Surveillance renforcée nécessaire')
            recommendations.append('Formation ciblée recommandée')
        
        if processing_time > 50:
            recommendations.append('Optimisation du temps de traitement nécessaire')
        
        if error_rate > 0.1:
            recommendations.append('Amélioration de la qualité des processus requise')
        
        return recommendations

advanced_clustering = AdvancedClustering()