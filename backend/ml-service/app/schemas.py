"""
Schémas Pydantic — DTOs pour l'API ML
Prolance — Churn Prediction Service
"""
from pydantic import BaseModel, Field
from typing import List, Optional


class ChurnPredictionRequest(BaseModel):
    """Requête de prédiction envoyée par Spring Boot."""
    user_id: int = Field(..., description="ID utilisateur")
    user_type: str = Field(..., description="FREELANCER ou CLIENT")
    plan_name: str = Field(..., description="Nom du plan")
    billing_cycle: str = Field(..., description="MENSUELLE / TRIMESTRIELLE / SEMESTRIELLE / ANNUELLE")
    plan_price: float
    amount_paid: float
    discount_pct: float = 0
    account_age_days: int
    days_remaining: int
    auto_renew: int = Field(..., description="0 ou 1")
    project_usage_pct: float
    proposal_usage_pct: float
    login_frequency_30d: int
    support_tickets: int = 0
    payment_failures: int = 0
    profile_completeness: int = 100
    previous_cancellations: int = 0


class ChurnPredictionResponse(BaseModel):
    user_id: int
    churn_probability: float
    churn_score: int
    prediction: int
    risk_level: str
    top_risk_factors: List[str] = []
    suggested_action: str
    model_version: str


class BatchPredictionRequest(BaseModel):
    predictions: List[ChurnPredictionRequest]


class BatchPredictionResponse(BaseModel):
    results: List[ChurnPredictionResponse]
    total: int


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    model_name: Optional[str] = None
    accuracy: Optional[float] = None
    f1_score: Optional[float] = None