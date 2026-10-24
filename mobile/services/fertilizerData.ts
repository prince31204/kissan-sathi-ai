// Auto-generated Fertilizer Crop Knowledge & Benchmarks from trained model (99.55% accuracy)
export interface CropBenchmark {
  ideal_N: number;
  min_N: number;
  max_N: number;
  ideal_P: number;
  min_P: number;
  max_P: number;
  ideal_K: number;
  min_K: number;
  max_K: number;
  ideal_ph: number;
  min_ph: number;
  max_ph: number;
  ideal_rainfall_mm: number;
  ideal_temp_c: number;
  ideal_humidity_pct: number;
}

export interface CropGuide {
  hindi_name: string;
  category: string;
  season: string;
  npk_standard: string;
  fertilizers: { name: string; dosage: string }[];
  organic: string;
  irrigation_advisory: string;
}

export const CROP_BENCHMARKS: Record<string, CropBenchmark> = {
  "apple": {
    "ideal_N": 20.8,
    "min_N": 0.0,
    "max_N": 40.0,
    "ideal_P": 134.2,
    "min_P": 120.0,
    "max_P": 145.0,
    "ideal_K": 199.9,
    "min_K": 195.0,
    "max_K": 205.0,
    "ideal_ph": 5.93,
    "min_ph": 5.51,
    "max_ph": 6.5,
    "ideal_rainfall_mm": 112.7,
    "ideal_temp_c": 22.6,
    "ideal_humidity_pct": 92.3
  },
  "banana": {
    "ideal_N": 100.2,
    "min_N": 80.0,
    "max_N": 120.0,
    "ideal_P": 82.0,
    "min_P": 70.0,
    "max_P": 95.0,
    "ideal_K": 50.0,
    "min_K": 45.0,
    "max_K": 55.0,
    "ideal_ph": 5.98,
    "min_ph": 5.51,
    "max_ph": 6.49,
    "ideal_rainfall_mm": 104.6,
    "ideal_temp_c": 27.4,
    "ideal_humidity_pct": 80.4
  },
  "blackgram": {
    "ideal_N": 40.0,
    "min_N": 20.0,
    "max_N": 60.0,
    "ideal_P": 67.5,
    "min_P": 55.0,
    "max_P": 80.0,
    "ideal_K": 19.2,
    "min_K": 15.0,
    "max_K": 25.0,
    "ideal_ph": 7.13,
    "min_ph": 6.5,
    "max_ph": 7.78,
    "ideal_rainfall_mm": 67.9,
    "ideal_temp_c": 30.0,
    "ideal_humidity_pct": 65.1
  },
  "chickpea": {
    "ideal_N": 40.1,
    "min_N": 20.0,
    "max_N": 60.0,
    "ideal_P": 67.8,
    "min_P": 55.0,
    "max_P": 80.0,
    "ideal_K": 79.9,
    "min_K": 75.0,
    "max_K": 85.0,
    "ideal_ph": 7.34,
    "min_ph": 5.99,
    "max_ph": 8.87,
    "ideal_rainfall_mm": 80.1,
    "ideal_temp_c": 18.9,
    "ideal_humidity_pct": 16.9
  },
  "coconut": {
    "ideal_N": 22.0,
    "min_N": 0.0,
    "max_N": 40.0,
    "ideal_P": 16.9,
    "min_P": 5.0,
    "max_P": 30.0,
    "ideal_K": 30.6,
    "min_K": 25.0,
    "max_K": 35.0,
    "ideal_ph": 5.98,
    "min_ph": 5.5,
    "max_ph": 6.47,
    "ideal_rainfall_mm": 175.7,
    "ideal_temp_c": 27.4,
    "ideal_humidity_pct": 94.8
  },
  "coffee": {
    "ideal_N": 101.2,
    "min_N": 80.0,
    "max_N": 120.0,
    "ideal_P": 28.7,
    "min_P": 15.0,
    "max_P": 40.0,
    "ideal_K": 29.9,
    "min_K": 25.0,
    "max_K": 35.0,
    "ideal_ph": 6.79,
    "min_ph": 6.02,
    "max_ph": 7.49,
    "ideal_rainfall_mm": 158.1,
    "ideal_temp_c": 25.5,
    "ideal_humidity_pct": 58.9
  },
  "cotton": {
    "ideal_N": 117.8,
    "min_N": 100.0,
    "max_N": 140.0,
    "ideal_P": 46.2,
    "min_P": 35.0,
    "max_P": 60.0,
    "ideal_K": 19.6,
    "min_K": 15.0,
    "max_K": 25.0,
    "ideal_ph": 6.91,
    "min_ph": 5.8,
    "max_ph": 7.99,
    "ideal_rainfall_mm": 80.4,
    "ideal_temp_c": 24.0,
    "ideal_humidity_pct": 79.8
  },
  "grapes": {
    "ideal_N": 23.2,
    "min_N": 0.0,
    "max_N": 40.0,
    "ideal_P": 132.5,
    "min_P": 120.0,
    "max_P": 145.0,
    "ideal_K": 200.1,
    "min_K": 195.0,
    "max_K": 205.0,
    "ideal_ph": 6.03,
    "min_ph": 5.51,
    "max_ph": 6.5,
    "ideal_rainfall_mm": 69.6,
    "ideal_temp_c": 23.8,
    "ideal_humidity_pct": 81.9
  },
  "jute": {
    "ideal_N": 78.4,
    "min_N": 60.0,
    "max_N": 100.0,
    "ideal_P": 46.9,
    "min_P": 35.0,
    "max_P": 60.0,
    "ideal_K": 40.0,
    "min_K": 35.0,
    "max_K": 45.0,
    "ideal_ph": 6.73,
    "min_ph": 6.0,
    "max_ph": 7.49,
    "ideal_rainfall_mm": 174.8,
    "ideal_temp_c": 25.0,
    "ideal_humidity_pct": 79.6
  },
  "kidneybeans": {
    "ideal_N": 20.8,
    "min_N": 0.0,
    "max_N": 40.0,
    "ideal_P": 67.5,
    "min_P": 55.0,
    "max_P": 80.0,
    "ideal_K": 20.1,
    "min_K": 15.0,
    "max_K": 25.0,
    "ideal_ph": 5.75,
    "min_ph": 5.5,
    "max_ph": 6.0,
    "ideal_rainfall_mm": 105.9,
    "ideal_temp_c": 20.1,
    "ideal_humidity_pct": 21.6
  },
  "lentil": {
    "ideal_N": 18.8,
    "min_N": 0.0,
    "max_N": 40.0,
    "ideal_P": 68.4,
    "min_P": 55.0,
    "max_P": 80.0,
    "ideal_K": 19.4,
    "min_K": 15.0,
    "max_K": 25.0,
    "ideal_ph": 6.93,
    "min_ph": 5.92,
    "max_ph": 7.84,
    "ideal_rainfall_mm": 45.7,
    "ideal_temp_c": 24.5,
    "ideal_humidity_pct": 64.8
  },
  "maize": {
    "ideal_N": 77.8,
    "min_N": 60.0,
    "max_N": 100.0,
    "ideal_P": 48.4,
    "min_P": 35.0,
    "max_P": 60.0,
    "ideal_K": 19.8,
    "min_K": 15.0,
    "max_K": 25.0,
    "ideal_ph": 6.25,
    "min_ph": 5.51,
    "max_ph": 7.0,
    "ideal_rainfall_mm": 84.8,
    "ideal_temp_c": 22.4,
    "ideal_humidity_pct": 65.1
  },
  "mango": {
    "ideal_N": 20.1,
    "min_N": 0.0,
    "max_N": 40.0,
    "ideal_P": 27.2,
    "min_P": 15.0,
    "max_P": 40.0,
    "ideal_K": 29.9,
    "min_K": 25.0,
    "max_K": 35.0,
    "ideal_ph": 5.77,
    "min_ph": 4.51,
    "max_ph": 6.97,
    "ideal_rainfall_mm": 94.7,
    "ideal_temp_c": 31.2,
    "ideal_humidity_pct": 50.2
  },
  "mothbeans": {
    "ideal_N": 21.4,
    "min_N": 0.0,
    "max_N": 40.0,
    "ideal_P": 48.0,
    "min_P": 35.0,
    "max_P": 60.0,
    "ideal_K": 20.2,
    "min_K": 15.0,
    "max_K": 25.0,
    "ideal_ph": 6.83,
    "min_ph": 3.5,
    "max_ph": 9.94,
    "ideal_rainfall_mm": 51.2,
    "ideal_temp_c": 28.2,
    "ideal_humidity_pct": 53.2
  },
  "mungbean": {
    "ideal_N": 21.0,
    "min_N": 0.0,
    "max_N": 40.0,
    "ideal_P": 47.3,
    "min_P": 35.0,
    "max_P": 60.0,
    "ideal_K": 19.9,
    "min_K": 15.0,
    "max_K": 25.0,
    "ideal_ph": 6.72,
    "min_ph": 6.22,
    "max_ph": 7.2,
    "ideal_rainfall_mm": 48.4,
    "ideal_temp_c": 28.5,
    "ideal_humidity_pct": 85.5
  },
  "muskmelon": {
    "ideal_N": 100.3,
    "min_N": 80.0,
    "max_N": 120.0,
    "ideal_P": 17.7,
    "min_P": 5.0,
    "max_P": 30.0,
    "ideal_K": 50.1,
    "min_K": 45.0,
    "max_K": 55.0,
    "ideal_ph": 6.36,
    "min_ph": 6.0,
    "max_ph": 6.78,
    "ideal_rainfall_mm": 24.7,
    "ideal_temp_c": 28.7,
    "ideal_humidity_pct": 92.3
  },
  "orange": {
    "ideal_N": 19.6,
    "min_N": 0.0,
    "max_N": 40.0,
    "ideal_P": 16.6,
    "min_P": 5.0,
    "max_P": 30.0,
    "ideal_K": 10.0,
    "min_K": 5.0,
    "max_K": 15.0,
    "ideal_ph": 7.02,
    "min_ph": 6.01,
    "max_ph": 8.0,
    "ideal_rainfall_mm": 110.5,
    "ideal_temp_c": 22.8,
    "ideal_humidity_pct": 92.2
  },
  "papaya": {
    "ideal_N": 49.9,
    "min_N": 31.0,
    "max_N": 70.0,
    "ideal_P": 59.0,
    "min_P": 46.0,
    "max_P": 70.0,
    "ideal_K": 50.0,
    "min_K": 45.0,
    "max_K": 55.0,
    "ideal_ph": 6.74,
    "min_ph": 6.5,
    "max_ph": 6.99,
    "ideal_rainfall_mm": 142.6,
    "ideal_temp_c": 33.7,
    "ideal_humidity_pct": 92.4
  },
  "pigeonpeas": {
    "ideal_N": 20.7,
    "min_N": 0.0,
    "max_N": 40.0,
    "ideal_P": 67.7,
    "min_P": 55.0,
    "max_P": 80.0,
    "ideal_K": 20.3,
    "min_K": 15.0,
    "max_K": 25.0,
    "ideal_ph": 5.79,
    "min_ph": 4.55,
    "max_ph": 7.45,
    "ideal_rainfall_mm": 149.5,
    "ideal_temp_c": 27.7,
    "ideal_humidity_pct": 48.1
  },
  "pomegranate": {
    "ideal_N": 18.9,
    "min_N": 0.0,
    "max_N": 40.0,
    "ideal_P": 18.8,
    "min_P": 5.0,
    "max_P": 30.0,
    "ideal_K": 40.2,
    "min_K": 35.0,
    "max_K": 45.0,
    "ideal_ph": 6.43,
    "min_ph": 5.56,
    "max_ph": 7.2,
    "ideal_rainfall_mm": 107.5,
    "ideal_temp_c": 21.8,
    "ideal_humidity_pct": 90.1
  },
  "rice": {
    "ideal_N": 79.9,
    "min_N": 60.0,
    "max_N": 99.0,
    "ideal_P": 47.6,
    "min_P": 35.0,
    "max_P": 60.0,
    "ideal_K": 39.9,
    "min_K": 35.0,
    "max_K": 45.0,
    "ideal_ph": 6.43,
    "min_ph": 5.01,
    "max_ph": 7.87,
    "ideal_rainfall_mm": 236.2,
    "ideal_temp_c": 23.7,
    "ideal_humidity_pct": 82.3
  },
  "watermelon": {
    "ideal_N": 99.4,
    "min_N": 80.0,
    "max_N": 120.0,
    "ideal_P": 17.0,
    "min_P": 5.0,
    "max_P": 30.0,
    "ideal_K": 50.2,
    "min_K": 45.0,
    "max_K": 55.0,
    "ideal_ph": 6.5,
    "min_ph": 6.0,
    "max_ph": 6.96,
    "ideal_rainfall_mm": 50.8,
    "ideal_temp_c": 25.6,
    "ideal_humidity_pct": 85.2
  }
};

