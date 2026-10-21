import os
import json
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import r2_score, mean_absolute_error, accuracy_score
import joblib

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET_DIR = os.path.join(BASE_DIR, 'datasets', 'carbon-emission')
MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models')
os.makedirs(MODEL_DIR, exist_ok=True)

KAKRALIYA_XLSX = os.path.join(DATASET_DIR, 'Kakraliya et al Scientific Reports 2022.xlsx')
N2O_CH4_CSV = os.path.join(DATASET_DIR, 'n2o_ch4.csv')
FAO_RESULT_CSV = os.path.join(DATASET_DIR, 'result.csv')

# Crop carbon characteristics (IPCC / ICAR benchmarks per Acre)
CROP_EMISSION_FACTORS = {
    'Rice': {
        'base_ch4_kg_per_acre': 42.0,       # Methane from flooded paddy
        'base_n2o_factor': 0.0125,          # N2O from fertilizer N
        'typical_diesel_liters_acre': 34.0,  # Puddling, tillage, combine
        'ch4_gwp': 28.0,                    # 1 kg CH4 = 28 kg CO2e
        'n2o_gwp': 273.0                    # 1 kg N2O = 273 kg CO2e
    },
    'Wheat': {
        'base_ch4_kg_per_acre': 0.5,
        'base_n2o_factor': 0.0100,
        'typical_diesel_liters_acre': 26.0,  # Tillage, sowing, harvesting
        'ch4_gwp': 28.0,
        'n2o_gwp': 273.0
    },
    'Maize': {
        'base_ch4_kg_per_acre': 0.4,
        'base_n2o_factor': 0.0110,
        'typical_diesel_liters_acre': 24.0,
        'ch4_gwp': 28.0,
        'n2o_gwp': 273.0
    },
    'Sugarcane': {
        'base_ch4_kg_per_acre': 1.2,
        'base_n2o_factor': 0.0135,
        'typical_diesel_liters_acre': 40.0,
        'ch4_gwp': 28.0,
        'n2o_gwp': 273.0
    },
    'Mustard': {
        'base_ch4_kg_per_acre': 0.2,
        'base_n2o_factor': 0.0080,
        'typical_diesel_liters_acre': 18.0,
        'ch4_gwp': 28.0,
        'n2o_gwp': 273.0
    },
    'Potato': {
        'base_ch4_kg_per_acre': 0.3,
        'base_n2o_factor': 0.0120,
        'typical_diesel_liters_acre': 32.0,  # Ridging, digging, transport
        'ch4_gwp': 28.0,
        'n2o_gwp': 273.0
    },
    'Cotton': {
        'base_ch4_kg_per_acre': 0.3,
        'base_n2o_factor': 0.0105,
        'typical_diesel_liters_acre': 22.0,
        'ch4_gwp': 28.0,
        'n2o_gwp': 273.0
    },
    'Pulses': {
        'base_ch4_kg_per_acre': 0.1,
        'base_n2o_factor': 0.0040,          # Legumes fix N, low emissions
        'typical_diesel_liters_acre': 16.0,
        'ch4_gwp': 28.0,
        'n2o_gwp': 273.0
    }
}

# Practice multipliers
RESIDUE_FACTORS = {
    'Mulched / Happy Seeder (Zero Till)': 0.70,   # Sequester carbon, -30%
    'Incorporated into Soil': 0.90,               # Improves organic matter
    'Removed from Field': 1.00,                   # Baseline
    'Burned (Stubble Burning)': 1.45              # High CO2, CH4, N2O + particulate
}

IRRIGATION_FACTORS = {
    'Solar Pump': 0.10,                           # Near zero energy footprint
    'Canal (Gravity)': 0.15,                      # Very low energy
    'Electric Tube Well': 0.85,                   # Grid electricity emissions
    'Diesel Engine Pump': 1.25                    # Highest direct emission
}

