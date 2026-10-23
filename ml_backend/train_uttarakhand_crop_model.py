"""
KisanSaathi AI — Uttarakhand Crop & Varieties Model Trainer
Trains an advanced machine learning model on Uttarakhand agro-climatic data
incorporating `datasets/uttarakhand-crop/Uttarakhand_Crops_with_Varieties.xlsx`
and `datasets/crop-region/Crop_Data.csv`.

Predicts suitable crops and official recommended varieties according to:
- Uttarakhand Region / District / PIN code
- Season (Kharif, Rabi, Summer / Zaid, Whole Year)
- Soil Type (Alluvial, Sandy Loam, Clay Loam, Brown Hill Soil, Mountain / Gravelly Soil)
- Elevation & Zone (Tarai Plains, Doon Valley, Mid-Hills, High Mountain)
- Soil NPK (Nitrogen, Phosphorus, Potassium), pH
- Rainfall & Temperature
"""

import os
import json
import re
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, top_k_accuracy_score, classification_report
import joblib

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET_EXCEL = os.path.join(BASE_DIR, 'datasets', 'uttarakhand-crop', 'Uttarakhand_Crops_with_Varieties.xlsx')
CROP_DATA_CSV = os.path.join(BASE_DIR, 'datasets', 'crop-region', 'Crop_Data.csv')
MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models')
os.makedirs(MODEL_DIR, exist_ok=True)

print("=" * 70)
print("TRAINING UTTARAKHAND CROP RECOMMENDATION & VARIETY MODEL")
print("=" * 70)

# 1. Parse Excel Knowledge Base
print(f"Reading Uttarakhand Crops & Varieties from: {DATASET_EXCEL}")
xl = pd.ExcelFile(DATASET_EXCEL)
df_uk_crops = xl.parse('Uttarakhand Crops')
df_uk_notes = xl.parse('Variety Notes')

print(f"Loaded {len(df_uk_crops)} Uttarakhand crops with varieties.")

# Clean strings
for col in df_uk_crops.columns:
    df_uk_crops[col] = df_uk_crops[col].astype(str).str.strip()

# Build comprehensive knowledge base from Excel
crop_knowledge = {}
pincode_to_district = {}
district_to_pincodes = {}

