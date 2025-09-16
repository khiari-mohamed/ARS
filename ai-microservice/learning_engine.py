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
        """Initialize SQLite database for ARS learning data"""
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
            
            # ARS SLA outcomes table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS ars_sla_outcomes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    bordereau_id TEXT,
                    predicted_risk REAL,
                    actual_breach BOOLEAN,
                    accuracy REAL,
                    timestamp TEXT,
                    UNIQUE(bordereau_id, timestamp)
                )
            ''')
            
            # ARS assignment outcomes table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS ars_assignment_outcomes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    agent_id TEXT,
                    assignment_success BOOLEAN,
                    feedback_text TEXT,
                    timestamp TEXT
                )
            ''')
            
            # ARS classification outcomes table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS ars_classification_outcomes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    predicted_category TEXT,
                    correct_category TEXT,
                    accuracy REAL,
                    timestamp TEXT
                )
            ''')
            
            # ARS forecast outcomes table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS ars_forecast_outcomes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    forecast_date TEXT,
                    predicted_volume INTEGER,
                    actual_volume INTEGER,
                    accuracy REAL,
                    timestamp TEXT,
                    UNIQUE(forecast_date)
                )
            ''')
            
            conn.commit()
            conn.close()
            logger.info("ARS learning database initialized successfully")
            
        except Exception as e:
            logger.error(f"Database initialization failed: {e}")
    
    def learn_from_interaction(self, endpoint: str, input_data: Dict, output_data: Dict, user_feedback: Optional[str] = None):
        """Learn from each API interaction with ARS business context"""
        try:
            # Extract and learn ARS-specific terms
            self._extract_ars_terms(input_data, output_data)
            
            # Store interaction data
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO learning_data (endpoint, input_data, output_data, user_feedback)
                VALUES (?, ?, ?, ?)
            ''', (endpoint, json.dumps(input_data), json.dumps(output_data), user_feedback))
            
            conn.commit()
            conn.close()
            
            # Learn ARS business patterns
            self._learn_ars_business_outcomes(endpoint, input_data, output_data, user_feedback)
            
            # Update model performance
            self._update_model_performance(endpoint, input_data, output_data)
            
        except Exception as e:
            logger.error(f"Learning from interaction failed: {e}")
    
    def _extract_ars_terms(self, input_data: Dict, output_data: Dict):
        """Extract ARS-specific business terminology"""
        try:
            ars_terms = set()
            
            # ARS business keywords
            ars_keywords = [
                'bordereau', 'rib', 'virement', 'remboursement', 'sla', 'délai',
                'gestionnaire', 'chef équipe', 'réclamation', 'prestataire',
                'tiers payant', 'santé', 'finance', 'scan', 'bo', 'bs',
                'client', 'contrat', 'assurance', 'mutuelle', 'cpam', 'cnam'
            ]
            
            # Extract from all text fields
            all_text = []
            for data in [input_data, output_data]:
                all_text.extend(self._extract_text_fields(data))
            
            for text in all_text:
                if text:
                    text_lower = text.lower()
                    for keyword in ars_keywords:
                        if keyword in text_lower:
                            ars_terms.add(keyword)
                    
                    # Extract domain-specific terms
                    words = text_lower.split()
                    for word in words:
                        if (len(word) >= 3 and word.isalpha() and 
                            word not in ['les', 'des', 'une', 'pour', 'avec', 'dans']):
                            ars_terms.add(word)
            
            # Store ARS terms
            for term in ars_terms:
                self._add_to_lexicon(term, 'ars_business')
                
        except Exception as e:
            logger.error(f"ARS term extraction failed: {e}")
    
    def _extract_text_fields(self, data: Any) -> List[str]:
        """Recursively extract text fields from data"""
        texts = []
        if isinstance(data, dict):
            for value in data.values():
                texts.extend(self._extract_text_fields(value))
        elif isinstance(data, list):
            for item in data:
                texts.extend(self._extract_text_fields(item))
        elif isinstance(data, str) and len(data) > 2:
            texts.append(data)
        return texts
    
    def _learn_ars_business_outcomes(self, endpoint: str, input_data: Dict, output_data: Dict, feedback: str):
        """Learn from ARS business outcomes"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Learn SLA prediction accuracy
            if endpoint == 'sla_prediction' and feedback:
                predictions = output_data.get('sla_predictions', [])
                for pred in predictions:
                    bordereau_id = pred.get('bordereau_id')
                    risk_score = pred.get('risk_score', 0)
                    
                    # Parse feedback for actual outcome
                    actual_breach = 'breach' in feedback.lower() or 'dépassé' in feedback.lower()
                    accuracy = 1.0 if (risk_score > 0.5) == actual_breach else 0.0
                    
                    cursor.execute('''
                        INSERT OR REPLACE INTO ars_sla_outcomes
                        (bordereau_id, predicted_risk, actual_breach, accuracy, timestamp)
                        VALUES (?, ?, ?, ?, ?)
                    ''', (bordereau_id, risk_score, actual_breach, accuracy, datetime.now().isoformat()))
            
            # Learn assignment success
            elif endpoint == 'smart_routing_suggest' and feedback:
                assignment = output_data.get('recommended_assignment', {})
                agent_id = assignment.get('agent_id')
                success = 'success' in feedback.lower() or 'réussi' in feedback.lower()
                
                cursor.execute('''
                    INSERT OR REPLACE INTO ars_assignment_outcomes
                    (agent_id, assignment_success, feedback_text, timestamp)
                    VALUES (?, ?, ?, ?)
                ''', (agent_id, success, feedback, datetime.now().isoformat()))
            
            # Learn complaint classification accuracy
            elif endpoint == 'classify' and feedback:
                predicted_category = output_data.get('category', 'UNKNOWN')
                correct_category = self._extract_correct_category(feedback)
                if correct_category:
                    accuracy = 1.0 if predicted_category == correct_category else 0.0
                    
                    cursor.execute('''
                        INSERT INTO ars_classification_outcomes
                        (predicted_category, correct_category, accuracy, timestamp)
                        VALUES (?, ?, ?, ?)
                    ''', (predicted_category, correct_category, accuracy, datetime.now().isoformat()))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"ARS business outcome learning failed: {e}")
    
    def _extract_correct_category(self, feedback: str) -> str:
        """Extract correct category from user feedback"""
        feedback_lower = feedback.lower()
        if 'rib' in feedback_lower:
            return 'RIB_INVALIDE'
        elif 'retard' in feedback_lower or 'délai' in feedback_lower:
            return 'RETARD_VIREMENT'
        elif 'erreur' in feedback_lower:
            return 'ERREUR_DOSSIER'
        elif 'technique' in feedback_lower:
            return 'PROBLEME_TECHNIQUE'
        elif 'service' in feedback_lower:
            return 'QUALITE_SERVICE'
        return None
    

    
    def _categorize_term(self, term: str, context: str) -> str:
        """Categorize terms based on ARS business context"""
        ars_finance = ['rib', 'virement', 'remboursement', 'facture', 'paiement', 'montant', 'crédit', 'débit']
        ars_process = ['bordereau', 'traitement', 'validation', 'scan', 'bo', 'bs', 'sla', 'délai']
        ars_roles = ['gestionnaire', 'chef équipe', 'prestataire', 'tiers payant']
        ars_health = ['santé', 'cpam', 'cnam', 'mutuelle', 'assurance', 'soins']
        ars_complaints = ['réclamation', 'erreur', 'retard', 'problème', 'qualité']
        
        context_lower = context.lower()
        
        if any(keyword in context_lower for keyword in ars_finance):
            return 'ars_finance'
        elif any(keyword in context_lower for keyword in ars_process):
            return 'ars_process'
        elif any(keyword in context_lower for keyword in ars_roles):
            return 'ars_roles'
        elif any(keyword in context_lower for keyword in ars_health):
            return 'ars_health'
        elif any(keyword in context_lower for keyword in ars_complaints):
            return 'ars_complaints'
        else:
            return 'ars_business'
    
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
    
    def get_enhanced_ars_classification(self, text: str, base_classification: Dict) -> Dict:
        """Enhance classification using ARS business learning"""
        try:
            enhanced = base_classification.copy()
            
            # Get historical classification accuracy
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Check historical accuracy for this category
            predicted_category = base_classification.get('category', 'UNKNOWN')
            cursor.execute('''
                SELECT AVG(accuracy), COUNT(*) 
                FROM ars_classification_outcomes 
                WHERE predicted_category = ? AND timestamp > datetime('now', '-30 days')
            ''', (predicted_category,))
            
            result = cursor.fetchone()
            if result and result[1] > 0:  # Has historical data
                avg_accuracy = result[0]
                sample_count = result[1]
                
                # Adjust confidence based on historical accuracy
                confidence_adjustment = (avg_accuracy - 0.5) * 20  # -10 to +10 adjustment
                enhanced['confidence'] = max(0, min(100, 
                    enhanced.get('confidence', 70) + confidence_adjustment))
                
                enhanced['historical_accuracy'] = {
                    'category_accuracy': round(avg_accuracy, 3),
                    'sample_count': sample_count,
                    'confidence_adjusted': True
                }
            
            # Analyze ARS-specific terms
            text_lower = text.lower()
            ars_terms_found = []
            
            for term, info in self.company_lexicon.items():
                if info['category'] == 'ars_business' and term in text_lower:
                    ars_terms_found.append(term)
            
            if ars_terms_found:
                enhanced['ars_business_terms'] = ars_terms_found
                enhanced['ars_context_strength'] = len(ars_terms_found)
                
                # Boost confidence for ARS-specific content
                enhanced['confidence'] = min(100, 
                    enhanced.get('confidence', 70) + len(ars_terms_found) * 3)
            
            conn.close()
            return enhanced
            
        except Exception as e:
            logger.error(f"Enhanced ARS classification failed: {e}")
            return base_classification
    
    def get_adaptive_ars_sla_prediction(self, base_prediction: Dict, bordereau_data: Dict) -> Dict:
        """Enhance SLA prediction using ARS historical outcomes"""
        try:
            enhanced = base_prediction.copy()
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get recent SLA prediction accuracy
            cursor.execute('''
                SELECT AVG(accuracy), COUNT(*) 
                FROM ars_sla_outcomes 
                WHERE timestamp > datetime('now', '-30 days')
            ''')
            
            result = cursor.fetchone()
            if result and result[1] > 5:  # Need at least 5 samples
                avg_accuracy = result[0]
                sample_count = result[1]
                
                # Adjust predictions based on historical accuracy
                if 'sla_predictions' in enhanced:
                    for pred in enhanced['sla_predictions']:
                        original_risk = pred.get('risk_score', 0.5)
                        
                        # Calibrate risk score based on historical accuracy
                        if avg_accuracy < 0.7:  # Model tends to be wrong
                            # Be more conservative
                            calibrated_risk = original_risk * 0.8
                        elif avg_accuracy > 0.9:  # Model is very accurate
                            # Trust the prediction more
                            calibrated_risk = original_risk * 1.1
                        else:
                            calibrated_risk = original_risk
                        
                        pred['risk_score'] = min(1.0, max(0.0, calibrated_risk))
                        pred['calibration_applied'] = {
                            'historical_accuracy': round(avg_accuracy, 3),
                            'sample_count': sample_count,
                            'original_risk': original_risk,
                            'calibrated_risk': round(calibrated_risk, 3)
                        }
            
            # Get agent-specific performance if assigned
            assigned_agent = bordereau_data.get('assignedToUserId')
            if assigned_agent:
                cursor.execute('''
                    SELECT AVG(CASE WHEN assignment_success THEN 1.0 ELSE 0.0 END), COUNT(*)
                    FROM ars_assignment_outcomes 
                    WHERE agent_id = ? AND timestamp > datetime('now', '-60 days')
                ''', (str(assigned_agent),))
                
                agent_result = cursor.fetchone()
                if agent_result and agent_result[1] > 0:
                    agent_success_rate = agent_result[0]
                    
                    # Adjust risk based on agent performance
                    if 'sla_predictions' in enhanced:
                        for pred in enhanced['sla_predictions']:
                            if pred.get('assigned_to') == bordereau_data.get('assigned_to_name'):
                                # Good agent = lower risk, poor agent = higher risk
                                agent_factor = 1.0 - (agent_success_rate - 0.5) * 0.2
                                pred['risk_score'] = min(1.0, pred['risk_score'] * agent_factor)
                                pred['agent_performance_factor'] = {
                                    'success_rate': round(agent_success_rate, 3),
                                    'adjustment_factor': round(agent_factor, 3)
                                }
            
            conn.close()
            return enhanced
            
        except Exception as e:
            logger.error(f"Adaptive ARS SLA prediction failed: {e}")
            return base_prediction
    

    
    def record_ars_outcome(self, endpoint: str, prediction_data: Dict, actual_outcome: Dict):
        """Record actual ARS business outcomes for learning"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            if endpoint == 'sla_prediction':
                bordereau_id = actual_outcome.get('bordereau_id')
                actual_breach = actual_outcome.get('sla_breached', False)
                predicted_risk = prediction_data.get('risk_score', 0.5)
                accuracy = 1.0 if (predicted_risk > 0.5) == actual_breach else 0.0
                
                cursor.execute('''
                    INSERT OR REPLACE INTO ars_sla_outcomes
                    (bordereau_id, predicted_risk, actual_breach, accuracy, timestamp)
                    VALUES (?, ?, ?, ?, ?)
                ''', (bordereau_id, predicted_risk, actual_breach, accuracy, datetime.now().isoformat()))
            
            elif endpoint == 'forecast_client_load':
                forecast_date = actual_outcome.get('date')
                actual_volume = actual_outcome.get('actual_bordereaux', 0)
                predicted_volume = prediction_data.get('predicted_bordereaux', 0)
                accuracy = 1.0 - abs(predicted_volume - actual_volume) / max(actual_volume, 1)
                
                cursor.execute('''
                    INSERT OR REPLACE INTO ars_forecast_outcomes
                    (forecast_date, predicted_volume, actual_volume, accuracy, timestamp)
                    VALUES (?, ?, ?, ?, ?)
                ''', (forecast_date, predicted_volume, actual_volume, max(0.0, accuracy), datetime.now().isoformat()))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Recording ARS outcome failed: {e}")
    

    
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
        """Get comprehensive ARS learning statistics"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get lexicon stats
            cursor.execute('SELECT COUNT(*), AVG(frequency) FROM company_lexicon')
            lexicon_count, avg_frequency = cursor.fetchone()
            
            # Get ARS-specific lexicon
            cursor.execute('SELECT COUNT(*) FROM company_lexicon WHERE category = "ars_business"')
            ars_lexicon_count = cursor.fetchone()[0]
            
            # Get learning data stats
            cursor.execute('SELECT COUNT(*) FROM learning_data')
            interactions_count = cursor.fetchone()[0]
            
            # Get ARS SLA accuracy
            cursor.execute('''
                SELECT AVG(accuracy), COUNT(*) 
                FROM ars_sla_outcomes 
                WHERE timestamp > datetime('now', '-30 days')
            ''')
            sla_accuracy, sla_count = cursor.fetchone()
            
            # Get ARS assignment success rate
            cursor.execute('''
                SELECT AVG(CASE WHEN assignment_success THEN 1.0 ELSE 0.0 END), COUNT(*)
                FROM ars_assignment_outcomes 
                WHERE timestamp > datetime('now', '-30 days')
            ''')
            assignment_success, assignment_count = cursor.fetchone()
            
            # Get ARS classification accuracy
            cursor.execute('''
                SELECT AVG(accuracy), COUNT(*) 
                FROM ars_classification_outcomes 
                WHERE timestamp > datetime('now', '-30 days')
            ''')
            classification_accuracy, classification_count = cursor.fetchone()
            
            conn.close()
            
            return {
                'company_lexicon_size': lexicon_count or 0,
                'ars_lexicon_size': ars_lexicon_count or 0,
                'avg_term_frequency': float(avg_frequency or 0),
                'total_interactions': interactions_count or 0,
                'ars_performance': {
                    'sla_prediction': {
                        'accuracy': round(sla_accuracy or 0, 3),
                        'sample_count': sla_count or 0,
                        'status': 'excellent' if (sla_accuracy or 0) > 0.85 else 'good' if (sla_accuracy or 0) > 0.7 else 'needs_improvement'
                    },
                    'assignment_success': {
                        'success_rate': round(assignment_success or 0, 3),
                        'sample_count': assignment_count or 0,
                        'status': 'excellent' if (assignment_success or 0) > 0.8 else 'good' if (assignment_success or 0) > 0.6 else 'needs_improvement'
                    },
                    'classification': {
                        'accuracy': round(classification_accuracy or 0, 3),
                        'sample_count': classification_count or 0,
                        'status': 'excellent' if (classification_accuracy or 0) > 0.9 else 'good' if (classification_accuracy or 0) > 0.75 else 'needs_improvement'
                    }
                },
                'learning_quality': self._assess_learning_quality(sla_accuracy, assignment_success, classification_accuracy)
            }
            
        except Exception as e:
            logger.error(f"Getting learning stats failed: {e}")
            return {}
    
    def _assess_learning_quality(self, sla_acc: float, assign_acc: float, class_acc: float) -> Dict:
        """Assess overall learning quality"""
        scores = [s for s in [sla_acc, assign_acc, class_acc] if s is not None]
        if not scores:
            return {'overall': 'insufficient_data', 'score': 0.0}
        
        avg_score = sum(scores) / len(scores)
        
        if avg_score > 0.85:
            return {'overall': 'excellent', 'score': round(avg_score, 3), 'recommendation': 'AI is performing exceptionally well'}
        elif avg_score > 0.75:
            return {'overall': 'good', 'score': round(avg_score, 3), 'recommendation': 'AI is performing well, minor optimizations possible'}
        elif avg_score > 0.6:
            return {'overall': 'moderate', 'score': round(avg_score, 3), 'recommendation': 'AI needs improvement, more training data required'}
        else:
            return {'overall': 'poor', 'score': round(avg_score, 3), 'recommendation': 'AI requires significant retraining and data quality review'}

# Global learning engine instance
learning_engine = LearningEngine()

# Enhanced learning methods for ARS
def enhance_with_ars_learning(endpoint: str, base_result: Dict, context_data: Dict = None) -> Dict:
    """Enhance any AI result with ARS-specific learning"""
    try:
        if endpoint == 'classify':
            return learning_engine.get_enhanced_ars_classification(
                context_data.get('text', ''), base_result
            )
        elif endpoint == 'sla_prediction':
            return learning_engine.get_adaptive_ars_sla_prediction(
                base_result, context_data or {}
            )
        else:
            return base_result
    except Exception as e:
        logger.error(f"ARS learning enhancement failed: {e}")
        return base_result