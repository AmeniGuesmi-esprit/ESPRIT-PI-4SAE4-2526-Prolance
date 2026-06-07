"""
Script standalone pour entraîner le modèle et exporter les artefacts.
À exécuter UNE FOIS : python train_and_export.py
"""
import json
import warnings
from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (accuracy_score, f1_score, precision_score,
                             recall_score, roc_auc_score)
from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.svm import SVC
from sklearn.tree import DecisionTreeClassifier

warnings.filterwarnings("ignore")

CSV_PATH = Path(__file__).parent / "prolance_subscription_churn.csv"
ARTIFACTS_DIR = Path(__file__).parent / "ml_artifacts"
RANDOM_STATE = 42

FEATURE_COLUMNS = [
    "user_type_encoded", "plan_encoded", "billing_encoded",
    "plan_price", "amount_paid", "discount_pct",
    "account_age_days", "days_remaining", "auto_renew",
    "project_usage_pct", "proposal_usage_pct",
    "login_frequency_30d", "support_tickets", "payment_failures",
    "profile_completeness", "previous_cancellations"
]


def main():
    print("═" * 70)
    print("🤖 Prolance — Entraînement du modèle de Churn Prediction")
    print("═" * 70)

    if not CSV_PATH.exists():
        raise FileNotFoundError(
            f"❌ {CSV_PATH} introuvable.\n"
            f"   Copiez 'prolance_subscription_churn.csv' dans ml-service/"
        )

    df = pd.read_csv(CSV_PATH)
    print(f"\n📁 {df.shape[0]} lignes × {df.shape[1]} colonnes")
    print(f"   Taux de churn : {df['churned'].mean()*100:.1f}%")

    # Encodage
    le_user_type = LabelEncoder()
    le_plan = LabelEncoder()
    le_billing = LabelEncoder()
    df["user_type_encoded"] = le_user_type.fit_transform(df["user_type"])
    df["plan_encoded"] = le_plan.fit_transform(df["plan_name"])
    df["billing_encoded"] = le_billing.fit_transform(df["billing_cycle"])

    # Features & scaling
    X = df[FEATURE_COLUMNS].copy()
    y = df["churned"].copy()
    scaler = StandardScaler()
    X_scaled = pd.DataFrame(scaler.fit_transform(X), columns=X.columns)

    # Split
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, random_state=RANDOM_STATE, stratify=y
    )

    # 6 modèles
    print("\n🏋️  Entraînement...")
    models = {
        "Logistic Regression": LogisticRegression(max_iter=1000, random_state=RANDOM_STATE),
        "Decision Tree": DecisionTreeClassifier(max_depth=10, random_state=RANDOM_STATE),
        "Random Forest": RandomForestClassifier(n_estimators=100, max_depth=15, random_state=RANDOM_STATE),
        "Gradient Boosting": GradientBoostingClassifier(n_estimators=100, max_depth=5, random_state=RANDOM_STATE),
        "SVM": SVC(kernel="rbf", probability=True, random_state=RANDOM_STATE),
        "KNN": KNeighborsClassifier(n_neighbors=7),
    }

    results = []
    for name, model in models.items():
        print(f"   ⏳ {name}...", end=" ")
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
        y_proba = model.predict_proba(X_test)[:, 1]
        results.append({
            "Model": name,
            "Accuracy": accuracy_score(y_test, y_pred),
            "Precision": precision_score(y_test, y_pred),
            "Recall": recall_score(y_test, y_pred),
            "F1-Score": f1_score(y_test, y_pred),
            "AUC-ROC": roc_auc_score(y_test, y_proba),
        })
        print(f"✅ F1={results[-1]['F1-Score']:.4f}")

    results_df = pd.DataFrame(results).sort_values("F1-Score", ascending=False)
    best_name = results_df.iloc[0]["Model"]
    best_model = models[best_name]
    print(f"\n🏆 Meilleur modèle : {best_name}")

    # Export
    print(f"\n💾 Export dans {ARTIFACTS_DIR}/...")
    ARTIFACTS_DIR.mkdir(exist_ok=True)
    joblib.dump(best_model, ARTIFACTS_DIR / "churn_model.pkl")
    joblib.dump(scaler, ARTIFACTS_DIR / "scaler.pkl")
    joblib.dump(le_user_type, ARTIFACTS_DIR / "le_user_type.pkl")
    joblib.dump(le_plan, ARTIFACTS_DIR / "le_plan.pkl")
    joblib.dump(le_billing, ARTIFACTS_DIR / "le_billing.pkl")

    metadata = {
        "feature_columns": FEATURE_COLUMNS,
        "model_name": best_name,
        "user_type_classes": le_user_type.classes_.tolist(),
        "plan_classes": le_plan.classes_.tolist(),
        "billing_classes": le_billing.classes_.tolist(),
        "accuracy": float(results_df.iloc[0]["Accuracy"]),
        "precision": float(results_df.iloc[0]["Precision"]),
        "recall": float(results_df.iloc[0]["Recall"]),
        "f1_score": float(results_df.iloc[0]["F1-Score"]),
        "auc_roc": float(results_df.iloc[0]["AUC-ROC"]),
    }
    with open(ARTIFACTS_DIR / "metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)

    print("   ✅ 6 fichiers exportés dans ml_artifacts/")
    print("\n🎉 Terminé ! Lancez : uvicorn app.main:app --port 8000")


if __name__ == "__main__":
    main()