# Comprehensive Uttarakhand PIN code directory mapped to Districts & Zones
UK_PIN_DIRECTORY = {
    # Udham Singh Nagar (Tarai Plains, 200-300m)
    "263153": {"district": "Udham Singh Nagar", "place": "Rudrapur", "zone": "Tarai Alluvial Plain", "elevation_m": 240, "soil": "Alluvial Soil"},
    "263148": {"district": "Udham Singh Nagar", "place": "Kashipur", "zone": "Tarai Alluvial Plain", "elevation_m": 235, "soil": "Alluvial Soil"},
    "263139": {"district": "Udham Singh Nagar", "place": "Bazpur", "zone": "Tarai Alluvial Plain", "elevation_m": 245, "soil": "Alluvial Soil"},
    "252308": {"district": "Udham Singh Nagar", "place": "Kichha", "zone": "Tarai Alluvial Plain", "elevation_m": 220, "soil": "Alluvial Soil"},
    "262403": {"district": "Udham Singh Nagar", "place": "Sitarganj", "zone": "Tarai Alluvial Plain", "elevation_m": 225, "soil": "Alluvial Soil"},
    "262308": {"district": "Udham Singh Nagar", "place": "Khatima", "zone": "Tarai Alluvial Plain", "elevation_m": 210, "soil": "Alluvial Soil"},
    "263160": {"district": "Udham Singh Nagar", "place": "Pantnagar", "zone": "Tarai Alluvial Plain", "elevation_m": 243, "soil": "Alluvial Soil"},
    "263149": {"district": "Udham Singh Nagar", "place": "Jaspur", "zone": "Tarai Alluvial Plain", "elevation_m": 240, "soil": "Alluvial Soil"},
    "263152": {"district": "Udham Singh Nagar", "place": "Gadarpur", "zone": "Tarai Alluvial Plain", "elevation_m": 238, "soil": "Alluvial Soil"},

    # Haridwar (Gangetic Plain, 250-350m)
    "249401": {"district": "Haridwar", "place": "Haridwar", "zone": "Gangetic Plain / Terai", "elevation_m": 314, "soil": "Alluvial Soil"},
    "249408": {"district": "Haridwar", "place": "Laksar", "zone": "Gangetic Plain / Terai", "elevation_m": 270, "soil": "Alluvial Soil"},
    "247663": {"district": "Haridwar", "place": "Roorkee", "zone": "Gangetic Plain / Terai", "elevation_m": 268, "soil": "Alluvial Soil"},
    "249404": {"district": "Haridwar", "place": "Gurukul Kangri", "zone": "Gangetic Plain / Terai", "elevation_m": 290, "soil": "Alluvial Soil"},
    "247661": {"district": "Haridwar", "place": "Bhagwanpur", "zone": "Gangetic Plain / Terai", "elevation_m": 275, "soil": "Alluvial Soil"},
    "247656": {"district": "Haridwar", "place": "Manglaur", "zone": "Gangetic Plain / Terai", "elevation_m": 265, "soil": "Alluvial Soil"},

    # Dehradun (Doon Valley / Basin, 500-1800m)
    "248001": {"district": "Dehradun", "place": "Dehradun Central", "zone": "Doon Valley Basin", "elevation_m": 640, "soil": "Sandy Loam"},
    "248142": {"district": "Dehradun", "place": "Vikasnagar", "zone": "Doon Valley Basin", "elevation_m": 580, "soil": "Sandy Loam"},
    "248158": {"district": "Dehradun", "place": "Kalsi", "zone": "Sub-Himalayan Foothills", "elevation_m": 720, "soil": "Brown Hill Soil"},
    "248123": {"district": "Dehradun", "place": "Chakrata", "zone": "Mid-Himalayan Terrace", "elevation_m": 2118, "soil": "Mountain / Gravelly Soil"},
    "248197": {"district": "Dehradun", "place": "Sahaspur", "zone": "Doon Valley Basin", "elevation_m": 590, "soil": "Sandy Loam"},
    "248007": {"district": "Dehradun", "place": "Premnagar", "zone": "Doon Valley Basin", "elevation_m": 610, "soil": "Sandy Loam"},
    "249201": {"district": "Dehradun", "place": "Rishikesh", "zone": "Doon Foothills", "elevation_m": 372, "soil": "Alluvial Soil"},
    "248179": {"district": "Dehradun", "place": "Mussoorie", "zone": "High Mountain Ridge", "elevation_m": 2005, "soil": "Mountain / Gravelly Soil"},
    "248140": {"district": "Dehradun", "place": "Doiwala", "zone": "Doon Valley Basin", "elevation_m": 500, "soil": "Sandy Loam"},

    # Almora (Mid-Hills Ridge, 1400-1800m)
    "263601": {"district": "Almora", "place": "Almora", "zone": "Mid-Hill Ridge", "elevation_m": 1638, "soil": "Brown Hill Soil"},
    "263642": {"district": "Almora", "place": "Ranikhet", "zone": "Mid-Hill Ridge", "elevation_m": 1829, "soil": "Brown Hill Soil"},
    "263620": {"district": "Almora", "place": "Dwarahat", "zone": "Mid-Hill Terraces", "elevation_m": 1510, "soil": "Brown Hill Soil"},
    "263656": {"district": "Almora", "place": "Bhikiyasain", "zone": "River Valley Hills", "elevation_m": 1050, "soil": "Sandy Loam"},
    "263628": {"district": "Almora", "place": "Someshwar", "zone": "Mid-Hill Valley", "elevation_m": 1400, "soil": "Brown Hill Soil"},
    "263652": {"district": "Almora", "place": "Chaukhutiya", "zone": "Ramganga River Valley", "elevation_m": 1150, "soil": "Brown Hill Soil"},

    # Pauri Garhwal (Hill Slopes & Valleys, 800-1800m)
    "246001": {"district": "Pauri Garhwal", "place": "Pauri", "zone": "Hill Slopes & Valleys", "elevation_m": 1814, "soil": "Brown Hill Soil"},
    "246149": {"district": "Pauri Garhwal", "place": "Kotdwar", "zone": "Sub-Himalayan Foot", "elevation_m": 454, "soil": "Sandy Loam"},
    "246174": {"district": "Pauri Garhwal", "place": "Srinagar Garhwal", "zone": "Alaknanda Valley Basin", "elevation_m": 560, "soil": "Alluvial Soil"},
    "246155": {"district": "Pauri Garhwal", "place": "Lansdowne", "zone": "High Pine Ridge", "elevation_m": 1706, "soil": "Brown Hill Soil"},
    "246173": {"district": "Pauri Garhwal", "place": "Satpuli", "zone": "Garhwal Valley Basin", "elevation_m": 650, "soil": "Sandy Loam"},
    "246177": {"district": "Pauri Garhwal", "place": "Thalisain", "zone": "Upper Hill Terraces", "elevation_m": 1650, "soil": "Brown Hill Soil"},

    # Tehri Garhwal (Mid-Himalayan Terrace, 800-1800m)
    "249001": {"district": "Tehri Garhwal", "place": "New Tehri", "zone": "Mid-Himalayan Terrace", "elevation_m": 1750, "soil": "Brown Hill Soil"},
    "249175": {"district": "Tehri Garhwal", "place": "Narendra Nagar", "zone": "Lower Hill Ridges", "elevation_m": 1326, "soil": "Brown Hill Soil"},
    "249145": {"district": "Tehri Garhwal", "place": "Chamba", "zone": "Mid-Himalayan Terrace", "elevation_m": 1524, "soil": "Brown Hill Soil"},
    "249161": {"district": "Tehri Garhwal", "place": "Devprayag", "zone": "River Confluence Valley", "elevation_m": 830, "soil": "Sandy Loam"},
    "249199": {"district": "Tehri Garhwal", "place": "Ghansali", "zone": "Bhilangana River Valley", "elevation_m": 980, "soil": "Brown Hill Soil"},

    # Chamoli (High Mountain Alpine & Valleys, 1400-2500m)
    "246401": {"district": "Chamoli", "place": "Gopeshwar", "zone": "High Mountain Alpine", "elevation_m": 1550, "soil": "Mountain / Gravelly Soil"},
    "246443": {"district": "Chamoli", "place": "Joshimath", "zone": "Upper Himalayan Valley", "elevation_m": 1890, "soil": "Mountain / Gravelly Soil"},
    "246444": {"district": "Chamoli", "place": "Karnaprayag", "zone": "Pindar Confluence Valley", "elevation_m": 860, "soil": "Brown Hill Soil"},
    "246442": {"district": "Chamoli", "place": "Gauchar", "zone": "Valley River Basin", "elevation_m": 800, "soil": "Sandy Loam"},
    "246472": {"district": "Chamoli", "place": "Pokhari", "zone": "Terraced Mountain Slope", "elevation_m": 1900, "soil": "Mountain / Gravelly Soil"},

    # Uttarkashi (Upper Himalayan Valleys, 1100-2600m)
    "249193": {"district": "Uttarkashi", "place": "Uttarkashi Central", "zone": "Upper Himalayan Valley", "elevation_m": 1158, "soil": "Brown Hill Soil"},
    "249141": {"district": "Uttarkashi", "place": "Barkot", "zone": "Yamuna Valley Terraces", "elevation_m": 1220, "soil": "Brown Hill Soil"},
    "249135": {"district": "Uttarkashi", "place": "Harsil", "zone": "High Alpine Apple Belt", "elevation_m": 2745, "soil": "Mountain / Gravelly Soil"},
    "249151": {"district": "Uttarkashi", "place": "Mori", "zone": "Tons Valley Apple Zone", "elevation_m": 1400, "soil": "Mountain / Gravelly Soil"},
    "249185": {"district": "Uttarkashi", "place": "Purola", "zone": "Kamal River Valley", "elevation_m": 1524, "soil": "Sandy Loam"},
    "249152": {"district": "Uttarkashi", "place": "Naugaon", "zone": "Yamuna Valley Terraces", "elevation_m": 1100, "soil": "Brown Hill Soil"},

    # Rudraprayag (Steep River Gorges & Terraces, 800-2000m)
    "246475": {"district": "Rudraprayag", "place": "Rudraprayag", "zone": "Steep River Gorge", "elevation_m": 895, "soil": "Brown Hill Soil"},
    "246439": {"district": "Rudraprayag", "place": "Guptkashi", "zone": "Mandakini Valley Terrace", "elevation_m": 1319, "soil": "Brown Hill Soil"},
    "246469": {"district": "Rudraprayag", "place": "Ukhimath", "zone": "Upper Mandakini Slope", "elevation_m": 1311, "soil": "Mountain / Gravelly Soil"},
    "246419": {"district": "Rudraprayag", "place": "Agastyamuni", "zone": "River Valley Terraces", "elevation_m": 820, "soil": "Sandy Loam"},

    # Nainital (Lake Basin, Hills & Tarai, 300-2100m)
    "263001": {"district": "Nainital", "place": "Nainital", "zone": "Lake Basin & Hills", "elevation_m": 2084, "soil": "Brown Hill Soil"},
    "263139": {"district": "Nainital", "place": "Haldwani", "zone": "Bhabhar Foothill Plain", "elevation_m": 424, "soil": "Alluvial Soil"},
    "244715": {"district": "Nainital", "place": "Ramnagar", "zone": "Kosi River Valley / Terai", "elevation_m": 345, "soil": "Alluvial Soil"},
    "263132": {"district": "Nainital", "place": "Bhowali", "zone": "Mid-Hills Fruit Belt", "elevation_m": 1706, "soil": "Brown Hill Soil"},
    "263135": {"district": "Nainital", "place": "Ramgarh", "zone": "Fruit Bowl of Kumaon", "elevation_m": 1789, "soil": "Brown Hill Soil"},
    "263137": {"district": "Nainital", "place": "Mukteshwar", "zone": "High Mountain Ridge", "elevation_m": 2171, "soil": "Mountain / Gravelly Soil"},
    "263138": {"district": "Nainital", "place": "Bhimtal", "zone": "Mid-Hills Lake Basin", "elevation_m": 1370, "soil": "Brown Hill Soil"},

    # Pithoragarh (Eastern Mountain Ridges, 1200-2400m)
    "262501": {"district": "Pithoragarh", "place": "Pithoragarh Central", "zone": "Eastern Mountain Ridge", "elevation_m": 1627, "soil": "Brown Hill Soil"},
    "262554": {"district": "Pithoragarh", "place": "Munsyari", "zone": "High Alpine Johar Valley", "elevation_m": 2200, "soil": "Mountain / Gravelly Soil"},
    "262551": {"district": "Pithoragarh", "place": "Dharchula", "zone": "Kali River Gorge", "elevation_m": 940, "soil": "Brown Hill Soil"},
    "262522": {"district": "Pithoragarh", "place": "Didihat", "zone": "Mid-Hills Ridge", "elevation_m": 1725, "soil": "Brown Hill Soil"},
    "262523": {"district": "Pithoragarh", "place": "Berinag", "zone": "Tea & Hill Terraces", "elevation_m": 1860, "soil": "Brown Hill Soil"},

    # Bageshwar (River Confluence Valleys, 900-1500m)
    "263642": {"district": "Bageshwar", "place": "Bageshwar", "zone": "River Confluence Valley", "elevation_m": 1004, "soil": "Brown Hill Soil"},
    "263641": {"district": "Bageshwar", "place": "Baijnath", "zone": "Garur Valley Basin", "elevation_m": 1125, "soil": "Alluvial Soil"},
    "263634": {"district": "Bageshwar", "place": "Garur", "zone": "Valley Basin Terraces", "elevation_m": 1100, "soil": "Brown Hill Soil"},
    "263679": {"district": "Bageshwar", "place": "Kapkot", "zone": "Saryu Valley Foothills", "elevation_m": 1250, "soil": "Brown Hill Soil"},

    # Champawat (Sub-Himalayan Forest & Hills, 1200-1800m)
    "262523": {"district": "Champawat", "place": "Champawat", "zone": "Sub-Himalayan Forest", "elevation_m": 1610, "soil": "Brown Hill Soil"},
    "262524": {"district": "Champawat", "place": "Lohaghat", "zone": "Kumaon Pine Terraces", "elevation_m": 1754, "soil": "Brown Hill Soil"},
    "262309": {"district": "Champawat", "place": "Tanakpur", "zone": "Sharda River Terai Border", "elevation_m": 255, "soil": "Alluvial Soil"},
}

