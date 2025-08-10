from fastapi import FastAPI, Body, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any, Optional
from collections import Counter, defaultdict
import spacy
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.ensemble import IsolationForest
from sklearn.neighbors import LocalOutlierFactor
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from datetime import datetime, timedelta
import numpy as np
import pandas as pd
import joblib
from prophet import Prophet
import warnings
warnings.filterwarnings("ignore")

# Import our custom modules
from auth import authenticate_user, create_access_token, get_current_active_user, fake_users_db, Token, ACCESS_TOKEN_EXPIRE_MINUTES
from database import get_db_manager
from monitoring import log_endpoint_call, metrics_middleware, get_metrics, logger
from explainable_ai import explainer
from advanced_ml_models import document_classifier, sla_predictor
from pattern_recognition import recurring_detector, temporal_analyzer
from intelligent_automation import smart_router, decision_engine

app = FastAPI(title="Enhanced ML Analytics API", version="2.0.0")
nlp = spacy.load("fr_core_news_sm")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add metrics middleware
app.middleware("http")(metrics_middleware)

# Authentication endpoint
@app.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(fake_users_db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# Live data endpoints
@app.get("/live/complaints")
@log_endpoint_call("live_complaints")
async def get_live_complaints(current_user = Depends(get_current_active_user)):
    """Get live complaints from ARS database"""
    db = await get_db_manager()
    complaints = await db.get_live_complaints()
    return {"complaints": complaints, "count": len(complaints)}

@app.get("/live/workload")
@log_endpoint_call("live_workload")
async def get_live_workload(current_user = Depends(get_current_active_user)):
    """Get live workload data from ARS database"""
    db = await get_db_manager()
    workload = await db.get_live_workload()
    return {"workload": workload}

@app.get("/live/sla")
@log_endpoint_call("live_sla")
async def get_live_sla(current_user = Depends(get_current_active_user)):
    """Get live SLA data from ARS database"""
    db = await get_db_manager()
    sla_items = await db.get_sla_items()
    return {"sla_items": sla_items}

@app.get("/live/performance")
@log_endpoint_call("live_performance")
async def get_live_performance(period: str = "current_month", current_user = Depends(get_current_active_user)):
    """Get live performance data from ARS database"""
    db = await get_db_manager()
    performance_data = await db.get_performance_data(period)
    return {"performance": performance_data, "period": period}

@app.post("/analyze")
@log_endpoint_call("analyze")
async def analyze(complaints: List[Dict], current_user = Depends(get_current_active_user)):
    # Use TF-IDF and cosine similarity to detect recurrent complaints
    db = await get_db_manager()
    await db.save_prediction_result("analyze", {"complaints_count": len(complaints)}, {}, current_user.username)
    
    texts = [c.get("description", "") for c in complaints]
    if not texts:
        return {"recurrent": [], "summary": "No complaints provided."}
    vectorizer = TfidfVectorizer().fit_transform(texts)
    similarity_matrix = cosine_similarity(vectorizer)
    recurrent_indices = set()
    for i in range(len(texts)):
        for j in range(i+1, len(texts)):
            if similarity_matrix[i][j] > 0.8:  # 80% similarity threshold
                recurrent_indices.add(i)
                recurrent_indices.add(j)
    recurrent = [complaints[i] for i in recurrent_indices]
    summary = f"{len(recurrent)} recurrent complaints detected." if recurrent else "No recurrent complaints."
    return {"recurrent": recurrent, "summary": summary}

@app.post("/suggestions")
@log_endpoint_call("suggestions")
async def suggestions(complaint: Dict = Body(...), current_user = Depends(get_current_active_user)):
    # Use spaCy to extract entities and suggest a response
    desc = complaint.get("description", "")
    doc = nlp(desc)
    entities = [ent.text for ent in doc.ents]
    if entities:
        entity_str = ", ".join(entities)
        suggestion = f"Bonjour, nous traitons votre réclamation concernant: {entity_str}. Merci de votre patience."
    else:
        suggestion = "Bonjour, nous traitons votre réclamation. Merci de votre patience."
    return {"suggestion": suggestion}

@app.post("/recommendations")
@log_endpoint_call("recommendations")
async def recommendations(payload: Dict = Body(...), current_user = Depends(get_current_active_user)):
    # Recommend more staff for teams with high workload
    workload = payload.get("workload", [])
    recs = []
    for w in workload:
        count = w.get("_count", {}).get("id", 0)
        if count > 10:
            recs.append({
                "teamId": w.get("teamId"),
                "recommendation": f"Workload is {count}. Add more staff."
            })
        else:
            recs.append({
                "teamId": w.get("teamId"),
                "recommendation": f"Workload is {count}. Staffing is sufficient."
            })
    return {"recommendations": recs}

# 1. SLA Breach Prediction
@app.post("/sla_prediction")
@log_endpoint_call("sla_prediction")
async def sla_prediction(items: List[Dict], explain: bool = False, current_user = Depends(get_current_active_user)):
    # Each item: { 'id', 'start_date', 'deadline', 'current_progress', 'total_required', 'sla_days' }
    results = []
    for item in items:
        try:
            start = datetime.fromisoformat(item['start_date'])
            deadline = datetime.fromisoformat(item['deadline'])
            now = datetime.now()
            days_total = (deadline - start).days
            days_left = (deadline - now).days
            progress = item.get('current_progress', 0)
            total = item.get('total_required', 1)
            
            # Prepare features for explanation
            features = np.array([days_left, progress, total, days_total])
            feature_names = ['days_left', 'current_progress', 'total_required', 'days_total']
            
            if days_total <= 0:
                risk = '🔴'
                score = 1.0
            else:
                expected_rate = total / days_total
                actual_rate = progress / max(1, (now - start).days)
                if days_left < 0:
                    risk = '🔴'
                    score = 1.0
                elif actual_rate >= expected_rate:
                    risk = '🟢'
                    score = 0.0
                elif actual_rate >= 0.7 * expected_rate:
                    risk = '🟠'
                    score = 0.5
                else:
                    risk = '🔴'
                    score = 1.0
            
            result = {
                'id': item['id'],
                'risk': risk,
                'score': score,
                'days_left': days_left
            }
            
            # Add explanation if requested
            if explain:
                explanation = explainer.explain_sla_prediction(features, feature_names)
                result['explanation'] = explanation
            
            results.append(result)
        except Exception as e:
            results.append({'id': item.get('id'), 'error': str(e)})
    return {'sla_predictions': results}

# 2. Prioritization (Daily Priority Suggestions)
@app.post("/priorities")
@log_endpoint_call("priorities")
async def priorities(bordereaux: List[Dict], explain: bool = False, current_user = Depends(get_current_active_user)):
    # Each bordereau: { 'id', 'sla_urgency', 'volume', 'client_importance', 'deadline', ... }
    scored = []
    for b in bordereaux:
        sla_urgency = b.get('sla_urgency', 0)
        volume = b.get('volume', 1)
        client_importance = b.get('client_importance', 1)
        deadline = b.get('deadline')
        days_left = 0
        if deadline:
            try:
                days_left = (datetime.fromisoformat(deadline) - datetime.now()).days
            except:
                days_left = 0
        # Lower days_left = higher urgency
        priority_score = sla_urgency * 2 + volume + client_importance * 1.5 + max(0, 10 - days_left)
        
        result = {
            'id': b['id'],
            'priority_score': priority_score
        }
        
        # Add explanation if requested
        if explain:
            priority_data = {
                'sla_urgency': sla_urgency,
                'volume': volume,
                'client_importance': client_importance,
                'days_left': days_left
            }
            explanation = explainer.explain_priority_scoring(priority_data)
            result['explanation'] = explanation
        
        scored.append(result)
    scored.sort(key=lambda x: -x['priority_score'])
    return {'priorities': scored}

# 3. Reassignment Recommendation
@app.post("/reassignment")
@log_endpoint_call("reassignment")
async def reassignment(data: Dict = Body(...), current_user = Depends(get_current_active_user)):
    # Input: { 'managers': [{id, avg_time, norm_time, workload}], 'threshold': float }
    managers = data.get('managers', [])
    threshold = data.get('threshold', 1.2)  # 20% slower than norm
    recs = []
    for m in managers:
        avg = m.get('avg_time', 1)
        norm = m.get('norm_time', 1)
        if avg > norm * threshold:
            recs.append({
                'manager_id': m['id'],
                'recommendation': 'Reassign workload, underperformance detected.'
            })
    return {'reassignment': recs}

# 4. Performance Analysis
@app.post("/performance")
@log_endpoint_call("performance")
async def performance(data: Dict = Body(...), current_user = Depends(get_current_active_user)):
    # Input: { 'users': [{id, actual, expected}], 'period': str }
    users = data.get('users', [])
    results = []
    for u in users:
        actual = u.get('actual', 0)
        expected = u.get('expected', 1)
        delta = actual - expected
        status = 'OK' if actual >= expected else 'UNDER'
        results.append({
            'user_id': u['id'],
            'actual': actual,
            'expected': expected,
            'delta': delta,
            'status': status
        })
    return {'performance': results}

# 5. Correlation between complaints and processes
@app.post("/correlation")
@log_endpoint_call("correlation")
async def correlation(data: Dict = Body(...), current_user = Depends(get_current_active_user)):
    # Input: { 'complaints': [{id, type, related_docs, process}], 'processes': [{id, name}] }
    complaints = data.get('complaints', [])
    process_map = defaultdict(list)
    for c in complaints:
        proc = c.get('process')
        if proc:
            process_map[proc].append(c['id'])
    correlations = [{
        'process': proc,
        'complaint_ids': ids,
        'count': len(ids)
    } for proc, ids in process_map.items() if len(ids) > 1]
    return {'correlations': correlations}

# 6. Comparative Performance (Planned vs Actual)
@app.post("/compare_performance")
@log_endpoint_call("compare_performance")
async def compare_performance(data: Dict = Body(...), current_user = Depends(get_current_active_user)):
    # Input: { 'planned': [{id, value}], 'actual': [{id, value}] }
    planned = data.get('planned')
    actual = data.get('actual')
    if not isinstance(planned, list) or not isinstance(actual, list):
        raise HTTPException(status_code=400, detail="planned and actual must be lists")
    try:
        planned_dict = {x['id']: x['value'] for x in planned}
        actual_dict = {x['id']: x['value'] for x in actual}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid input structure: {e}")
    results = []
    for id_ in planned_dict:
        act = actual_dict.get(id_, 0)
        plan = planned_dict[id_]
        results.append({
            'id': id_,
            'planned': plan,
            'actual': act,
            'delta': act - plan
        })
    return {'comparison': results}

# 7. Diagnostic Optimisation
@app.post("/diagnostic_optimisation")
@log_endpoint_call("diagnostic_optimisation")
async def diagnostic_optimisation(data: Dict = Body(...), current_user = Depends(get_current_active_user)):
    # Input: { 'metrics': [{name, value, threshold}] }
    metrics = data.get('metrics', [])
    recs = []
    for m in metrics:
        if m['value'] < m['threshold']:
            recs.append({
                'metric': m['name'],
                'recommendation': 'Below threshold, optimize process.'
            })
    return {'diagnostic': recs}

# 8. Predict Required Resources
@app.post("/predict_resources")
@log_endpoint_call("predict_resources")
async def predict_resources(data: Dict = Body(...), current_user = Depends(get_current_active_user)):
    # Input: { 'sla_days': int, 'historical_rate': float, 'volume': int }
    sla_days = data.get('sla_days', 1)
    historical_rate = data.get('historical_rate', 1)
    volume = data.get('volume', 1)
    if historical_rate <= 0:
        return {'required_managers': None, 'error': 'Invalid historical rate'}
    required = int(np.ceil(volume / (historical_rate * sla_days)))
    return {'required_managers': required}

# NEW ENDPOINTS - ANOMALY DETECTION
@app.post("/anomaly_detection")
@log_endpoint_call("anomaly_detection")
async def anomaly_detection(data: Dict = Body(...), current_user = Depends(get_current_active_user)):
    """Detect anomalies in data using Isolation Forest and Local Outlier Factor"""
    try:
        # Input: { 'data': [{'id': str, 'features': [float]}], 'method': 'isolation_forest' | 'lof', 'contamination': float }
        dataset = data.get('data', [])
        method = data.get('method', 'isolation_forest')
        contamination = data.get('contamination', 0.1)
        
        if not dataset:
            return {'anomalies': [], 'summary': 'No data provided'}
        
        # Extract features and IDs
        ids = [item['id'] for item in dataset]
        features = np.array([item['features'] for item in dataset])
        
        if features.shape[0] < 2:
            return {'anomalies': [], 'summary': 'Insufficient data for anomaly detection'}
        
        # Standardize features
        scaler = StandardScaler()
        features_scaled = scaler.fit_transform(features)
        
        # Apply anomaly detection
        if method == 'isolation_forest':
            detector = IsolationForest(contamination=contamination, random_state=42)
            anomaly_labels = detector.fit_predict(features_scaled)
            anomaly_scores = detector.score_samples(features_scaled)
        elif method == 'lof':
            detector = LocalOutlierFactor(contamination=contamination)
            anomaly_labels = detector.fit_predict(features_scaled)
            anomaly_scores = detector.negative_outlier_factor_
        else:
            raise HTTPException(status_code=400, detail="Method must be 'isolation_forest' or 'lof'")
        
        # Prepare results
        anomalies = []
        for i, (id_, label, score) in enumerate(zip(ids, anomaly_labels, anomaly_scores)):
            if label == -1:  # Anomaly detected
                anomalies.append({
                    'id': id_,
                    'anomaly_score': float(score),
                    'features': features[i].tolist(),
                    'severity': 'high' if score < -0.5 else 'medium'
                })
        
        summary = f"Detected {len(anomalies)} anomalies using {method}"
        return {
            'anomalies': anomalies,
            'summary': summary,
            'method': method,
            'total_samples': len(dataset)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Anomaly detection failed: {str(e)}")

# NEW ENDPOINTS - TREND FORECASTING
@app.post("/trend_forecast")
@log_endpoint_call("trend_forecast")
async def trend_forecast(data: Dict = Body(...), current_user = Depends(get_current_active_user)):
    """Forecast trends using Facebook Prophet"""
    try:
        # Input: { 'historical_data': [{'date': 'YYYY-MM-DD', 'value': float}], 'forecast_days': int }
        historical_data = data.get('historical_data', [])
        forecast_days = data.get('forecast_days', 30)
        
        if len(historical_data) < 10:
            return {'forecast': [], 'error': 'Need at least 10 historical data points'}
        
        # Prepare data for Prophet
        df = pd.DataFrame(historical_data)
        df['ds'] = pd.to_datetime(df['date'])
        df['y'] = df['value']
        df = df[['ds', 'y']].sort_values('ds')
        
        # Create and fit Prophet model
        model = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=True,
            daily_seasonality=False,
            changepoint_prior_scale=0.05
        )
        model.fit(df)
        
        # Create future dataframe
        future = model.make_future_dataframe(periods=forecast_days)
        forecast = model.predict(future)
        
        # Extract forecast results
        forecast_results = []
        for i, row in forecast.tail(forecast_days).iterrows():
            forecast_results.append({
                'date': row['ds'].strftime('%Y-%m-%d'),
                'predicted_value': float(row['yhat']),
                'lower_bound': float(row['yhat_lower']),
                'upper_bound': float(row['yhat_upper']),
                'trend': float(row['trend']),
                'confidence_interval': float(row['yhat_upper'] - row['yhat_lower'])
            })
        
        # Calculate trend direction
        recent_trend = forecast['trend'].tail(7).mean()
        previous_trend = forecast['trend'].head(7).mean()
        trend_direction = 'increasing' if recent_trend > previous_trend else 'decreasing'
        
        return {
            'forecast': forecast_results,
            'trend_direction': trend_direction,
            'model_performance': {
                'mape': float(np.mean(np.abs((df['y'] - forecast.head(len(df))['yhat']) / df['y'])) * 100),
                'trend_strength': float(abs(recent_trend - previous_trend))
            },
            'summary': f"Generated {forecast_days}-day forecast with {trend_direction} trend"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Trend forecasting failed: {str(e)}")

# NEW ENDPOINTS - CONFIDENCE SCORING
@app.post("/confidence_scoring")
@log_endpoint_call("confidence_scoring")
async def confidence_scoring(data: Dict = Body(...), current_user = Depends(get_current_active_user)):
    """Generate confidence scores for predictions using scikit-learn"""
    try:
        # Input: { 'training_data': [{'features': [float], 'label': int}], 'prediction_data': [{'id': str, 'features': [float]}] }
        training_data = data.get('training_data', [])
        prediction_data = data.get('prediction_data', [])
        model_type = data.get('model_type', 'random_forest')
        
        if len(training_data) < 10:
            return {'predictions': [], 'error': 'Need at least 10 training samples'}
        
        if not prediction_data:
            return {'predictions': [], 'error': 'No prediction data provided'}
        
        # Prepare training data
        X_train = np.array([item['features'] for item in training_data])
        y_train = np.array([item['label'] for item in training_data])
        
        # Prepare prediction data
        prediction_ids = [item['id'] for item in prediction_data]
        X_predict = np.array([item['features'] for item in prediction_data])
        
        # Standardize features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_predict_scaled = scaler.transform(X_predict)
        
        # Train model
        if model_type == 'random_forest':
            model = RandomForestClassifier(n_estimators=100, random_state=42)
        else:
            raise HTTPException(status_code=400, detail="Only 'random_forest' model supported currently")
        
        model.fit(X_train_scaled, y_train)
        
        # Generate predictions with confidence
        predictions = model.predict(X_predict_scaled)
        probabilities = model.predict_proba(X_predict_scaled)
        
        # Calculate confidence scores
        results = []
        for i, (pred_id, pred, probs) in enumerate(zip(prediction_ids, predictions, probabilities)):
            max_prob = np.max(probs)
            confidence_level = 'high' if max_prob > 0.8 else 'medium' if max_prob > 0.6 else 'low'
            
            results.append({
                'id': pred_id,
                'prediction': int(pred),
                'confidence_score': float(max_prob),
                'confidence_level': confidence_level,
                'class_probabilities': {
                    str(class_): float(prob) 
                    for class_, prob in zip(model.classes_, probs)
                },
                'features': X_predict[i].tolist()
            })
        
        # Model performance metrics
        if len(set(y_train)) > 1:  # Multi-class check
            X_train_split, X_test_split, y_train_split, y_test_split = train_test_split(
                X_train_scaled, y_train, test_size=0.2, random_state=42
            )
            model_test = RandomForestClassifier(n_estimators=100, random_state=42)
            model_test.fit(X_train_split, y_train_split)
            accuracy = model_test.score(X_test_split, y_test_split)
        else:
            accuracy = 1.0
        
        return {
            'predictions': results,
            'model_performance': {
                'accuracy': float(accuracy),
                'feature_importance': model.feature_importances_.tolist(),
                'n_classes': len(model.classes_),
                'training_samples': len(training_data)
            },
            'summary': f"Generated {len(results)} predictions with confidence scores"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Confidence scoring failed: {str(e)}")

# MODEL MANAGEMENT ENDPOINTS
@app.post("/save_model")
@log_endpoint_call("save_model")
async def save_model(data: Dict = Body(...), current_user = Depends(get_current_active_user)):
    """Save trained model for reuse"""
    try:
        model_name = data.get('model_name', 'default_model')
        training_data = data.get('training_data', [])
        
        if len(training_data) < 10:
            return {'success': False, 'error': 'Insufficient training data'}
        
        # Train and save model
        X_train = np.array([item['features'] for item in training_data])
        y_train = np.array([item['label'] for item in training_data])
        
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        
        model = RandomForestClassifier(n_estimators=100, random_state=42)
        model.fit(X_train_scaled, y_train)
        
        # Save model and scaler
        joblib.dump(model, f"{model_name}_model.pkl")
        joblib.dump(scaler, f"{model_name}_scaler.pkl")
        
        return {
            'success': True,
            'model_name': model_name,
            'summary': f"Model saved successfully with {len(training_data)} training samples"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model saving failed: {str(e)}")

# === ADVANCED ML MODELS ===
@app.post("/document_classification/train")
@log_endpoint_call("document_classification_train")
async def train_document_classifier(data: Dict = Body(...), current_user = Depends(get_current_active_user)):
    """Train document classification model"""
    try:
        documents = data.get('documents', [])
        labels = data.get('labels', [])
        model_type = data.get('model_type', 'deep_learning')
        
        if len(documents) != len(labels):
            raise HTTPException(status_code=400, detail="Documents and labels must have same length")
        
        if len(documents) < 20:
            raise HTTPException(status_code=400, detail="Need at least 20 training samples")
        
        if model_type == 'deep_learning':
            result = document_classifier.train_deep_learning_model(documents, labels)
        elif model_type == 'ensemble':
            result = document_classifier.train_ensemble_model(documents, labels)
        else:
            raise HTTPException(status_code=400, detail="Model type must be 'deep_learning' or 'ensemble'")
        
        return {
            'success': True,
            'model_performance': result,
            'summary': f"Trained {model_type} model with {len(documents)} documents"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Document classifier training failed: {str(e)}")

@app.post("/document_classification/classify")
@log_endpoint_call("document_classification_classify")
async def classify_documents(data: Dict = Body(...), current_user = Depends(get_current_active_user)):
    """Classify documents using trained model"""
    try:
        documents = data.get('documents', [])
        batch_mode = data.get('batch_mode', True)
        
        if not documents:
            return {'classifications': [], 'summary': 'No documents provided'}
        
        if batch_mode and len(documents) > 1:
            results = document_classifier.batch_classify(documents)
        else:
            results = [document_classifier.classify_document(doc) for doc in documents]
        
        return {
            'classifications': results,
            'total_documents': len(documents),
            'summary': f"Classified {len(documents)} documents"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Document classification failed: {str(e)}")

@app.post("/sla_breach_prediction/train")
@log_endpoint_call("sla_breach_prediction_train")
async def train_sla_predictor(data: Dict = Body(...), current_user = Depends(get_current_active_user)):
    """Train SLA breach prediction model"""
    try:
        training_data = data.get('training_data', [])
        labels = data.get('labels', [])
        
        if len(training_data) != len(labels):
            raise HTTPException(status_code=400, detail="Training data and labels must have same length")
        
        if len(training_data) < 50:
            raise HTTPException(status_code=400, detail="Need at least 50 training samples")
        
        result = sla_predictor.train_sla_predictor(training_data, labels)
        
        return {
            'success': True,
            'model_performance': result,
            'summary': f"Trained SLA predictor with {len(training_data)} samples"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SLA predictor training failed: {str(e)}")

@app.post("/sla_breach_prediction/predict")
@log_endpoint_call("sla_breach_prediction_predict")
async def predict_sla_breach_advanced(data: Dict = Body(...), current_user = Depends(get_current_active_user)):
    """Advanced SLA breach prediction"""
    try:
        item_data = data.get('item_data', {})
        
        if not item_data:
            raise HTTPException(status_code=400, detail="Item data required")
        
        result = sla_predictor.predict_sla_breach(item_data)
        
        return {
            'prediction': result,
            'summary': f"SLA breach prediction: {result['risk_level']} risk"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SLA breach prediction failed: {str(e)}")

# === PATTERN RECOGNITION ===
@app.post("/pattern_recognition/recurring_issues")
@log_endpoint_call("pattern_recognition_recurring")
async def detect_recurring_issues(data: Dict = Body(...), current_user = Depends(get_current_active_user)):
    """Detect recurring issues and patterns"""
    try:
        complaints = data.get('complaints', [])
        
        if len(complaints) < 3:
            return {'recurring_groups': [], 'summary': 'Insufficient data for pattern detection'}
        
        result = recurring_detector.detect_recurring_complaints(complaints)
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recurring issue detection failed: {str(e)}")

@app.post("/pattern_recognition/process_anomalies")
@log_endpoint_call("pattern_recognition_anomalies")
async def detect_process_anomalies(data: Dict = Body(...), current_user = Depends(get_current_active_user)):
    """Detect anomalies in process execution"""
    try:
        process_data = data.get('process_data', [])
        
        if len(process_data) < 10:
            return {'anomalies': [], 'summary': 'Insufficient data for anomaly detection'}
        
        result = recurring_detector.detect_process_anomalies(process_data)
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Process anomaly detection failed: {str(e)}")

@app.post("/pattern_recognition/temporal_patterns")
@log_endpoint_call("pattern_recognition_temporal")
async def analyze_temporal_patterns(data: Dict = Body(...), current_user = Depends(get_current_active_user)):
    """Analyze temporal patterns in events"""
    try:
        events = data.get('events', [])
        
        if len(events) < 10:
            return {'patterns': [], 'summary': 'Insufficient data for temporal analysis'}
        
        result = temporal_analyzer.analyze_temporal_patterns(events)
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Temporal pattern analysis failed: {str(e)}")

# === INTELLIGENT AUTOMATION ===
@app.post("/smart_routing/build_profiles")
@log_endpoint_call("smart_routing_build_profiles")
async def build_team_profiles(data: Dict = Body(...), current_user = Depends(get_current_active_user)):
    """Build team performance profiles"""
    try:
        historical_data = data.get('historical_data', [])
        
        if len(historical_data) < 20:
            raise HTTPException(status_code=400, detail="Need at least 20 historical records")
        
        result = smart_router.build_team_profiles(historical_data)
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Team profile building failed: {str(e)}")

@app.post("/smart_routing/train")
@log_endpoint_call("smart_routing_train")
async def train_routing_model(data: Dict = Body(...), current_user = Depends(get_current_active_user)):
    """Train smart routing model"""
    try:
        training_data = data.get('training_data', [])
        
        if len(training_data) < 50:
            raise HTTPException(status_code=400, detail="Need at least 50 training samples")
        
        result = smart_router.train_routing_model(training_data)
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Routing model training failed: {str(e)}")

@app.post("/smart_routing/suggest_assignment")
@log_endpoint_call("smart_routing_suggest")
async def suggest_optimal_assignment(data: Dict = Body(...), current_user = Depends(get_current_active_user)):
    """Suggest optimal task assignment"""
    try:
        task = data.get('task', {})
        available_teams = data.get('available_teams', None)
        
        if not task:
            raise HTTPException(status_code=400, detail="Task data required")
        
        result = smart_router.suggest_optimal_assignment(task, available_teams)
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Assignment suggestion failed: {str(e)}")

@app.post("/automated_decisions")
@log_endpoint_call("automated_decisions")
async def make_automated_decision(data: Dict = Body(...), current_user = Depends(get_current_active_user)):
    """Make automated decisions based on context"""
    try:
        context = data.get('context', {})
        decision_type = data.get('decision_type', '')
        
        if not context or not decision_type:
            raise HTTPException(status_code=400, detail="Context and decision_type required")
        
        result = decision_engine.make_automated_decision(context, decision_type)
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Automated decision making failed: {str(e)}")

# MONITORING ENDPOINTS
@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint"""
    return get_metrics()

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "3.0.0",
        "features": [
            "complaint_analysis", "sla_prediction", "anomaly_detection", 
            "trend_forecasting", "confidence_scoring", "performance_analytics",
            "authentication", "live_data_integration", "explainable_ai",
            "document_classification", "pattern_recognition", "smart_routing",
            "automated_decisions", "advanced_ml_models"
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)