from functools import wraps
from database import save_ai_output_global
import logging

logger = logging.getLogger(__name__)

def save_ai_response(endpoint_name: str = None):
    """Decorator to automatically save all AI responses to database"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                # Execute the AI function
                result = await func(*args, **kwargs)
                
                # Extract user info and input data
                user_id = "system"
                input_data = {}
                confidence = None
                
                # Try to extract user from kwargs
                if 'current_user' in kwargs and kwargs['current_user']:
                    user_id = getattr(kwargs['current_user'], 'username', 'system')
                
                # Try to extract input data
                if 'data' in kwargs:
                    input_data = kwargs['data']
                elif len(args) > 0 and hasattr(args[0], 'dict'):
                    input_data = args[0].dict()
                
                # Extract confidence from result
                if isinstance(result, dict):
                    confidence = result.get('confidence', result.get('accuracy', None))
                    if 'classifications' in result:
                        # For classification results, get average confidence
                        classifications = result['classifications']
                        if classifications and isinstance(classifications[0], dict):
                            confidences = [c.get('confidence', 0) for c in classifications if 'confidence' in c]
                            if confidences:
                                confidence = sum(confidences) / len(confidences)
                
                # Save to database
                endpoint = endpoint_name or func.__name__
                await save_ai_output_global(endpoint, input_data, result, user_id, confidence)
                
                return result
                
            except Exception as e:
                logger.debug(f"AI response saving failed for {func.__name__}: {e}")
                # Still return the original result even if saving fails
                return await func(*args, **kwargs)
        
        return wrapper
    return decorator