# Detailed agronomic profile for each Uttarakhand crop from Sheet 1 & Sheet 2
CROP_AGRONOMY = {
    "Wheat": {
        "hindi_name": "गेहूं",
        "category": "Cereal",
        "primary_season": "Rabi",
        "sowing_window": "October 25 - November 25",
        "harvest_window": "April - May",
        "soil_suitability": ["Alluvial Soil", "Sandy Loam", "Clay Loam"],
        "npk_ratio": "100:50:50 kg/ha (Plains), 80:40:40 kg/ha (Hills)",
        "optimal_temp_c": "15°C - 24°C",
        "water_requirement": "4-5 irrigations (CRI, Tillering, Flowering, Grain filling)",
        "care_tips": [
            "VL Gehun 907 and VL 892 are specially bred by ICAR-VPKAS Almora for rainfed/irrigated Uttarakhand hills.",
            "UP 2628 and HD 2967 give highest yields in Udham Singh Nagar and Haridwar plains.",
            "First irrigation at Crown Root Initiation (CRI) 21-25 days after sowing is mandatory for high tillering."
        ],
        "fertilizer_guide": [
            "Basal: 50% Nitrogen + Full Phosphorus (DAP) + Full Potash (MOP) at final ploughing.",
            "Top dress: 25% Nitrogen after first irrigation, balance 25% at boot stage."
        ],
        "disease_management": [
            "Yellow Rust (Stripe Rust): Spray Propiconazole (Tilt 25 EC) @ 1 ml/L upon first yellow stripe sighting.",
            "Loose Smut / Karnal Bunt: Treat seeds with Carbendazim 50 WP @ 2.5 g/kg seed before sowing."
        ],
        "icar_gbpuat_note": "ICAR-VPKAS Almora & GBPUAT Pantnagar certified high-yielding wheat varieties for Uttarakhand."
    },
    "Paddy / Basmati Rice": {
        "hindi_name": "धान / बासमती चावल",
        "category": "Cereal",
        "primary_season": "Kharif",
        "sowing_window": "May 25 - June 20 (Nursery), June 20 - July 15 (Transplant)",
        "harvest_window": "October - November",
        "soil_suitability": ["Alluvial Soil", "Clay Loam"],
        "npk_ratio": "120:60:40 kg/ha (Hybrids), 90:40:30 kg/ha (Basmati)",
        "optimal_temp_c": "22°C - 34°C",
        "water_requirement": "Standing water 2-5 cm during tillering to panicle initiation",
        "care_tips": [
            "Pant Sugandh Dhan 16/17 are premium aromatic Basmati selections from GB Pant University (Pantnagar) ideal for Udham Singh Nagar & Haridwar.",
            "VL Dhan 156 and VL Dhan 158 are cold-tolerant varieties specifically developed for mid-altitude valleys (600-1200m).",
            "Maintain 20x15 cm hill spacing with 2 seedlings per hill."
        ],
        "fertilizer_guide": [
            "Basal: Apply 1/3 N + entire P + entire K + 25 kg Zinc Sulphate/ha at puddling.",
            "Top dressing: 1/3 N at active tillering (3 weeks), 1/3 N at panicle emergence."
        ],
        "disease_management": [
            "Bacterial Leaf Blight: Spray Streptocycline @ 0.1 g/L with Copper Oxychloride @ 2.5 g/L.",
            "Blast (Pyricularia): Spray Tricyclazole 75 WP @ 0.6 g/L water.",
            "Brown Planthopper: Maintain alternate wetting and drying; spray Pymetrozine 50 WG @ 0.6 g/L."
        ],
        "icar_gbpuat_note": "Direct recommendation from Pantnagar Rice Research Station & ICAR-VPKAS Almora."
    },
    "Sugarcane": {
        "hindi_name": "गन्ना",
        "category": "Cash Crop",
        "primary_season": "Whole Year",
        "sowing_window": "February - March (Spring), October (Autumn)",
        "harvest_window": "November - March (10-12 months)",
        "soil_suitability": ["Alluvial Soil", "Clay Loam"],
        "npk_ratio": "150:60:60 kg/ha",
        "optimal_temp_c": "25°C - 38°C",
        "water_requirement": "High; regular irrigation every 10-15 days during summer till monsoon sets in",
        "care_tips": [
            "Co Pant 94211 & Co Pant 84211 are early maturing, high-sugar varieties developed by GBPUAT Pantnagar with excellent frost tolerance.",
            "Use two-budded setts treated with Carbendazim 0.1% to prevent Red Rot.",
            "Trench planting at 90-120 cm row distance improves sucrose content and makes mechanical earthing-up easier."
        ],
        "fertilizer_guide": [
            "Basal: 1/3 N + Full P & K in furrows before sett placement.",
            "Top dress: 1/3 N at 45 days (tillering), remaining 1/3 N at 90 days before monsoon."
        ],
        "disease_management": [
            "Red Rot: Strictly use healthy seed canes of resistant varieties Co Pant 94211/84211; soak setts in hot water or Bavistin.",
            "Top Borer / Shoot Borer: Apply Cartap Hydrochloride 4G @ 25 kg/ha in root zone."
        ],
        "icar_gbpuat_note": "Co Pant varieties are the lifeline of sugar mills in US Nagar, Haridwar, and Doiwala Dehradun."
    },
    "Finger Millet (Mandua)": {
        "hindi_name": "मंडुआ / कोदा",
        "category": "Nutri-Cereal / Hill Millet",
        "primary_season": "Kharif",
        "sowing_window": "June 1 - July 10 (onset of monsoon)",
        "harvest_window": "October - November",
        "soil_suitability": ["Brown Hill Soil", "Sandy Loam", "Mountain / Gravelly Soil"],
        "npk_ratio": "40:20:20 kg/ha (Rainfed hills)",
        "optimal_temp_c": "18°C - 30°C",
        "water_requirement": "Low; drought-hardy rainfed crop requiring 350-500 mm rainfall",
        "care_tips": [
            "VL Mandua 376, 382, 402 and VLM 352 bred by VPKAS Almora yield 25-30% higher than traditional landraces.",
            "Rich in dietary calcium (344 mg/100g) and iron; high market demand under Uttarakhand Millets Mission.",
            "Direct line sowing or transplanting 20-day seedlings gives 30% higher grain yield than broadcasting."
        ],
        "fertilizer_guide": [
            "Apply 5-8 tonnes well-decomposed FYM/compost per hectare.",
            "Chemical basal dose: 20 kg N + 20 kg P2O5 + 20 kg K2O at sowing; top dress 20 kg N after 30 days."
        ],
        "disease_management": [
            "Blast (Magnaporthe grisea): Seed treatment with Pseudomonas fluorescens @ 10 g/kg or Carbendazim @ 2 g/kg.",
            "Foliar spray of Kitazin 48 EC @ 1 ml/L if neck blast appears at flowering."
        ],
        "icar_gbpuat_note": "ICAR-VPKAS Almora spearheads national breeding for finger millet; VLM varieties are national benchmarks."
    },
    "Barnyard Millet (Jhangora)": {
        "hindi_name": "झंगोरा",
        "category": "Nutri-Cereal / Fast Millet",
        "primary_season": "Kharif",
        "sowing_window": "May 15 - June 25",
        "harvest_window": "August - September (Fast 85-95 days maturity)",
        "soil_suitability": ["Brown Hill Soil", "Mountain / Gravelly Soil"],
        "npk_ratio": "40:20:0 kg/ha",
        "optimal_temp_c": "15°C - 28°C",
        "water_requirement": "Extremely low; highly drought-resilient and flood-resilient",
        "care_tips": [
            "VL Madira 172, VL Madira 207 and 254 are benchmark varieties developed by VPKAS Almora for high altitudes (1000-2200m).",
            "Matures in just 85-95 days, providing the earliest food grain buffer in high hill terraced farms.",
            "Can withstand severe water stress and marginal, shallow stony soils."
        ],
        "fertilizer_guide": [
            "Add 4-5 tonnes FYM/compost. In fertilized plots apply 20 kg N and 20 kg P2O5 at sowing.",
            "One weeding 25-30 days after emergence."
        ],
        "disease_management": [
            "Head smut: Seed treatment with Thiram or Carbendazim @ 2 g/kg seed.",
            "Shoot fly: Sow with the onset of pre-monsoon showers to avoid peak insect activity."
        ],
        "icar_gbpuat_note": "Key hill nutrition crop documented in ICAR Uttarakhand State Summary."
    },
    "Maize": {
        "hindi_name": "मक्का",
        "category": "Cereal",
        "primary_season": "Kharif",
        "sowing_window": "May 15 - June 20 (Rainfed), February - March (Spring)",
        "harvest_window": "September - October",
        "soil_suitability": ["Sandy Loam", "Brown Hill Soil", "Alluvial Soil"],
        "npk_ratio": "120:60:40 kg/ha",
        "optimal_temp_c": "20°C - 32°C",
        "water_requirement": "Critical at knee-high, tasseling, and silking stages; waterlogging is detrimental",
        "care_tips": [
            "Pant Sankar Makka-1, Gaurav and Surya are high-yield cultivars from Pantnagar for Doon Valley, Kalsi, and Nainital foothills.",
            "Provide good drainage in terrace fields as maize roots rot in waterlogged soils.",
            "Earthing up at 30 days prevents lodging during strong mountain wind storms."
        ],
        "fertilizer_guide": [
            "Basal: 1/3 N + Full P + Full K at sowing time.",
            "Top dress: 1/3 N at knee-high stage (30-35 DAS), 1/3 N at silking."
        ],
        "disease_management": [
            "Fall Armyworm (Spodoptera frugiperda): Spray Chlorantraniliprole 18.5 SC @ 0.4 ml/L or Emamectin Benzoate 5 SG @ 0.4 g/L in leaf whorls.",
            "Turcicum Leaf Blight: Spray Mancozeb 75 WP @ 2.5 g/L."
        ],
        "icar_gbpuat_note": "Pant Sankar Makka-1 developed by GBPUAT Pantnagar."
    },
    "Potato": {
        "hindi_name": "आलू",
        "category": "Tuber / Vegetable",
        "primary_season": "Rabi",
        "sowing_window": "October 10 - November 10 (Plains), March - April (Hills/Summer)",
        "harvest_window": "January - February (Plains), July - August (Hills)",
        "soil_suitability": ["Sandy Loam", "Brown Hill Soil"],
        "npk_ratio": "150:80:100 kg/ha",
        "optimal_temp_c": "15°C - 22°C (tuberization optimum 18°C-20°C)",
        "water_requirement": "Moderate; frequent light irrigations every 7-10 days",
        "care_tips": [
            "Kufri Khyati and Kufri Pushkar are early/medium-maturing, late-blight-tolerant varieties ideal for Nainital (Bhowali), Almora, Dehradun and Barkot.",
            "Use certified seed tubers of 35-45 mm size with 2-3 active sprouts.",
            "Perform ridge earthing up twice: first when plants are 15-20 cm high, second 2 weeks later."
        ],
        "fertilizer_guide": [
            "Basal: Apply 20 tonnes FYM/ha + 50% N + 100% P2O5 + 100% K2O in furrow ridges.",
            "Top dress: Remaining 50% N at first earthing-up (30-35 DAS)."
        ],
        "disease_management": [
            "Late Blight (Phytophthora infestans): Preventive spray with Mancozeb 75 WP @ 2.5 g/L; curative spray with Cymoxanil + Mancozeb (Curzate) @ 3 g/L.",
            "Potato Aphids: Spray Imidacloprid 17.8 SL @ 0.3 ml/L."
        ],
        "icar_gbpuat_note": "ICAR-CPRI Kufri & GBPUAT Pantnagar certified potato package."
    },
    "Rajma (Kidney Beans)": {
        "hindi_name": "राजमा",
        "category": "Pulse / Cash Hill Crop",
        "primary_season": "Kharif",
        "sowing_window": "May 15 - June 20 (High Hills: Harsil, Munsyari)",
        "harvest_window": "September - October",
        "soil_suitability": ["Sandy Loam", "Mountain / Gravelly Soil", "Brown Hill Soil"],
        "npk_ratio": "90:60:40 kg/ha",
        "optimal_temp_c": "14°C - 24°C (high hill cool temperate climate)",
        "water_requirement": "Rainfed in high hills; moisture sensitive at flowering and pod filling",
        "care_tips": [
            "Harsil (Uttarkashi) and Munsyari (Pithoragarh) are world-famous GI-candidate terroirs for premium organic Rajma.",
            "Arun, HUR 301, HUR 203 are certified high-protein, bush/semi-trailing cultivars.",
            "Unlike other pulses, Rajma lacks native Rhizobium nodules in plains, but high hill soils have native symbionts; seed inoculation with Rhizobium phaseoli improves yield by 20%."
        ],
        "fertilizer_guide": [
            "Incorporate 10 tonnes well-rotted FYM/compost per hectare.",
            "Apply 40 kg N + 60 kg P2O5 + 40 kg K2O basal, and 40 kg N top dressed at 30 days."
        ],
        "disease_management": [
            "Anthracnose: Treat seeds with Carbendazim @ 2 g/kg; spray Carbendazim @ 1 g/L if pod lesions appear.",
            "Bean Rust: Spray Hexaconazole 5 EC @ 1 ml/L."
        ],
        "icar_gbpuat_note": "Celebrated Uttarakhand hill specialty documented in ICAR & State Agriculture Roadmap."
    },
    "Black Soybean (Bhatt)": {
        "hindi_name": "भट्ट / काला सोयाबीन",
        "category": "Pulse / Oilseed / Traditional Hill Crop",
        "primary_season": "Kharif",
        "sowing_window": "June 1 - June 30",
        "harvest_window": "October - November",
        "soil_suitability": ["Brown Hill Soil", "Sandy Loam"],
        "npk_ratio": "20:60:40 kg/ha",
        "optimal_temp_c": "18°C - 28°C",
        "water_requirement": "Rainfed; requires well-drained slope soil",
        "care_tips": [
            "VL Bhat 201 and VL Bhat 202 are released by ICAR-VPKAS Almora with high protein (42%) and antioxidant anthocyanin coat.",
            "Recommended for Almora, Bageshwar, Pithoragarh and Ranikhet terraces.",
            "Inoculate seeds with Bradyrhizobium japonicum culture before sowing."
        ],
        "fertilizer_guide": [
            "Basal: 20 kg N + 60 kg P2O5 + 40 kg K2O per hectare.",
            "Apply 20 kg Sulphur per hectare for higher oil and protein content."
        ],
        "disease_management": [
            "Yellow Mosaic Virus (YMV): Transmitted by whitefly; spray Dimethoate 30 EC @ 1.5 ml/L.",
            "Pod blight / Anthracnose: Seed treatment with Trichoderma viride @ 5 g/kg."
        ],
        "icar_gbpuat_note": "ICAR-National Soybean Research Institute (NSRI) & VPKAS certified varieties."
    },
    "Mustard": {
        "hindi_name": "सरसों / तोरिया",
        "category": "Oilseed",
        "primary_season": "Rabi",
        "sowing_window": "October 1 - October 25",
        "harvest_window": "February - March",
        "soil_suitability": ["Alluvial Soil", "Sandy Loam"],
        "npk_ratio": "80:40:40 kg/ha + 20 kg Sulphur",
        "optimal_temp_c": "12°C - 25°C",
        "water_requirement": "Low to medium; 2-3 irrigations (rosette stage and siliqua development)",
        "care_tips": [
            "GSC-6 (canola sarson) offers premium low-erucic acid oil suitable for Udham Singh Nagar (Sitarganj) and Haridwar.",
            "Ensure proper spacing of 30x10 cm by thinning 15-20 days after germination.",
            "Sulphur application is essential for maximizing oil recovery (>40%)."
        ],
        "fertilizer_guide": [
            "Basal: 50% N + 100% P + 100% K + 20 kg elemental Sulphur or Gypsum @ 200 kg/ha.",
            "Top dress: 50% N after first irrigation (30-35 DAS)."
        ],
        "disease_management": [
            "Mustard Aphid (Lipaphis erysimi): Spray Imidacloprid 17.8 SL @ 0.3 ml/L or Thiamethoxam 25 WG @ 0.25 g/L.",
            "White Rust (Albugo candida): Spray Mancozeb 75 WP @ 2.5 g/L."
        ],
        "icar_gbpuat_note": "ICAR-DRMR & GBPUAT recommended oilseed package."
    },
    "Green Peas": {
        "hindi_name": "मटर",
        "category": "Pulse / Cash Vegetable",
        "primary_season": "Rabi",
        "sowing_window": "October - November (Plains), May - June (Off-season high hills)",
        "harvest_window": "December - February (Plains), August - September (Off-season hills)",
        "soil_suitability": ["Sandy Loam", "Brown Hill Soil"],
        "npk_ratio": "30:60:40 kg/ha",
        "optimal_temp_c": "10°C - 20°C (cool weather crop)",
        "water_requirement": "Sensitive to waterlogging; 2-3 light irrigations at flowering and pod filling",
        "care_tips": [
            "Vivek Matar 13 and Vivek Matar 15 bred by ICAR-VPKAS Almora provide early sweet pods with resistance to powdery mildew.",
            "Chakrata (Dehradun), Ramgarh (Nainital) and Tehri produce premium off-season peas that fetch 3x market prices in Delhi-NCR during monsoon.",
            "Treat seeds with Rhizobium leguminosarum culture."
        ],
        "fertilizer_guide": [
            "Apply 10-15 tonnes FYM/ha.",
            "Basal chemical dose: Full dose of 30 kg N + 60 kg P2O5 + 40 kg K2O drilled before sowing."
        ],
        "disease_management": [
            "Powdery Mildew (Erysiphe pisi): Spray Wettable Sulphur @ 3 g/L or Hexaconazole @ 1 ml/L.",
            "Pod Borer: Spray Neem oil 1500 ppm @ 3 ml/L or spinosad 45 SC @ 0.3 ml/L."
        ],
        "icar_gbpuat_note": "ICAR-VPKAS Almora developed Vivek Matar series."
    },
    "Horse Gram (Gahat)": {
        "hindi_name": "गहत / कुलथ",
        "category": "Pulse / Medicinal Hill Crop",
        "primary_season": "Kharif",
        "sowing_window": "June 15 - July 15",
        "harvest_window": "October - November",
        "soil_suitability": ["Brown Hill Soil", "Mountain / Gravelly Soil"],
        "npk_ratio": "20:40:20 kg/ha",
        "optimal_temp_c": "18°C - 30°C",
        "water_requirement": "Minimal; extraordinary drought tolerance",
        "care_tips": [
            "VL Gahat 8 and VL Gahat 15 are improved selections from ICAR-VPKAS Almora for terraced rainfed hill farming.",
            "Traditional medicinal pulse celebrated for dissolving kidney stones and combating winter mountain chill.",
            "Grown as intercrop with Finger Millet (Mandua) in traditional Baranaja multi-cropping system."
        ],
        "fertilizer_guide": [
            "Requires very little synthetic fertilizer; 4-5 tonnes FYM is sufficient.",
            "If soils are depleted, apply 20 kg N and 40 kg P2O5 per ha as basal."
        ],
        "disease_management": [
            "Cercospora Leaf Spot: Spray Mancozeb 75 WP @ 2 g/L.",
            "Pod Borer: Spray NSKE 5% or neem seed extract."
        ],
        "icar_gbpuat_note": "Flagship ICAR Uttarakhand hill crop variety."
    },
    "Apple": {
        "hindi_name": "सेब",
        "category": "Horticulture / Fruit",
        "primary_season": "Whole Year",
        "sowing_window": "December - February (Dormant sapling plantation)",
        "harvest_window": "July - October (depending on elevation)",
        "soil_suitability": ["Brown Hill Soil", "Mountain / Gravelly Soil"],
        "npk_ratio": "700:350:700 g per tree/year (bearing orchard)",
        "optimal_temp_c": "10°C - 24°C (requires 800 - 1200 chill hours <7°C)",
        "water_requirement": "Crucial at fruit set, cell expansion (May-June pre-monsoon drought)",
        "care_tips": [
            "Royal Delicious, Red Delicious, and Golden Delicious thrive in high-altitude orchards (1800-2600m) in Harsil (Uttarkashi), Mukteshwar (Nainital), and Chamoli.",
            "Ensure 15-20% pollinator cultivars (Golden Delicious / Crab Apple) inter-planted in the orchard.",
            "Regular winter pruning (January) maintains sun exposure and spur vitality."
        ],
        "fertilizer_guide": [
            "Apply 40-50 kg FYM per mature tree in December during basin opening.",
            "Apply half N with full P and K in February-March before bud break; remaining half N in May."
        ],
        "disease_management": [
            "Apple Scab (Venturia inaequalis): Protective spray of Mancozeb @ 3 g/L at green tip; Difenoconazole @ 0.5 ml/L at pink bud.",
            "San Jose Scale / Mites: Spray Horticultural Mineral Oil (HMO) @ 2% during dormant winter."
        ],
        "icar_gbpuat_note": "VCSG UUHF Bharsar & ICAR CITH guidelines for Uttarakhand temperate fruit belt."
    },
    "Ginger": {
        "hindi_name": "अदरक",
        "category": "Spice / Cash Crop",
        "primary_season": "Kharif",
        "sowing_window": "April 15 - May 30",
        "harvest_window": "December - February (8-9 months)",
        "soil_suitability": ["Sandy Loam", "Brown Hill Soil"],
        "npk_ratio": "100:50:50 kg/ha",
        "optimal_temp_c": "20°C - 30°C (warm humid valley climate)",
        "water_requirement": "High; requires mulching with green forest leaves to preserve moisture and suppress weeds",
        "care_tips": [
            "Himagiri, Suprabha and Suruchi are certified high-oleoresin, low-fiber varieties suited for Sahaspur (Dehradun) and Narendra Nagar (Tehri).",
            "Plant seed rhizomes (25-30 g) with at least 1-2 good buds at 30x20 cm spacing on raised beds.",
            "Heavy mulching (oak/pine leaves or green twigs) immediately after planting is essential for germination and weed control."
        ],
        "fertilizer_guide": [
            "Apply 25-30 tonnes FYM/ha.",
            "Basal: 1/3 N + Full P & K; Top dress 1/3 N at 45 days, 1/3 N at 90 days with earthing-up."
        ],
        "disease_management": [
            "Rhizome Rot / Soft Rot (Pythium): Dip seed rhizomes in Metalaxyl-Mancozeb (Ridomil MZ) @ 2.5 g/L for 30 mins before planting.",
            "Drench nursery beds if yellowing appears in monsoon."
        ],
        "icar_gbpuat_note": "ICAR-IISR & GBPUAT Pantnagar certified ginger production package."
    },
    "Litchi": {
        "hindi_name": "लीची",
        "category": "Horticulture / Fruit",
        "primary_season": "Whole Year",
        "sowing_window": "July - September (Air layered sapling plantation)",
        "harvest_window": "May 25 - June 20",
        "soil_suitability": ["Alluvial Soil", "Sandy Loam"],
        "npk_ratio": "600:300:600 g per tree/year (mature orchard)",
        "optimal_temp_c": "22°C - 35°C (frost-free sub-tropical valley)",
        "water_requirement": "Very critical during fruit development (April-May) to prevent fruit cracking",
        "care_tips": [
            "Dehradun, Shahi, and China are world-renowned varieties grown in Doon Valley (Premnagar) and Ramnagar (Nainital).",
            "Spray 1% Potassium Nitrate or 0.4% Borax in April to prevent fruit cracking during hot winds.",
            "Bagging of fruit clusters with non-woven bags protects from fruit borer and bats."
        ],
        "fertilizer_guide": [
            "Apply 40 kg FYM per tree in September.",
            "NPK applied in two splits: half in September after monsoon, half in February-March after fruit set."
        ],
        "disease_management": [
            "Litchi Mite (Aceria litchii): Prune affected shoots in July; spray Propargite 57 EC @ 2 ml/L.",
            "Fruit Borer: Spray Emamectin Benzoate 5 SG @ 0.4 g/L 30 days before harvest."
        ],
        "icar_gbpuat_note": "GBPUAT Pantnagar & Dehradun Valley Horticulture Research Center."
    }
}

