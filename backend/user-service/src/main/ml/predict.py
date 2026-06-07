import sys
import json
import joblib
import numpy as np
from pathlib import Path

base = Path(__file__).parent

model     = joblib.load(base / "face_auth_model.pkl")
scaler    = joblib.load(base / "face_auth_scaler.pkl")
le_role   = joblib.load(base / "le_role.pkl")
le_device = joblib.load(base / "le_device.pkl")

# Read input from temp file passed as argument
input_file = sys.argv[1]
with open(input_file, 'r') as f:
    data = json.load(f)

# ── Normalize role to match training data ──
role_map = {
    "USER":       "Client",
    "CLIENT":     "Client",
    "FREELANCER": "Freelancer",
    "ADMIN":      "Admin",
    "Admin":      "Admin",
    "Client":     "Client",
    "Freelancer": "Freelancer"
}
mapped_role = role_map.get(data.get("role", "Client"), "Client")

try:
    role_enc = int(le_role.transform([mapped_role])[0])
except Exception:
    role_enc = 0

try:
    device_enc = int(le_device.transform([data["device_id"]])[0])
except Exception:
    device_enc = -1

# ── Boost face score to compensate for real webcam vs training data ──
face_score     = min(data["face_match_score"] * 1.35, 1.0)
liveness_score = data["liveness_score"]

features = np.array([[face_score, liveness_score, role_enc, device_enc]])
features_scaled = scaler.transform(features)

proba    = float(model.predict_proba(features_scaled)[0][1])
approved = proba >= 0.75
risk     = "low" if proba > 0.85 else "medium" if proba > 0.60 else "high"

sys.stdout.write(json.dumps({
    "approved":   approved,
    "confidence": round(proba, 4),
    "risk_level": risk
}) + "\n")
sys.stdout.flush()
