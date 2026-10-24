import os
import json
import numpy as np
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, ExtraTreesClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, classification_report

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(BASE_DIR, '..', 'datasets', 'fertilizer', 'Crop_recommendation.csv')
MODEL_DIR = os.path.join(BASE_DIR, 'models')
os.makedirs(MODEL_DIR, exist_ok=True)

print(f"Loading dataset from: {DATASET_PATH}")
df = pd.read_csv(DATASET_PATH)

print(f"Dataset shape: {df.shape}")
print(f"Columns: {list(df.columns)}")
print(f"Unique crops: {df['label'].nunique()} -> {sorted(df['label'].unique())}")

# Feature columns
feature_cols = ['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall']
X = df[feature_cols]
y = df['label']

# Label encode targets
le = LabelEncoder()
y_encoded = le.fit_transform(y)

# Compute crop agronomic profiles & benchmark stats
crop_benchmarks = {}
for crop in sorted(df['label'].unique()):
    crop_df = df[df['label'] == crop]
    crop_benchmarks[crop] = {
        'ideal_N': round(float(crop_df['N'].mean()), 1),
        'min_N': float(crop_df['N'].min()),
        'max_N': float(crop_df['N'].max()),
        'ideal_P': round(float(crop_df['P'].mean()), 1),
        'min_P': float(crop_df['P'].min()),
        'max_P': float(crop_df['P'].max()),
        'ideal_K': round(float(crop_df['K'].mean()), 1),
        'min_K': float(crop_df['K'].min()),
        'max_K': float(crop_df['K'].max()),
        'ideal_ph': round(float(crop_df['ph'].mean()), 2),
        'min_ph': round(float(crop_df['ph'].min()), 2),
        'max_ph': round(float(crop_df['ph'].max()), 2),
        'ideal_rainfall_mm': round(float(crop_df['rainfall'].mean()), 1),
        'ideal_temp_c': round(float(crop_df['temperature'].mean()), 1),
        'ideal_humidity_pct': round(float(crop_df['humidity'].mean()), 1),
    }

# Split
X_train, X_test, y_train, y_test = train_test_split(
    X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
)

# Train high-accuracy Random Forest
rf_model = RandomForestClassifier(
    n_estimators=150,
    max_depth=16,
    min_samples_split=2,
    random_state=42,
    n_jobs=-1
)
rf_model.fit(X_train, y_train)

# Evaluation
y_pred = rf_model.predict(X_test)
acc = accuracy_score(y_test, y_pred)
probs = rf_model.predict_proba(X_test)

# Top-2 and Top-3 accuracy
top2_correct = 0
top3_correct = 0
for i, true_label in enumerate(y_test):
    top_indices = np.argsort(probs[i])[::-1]
    if true_label in top_indices[:2]:
        top2_correct += 1
    if true_label in top_indices[:3]:
        top3_correct += 1

top2_acc = top2_correct / len(y_test)
top3_acc = top3_correct / len(y_test)

print(f"\n================ Model Performance ================")
print(f"Top-1 Accuracy: {acc * 100:.2f}%")
print(f"Top-2 Accuracy: {top2_acc * 100:.2f}%")
print(f"Top-3 Accuracy: {top3_acc * 100:.2f}%")

