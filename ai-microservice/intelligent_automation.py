import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, mean_squared_error
from typing import Dict, List, Any, Tuple
import logging
from datetime import datetime, timedelta
from collections import defaultdict
import json

logger = logging.getLogger(__name__)

class SmartRoutingEngine:
    def __init__(self):
        self.routing_model = None
        self.workload_predictor = None
        self.scaler = None
        self.label_encoder = None
        self.team_profiles = {}
        
    def build_team_profiles(self, historical_data: List[Dict]) -> Dict[str, Any]:
        """Build performance profiles for teams/users"""
        try:
            team_stats = defaultdict(lambda: {
                'total_tasks': 0,
                'completed_tasks': 0,
                'avg_processing_time': 0,
                'success_rate': 0,
                'specializations': defaultdict(int),
                'workload_capacity': 0,
                'efficiency_score': 0
            })
            
            # Aggregate historical performance data
            for record in historical_data:
                team_id = record.get('team_id') or record.get('assigned_to')
                if not team_id:
                    continue
                
                stats = team_stats[team_id]
                stats['total_tasks'] += 1
                
                if record.get('status') == 'completed':
                    stats['completed_tasks'] += 1
                    processing_time = record.get('processing_time', 0)
                    stats['avg_processing_time'] = (
                        (stats['avg_processing_time'] * (stats['completed_tasks'] - 1) + processing_time) 
                        / stats['completed_tasks']
                    )
                
                # Track specializations
                task_type = record.get('type', 'general')
                stats['specializations'][task_type] += 1
                
                # Update workload capacity
                stats['workload_capacity'] = record.get('current_workload', 0)
            
            # Calculate derived metrics
            for team_id, stats in team_stats.items():
                if stats['total_tasks'] > 0:
                    stats['success_rate'] = stats['completed_tasks'] / stats['total_tasks']
                    
                    # Calculate efficiency score (combination of speed and accuracy)
                    speed_score = 1 / max(stats['avg_processing_time'], 0.1)  # Inverse of processing time
                    accuracy_score = stats['success_rate']
                    stats['efficiency_score'] = (speed_score * 0.4 + accuracy_score * 0.6)
                    
                    # Normalize specializations
                    total_specializations = sum(stats['specializations'].values())
                    if total_specializations > 0:
                        stats['specializations'] = {
                            k: v / total_specializations 
                            for k, v in stats['specializations'].items()
                        }
            
            self.team_profiles = dict(team_stats)
            
            return {
                'team_count': len(team_stats),
                'profiles_created': list(team_stats.keys()),
                'avg_efficiency': np.mean([stats['efficiency_score'] for stats in team_stats.values()]),
                'summary': f"Built profiles for {len(team_stats)} teams/users"
            }
            
        except Exception as e:
            logger.error(f"Team profile building failed: {e}")
            raise
    
    def train_routing_model(self, training_data: List[Dict]) -> Dict[str, Any]:
        """Train smart routing model"""
        try:
            if len(training_data) < 50:
                return {'error': 'Insufficient training data (need at least 50 samples)'}
            
            # Prepare features and labels
            features = []
            labels = []
            
            for record in training_data:
                # Extract task features
                task_features = [
                    record.get('priority', 1),
                    record.get('complexity', 1),
                    record.get('estimated_time', 1),
                    record.get('client_importance', 1),
                    record.get('sla_urgency', 1),
                    record.get('document_count', 1),
                    record.get('requires_expertise', 0),
                    record.get('is_recurring', 0)
                ]
                
                # Add temporal features
                if 'created_at' in record:
                    created_at = datetime.fromisoformat(record['created_at'])
                    task_features.extend([
                        created_at.hour,
                        created_at.weekday(),
                        created_at.day
                    ])
                else:
                    task_features.extend([12, 1, 15])  # Default values
                
                features.append(task_features)
                labels.append(record.get('assigned_to', 'default'))
            
            X = np.array(features)
            y = np.array(labels)
            
            # Encode labels
            self.label_encoder = LabelEncoder()
            y_encoded = self.label_encoder.fit_transform(y)
            
            # Scale features
            self.scaler = StandardScaler()
            X_scaled = self.scaler.fit_transform(X)
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X_scaled, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
            )
            
            # Train routing model
            self.routing_model = RandomForestClassifier(
                n_estimators=100,
                max_depth=10,
                min_samples_split=5,
                random_state=42
            )
            
            self.routing_model.fit(X_train, y_train)
            
            # Evaluate model
            y_pred = self.routing_model.predict(X_test)
            accuracy = accuracy_score(y_test, y_pred)
            
            # Feature importance
            feature_names = [
                'priority', 'complexity', 'estimated_time', 'client_importance',
                'sla_urgency', 'document_count', 'requires_expertise', 'is_recurring',
                'hour', 'weekday', 'day'
            ]
            
            feature_importance = dict(zip(feature_names, self.routing_model.feature_importances_))
            
            return {
                'accuracy': float(accuracy),
                'feature_importance': {k: float(v) for k, v in feature_importance.items()},
                'training_samples': len(X_train),
                'test_samples': len(X_test),
                'available_assignees': self.label_encoder.classes_.tolist()
            }
            
        except Exception as e:
            logger.error(f"Routing model training failed: {e}")
            raise
    
    async def suggest_optimal_assignment(self, bordereau_data: Dict, db_manager, available_agents: List[str] = None) -> Dict[str, Any]:
        """Suggest optimal bordereau assignment using real ARS data"""
        try:
            # Get real agent performance data
            agents = await db_manager.get_agent_performance_metrics()
            if not agents:
                return {
                    'bordereau_id': bordereau_data.get('id', 'unknown'),
                    'recommended_assignment': None,
                    'message': 'Aucun gestionnaire trouvé dans la base de données',
                    'assignment_reasoning': ['Aucun agent GESTIONNAIRE ou CHEF_EQUIPE trouvé dans le système']
                }
            
            # Filter only GESTIONNAIRE and CHEF_EQUIPE roles
            agents = [a for a in agents if a.get('role') in ['GESTIONNAIRE', 'CHEF_EQUIPE']]
            
            if not agents:
                return {
                    'bordereau_id': bordereau_data.get('id', 'unknown'),
                    'recommended_assignment': None,
                    'message': 'Aucun gestionnaire disponible',
                    'assignment_reasoning': ['Aucun agent GESTIONNAIRE ou CHEF_EQUIPE trouvé dans le système']
                }
            
            # Calculate assignment scores based on real ARS factors
            assignment_scores = []
            
            for agent in agents:
                if available_agents and agent['username'] not in available_agents:
                    continue
                
                # Real ARS scoring factors
                rendement_score = self._calculate_rendement_score(agent)
                disponibilite_score = self._calculate_disponibilite_score(agent)
                complexite_match = self._calculate_complexite_match(agent, bordereau_data)
                sla_urgency = self._calculate_sla_urgency(bordereau_data)
                
                # Combined ARS assignment score
                total_score = (
                    rendement_score * 0.3 +
                    disponibilite_score * 0.3 +
                    complexite_match * 0.25 +
                    sla_urgency * 0.15
                )
                
                # Predict completion time
                estimated_hours = self._estimate_completion_time(agent, bordereau_data)
                
                assignment_scores.append({
                    'agent_id': agent['id'],
                    'agent_name': f"{agent.get('firstName', 'Agent')} {agent.get('lastName', 'ARS')}",
                    'username': agent.get('username', 'agent@ars.com'),
                    'role': agent.get('role', 'GESTIONNAIRE'),
                    'total_score': float(total_score),
                    'rendement_score': float(rendement_score),
                    'disponibilite_score': float(disponibilite_score),
                    'complexite_match': float(complexite_match),
                    'estimated_completion_hours': float(estimated_hours),
                    'confidence': 'high' if total_score > 0.8 else 'medium' if total_score > 0.6 else 'low',
                    'reason_codes': self._generate_ars_reason_codes(agent, bordereau_data, total_score)
                })
            
            # Sort by total score
            assignment_scores.sort(key=lambda x: x['total_score'], reverse=True)
            
            top_recommendation = assignment_scores[0] if assignment_scores else None
            
            return {
                'bordereau_id': bordereau_data.get('id'),
                'recommended_assignment': top_recommendation,
                'all_options': assignment_scores[:3],
                'assignment_reasoning': self._generate_ars_assignment_reasoning(bordereau_data, top_recommendation)
            }
            
        except Exception as e:
            logger.error(f"ARS assignment suggestion failed: {e}")
            return {
                'bordereau_id': bordereau_data.get('id', 'unknown'),
                'recommended_assignment': None,
                'message': f'Erreur lors de l\'assignation: {str(e)}',
                'assignment_reasoning': ['Erreur système - Impossible de générer une assignation']
            }
    
    def _calculate_rendement_score(self, agent: Dict) -> float:
        """Calculate agent throughput score based on real performance"""
        total_bordereaux = agent.get('total_bordereaux', 0)
        avg_hours = agent.get('avg_hours', 24)  # Default 24h if no data
        
        if total_bordereaux == 0:
            return 0.5  # New agent baseline
        
        # ARS business logic: Good gestionnaire processes 3-5 bordereaux/week
        weekly_throughput = total_bordereaux / max(1, avg_hours / 168)  # 168 hours per week
        
        # Score based on ARS standards
        if weekly_throughput >= 5:
            return 1.0  # Excellent
        elif weekly_throughput >= 3:
            return 0.8  # Good
        elif weekly_throughput >= 2:
            return 0.6  # Average
        else:
            return 0.4  # Below average
    
    def _calculate_disponibilite_score(self, agent: Dict) -> float:
        """Calculate agent availability score"""
        last_activity = agent.get('last_activity')
        if not last_activity:
            return 0.5
        
        # Recent activity = higher availability
        hours_since_activity = (datetime.now() - last_activity).total_seconds() / 3600
        if hours_since_activity < 2:
            return 1.0
        elif hours_since_activity < 8:
            return 0.8
        elif hours_since_activity < 24:
            return 0.6
        else:
            return 0.3
    
    def _calculate_complexite_match(self, agent: Dict, bordereau: Dict) -> float:
        """Match agent capability with bordereau complexity"""
        agent_role = agent.get('role', 'GESTIONNAIRE')
        bordereau_bs_count = bordereau.get('nombreBS', 1)
        agent_experience = agent.get('total_bordereaux', 0)
        
        # Role-based complexity handling
        if agent_role == 'CHEF_EQUIPE':
            base_score = 0.95  # Chef can handle anything
        elif agent_experience > 30:
            base_score = 0.85  # Experienced gestionnaire
        elif agent_experience > 10:
            base_score = 0.75  # Average gestionnaire
        else:
            base_score = 0.65  # New gestionnaire
        
        # ARS complexity rules
        if bordereau_bs_count > 30:  # Very complex
            if agent_role == 'CHEF_EQUIPE' or agent_experience > 25:
                complexity_factor = 1.0
            else:
                complexity_factor = 0.6  # Too complex for junior
        elif bordereau_bs_count > 15:  # Medium complexity
            complexity_factor = 0.9
        else:  # Simple bordereau
            complexity_factor = 1.0
        
        return base_score * complexity_factor
    
    def _calculate_sla_urgency(self, bordereau: Dict) -> float:
        """Calculate SLA urgency factor"""
        days_remaining = bordereau.get('days_remaining', 30)
        sla_days = bordereau.get('delaiReglement', 30)
        
        if days_remaining <= 0:
            return 1.0  # Critical
        elif days_remaining <= sla_days * 0.2:
            return 0.9  # High urgency
        elif days_remaining <= sla_days * 0.5:
            return 0.7  # Medium urgency
        else:
            return 0.5  # Normal
    
    def _estimate_completion_time(self, agent: Dict, bordereau: Dict) -> float:
        """Estimate completion time in hours"""
        avg_hours = agent.get('avg_hours', 24)
        bs_count = bordereau.get('nombreBS', 1)
        
        # Base time per BS
        base_time_per_bs = avg_hours / max(agent.get('total_bordereaux', 1), 1)
        
        # Adjust for current bordereau size
        estimated_hours = base_time_per_bs * bs_count
        
        return max(1.0, min(48.0, estimated_hours))  # Between 1-48 hours
    
    async def _calculate_team_capacity_gap(self, db_manager, bordereau: Dict) -> Dict:
        """Calculate if team has capacity for new work"""
        try:
            # Get current workload
            workload = await db_manager.get_live_workload()
            active_agents = len([w for w in workload if w.get('_count', {}).get('id', 0) > 0])
            
            # Estimate required agents for current + new work
            total_work_hours = sum([w.get('_count', {}).get('id', 0) * 8 for w in workload])  # Assume 8h per bordereau
            new_work_hours = bordereau.get('nombreBS', 1) * 8
            
            total_required_hours = total_work_hours + new_work_hours
            required_agents = max(1, int(total_required_hours / (8 * 5)))  # 8h/day, 5 days/week
            
            return {
                'current_active_agents': active_agents,
                'required_agents': required_agents,
                'capacity_gap': max(0, required_agents - active_agents),
                'utilization_rate': min(1.0, total_required_hours / (active_agents * 40)) if active_agents > 0 else 1.0
            }
        except Exception as e:
            logger.error(f"Capacity gap calculation failed: {e}")
            return {'error': 'Could not calculate capacity gap'}
    
    def _generate_ars_reason_codes(self, agent: Dict, bordereau: Dict, score: float) -> List[str]:
        """Generate ARS-specific reason codes"""
        reasons = []
        
        # Performance-based reasons
        if score > 0.8:
            reasons.append('EXCELLENT_MATCH')
        elif score > 0.6:
            reasons.append('GOOD_MATCH')
        
        # Experience-based reasons
        experience = agent.get('total_bordereaux', 0)
        if experience > 30:
            reasons.append('EXPERIENCED_GESTIONNAIRE')
        elif experience > 10:
            reasons.append('COMPETENT_GESTIONNAIRE')
        
        # Role-based reasons
        if agent.get('role') == 'CHEF_EQUIPE':
            reasons.append('CHEF_EQUIPE_EXPERTISE')
            if bordereau.get('nombreBS', 1) > 20:
                reasons.append('COMPLEX_CASE_SPECIALIST')
        
        # SLA compliance
        sla_rate = agent.get('sla_compliant', 0) / max(agent.get('total_bordereaux', 1), 1)
        if sla_rate > 0.9:
            reasons.append('HIGH_SLA_COMPLIANCE')
        
        # Availability
        if agent.get('last_activity'):
            reasons.append('RECENTLY_ACTIVE')
        
        # Quality
        reject_rate = agent.get('rejected_count', 0) / max(agent.get('total_bordereaux', 1), 1)
        if reject_rate < 0.1:
            reasons.append('LOW_REJECTION_RATE')
        
        return reasons or ['AVAILABLE_GESTIONNAIRE']
    
    def _generate_ars_assignment_reasoning(self, bordereau: Dict, recommendation: Dict) -> List[str]:
        """Generate human-readable reasoning for ARS assignment"""
        if not recommendation:
            return ['Aucun gestionnaire disponible pour cette affectation']
        
        reasoning = []
        agent_name = recommendation.get('agent_name', 'Agent')
        role = recommendation.get('role', 'GESTIONNAIRE')
        confidence = recommendation.get('confidence', 'medium')
        
        # Main recommendation
        if confidence == 'high':
            reasoning.append(f"✅ {agent_name} ({role}) - Assignation optimale")
        else:
            reasoning.append(f"✅ {agent_name} ({role}) - Assignation recommandée")
        
        # Reason codes explanation
        reason_codes = recommendation.get('reason_codes', [])
        
        if 'CHEF_EQUIPE_EXPERTISE' in reason_codes:
            reasoning.append('🎯 Chef d\'équipe - Expertise pour cas complexes')
        elif 'EXPERIENCED_GESTIONNAIRE' in reason_codes:
            reasoning.append('🎯 Gestionnaire expérimenté - Plus de 30 dossiers traités')
        elif 'COMPETENT_GESTIONNAIRE' in reason_codes:
            reasoning.append('🎯 Gestionnaire compétent - Expérience confirmée')
        
        if 'HIGH_SLA_COMPLIANCE' in reason_codes:
            reasoning.append('⏱️ Excellent respect des délais SLA')
        
        if 'LOW_REJECTION_RATE' in reason_codes:
            reasoning.append('✅ Faible taux de rejet - Qualité de traitement')
        
        if 'COMPLEX_CASE_SPECIALIST' in reason_codes:
            reasoning.append('🔧 Spécialiste des dossiers complexes')
        
        # Time estimation
        eta_hours = recommendation.get('estimated_completion_hours', 24)
        if eta_hours <= 8:
            reasoning.append(f'⚡ Traitement rapide estimé: {eta_hours:.0f}h')
        elif eta_hours <= 24:
            reasoning.append(f'📅 Traitement standard estimé: {eta_hours:.0f}h')
        else:
            reasoning.append(f'📅 Traitement estimé: {eta_hours:.0f}h')
        
        # Bordereau complexity note
        bs_count = bordereau.get('nombreBS', 1)
        if bs_count > 20:
            reasoning.append(f'📋 Dossier complexe: {bs_count} bulletins de soins')
        elif bs_count > 10:
            reasoning.append(f'📋 Dossier moyen: {bs_count} bulletins de soins')
        else:
            reasoning.append(f'📋 Dossier simple: {bs_count} bulletins de soins')
        
        return reasoning
    


