import os
from typing import Dict, Any

class Config:
    """Production-ready configuration for AI microservice"""
    
    # Server Configuration
    HOST = os.getenv('AI_HOST', '0.0.0.0')
    PORT = int(os.getenv('AI_PORT', 8001))
    DEBUG = os.getenv('AI_DEBUG', 'false').lower() == 'true'
    
    # Database Configuration
    DATABASE_URL = os.getenv(
        'DATABASE_URL', 
        os.getenv('DATABASE_URL', 'postgresql://postgres:23044943@localhost:5432/arsdb')
    )
    
    # Redis Configuration (for caching and real-time features)
    REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
    
    # Security Configuration
    SECRET_KEY = os.getenv('AI_SECRET_KEY', 'your-secret-key-change-in-production')
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv('ACCESS_TOKEN_EXPIRE_MINUTES', 30))
    
    # CORS Configuration
    ALLOWED_ORIGINS = os.getenv('ALLOWED_ORIGINS', '*').split(',')
    
    # ML Model Configuration
    MODEL_CACHE_SIZE = int(os.getenv('MODEL_CACHE_SIZE', 100))
    MODEL_CACHE_TTL = int(os.getenv('MODEL_CACHE_TTL', 3600))  # 1 hour
    
    # Prediction Thresholds
    SLA_RISK_THRESHOLD = float(os.getenv('SLA_RISK_THRESHOLD', 0.8))
    ANOMALY_CONTAMINATION = float(os.getenv('ANOMALY_CONTAMINATION', 0.1))
    CONFIDENCE_THRESHOLD = float(os.getenv('CONFIDENCE_THRESHOLD', 0.6))
    
    # Performance Configuration
    MAX_BATCH_SIZE = int(os.getenv('MAX_BATCH_SIZE', 1000))
    REQUEST_TIMEOUT = int(os.getenv('REQUEST_TIMEOUT', 30))
    
    # Logging Configuration
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    LOG_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    
    # Monitoring Configuration
    ENABLE_METRICS = os.getenv('ENABLE_METRICS', 'true').lower() == 'true'
    METRICS_PORT = int(os.getenv('METRICS_PORT', 8002))
    
    # Feature Flags
    ENABLE_REAL_TIME_PREDICTIONS = os.getenv('ENABLE_REAL_TIME_PREDICTIONS', 'true').lower() == 'true'
    ENABLE_ADVANCED_ML = os.getenv('ENABLE_ADVANCED_ML', 'true').lower() == 'true'
    ENABLE_DOCUMENT_CLASSIFICATION = os.getenv('ENABLE_DOCUMENT_CLASSIFICATION', 'true').lower() == 'true'
    
    # Model Paths
    MODELS_DIR = os.getenv('MODELS_DIR', './models')
    TEMP_DIR = os.getenv('TEMP_DIR', './temp')
    
    # API Rate Limiting
    RATE_LIMIT_REQUESTS = int(os.getenv('RATE_LIMIT_REQUESTS', 100))
    RATE_LIMIT_WINDOW = int(os.getenv('RATE_LIMIT_WINDOW', 60))  # seconds
    
    @classmethod
    def get_database_config(cls) -> Dict[str, Any]:
        """Get database configuration"""
        return {
            'connection_string': cls.DATABASE_URL,
            'pool_size': int(os.getenv('DB_POOL_SIZE', 10)),
            'max_overflow': int(os.getenv('DB_MAX_OVERFLOW', 20)),
            'pool_timeout': int(os.getenv('DB_POOL_TIMEOUT', 30)),
            'pool_recycle': int(os.getenv('DB_POOL_RECYCLE', 3600))
        }
    
    @classmethod
    def get_ml_config(cls) -> Dict[str, Any]:
        """Get ML model configuration"""
        return {
            'sla_model': {
                'n_estimators': int(os.getenv('SLA_N_ESTIMATORS', 150)),
                'learning_rate': float(os.getenv('SLA_LEARNING_RATE', 0.1)),
                'max_depth': int(os.getenv('SLA_MAX_DEPTH', 5))
            },
            'document_classifier': {
                'max_features': int(os.getenv('DOC_MAX_FEATURES', 5000)),
                'ngram_range': (1, 3),
                'min_df': int(os.getenv('DOC_MIN_DF', 2)),
                'max_df': float(os.getenv('DOC_MAX_DF', 0.95))
            },
            'anomaly_detector': {
                'contamination': cls.ANOMALY_CONTAMINATION,
                'n_estimators': int(os.getenv('ANOMALY_N_ESTIMATORS', 100))
            }
        }
    
    @classmethod
    def get_performance_config(cls) -> Dict[str, Any]:
        """Get performance configuration"""
        return {
            'max_workers': int(os.getenv('MAX_WORKERS', 4)),
            'batch_size': cls.MAX_BATCH_SIZE,
            'timeout': cls.REQUEST_TIMEOUT,
            'cache_size': cls.MODEL_CACHE_SIZE,
            'cache_ttl': cls.MODEL_CACHE_TTL
        }
    
    @classmethod
    def validate_config(cls) -> bool:
        """Validate configuration"""
        required_vars = [
            'DATABASE_URL',
            'SECRET_KEY'
        ]
        
        missing_vars = []
        for var in required_vars:
            if not getattr(cls, var.replace('DATABASE_URL', 'DATABASE_URL').replace('SECRET_KEY', 'SECRET_KEY')):
                missing_vars.append(var)
        
        if missing_vars:
            raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}")
        
        return True

# Environment-specific configurations
class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    LOG_LEVEL = 'DEBUG'
    ENABLE_METRICS = True

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    LOG_LEVEL = 'WARNING'
    ENABLE_METRICS = True
    
    # Enhanced security for production
    ALLOWED_ORIGINS = os.getenv('ALLOWED_ORIGINS', 'https://your-domain.com').split(',')
    
    # Performance optimizations
    MAX_WORKERS = int(os.getenv('MAX_WORKERS', 8))
    MODEL_CACHE_SIZE = int(os.getenv('MODEL_CACHE_SIZE', 500))

class TestingConfig(Config):
    """Testing configuration"""
    DEBUG = True
    DATABASE_URL = os.getenv('TEST_DATABASE_URL', 'sqlite:///test.db')
    ENABLE_METRICS = False

# Configuration factory
def get_config() -> Config:
    """Get configuration based on environment"""
    env = os.getenv('ENVIRONMENT', 'development').lower()
    
    if env == 'production':
        return ProductionConfig()
    elif env == 'testing':
        return TestingConfig()
    else:
        return DevelopmentConfig()

# Global configuration instance
config = get_config()

# Validate configuration on import
config.validate_config()