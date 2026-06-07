"""
Prolance ML Service — Churn Prediction API
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.schemas import (
    ChurnPredictionRequest,
    ChurnPredictionResponse,
    BatchPredictionRequest,
    BatchPredictionResponse,
    HealthResponse,
)
from app.predictor import predictor

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Démarrage du service ML...")
    try:
        predictor.load()
        logger.info("✅ Service prêt")
    except Exception as e:
        logger.error(f"❌ Échec du chargement du modèle : {e}")
    yield
    logger.info("👋 Arrêt du service ML")


app = FastAPI(
    title="Prolance ML Service",
    description="Microservice de prédiction de churn d'abonnement",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"service": "Prolance ML Service", "version": "1.0.0", "docs": "/docs"}


@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(
        status="UP" if predictor.model is not None else "DOWN",
        model_loaded=predictor.model is not None,
        model_name=predictor.metadata.get("model_name"),
        accuracy=predictor.metadata.get("accuracy"),
        f1_score=predictor.metadata.get("f1_score"),
    )


@app.post("/predict", response_model=ChurnPredictionResponse)
async def predict_churn(request: ChurnPredictionRequest):
    if predictor.model is None:
        raise HTTPException(status_code=503, detail="Modèle non chargé")
    try:
        result = predictor.predict(request)
        return ChurnPredictionResponse(**result)
    except Exception as e:
        logger.error(f"Erreur prédiction user {request.user_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")


@app.post("/predict/batch", response_model=BatchPredictionResponse)
async def predict_churn_batch(request: BatchPredictionRequest):
    if predictor.model is None:
        raise HTTPException(status_code=503, detail="Modèle non chargé")
    results = []
    for req in request.predictions:
        try:
            result = predictor.predict(req)
            results.append(ChurnPredictionResponse(**result))
        except Exception as e:
            logger.warning(f"⚠️  Erreur pour user {req.user_id}: {e}")
    return BatchPredictionResponse(results=results, total=len(results))


@app.get("/model/info")
async def model_info():
    if not predictor.metadata:
        raise HTTPException(status_code=503, detail="Modèle non chargé")
    return predictor.metadata


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)