# 2. Map Excel rows and associate suggested varieties
for idx, row in df_uk_crops.iterrows():
    c_name = row['Crop Name (English)']
    districts_str = row['Top Producing Districts']
    pincodes_str = row['Example PIN Codes']
    varieties_str = row['Suggested Crop Varieties']

    districts = [d.strip() for d in districts_str.split(',') if d.strip()]
    varieties = [v.strip() for v in varieties_str.split(',') if v.strip()]

    # Extract PIN codes
    pincodes = re.findall(r'\b(2\d{5})\b', pincodes_str)

    crop_knowledge[c_name] = {
        'crop_name': c_name,
        'districts': districts,
        'example_pincodes': pincodes,
        'example_pincodes_raw': pincodes_str,
        'suggested_varieties': varieties,
        'suggested_varieties_raw': varieties_str,
        'agronomy': CROP_AGRONOMY.get(c_name, {})
    }

print(f"Constructed knowledge base for {len(crop_knowledge)} crops.")

# 3. Build Augmented Training Dataset across all 13 Uttarakhand Districts & Agro-Climatic Zones
print("\nGenerating synthetic augmented training dataset for Uttarakhand micro-climates...")
records = []
np.random.seed(42)

DISTRICTS = list(set([info['district'] for info in UK_PIN_DIRECTORY.values()]))
SEASONS = ['Kharif', 'Rabi', 'Summer', 'Whole Year']
SOIL_TYPES = ['Alluvial Soil', 'Sandy Loam', 'Clay Loam', 'Brown Hill Soil', 'Mountain / Gravelly Soil']

