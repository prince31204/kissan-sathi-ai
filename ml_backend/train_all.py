"""
KisanSaathi AI — Master Model Trainer & Verifier
Trains and verifies all ML models if any .joblib or .pth file is missing.
"""

import os
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, 'models')
os.makedirs(MODELS_DIR, exist_ok=True)

SCRIPTS = [
    ('Synthetic Crop & Variety Model', 'train_synthetic_crop_model.py', 'synthetic_crop_model.joblib'),
    ('Crop Region & Season Model', 'train_crop_region_model.py', 'crop_region_model.joblib'),
    ('Uttarakhand Crop Model', 'train_uttarakhand_crop_model.py', 'uttarakhand_crop_model.joblib'),
    ('Smart Irrigation Model', 'train_irrigation_model.py', 'irrigation_classifier.joblib'),
    ('Carbon Emission Model', 'train_emission_model.py', 'carbon_emission_regressor.joblib'),
    ('Waste Management Model', 'train_waste_model.py', 'waste_generation_regressor.joblib'),
    ('Climate Risk Model', 'train_climate_risk_model.py', 'climate_risk_classifier.joblib'),
]

def check_and_train():
    print("=== KisanSaathi AI Model Verifier ===")
    missing_count = 0
    for name, script_name, target_file in SCRIPTS:
        target_path = os.path.join(MODELS_DIR, target_file)
        if not os.path.exists(target_path):
            print(f"[MISSING] {name} ({target_file}) not found. Running {script_name}...")
            script_path = os.path.join(BASE_DIR, script_name)
            if os.path.exists(script_path):
                exit_code = os.system(f'"{sys.executable}" "{script_path}"')
                if exit_code == 0:
                    print(f"[SUCCESS] Trained {name}.")
                else:
                    print(f"[ERROR] Failed to train {name} (exit code {exit_code}).")
            missing_count += 1
        else:
            print(f"[OK] {name} ({target_file}) present.")
            
    print("=== Verification Complete ===")

if __name__ == '__main__':
    check_and_train()
