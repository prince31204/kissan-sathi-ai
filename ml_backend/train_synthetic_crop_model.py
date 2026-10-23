"""
KisanSaathi AI — Synthetic Crop & Variety Model Trainer
Trains machine learning models on `datasets/synthetic-crop/synthetic_crop_varieties.csv`.
Predicts optimal synthetic crop and specific variety based on live Temperature,
Rainfall, Soil Moisture, and Season.
"""

import os
import json
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score
import joblib

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET_CSV = os.path.join(BASE_DIR, 'datasets', 'synthetic-crop', 'synthetic_crop_varieties.csv')
MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models')
os.makedirs(MODEL_DIR, exist_ok=True)

print(f"Loading synthetic crop varieties dataset from: {DATASET_CSV}")
df = pd.read_csv(DATASET_CSV)

# Clean string columns
for col in df.columns:
    if df[col].dtype == 'object':
        df[col] = df[col].astype(str).str.strip()

print(f"Dataset shape: {df.shape}")
print(f"Crops ({df['Crop'].nunique()}): {df['Crop'].unique().tolist()}")
print(f"Varieties ({df['Variety_Name'].nunique()}): {df['Variety_Name'].unique().tolist()}")
print(f"Seasons: {df['Season'].unique().tolist()}")

# Create encoders
encoders = {}

season_le = LabelEncoder()
df['Season_enc'] = season_le.fit_transform(df['Season'])
encoders['Season'] = season_le

crop_le = LabelEncoder()
df['Crop_enc'] = crop_le.fit_transform(df['Crop'])
encoders['Crop'] = crop_le

variety_le = LabelEncoder()
df['Variety_enc'] = variety_le.fit_transform(df['Variety_Name'])
encoders['Variety_Name'] = variety_le

# Growth stage encoder
stage_le = LabelEncoder()
df['Stage_enc'] = stage_le.fit_transform(df['Growth_Stage'])
encoders['Growth_Stage'] = stage_le

# Features
feature_cols = ['Temperature_C', 'Rainfall_mm', 'Soil_Moisture_pct', 'Season_enc']
X = df[feature_cols]
y_crop = df['Crop_enc']
y_variety = df['Variety_enc']

# Train Crop Classifier
print("\n--- Training Synthetic Crop Classifier ---")
crop_model = RandomForestClassifier(
    n_estimators=150,
    max_depth=10,
    min_samples_split=2,
    random_state=42
)
crop_model.fit(X, y_crop)
crop_acc = accuracy_score(y_crop, crop_model.predict(X))
print(f"Crop Classifier Fit Accuracy: {crop_acc * 100:.2f}%")

# Train Variety Classifier
print("\n--- Training Synthetic Variety Classifier ---")
variety_model = RandomForestClassifier(
    n_estimators=150,
    max_depth=12,
    min_samples_split=2,
    random_state=42
)
variety_model.fit(X, y_variety)
var_acc = accuracy_score(y_variety, variety_model.predict(X))
print(f"Variety Classifier Fit Accuracy: {var_acc * 100:.2f}%")

# Build Comprehensive Crop & Variety Knowledge Profile
knowledge = {}
for crop in df['Crop'].unique():
    crop_sub = df[df['Crop'] == crop]
    varieties_info = []
    
    for var in crop_sub['Variety_Name'].unique():
        var_sub = crop_sub[crop_sub['Variety_Name'] == var]
        varieties_info.append({
            'variety': var,
            'seasons': var_sub['Season'].unique().tolist(),
            'stages': var_sub['Growth_Stage'].unique().tolist(),
            'temp_mean': round(float(var_sub['Temperature_C'].mean()), 1),
            'temp_min': round(float(var_sub['Temperature_C'].min()), 1),
            'temp_max': round(float(var_sub['Temperature_C'].max()), 1),
            'rainfall_mean': round(float(var_sub['Rainfall_mm'].mean()), 1),
            'rainfall_min': round(float(var_sub['Rainfall_mm'].min()), 1),
            'rainfall_max': round(float(var_sub['Rainfall_mm'].max()), 1),
            'soil_moisture_mean': round(float(var_sub['Soil_Moisture_pct'].mean()), 1),
            'soil_moisture_min': round(float(var_sub['Soil_Moisture_pct'].min()), 1),
            'soil_moisture_max': round(float(var_sub['Soil_Moisture_pct'].max()), 1),
        })
        
    knowledge[crop] = {
        'crop': crop,
        'seasons': crop_sub['Season'].unique().tolist(),
        'temp_range': [round(float(crop_sub['Temperature_C'].min()), 1), round(float(crop_sub['Temperature_C'].max()), 1)],
        'temp_mean': round(float(crop_sub['Temperature_C'].mean()), 1),
        'rainfall_range': [round(float(crop_sub['Rainfall_mm'].min()), 1), round(float(crop_sub['Rainfall_mm'].max()), 1)],
        'soil_moisture_range': [round(float(crop_sub['Soil_Moisture_pct'].min()), 1), round(float(crop_sub['Soil_Moisture_pct'].max()), 1)],
        'varieties': varieties_info,
        'total_records': len(crop_sub)
    }

metrics = {
    'total_records': len(df),
    'num_crops': int(df['Crop'].nunique()),
    'num_varieties': int(df['Variety_Name'].nunique()),
    'crop_accuracy': round(float(crop_acc * 100), 2),
    'variety_accuracy': round(float(var_acc * 100), 2),
    'feature_cols': feature_cols,
    'source_file': 'datasets/synthetic-crop/synthetic_crop_varieties.csv'
}

# Save artifacts
crop_model_path = os.path.join(MODEL_DIR, 'synthetic_crop_model.joblib')
var_model_path = os.path.join(MODEL_DIR, 'synthetic_variety_model.joblib')
encoders_path = os.path.join(MODEL_DIR, 'synthetic_crop_encoders.joblib')
metrics_path = os.path.join(MODEL_DIR, 'synthetic_crop_metrics.json')
knowledge_path = os.path.join(MODEL_DIR, 'synthetic_crop_knowledge.json')

joblib.dump(crop_model, crop_model_path)
joblib.dump(variety_model, var_model_path)
joblib.dump(encoders, encoders_path)

with open(metrics_path, 'w') as f:
    json.dump(metrics, f, indent=2)

with open(knowledge_path, 'w') as f:
    json.dump(knowledge, f, indent=2)

print(f"\nModels and knowledge saved successfully to {MODEL_DIR}")
print("Files generated:")
print(f" - {crop_model_path}")
print(f" - {var_model_path}")
print(f" - {encoders_path}")
print(f" - {metrics_path}")
print(f" - {knowledge_path}")