# Number of samples per crop to ensure balanced, robust training
SAMPLES_PER_CROP = 400

CROP_ALLOWED_SEASONS = {
    "Wheat": ["Rabi"],
    "Paddy / Basmati Rice": ["Kharif"],
    "Sugarcane": ["Whole Year", "Summer"],
    "Finger Millet (Mandua)": ["Kharif"],
    "Barnyard Millet (Jhangora)": ["Kharif"],
    "Maize": ["Kharif", "Summer"],
    "Potato": ["Rabi", "Summer"],
    "Rajma (Kidney Beans)": ["Kharif"],
    "Black Soybean (Bhatt)": ["Kharif"],
    "Mustard": ["Rabi"],
    "Green Peas": ["Rabi", "Summer"],
    "Horse Gram (Gahat)": ["Kharif"],
    "Apple": ["Whole Year", "Rabi"],
    "Ginger": ["Kharif"],
    "Litchi": ["Whole Year", "Summer"],
}

CROP_GEO_CONSTRAINTS = {
    "Wheat": {"min_elev": 150, "max_elev": 1900, "districts": ["Udham Singh Nagar", "Haridwar", "Dehradun", "Nainital", "Pauri Garhwal", "Almora", "Tehri Garhwal"]},
    "Paddy / Basmati Rice": {"min_elev": 150, "max_elev": 1200, "districts": ["Udham Singh Nagar", "Haridwar", "Dehradun", "Nainital", "Pauri Garhwal", "Bageshwar"]},
    "Sugarcane": {"min_elev": 150, "max_elev": 650, "districts": ["Udham Singh Nagar", "Haridwar", "Dehradun"]},
    "Finger Millet (Mandua)": {"min_elev": 600, "max_elev": 2200, "districts": ["Almora", "Pauri Garhwal", "Tehri Garhwal", "Chamoli", "Bageshwar", "Rudraprayag", "Champawat", "Nainital"]},
    "Barnyard Millet (Jhangora)": {"min_elev": 700, "max_elev": 2400, "districts": ["Uttarkashi", "Chamoli", "Rudraprayag", "Tehri Garhwal", "Pauri Garhwal", "Almora", "Pithoragarh"]},
    "Maize": {"min_elev": 200, "max_elev": 1800, "districts": ["Dehradun", "Nainital", "Udham Singh Nagar", "Pauri Garhwal", "Almora", "Tehri Garhwal", "Haridwar"]},
    "Potato": {"min_elev": 200, "max_elev": 2600, "districts": ["Nainital", "Almora", "Dehradun", "Uttarkashi", "Chamoli", "Pithoragarh", "Tehri Garhwal"]},
    "Rajma (Kidney Beans)": {"min_elev": 1200, "max_elev": 2900, "districts": ["Uttarkashi", "Pithoragarh", "Chamoli", "Rudraprayag", "Almora"]},
    "Black Soybean (Bhatt)": {"min_elev": 700, "max_elev": 2100, "districts": ["Almora", "Bageshwar", "Pithoragarh", "Champawat", "Nainital", "Pauri Garhwal"]},
    "Mustard": {"min_elev": 150, "max_elev": 950, "districts": ["Udham Singh Nagar", "Haridwar", "Dehradun", "Nainital"]},
    "Green Peas": {"min_elev": 300, "max_elev": 2500, "districts": ["Dehradun", "Nainital", "Tehri Garhwal", "Almora", "Pauri Garhwal", "Chamoli", "Uttarkashi"]},
    "Horse Gram (Gahat)": {"min_elev": 600, "max_elev": 2000, "districts": ["Almora", "Pauri Garhwal", "Tehri Garhwal", "Bageshwar", "Champawat"]},
    "Apple": {"min_elev": 1600, "max_elev": 2800, "districts": ["Uttarkashi", "Nainital", "Chamoli", "Pithoragarh", "Almora", "Tehri Garhwal", "Rudraprayag"]},
    "Ginger": {"min_elev": 300, "max_elev": 1500, "districts": ["Dehradun", "Tehri Garhwal", "Pauri Garhwal", "Nainital", "Haridwar"]},
    "Litchi": {"min_elev": 200, "max_elev": 900, "districts": ["Dehradun", "Nainital", "Haridwar", "Udham Singh Nagar"]},
}

