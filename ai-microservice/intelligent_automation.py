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
    
    def suggest_optimal_assignment(self, task: Dict, available_teams: List[str] = None) -> Dict[str, Any]:
        """Suggest optimal task assignment"""
        try:
            if self.routing_model is None:
                return {'error': 'Routing model not trained'}
            
            # Prepare task features
            task_features = [
                task.get('priority', 1),
                task.get('complexity', 1),
                task.get('estimated_time', 1),
                task.get('client_importance', 1),
                task.get('sla_urgency', 1),
                task.get('document_count', 1),
                task.get('requires_expertise', 0),
                task.get('is_recurring', 0)
            ]
            
            # Add temporal features
            now = datetime.now()
            task_features.extend([now.hour, now.weekday(), now.day])
            
            # Scale features
            X = self.scaler.transform([task_features])
            
            # Get predictions and probabilities
            predictions = self.routing_model.predict(X)
            probabilities = self.routing_model.predict_proba(X)[0]
            
            # Get all possible assignments with scores
            all_assignees = self.label_encoder.classes_
            assignment_scores = []
            
            for i, assignee in enumerate(all_assignees):
                if available_teams and assignee not in available_teams:
                    continue
                
                base_score = probabilities[i]
                
                # Adjust score based on team profile
                if assignee in self.team_profiles:
                    profile = self.team_profiles[assignee]
                    
                    # Specialization bonus
                    task_type = task.get('type', 'general')
                    specialization_bonus = profile['specializations'].get(task_type, 0) * 0.2
                    
                    # Workload penalty
                    workload_penalty = min(profile['workload_capacity'] / 10, 0.3)
                    
                    # Efficiency bonus
                    efficiency_bonus = profile['efficiency_score'] * 0.1
                    
                    adjusted_score = base_score + specialization_bonus + efficiency_bonus - workload_penalty
                else:
                    adjusted_score = base_score
                
                assignment_scores.append({
                    'assignee': assignee,
                    'base_score': float(base_score),
                    'adjusted_score': float(max(0, adjusted_score)),
                    'confidence': 'high' if adjusted_score > 0.7 else 'medium' if adjusted_score > 0.4 else 'low'
                })
            
            # Sort by adjusted score
            assignment_scores.sort(key=lambda x: x['adjusted_score'], reverse=True)
            
            # Get top recommendation
            top_recommendation = assignment_scores[0] if assignment_scores else None
            
            return {
                'recommended_assignee': top_recommendation['assignee'] if top_recommendation else None,
                'confidence': top_recommendation['confidence'] if top_recommendation else 'low',
                'score': top_recommendation['adjusted_score'] if top_recommendation else 0,
                'all_options': assignment_scores[:5],  # Top 5 options
                'reasoning': self._generate_assignment_reasoning(task, top_recommendation)
            }
            
        except Exception as e:
            logger.error(f"Assignment suggestion failed: {e}")
            raise
    
    def _generate_assignment_reasoning(self, task: Dict, recommendation: Dict) -> List[str]:
        """Generate reasoning for assignment recommendation"""
        if not recommendation:
            return ["No suitable assignee found"]
        
        reasoning = []
        assignee = recommendation['assignee']
        
        # Check team profile
        if assignee in self.team_profiles:
            profile = self.team_profiles[assignee]
            
            # Specialization reasoning
            task_type = task.get('type', 'general')
            if task_type in profile['specializations'] and profile['specializations'][task_type] > 0.3:
                reasoning.append(f"High specialization in {task_type} tasks ({profile['specializations'][task_type]:.1%})")
            
            # Efficiency reasoning
            if profile['efficiency_score'] > 0.7:
                reasoning.append(f"High efficiency score ({profile['efficiency_score']:.2f})")
            
            # Workload reasoning
            if profile['workload_capacity'] < 5:
                reasoning.append("Low current workload")
            elif profile['workload_capacity'] > 8:
                reasoning.append("High current workload - consider redistribution")
        
        # Task-specific reasoning
        if task.get('priority', 1) > 3:
            reasoning.append("High priority task requires experienced handler")
        
        if task.get('sla_urgency', 1) > 3:
            reasoning.append("SLA urgency requires fast processing")
        
        return reasoning if reasoning else ["Best match based on historical performance"]

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