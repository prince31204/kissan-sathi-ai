import os
import json
import urllib.request
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, classification_report, r2_score, mean_absolute_error
import joblib

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET_DIR = os.path.join(BASE_DIR, 'datasets', 'smart-irrigation')
SOIL_MOISTURE_CSV = os.path.join(DATASET_DIR, 'sm_Uttarakhand_2020.csv')
RAINFALL_TEMPLATE_CSV = os.path.join(DATASET_DIR, 'rainfall_manual_daily_uttarakhand_uk_2026_2030.csv')
COMBINED_CSV = os.path.join(DATASET_DIR, 'smart_irrigation_combined_dataset.csv')
MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models')
os.makedirs(MODEL_DIR, exist_ok=True)

# District coordinates in Uttarakhand
DISTRICTS = {
    'HARDWAR': (29.9457, 78.1642),
    'NAINITAL': (29.3803, 79.4636),
    'ALMORA': (29.5971, 79.6591),
    'PITHORAGARH': (29.5829, 80.2182),
    'CHAMOLI': (30.2937, 79.5603),
    'DEHRADUN': (30.3165, 78.0322),
    'GARHWAL': (30.1468, 78.7806),
    'UDHAM SINGH NAGAR': (28.9800, 79.4000),
    'BAGESHWAR': (29.8406, 79.7694),
    'RUDRAPRAYAG': (30.2854, 78.9810),
    'UTTARKASHI': (30.7268, 78.4354),
    'TEHRI GARHWAL': (30.3860, 78.4800),
    'CHAMPAWAT': (29.3364, 80.1030)
}

# FAO-56 Crop Water Parameters for Indian Agriculture
# single_depth_mm: Realistic single-event irrigation depth (ICAR / FAO guidelines)
CROP_PARAMS = {
    'Wheat': {'kc': 1.15, 'crit_sm': 28.0, 'single_depth_mm': 40.0},
    'Rice': {'kc': 1.25, 'crit_sm': 38.0, 'single_depth_mm': 60.0},
    'Maize': {'kc': 1.10, 'crit_sm': 26.0, 'single_depth_mm': 38.0},
    'Mustard': {'kc': 0.85, 'crit_sm': 22.0, 'single_depth_mm': 30.0},
    'Potato': {'kc': 1.10, 'crit_sm': 30.0, 'single_depth_mm': 32.0},
    'Sugarcane': {'kc': 1.25, 'crit_sm': 32.0, 'single_depth_mm': 55.0},
    'Tomato': {'kc': 1.05, 'crit_sm': 27.0, 'single_depth_mm': 28.0},
    'Pulses': {'kc': 0.90, 'crit_sm': 23.0, 'single_depth_mm': 28.0}
}

# Soil water holding characteristics (Field Capacity %, Wilting Point %)
SOIL_PARAMS = {
    'Clay': {'fc': 40.0, 'wp': 20.0, 'depth_factor': 1.15},
    'Loam': {'fc': 30.0, 'wp': 14.0, 'depth_factor': 1.00},
    'Sandy Loam': {'fc': 22.0, 'wp': 9.0, 'depth_factor': 0.85},
    'Clay Loam': {'fc': 34.0, 'wp': 17.0, 'depth_factor': 1.05},
    'Sandy': {'fc': 15.0, 'wp': 6.0, 'depth_factor': 0.70}
}