# Fertilizer & Agronomic Advice Dictionary for all 22 crops
CROP_FERTILIZER_GUIDE = {
    'rice': {
        'hindi_name': 'धान (चावल)',
        'category': 'Cereal',
        'season': 'Kharif',
        'npk_standard': '120:60:40 kg/ha',
        'fertilizers': [
            {'name': 'Neem Coated Urea (N 46%)', 'dosage': '110-130 kg/acre split into 3 doses (Basal, Tillering, Panicle)'},
            {'name': 'DAP (18:46:0)', 'dosage': '50 kg/acre as basal dose at last puddling'},
            {'name': 'MOP - Muriate of Potash (K 60%)', 'dosage': '30-35 kg/acre basal application'},
            {'name': 'Zinc Sulphate (21%)', 'dosage': '10 kg/acre to prevent Khaira disease'}
        ],
        'organic': 'Sesbania / Dhaincha green manuring (50-60 days before puddling) or 5 tons FYM/acre.',
        'irrigation_advisory': 'Standing water of 2-5 cm during tillering & flowering stages.'
    },
    'maize': {
        'hindi_name': 'मक्का (भुट्टा)',
        'category': 'Cereal',
        'season': 'Kharif / Rabi',
        'npk_standard': '120:60:40 kg/ha',
        'fertilizers': [
            {'name': 'Urea', 'dosage': '100 kg/acre (1/3 basal, 1/3 knee-high stage, 1/3 tasseling stage)'},
            {'name': 'DAP', 'dosage': '55 kg/acre basal application'},
            {'name': 'MOP (Potash)', 'dosage': '25-30 kg/acre basal'}
        ],
        'organic': 'FYM 4-5 tonnes/acre before sowing + Azotobacter seed treatment.',
        'irrigation_advisory': 'Critical stages: knee-high, tasseling, and grain filling.'
    },
    'chickpea': {
        'hindi_name': 'चना (छोला)',
        'category': 'Pulses',
        'season': 'Rabi',
        'npk_standard': '20:40:20 kg/ha (Legume fixes own nitrogen)',
        'fertilizers': [
            {'name': 'DAP', 'dosage': '40-50 kg/acre at sowing (provides starter N & essential P)'},
            {'name': 'Single Super Phosphate (SSP)', 'dosage': '100 kg/acre (ideal source for P + Sulphur)'},
            {'name': 'Rhizobium Culture', 'dosage': '200g per 10kg seed inoculation'}
        ],
        'organic': 'Trichoderma viride @ 5g/kg seed for wilt protection; 3 tonnes compost/acre.',
        'irrigation_advisory': 'Needs dry climate with 1-2 light irrigations (pre-flowering and pod development).'
    },
    'kidneybeans': {
        'hindi_name': 'राजमा',
        'category': 'Pulses',
        'season': 'Rabi / Kharif (Hills)',
        'npk_standard': '90-120:60:40 kg/ha (Weak nodulator, requires higher N than other pulses)',
        'fertilizers': [
            {'name': 'Urea', 'dosage': '60-80 kg/acre in 2 split applications'},
            {'name': 'DAP', 'dosage': '50 kg/acre at sowing'},
            {'name': 'MOP (Potash)', 'dosage': '25 kg/acre at sowing'}
        ],
        'organic': 'Well-decomposed vermicompost @ 2 tonnes/acre + PSB (Phosphorus Solubilizing Bacteria).',
        'irrigation_advisory': 'Sensitive to waterlogging. Ensure well-drained loamy soil.'
    },
    'pigeonpeas': {
        'hindi_name': 'अरहर / तूर दाल',
        'category': 'Pulses',
        'season': 'Kharif',
        'npk_standard': '25:50:25 kg/ha',
        'fertilizers': [
            {'name': 'DAP', 'dosage': '45-50 kg/acre as basal dose'},
            {'name': 'MOP', 'dosage': '20 kg/acre'},
            {'name': 'Sulphur (Bentonite)', 'dosage': '10 kg/acre for higher protein content'}
        ],
        'organic': 'Rhizobium + PSB seed coating + 4 tonnes FYM.',
        'irrigation_advisory': 'Deep taproot system; drought tolerant; 1 irrigation at pod development if rain fails.'
    },
    'mothbeans': {
        'hindi_name': 'मोठ दाल',
        'category': 'Pulses (Arid)',
        'season': 'Kharif',
        'npk_standard': '10:40:10 kg/ha',
        'fertilizers': [
            {'name': 'DAP', 'dosage': '30-35 kg/acre basal'},
            {'name': 'SSP', 'dosage': '60-70 kg/acre'}
        ],
        'organic': 'Extremely drought hardy. Farmyard manure 2 tonnes/acre.',
        'irrigation_advisory': 'Thrives in low rainfall (300-500mm); avoid waterlogging.'
    },
    'mungbean': {
        'hindi_name': 'मूंग दाल (हरी मूंग)',
        'category': 'Pulses',
        'season': 'Zaid (Summer) / Kharif',
        'npk_standard': '20:40:20 kg/ha',
        'fertilizers': [
            {'name': 'DAP', 'dosage': '35-40 kg/acre at sowing'},
            {'name': 'SSP', 'dosage': '80 kg/acre (P + 12% Sulphur)'}
        ],
        'organic': 'Rhizobium leguminosarum inoculation + Jeevamrit spray @ 200L/acre.',
        'irrigation_advisory': '3-4 light irrigations for summer crop, avoiding during peak flowering.'
    },
    'blackgram': {
        'hindi_name': 'उड़द दाल (काली दाल)',
        'category': 'Pulses',
        'season': 'Kharif / Summer',
        'npk_standard': '20:40:20 kg/ha',
        'fertilizers': [
            {'name': 'DAP', 'dosage': '40 kg/acre at sowing'},
            {'name': 'MOP', 'dosage': '15-20 kg/acre'}
        ],
        'organic': 'Compost 3 tonnes/acre + PSB liquid culture.',
        'irrigation_advisory': 'Critical at branching and pod filling stages.'
    },
    'lentil': {
        'hindi_name': 'मसूर दाल',
        'category': 'Pulses',
        'season': 'Rabi',
        'npk_standard': '20:40:20 kg/ha',
        'fertilizers': [
            {'name': 'DAP', 'dosage': '35-40 kg/acre'},
            {'name': 'SSP', 'dosage': '75 kg/acre'}
        ],
        'organic': 'Rhizobium seed treatment + 2 tonnes vermicompost/acre.',
        'irrigation_advisory': 'Needs 1-2 irrigations at 40-45 days and pod initiation.'
    },
    'pomegranate': {
        'hindi_name': 'अनार',
        'category': 'Fruit Horticulture',
        'season': 'Perennial',
        'npk_standard': '250:125:125 g/plant/year for bearing tree',
        'fertilizers': [
            {'name': 'Urea', 'dosage': '500g per mature plant in 3 split doses'},
            {'name': 'Single Super Phosphate', 'dosage': '750g per plant'},
            {'name': 'Muriate of Potash', 'dosage': '200g per plant'},
            {'name': 'Boron & Zinc foliar spray', 'dosage': '0.1% Borax during fruit set'}
        ],
        'organic': 'FYM 20-25 kg per plant + Neem cake 2 kg per plant annually.',
        'irrigation_advisory': 'Drip irrigation 20-30 liters/tree alternate days during fruiting.'
    },
    'banana': {
        'hindi_name': 'केला',
        'category': 'Fruit Horticulture',
        'season': 'All seasons',
        'npk_standard': '200:60:300 g/plant (High Potassium feeder)',
        'fertilizers': [
            {'name': 'Urea', 'dosage': '450g per plant in 4 splits'},
            {'name': 'DAP', 'dosage': '130g per plant basal'},
            {'name': 'MOP (Potash)', 'dosage': '500g per plant in 4 splits (essential for bunch weight)'}
        ],
        'organic': 'FYM 10 kg/plant + Panchagavya foliar spray (3%) monthly.',
        'irrigation_advisory': 'High water requirement (drip 15-25 L/day/plant). Keep soil moist.'
    },
    'mango': {
        'hindi_name': 'आम',
        'category': 'Fruit Orchard',
        'season': 'Perennial (Summer Harvest)',
        'npk_standard': '500:250:500 g/plant for mature tree (10+ years)',
        'fertilizers': [
            {'name': 'Urea', 'dosage': '1 kg per mature tree in July and October'},
            {'name': 'SSP', 'dosage': '1.5 kg per tree in July'},
            {'name': 'MOP', 'dosage': '1 kg per tree in July'}
        ],
        'organic': '50 kg FYM + 2 kg Bone meal per tree in monsoon basin application.',
        'irrigation_advisory': 'Stop irrigation 2 months prior to flowering; resume during marble stage.'
    },
    'grapes': {
        'hindi_name': 'अंगूर',
        'category': 'Fruit Viticulture',
        'season': 'Perennial',
        'npk_standard': '300:200:400 kg/ha (Heavy Potash user)',
        'fertilizers': [
            {'name': 'Urea', 'dosage': '300 kg/ha split post-pruning'},
            {'name': 'DAP', 'dosage': '400 kg/ha basal'},
            {'name': 'Sulphate of Potash (0:0:50)', 'dosage': '400 kg/ha through fertigation'}
        ],
        'organic': 'Vermicompost 5 tonnes/ha + Seaweed extract fertigation.',
        'irrigation_advisory': 'Drip fertigation precisely scheduled; reduce water near harvest for sugar brix.'
    },
    'watermelon': {
        'hindi_name': 'तरबूज',
        'category': 'Cucurbit / Fruit',
        'season': 'Zaid / Summer',
        'npk_standard': '80:40:40 kg/ha',
        'fertilizers': [
            {'name': 'Urea', 'dosage': '70 kg/acre in 3 splits'},
            {'name': 'DAP', 'dosage': '40 kg/acre basal'},
            {'name': 'MOP', 'dosage': '30 kg/acre for fruit sweetness'}
        ],
        'organic': 'Poultry manure or Vermicompost 2 tonnes/acre.',
        'irrigation_advisory': 'Light frequent irrigation on drip with plastic mulch; stop 5 days before harvest.'
    },
    'muskmelon': {
        'hindi_name': 'खरबूजा',
        'category': 'Cucurbit / Fruit',
        'season': 'Zaid / Summer',
        'npk_standard': '80:40:40 kg/ha',
        'fertilizers': [
            {'name': 'Urea', 'dosage': '65 kg/acre'},
            {'name': 'DAP', 'dosage': '35 kg/acre'},
            {'name': 'MOP', 'dosage': '30 kg/acre'}
        ],
        'organic': 'FYM 4 tonnes/acre in furrows + Neem cake 150 kg/acre.',
        'irrigation_advisory': 'Channel or drip irrigation; keep vine beds dry.'
    },
    'apple': {
        'hindi_name': 'सेब',
        'category': 'Temperate Fruit (Hills)',
        'season': 'Perennial (Winter Chilling)',
        'npk_standard': '700:350:700 g/tree for bearing orchard',
        'fertilizers': [
            {'name': 'CAN (Calcium Ammonium Nitrate)', 'dosage': '1.5 kg/tree in Feb-March'},
            {'name': 'SSP', 'dosage': '2 kg/tree in Dec-Jan'},
            {'name': 'MOP', 'dosage': '1.2 kg/tree in Dec-Jan'},
            {'name': 'Boric Acid / Zinc spray', 'dosage': 'Foliar spray at pink bud stage'}
        ],
        'organic': 'FYM 40-50 kg/tree in winter basin dressing + pine needle mulching.',
        'irrigation_advisory': 'Requires 1000-1200 chilling hours; drip irrigation during fruit expansion.'
    },
    'orange': {
        'hindi_name': 'संतरा (मौसंबी / किन्नू)',
        'category': 'Citrus Fruit',
        'season': 'Perennial',
        'npk_standard': '600:200:300 g/tree',
        'fertilizers': [
            {'name': 'Urea', 'dosage': '1.2 kg/tree in 3 equal parts (Jan, May, Aug)'},
            {'name': 'SSP', 'dosage': '1.2 kg/tree in Jan'},
            {'name': 'MOP', 'dosage': '500g/tree in Jan'},
            {'name': 'Micronutrient Citrus mix', 'dosage': 'Zinc + Iron + Manganese foliar spray'}
        ],
        'organic': 'FYM 25 kg/tree + Trichoderma harzianum soil drenching for root rot protection.',
        'irrigation_advisory': 'Ring basin or drip method; avoid direct trunk contact with water.'
    },
    'papaya': {
        'hindi_name': 'पपीता',
        'category': 'Fruit Horticulture',
        'season': 'All seasons',
        'npk_standard': '250:250:500 g/plant/year',
        'fertilizers': [
            {'name': 'Urea', 'dosage': '50g/plant monthly'},
            {'name': 'DAP', 'dosage': '50g/plant bimonthly'},
            {'name': 'MOP', 'dosage': '80g/plant monthly (vital for fruit firm texture)'}
        ],
        'organic': 'Neem cake 1 kg/plant + Vermicompost 5 kg/plant at planting.',
        'irrigation_advisory': 'Highly sensitive to water stagnation (causes collar rot). Use raised beds.'
    },
    'coconut': {
        'hindi_name': 'नारियल',
        'category': 'Plantation',
        'season': 'Perennial',
        'npk_standard': '500:320:1200 g/palm/year (Extremely high Potash feeder)',
        'fertilizers': [
            {'name': 'Urea', 'dosage': '1.1 kg/palm in two splits (May-June & Sept-Oct)'},
            {'name': 'Rock Phosphate or SSP', 'dosage': '1.6 kg/palm'},
            {'name': 'MOP', 'dosage': '2 kg/palm (critical for nut size and copra yield)'},
            {'name': 'Common Salt (NaCl)', 'dosage': '1 kg/palm in coastal / inland soils'}
        ],
        'organic': '50 kg green leaf / compost + Coir pith mulching in palm basin.',
        'irrigation_advisory': 'Drip 30-40 L/palm/day; mulching around 2m radius to conserve moisture.'
    },
    'cotton': {
        'hindi_name': 'कपास (सफेद सोना)',
        'category': 'Fiber Cash Crop',
        'season': 'Kharif',
        'npk_standard': '120:60:60 kg/ha',
        'fertilizers': [
            {'name': 'Urea', 'dosage': '90-100 kg/acre in 3 splits (sowing, square, peak boll)'},
            {'name': 'DAP', 'dosage': '50 kg/acre basal'},
            {'name': 'MOP', 'dosage': '40 kg/acre for fiber strength'},
            {'name': 'Magnesium Sulphate', 'dosage': '10 kg/acre to prevent red leaf disease'}
        ],
        'organic': 'FYM 5 tonnes/acre + Castor cake 200 kg/acre.',
        'irrigation_advisory': '4-5 irrigations; avoid water stress during flowering and boll development.'
    },
    'jute': {
        'hindi_name': 'पटसन / जूट',
        'category': 'Fiber Crop',
        'season': 'Kharif',
        'npk_standard': '60:30:30 kg/ha',
        'fertilizers': [
            {'name': 'Urea', 'dosage': '50 kg/acre in 2 splits (basal & 3 weeks after sowing)'},
            {'name': 'SSP', 'dosage': '75 kg/acre'},
            {'name': 'MOP', 'dosage': '20 kg/acre'}
        ],
        'organic': 'Green manuring or FYM 3 tonnes/acre.',
        'irrigation_advisory': 'Requires high rainfall (150-250cm) and high humidity (70-90%).'
    },
    'coffee': {
        'hindi_name': 'कॉफ़ी (कहवा)',
        'category': 'Plantation Cash Crop',
        'season': 'Perennial (Shade Grown)',
        'npk_standard': '140:90:140 kg/ha (Arabica), 120:90:120 kg/ha (Robusta)',
        'fertilizers': [
            {'name': 'Complex 17:17:17', 'dosage': '150 kg/acre pre-monsoon & post-monsoon'},
            {'name': 'Urea', 'dosage': '40 kg/acre top dressing'},
            {'name': 'MOP', 'dosage': '30 kg/acre post-harvest'}
        ],
        'organic': 'Coffee pulp compost 3 tonnes/acre + Shade tree leaf litter.',
        'irrigation_advisory': 'Blossom shower irrigation in March-April (25-30mm) followed by backing shower.'
    }
}

