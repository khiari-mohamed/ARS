"""
Connection handling middleware for FastAPI to prevent H11 protocol errors
"""

import asyncio
import logging
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
import traceback

logger = logging.getLogger(__name__)

class ConnectionHandlingMiddleware(BaseHTTPMiddleware):
    """Middleware to handle connection errors gracefully"""
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
    
    async def dispatch(self, request: Request, call_next):
        try:
            # Set timeout for request processing
            response = await asyncio.wait_for(
                call_next(request), 
                timeout=60.0  # 60 second timeout
            )
            
            # Ensure proper headers are set
            if not hasattr(response, 'headers'):
                return response
            
            # Add connection handling headers
            response.headers["Connection"] = "close"
            response.headers["Cache-Control"] = "no-cache"
            
            return response
            
        except asyncio.TimeoutError:
            logger.warning(f"Request timeout for {request.url}")
            return JSONResponse(
                status_code=408,
                content={"error": "Request timeout", "detail": "Request took too long to process"}
            )
        except ConnectionError as e:
            logger.error(f"Connection error for {request.url}: {e}")
            return JSONResponse(
                status_code=503,
                content={"error": "Connection error", "detail": "Service temporarily unavailable"}
            )
        except Exception as e:
            logger.error(f"Unexpected error for {request.url}: {e}")
            logger.error(traceback.format_exc())
            return JSONResponse(
                status_code=500,
                content={"error": "Internal server error", "detail": str(e)}
            )

class ResponseCleanupMiddleware(BaseHTTPMiddleware):
    """Middleware to ensure proper response cleanup"""
    
    async def dispatch(self, request: Request, call_next):
        try:
            response = await call_next(request)
            
            # Ensure response is properly formed
            if hasattr(response, 'status_code') and response.status_code >= 400:
                # Log error responses
                logger.warning(f"Error response {response.status_code} for {request.url}")
            
            return response
            
        except Exception as e:
            logger.error(f"Response cleanup error: {e}")
            # Return a safe fallback response
            return JSONResponse(
                status_code=500,
                content={"error": "Response processing error"},
                headers={"Connection": "close"}
            )

def add_connection_middleware(app):
    """Add connection handling middleware to FastAPI app"""
    app.add_middleware(ConnectionHandlingMiddleware)
    app.add_middleware(ResponseCleanupMiddleware)
    return app