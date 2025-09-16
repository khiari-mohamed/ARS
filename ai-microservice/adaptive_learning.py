import numpy as np
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import logging
from collections import defaultdict, deque
from learning_engine import learning_engine
from model_persistence import model_persistence
import json

logger = logging.getLogger(__name__)

class AdaptiveLearning:
    def __init__(self):
        self.adaptation_cache = {}
        self.feedback_buffer = defaultdict(deque)
        self.performance_tracker = defaultdict(list)
        self.learning_rate = 0.1
        
    def enhance_classification(self, text: str, base_result: Dict) -> Dict:
        """Enhance classification with learned company context"""
        try:
            # Get enhanced result from learning engine
            enhanced_result = learning_engine.get_enhanced_classification(text, base_result)
            
            # Apply adaptive improvements
            enhanced_result = self._apply_classification_adaptations(text, enhanced_result)
            
            # Learn from this interaction
            learning_engine.learn_from_interaction('classify', {'text': text}, enhanced_result)
            
            return enhanced_result
            
        except Exception as e:
            logger.error(f"Enhanced classification failed: {e}")
            return base_result
    
    def enhance_sla_prediction(self, items: List[Dict], base_result: Dict) -> Dict:
        """Enhance SLA prediction with historical learning"""
        try:
            enhanced_result = base_result.copy()
            
            # Apply pattern-based improvements
            enhanced_result = self._apply_sla_adaptations(items, enhanced_result)
            
            # Learn from this interaction
            learning_engine.learn_from_interaction('sla_prediction', items, enhanced_result)
            
            return enhanced_result
            
        except Exception as e:
            logger.error(f"Enhanced SLA prediction failed: {e}")
            return base_result
    
    def enhance_sentiment_analysis(self, text: str, base_result: Dict) -> Dict:
        """Enhance sentiment analysis with company-specific patterns"""
        try:
            enhanced_result = base_result.copy()
            
            # Apply company lexicon to sentiment analysis
            company_sentiment_boost = self._calculate_company_sentiment_boost(text)
            
            if company_sentiment_boost != 0:
                # Adjust sentiment score based on company-specific terms
                current_score = enhanced_result.get('score', 0)
                enhanced_result['score'] = current_score + company_sentiment_boost
                
                # Recalculate sentiment based on new score
                new_score = enhanced_result['score']
                if new_score > 0.5:
                    enhanced_result['sentiment'] = 'positive'
                elif new_score < -0.5:
                    enhanced_result['sentiment'] = 'negative'
                else:
                    enhanced_result['sentiment'] = 'neutral'
                
                enhanced_result['company_context_adjustment'] = company_sentiment_boost
            
            # Learn from this interaction
            learning_engine.learn_from_interaction('sentiment_analysis', {'text': text}, enhanced_result)
            
            return enhanced_result
            
        except Exception as e:
            logger.error(f"Enhanced sentiment analysis failed: {e}")
            return base_result
    
    def _apply_classification_adaptations(self, text: str, result: Dict) -> Dict:
        """Apply learned adaptations to classification"""
        try:
            # Check for common misclassification patterns
            adaptations = self._get_classification_adaptations()
            
            current_category = result.get('category', 'GENERAL')
            text_lower = text.lower()
            
            # Apply learned corrections
            for pattern, correction in adaptations.items():
                if pattern in text_lower and correction['confidence'] > 0.7:
                    if current_category != correction['suggested_category']:
                        result['adaptive_suggestion'] = {
                            'original_category': current_category,
                            'suggested_category': correction['suggested_category'],
                            'reason': f"Learned pattern: {pattern}",
                            'confidence': correction['confidence']
                        }
                        
                        # Apply correction if confidence is high
                        if correction['confidence'] > 0.8:
                            result['category'] = correction['suggested_category']
                            result['confidence'] = min(100, result.get('confidence', 75) + 10)
            
            return result
            
        except Exception as e:
            logger.error(f"Classification adaptation failed: {e}")
            return result
    
    def _apply_sla_adaptations(self, items: List[Dict], result: Dict) -> Dict:
        """Apply learned adaptations to SLA predictions"""
        try:
            # Get SLA prediction adaptations
            adaptations = self._get_sla_adaptations()
            
            if 'sla_predictions' in result:
                for i, prediction in enumerate(result['sla_predictions']):
                    item = items[i] if i < len(items) else {}
                    
                    # Apply learned risk adjustments
                    risk_adjustment = self._calculate_risk_adjustment(item, adaptations)
                    
                    if risk_adjustment != 0:
                        original_score = prediction.get('score', 0)
                        adjusted_score = max(0, min(1, original_score + risk_adjustment))
                        
                        prediction['adaptive_adjustment'] = {
                            'original_score': original_score,
                            'adjustment': risk_adjustment,
                            'adjusted_score': adjusted_score,
                            'reason': 'Historical pattern learning'
                        }
                        
                        prediction['score'] = adjusted_score
                        
                        # Update risk level based on adjusted score
                        if adjusted_score > 0.8:
                            prediction['risk'] = '🔴'
                        elif adjusted_score > 0.5:
                            prediction['risk'] = '🟠'
                        else:
                            prediction['risk'] = '🟢'
            
            return result
            
        except Exception as e:
            logger.error(f"SLA adaptation failed: {e}")
            return result
    
    def _calculate_company_sentiment_boost(self, text: str) -> float:
        """Calculate sentiment boost based on company-specific terms"""
        try:
            boost = 0.0
            text_lower = text.lower()
            
            # Get company lexicon
            lexicon = learning_engine.company_lexicon
            
            # Company-specific positive terms
            positive_boost_terms = []
            negative_boost_terms = []
            
            for term, info in lexicon.items():
                if term in text_lower:
                    # Determine sentiment impact based on category and frequency
                    if info['category'] == 'finance' and info['frequency'] > 5:
                        if any(pos_word in term for pos_word in ['remboursement', 'paiement', 'crédit']):
                            positive_boost_terms.append(term)
                        elif any(neg_word in term for neg_word in ['retard', 'erreur', 'problème']):
                            negative_boost_terms.append(term)
            
            # Calculate boost
            boost += len(positive_boost_terms) * 0.2
            boost -= len(negative_boost_terms) * 0.2
            
            return max(-1.0, min(1.0, boost))  # Cap between -1 and 1
            
        except Exception as e:
            logger.error(f"Company sentiment boost calculation failed: {e}")
            return 0.0
    
    def _get_classification_adaptations(self) -> Dict:
        """Get learned classification adaptations"""
        try:
            # This would normally load from database/cache
            # For now, return empty dict - will be populated as system learns
            return {}
        except Exception as e:
            logger.error(f"Getting classification adaptations failed: {e}")
            return {}
    
    def _get_sla_adaptations(self) -> Dict:
        """Get learned SLA prediction adaptations"""
        try:
            # This would normally load from database/cache
            # For now, return empty dict - will be populated as system learns
            return {}
        except Exception as e:
            logger.error(f"Getting SLA adaptations failed: {e}")
            return {}
    
    def _calculate_risk_adjustment(self, item: Dict, adaptations: Dict) -> float:
        """Calculate risk score adjustment based on learned patterns"""
        try:
            adjustment = 0.0
            
            # Example adaptation logic (will be enhanced as system learns)
            complexity = item.get('complexity', 1)
            volume = item.get('volume', 1)
            
            # Simple pattern: high complexity + high volume = higher risk
            if complexity > 3 and volume > 5:
                adjustment += 0.1
            
            # Pattern: low complexity + low volume = lower risk
            if complexity <= 2 and volume <= 3:
                adjustment -= 0.1
            
            return adjustment
            
        except Exception as e:
            logger.error(f"Risk adjustment calculation failed: {e}")
            return 0.0
    
    def record_feedback(self, endpoint: str, prediction_id: str, feedback: Dict):
        """Record user feedback for learning"""
        try:
            # Store feedback in buffer
            self.feedback_buffer[endpoint].append({
                'prediction_id': prediction_id,
                'feedback': feedback,
                'timestamp': datetime.now()
            })
            
            # Keep only recent feedback (last 100 items)
            if len(self.feedback_buffer[endpoint]) > 100:
                self.feedback_buffer[endpoint].popleft()
            
            # Record in learning engine
            learning_engine.record_prediction_feedback(
                prediction_id, 
                endpoint, 
                feedback.get('predicted', ''), 
                feedback.get('actual', ''),
                feedback.get('confidence', 0.0)
            )
            
            # Update performance tracking
            self._update_performance_tracking(endpoint, feedback)
            
        except Exception as e:
            logger.error(f"Recording feedback failed: {e}")
    
    def _update_performance_tracking(self, endpoint: str, feedback: Dict):
        """Update performance tracking metrics"""
        try:
            accuracy = 1.0 if feedback.get('predicted') == feedback.get('actual') else 0.0
            
            self.performance_tracker[endpoint].append({
                'accuracy': accuracy,
                'confidence': feedback.get('confidence', 0.0),
                'timestamp': datetime.now()
            })
            
            # Keep only recent performance data
            if len(self.performance_tracker[endpoint]) > 200:
                self.performance_tracker[endpoint] = self.performance_tracker[endpoint][-200:]
            
        except Exception as e:
            logger.error(f"Performance tracking update failed: {e}")
    
    def get_learning_insights(self) -> Dict:
        """Get insights about the learning progress"""
        try:
            insights = {
                'learning_stats': learning_engine.get_learning_stats(),
                'performance_trends': {},
                'adaptation_summary': {
                    'total_adaptations': len(self.adaptation_cache),
                    'active_patterns': 0,
                    'learning_rate': self.learning_rate
                }
            }
            
            # Calculate performance trends
            for endpoint, performance_data in self.performance_tracker.items():
                if performance_data:
                    recent_accuracy = np.mean([p['accuracy'] for p in performance_data[-20:]])
                    overall_accuracy = np.mean([p['accuracy'] for p in performance_data])
                    
                    insights['performance_trends'][endpoint] = {
                        'recent_accuracy': float(recent_accuracy),
                        'overall_accuracy': float(overall_accuracy),
                        'improvement': float(recent_accuracy - overall_accuracy),
                        'total_predictions': len(performance_data)
                    }
            
            return insights
            
        except Exception as e:
            logger.error(f"Getting learning insights failed: {e}")
            return {}
    
    def optimize_learning_rate(self):
        """Automatically optimize learning rate based on performance"""
        try:
            # Calculate overall performance improvement
            total_improvement = 0
            endpoint_count = 0
            
            for endpoint, performance_data in self.performance_tracker.items():
                if len(performance_data) >= 20:
                    recent_perf = np.mean([p['accuracy'] for p in performance_data[-10:]])
                    older_perf = np.mean([p['accuracy'] for p in performance_data[-20:-10]])
                    improvement = recent_perf - older_perf
                    total_improvement += improvement
                    endpoint_count += 1
            
            if endpoint_count > 0:
                avg_improvement = total_improvement / endpoint_count
                
                # Adjust learning rate based on improvement
                if avg_improvement > 0.05:  # Good improvement
                    self.learning_rate = min(0.2, self.learning_rate * 1.1)
                elif avg_improvement < -0.05:  # Performance degrading
                    self.learning_rate = max(0.01, self.learning_rate * 0.9)
                
                logger.info(f"Optimized learning rate to {self.learning_rate:.3f}")
            
        except Exception as e:
            logger.error(f"Learning rate optimization failed: {e}")

# Global adaptive learning instance
adaptive_learning = AdaptiveLearning()