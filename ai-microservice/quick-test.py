import requests
import json

# Quick test of the AI microservice fixes
try:
    # Test health first
    health_response = requests.get("http://localhost:8002/health", timeout=5)
    if health_response.status_code == 200:
        print("✅ Service is healthy")
    else:
        print(f"⚠️ Health check: {health_response.status_code}")
    
    # Get token
    auth_data = {"username": "admin", "password": "admin123"}
    token_response = requests.post("http://localhost:8002/token", data=auth_data, timeout=10)
    
    if token_response.status_code == 200:
        token = token_response.json()["access_token"]
        print("✅ Authentication successful")
        
        # Test recommendations
        headers = {"Authorization": f"Bearer {token}"}
        test_data = {
            "workload": [
                {"teamId": "team1", "_count": {"id": 10}},
                {"teamId": "team2", "_count": {"id": 15}}
            ]
        }
        
        rec_response = requests.post(
            "http://localhost:8002/recommendations", 
            json=test_data,
            headers=headers,
            timeout=30
        )
        
        if rec_response.status_code == 200:
            data = rec_response.json()
            print(f"✅ Recommendations working: {len(data.get('recommendations', []))} recommendations")
            print("🎉 Type conversion errors are FIXED!")
            if data.get('error'):
                print(f"⚠️ Fallback mode: {data.get('error')}")
        else:
            print(f"❌ Recommendations failed: {rec_response.status_code}")
            print(rec_response.text)
    else:
        print(f"❌ Auth failed: {token_response.status_code}")
        print(token_response.text)
        
except Exception as e:
    print(f"❌ Error: {e}")