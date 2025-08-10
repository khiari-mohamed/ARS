import torch
import torch.nn as nn
import torch.optim as optim
from transformers import AutoTokenizer, AutoModel, pipeline
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
import numpy as np
import pandas as pd
import joblib
import logging
from typing import Dict, List, Any, Tuple
import re
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class DocumentClassifier:
    def __init__(self):
        self.model = None
        self.vectorizer = None
        self.label_encoder = None
        self.scaler = None
        self.model_type = None
        
    def preprocess_text(self, text: str) -> str:
        """Preprocess text for classification"""
        if not text:
            return ""
        
        # Convert to lowercase
        text = text.lower()
        
        # Remove special characters but keep French accents
        text = re.sub(r'[^\w\sàâäéèêëïîôöùûüÿç]', ' ', text)
        
        # Remove extra whitespace
        text = ' '.join(text.split())
        
        return text
    
    def extract_features(self, documents: List[str]) -> np.ndarray:
        """Extract features from documents"""
        if self.vectorizer is None:
            self.vectorizer = TfidfVectorizer(
                max_features=5000,
                ngram_range=(1, 3),
                stop_words='french',
                min_df=2,
                max_df=0.95
            )
            features = self.vectorizer.fit_transform(documents)
        else:
            features = self.vectorizer.transform(documents)
        
        return features.toarray()
    
    def train_deep_learning_model(self, documents: List[str], labels: List[str]) -> Dict[str, Any]:
        """Train deep learning model for document classification"""
        try:
            # Preprocess documents
            processed_docs = [self.preprocess_text(doc) for doc in documents]
            
            # Extract features
            X = self.extract_features(processed_docs)
            
            # Encode labels
            if self.label_encoder is None:
                self.label_encoder = LabelEncoder()
                y = self.label_encoder.fit_transform(labels)
            else:
                y = self.label_encoder.transform(labels)
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42, stratify=y
            )
            
            # Scale features
            if self.scaler is None:
                self.scaler = StandardScaler()
                X_train_scaled = self.scaler.fit_transform(X_train)
            else:
                X_train_scaled = self.scaler.transform(X_train)
            
            X_test_scaled = self.scaler.transform(X_test)
            
            # Train neural network
            self.model = MLPClassifier(
                hidden_layer_sizes=(512, 256, 128),
                activation='relu',
                solver='adam',
                alpha=0.001,
                batch_size=32,
                learning_rate='adaptive',
                max_iter=500,
                early_stopping=True,
                validation_fraction=0.1,
                random_state=42
            )
            
            self.model.fit(X_train_scaled, y_train)
            self.model_type = 'deep_learning'
            
            # Evaluate model
            y_pred = self.model.predict(X_test_scaled)
            accuracy = accuracy_score(y_test, y_pred)
            
            # Get class probabilities for confidence scoring
            y_proba = self.model.predict_proba(X_test_scaled)
            confidence_scores = np.max(y_proba, axis=1)
            avg_confidence = np.mean(confidence_scores)
            
            return {
                'model_type': 'deep_learning',
                'accuracy': float(accuracy),
                'avg_confidence': float(avg_confidence),
                'n_classes': len(self.label_encoder.classes_),
                'classes': self.label_encoder.classes_.tolist(),
                'training_samples': len(X_train),
                'test_samples': len(X_test),
                'feature_count': X.shape[1]
            }
            
        except Exception as e:
            logger.error(f"Deep learning training failed: {e}")
            raise
    
    def train_ensemble_model(self, documents: List[str], labels: List[str]) -> Dict[str, Any]:
        """Train ensemble model combining multiple algorithms"""
        try:
            # Preprocess documents
            processed_docs = [self.preprocess_text(doc) for doc in documents]
            
            # Extract features
            X = self.extract_features(processed_docs)
            
            # Encode labels
            if self.label_encoder is None:
                self.label_encoder = LabelEncoder()
                y = self.label_encoder.fit_transform(labels)
            else:
                y = self.label_encoder.transform(labels)
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42, stratify=y
            )
            
            # Scale features
            if self.scaler is None:
                self.scaler = StandardScaler()
                X_train_scaled = self.scaler.fit_transform(X_train)
            else:
                X_train_scaled = self.scaler.transform(X_train)
            
            X_test_scaled = self.scaler.transform(X_test)
            
            # Train ensemble model (Gradient Boosting)
            self.model = GradientBoostingClassifier(
                n_estimators=200,
                learning_rate=0.1,
                max_depth=6,
                min_samples_split=10,
                min_samples_leaf=5,
                subsample=0.8,
                random_state=42
            )
            
            self.model.fit(X_train_scaled, y_train)
            self.model_type = 'ensemble'
            
            # Evaluate model
            y_pred = self.model.predict(X_test_scaled)
            accuracy = accuracy_score(y_test, y_pred)
            
            # Get feature importance
            feature_importance = self.model.feature_importances_
            
            return {
                'model_type': 'ensemble',
                'accuracy': float(accuracy),
                'n_classes': len(self.label_encoder.classes_),
                'classes': self.label_encoder.classes_.tolist(),
                'training_samples': len(X_train),
                'test_samples': len(X_test),
                'feature_count': X.shape[1],
                'feature_importance_stats': {
                    'mean': float(np.mean(feature_importance)),
                    'std': float(np.std(feature_importance)),
                    'max': float(np.max(feature_importance))
                }
            }
            
        except Exception as e:
            logger.error(f"Ensemble training failed: {e}")
            raise
    
    def classify_document(self, document: str, return_confidence: bool = True) -> Dict[str, Any]:
        """Classify a single document"""
        try:
            if self.model is None:
                raise ValueError("Model not trained yet")
            
            # Preprocess document
            processed_doc = self.preprocess_text(document)
            
            # Extract features
            X = self.extract_features([processed_doc])
            
            # Scale features
            X_scaled = self.scaler.transform(X)
            
            # Make prediction
            prediction = self.model.predict(X_scaled)[0]
            predicted_class = self.label_encoder.inverse_transform([prediction])[0]
            
            result = {
                'predicted_class': predicted_class,
                'prediction_id': int(prediction)
            }
            
            if return_confidence:
                if hasattr(self.model, 'predict_proba'):
                    probabilities = self.model.predict_proba(X_scaled)[0]
                    confidence = float(np.max(probabilities))
                    
                    result.update({
                        'confidence': confidence,
                        'confidence_level': 'high' if confidence > 0.8 else 'medium' if confidence > 0.6 else 'low',
                        'class_probabilities': {
                            self.label_encoder.inverse_transform([i])[0]: float(prob)
                            for i, prob in enumerate(probabilities)
                        }
                    })
                else:
                    result['confidence'] = 1.0
                    result['confidence_level'] = 'high'
            
            return result
            
        except Exception as e:
            logger.error(f"Document classification failed: {e}")
            raise
    
    def batch_classify(self, documents: List[str]) -> List[Dict[str, Any]]:
        """Classify multiple documents"""
        try:
            if self.model is None:
                raise ValueError("Model not trained yet")
            
            # Preprocess documents
            processed_docs = [self.preprocess_text(doc) for doc in documents]
            
            # Extract features
            X = self.extract_features(processed_docs)
            
            # Scale features
            X_scaled = self.scaler.transform(X)
            
            # Make predictions
            predictions = self.model.predict(X_scaled)
            predicted_classes = self.label_encoder.inverse_transform(predictions)
            
            results = []
            
            if hasattr(self.model, 'predict_proba'):
                probabilities = self.model.predict_proba(X_scaled)
                
                for i, (pred_class, probs) in enumerate(zip(predicted_classes, probabilities)):
                    confidence = float(np.max(probs))
                    
                    results.append({
                        'document_index': i,
                        'predicted_class': pred_class,
                        'confidence': confidence,
                        'confidence_level': 'high' if confidence > 0.8 else 'medium' if confidence > 0.6 else 'low',
                        'class_probabilities': {
                            self.label_encoder.inverse_transform([j])[0]: float(prob)
                            for j, prob in enumerate(probs)
                        }
                    })
            else:
                for i, pred_class in enumerate(predicted_classes):
                    results.append({
                        'document_index': i,
                        'predicted_class': pred_class,
                        'confidence': 1.0,
                        'confidence_level': 'high'
                    })
            
            return results
            
        except Exception as e:
            logger.error(f"Batch classification failed: {e}")
            raise
    
    def save_model(self, model_path: str) -> bool:
        """Save trained model"""
        try:
            model_data = {
                'model': self.model,
                'vectorizer': self.vectorizer,
                'label_encoder': self.label_encoder,
                'scaler': self.scaler,
                'model_type': self.model_type
            }
            
            joblib.dump(model_data, model_path)
            return True
            
        except Exception as e:
            logger.error(f"Model saving failed: {e}")
            return False
    
    def load_model(self, model_path: str) -> bool:
        """Load trained model"""
        try:
            model_data = joblib.load(model_path)
            
            self.model = model_data['model']
            self.vectorizer = model_data['vectorizer']
            self.label_encoder = model_data['label_encoder']
            self.scaler = model_data['scaler']
            self.model_type = model_data['model_type']
            
            return True
            
        except Exception as e:
            logger.error(f"Model loading failed: {e}")
            return False

