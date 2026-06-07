from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics.pairwise import cosine_similarity

app = FastAPI(title="Recommendation Engine")

# ── Chargement des datasets synthétiques ──────────────────────────
BASE = "data/"
df_users         = pd.read_csv(BASE + "users.csv")
df_events        = pd.read_csv(BASE + "events.csv")
df_registrations = pd.read_csv(BASE + "registrations.csv")

# ── Construction des matrices de similarité ───────────────────────
user_item = (df_registrations
             .groupby(['user_id','event_id'])['completed']
             .sum().unstack(fill_value=0))
user_sim_df = pd.DataFrame(
    cosine_similarity(user_item),
    index=user_item.index, columns=user_item.index)

df_ev = df_events.copy()
for col, le in [('category', LabelEncoder()),
                ('format',   LabelEncoder()),
                ('level',    LabelEncoder())]:
    df_ev[f'{col}_enc'] = le.fit_transform(df_ev[col])

feat_cols = ['category_enc','format_enc','level_enc',
             'duration_hours','price','avg_rating','has_certificate','hands_on']
ev_matrix   = StandardScaler().fit_transform(df_ev[feat_cols])
event_sim_df = pd.DataFrame(
    cosine_similarity(ev_matrix),
    index=df_ev['event_id'], columns=df_ev['event_id'])

print("✅ Modèle chargé — prêt à recommander")

# ── Fonctions ─────────────────────────────────────────────────────
def _collab(user_id, n=15):
    if user_id not in user_sim_df.index:
        return {}
    seen    = set(user_item.loc[user_id][user_item.loc[user_id] > 0].index)
    similar = user_sim_df[user_id].sort_values(ascending=False).drop(user_id).head(10)
    scores  = {}
    for sim_user, sim_score in similar.items():
        if sim_user not in user_item.index: continue
        for evt in user_item.loc[sim_user][user_item.loc[sim_user] > 0].index:
            if evt not in seen:
                scores[evt] = scores.get(evt, 0) + sim_score * user_item.loc[sim_user, evt]
    return scores

def _content(user_id, n=15):
    regs = df_registrations[
        (df_registrations['user_id'] == user_id) &
        (df_registrations['completed'] == 1)]
    if regs.empty: return {}
    liked  = regs.sort_values('rating_given', ascending=False).head(3)['event_id'].tolist()
    seen   = set(regs['event_id'])
    scores = {}
    for evt in liked:
        if evt not in event_sim_df.index: continue
        for e in event_sim_df[evt].index:
            if e not in seen:
                scores[e] = max(scores.get(e, 0), event_sim_df.loc[evt, e])
    return scores

def hybrid_recommend(user_id: str, n: int = 5, alpha: float = 0.6):
    seen    = set(df_registrations[df_registrations['user_id'] == user_id]['event_id'])
    collab  = _collab(user_id)
    content = _content(user_id)
    hybrid  = {}
    if collab:
        mx = max(collab.values())
        for e, s in collab.items():
            if e not in seen:
                hybrid[e] = hybrid.get(e, 0) + alpha * (s / mx)
    if content:
        mx = max(content.values())
        for e, s in content.items():
            if e not in seen:
                hybrid[e] = hybrid.get(e, 0) + (1 - alpha) * (s / mx)
    if not hybrid:
        return []
    top    = sorted(hybrid, key=hybrid.get, reverse=True)[:n]
    result = df_events[df_events['event_id'].isin(top)].copy()
    result['hybrid_score'] = result['event_id'].map(hybrid)
    return result.sort_values('hybrid_score', ascending=False).to_dict(orient='records')

# ── Endpoints ─────────────────────────────────────────────────────
class RecommendRequest(BaseModel):
    user_id: str
    n: int = 5

@app.get("/health")
def health():
    return {"status": "ok", "users": len(df_users), "events": len(df_events)}

@app.post("/recommend")
def recommend(req: RecommendRequest):
    results = hybrid_recommend(req.user_id, req.n)
    if not results:
        raise HTTPException(404, "Aucune recommandation trouvée pour cet utilisateur")
    return {"user_id": req.user_id, "recommendations": results}