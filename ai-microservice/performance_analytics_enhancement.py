"""
Performance Analytics & Optimization AI Enhancement
Adds missing AI features: root cause analysis, optimization recommendations, 
process bottleneck detection, and training needs identification
"""

from typing import Dict, List, Any
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class PerformanceAnalyticsAI:
    """Enhanced AI for Performance Analytics & Optimization"""
    
    def __init__(self):
        self.confidence_threshold = 0.7
        
    def perform_root_cause_analysis(self, performance_data: Dict) -> List[Dict]:
        """AI-powered root cause analysis"""
        try:
            root_causes = []
            
            # Analyze SLA compliance
            sla_rate = performance_data.get('sla_compliance_rate', 1.0)
            if sla_rate < 0.8:
                severity = 'high' if sla_rate < 0.6 else 'medium'
                root_causes.append({
                    'category': 'SLA_PERFORMANCE',
                    'description': f'Taux de conformité SLA faible: {sla_rate:.1%}',
                    'severity': severity,
                    'impact': 'Risque contractuel et insatisfaction client',
                    'confidence': 0.9,
                    'affected_processes': ['traitement_bordereau', 'validation_bs'],
                    'recommendation': 'Analyser les goulots d\'étranglement et optimiser les processus critiques',
                    'priority_score': 0.9 if severity == 'high' else 0.7
                })
            
            # Analyze reclamation rate
            reclamation_rate = performance_data.get('reclamation_rate', 0.0)
            if reclamation_rate > 0.1:
                severity = 'high' if reclamation_rate > 0.2 else 'medium'
                root_causes.append({
                    'category': 'QUALITY_CONTROL',
                    'description': f'Taux de réclamations élevé: {reclamation_rate:.1%}',
                    'severity': severity,
                    'impact': 'Dégradation de la qualité de service',
                    'confidence': 0.85,
                    'affected_processes': ['controle_qualite', 'validation_donnees'],
                    'recommendation': 'Renforcer les contrôles qualité et former les équipes',
                    'priority_score': 0.8 if severity == 'high' else 0.6
                })
            
            # Analyze workload distribution
            workload_dist = performance_data.get('user_workload_distribution', {})
            variance = workload_dist.get('variance', 0)
            if variance > 100:
                root_causes.append({
                    'category': 'WORKLOAD_IMBALANCE',
                    'description': 'Distribution inégale de la charge de travail',
                    'severity': 'medium',
                    'impact': 'Inefficacité et risque de surcharge',
                    'confidence': 0.8,
                    'affected_processes': ['affectation_taches', 'gestion_equipes'],
                    'recommendation': 'Rééquilibrer la répartition des tâches entre les équipes',
                    'priority_score': 0.6
                })
            
            # Analyze processing time
            avg_time = performance_data.get('avg_processing_time', 24)
            if avg_time > 48:
                root_causes.append({
                    'category': 'PROCESSING_EFFICIENCY',
                    'description': f'Temps de traitement moyen élevé: {avg_time:.1f}h',
                    'severity': 'medium',
                    'impact': 'Ralentissement des opérations',
                    'confidence': 0.75,
                    'affected_processes': ['traitement_manuel', 'validation_etapes'],
                    'recommendation': 'Automatiser les tâches répétitives et optimiser les workflows',
                    'priority_score': 0.5
                })
            
            # Sort by priority score
            root_causes.sort(key=lambda x: x['priority_score'], reverse=True)
            
            return root_causes
            
        except Exception as e:
            logger.error(f"Root cause analysis failed: {e}")
            return []
    
    def generate_optimization_recommendations(self, metrics: Dict) -> List[Dict]:
        """Generate AI-powered optimization recommendations"""
        try:
            recommendations = []
            
            # Capacity optimization
            capacity_util = metrics.get('capacity_utilization', 0.5)
            if capacity_util > 0.8:
                recommendations.append({
                    'type': 'CAPACITY_OPTIMIZATION',
                    'priority': 'HIGH',
                    'title': 'Optimisation de la capacité',
                    'description': f'Utilisation de la capacité à {capacity_util:.1%}',
                    'impact': 'Réduction des goulots d\'étranglement',
                    'recommendation': 'Augmenter la capacité ou redistribuer la charge',
                    'confidence': 0.9,
                    'actionable': True,
                    'estimated_improvement': '25%',
                    'implementation_effort': 'medium'
                })
            
            # Efficiency optimization
            efficiency_score = metrics.get('efficiency_score', 0.8)
            if efficiency_score < 0.7:
                recommendations.append({
                    'type': 'PROCESS_EFFICIENCY',
                    'priority': 'MEDIUM',
                    'title': 'Amélioration de l\'efficacité',
                    'description': f'Score d\'efficacité: {efficiency_score:.1%}',
                    'impact': 'Amélioration des performances globales',
                    'recommendation': 'Automatiser les tâches répétitives et optimiser les workflows',
                    'confidence': 0.85,
                    'actionable': True,
                    'estimated_improvement': '30%',
                    'implementation_effort': 'high'
                })
            
            # Quality optimization
            overdue_volume = metrics.get('overdue_volume', 0)
            total_volume = metrics.get('total_volume', 1)
            overdue_rate = overdue_volume / total_volume
            if overdue_rate > 0.1:
                recommendations.append({
                    'type': 'QUALITY_IMPROVEMENT',
                    'priority': 'HIGH',
                    'title': 'Amélioration de la qualité',
                    'description': f'{overdue_volume} dossiers en retard sur {total_volume}',
                    'impact': 'Réduction des retards et amélioration SLA',
                    'recommendation': 'Renforcer les contrôles qualité et les processus de suivi',
                    'confidence': 0.8,
                    'actionable': True,
                    'estimated_improvement': '20%',
                    'implementation_effort': 'medium'
                })
            
            # Resource allocation optimization
            resource_availability = metrics.get('resource_availability', 10)
            active_volume = metrics.get('active_volume', 0)
            if active_volume / resource_availability > 15:  # More than 15 items per person
                recommendations.append({
                    'type': 'RESOURCE_ALLOCATION',
                    'priority': 'MEDIUM',
                    'title': 'Optimisation des ressources',
                    'description': f'Charge moyenne: {active_volume/resource_availability:.1f} dossiers/personne',
                    'impact': 'Meilleure répartition de la charge',
                    'recommendation': 'Recruter du personnel ou redistribuer les tâches',
                    'confidence': 0.75,
                    'actionable': True,
                    'estimated_improvement': '15%',
                    'implementation_effort': 'high'
                })
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Optimization recommendations failed: {e}")
            return []
    
    def detect_process_bottlenecks(self, process_data: List[Dict]) -> List[Dict]:
        """AI-powered process bottleneck detection"""
        try:
            bottlenecks = []
            
            if not process_data:
                return bottlenecks
            
            # Analyze step durations
            step_durations = {}
            for step in process_data:
                step_name = step.get('step_name', 'unknown')
                processing_time = step.get('processing_time', 24)
                
                if step_name not in step_durations:
                    step_durations[step_name] = []
                step_durations[step_name].append(processing_time)
            
            # Identify bottlenecks using AI analysis
            for step_name, durations in step_durations.items():
                if len(durations) > 0:
                    avg_duration = sum(durations) / len(durations)
                    max_duration = max(durations)
                    variance = sum((d - avg_duration) ** 2 for d in durations) / len(durations)
                    
                    # AI scoring for bottleneck severity
                    bottleneck_score = self._calculate_bottleneck_score(
                        avg_duration, max_duration, variance, len(durations)
                    )
                    
                    if bottleneck_score > 0.6:  # Significant bottleneck
                        impact = 'high' if bottleneck_score > 0.8 else 'medium'
                        delay_percentage = min(100, ((avg_duration - 24) / 24) * 100)
                        
                        bottlenecks.append({
                            'process': step_name,
                            'description': f'Temps de traitement moyen: {avg_duration:.1f}h',
                            'impact': impact,
                            'delayPercentage': delay_percentage,
                            'occurrences': len(durations),
                            'bottleneck_score': bottleneck_score,
                            'variance': variance,
                            'max_duration': max_duration,
                            'recommendation': f'Optimiser l\'étape {step_name} pour réduire les délais',
                            'priority': 'high' if impact == 'high' else 'medium',
                            'confidence': min(0.9, 0.5 + (len(durations) / 20))  # More data = higher confidence
                        })
            
            # Sort by bottleneck score
            bottlenecks.sort(key=lambda x: x['bottleneck_score'], reverse=True)
            
            return bottlenecks
            
        except Exception as e:
            logger.error(f"Bottleneck detection failed: {e}")
            return []
    
    def identify_training_needs(self, user_performance: List[Dict]) -> List[Dict]:
        """AI-powered training needs identification"""
        try:
            training_needs = []
            
            if not user_performance:
                return training_needs
            
            # Analyze error rates
            high_error_users = [u for u in user_performance if u.get('error_rate', 0) > 0.1]
            if high_error_users:
                improvement_potential = self._calculate_improvement_potential(
                    [u['error_rate'] for u in high_error_users], 'error_rate'
                )
                
                training_needs.append({
                    'skill': 'Contrôle qualité',
                    'affectedUsers': len(high_error_users),
                    'improvementPotential': improvement_potential,
                    'priority': 'high',
                    'description': 'Formation sur les procédures de contrôle qualité',
                    'users': [u['user_id'] for u in high_error_users],
                    'confidence': 0.9,
                    'estimated_duration': '2 jours',
                    'cost_benefit_ratio': 3.5
                })
            
            # Analyze processing speed
            slow_users = [u for u in user_performance if u.get('avg_processing_time', 24) > 72]
            if slow_users:
                improvement_potential = self._calculate_improvement_potential(
                    [u['avg_processing_time'] for u in slow_users], 'processing_time'
                )
                
                training_needs.append({
                    'skill': 'Efficacité de traitement',
                    'affectedUsers': len(slow_users),
                    'improvementPotential': improvement_potential,
                    'priority': 'medium',
                    'description': 'Formation sur l\'optimisation des processus',
                    'users': [u['user_id'] for u in slow_users],
                    'confidence': 0.8,
                    'estimated_duration': '1 jour',
                    'cost_benefit_ratio': 2.8
                })
            
            # Analyze complexity handling
            low_complexity_users = [u for u in user_performance if u.get('complexity_handled', 5) < 3]
            if low_complexity_users:
                training_needs.append({
                    'skill': 'Gestion des cas complexes',
                    'affectedUsers': len(low_complexity_users),
                    'improvementPotential': 20,
                    'priority': 'medium',
                    'description': 'Formation sur le traitement des dossiers complexes',
                    'users': [u['user_id'] for u in low_complexity_users],
                    'confidence': 0.75,
                    'estimated_duration': '3 jours',
                    'cost_benefit_ratio': 2.2
                })
            
            # Sort by cost-benefit ratio
            training_needs.sort(key=lambda x: x.get('cost_benefit_ratio', 0), reverse=True)
            
            return training_needs
            
        except Exception as e:
            logger.error(f"Training needs identification failed: {e}")
            return []
    
    def _calculate_bottleneck_score(self, avg_duration: float, max_duration: float, 
                                  variance: float, sample_size: int) -> float:
        """Calculate AI bottleneck severity score"""
        try:
            # Base score from average duration (normalized)
            duration_score = min(1.0, (avg_duration - 24) / 72)  # 0-1 scale
            
            # Variance penalty (high variance = less predictable = worse)
            variance_penalty = min(0.3, variance / 1000)
            
            # Sample size confidence (more samples = more reliable)
            confidence_factor = min(1.0, sample_size / 10)
            
            # Peak duration impact
            peak_impact = min(0.2, (max_duration - avg_duration) / avg_duration)
            
            # Combined score
            score = (duration_score + variance_penalty + peak_impact) * confidence_factor
            
            return max(0.0, min(1.0, score))
            
        except Exception:
            return 0.5  # Default moderate score
    
    def _calculate_improvement_potential(self, values: List[float], metric_type: str) -> int:
        """Calculate improvement potential percentage"""
        try:
            if not values:
                return 0
            
            avg_value = sum(values) / len(values)
            
            if metric_type == 'error_rate':
                # Error rate: higher values = more improvement potential
                return min(50, int(avg_value * 250))  # Scale error rate to percentage
            elif metric_type == 'processing_time':
                # Processing time: longer times = more improvement potential
                baseline = 24  # 24 hours baseline
                return min(50, int(((avg_value - baseline) / baseline) * 100))
            else:
                return 20  # Default improvement potential
                
        except Exception:
            return 15  # Default fallback

# Global instance
performance_analytics_ai = PerformanceAnalyticsAI()