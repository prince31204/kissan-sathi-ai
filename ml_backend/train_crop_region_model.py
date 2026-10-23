"""
KisanSaathi AI — Crop Region & Season Model Trainer
Trains a machine learning model on `datasets/crop-region/Crop_Data.csv`.
Predicts suitable crops based on Region (State), Season (Kharif, Rabi, etc.),
Soil Type, Temperature, and Rainfall.
"""

import os
import json
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, classification_report, top_k_accuracy_score
import joblib

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET_CSV = os.path.join(BASE_DIR, 'datasets', 'crop-region', 'Crop_Data.csv')
MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models')
os.makedirs(MODEL_DIR, exist_ok=True)

print(f"Loading dataset from: {DATASET_CSV}")
df = pd.read_csv(DATASET_CSV)

# Clean string columns
for col in df.columns:
    if df[col].dtype == 'object':
        df[col] = df[col].astype(str).str.strip()

print(f"Dataset shape: {df.shape}")
print(f"Columns: {df.columns.tolist()}")

# Feature columns
CAT_COLS = ['State', 'Season', 'Soil Type', 'Temperature', 'pH', 'Fertilizer Usage', 'Pesticide Usage']
NUM_COLS = ['Rainfall']

encoders = {}
for col in CAT_COLS:
    le = LabelEncoder()
    df[col + '_enc'] = le.fit_transform(df[col])
    encoders[col] = le

target_le = LabelEncoder()
df['Crop_enc'] = target_le.fit_transform(df['Crop'])
encoders['Crop'] = target_le

feature_cols = [c + '_enc' for c in CAT_COLS] + NUM_COLS
X = df[feature_cols]
y = df['Crop_enc']

# Train/Test Split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

print("\nTraining RandomForestClassifier for Crop-Region-Season recommendation...")
model = RandomForestClassifier(
    n_estimators=200,
    max_depth=15,
    min_samples_split=4,
    class_weight='balanced',
    random_state=42,
    n_jobs=-1
)
model.fit(X_train, y_train)

# Evaluation
y_pred = model.predict(X_test)
probs = model.predict_proba(X_test)

top1 = accuracy_score(y_test, y_pred)
top2 = top_k_accuracy_score(y_test, probs, k=2)
top3 = top_k_accuracy_score(y_test, probs, k=3)
top4 = top_k_accuracy_score(y_test, probs, k=4)

print(f"Top-1 Accuracy: {top1 * 100:.2f}%")
print(f"Top-2 Accuracy: {top2 * 100:.2f}%")
print(f"Top-3 Accuracy: {top3 * 100:.2f}%")
print(f"Top-4 Accuracy: {top4 * 100:.2f}%")

# Compute feature importances
importances = dict(zip(CAT_COLS + NUM_COLS, [round(float(v), 4) for v in model.feature_importances_]))
print(f"\nFeature Importances: {importances}")

# Precompute region & season crop mapping from the dataset
region_season_mapping = {}
for state in df['State'].unique():
    state_df = df[df['State'] == state]
    region_season_mapping[state] = {}
    for season in ['Kharif', 'Rabi', 'Summer', 'Autumn', 'Winter', 'Whole Year']:
        crops_in_season = state_df[state_df['Season'] == season]['Crop'].value_counts().to_dict()
        region_season_mapping[state][season] = crops_in_season

# Save artifacts
model_path = os.path.join(MODEL_DIR, 'crop_region_model.joblib')
encoders_path = os.path.join(MODEL_DIR, 'crop_region_encoders.joblib')
metrics_path = os.path.join(MODEL_DIR, 'crop_region_metrics.json')

joblib.dump(model, model_path)
joblib.dump(encoders, encoders_path)

metrics_data = {
    'features': CAT_COLS + NUM_COLS,
    'top1_accuracy': round(top1 * 100, 2),
    'top2_accuracy': round(top2 * 100, 2),
    'top3_accuracy': round(top3 * 100, 2),
    'top4_accuracy': round(top4 * 100, 2),
    'crops': list(target_le.classes_),
    'states': list(encoders['State'].classes_),
    'seasons': list(encoders['Season'].classes_),
    'soil_types': list(encoders['Soil Type'].classes_),
    'temperature_categories': list(encoders['Temperature'].classes_),
    'feature_importances': importances,
    'region_season_mapping': region_season_mapping,
}

with open(metrics_path, 'w', encoding='utf-8') as f:
    json.dump(metrics_data, f, indent=2, ensure_ascii=False)

print(f"\nArtifacts saved successfully:")
print(f"  - Model: {model_path}")
print(f"  - Encoders: {encoders_path}")
print(f"  - Metrics: {metrics_path}")
