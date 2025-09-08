import logging
from learning_engine import learning_engine
from model_persistence import model_persistence
from adaptive_learning import adaptive_learning

logger = logging.getLogger(__name__)

def initialize_learning_system():
    """Initialize the learning system on startup"""
    try:
        logger.info("Initializing AI learning system...")
        
        # Initialize learning engine
        learning_engine._init_database()
        learning_engine._load_company_lexicon()
        
        # Load any existing models
        saved_models = model_persistence.list_models()
        logger.info(f"Found {len(saved_models)} saved models")
        
        # Initialize adaptive learning
        adaptive_learning.optimize_learning_rate()
        
        logger.info("AI learning system initialized successfully")
        return True
        
    except Exception as e:
        logger.error(f"Learning system initialization failed: {e}")
        return False

def cleanup_learning_system():
    """Cleanup learning system on shutdown"""
    try:
        logger.info("Cleaning up AI learning system...")
        
        # Cleanup old models
        model_persistence.cleanup_old_models()
        
        logger.info("AI learning system cleanup completed")
        
    except Exception as e:
        logger.error(f"Learning system cleanup failed: {e}")

if __name__ == "__main__":
    initialize_learning_system()