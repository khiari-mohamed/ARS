#!/usr/bin/env python3
"""
Fix for H11 Protocol and ASGI connection errors in FastAPI/Uvicorn
"""

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import signal
import sys
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_fixed_app():
    """Create FastAPI app with proper connection handling"""
    app = FastAPI(
        title="ARS AI Microservice",
        version="3.1.0",
        docs_url="/docs",
        redoc_url="/redoc"
    )
    
    # Add CORS with proper configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"]
    )
    
    return app

def run_with_proper_config():
    """Run server with proper configuration to avoid connection errors"""
    
    # Import the main app
    from ai_microservice import app
    
    # Configure uvicorn with better settings
    config = uvicorn.Config(
        app=app,
        host="0.0.0.0",
        port=8002,
        log_level="info",
        access_log=True,
        # Connection handling improvements
        timeout_keep_alive=30,
        timeout_graceful_shutdown=10,
        # HTTP protocol improvements
        http="h11",
        loop="asyncio",
        # Limit concurrent connections
        limit_concurrency=100,
        limit_max_requests=1000,
        # Worker configuration
        workers=1,
        # Disable auto-reload in production
        reload=False
    )
    
    server = uvicorn.Server(config)
    
    # Graceful shutdown handling
    def signal_handler(signum, frame):
        logger.info(f"Received signal {signum}, shutting down gracefully...")
        server.should_exit = True
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    try:
        logger.info("Starting ARS AI Microservice with improved connection handling...")
        server.run()
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Server error: {e}")
    finally:
        logger.info("Server shutdown complete")

if __name__ == "__main__":
    run_with_proper_config()