def build_emission_dataset():
    print("Building comprehensive Indian agricultural carbon emission dataset...")
    
    # 1. Load real field data from Kakraliya et al.
    kakraliya_ghg_per_ha = {}
    if os.path.exists(KAKRALIYA_XLSX):
        try:
            df_econ = pd.read_excel(KAKRALIYA_XLSX, sheet_name='Economics')
            # Col 8 is Rice GHG, Col 9 is Wheat GHG in kg CO2e/ha
            rice_ghgs = df_econ.iloc[2:, 8].dropna().astype(float).tolist()
            wheat_ghgs = df_econ.iloc[2:, 9].dropna().astype(float).tolist()
            kakraliya_ghg_per_ha['Rice'] = np.mean(rice_ghgs) if rice_ghgs else 3663.0
            kakraliya_ghg_per_ha['Wheat'] = np.mean(wheat_ghgs) if wheat_ghgs else 1059.0
            print(f"Loaded Kakraliya et al field benchmarks: Rice={kakraliya_ghg_per_ha['Rice']:.1f} kg CO2e/ha, Wheat={kakraliya_ghg_per_ha['Wheat']:.1f} kg CO2e/ha")
        except Exception as e:
            print(f"Notice reading Kakraliya xlsx: {e}")
            kakraliya_ghg_per_ha['Rice'] = 3663.0
            kakraliya_ghg_per_ha['Wheat'] = 1059.0
            
    np.random.seed(42)
    crops = list(CROP_EMISSION_FACTORS.keys())
    residue_types = list(RESIDUE_FACTORS.keys())
    irrigation_types = list(IRRIGATION_FACTORS.keys())
    
    rows = []
    
    # Generate 15,000 diverse Indian farm profiles based on field data & IPCC factors
    for _ in range(15000):
        crop = np.random.choice(crops, p=[0.25, 0.25, 0.12, 0.08, 0.10, 0.08, 0.06, 0.06])
        factors = CROP_EMISSION_FACTORS[crop]
        
        # Farm size in Acres (0.5 to 15.0 Acres, typical smallholder to medium Indian farmer)
        field_size_acres = np.round(np.random.uniform(0.5, 12.0), 2)
        
        # Tractor / machinery diesel usage (Litres per acre)
        # Farmer can enter diesel directly, typically 10 to 60 L/acre depending on tractor passes
        base_diesel_per_acre = factors['typical_diesel_liters_acre'] * np.random.uniform(0.7, 1.4)
        total_diesel_liters = np.round(base_diesel_per_acre * field_size_acres, 1)
        
        # Tractor operating hours (~4-5 Litres per hour for 45 HP Indian tractor like Mahindra / Swaraj)
        tractor_hours = np.round(total_diesel_liters / 4.8, 1)
        
        # Fertilizer application (Urea / DAP in kg per acre)
        if crop == 'Rice':
            urea_kg_per_acre = np.random.uniform(70.0, 150.0)
        elif crop == 'Wheat':
            urea_kg_per_acre = np.random.uniform(60.0, 130.0)
        elif crop == 'Sugarcane':
            urea_kg_per_acre = np.random.uniform(120.0, 250.0)
        elif crop == 'Pulses':
            urea_kg_per_acre = np.random.uniform(15.0, 45.0)
        else:
            urea_kg_per_acre = np.random.uniform(50.0, 120.0)
            
        total_urea_kg = np.round(urea_kg_per_acre * field_size_acres, 1)
        
        # Residue management & Irrigation choices
        residue = np.random.choice(residue_types, p=[0.25, 0.35, 0.20, 0.20])
        irrigation = np.random.choice(irrigation_types, p=[0.10, 0.20, 0.50, 0.20])
        
        # 1. Diesel Emissions (IPCC Tier-1: 1 L diesel = 2.68 kg CO2 direct + 0.32 kg CO2e upstream = 3.00 kg CO2e/L)
        diesel_co2e_kg = total_diesel_liters * 3.00
        
        # 2. Fertilizer N2O Emissions
        # Urea is 46% Nitrogen. N2O-N emission factor ~1.25% of applied N. GWP of N2O = 273
        nitrogen_applied_kg = total_urea_kg * 0.46
        n2o_emitted_kg = nitrogen_applied_kg * factors['base_n2o_factor'] * (44.0 / 28.0)
        fertilizer_co2e_kg = n2o_emitted_kg * factors['n2o_gwp']
        # Add fertilizer manufacturing footprint (~3.5 kg CO2e per kg N)
        fertilizer_mfg_co2e_kg = nitrogen_applied_kg * 3.2
        total_fertilizer_co2e_kg = fertilizer_co2e_kg + fertilizer_mfg_co2e_kg
        
        # 3. Crop Field Methane & Soil Emissions
        # Rice flooded fields have high CH4 emissions, mitigated by AWD or mulching
        base_ch4_kg = factors['base_ch4_kg_per_acre'] * field_size_acres
        if crop == 'Rice' and residue == 'Mulched / Happy Seeder (Zero Till)':
            base_ch4_kg *= 0.65 # AWD & no-puddling reduces methane significantly
        ch4_co2e_kg = base_ch4_kg * factors['ch4_gwp']
        
        # 4. Residue & Soil Carbon Balance
        residue_mult = RESIDUE_FACTORS[residue]
        field_soil_co2e_kg = (ch4_co2e_kg + (field_size_acres * 45.0)) * residue_mult
        
        # 5. Irrigation Energy Emissions
        # If diesel pump is used, additional pump diesel is already in diesel or pump emission
        irrigation_mult = IRRIGATION_FACTORS[irrigation]
        irrigation_co2e_kg = field_size_acres * 120.0 * irrigation_mult
        
        # Total Farm Greenhouse Gas Emission in kg CO2e
        total_emission_co2e_kg = np.round(
            diesel_co2e_kg + total_fertilizer_co2e_kg + field_soil_co2e_kg + irrigation_co2e_kg, 1
        )
        
        # Emission Intensity per Acre
        emission_per_acre = total_emission_co2e_kg / field_size_acres
        
        # Eco-Rating:
        # Grade A (Eco-Champion): < 500 kg CO2e / Acre
        # Grade B (Standard): 500 - 1200 kg CO2e / Acre
        # Grade C (High Carbon): > 1200 kg CO2e / Acre
        if emission_per_acre < 550.0:
            eco_rating = 'Grade A (Eco-Friendly)'
        elif emission_per_acre < 1250.0:
            eco_rating = 'Grade B (Moderate)'
        else:
            eco_rating = 'Grade C (High Emission)'
            
        # Potential Reduction by adopting best climate-smart practices
        mitigation_potential_kg = np.round(
            (diesel_co2e_kg * 0.25) + (total_fertilizer_co2e_kg * 0.20) + (field_soil_co2e_kg * 0.30), 1
        )
        
        rows.append({
            'Crop': crop,
            'FieldSize_Acres': field_size_acres,
            'Diesel_Liters': total_diesel_liters,
            'Tractor_Hours': tractor_hours,
            'Urea_Fertilizer_kg': total_urea_kg,
            'Residue_Management': residue,
            'Irrigation_Source': irrigation,
            'Diesel_CO2e_kg': round(diesel_co2e_kg, 1),
            'Fertilizer_CO2e_kg': round(total_fertilizer_co2e_kg, 1),
            'Soil_Crop_CO2e_kg': round(field_soil_co2e_kg, 1),
            'Irrigation_CO2e_kg': round(irrigation_co2e_kg, 1),
            'Total_CO2e_kg': total_emission_co2e_kg,
            'Emission_Per_Acre_kg': round(emission_per_acre, 1),
            'Mitigation_Potential_kg': mitigation_potential_kg,
            'Eco_Rating': eco_rating
        })
        
    df = pd.DataFrame(rows)
    combined_csv = os.path.join(DATASET_DIR, 'carbon_emission_training_dataset.csv')
    df.to_csv(combined_csv, index=False)
    print(f"Generated {len(df)} samples saved to {combined_csv}")
    return df

