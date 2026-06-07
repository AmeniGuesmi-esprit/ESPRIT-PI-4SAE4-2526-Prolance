"""
Predictor — Logique de prédiction du churn.
Charge le modèle ML entraîné et fait des prédictions.
"""
import joblib
import json
import logging
import pandas as pd
from pathlib import Path
from typing import List

logger = logging.getLogger(__name__)

ARTIFACTS_DIR = Path(__file__).parent.parent / "ml_artifacts"


class ChurnPredictor:
    """Singleton chargé une seule fois au démarrage de FastAPI."""

    def __init__(self):
        self.model = None
        self.scaler = None
        self.le_user_type = None
        self.le_plan = None
        self.le_billing = None
        self.metadata = {}
        self.feature_columns: List[str] = []

    def load(self):
        """Charge tous les artefacts au startup."""
        try:
            self.model = joblib.load(ARTIFACTS_DIR / "churn_model.pkl")
            self.scaler = joblib.load(ARTIFACTS_DIR / "scaler.pkl")
            self.le_user_type = joblib.load(ARTIFACTS_DIR / "le_user_type.pkl")
            self.le_plan = joblib.load(ARTIFACTS_DIR / "le_plan.pkl")
            self.le_billing = joblib.load(ARTIFACTS_DIR / "le_billing.pkl")

            with open(ARTIFACTS_DIR / "metadata.json") as f:
                self.metadata = json.load(f)

            self.feature_columns = self.metadata["feature_columns"]

            logger.info(f"✅ Modèle chargé : {self.metadata.get('model_name')}")
            logger.info(f"   Accuracy: {self.metadata.get('accuracy'):.4f}")
            logger.info(f"   F1-Score: {self.metadata.get('f1_score'):.4f}")
        except FileNotFoundError as e:
            logger.error(f"❌ Artefact manquant : {e}")
            logger.error(f"   Vérifiez que {ARTIFACTS_DIR} contient tous les .pkl")
            raise

    def _safe_encode(self, encoder, value: str, name: str) -> int:
        try:
            return int(encoder.transform([value])[0])
        except ValueError:
            logger.warning(f"⚠️  Classe inconnue pour {name}: '{value}' → 0")
            return 0

    def predict(self, req) -> dict:
        if self.model is None:
            raise RuntimeError("Modèle non chargé")

        user_type_enc = self._safe_encode(self.le_user_type, req.user_type, "user_type")
        plan_enc = self._safe_encode(self.le_plan, req.plan_name, "plan_name")
        billing_enc = self._safe_encode(self.le_billing, req.billing_cycle, "billing_cycle")

        features = {
            "user_type_encoded": user_type_enc,
            "plan_encoded": plan_enc,
            "billing_encoded": billing_enc,
            "plan_price": req.plan_price,
            "amount_paid": req.amount_paid,
            "discount_pct": req.discount_pct,
            "account_age_days": req.account_age_days,
            "days_remaining": req.days_remaining,
            "auto_renew": req.auto_renew,
            "project_usage_pct": req.project_usage_pct,
            "proposal_usage_pct": req.proposal_usage_pct,
            "login_frequency_30d": req.login_frequency_30d,
            "support_tickets": req.support_tickets,
            "payment_failures": req.payment_failures,
            "profile_completeness": req.profile_completeness,
            "previous_cancellations": req.previous_cancellations,
        }

        X = pd.DataFrame(
            [[features[c] for c in self.feature_columns]],
            columns=self.feature_columns
        )

        X_scaled = pd.DataFrame(
            self.scaler.transform(X),
            columns=self.feature_columns
        )

        prediction = int(self.model.predict(X_scaled)[0])
        probability = float(self.model.predict_proba(X_scaled)[0][1])
        score = int(round(probability * 100))

        risk, action = self._classify_risk(score)
        top_factors = self._identify_risk_factors(req)

        return {
            "user_id": req.user_id,
            "churn_probability": round(probability, 4),
            "churn_score": score,
            "prediction": prediction,
            "risk_level": risk,
            "top_risk_factors": top_factors,
            "suggested_action": action,
            "model_version": self.metadata.get("model_name", "unknown"),
        }

    @staticmethod
    def _classify_risk(score: int):
        if score >= 75:
            return "CRITICAL", "Contacter immédiatement l'utilisateur — proposer une offre de rétention"
        if score >= 60:
            return "HIGH", "Envoyer un email de réengagement avec code promo"
        if score >= 40:
            return "MEDIUM", "Surveiller l'activité, envoyer des notifications"
        return "LOW", "Aucune action urgente requise"

    @staticmethod
    def _identify_risk_factors(req) -> List[str]:
        factors = []
        if req.auto_renew == 0:
            factors.append("Auto-renouvellement désactivé")
        if req.days_remaining <= 7:
            factors.append(f"Abonnement expire dans {req.days_remaining} jours")
        if req.login_frequency_30d < 3:
            factors.append(f"Faible activité ({req.login_frequency_30d} connexions en 30j)")
        if req.project_usage_pct < 20:
            factors.append(f"Usage projets très faible ({req.project_usage_pct:.0f}%)")
        if req.proposal_usage_pct < 20:
            factors.append(f"Usage propositions très faible ({req.proposal_usage_pct:.0f}%)")
        if req.payment_failures > 0:
            factors.append(f"{req.payment_failures} échec(s) de paiement")
        if req.support_tickets > 2:
            factors.append(f"{req.support_tickets} tickets support ouverts")
        if req.previous_cancellations > 0:
            factors.append(f"A déjà annulé {req.previous_cancellations} fois")
        if req.profile_completeness < 60:
            factors.append(f"Profil incomplet ({req.profile_completeness}%)")
        return factors[:5]


# Singleton global
predictor = ChurnPredictor()