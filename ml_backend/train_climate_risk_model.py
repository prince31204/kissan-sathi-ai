import os
import json
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, accuracy_score, r2_score, mean_absolute_error
import joblib

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET_FILE = os.path.join(BASE_DIR, 'datasets', 'rainfall-datasets', 'rainfall_tel_hr_uttarakhand_uk_2026_2030.csv')
MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models')
os.makedirs(MODEL_DIR, exist_ok=True)

print(f"Reading Uttarakhand rainfall dataset from: {DATASET_FILE}")
df = pd.read_csv(DATASET_FILE)

# Clean invalid negative sensor values
df = df[df['Telemetry Hourly Rainfall (mm)'] >= 0].copy()

# Standardize district names
df['District'] = df['District'].str.strip()
district_name_map = {
    'PAURI GARHWAL': 'Pauri Garhwal',
    'UDHAM SINGH NAGAR': 'Udham Singh Nagar',
}
df['District'] = df['District'].replace(district_name_map)

# Extract date features
df['Timestamp'] = pd.to_datetime(df['Data Acquisition Time'], format='%d-%m-%Y %H:%M', errors='coerce')
df['Month'] = df['Timestamp'].dt.month.fillna(7).astype(int)
df['Hour'] = df['Timestamp'].dt.hour.fillna(12).astype(int)

# Terrain & slope factors for Uttarakhand districts (1.0 = plains/terai, up to 2.5 = high mountain steep slopes)
DISTRICT_TERRAIN = {
    'Chamoli': {'slope_factor': 2.5, 'elevation_m': 1550, 'terrain': 'High Mountain Alpine', 'type': 'Hill'},
    'Uttarkashi': {'slope_factor': 2.4, 'elevation_m': 1158, 'terrain': 'Upper Himalayan Valley', 'type': 'Hill'},
    'Rudraprayag': {'slope_factor': 2.3, 'elevation_m': 895, 'terrain': 'Steep River Gorge', 'type': 'Hill'},
    'Pithoragarh': {'slope_factor': 2.3, 'elevation_m': 1627, 'terrain': 'Eastern Mountain Ridge', 'type': 'Hill'},
    'Tehri Garhwal': {'slope_factor': 2.2, 'elevation_m': 1750, 'terrain': 'Mid-Himalayan Terrace', 'type': 'Hill'},
    'Bageshwar': {'slope_factor': 2.0, 'elevation_m': 1004, 'terrain': 'River Confluence Valley', 'type': 'Hill'},
    'Pauri Garhwal': {'slope_factor': 1.9, 'elevation_m': 1814, 'terrain': 'Hill Slopes & Valleys', 'type': 'Hill'},
    'Almora': {'slope_factor': 1.8, 'elevation_m': 1638, 'terrain': 'Mid-Hill Ridge', 'type': 'Hill'},
    'Champawat': {'slope_factor': 1.8, 'elevation_m': 1610, 'terrain': 'Sub-Himalayan Forest', 'type': 'Hill'},
    'Nainital': {'slope_factor': 1.7, 'elevation_m': 2084, 'terrain': 'Lake Basin & Hills', 'type': 'Hill'},
    'Dehradun': {'slope_factor': 1.3, 'elevation_m': 640, 'terrain': 'Doon Valley Basin', 'type': 'Valley'},
    'Haridwar': {'slope_factor': 1.0, 'elevation_m': 314, 'terrain': 'Gangetic Plain / Terai', 'type': 'Plains'},
    'Udham Singh Nagar': {'slope_factor': 1.0, 'elevation_m': 298, 'terrain': 'Tarai Alluvial Plain', 'type': 'Plains'},
}

# Assign terrain attributes
df['Slope_Factor'] = df['District'].map(lambda d: DISTRICT_TERRAIN.get(d, {}).get('slope_factor', 1.8))
df['Elevation_m'] = df['District'].map(lambda d: DISTRICT_TERRAIN.get(d, {}).get('elevation_m', 1200))

# Synthetic cumulative 24h rainfall estimate based on hourly trend
np.random.seed(42)
df['Rainfall_Hourly'] = df['Telemetry Hourly Rainfall (mm)']
df['Rainfall_24h_Est'] = df['Rainfall_Hourly'] * np.random.uniform(2.5, 5.0, len(df))

# Compute Risk Level based on IMD & Hill Agriculture thresholds
# Hill districts face landslide and terrace collapse at lower thresholds than plains
def calculate_risk(row):
    hr = row['Rainfall_Hourly']
    c24 = row['Rainfall_24h_Est']
    slope = row['Slope_Factor']
    effective_rain = hr * (0.8 + 0.2 * slope)
    
    if effective_rain >= 64.4 or c24 >= 140:
        return 'Severe'
    elif effective_rain >= 30.0 or c24 >= 70:
        return 'High'
    elif effective_rain >= 7.5 or c24 >= 25:
        return 'Moderate'
    else:
        return 'Low'