for crop_name, data in crop_knowledge.items():
    agro = data['agronomy']
    geo = CROP_GEO_CONSTRAINTS.get(crop_name, {})
    allowed_dists = geo.get('districts', DISTRICTS)
    allowed_seasons = CROP_ALLOWED_SEASONS.get(crop_name, ['Kharif'])
    min_elev = geo.get('min_elev', 200)
    max_elev = geo.get('max_elev', 2500)
    suited_soils = agro.get('soil_suitability', ['Brown Hill Soil'])
    
    # Base temperature and rainfall benchmarks for the crop
    if crop_name in ['Wheat', 'Mustard', 'Green Peas', 'Potato']:
        base_temp_range = (10.0, 22.0)
        base_rain_range = (30.0, 90.0)
    elif crop_name in ['Paddy / Basmati Rice', 'Sugarcane', 'Maize']:
        base_temp_range = (24.0, 35.0)
        base_rain_range = (180.0, 420.0)
    elif crop_name in ['Finger Millet (Mandua)', 'Barnyard Millet (Jhangora)', 'Black Soybean (Bhatt)', 'Horse Gram (Gahat)']:
        base_temp_range = (16.0, 28.0)
        base_rain_range = (100.0, 280.0)
    elif crop_name in ['Apple', 'Rajma (Kidney Beans)']:
        base_temp_range = (8.0, 20.0)
        base_rain_range = (70.0, 180.0)
    elif crop_name in ['Ginger', 'Litchi']:
        base_temp_range = (22.0, 32.0)
        base_rain_range = (160.0, 350.0)
    else:
        base_temp_range = (18.0, 28.0)
        base_rain_range = (100.0, 250.0)

    # Base NPK
    if crop_name in ['Wheat', 'Paddy / Basmati Rice', 'Sugarcane', 'Maize']:
        base_n = (80, 140)
        base_p = (40, 70)
        base_k = (40, 60)
        base_ph = (6.0, 7.8)
    elif crop_name in ['Potato', 'Ginger']:
        base_n = (100, 160)
        base_p = (50, 90)
        base_k = (70, 120)
        base_ph = (5.5, 6.8)
    elif crop_name in ['Apple']:
        base_n = (60, 110)
        base_p = (30, 60)
        base_k = (60, 100)
        base_ph = (5.8, 6.8)
    elif crop_name in ['Finger Millet (Mandua)', 'Barnyard Millet (Jhangora)', 'Black Soybean (Bhatt)', 'Horse Gram (Gahat)']:
        base_n = (20, 50)
        base_p = (20, 45)
        base_k = (20, 45)
        base_ph = (5.8, 7.2)
    else:
        base_n = (30, 80)
        base_p = (30, 60)
        base_k = (30, 50)
        base_ph = (6.0, 7.2)

    # Filter pins that match district and elevation bounds
    suitable_pins = [
        pin for pin, info in UK_PIN_DIRECTORY.items()
        if info['district'] in allowed_dists and min_elev <= info['elevation_m'] <= max_elev
    ]
    if not suitable_pins:
        suitable_pins = [pin for pin, info in UK_PIN_DIRECTORY.items() if info['district'] in allowed_dists]
    if not suitable_pins:
        suitable_pins = list(UK_PIN_DIRECTORY.keys())

    for _ in range(SAMPLES_PER_CROP):
        pin = np.random.choice(suitable_pins)
        pin_info = UK_PIN_DIRECTORY[pin]
        chosen_district = pin_info['district']
        elevation = pin_info['elevation_m'] + np.random.randint(-25, 25)
        zone = pin_info['zone']

        # Season is chosen strictly from allowed seasons for this crop
        season = np.random.choice(allowed_seasons)

        # Soil
        if np.random.rand() < 0.8:
            soil = np.random.choice(suited_soils)
        else:
            soil = pin_info['soil']


        # Generate realistic telemetry
        temp = np.random.uniform(base_temp_range[0], base_temp_range[1])
        # Altitude lapse rate: higher elevation reduces temperature
        if elevation > 1000:
            temp = max(5.0, temp - ((elevation - 1000) / 1000.0) * 5.0)

        rain = np.random.uniform(base_rain_range[0], base_rain_range[1])
        if season == 'Kharif':
            rain *= np.random.uniform(1.2, 1.8)
        elif season == 'Rabi':
            rain *= np.random.uniform(0.4, 0.8)

        n_val = np.random.uniform(base_n[0], base_n[1])
        p_val = np.random.uniform(base_p[0], base_p[1])
        k_val = np.random.uniform(base_k[0], base_k[1])
        ph_val = np.random.uniform(base_ph[0], base_ph[1])

        records.append({
            'District': chosen_district,
            'PIN_Code': str(pin),
            'Agro_Zone': zone,
            'Elevation_m': elevation,
            'Season': season,
            'Soil_Type': soil,
            'N': round(n_val, 1),
            'P': round(p_val, 1),
            'K': round(k_val, 1),
            'pH': round(ph_val, 2),
            'Temperature': round(temp, 1),
            'Rainfall': round(rain, 1),
            'Crop': crop_name
        })