def build_dataset():
    if not os.path.exists(SOIL_MOISTURE_CSV):
        raise FileNotFoundError(f"Soil moisture CSV not found at {SOIL_MOISTURE_CSV}")
    
    df_sm = pd.read_csv(SOIL_MOISTURE_CSV)
    df_sm['Date'] = df_sm['Date'].astype(str).str.strip()
    df_sm['DistrictName'] = df_sm['DistrictName'].astype(str).str.strip().str.upper()

    weather_csv = os.path.join(DATASET_DIR, 'rainfall_weather_uttarakhand_2020.csv')
    if not os.path.exists(weather_csv):
        raise FileNotFoundError(f"Weather CSV not found at {weather_csv}")
    
    df_weather = pd.read_csv(weather_csv)

    # Merge on Date and District
    merged = pd.merge(df_sm, df_weather, on=['Date', 'DistrictName'], how='inner')
    print(f"Merged records count: {len(merged)}")
    
    crops = list(CROP_PARAMS.keys())
    soils = list(SOIL_PARAMS.keys())
    
    np.random.seed(42)
    augmented_rows = []
    
    for _, row in merged.iterrows():
        for crop in crops:
            soil = np.random.choice(soils, p=[0.25, 0.35, 0.15, 0.20, 0.05])
            
            curr_sm = row['Volume Soilmoisture percentage (at 15cm)']
            curr_sm = np.clip(curr_sm + np.random.normal(0, 1.2), 6.0, 48.0)
            
            rain_mm = row['Rainfall_mm']
            temp_c = row['Temperature_C']
            humidity = row['Humidity_pct']
            et0 = row['ET0_mm']
            
            days_since_irrigation = np.random.randint(1, 15)
            # Realistic North Indian land holding: 0.2 Acre to 5.0 Acres (1 Bigha to 25 Bigha)
            field_size_acres = np.round(np.random.uniform(0.2, 5.0), 2)
            # Standard agricultural pumps
            pump_hp = np.random.choice([3.0, 5.0, 7.5, 10.0], p=[0.2, 0.5, 0.2, 0.1])
            
            crop_info = CROP_PARAMS[crop]
            soil_info = SOIL_PARAMS[soil]
            
            # Effective rainfall (USDA SCS method)
            eff_rain = rain_mm * 0.8 if rain_mm < 75 else 60.0 + 0.1 * rain_mm
            
            # Critical soil moisture threshold
            crit_threshold = crop_info['crit_sm']
            
            # Target single-event irrigation depth (FAO-56 calibration)
            base_depth_mm = crop_info['single_depth_mm'] * soil_info['depth_factor']
            
            # Adjust depth slightly based on severe moisture deficit & temperature
            deficit_factor = np.clip((crit_threshold - curr_sm) / 10.0, 0.0, 1.3)
            adjusted_depth_mm = base_depth_mm * (0.85 + 0.3 * deficit_factor)
            
            # Reduce by effective rain
            net_depth_mm = max(0.0, adjusted_depth_mm - eff_rain)
            # Single irrigation depth is strictly capped between 20mm and 60mm
            net_depth_mm = np.clip(net_depth_mm, 20.0, 60.0)
            
            # Decision: Need irrigation?
            # If current SM is below critical threshold AND recent rain is insufficient (< 5mm)
            need_irrigation = 1 if (curr_sm < crit_threshold and eff_rain < 5.0) else 0
            
            if need_irrigation == 0:
                net_depth_mm = 0.0
                water_liters = 0.0
                duration_hours = 0.0
            else:
                # 1 mm over 1 acre (4,046.86 m2) = 4,046.86 Liters
                water_liters = net_depth_mm * 4046.86 * field_size_acres
                # Typical pump flow rate in India: 1 HP ~ 5,200 Liters/hr (5HP ~ 26,000 L/hr)
                flow_rate_lph = pump_hp * 5200.0
                duration_hours = round(water_liters / flow_rate_lph, 1)
                
            augmented_rows.append({
                'Date': row['Date'],
                'District': row['DistrictName'],
                'Crop': crop,
                'SoilType': soil,
                'SoilMoisture_pct': round(curr_sm, 2),
                'Temperature_C': round(temp_c, 2),
                'Humidity_pct': round(humidity, 2),
                'Rainfall_mm': round(rain_mm, 2),
                'ET0_mm': round(et0, 2),
                'DaysSinceLastIrrigation': days_since_irrigation,
                'FieldSize_Acres': field_size_acres,
                'Pump_HP': pump_hp,
                'IrrigationNeeded': need_irrigation,
                'WaterReq_mm': round(net_depth_mm, 1),
                'WaterReq_Liters': round(water_liters, 0),
                'Duration_Hours': duration_hours
            })
            
    df_final = pd.DataFrame(augmented_rows)
    df_final.to_csv(COMBINED_CSV, index=False)
    print(f"Generated realistic agronomic dataset with {len(df_final)} samples saved to {COMBINED_CSV}")
    return df_final

