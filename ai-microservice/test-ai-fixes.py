#!/usr/bin/env python3
"""
Test script to verify AI microservice fixes
"""

import requests
import json
import time
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BASE_URL = "http://localhost:8002"

def test_health():
    """Test health endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=10)
        if response.status_code == 200:
            data = response.json()
            logger.info(f"✅ Health check passed: {data['status']}")
            return True
        else:
            logger.error(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        logger.error(f"❌ Health check error: {e}")
        return False

def test_auth():
    """Test authentication"""
    try:
        auth_data = {
            "username": "admin",
            "password": "admin123"
        }
        response = requests.post(f"{BASE_URL}/token", data=auth_data, timeout=10)
        if response.status_code == 200:
            token_data = response.json()
            logger.info("✅ Authentication test passed")
            return token_data.get("access_token")
        else:
            logger.error(f"❌ Authentication failed: {response.status_code}")
            return None
    except Exception as e:
        logger.error(f"❌ Authentication error: {e}")
        return None

def test_recommendations(token):
    """Test recommendations endpoint (the one that was failing)"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        test_data = {
            "workload": [
                {"teamId": "team1", "_count": {"id": 10}},
                {"teamId": "team2", "_count": {"id": 15}},
                {"teamId": "team3", "_count": {"id": 5}}
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/recommendations", 
            json=test_data,
            headers=headers,
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            logger.info(f"✅ Recommendations test passed: {len(data.get('recommendations', []))} recommendations")
            return True
        else:
            logger.error(f"❌ Recommendations test failed: {response.status_code}")
            logger.error(f"Response: {response.text}")
            return False
    except Exception as e:
        logger.error(f"❌ Recommendations test error: {e}")
        return False

def main():
    """Run all tests"""
    logger.info("Testing ARS AI Microservice fixes...")
    
    # Test 1: Health check
    if not test_health():
        logger.error("Service is not healthy, stopping tests")
        return False
    
    time.sleep(2)
    
    # Test 2: Authentication
    token = test_auth()
    if not token:
        logger.error("Authentication failed, stopping tests")
        return False
    
    time.sleep(2)
    
    # Test 3: Recommendations (the problematic endpoint)
    if not test_recommendations(token):
        logger.error("Recommendations test failed")
        return False
    
    logger.info("🎉 All tests passed! AI microservice fixes are working correctly.")
    return True

if __name__ == "__main__":
    success = main()
    if not success:
        exit(1)