def calculate_vulnerability(row):
    hr = row['Rainfall_Hourly']
    slope = row['Slope_Factor']
    month = row['Month']
    
    # Monsoon boost (June to September) due to saturated hill soil
    monsoon_boost = 1.35 if month in [6, 7, 8, 9] else 1.0
    
    base_score = (hr * 1.2 * slope * monsoon_boost)
    return float(np.clip(base_score, 0.0, 100.0))

df['Risk_Level'] = df.apply(calculate_risk, axis=1)
df['Vulnerability_Score'] = df.apply(calculate_vulnerability, axis=1)

print("Risk distribution in dataset:")
print(df['Risk_Level'].value_counts())

# District Encoder
district_encoder = LabelEncoder()
df['District_Enc'] = district_encoder.fit_transform(df['District'])

features = ['District_Enc', 'Latitude', 'Longitude', 'Month', 'Hour', 'Slope_Factor', 'Elevation_m', 'Rainfall_Hourly', 'Rainfall_24h_Est']
X = df[features]
y_class = df['Risk_Level']
y_reg = df['Vulnerability_Score']

# Train/Test Split
X_train, X_test, y_train_c, y_test_c, y_train_r, y_test_r = train_test_split(
    X, y_class, y_reg, test_size=0.2, random_state=42
)

# 1. Train Classifier for Risk Level
print("Training Climate Risk Classifier (RandomForest)...")
clf = RandomForestClassifier(n_estimators=100, max_depth=12, random_state=42)
clf.fit(X_train, y_train_c)
y_pred_c = clf.predict(X_test)
acc = accuracy_score(y_test_c, y_pred_c)
print(f"Risk Classifier Accuracy: {acc * 100:.2f}%")

# 2. Train Regressor for Vulnerability Score
print("Training Vulnerability Score Regressor (RandomForest)...")
reg = RandomForestRegressor(n_estimators=100, max_depth=12, random_state=42)
reg.fit(X_train, y_train_r)
y_pred_r = reg.predict(X_test)
r2 = r2_score(y_test_r, y_pred_r)
mae = mean_absolute_error(y_test_r, y_pred_r)
print(f"Vulnerability Regressor R2: {r2:.4f}, MAE: {mae:.2f}")

# Save models
joblib.dump(clf, os.path.join(MODEL_DIR, 'climate_risk_classifier.joblib'))
joblib.dump(reg, os.path.join(MODEL_DIR, 'climate_vulnerability_regressor.joblib'))
joblib.dump(district_encoder, os.path.join(MODEL_DIR, 'climate_district_encoder.joblib'))

# Calculate District Statistics from real dataset
district_stats = {}
for district, group in df.groupby('District'):
    rainfall_vals = group['Telemetry Hourly Rainfall (mm)']
    stations = group['Station'].unique().tolist()
    terrain_info = DISTRICT_TERRAIN.get(district, {})
    
    district_stats[district] = {
        'total_readings': int(len(group)),
        'stations': stations,
        'station_count': int(len(stations)),
        'mean_hourly_rainfall_mm': float(round(rainfall_vals.mean(), 2)),
        'median_hourly_rainfall_mm': float(round(rainfall_vals.median(), 2)),
        'max_peak_rainfall_mm': float(round(rainfall_vals.max(), 2)),
        'avg_lat': float(round(group['Latitude'].mean(), 4)),
        'avg_lon': float(round(group['Longitude'].mean(), 4)),
        'elevation_m': terrain_info.get('elevation_m', 1200),
        'terrain_type': terrain_info.get('terrain', 'Mountain'),
        'slope_factor': terrain_info.get('slope_factor', 1.8),
        'region_type': terrain_info.get('type', 'Hill'),
    }

# Save metrics & metadata
metrics_data = {
    'model_name': 'Uttarakhand Climate-Risk & Rainfall Predictor',
    'dataset': 'rainfall_tel_hr_uttarakhand_uk_2026_2030.csv',
    'total_samples': int(len(df)),
    'features': features,
    'classes': list(clf.classes_),
    'classifier_accuracy': float(round(acc * 100, 2)),
    'regressor_r2': float(round(r2, 4)),
    'regressor_mae': float(round(mae, 2)),
    'district_stats': district_stats,
    'districts': sorted(list(district_stats.keys())),
}

with open(os.path.join(MODEL_DIR, 'climate_risk_metrics.json'), 'w') as f:
    json.dump(metrics_data, f, indent=2)

print("Model training complete and saved to ml_backend/models/ successfully!")