def train_models():
    df = build_dataset()
    print(f"Training on {len(df)} samples...")
    
    # Encoders
    crop_encoder = LabelEncoder()
    soil_encoder = LabelEncoder()
    
    df['Crop_Enc'] = crop_encoder.fit_transform(df['Crop'])
    df['Soil_Enc'] = soil_encoder.fit_transform(df['SoilType'])
    
    features = [
        'Crop_Enc', 'Soil_Enc', 'SoilMoisture_pct', 'Temperature_C', 
        'Humidity_pct', 'Rainfall_mm', 'ET0_mm', 'DaysSinceLastIrrigation',
        'FieldSize_Acres', 'Pump_HP'
    ]
    
    X = df[features]
    y_clf = df['IrrigationNeeded']
    
    # 1. Classification Model: Irrigation Needed (Yes/No)
    X_train_c, X_test_c, y_train_c, y_test_c = train_test_split(X, y_clf, test_size=0.2, random_state=42, stratify=y_clf)
    
    clf = RandomForestClassifier(n_estimators=100, max_depth=16, random_state=42, n_jobs=-1)
    clf.fit(X_train_c, y_train_c)
    
    y_pred_c = clf.predict(X_test_c)
    acc = accuracy_score(y_test_c, y_pred_c)
    print(f"\n==========================================")
    print(f" CLASSIFIER ACCURACY: {acc * 100:.2f}%")
    print(f"==========================================")
    print(classification_report(y_test_c, y_pred_c))
    
    # 2. Regression Model: Water Volume (Liters) & Duration (Hours) for positive cases
    df_irrigated = df[df['IrrigationNeeded'] == 1]
    X_reg = df_irrigated[features]
    y_liters = df_irrigated['WaterReq_Liters']
    y_duration = df_irrigated['Duration_Hours']
    
    X_train_r, X_test_r, y_train_l, y_test_l, y_train_d, y_test_d = train_test_split(
        X_reg, y_liters, y_duration, test_size=0.2, random_state=42
    )
    
    reg_liters = RandomForestRegressor(n_estimators=100, max_depth=16, random_state=42, n_jobs=-1)
    reg_liters.fit(X_train_r, y_train_l)
    
    r2_liters = r2_score(y_test_l, reg_liters.predict(X_test_r))
    mae_liters = mean_absolute_error(y_test_l, reg_liters.predict(X_test_r))
    print(f"\nWater Liters Regressor R2: {r2_liters:.4f}, MAE: {mae_liters:.1f} L")
    
    reg_duration = RandomForestRegressor(n_estimators=100, max_depth=16, random_state=42, n_jobs=-1)
    reg_duration.fit(X_train_r, y_train_d)
    
    r2_dur = r2_score(y_test_d, reg_duration.predict(X_test_r))
    mae_dur = mean_absolute_error(y_test_d, reg_duration.predict(X_test_r))
    print(f"Duration Regressor R2: {r2_dur:.4f}, MAE: {mae_dur:.2f} Hours")
    
    # Save models and encoders
    joblib.dump(clf, os.path.join(MODEL_DIR, 'irrigation_classifier.joblib'))
    joblib.dump(reg_liters, os.path.join(MODEL_DIR, 'water_liters_regressor.joblib'))
    joblib.dump(reg_duration, os.path.join(MODEL_DIR, 'duration_regressor.joblib'))
    joblib.dump(crop_encoder, os.path.join(MODEL_DIR, 'crop_encoder.joblib'))
    joblib.dump(soil_encoder, os.path.join(MODEL_DIR, 'soil_encoder.joblib'))
    
    # Save metadata
    metrics = {
        'classifier_accuracy': round(acc * 100, 2),
        'water_r2_score': round(r2_liters, 4),
        'duration_r2_score': round(r2_dur, 4),
        'features': features,
        'crops': list(crop_encoder.classes_),
        'soils': list(soil_encoder.classes_),
        'districts': list(DISTRICTS.keys()),
        'training_samples': len(df)
    }
    with open(os.path.join(MODEL_DIR, 'model_metrics.json'), 'w') as f:
        json.dump(metrics, f, indent=2)
        
    print(f"\nAll models calibrated and saved successfully into {MODEL_DIR}")
    return metrics

if __name__ == '__main__':
    train_models()