df_train = pd.DataFrame(records)
print(f"Generated {len(df_train)} dataset records for {df_train['Crop'].nunique()} Uttarakhand crops.")
print(df_train.head(3))

# 4. Encoders & Features
FEATURE_COLS = ['District', 'PIN_Code', 'Agro_Zone', 'Season', 'Soil_Type', 'Elevation_m', 'N', 'P', 'K', 'pH', 'Temperature', 'Rainfall']
CAT_COLS = ['District', 'PIN_Code', 'Agro_Zone', 'Season', 'Soil_Type']
NUM_COLS = ['Elevation_m', 'N', 'P', 'K', 'pH', 'Temperature', 'Rainfall']

encoders = {}
for col in CAT_COLS:
    le = LabelEncoder()
    df_train[col + '_enc'] = le.fit_transform(df_train[col])
    encoders[col] = le

target_le = LabelEncoder()
df_train['Crop_enc'] = target_le.fit_transform(df_train['Crop'])
encoders['Crop'] = target_le

X_cols = [c + '_enc' for c in CAT_COLS] + NUM_COLS
X = df_train[X_cols]
y = df_train['Crop_enc']

# Train/Test Split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

print(f"\nTraining RandomForestClassifier on {len(X_train)} samples...")
rf_model = RandomForestClassifier(
    n_estimators=250,
    max_depth=16,
    min_samples_split=3,
    class_weight='balanced',
    random_state=42,
    n_jobs=-1
)
rf_model.fit(X_train, y_train)