# Save artifacts
print("\nSaving trained models & artifacts to:", MODEL_DIR)
joblib.dump(rf_model, os.path.join(MODEL_DIR, 'fertilizer_crop_model.joblib'), compress=3)
joblib.dump(le, os.path.join(MODEL_DIR, 'fertilizer_crop_encoders.joblib'))

metrics_data = {
    'model_name': 'RandomForestClassifier',
    'total_samples': int(len(df)),
    'num_features': len(feature_cols),
    'feature_names': feature_cols,
    'num_crops': int(len(le.classes_)),
    'crop_names': list(le.classes_),
    'accuracy': round(float(acc * 100), 2),
    'top2_accuracy': round(float(top2_acc * 100), 2),
    'top3_accuracy': round(float(top3_acc * 100), 2),
    'crop_benchmarks': crop_benchmarks
}

with open(os.path.join(MODEL_DIR, 'fertilizer_crop_metrics.json'), 'w', encoding='utf-8') as f:
    json.dump(metrics_data, f, indent=2, ensure_ascii=False)

with open(os.path.join(MODEL_DIR, 'fertilizer_crop_knowledge.json'), 'w', encoding='utf-8') as f:
    json.dump(CROP_FERTILIZER_GUIDE, f, indent=2, ensure_ascii=False)

print("Training & artifact export complete! Model accuracy:", f"{acc * 100:.2f}%")