export const CROP_GUIDES: Record<string, CropGuide> = {
  "rice": {
    "hindi_name": "धान (चावल)",
    "category": "Cereal",
    "season": "Kharif",
    "npk_standard": "120:60:40 kg/ha",
    "fertilizers": [
      {
        "name": "Neem Coated Urea (N 46%)",
        "dosage": "110-130 kg/acre split into 3 doses (Basal, Tillering, Panicle)"
      },
      {
        "name": "DAP (18:46:0)",
        "dosage": "50 kg/acre as basal dose at last puddling"
      },
      {
        "name": "MOP - Muriate of Potash (K 60%)",
        "dosage": "30-35 kg/acre basal application"
      },
      {
        "name": "Zinc Sulphate (21%)",
        "dosage": "10 kg/acre to prevent Khaira disease"
      }
    ],
    "organic": "Sesbania / Dhaincha green manuring (50-60 days before puddling) or 5 tons FYM/acre.",
    "irrigation_advisory": "Standing water of 2-5 cm during tillering & flowering stages."
  },
  "maize": {
    "hindi_name": "मक्का (भुट्टा)",
    "category": "Cereal",
    "season": "Kharif / Rabi",
    "npk_standard": "120:60:40 kg/ha",
    "fertilizers": [
      {
        "name": "Urea",
        "dosage": "100 kg/acre (1/3 basal, 1/3 knee-high stage, 1/3 tasseling stage)"
      },
      {
        "name": "DAP",
        "dosage": "55 kg/acre basal application"
      },
      {
        "name": "MOP (Potash)",
        "dosage": "25-30 kg/acre basal"
      }
    ],
    "organic": "FYM 4-5 tonnes/acre before sowing + Azotobacter seed treatment.",
    "irrigation_advisory": "Critical stages: knee-high, tasseling, and grain filling."
  },
  "chickpea": {
    "hindi_name": "चना (छोला)",
    "category": "Pulses",
    "season": "Rabi",
    "npk_standard": "20:40:20 kg/ha (Legume fixes own nitrogen)",
    "fertilizers": [
      {
        "name": "DAP",
        "dosage": "40-50 kg/acre at sowing (provides starter N & essential P)"
      },
      {
        "name": "Single Super Phosphate (SSP)",
        "dosage": "100 kg/acre (ideal source for P + Sulphur)"
      },
      {
        "name": "Rhizobium Culture",
        "dosage": "200g per 10kg seed inoculation"
      }
    ],
    "organic": "Trichoderma viride @ 5g/kg seed for wilt protection; 3 tonnes compost/acre.",
    "irrigation_advisory": "Needs dry climate with 1-2 light irrigations (pre-flowering and pod development)."
  },
  "kidneybeans": {
    "hindi_name": "राजमा",
    "category": "Pulses",
    "season": "Rabi / Kharif (Hills)",
    "npk_standard": "90-120:60:40 kg/ha (Weak nodulator, requires higher N than other pulses)",
    "fertilizers": [
      {
        "name": "Urea",
        "dosage": "60-80 kg/acre in 2 split applications"
      },
      {
        "name": "DAP",
        "dosage": "50 kg/acre at sowing"
      },
      {
        "name": "MOP (Potash)",
        "dosage": "25 kg/acre at sowing"
      }
    ],
    "organic": "Well-decomposed vermicompost @ 2 tonnes/acre + PSB (Phosphorus Solubilizing Bacteria).",
    "irrigation_advisory": "Sensitive to waterlogging. Ensure well-drained loamy soil."
  },
  "pigeonpeas": {
    "hindi_name": "अरहर / तूर दाल",
    "category": "Pulses",
    "season": "Kharif",
    "npk_standard": "25:50:25 kg/ha",
    "fertilizers": [
      {
        "name": "DAP",
        "dosage": "45-50 kg/acre as basal dose"
      },
      {
        "name": "MOP",
        "dosage": "20 kg/acre"
      },
      {
        "name": "Sulphur (Bentonite)",
        "dosage": "10 kg/acre for higher protein content"
      }
    ],
    "organic": "Rhizobium + PSB seed coating + 4 tonnes FYM.",
    "irrigation_advisory": "Deep taproot system; drought tolerant; 1 irrigation at pod development if rain fails."
  },
  "mothbeans": {
    "hindi_name": "मोठ दाल",
    "category": "Pulses (Arid)",
    "season": "Kharif",
    "npk_standard": "10:40:10 kg/ha",
    "fertilizers": [
      {
        "name": "DAP",
        "dosage": "30-35 kg/acre basal"
      },
      {
        "name": "SSP",
        "dosage": "60-70 kg/acre"
      }
    ],
    "organic": "Extremely drought hardy. Farmyard manure 2 tonnes/acre.",
    "irrigation_advisory": "Thrives in low rainfall (300-500mm); avoid waterlogging."
  },
  "mungbean": {
    "hindi_name": "मूंग दाल (हरी मूंग)",
    "category": "Pulses",
    "season": "Zaid (Summer) / Kharif",
    "npk_standard": "20:40:20 kg/ha",
    "fertilizers": [
      {
        "name": "DAP",
        "dosage": "35-40 kg/acre at sowing"
      },
      {
        "name": "SSP",
        "dosage": "80 kg/acre (P + 12% Sulphur)"
      }
    ],
    "organic": "Rhizobium leguminosarum inoculation + Jeevamrit spray @ 200L/acre.",
    "irrigation_advisory": "3-4 light irrigations for summer crop, avoiding during peak flowering."
  },
  "blackgram": {
    "hindi_name": "उड़द दाल (काली दाल)",
    "category": "Pulses",
    "season": "Kharif / Summer",
    "npk_standard": "20:40:20 kg/ha",
    "fertilizers": [
      {
        "name": "DAP",
        "dosage": "40 kg/acre at sowing"
      },
      {
        "name": "MOP",
        "dosage": "15-20 kg/acre"
      }
    ],
    "organic": "Compost 3 tonnes/acre + PSB liquid culture.",
    "irrigation_advisory": "Critical at branching and pod filling stages."
  },
  "lentil": {
    "hindi_name": "मसूर दाल",
    "category": "Pulses",
    "season": "Rabi",
    "npk_standard": "20:40:20 kg/ha",
    "fertilizers": [
      {
        "name": "DAP",
        "dosage": "35-40 kg/acre"
      },
      {
        "name": "SSP",
        "dosage": "75 kg/acre"
      }
    ],
    "organic": "Rhizobium seed treatment + 2 tonnes vermicompost/acre.",
    "irrigation_advisory": "Needs 1-2 irrigations at 40-45 days and pod initiation."
  },
  "pomegranate": {
    "hindi_name": "अनार",
    "category": "Fruit Horticulture",
    "season": "Perennial",
    "npk_standard": "250:125:125 g/plant/year for bearing tree",
    "fertilizers": [
      {
        "name": "Urea",
        "dosage": "500g per mature plant in 3 split doses"
      },
      {
        "name": "Single Super Phosphate",
        "dosage": "750g per plant"
      },
      {
        "name": "Muriate of Potash",
        "dosage": "200g per plant"
      },
      {
        "name": "Boron & Zinc foliar spray",
        "dosage": "0.1% Borax during fruit set"
      }
    ],
    "organic": "FYM 20-25 kg per plant + Neem cake 2 kg per plant annually.",
    "irrigation_advisory": "Drip irrigation 20-30 liters/tree alternate days during fruiting."
  },
  "banana": {
    "hindi_name": "केला",
    "category": "Fruit Horticulture",
    "season": "All seasons",
    "npk_standard": "200:60:300 g/plant (High Potassium feeder)",
    "fertilizers": [
      {
        "name": "Urea",
        "dosage": "450g per plant in 4 splits"
      },
      {
        "name": "DAP",
        "dosage": "130g per plant basal"
      },
      {
        "name": "MOP (Potash)",
        "dosage": "500g per plant in 4 splits (essential for bunch weight)"
      }
    ],
    "organic": "FYM 10 kg/plant + Panchagavya foliar spray (3%) monthly.",
    "irrigation_advisory": "High water requirement (drip 15-25 L/day/plant). Keep soil moist."
  },
  "mango": {
    "hindi_name": "आम",
    "category": "Fruit Orchard",
    "season": "Perennial (Summer Harvest)",
    "npk_standard": "500:250:500 g/plant for mature tree (10+ years)",
    "fertilizers": [
      {
        "name": "Urea",
        "dosage": "1 kg per mature tree in July and October"
      },
      {
        "name": "SSP",
        "dosage": "1.5 kg per tree in July"
      },
      {
        "name": "MOP",
        "dosage": "1 kg per tree in July"
      }
    ],
    "organic": "50 kg FYM + 2 kg Bone meal per tree in monsoon basin application.",
    "irrigation_advisory": "Stop irrigation 2 months prior to flowering; resume during marble stage."
  },
  "grapes": {
    "hindi_name": "अंगूर",
    "category": "Fruit Viticulture",
    "season": "Perennial",
    "npk_standard": "300:200:400 kg/ha (Heavy Potash user)",
    "fertilizers": [
      {
        "name": "Urea",
        "dosage": "300 kg/ha split post-pruning"
      },
      {
        "name": "DAP",
        "dosage": "400 kg/ha basal"
      },
      {
        "name": "Sulphate of Potash (0:0:50)",
        "dosage": "400 kg/ha through fertigation"
      }
    ],
    "organic": "Vermicompost 5 tonnes/ha + Seaweed extract fertigation.",
    "irrigation_advisory": "Drip fertigation precisely scheduled; reduce water near harvest for sugar brix."
  },
  "watermelon": {
    "hindi_name": "तरबूज",
    "category": "Cucurbit / Fruit",
    "season": "Zaid / Summer",
    "npk_standard": "80:40:40 kg/ha",
    "fertilizers": [
      {
        "name": "Urea",
        "dosage": "70 kg/acre in 3 splits"
      },
      {
        "name": "DAP",
        "dosage": "40 kg/acre basal"
      },
      {
        "name": "MOP",
        "dosage": "30 kg/acre for fruit sweetness"
      }
    ],
    "organic": "Poultry manure or Vermicompost 2 tonnes/acre.",
    "irrigation_advisory": "Light frequent irrigation on drip with plastic mulch; stop 5 days before harvest."
  },
  "muskmelon": {
    "hindi_name": "खरबूजा",
    "category": "Cucurbit / Fruit",
    "season": "Zaid / Summer",
    "npk_standard": "80:40:40 kg/ha",
    "fertilizers": [
      {
        "name": "Urea",
        "dosage": "65 kg/acre"
      },
      {
        "name": "DAP",
        "dosage": "35 kg/acre"
      },
      {
        "name": "MOP",
        "dosage": "30 kg/acre"
      }
    ],
    "organic": "FYM 4 tonnes/acre in furrows + Neem cake 150 kg/acre.",
    "irrigation_advisory": "Channel or drip irrigation; keep vine beds dry."
  },
  "apple": {
    "hindi_name": "सेब",
    "category": "Temperate Fruit (Hills)",
    "season": "Perennial (Winter Chilling)",
    "npk_standard": "700:350:700 g/tree for bearing orchard",
    "fertilizers": [
      {
        "name": "CAN (Calcium Ammonium Nitrate)",
        "dosage": "1.5 kg/tree in Feb-March"
      },
      {
        "name": "SSP",
        "dosage": "2 kg/tree in Dec-Jan"
      },
      {
        "name": "MOP",
        "dosage": "1.2 kg/tree in Dec-Jan"
      },
      {
        "name": "Boric Acid / Zinc spray",
        "dosage": "Foliar spray at pink bud stage"
      }
    ],
    "organic": "FYM 40-50 kg/tree in winter basin dressing + pine needle mulching.",
    "irrigation_advisory": "Requires 1000-1200 chilling hours; drip irrigation during fruit expansion."
  },
  "orange": {
    "hindi_name": "संतरा (मौसंबी / किन्नू)",
    "category": "Citrus Fruit",
    "season": "Perennial",
    "npk_standard": "600:200:300 g/tree",
    "fertilizers": [
      {
        "name": "Urea",
        "dosage": "1.2 kg/tree in 3 equal parts (Jan, May, Aug)"
      },
      {
        "name": "SSP",
        "dosage": "1.2 kg/tree in Jan"
      },
      {
        "name": "MOP",
        "dosage": "500g/tree in Jan"
      },
      {
        "name": "Micronutrient Citrus mix",
        "dosage": "Zinc + Iron + Manganese foliar spray"
      }
    ],
    "organic": "FYM 25 kg/tree + Trichoderma harzianum soil drenching for root rot protection.",
    "irrigation_advisory": "Ring basin or drip method; avoid direct trunk contact with water."
  },
  "papaya": {
    "hindi_name": "पपीता",
    "category": "Fruit Horticulture",
    "season": "All seasons",
    "npk_standard": "250:250:500 g/plant/year",
    "fertilizers": [
      {
        "name": "Urea",
        "dosage": "50g/plant monthly"
      },
      {
        "name": "DAP",
        "dosage": "50g/plant bimonthly"
      },
      {
        "name": "MOP",
        "dosage": "80g/plant monthly (vital for fruit firm texture)"
      }
    ],
    "organic": "Neem cake 1 kg/plant + Vermicompost 5 kg/plant at planting.",
    "irrigation_advisory": "Highly sensitive to water stagnation (causes collar rot). Use raised beds."
  },
  "coconut": {
    "hindi_name": "नारियल",
    "category": "Plantation",
    "season": "Perennial",
    "npk_standard": "500:320:1200 g/palm/year (Extremely high Potash feeder)",
    "fertilizers": [
      {
        "name": "Urea",
        "dosage": "1.1 kg/palm in two splits (May-June & Sept-Oct)"
      },
      {
        "name": "Rock Phosphate or SSP",
        "dosage": "1.6 kg/palm"
      },
      {
        "name": "MOP",
        "dosage": "2 kg/palm (critical for nut size and copra yield)"
      },
      {
        "name": "Common Salt (NaCl)",
        "dosage": "1 kg/palm in coastal / inland soils"
      }
    ],
    "organic": "50 kg green leaf / compost + Coir pith mulching in palm basin.",
    "irrigation_advisory": "Drip 30-40 L/palm/day; mulching around 2m radius to conserve moisture."
  },
  "cotton": {
    "hindi_name": "कपास (सफेद सोना)",
    "category": "Fiber Cash Crop",
    "season": "Kharif",
    "npk_standard": "120:60:60 kg/ha",
    "fertilizers": [
      {
        "name": "Urea",
        "dosage": "90-100 kg/acre in 3 splits (sowing, square, peak boll)"
      },
      {
        "name": "DAP",
        "dosage": "50 kg/acre basal"
      },
      {
        "name": "MOP",
        "dosage": "40 kg/acre for fiber strength"
      },
      {
        "name": "Magnesium Sulphate",
        "dosage": "10 kg/acre to prevent red leaf disease"
      }
    ],
    "organic": "FYM 5 tonnes/acre + Castor cake 200 kg/acre.",
    "irrigation_advisory": "4-5 irrigations; avoid water stress during flowering and boll development."
  },
  "jute": {
    "hindi_name": "पटसन / जूट",
    "category": "Fiber Crop",
    "season": "Kharif",
    "npk_standard": "60:30:30 kg/ha",
    "fertilizers": [
      {
        "name": "Urea",
        "dosage": "50 kg/acre in 2 splits (basal & 3 weeks after sowing)"
      },
      {
        "name": "SSP",
        "dosage": "75 kg/acre"
      },
      {
        "name": "MOP",
        "dosage": "20 kg/acre"
      }
    ],
    "organic": "Green manuring or FYM 3 tonnes/acre.",
    "irrigation_advisory": "Requires high rainfall (150-250cm) and high humidity (70-90%)."
  },
  "coffee": {
    "hindi_name": "कॉफ़ी (कहवा)",
    "category": "Plantation Cash Crop",
    "season": "Perennial (Shade Grown)",
    "npk_standard": "140:90:140 kg/ha (Arabica), 120:90:120 kg/ha (Robusta)",
    "fertilizers": [
      {
        "name": "Complex 17:17:17",
        "dosage": "150 kg/acre pre-monsoon & post-monsoon"
      },
      {
        "name": "Urea",
        "dosage": "40 kg/acre top dressing"
      },
      {
        "name": "MOP",
        "dosage": "30 kg/acre post-harvest"
      }
    ],
    "organic": "Coffee pulp compost 3 tonnes/acre + Shade tree leaf litter.",
    "irrigation_advisory": "Blossom shower irrigation in March-April (25-30mm) followed by backing shower."
  }
};
