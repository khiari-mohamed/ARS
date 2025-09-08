import sqlite3
import json
import pickle
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import logging
from collections import defaultdict, Counter
import os
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import joblib

logger = logging.getLogger(__name__)

class LearningEngine:
    def __init__(self, db_path: str = "ai_learning.db"):
        self.db_path = db_path
        self.company_lexicon = {}
        self.model_cache = {}
        self.performance_history = defaultdict(list)
        self._init_database()
        self._load_company_lexicon()
        
    def _init_database(self):
        """Initialize SQLite database for learning data"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Company lexicon table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS company_lexicon (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    term TEXT UNIQUE,
                    category TEXT,
                    frequency INTEGER DEFAULT 1,
                    context TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Learning data table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS learning_data (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    endpoint TEXT,
                    input_data TEXT,
                    output_data TEXT,
                    user_feedback TEXT,
                    accuracy_score REAL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Model performance table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS model_performance (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    model_name TEXT,
                    accuracy REAL,
                    precision_score REAL,
                    recall_score REAL,
                    f1_score REAL,
                    training_samples INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Prediction feedback table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS prediction_feedback (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    prediction_id TEXT,
                    endpoint TEXT,
                    predicted_value TEXT,
                    actual_value TEXT,
                    user_correction TEXT,
                    confidence_score REAL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            conn.commit()
            conn.close()
            logger.info("Learning database initialized successfully")
            
        except Exception as e:
            logger.error(f"Database initialization failed: {e}")
    
    def learn_from_interaction(self, endpoint: str, input_data: Dict, output_data: Dict, user_feedback: Optional[str] = None):
        """Learn from each API interaction"""
        try:
            # Extract and learn company-specific terms
            self._extract_company_terms(input_data)
            
            # Store interaction data
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO learning_data (endpoint, input_data, output_data, user_feedback)
                VALUES (?, ?, ?, ?)
            ''', (endpoint, json.dumps(input_data), json.dumps(output_data), user_feedback))
            
            conn.commit()
            conn.close()
            
            # Update model performance if applicable
            self._update_model_performance(endpoint, input_data, output_data)
            
        except Exception as e:
            logger.error(f"Learning from interaction failed: {e}")
    
    def _extract_company_terms(self, data: Dict):
        """Extract and learn company-specific terminology"""
        try:
            text_fields = []
            
            # Extract text from various fields
            if isinstance(data, dict):
                for key, value in data.items():
                    if isinstance(value, str) and len(value) > 3:
                        text_fields.append(value.lower())
                    elif isinstance(value, list):
                        for item in value:
                            if isinstance(item, dict):
                                for sub_key, sub_value in item.items():
                                    if isinstance(sub_value, str) and len(sub_value) > 3:
                                        text_fields.append(sub_value.lower())
            
            # Process extracted text
            for text in text_fields:
                words = text.split()
                for word in words:
                    if len(word) > 3 and word.isalpha():
                        self._add_to_lexicon(word, self._categorize_term(word, text))
                        
        except Exception as e:
            logger.error(f"Term extraction failed: {e}")
    
    def _categorize_term(self, term: str, context: str) -> str:
        """Categorize terms based on context"""
        finance_keywords = ['remboursement', 'facture', 'paiement', 'montant', 'crédit', 'débit']
        process_keywords = ['traitement', 'validation', 'vérification', 'contrôle', 'analyse']
        client_keywords = ['client', 'assuré', 'bénéficiaire', 'demandeur', 'titulaire']
        
        if any(keyword in context for keyword in finance_keywords):
            return 'finance'
        elif any(keyword in context for keyword in process_keywords):
            return 'process'
        elif any(keyword in context for keyword in client_keywords):
            return 'client'
        else:
            return 'general'
    
    def _add_to_lexicon(self, term: str, category: str):
        """Add term to company lexicon"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Check if term exists
            cursor.execute('SELECT frequency FROM company_lexicon WHERE term = ?', (term,))
            result = cursor.fetchone()
            
            if result:
                # Update frequency
                cursor.execute('''
                    UPDATE company_lexicon 
                    SET frequency = frequency + 1, updated_at = CURRENT_TIMESTAMP 
                    WHERE term = ?
                ''', (term,))
            else:
                # Insert new term
                cursor.execute('''
                    INSERT INTO company_lexicon (term, category, frequency)
                    VALUES (?, ?, 1)
                ''', (term, category))
            
            conn.commit()
            conn.close()
            
            # Update in-memory lexicon
            if term not in self.company_lexicon:
                self.company_lexicon[term] = {'category': category, 'frequency': 1}
            else:
                self.company_lexicon[term]['frequency'] += 1
                
        except Exception as e:
            logger.error(f"Adding to lexicon failed: {e}")
    
    def _load_company_lexicon(self):
        """Load company lexicon from database"""
        try:
            if not os.path.exists(self.db_path):
                return
                
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('SELECT term, category, frequency FROM company_lexicon')
            results = cursor.fetchall()
            
            for term, category, frequency in results:
                self.company_lexicon[term] = {
                    'category': category,
                    'frequency': frequency
                }
            
            conn.close()
            logger.info(f"Loaded {len(self.company_lexicon)} terms from company lexicon")
            
        except Exception as e:
            logger.error(f"Loading lexicon failed: {e}")
    
    def get_enhanced_classification(self, text: str, base_classification: Dict) -> Dict:
        """Enhance classification using learned company lexicon"""
        try:
            enhanced = base_classification.copy()
            
            # Analyze text against company lexicon
            text_lower = text.lower()
            company_terms_found = []
            category_scores = defaultdict(float)
            
            for term, info in self.company_lexicon.items():
                if term in text_lower:
                    company_terms_found.append(term)
                    # Weight by frequency (more common terms have higher weight)
                    weight = min(info['frequency'] / 10, 2.0)  # Cap at 2.0
                    category_scores[info['category']] += weight
            
            # Adjust classification based on company-specific terms
            if company_terms_found:
                enhanced['company_terms'] = company_terms_found
                enhanced['company_context_score'] = sum(category_scores.values())
                
                # Boost confidence if company terms are found
                if 'confidence' in enhanced:
                    enhanced['confidence'] = min(100, enhanced['confidence'] + len(company_terms_found) * 5)
                
                # Suggest category adjustment if strong company context
                dominant_category = max(category_scores, key=category_scores.get) if category_scores else None
                if dominant_category and category_scores[dominant_category] > 2:
                    enhanced['suggested_category_adjustment'] = dominant_category
            
            return enhanced
            
        except Exception as e:
            logger.error(f"Enhanced classification failed: {e}")
            return base_classification
    
    def get_adaptive_sla_prediction(self, base_prediction: Dict, item_data: Dict) -> Dict:
        """Enhance SLA prediction using historical learning"""
        try:
            enhanced = base_prediction.copy()
            
            # Get historical performance for similar items
            similar_items = self._find_similar_historical_items(item_data)
            
            if similar_items:
                # Calculate adaptive factors
                historical_accuracy = np.mean([item['actual_outcome'] for item in similar_items])
                confidence_adjustment = len(similar_items) * 0.05  # More history = more confidence
                
                # Adjust prediction based on historical patterns
                if 'sla_predictions' in enhanced:
                    for pred in enhanced['sla_predictions']:
                        if 'score' in pred:
                            # Adjust score based on historical accuracy
                            pred['score'] = pred['score'] * (1 + historical_accuracy * 0.1)
                            pred['historical_context'] = {
                                'similar_cases': len(similar_items),
                                'historical_accuracy': float(historical_accuracy),
                                'confidence_boost': float(confidence_adjustment)
                            }
            
            return enhanced
            
        except Exception as e:
            logger.error(f"Adaptive SLA prediction failed: {e}")
            return base_prediction
    
    def _find_similar_historical_items(self, item_data: Dict) -> List[Dict]:
        """Find similar historical items for pattern learning"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get recent SLA predictions with feedback
            cursor.execute('''
                SELECT input_data, user_feedback, accuracy_score
                FROM learning_data 
                WHERE endpoint = 'sla_prediction' 
                AND user_feedback IS NOT NULL
                AND created_at > datetime('now', '-30 days')
                ORDER BY created_at DESC
                LIMIT 50
            ''')
            
            results = cursor.fetchall()
            conn.close()
            
            similar_items = []
            current_complexity = item_data.get('complexity', 1)
            current_volume = item_data.get('volume', 1)
            
            for input_str, feedback, accuracy in results:
                try:
                    historical_data = json.loads(input_str)
                    if isinstance(historical_data, list) and historical_data:
                        hist_item = historical_data[0]
                        hist_complexity = hist_item.get('complexity', 1)
                        hist_volume = hist_item.get('volume', 1)
                        
                        # Simple similarity check
                        if (abs(hist_complexity - current_complexity) <= 1 and 
                            abs(hist_volume - current_volume) <= 2):
                            similar_items.append({
                                'data': hist_item,
                                'feedback': feedback,
                                'actual_outcome': 1 if 'correct' in feedback.lower() else 0
                            })
                except:
                    continue
            
            return similar_items
            
        except Exception as e:
            logger.error(f"Finding similar items failed: {e}")
            return []
    
    def record_prediction_feedback(self, prediction_id: str, endpoint: str, predicted: str, actual: str, confidence: float):
        """Record feedback on predictions for learning"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO prediction_feedback 
                (prediction_id, endpoint, predicted_value, actual_value, confidence_score)
                VALUES (?, ?, ?, ?, ?)
            ''', (prediction_id, endpoint, predicted, actual, confidence))
            
            conn.commit()
            conn.close()
            
            # Update model performance metrics
            self._update_accuracy_metrics(endpoint, predicted == actual)
            
        except Exception as e:
            logger.error(f"Recording feedback failed: {e}")
    
    def _update_accuracy_metrics(self, endpoint: str, is_correct: bool):
        """Update running accuracy metrics"""
        try:
            if endpoint not in self.performance_history:
                self.performance_history[endpoint] = []
            
            self.performance_history[endpoint].append(1 if is_correct else 0)
            
            # Keep only last 100 predictions
            if len(self.performance_history[endpoint]) > 100:
                self.performance_history[endpoint] = self.performance_history[endpoint][-100:]
            
        except Exception as e:
            logger.error(f"Updating accuracy metrics failed: {e}")
    
    def _update_model_performance(self, endpoint: str, input_data: Dict, output_data: Dict):
        """Update model performance tracking"""
        try:
            # Calculate confidence and accuracy metrics where possible
            confidence = 0.0
            if isinstance(output_data, dict):
                if 'confidence' in output_data:
                    confidence = output_data['confidence']
                elif 'sla_predictions' in output_data:
                    # For SLA predictions, use average score as confidence proxy
                    scores = [pred.get('score', 0) for pred in output_data['sla_predictions']]
                    confidence = np.mean(scores) if scores else 0.0
            
            # Store performance data
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO model_performance (model_name, accuracy, training_samples)
                VALUES (?, ?, ?)
            ''', (endpoint, confidence, len(input_data) if isinstance(input_data, list) else 1))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Updating model performance failed: {e}")
    
    def get_learning_stats(self) -> Dict:
        """Get learning statistics"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get lexicon stats
            cursor.execute('SELECT COUNT(*), AVG(frequency) FROM company_lexicon')
            lexicon_count, avg_frequency = cursor.fetchone()
            
            # Get learning data stats
            cursor.execute('SELECT COUNT(*) FROM learning_data')
            interactions_count = cursor.fetchone()[0]
            
            # Get feedback stats
            cursor.execute('SELECT COUNT(*) FROM prediction_feedback')
            feedback_count = cursor.fetchone()[0]
            
            # Get category distribution
            cursor.execute('SELECT category, COUNT(*) FROM company_lexicon GROUP BY category')
            category_dist = dict(cursor.fetchall())
            
            conn.close()
            
            return {
                'company_lexicon_size': lexicon_count or 0,
                'avg_term_frequency': float(avg_frequency or 0),
                'total_interactions': interactions_count or 0,
                'feedback_received': feedback_count or 0,
                'category_distribution': category_dist,
                'performance_history': {
                    endpoint: {
                        'recent_accuracy': np.mean(scores[-20:]) if scores else 0,
                        'total_predictions': len(scores)
                    }
                    for endpoint, scores in self.performance_history.items()
                }
            }
            
        except Exception as e:
            logger.error(f"Getting learning stats failed: {e}")
            return {}

# Global learning engine instance
learning_engine = LearningEngine()