import joblib, numpy as np
from pathlib import Path

base = Path(__file__).parent

print("Loading models...")
model     = joblib.load(base / "face_auth_model.pkl")
scaler    = joblib.load(base / "face_auth_scaler.pkl")
le_role   = joblib.load(base / "le_role.pkl")
le_device = joblib.load(base / "le_device.pkl")
print("✅ Models loaded!")

# Test data
face_match_score = 0.85
liveness_score   = 0.92
role             = "USER"
device_id        = "test-device"

try:
    role_enc = int(le_role.transform([role])[0])
except:
    role_enc = 0

try:
    device_enc = int(le_device.transform([device_id])[0])
except:
    device_enc = -1

features = np.array([[face_match_score, liveness_score, role_enc, device_enc]])
features_scaled = scaler.transform(features)
proba    = float(model.predict_proba(features_scaled)[0][1])
approved = proba >= 0.75
risk     = "low" if proba > 0.85 else "medium" if proba > 0.60 else "high"

print(f"\n✅ Result:")
print(f"   approved:   {approved}")
print(f"   confidence: {round(proba, 4)}")
print(f"   risk_level: {risk}")
