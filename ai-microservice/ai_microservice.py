from fastapi import FastAPI, Body
from typing import List, Dict, Any
from collections import Counter, defaultdict
import spacy
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from datetime import datetime, timedelta
import numpy as np

app = FastAPI()
nlp = spacy.load("fr_core_news_sm")

@app.post("/analyze")
def analyze(complaints: List[Dict]):
    # Use TF-IDF and cosine similarity to detect recurrent complaints
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
def suggestions(complaint: Dict = Body(...)):
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
def recommendations(payload: Dict = Body(...)):
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
def sla_prediction(items: List[Dict]):
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
            results.append({
                'id': item['id'],
                'risk': risk,
                'score': score,
                'days_left': days_left
            })
        except Exception as e:
            results.append({'id': item.get('id'), 'error': str(e)})
    return {'sla_predictions': results}

# 2. Prioritization (Daily Priority Suggestions)
@app.post("/priorities")
def priorities(bordereaux: List[Dict]):
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
        scored.append({
            'id': b['id'],
            'priority_score': priority_score
        })
    scored.sort(key=lambda x: -x['priority_score'])
    return {'priorities': scored}

# 3. Reassignment Recommendation
@app.post("/reassignment")
def reassignment(data: Dict = Body(...)):
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
def performance(data: Dict = Body(...)):
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
def correlation(data: Dict = Body(...)):
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
def compare_performance(data: Dict = Body(...)):
    # Input: { 'planned': [{id, value}], 'actual': [{id, value}] }
    planned = data.get('planned')
    actual = data.get('actual')
    if not isinstance(planned, list) or not isinstance(actual, list):
        return {"error": "planned and actual must be lists"}, 400
    try:
        planned_dict = {x['id']: x['value'] for x in planned}
        actual_dict = {x['id']: x['value'] for x in actual}
    except Exception as e:
        return {"error": f"Invalid input structure: {e}"}, 400
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
def diagnostic_optimisation(data: Dict = Body(...)):
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
def predict_resources(data: Dict = Body(...)):
    # Input: { 'sla_days': int, 'historical_rate': float, 'volume': int }
    sla_days = data.get('sla_days', 1)
    historical_rate = data.get('historical_rate', 1)
    volume = data.get('volume', 1)
    if historical_rate <= 0:
        return {'required_managers': None, 'error': 'Invalid historical rate'}
    required = int(np.ceil(volume / (historical_rate * sla_days)))
    return {'required_managers': required}
    