class SLABreachPredictor:
    def __init__(self):
        self.model = None
        self.scaler = None
        self.feature_names = None
        
    def prepare_features(self, data: List[Dict]) -> Tuple[np.ndarray, List[str]]:
        """Prepare features for SLA breach prediction"""
        features = []
        feature_names = [
            'days_remaining', 'progress_ratio', 'processing_speed', 
            'workload_factor', 'complexity_score', 'team_efficiency',
            'historical_performance', 'client_priority'
        ]
        
        for item in data:
            # Calculate derived features
            start_date = datetime.fromisoformat(item['start_date'])
            deadline = datetime.fromisoformat(item['deadline'])
            current_date = datetime.now()
            
            total_days = (deadline - start_date).days
            days_remaining = (deadline - current_date).days
            days_elapsed = (current_date - start_date).days
            
            progress = item.get('current_progress', 0)
            total_required = item.get('total_required', 1)
            
            # Feature engineering
            progress_ratio = progress / max(total_required, 1)
            processing_speed = progress / max(days_elapsed, 1)
            workload_factor = item.get('workload', 1.0)
            complexity_score = item.get('complexity', 1.0)
            team_efficiency = item.get('team_efficiency', 1.0)
            historical_performance = item.get('historical_performance', 1.0)
            client_priority = item.get('client_priority', 1.0)
            
            features.append([
                days_remaining,
                progress_ratio,
                processing_speed,
                workload_factor,
                complexity_score,
                team_efficiency,
                historical_performance,
                client_priority
            ])
        
        return np.array(features), feature_names
    
    def train_sla_predictor(self, training_data: List[Dict], labels: List[int]) -> Dict[str, Any]:
        """Train SLA breach prediction model"""
        try:
            # Prepare features
            X, self.feature_names = self.prepare_features(training_data)
            y = np.array(labels)  # 0: no breach, 1: breach likely, 2: breach certain
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42, stratify=y
            )
            
            # Scale features
            self.scaler = StandardScaler()
            X_train_scaled = self.scaler.fit_transform(X_train)
            X_test_scaled = self.scaler.transform(X_test)
            
            # Train model
            self.model = GradientBoostingClassifier(
                n_estimators=150,
                learning_rate=0.1,
                max_depth=5,
                min_samples_split=10,
                random_state=42
            )
            
            self.model.fit(X_train_scaled, y_train)
            
            # Evaluate model
            y_pred = self.model.predict(X_test_scaled)
            accuracy = accuracy_score(y_test, y_pred)
            
            # Feature importance
            feature_importance = dict(zip(self.feature_names, self.model.feature_importances_))
            
            return {
                'accuracy': float(accuracy),
                'feature_importance': {k: float(v) for k, v in feature_importance.items()},
                'training_samples': len(X_train),
                'test_samples': len(X_test),
                'classes': ['No Breach', 'Breach Likely', 'Breach Certain']
            }
            
        except Exception as e:
            logger.error(f"SLA predictor training failed: {e}")
            raise
    
    def predict_sla_breach(self, data: Dict) -> Dict[str, Any]:
        """Predict SLA breach for a single item"""
        try:
            if self.model is None:
                raise ValueError("Model not trained yet")
            
            # Prepare features
            X, _ = self.prepare_features([data])
            X_scaled = self.scaler.transform(X)
            
            # Make prediction
            prediction = self.model.predict(X_scaled)[0]
            probabilities = self.model.predict_proba(X_scaled)[0]
            
            risk_levels = ['Low', 'Medium', 'High']
            risk_colors = ['🟢', '🟠', '🔴']
            
            return {
                'risk_level': risk_levels[prediction],
                'risk_color': risk_colors[prediction],
                'breach_probability': float(probabilities[prediction]),
                'class_probabilities': {
                    'no_breach': float(probabilities[0]),
                    'breach_likely': float(probabilities[1]),
                    'breach_certain': float(probabilities[2])
                },
                'confidence': float(np.max(probabilities)),
                'feature_contributions': dict(zip(self.feature_names, X[0].tolist()))
            }
            
        except Exception as e:
            logger.error(f"SLA breach prediction failed: {e}")
            raise

# Global instances
document_classifier = DocumentClassifier()
sla_predictor = SLABreachPredictor()