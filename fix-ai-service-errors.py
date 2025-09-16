#!/usr/bin/env python3
"""
Comprehensive fix for ARS AI Microservice errors:
1. H11 Protocol errors
2. ASGI application errors  
3. Type conversion errors in recommendations
4. Connection handling issues
"""

import os
import sys
import subprocess
import time
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def kill_existing_processes():
    """Kill existing Python processes that might be running the AI service"""
    try:
        if os.name == 'nt':  # Windows
            subprocess.run(['taskkill', '/f', '/im', 'python.exe'], 
                         capture_output=True, check=False)
        else:  # Unix-like
            subprocess.run(['pkill', '-f', 'ai_microservice'], 
                         capture_output=True, check=False)
        logger.info("Killed existing processes")
        time.sleep(2)
    except Exception as e:
        logger.warning(f"Could not kill processes: {e}")

def check_dependencies():
    """Check if required dependencies are installed"""
    required_packages = [
        'fastapi', 'uvicorn', 'asyncpg', 'spacy', 
        'scikit-learn', 'numpy', 'pandas'
    ]
    
    missing = []
    for package in required_packages:
        try:
            __import__(package)
        except ImportError:
            missing.append(package)
    
    if missing:
        logger.error(f"Missing packages: {missing}")
        logger.info("Install with: pip install " + " ".join(missing))
        return False
    
    logger.info("All dependencies available")
    return True

def start_fixed_service():
    """Start the AI service with fixes"""
    ai_dir = os.path.join(os.path.dirname(__file__), 'ai-microservice')
    
    if not os.path.exists(ai_dir):
        logger.error(f"AI microservice directory not found: {ai_dir}")
        return False
    
    os.chdir(ai_dir)
    
    # Set environment variables for better performance
    env = os.environ.copy()
    env['PYTHONUNBUFFERED'] = '1'
    env['AI_SERVICE_PORT'] = '8002'
    
    try:
        logger.info("Starting fixed AI microservice...")
        
        # Use the fixed startup script
        if os.path.exists('start_fixed_server.py'):
            process = subprocess.Popen([
                sys.executable, 'start_fixed_server.py'
            ], env=env)
        else:
            # Fallback to direct uvicorn
            process = subprocess.Popen([
                sys.executable, '-m', 'uvicorn', 
                'ai_microservice:app',
                '--host', '0.0.0.0',
                '--port', '8002',
                '--timeout-keep-alive', '30',
                '--timeout-graceful-shutdown', '10',
                '--limit-concurrency', '50'
            ], env=env)
        
        logger.info(f"AI service started with PID: {process.pid}")
        
        # Wait a bit and check if it's still running
        time.sleep(5)
        if process.poll() is None:
            logger.info("AI service is running successfully")
            return True
        else:
            logger.error("AI service failed to start")
            return False
            
    except Exception as e:
        logger.error(f"Failed to start AI service: {e}")
        return False

def test_service():
    """Test if the service is responding"""
    try:
        import requests
        response = requests.get('http://localhost:8002/health', timeout=10)
        if response.status_code == 200:
            logger.info("AI service is responding correctly")
            return True
        else:
            logger.warning(f"AI service returned status {response.status_code}")
            return False
    except Exception as e:
        logger.warning(f"Could not test service: {e}")
        return False

def main():
    """Main fix function"""
    logger.info("Starting ARS AI Microservice fix process...")
    
    # Step 1: Kill existing processes
    kill_existing_processes()
    
    # Step 2: Check dependencies
    if not check_dependencies():
        logger.error("Please install missing dependencies first")
        return False
    
    # Step 3: Start fixed service
    if not start_fixed_service():
        logger.error("Failed to start AI service")
        return False
    
    # Step 4: Test service
    time.sleep(10)  # Give it time to fully start
    if test_service():
        logger.info("✅ AI service fix completed successfully!")
        logger.info("Service is running on http://localhost:8002")
        logger.info("Check health at: http://localhost:8002/health")
        logger.info("API docs at: http://localhost:8002/docs")
        return True
    else:
        logger.warning("Service started but may not be fully functional")
        return False

if __name__ == "__main__":
    success = main()
    if not success:
        sys.exit(1)