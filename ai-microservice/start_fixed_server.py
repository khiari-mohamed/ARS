#!/usr/bin/env python3
"""
Fixed startup script for ARS AI Microservice
Handles H11 protocol errors and connection issues
"""

import os
import sys
import logging
import uvicorn
from pathlib import Path

# Add current directory to Python path
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def main():
    """Main startup function with error handling"""
    try:
        # Import the app
        from ai_microservice import app
        
        # Get port from environment or use default
        port = int(os.getenv('AI_SERVICE_PORT', 8002))
        
        logger.info(f"Starting ARS AI Microservice on port {port}")
        
        # Run with improved configuration
        uvicorn.run(
            app,
            host="0.0.0.0",
            port=port,
            # Connection handling
            timeout_keep_alive=30,
            timeout_graceful_shutdown=10,
            # HTTP settings
            http="h11",
            loop="asyncio",
            # Concurrency limits
            limit_concurrency=50,
            limit_max_requests=500,
            # Logging
            log_level="info",
            access_log=True,
            # Production settings
            workers=1,
            reload=False
        )
        
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Failed to start server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()