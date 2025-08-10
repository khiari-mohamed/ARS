import pytest
import asyncio
from httpx import AsyncClient
from fastapi.testclient import TestClient
from main import app
from auth import create_access_token
import json

# Test client
client = TestClient(app)

# Test authentication token
test_token = create_access_token(data={"sub": "admin"})
headers = {"Authorization": f"Bearer {test_token}"}

class TestAuthentication:
    def test_login_success(self):
        response = client.post(
            "/token",
            data={"username": "admin", "password": "secret"}
        )
        assert response.status_code == 200
        assert "access_token" in response.json()
    
    def test_login_failure(self):
        response = client.post(
            "/token",
            data={"username": "admin", "password": "wrong"}
        )
        assert response.status_code == 401
    
    def test_protected_endpoint_without_token(self):
        response = client.post("/analyze", json=[])
        assert response.status_code == 401
    
    def test_protected_endpoint_with_token(self):
        response = client.post(
            "/analyze", 
            json=[{"description": "Test complaint"}],
            headers=headers
        )
        assert response.status_code == 200

class TestComplaintAnalysis:
    def test_analyze_empty_complaints(self):
        response = client.post("/analyze", json=[], headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["summary"] == "No complaints provided."
        assert data["recurrent"] == []
    
    def test_analyze_single_complaint(self):
        complaints = [{"description": "Service is slow"}]
        response = client.post("/analyze", json=complaints, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "recurrent" in data
        assert "summary" in data
    
    def test_analyze_similar_complaints(self):
        complaints = [
            {"description": "The service is very slow today"},
            {"description": "Service is extremely slow"},
            {"description": "Different issue entirely"}
        ]
        response = client.post("/analyze", json=complaints, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data["recurrent"]) >= 0

class TestSuggestions:
    def test_suggestions_with_entities(self):
        complaint = {"description": "Problem with billing system"}
        response = client.post("/suggestions", json=complaint, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "suggestion" in data
        assert "Bonjour" in data["suggestion"]
    
    def test_suggestions_without_entities(self):
        complaint = {"description": "General issue"}
        response = client.post("/suggestions", json=complaint, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "suggestion" in data

class TestSLAPrediction:
    def test_sla_prediction_valid_data(self):
        items = [{
            "id": "test1",
            "start_date": "2024-01-01T00:00:00",
            "deadline": "2024-01-31T23:59:59",
            "current_progress": 50,
            "total_required": 100,
            "sla_days": 30
        }]
        response = client.post("/sla_prediction", json=items, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "sla_predictions" in data
        assert len(data["sla_predictions"]) == 1
        assert "risk" in data["sla_predictions"][0]
    
    def test_sla_prediction_invalid_date(self):
        items = [{
            "id": "test1",
            "start_date": "invalid-date",
            "deadline": "2024-01-31T23:59:59"
        }]
        response = client.post("/sla_prediction", json=items, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "error" in data["sla_predictions"][0]

class TestAnomalyDetection:
    def test_anomaly_detection_isolation_forest(self):
        data = {
            "data": [
                {"id": "normal1", "features": [1.0, 2.0, 3.0]},
                {"id": "normal2", "features": [1.1, 2.1, 3.1]},
                {"id": "outlier", "features": [10.0, 20.0, 30.0]}
            ],
            "method": "isolation_forest",
            "contamination": 0.3
        }
        response = client.post("/anomaly_detection", json=data, headers=headers)
        assert response.status_code == 200
        result = response.json()
        assert "anomalies" in result
        assert "summary" in result
    
    def test_anomaly_detection_lof(self):
        data = {
            "data": [
                {"id": "normal1", "features": [1.0, 2.0]},
                {"id": "normal2", "features": [1.1, 2.1]},
                {"id": "outlier", "features": [10.0, 20.0]}
            ],
            "method": "lof"
        }
        response = client.post("/anomaly_detection", json=data, headers=headers)
        assert response.status_code == 200
    
    def test_anomaly_detection_insufficient_data(self):
        data = {"data": [{"id": "single", "features": [1.0]}]}
        response = client.post("/anomaly_detection", json=data, headers=headers)
        assert response.status_code == 200
        result = response.json()
        assert "Insufficient data" in result["summary"]

class TestTrendForecasting:
    def test_trend_forecast_valid_data(self):
        historical_data = []
        for i in range(30):
            historical_data.append({
                "date": f"2024-01-{i+1:02d}",
                "value": 100 + i * 2
            })
        
        data = {
            "historical_data": historical_data,
            "forecast_days": 7
        }
        response = client.post("/trend_forecast", json=data, headers=headers)
        assert response.status_code == 200
        result = response.json()
        assert "forecast" in result
        assert len(result["forecast"]) == 7
    
    def test_trend_forecast_insufficient_data(self):
        data = {
            "historical_data": [
                {"date": "2024-01-01", "value": 100}
            ],
            "forecast_days": 7
        }
        response = client.post("/trend_forecast", json=data, headers=headers)
        assert response.status_code == 200
        result = response.json()
        assert "error" in result

class TestConfidenceScoring:
    def test_confidence_scoring_valid_data(self):
        data = {
            "training_data": [
                {"features": [1.0, 2.0], "label": 0},
                {"features": [1.1, 2.1], "label": 0},
                {"features": [3.0, 4.0], "label": 1},
                {"features": [3.1, 4.1], "label": 1},
                {"features": [5.0, 6.0], "label": 2},
                {"features": [5.1, 6.1], "label": 2},
                {"features": [1.2, 2.2], "label": 0},
                {"features": [3.2, 4.2], "label": 1},
                {"features": [5.2, 6.2], "label": 2},
                {"features": [1.3, 2.3], "label": 0}
            ],
            "prediction_data": [
                {"id": "test1", "features": [1.5, 2.5]},
                {"id": "test2", "features": [3.5, 4.5]}
            ]
        }
        response = client.post("/confidence_scoring", json=data, headers=headers)
        assert response.status_code == 200
        result = response.json()
        assert "predictions" in result
        assert len(result["predictions"]) == 2
        assert "model_performance" in result
    
    def test_confidence_scoring_insufficient_training_data(self):
        data = {
            "training_data": [
                {"features": [1.0, 2.0], "label": 0}
            ],
            "prediction_data": [
                {"id": "test1", "features": [1.5, 2.5]}
            ]
        }
        response = client.post("/confidence_scoring", json=data, headers=headers)
        assert response.status_code == 200
        result = response.json()
        assert "error" in result

class TestPerformance:
    def test_performance_analysis(self):
        data = {
            "users": [
                {"id": "user1", "actual": 100, "expected": 90},
                {"id": "user2", "actual": 80, "expected": 100}
            ]
        }
        response = client.post("/performance", json=data, headers=headers)
        assert response.status_code == 200
        result = response.json()
        assert "performance" in result
        assert len(result["performance"]) == 2
        assert result["performance"][0]["status"] == "OK"
        assert result["performance"][1]["status"] == "UNDER"

class TestHealthCheck:
    def test_health_endpoint(self):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "features" in data
        assert "version" in data

class TestMetrics:
    def test_metrics_endpoint(self):
        response = client.get("/metrics")
        assert response.status_code == 200
        assert "http_requests_total" in response.text

if __name__ == "__main__":
    pytest.main(["-v", "test_endpoints.py"])