class AutomatedDecisionEngine:
    def __init__(self):
        self.decision_rules = {}
        self.ml_models = {}
        
    def register_decision_rule(self, rule_name: str, rule_function: callable, priority: int = 1):
        """Register a decision rule"""
        self.decision_rules[rule_name] = {
            'function': rule_function,
            'priority': priority,
            'active': True
        }
    
    def make_automated_decision(self, context: Dict, decision_type: str) -> Dict[str, Any]:
        """Make automated decision based on context and rules"""
        try:
            decisions = []
            
            if decision_type == 'sla_escalation':
                decisions = self._decide_sla_escalation(context)
            elif decision_type == 'workload_rebalancing':
                decisions = self._decide_workload_rebalancing(context)
            elif decision_type == 'priority_adjustment':
                decisions = self._decide_priority_adjustment(context)
            elif decision_type == 'resource_allocation':
                decisions = self._decide_resource_allocation(context)
            else:
                return {'error': f'Unknown decision type: {decision_type}'}
            
            return {
                'decision_type': decision_type,
                'decisions': decisions,
                'context': context,
                'timestamp': datetime.now().isoformat(),
                'confidence': self._calculate_decision_confidence(decisions)
            }
            
        except Exception as e:
            logger.error(f"Automated decision making failed: {e}")
            raise
    
    def _decide_sla_escalation(self, context: Dict) -> List[Dict]:
        """Decide on SLA escalation actions"""
        decisions = []
        
        sla_items = context.get('sla_items', [])
        
        for item in sla_items:
            days_left = item.get('days_left', 0)
            progress_ratio = item.get('progress_ratio', 0)
            risk_score = item.get('risk_score', 0)
            
            # Critical escalation
            if days_left <= 1 and progress_ratio < 0.8:
                decisions.append({
                    'item_id': item.get('id'),
                    'action': 'critical_escalation',
                    'priority': 'urgent',
                    'recommendations': [
                        'Immediate manager notification',
                        'Reassign to senior team member',
                        'Allocate additional resources'
                    ],
                    'confidence': 0.95
                })
            
            # Warning escalation
            elif days_left <= 3 and progress_ratio < 0.6:
                decisions.append({
                    'item_id': item.get('id'),
                    'action': 'warning_escalation',
                    'priority': 'high',
                    'recommendations': [
                        'Team leader notification',
                        'Review resource allocation',
                        'Consider process optimization'
                    ],
                    'confidence': 0.8
                })
            
            # Preventive action
            elif risk_score > 0.7:
                decisions.append({
                    'item_id': item.get('id'),
                    'action': 'preventive_action',
                    'priority': 'medium',
                    'recommendations': [
                        'Monitor progress closely',
                        'Prepare backup resources',
                        'Review process efficiency'
                    ],
                    'confidence': 0.7
                })
        
        return decisions
    
    def _decide_workload_rebalancing(self, context: Dict) -> List[Dict]:
        """Decide on workload rebalancing actions"""
        decisions = []
        
        team_workloads = context.get('team_workloads', [])
        
        # Calculate workload statistics
        workloads = [team.get('workload', 0) for team in team_workloads]
        avg_workload = np.mean(workloads)
        std_workload = np.std(workloads)
        
        # Identify overloaded and underloaded teams
        overloaded_teams = []
        underloaded_teams = []
        
        for team in team_workloads:
            workload = team.get('workload', 0)
            team_id = team.get('team_id')
            
            if workload > avg_workload + std_workload:
                overloaded_teams.append(team)
            elif workload < avg_workload - std_workload:
                underloaded_teams.append(team)
        
        # Generate rebalancing decisions
        if overloaded_teams and underloaded_teams:
            for overloaded in overloaded_teams:
                for underloaded in underloaded_teams:
                    transfer_amount = min(
                        overloaded['workload'] - avg_workload,
                        avg_workload - underloaded['workload']
                    ) / 2
                    
                    if transfer_amount > 1:
                        decisions.append({
                            'action': 'workload_transfer',
                            'from_team': overloaded['team_id'],
                            'to_team': underloaded['team_id'],
                            'transfer_amount': int(transfer_amount),
                            'priority': 'medium',
                            'confidence': 0.8,
                            'reasoning': f"Balance workload between teams (from {overloaded['workload']} to {underloaded['workload']})"
                        })
        
        return decisions
    
    def _decide_priority_adjustment(self, context: Dict) -> List[Dict]:
        """Decide on priority adjustments"""
        decisions = []
        
        tasks = context.get('tasks', [])
        
        for task in tasks:
            current_priority = task.get('priority', 1)
            sla_urgency = task.get('sla_urgency', 1)
            client_importance = task.get('client_importance', 1)
            days_left = task.get('days_left', 10)
            
            # Calculate suggested priority
            urgency_factor = max(0, 5 - days_left) * 0.3
            sla_factor = sla_urgency * 0.4
            client_factor = client_importance * 0.3
            
            suggested_priority = min(5, urgency_factor + sla_factor + client_factor)
            
            # Suggest priority change if significant difference
            if abs(suggested_priority - current_priority) >= 1:
                decisions.append({
                    'task_id': task.get('id'),
                    'action': 'priority_adjustment',
                    'current_priority': current_priority,
                    'suggested_priority': int(suggested_priority),
                    'reasoning': f"Based on SLA urgency ({sla_urgency}), client importance ({client_importance}), and time remaining ({days_left} days)",
                    'confidence': 0.75
                })
        
        return decisions
    
    def _decide_resource_allocation(self, context: Dict) -> List[Dict]:
        """Decide on resource allocation"""
        decisions = []
        
        resource_demand = context.get('resource_demand', {})
        available_resources = context.get('available_resources', {})
        
        for resource_type, demand in resource_demand.items():
            available = available_resources.get(resource_type, 0)
            
            if demand > available * 0.8:  # High utilization
                decisions.append({
                    'action': 'increase_resources',
                    'resource_type': resource_type,
                    'current_allocation': available,
                    'recommended_allocation': int(demand * 1.2),
                    'priority': 'high' if demand > available else 'medium',
                    'confidence': 0.8,
                    'reasoning': f"High demand ({demand}) vs available ({available})"
                })
            
            elif demand < available * 0.3:  # Low utilization
                decisions.append({
                    'action': 'reduce_resources',
                    'resource_type': resource_type,
                    'current_allocation': available,
                    'recommended_allocation': max(1, int(demand * 1.5)),
                    'priority': 'low',
                    'confidence': 0.6,
                    'reasoning': f"Low demand ({demand}) vs available ({available})"
                })
        
        return decisions
    
    def _calculate_decision_confidence(self, decisions: List[Dict]) -> float:
        """Calculate overall confidence in decisions"""
        if not decisions:
            return 0.0
        
        confidences = [d.get('confidence', 0.5) for d in decisions]
        return float(np.mean(confidences))

# Global instances
smart_router = SmartRoutingEngine()
decision_engine = AutomatedDecisionEngine()