# Evaluation
y_pred = rf_model.predict(X_test)
probs = rf_model.predict_proba(X_test)

top1 = accuracy_score(y_test, y_pred)
top2 = top_k_accuracy_score(y_test, probs, k=2)
top3 = top_k_accuracy_score(y_test, probs, k=3)
top5 = top_k_accuracy_score(y_test, probs, k=5)

print(f"\nModel Performance on Test Set:")
print(f"  - Top-1 Accuracy: {top1 * 100:.2f}%")
print(f"  - Top-2 Accuracy: {top2 * 100:.2f}%")
print(f"  - Top-3 Accuracy: {top3 * 100:.2f}%")
print(f"  - Top-5 Accuracy: {top5 * 100:.2f}%")

# Feature importances
importances = dict(zip(CAT_COLS + NUM_COLS, [round(float(v), 4) for v in rf_model.feature_importances_]))
print(f"\nFeature Importances: {importances}")

# 5. Save Artifacts
model_file = os.path.join(MODEL_DIR, 'uttarakhand_crop_model.joblib')
encoders_file = os.path.join(MODEL_DIR, 'uttarakhand_crop_encoders.joblib')
metrics_file = os.path.join(MODEL_DIR, 'uttarakhand_crop_metrics.json')
knowledge_file = os.path.join(MODEL_DIR, 'uttarakhand_crop_knowledge.json')

joblib.dump(rf_model, model_file)
joblib.dump(encoders, encoders_file)

metrics_data = {
    'model_name': 'Uttarakhand Crop & Variety Recommendation Engine',
    'trained_on': 'Uttarakhand Agro-Climatic Zones & ICAR-VPKAS Variety Dataset',
    'total_samples': len(df_train),
    'top1_accuracy': round(top1 * 100, 2),
    'top2_accuracy': round(top2 * 100, 2),
    'top3_accuracy': round(top3 * 100, 2),
    'top5_accuracy': round(top5 * 100, 2),
    'crops': list(target_le.classes_),
    'districts': list(encoders['District'].classes_),
    'pincodes': list(encoders['PIN_Code'].classes_),
    'seasons': list(encoders['Season'].classes_),
    'soil_types': list(encoders['Soil_Type'].classes_),
    'feature_importances': importances,
    'pin_directory': UK_PIN_DIRECTORY
}

with open(metrics_file, 'w', encoding='utf-8') as f:
    json.dump(metrics_data, f, indent=2, ensure_ascii=False)

with open(knowledge_file, 'w', encoding='utf-8') as f:
    json.dump(crop_knowledge, f, indent=2, ensure_ascii=False)

print("\n" + "=" * 70)
print("TRAINING COMPLETE & ALL ARTIFACTS SAVED:")
print(f"  1. Model:     {model_file}")
print(f"  2. Encoders:  {encoders_file}")
print(f"  3. Metrics:   {metrics_file}")
print(f"  4. Knowledge: {knowledge_file}")
print("=" * 70)
