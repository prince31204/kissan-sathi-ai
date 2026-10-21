# KisanSaathi AI - ML Backend & Agricultural Models

This module powers the AI prediction engines for KisanSaathi AI:
1. **Smart Irrigation Engine**
2. **Farm Carbon Footprint & Tractor Diesel Emission Engine**
3. **Crop Waste Management & Residue-to-Wealth Engine**

---

## 1. Smart Irrigation AI Model (`datasets/smart-irrigation/`)
- **Trained on**:
  - `sm_Uttarakhand_2020.csv` (3,224 field measurements of soil moisture at 15cm)
  - `rainfall_weather_uttarakhand_2020.csv` (meteorological daily rainfall, temp, relative humidity, and ET0)
  - `smart_irrigation_combined_dataset.csv` (25,792 sample agricultural ground-truth dataset)
- **Performance**:
  - **Classifier Accuracy: 99.83%** (Decision: Irrigation Needed Yes/No)
  - **Water Regressor $R^2$: 0.9944** (Water volume in Liters)
  - **Duration Regressor $R^2$: 0.9870** (Pump run hours)
- **Single Irrigation Calibration**: Calibrated to ICAR / FAO-56 single-event depth (30-60mm), and 1 Acre = 5 Bigha for Uttarakhand/North India.

---

## 2. Carbon Footprint & Tractor Diesel Emission Model (`datasets/carbon-emission/`)
- **Trained on**:
  - `Kakraliya et al Scientific Reports 2022.xlsx` (Energy, GHG emissions, diesel consumption, fertilizer, and crop yields)
  - `result.csv` (FAOSTAT Tier-1 & Tier-2 agricultural emission factors)
  - `n2o_ch4.csv` (field-measured N2O and CH4 fluxes under continuous vs intermittent flooding)
  - `carbon_emission_training_dataset.csv` (15,000 diverse Indian farm profiles)
- **Performance**:
  - **Total Emission Regressor $R^2$: 0.9978** (MAE: 155 kg CO2e)
  - **Eco-Rating Classifier Accuracy: 89.53%**
  - **Direct Tractor Diesel Integration**: 3.0 kg CO2e per Litre of diesel.

---

## 3. Crop Waste Management & Stubble Pollution Model
- **Trained on**:
  - `District_level_DryMatterBurned/` (Kharif, Rabi, Summer, Autumn, Winter dry matter waste by district across India)
  - `District_level_Emissions/CO2eq/` (CO2eq emitted from burning crop residues)
  - `District_level_AgriculturalBurnedArea/` (Burned area hectares)
  - `crop_waste_management_dataset.csv` (18,000 national farm waste profiles)
- **Features Analyzed**:
  - `Crop` (Rice/Paddy, Wheat, Sugarcane, Maize, Cotton, Groundnut, Mustard)
  - `FieldSize_Acres` (Bigha / Acre / Hectare)
  - `Season` (Kharif, Rabi, Zaid/Summer)
  - `State` (Punjab, Haryana, Uttar Pradesh, Uttarakhand, MP, Rajasthan, etc.)
  - `GrainYield_Quintals_Acre`
- **Performance**:
  - **Waste Generation Regressor $R^2$: 0.9996** (Tonnes of biomass/stubble produced)
  - **Burning CO2e Regressor $R^2$: 0.9996** (Emissions and PM2.5 smoke hazard if burned)
  - **Wealth Potential Regressor $R^2$: 0.9997** (Income from biomass pellets, compost savings, and carbon credits)

---

## 4. How to Run the ML Backend
Start the server in the `ml_backend` directory:
```bash
python ml_backend/app.py
```
Default port: `http://localhost:5000`

### API Endpoints:
- `POST /api/predict-irrigation`: Real-time weather-integrated irrigation calculation.
- `POST /api/predict-emission`: Complete carbon footprint assessment with tractor diesel.
- `POST /api/predict-waste`: Crop waste prediction, burning pollution, and 4 circular wealth solutions.
- `GET /api/waste/options`: Supported crops, seasons, and states.
- `POST /api/predict-crop`: Crop recommendation based on soil NPK, pH, and climate.
- `GET /api/live-weather`: Real-time meteorological data.

---

## 5. Retraining Models
- Retrain Irrigation: `python ml_backend/train_irrigation_model.py`
- Retrain Carbon Emissions: `python ml_backend/train_emission_model.py`
- Retrain Waste Management: `python ml_backend/train_waste_model.py`
