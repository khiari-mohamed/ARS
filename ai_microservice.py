from fastapi import FastAPI, Body
from typing import List, Dict
from collections import Counter
import spacy
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

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