def train_emission_models():
    combined_csv = os.path.join(DATASET_DIR, 'carbon_emission_training_dataset.csv')
    if not os.path.exists(combined_csv):
        df = build_emission_dataset()
    else:
        df = pd.read_csv(combined_csv)
        
    print(f"Training Carbon Footprint AI Models on {len(df)} samples...")
    
    crop_encoder = LabelEncoder()
    residue_encoder = LabelEncoder()
    irrigation_encoder = LabelEncoder()
    eco_encoder = LabelEncoder()
    
    df['Crop_Enc'] = crop_encoder.fit_transform(df['Crop'])
    df['Residue_Enc'] = residue_encoder.fit_transform(df['Residue_Management'])
    df['Irrigation_Enc'] = irrigation_encoder.fit_transform(df['Irrigation_Source'])
    df['Eco_Enc'] = eco_encoder.fit_transform(df['Eco_Rating'])
    
    features = [
        'Crop_Enc', 'FieldSize_Acres', 'Diesel_Liters', 
        'Tractor_Hours', 'Urea_Fertilizer_kg', 'Residue_Enc', 'Irrigation_Enc'
    ]
    
    X = df[features]
    y_total = df['Total_CO2e_kg']
    y_diesel = df['Diesel_CO2e_kg']
    y_fertilizer = df['Fertilizer_CO2e_kg']
    y_soil = df['Soil_Crop_CO2e_kg']
    y_mitigation = df['Mitigation_Potential_kg']
    y_eco = df['Eco_Enc']
    
    # 1. Total Emission Regressor
    X_train, X_test, y_tot_tr, y_tot_te, y_d_tr, y_d_te, y_f_tr, y_f_te, y_s_tr, y_s_te, y_m_tr, y_m_te, y_eco_tr, y_eco_te = train_test_split(
        X, y_total, y_diesel, y_fertilizer, y_soil, y_mitigation, y_eco, test_size=0.2, random_state=42
    )
    
    reg_total = RandomForestRegressor(n_estimators=100, max_depth=16, random_state=42, n_jobs=-1)
    reg_total.fit(X_train, y_tot_tr)
    r2_tot = r2_score(y_tot_te, reg_total.predict(X_test))
    mae_tot = mean_absolute_error(y_tot_te, reg_total.predict(X_test))
    print(f"\n==========================================")
    print(f" TOTAL EMISSION REGRESSOR R2: {r2_tot:.4f} | MAE: {mae_tot:.2f} kg CO2e")
    print(f"==========================================")
    
    # 2. Eco Rating Classifier
    clf_eco = RandomForestClassifier(n_estimators=80, max_depth=12, random_state=42, n_jobs=-1)
    clf_eco.fit(X_train, y_eco_tr)
    acc_eco = accuracy_score(y_eco_te, clf_eco.predict(X_test))
    print(f"Eco-Rating Classifier Accuracy: {acc_eco * 100:.2f}%")
    
    # Save model artifacts
    joblib.dump(reg_total, os.path.join(MODEL_DIR, 'carbon_emission_regressor.joblib'))
    joblib.dump(clf_eco, os.path.join(MODEL_DIR, 'eco_rating_classifier.joblib'))
    joblib.dump(crop_encoder, os.path.join(MODEL_DIR, 'emission_crop_encoder.joblib'))
    joblib.dump(residue_encoder, os.path.join(MODEL_DIR, 'emission_residue_encoder.joblib'))
    joblib.dump(irrigation_encoder, os.path.join(MODEL_DIR, 'emission_irrigation_encoder.joblib'))
    joblib.dump(eco_encoder, os.path.join(MODEL_DIR, 'eco_rating_encoder.joblib'))
    
    metrics = {
        'total_r2_score': round(r2_tot, 4),
        'total_mae_kg': round(mae_tot, 2),
        'eco_accuracy': round(acc_eco * 100, 2),
        'crops': list(crop_encoder.classes_),
        'residue_options': list(residue_encoder.classes_),
        'irrigation_options': list(irrigation_encoder.classes_),
        'eco_ratings': list(eco_encoder.classes_),
        'features': features,
        'training_samples': len(df)
    }
    with open(os.path.join(MODEL_DIR, 'carbon_emission_metrics.json'), 'w') as f:
        json.dump(metrics, f, indent=2)
        
    print(f"All carbon footprint models saved into {MODEL_DIR}")
    return metrics

if __name__ == '__main__':
    train_emission_models()
