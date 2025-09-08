import os
import pickle
import joblib
import json
import numpy as np
from datetime import datetime
from typing import Dict, Any, Optional
import logging
from sklearn.base import BaseEstimator
import hashlib

logger = logging.getLogger(__name__)

class ModelPersistence:
    def __init__(self, models_dir: str = "models"):
        self.models_dir = models_dir
        self.model_registry = {}
        self._ensure_models_directory()
        self._load_model_registry()
    
    def _ensure_models_directory(self):
        """Ensure models directory exists"""
        try:
            if not os.path.exists(self.models_dir):
                os.makedirs(self.models_dir)
                logger.info(f"Created models directory: {self.models_dir}")
        except Exception as e:
            logger.error(f"Failed to create models directory: {e}")
    
    def _load_model_registry(self):
        """Load model registry from disk"""
        try:
            registry_path = os.path.join(self.models_dir, "model_registry.json")
            if os.path.exists(registry_path):
                with open(registry_path, 'r') as f:
                    self.model_registry = json.load(f)
                logger.info(f"Loaded model registry with {len(self.model_registry)} models")
        except Exception as e:
            logger.error(f"Failed to load model registry: {e}")
            self.model_registry = {}
    
    def _save_model_registry(self):
        """Save model registry to disk"""
        try:
            registry_path = os.path.join(self.models_dir, "model_registry.json")
            with open(registry_path, 'w') as f:
                json.dump(self.model_registry, f, indent=2, default=str)
        except Exception as e:
            logger.error(f"Failed to save model registry: {e}")
    
    def save_model(self, model_name: str, model: Any, metadata: Dict = None) -> bool:
        """Save a model with metadata"""
        try:
            # Generate model hash for versioning
            model_hash = self._generate_model_hash(model)
            timestamp = datetime.now().isoformat()
            
            # Create model filename
            model_filename = f"{model_name}_{model_hash[:8]}.pkl"
            model_path = os.path.join(self.models_dir, model_filename)
            
            # Save model
            joblib.dump(model, model_path)
            
            # Update registry
            self.model_registry[model_name] = {
                'filename': model_filename,
                'path': model_path,
                'hash': model_hash,
                'created_at': timestamp,
                'metadata': metadata or {},
                'size_bytes': os.path.getsize(model_path)
            }
            
            # Save registry
            self._save_model_registry()
            
            logger.info(f"Saved model {model_name} to {model_path}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to save model {model_name}: {e}")
            return False
    
    def load_model(self, model_name: str) -> Optional[Any]:
        """Load a model by name"""
        try:
            if model_name not in self.model_registry:
                logger.warning(f"Model {model_name} not found in registry")
                return None
            
            model_info = self.model_registry[model_name]
            model_path = model_info['path']
            
            if not os.path.exists(model_path):
                logger.error(f"Model file not found: {model_path}")
                return None
            
            model = joblib.load(model_path)
            logger.info(f"Loaded model {model_name} from {model_path}")
            return model
            
        except Exception as e:
            logger.error(f"Failed to load model {model_name}: {e}")
            return None
    
    def model_exists(self, model_name: str) -> bool:
        """Check if a model exists"""
        return model_name in self.model_registry
    
    def get_model_info(self, model_name: str) -> Optional[Dict]:
        """Get model information"""
        return self.model_registry.get(model_name)
    
    def list_models(self) -> Dict[str, Dict]:
        """List all saved models"""
        return self.model_registry.copy()
    
    def delete_model(self, model_name: str) -> bool:
        """Delete a model"""
        try:
            if model_name not in self.model_registry:
                logger.warning(f"Model {model_name} not found")
                return False
            
            model_info = self.model_registry[model_name]
            model_path = model_info['path']
            
            # Delete file
            if os.path.exists(model_path):
                os.remove(model_path)
            
            # Remove from registry
            del self.model_registry[model_name]
            self._save_model_registry()
            
            logger.info(f"Deleted model {model_name}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete model {model_name}: {e}")
            return False
    
    def _generate_model_hash(self, model: Any) -> str:
        """Generate a hash for the model"""
        try:
            # Convert model to bytes for hashing
            model_bytes = pickle.dumps(model)
            return hashlib.md5(model_bytes).hexdigest()
        except Exception as e:
            logger.error(f"Failed to generate model hash: {e}")
            return datetime.now().strftime("%Y%m%d_%H%M%S")
    
    def save_vectorizer(self, name: str, vectorizer: Any) -> bool:
        """Save a vectorizer (TfidfVectorizer, etc.)"""
        return self.save_model(f"vectorizer_{name}", vectorizer, {"type": "vectorizer"})
    
    def load_vectorizer(self, name: str) -> Optional[Any]:
        """Load a vectorizer"""
        return self.load_model(f"vectorizer_{name}")
    
    def save_scaler(self, name: str, scaler: Any) -> bool:
        """Save a scaler (StandardScaler, etc.)"""
        return self.save_model(f"scaler_{name}", scaler, {"type": "scaler"})
    
    def load_scaler(self, name: str) -> Optional[Any]:
        """Load a scaler"""
        return self.load_model(f"scaler_{name}")
    
    def save_label_encoder(self, name: str, encoder: Any) -> bool:
        """Save a label encoder"""
        return self.save_model(f"encoder_{name}", encoder, {"type": "label_encoder"})
    
    def load_label_encoder(self, name: str) -> Optional[Any]:
        """Load a label encoder"""
        return self.load_model(f"encoder_{name}")
    
    def cleanup_old_models(self, keep_versions: int = 3):
        """Clean up old model versions, keeping only the most recent"""
        try:
            # Group models by base name
            model_groups = {}
            for model_name, info in self.model_registry.items():
                base_name = model_name.split('_')[0] if '_' in model_name else model_name
                if base_name not in model_groups:
                    model_groups[base_name] = []
                model_groups[base_name].append((model_name, info))
            
            # Clean up each group
            for base_name, models in model_groups.items():
                if len(models) > keep_versions:
                    # Sort by creation date
                    models.sort(key=lambda x: x[1]['created_at'], reverse=True)
                    
                    # Delete old versions
                    for model_name, info in models[keep_versions:]:
                        self.delete_model(model_name)
                        logger.info(f"Cleaned up old model version: {model_name}")
            
        except Exception as e:
            logger.error(f"Model cleanup failed: {e}")

# Global model persistence instance
model_persistence = ModelPersistence()