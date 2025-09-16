from database import get_db_manager
import logging
from typing import List, Dict, Any
import numpy as np
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class AILearningEngine:
    """Continuous learning engine that uses saved AI outputs to improve"""
    
    def __init__(self):
        self.learning_enabled = True
        self.min_samples_for_learning = 10
    
    async def get_learning_data(self, endpoint: str, days_back: int = 30) -> List[Dict]:
        """Get historical AI outputs for learning"""
        try:
            db = await get_db_manager()
            
            # Get recent AI outputs for this endpoint
            training_data = await db.get_ai_training_data(endpoint, limit=1000)
            
            # Filter by date if specified
            if days_back > 0:
                cutoff_date = datetime.utcnow() - timedelta(days=days_back)
                training_data = [
                    data for data in training_data 
                    if data['created_at'] >= cutoff_date
                ]
            
            return training_data
            
        except Exception as e:
            logger.error(f"Error getting learning data: {e}")
            return []
    
    async def improve_classification_model(self, new_documents: List[str], new_labels: List[str]):
        """Continuously improve classification using saved outputs"""
        try:
            # Get historical classification data
            historical_data = await self.get_learning_data("document_classification_train")
            
            if len(historical_data) < self.min_samples_for_learning:
                logger.info("Not enough historical data for learning")
                return False
            
            # Extract documents and labels from historical data
            historical_docs = []
            historical_labels = []
            
            for data in historical_data:
                if 'documents' in data['input_data'] and 'labels' in data['input_data']:
                    historical_docs.extend(data['input_data']['documents'])
                    historical_labels.extend(data['input_data']['labels'])
            
            # Combine with new data
            all_documents = historical_docs + new_documents
            all_labels = historical_labels + new_labels
            
            # Remove duplicates while preserving order
            seen = set()
            unique_docs = []
            unique_labels = []
            
            for doc, label in zip(all_documents, all_labels):
                if doc not in seen:
                    seen.add(doc)
                    unique_docs.append(doc)
                    unique_labels.append(label)
            
            logger.info(f"Learning from {len(unique_docs)} total documents ({len(new_documents)} new)")
            
            # Retrain model with combined data
            from advanced_ml_models import DocumentClassifier
            improved_classifier = DocumentClassifier()
            
            result = improved_classifier.train_ensemble_model(unique_docs, unique_labels)
            
            # Replace global classifier if improvement is significant
            if result['accuracy'] > 0.8:  # Only if good accuracy
                global document_classifier
                from ai_microservice import document_classifier
                document_classifier = improved_classifier
                logger.info(f"Model improved with accuracy: {result['accuracy']:.3f}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Model improvement failed: {e}")
            return False
    
    async def analyze_prediction_patterns(self, endpoint: str) -> Dict[str, Any]:
        """Analyze patterns in AI predictions for insights"""
        try:
            historical_data = await self.get_learning_data(endpoint, days_back=7)
            
            if not historical_data:
                return {"patterns": [], "insights": "No data available"}
            
            # Analyze confidence trends
            confidences = [data['confidence'] for data in historical_data if data['confidence']]
            
            if confidences:
                avg_confidence = np.mean(confidences)
                confidence_trend = "improving" if len(confidences) > 5 and np.mean(confidences[-5:]) > np.mean(confidences[:5]) else "stable"
            else:
                avg_confidence = 0
                confidence_trend = "unknown"
            
            # Analyze usage patterns
            usage_by_day = {}
            for data in historical_data:
                day = data['created_at'].date()
                usage_by_day[day] = usage_by_day.get(day, 0) + 1
            
            peak_usage_day = max(usage_by_day, key=usage_by_day.get) if usage_by_day else None
            
            return {
                "total_predictions": len(historical_data),
                "avg_confidence": round(avg_confidence, 3) if avg_confidence else 0,
                "confidence_trend": confidence_trend,
                "peak_usage_day": str(peak_usage_day) if peak_usage_day else None,
                "daily_usage": dict(sorted(usage_by_day.items())),
                "insights": f"AI model showing {confidence_trend} performance with {len(historical_data)} recent predictions"
            }
            
        except Exception as e:
            logger.error(f"Pattern analysis failed: {e}")
            return {"error": str(e)}
    
    async def get_smart_suggestions(self, endpoint: str, current_input: Dict) -> List[str]:
        """Get smart suggestions based on historical successful outputs"""
        try:
            historical_data = await self.get_learning_data(endpoint, days_back=14)
            
            # Find similar successful predictions
            high_confidence_data = [
                data for data in historical_data 
                if data['confidence'] and data['confidence'] > 0.9
            ]
            
            suggestions = []
            
            if len(high_confidence_data) >= 3:
                suggestions.append(f"Based on {len(high_confidence_data)} high-confidence predictions")
                
                # Analyze common patterns in successful predictions
                if endpoint == "document_classification_classify":
                    common_classes = {}
                    for data in high_confidence_data:
                        if 'classifications' in data['result']:
                            for classification in data['result']['classifications']:
                                predicted_class = classification.get('predicted_class', 'unknown')
                                common_classes[predicted_class] = common_classes.get(predicted_class, 0) + 1
                    
                    if common_classes:
                        most_common = max(common_classes, key=common_classes.get)
                        suggestions.append(f"Most successful classification: {most_common}")
            
            return suggestions[:3]  # Limit to top 3 suggestions
            
        except Exception as e:
            logger.error(f"Smart suggestions failed: {e}")
            return []

# Global learning engine
ai_learning_engine = AILearningEngine()