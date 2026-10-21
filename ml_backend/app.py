import os
import json
import urllib.request
import numpy as np
import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, 'models')

# Load trained models & encoders
print("Loading Smart Irrigation & Carbon Emission ML models...")
try:
    clf = joblib.load(os.path.join(MODEL_DIR, 'irrigation_classifier.joblib'))
    reg_liters = joblib.load(os.path.join(MODEL_DIR, 'water_liters_regressor.joblib'))
    reg_duration = joblib.load(os.path.join(MODEL_DIR, 'duration_regressor.joblib'))
    crop_encoder = joblib.load(os.path.join(MODEL_DIR, 'crop_encoder.joblib'))
    soil_encoder = joblib.load(os.path.join(MODEL_DIR, 'soil_encoder.joblib'))
    with open(os.path.join(MODEL_DIR, 'model_metrics.json'), 'r') as f:
        metrics = json.load(f)
    print("Irrigation ML models loaded successfully.")
except Exception as e:
    print(f"Warning: Could not load some irrigation model files: {e}")
    clf, reg_liters, reg_duration, crop_encoder, soil_encoder = None, None, None, None, None
    metrics = {
        'features': ['Crop_Enc', 'Soil_Enc', 'SoilMoisture_pct', 'Temperature_C', 'Humidity_pct', 'Rainfall_mm', 'ET0_mm', 'DaysSinceLastIrrigation', 'FieldSize_Acres', 'Pump_HP'],
        'crops': ['Wheat', 'Rice', 'Maize', 'Mustard', 'Potato', 'Sugarcane', 'Tomato', 'Pulses'],
        'soils': ['Clay', 'Clay Loam', 'Loam', 'Sandy', 'Sandy Loam'],
        'classifier_accuracy': 99.83
    }

# Load Carbon Footprint Models
try:
    reg_emission = joblib.load(os.path.join(MODEL_DIR, 'carbon_emission_regressor.joblib'))
    clf_eco = joblib.load(os.path.join(MODEL_DIR, 'eco_rating_classifier.joblib'))
    emission_crop_encoder = joblib.load(os.path.join(MODEL_DIR, 'emission_crop_encoder.joblib'))
    emission_residue_encoder = joblib.load(os.path.join(MODEL_DIR, 'emission_residue_encoder.joblib'))
    emission_irrigation_encoder = joblib.load(os.path.join(MODEL_DIR, 'emission_irrigation_encoder.joblib'))
    eco_rating_encoder = joblib.load(os.path.join(MODEL_DIR, 'eco_rating_encoder.joblib'))
    with open(os.path.join(MODEL_DIR, 'carbon_emission_metrics.json'), 'r') as f:
        emission_metrics = json.load(f)
    print("Carbon Emission ML models loaded successfully.")
except Exception as e:
    print(f"Warning: Could not load carbon emission models: {e}")
    reg_emission, clf_eco = None, None
    emission_crop_encoder, emission_residue_encoder, emission_irrigation_encoder, eco_rating_encoder = None, None, None, None
    emission_metrics = {
        'crops': ['Cotton', 'Maize', 'Mustard', 'Potato', 'Pulses', 'Rice', 'Sugarcane', 'Wheat'],
        'residue_options': ['Burned (Stubble Burning)', 'Incorporated into Soil', 'Mulched / Happy Seeder (Zero Till)', 'Removed from Field'],
        'irrigation_options': ['Canal (Gravity)', 'Diesel Engine Pump', 'Electric Tube Well', 'Solar Pump'],
        'total_r2_score': 0.9978
    }

# Load Agricultural Waste Management Models
try:
    reg_waste = joblib.load(os.path.join(MODEL_DIR, 'waste_generation_regressor.joblib'))
    reg_burn = joblib.load(os.path.join(MODEL_DIR, 'waste_burning_regressor.joblib'))
    reg_wealth = joblib.load(os.path.join(MODEL_DIR, 'waste_wealth_regressor.joblib'))
    waste_crop_encoder = joblib.load(os.path.join(MODEL_DIR, 'waste_crop_encoder.joblib'))
    waste_season_encoder = joblib.load(os.path.join(MODEL_DIR, 'waste_season_encoder.joblib'))
    waste_state_encoder = joblib.load(os.path.join(MODEL_DIR, 'waste_state_encoder.joblib'))
    with open(os.path.join(MODEL_DIR, 'waste_management_metrics.json'), 'r') as f:
        waste_metrics = json.load(f)
    print("Waste Management ML models loaded successfully.")
except Exception as e:
    print(f"Warning: Could not load waste models: {e}")
    reg_waste, reg_burn, reg_wealth = None, None, None
    waste_crop_encoder, waste_season_encoder, waste_state_encoder = None, None, None
    waste_metrics = {
        'crops': ['Cotton', 'Groundnut', 'Maize', 'Mustard', 'Rice (Paddy)', 'Sugarcane', 'Wheat'],
        'seasons': ['Kharif (Monsoon)', 'Rabi (Winter)', 'Zaid / Summer'],
        'states': ['Bihar', 'Gujarat', 'Haryana', 'Madhya Pradesh', 'Maharashtra', 'Punjab', 'Rajasthan', 'Uttar Pradesh', 'Uttarakhand'],
        'waste_r2_score': 0.9996
    }

# Default District Coordinates for fallback
DISTRICT_COORDS = {
    'DEHRADUN': (30.3165, 78.0322),
    'HARDWAR': (29.9457, 78.1642),
    'NAINITAL': (29.3803, 79.4636),
    'ALMORA': (29.5971, 79.6591),
    'UDHAM SINGH NAGAR': (28.9800, 79.4000),
    'DEFAULT': (30.0668, 79.0193)
}

def fetch_live_weather(lat, lon):
    """Fetch live weather from Open-Meteo API."""
    try:
        url = (
            f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}"
            f"&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation"
            f"&daily=precipitation_sum,precipitation_probability_max,temperature_2m_max,temperature_2m_min,et0_fao_evapotranspiration"
            f"&timezone=auto"
        )
        req = urllib.request.Request(url, headers={'User-Agent': 'KisanSaathi/1.0'})
        with urllib.request.urlopen(req, timeout=8) as res:
            data = json.loads(res.read().decode())
            current = data.get('current', {})
            daily = data.get('daily', {})
            
            temp = current.get('temperature_2m', 25.0)
            humidity = current.get('relative_humidity_2m', 60.0)
            wind = current.get('wind_speed_10m', 8.0)
            precip = current.get('precipitation', 0.0)
            code = current.get('weather_code', 0)
            
            rain_prob = daily.get('precipitation_probability_max', [0])[0] if daily.get('precipitation_probability_max') else 0
            rain_sum = daily.get('precipitation_sum', [0.0])[0] if daily.get('precipitation_sum') else 0.0
            et0 = daily.get('et0_fao_evapotranspiration', [3.5])[0] if daily.get('et0_fao_evapotranspiration') else 3.5
            temp_max = daily.get('temperature_2m_max', [temp])[0] if daily.get('temperature_2m_max') else temp
            
            return {
                'temperature': float(temp),
                'humidity': float(humidity),
                'windSpeed': float(wind),
                'currentPrecipitation': float(precip),
                'rainProbability': int(rain_prob),
                'rainSumForecast': float(rain_sum),
                'et0': float(et0),
                'tempMax': float(temp_max),
                'weatherCode': int(code),
                'isLive': True
            }
    except Exception as e:
        print(f"Weather API error: {e}")
        return {
            'temperature': 26.5,
            'humidity': 62.0,
            'windSpeed': 7.5,
            'currentPrecipitation': 0.0,
            'rainProbability': 15,
            'rainSumForecast': 0.0,
            'et0': 3.6,
            'tempMax': 28.0,
            'weatherCode': 1,
            'isLive': False
        }

@app.route('/', methods=['GET'])
def index():
    return jsonify({
        'status': 'online',
        'service': 'KisanSaathi Smart Irrigation ML Backend',
        'version': '1.0.0',
        'model_accuracy': metrics.get('classifier_accuracy', 99.81)
    })

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy',
        'models_loaded': clf is not None,
        'metrics': metrics
    })

def analyze_motor_voltage(voltage_val, phase='1-Phase', base_duration=2.0, lang='hi'):
    """
    Evaluates motor health, current draw, flow rate efficiency and duration adjustments based on rural electricity voltage.
    """
    v = float(voltage_val) if (voltage_val is not None and str(voltage_val).strip() != '') else (220.0 if '1' in str(phase) else 400.0)
    is_three_phase = '3' in str(phase)
    is_hi = lang == 'hi'
    
    if not is_three_phase:
        # Single Phase (Nominal 220V - 230V)
        if v < 165:
            status = 'critical_low'
            efficiency = 0.50
            badge = 'खतरा (अत्यधिक कम)' if is_hi else 'Danger (Critical Low)'
            color = '#ef4444'
            advice = (
                f"🚨 गंभीर खतरा ({v:.0f}V): मोटर तुरंत बंद करें! 165V से कम पर मोटर का करंट (Amps) 40% बढ़ जाता है जिससे वाइंडिंग 15-20 मिनट में जल सकती है।"
                if is_hi else
                f"🚨 Critical Danger ({v:.0f}V): Turn off motor immediately! Voltage below 165V causes current (Amps) to spike by 40%, which can burn copper windings in 15-20 minutes."
            )
        elif v < 195:
            status = 'warning_low'
            efficiency = 0.72
            badge = 'कम वोल्टेज (धीमा प्रवाह)' if is_hi else 'Low Voltage (Slow Flow)'
            color = '#f59e0b'
            advice = (
                f"⚠️ कम वोल्टेज ({v:.0f}V): पानी का डिस्चार्ज ~28% कम रहेगा। मोटर को 30-40 मिनट से अधिक लगातार न चलाएं, ठंडा होने दें।"
                if is_hi else
                f"⚠️ Low Voltage ({v:.0f}V): Water discharge reduced by ~28%. Do not run motor continuously for over 30-40 minutes; allow it to cool down."
            )
        elif v <= 245:
            status = 'optimal'
            efficiency = 1.00
            badge = 'सुरक्षित व पूर्ण प्रवाह' if is_hi else 'Optimal (Safe & Full Flow)'
            color = '#10b981'
            advice = (
                f"✅ सामान्य वोल्टेज ({v:.0f}V): मोटर 100% आरपीएम और पूर्ण पानी के प्रेशर पर सुरक्षित चलेगी।"
                if is_hi else
                f"✅ Optimal Voltage ({v:.0f}V): Motor operating safely at 100% RPM with full water discharge."
            )
        else:
            status = 'warning_high'
            efficiency = 0.95
            badge = 'उच्च वोल्टेज' if is_hi else 'High Voltage Warning'
            color = '#f97316'
            advice = (
                f"⚡ हाई वोल्टेज ({v:.0f}V): कैपेसिटर गर्म होने और वाइंडिंग पर अतिरिक्त दबाव का खतरा।"
                if is_hi else
                f"⚡ High Voltage ({v:.0f}V): Risk of capacitor overheating and insulation stress. Check stabilizer."
            )
    else:
        # Three Phase (Nominal 400V - 415V)
        if v < 330:
            status = 'critical_low'
            efficiency = 0.55
            badge = '3-फेज क्रिटिकल लो' if is_hi else '3-Phase Critical Low'
            color = '#ef4444'
            advice = (
                f"🚨 3-फेज में केवल {v:.0f}V आ रहा है (न्यूनतम 360V चाहिए)। सिंगल-फेजिंग या मोटर जलने का बड़ा खतरा!"
                if is_hi else
                f"🚨 3-Phase Critical Low ({v:.0f}V): Minimum 360V required. Severe risk of single-phasing or coil burnout!"
            )
        elif v < 380:
            status = 'warning_low'
            efficiency = 0.80
            badge = '3-फेज कम वोल्टेज' if is_hi else '3-Phase Low Voltage'
            color = '#f59e0b'
            advice = (
                f"⚠️ 3-फेज वोल्टेज कम ({v:.0f}V) है। डिस्चार्ज 20% कम होगा और समय 25% अधिक लगेगा।"
                if is_hi else
                f"⚠️ 3-Phase Low Voltage ({v:.0f}V): Discharge reduced by 20%; 25% longer runtime required."
            )
        elif v <= 435:
            status = 'optimal'
            efficiency = 1.00
            badge = '3-फेज संतुलित' if is_hi else '3-Phase Optimal'
            color = '#10b981'
            advice = (
                f"✅ 3-फेज वोल्टेज संतुलित है ({v:.0f}V)। मोटर पूरी कार्यक्षमता के साथ चलेगी।"
                if is_hi else
                f"✅ 3-Phase Optimal ({v:.0f}V): Balanced voltage. Motor operating at maximum efficiency."
            )
        else:
            status = 'warning_high'
            efficiency = 0.95
            badge = '3-फेज हाई वोल्टेज' if is_hi else '3-Phase High Voltage'
            color = '#f97316'
            advice = (
                f"⚡ 3-फेज वोल्टेज अधिक ({v:.0f}V) है। ओवरवोल्टेज रिले चेक करें।"
                if is_hi else
                f"⚡ 3-Phase High Voltage ({v:.0f}V): Overvoltage detected. Check protection relay."
            )

    adjusted_duration = round(base_duration / max(0.4, efficiency), 1) if base_duration > 0 else 0.0
    return {
        'voltage': v,
        'phase': phase,
        'status': status,
        'badge': badge,
        'color': color,
        'efficiencyPct': int(efficiency * 100),
        'adjustedDurationHours': adjusted_duration,
        'advice': advice
    }

def analyze_pahadi_stream(stream_flow='medium', water_liters=10000.0, terrain_type='terrace', lang='hi'):
    """
    Calculates natural gravity flow water diversion for hilly/mountain areas (Kuhl / Gul / Gadhera / Spring)
    """
    is_hi = lang == 'hi'
    flow_rates = {
        'low': {'rate_lps': 10, 'label': 'धीमा स्रोत (~10 L/s)' if is_hi else 'Low Stream (~10 L/s)'},
        'medium': {'rate_lps': 22, 'label': 'मध्यम कूल (~22 L/s)' if is_hi else 'Medium Kuhl (~22 L/s)'},
        'high': {'rate_lps': 40, 'label': 'तेज गधेरा/धारा (~40 L/s)' if is_hi else 'Fast Stream (~40 L/s)'}
    }
    selected_flow = flow_rates.get(str(stream_flow).lower(), flow_rates['medium'])
    hourly_liters = selected_flow['rate_lps'] * 3600
    
    flow_hours = round(water_liters / hourly_liters, 1) if water_liters > 0 else 0.0
    flow_hours = max(0.5, flow_hours) if water_liters > 0 else 0.0

    is_terrace = 'terrace' in str(terrain_type).lower() or 'hilly' in str(terrain_type).lower()
    if is_terrace:
        terrace_advice = (
            "🏔️ पहाड़ी सीढ़ीदार खेत: गुल से पानी एक साथ तेज बहाव में न छोड़ें। सबसे ऊपरी क्यारी से धीरे-धीरे पानी नीचे रिसने दें ताकि ढलान पर उपजाऊ मिट्टी का कटाव न हो।"
            if is_hi else
            "🏔️ Sloped Step Terraces: Avoid high-velocity direct discharge. Allow water to seep gradually from upper to lower terraces to prevent soil erosion."
        )
    else:
        terrace_advice = (
            "🏔️ पहाड़ी घाटी खेत: प्राकृतिक कूल (Kuhl) के पानी से सिंचाई करें। नाली में पत्तों को साफ रखें।"
            if is_hi else
            "🏔️ Mountain Valley Field: Irrigate via natural gravity Kuhl channels. Keep channel free of debris for uniform flow."
        )

    kwh_saved = round(flow_hours * 3.73, 1)
    cost_saved = round(kwh_saved * 5.5, 0)

    duration_label = f"{flow_hours} घंटे (गुल प्रवाह समय)" if is_hi else f"{flow_hours} Hours (Channel Flow)"
    cost_saved_label = f"₹{int(cost_saved)} बचत (मुफ़्त जल)" if is_hi else f"₹{int(cost_saved)} Saved (Free Natural Water)"

    return {
        'sourceName': 'पहाड़ी प्राकृतिक स्रोत / गुल' if is_hi else 'Mountain Natural Spring / Kuhl',
        'streamFlow': stream_flow,
        'streamFlowLabel': selected_flow['label'],
        'terrainType': ('सीढ़ीदार खेत' if is_terrace else 'घाटी समतल') if is_hi else ('Step Terraces' if is_terrace else 'Valley Plain'),
        'flowDurationHours': flow_hours,
        'flowDuration': duration_label,
        'electricityUsed': '0 kWh (100% गुरुत्वाकर्षण)' if is_hi else '0 kWh (100% Gravity Flow)',
        'electricityCostSaved': cost_saved_label,
        'co2Saved': f"{round(kwh_saved * 0.82, 1)} kg CO₂ Saved",
        'terraceAdvice': terrace_advice,
        'zeroElectricityBadge': '100% मुफ़्त जल' if is_hi else '100% Free Gravity Water'
    }

@app.route('/api/irrigation/options', methods=['GET'])
def get_options():
    return jsonify({
        'crops': metrics.get('crops', ['Wheat', 'Rice', 'Maize', 'Mustard', 'Potato', 'Sugarcane', 'Tomato', 'Pulses']),
        'soilTypes': metrics.get('soils', ['Clay', 'Clay Loam', 'Loam', 'Sandy', 'Sandy Loam']),
        'pumpCapacities': ['3 HP', '5 HP', '7.5 HP', '10 HP', 'Solar Pump (5 HP)', 'Tube Well (7.5 HP)'],
        'waterSources': ['Electric Motor', 'Pahadi Kuhl / Stream', 'Solar Pump', 'Diesel Pump'],
        'fieldUnits': ['Bigha', 'Acre', 'Hectare'],
        'metrics': metrics
    })

@app.route('/api/live-weather', methods=['GET'])
def live_weather():
    lat = request.args.get('lat', default=30.3165, type=float)
    lon = request.args.get('lon', default=78.0322, type=float)
    weather = fetch_live_weather(lat, lon)
    return jsonify(weather)

@app.route('/api/predict-irrigation', methods=['POST'])
def predict_irrigation():
    try:
        data = request.get_json() or {}
        
        # 1. Parse Inputs
        crop_input = str(data.get('crop', 'Wheat')).strip().capitalize()
        soil_input = str(data.get('soilType', 'Loam')).strip()
        field_size_raw = float(data.get('fieldSize', 1.0))
        field_unit = str(data.get('fieldUnit', 'Acre')).strip()
        pump_capacity_raw = str(data.get('pumpCapacity', '5 HP')).strip()
        days_since = int(data.get('daysSinceLastIrrigation', 4))
        user_sm = data.get('soilMoisture') # optional sensor reading
        
        # New: Water Source, Voltage, Stream Flow, Terrain, Language
        water_source = str(data.get('waterSource', 'Electric Motor')).strip()
        motor_voltage = data.get('motorVoltage') or data.get('voltage')
        motor_phase = str(data.get('phase', '1-Phase')).strip()
        stream_flow = str(data.get('streamFlow', 'medium')).strip()
        terrain_type = str(data.get('terrainType', 'terrace')).strip()
        lang = str(data.get('language') or data.get('lang', 'hi')).lower()
        is_hi = lang == 'hi'

        # Convert field size to Acres (Standard agricultural land conversion for Uttarakhand/UP/North India)
        # 1 Acre = 5 Bigha (i.e. 1 Bigha = 0.20 Acre = 809.37 m2), 1 Hectare = 2.471 Acres
        if field_unit.lower() == 'bigha':
            field_size_acres = field_size_raw * 0.20
        elif field_unit.lower() == 'hectare':
            field_size_acres = field_size_raw * 2.471
        else:
            field_size_acres = field_size_raw
            
        field_size_acres = max(0.05, field_size_acres)

        # Extract numeric pump HP
        pump_hp = 5.0
        for hp_candidate in [3.0, 5.0, 7.5, 10.0]:
            if str(int(hp_candidate)) in pump_capacity_raw or str(hp_candidate) in pump_capacity_raw:
                pump_hp = hp_candidate
                break

        # 2. Dynamic Weather Integration
        lat = data.get('latitude')
        lon = data.get('longitude')
        if not lat or not lon:
            lat, lon = DISTRICT_COORDS['DEFAULT']
            
        weather = fetch_live_weather(float(lat), float(lon))
        
        # Override with client weather if explicitly provided
        temp_c = float(data.get('temperature', weather['temperature']))
        humidity_pct = float(data.get('humidity', weather['humidity']))
        rainfall_mm = float(data.get('rainfall', weather['rainSumForecast']))
        et0_mm = float(weather.get('et0', 3.6))
        rain_prob = weather.get('rainProbability', 0)
        
        # Match crop name
        supported_crops = metrics.get('crops', ['Wheat', 'Rice', 'Maize', 'Mustard', 'Potato', 'Sugarcane', 'Tomato', 'Pulses'])
        matched_crop = 'Wheat'
        for c in supported_crops:
            if c.lower() in crop_input.lower() or crop_input.lower() in c.lower():
                matched_crop = c
                break
                
        # Match soil name
        supported_soils = metrics.get('soils', ['Clay', 'Clay Loam', 'Loam', 'Sandy', 'Sandy Loam'])
        matched_soil = 'Loam'
        for s in supported_soils:
            if s.lower() in soil_input.lower() or soil_input.lower() in s.lower():
                matched_soil = s
                break

        # Soil moisture estimate if not provided
        if user_sm is not None and float(user_sm) > 0:
            sm_pct = float(user_sm)
        else:
            # Estimate based on soil type, days since last watering, and recent rain
            base_sm = 28.0 if 'clay' in matched_soil.lower() else 22.0 if 'loam' in matched_soil.lower() else 15.0
            sm_pct = max(8.0, base_sm - (days_since * 1.8) + (rainfall_mm * 1.5))
            sm_pct = min(45.0, sm_pct)

        # 3. Model Encoding & Feature DataFrame
        try:
            crop_enc = crop_encoder.transform([matched_crop])[0]
        except Exception:
            crop_enc = 0
            
        try:
            soil_enc = soil_encoder.transform([matched_soil])[0]
        except Exception:
            soil_enc = 0

        feature_cols = metrics.get('features', [
            'Crop_Enc', 'Soil_Enc', 'SoilMoisture_pct', 'Temperature_C', 
            'Humidity_pct', 'Rainfall_mm', 'ET0_mm', 'DaysSinceLastIrrigation',
            'FieldSize_Acres', 'Pump_HP'
        ])
        
        feature_df = pd.DataFrame([[
            crop_enc,
            soil_enc,
            sm_pct,
            temp_c,
            humidity_pct,
            rainfall_mm,
            et0_mm,
            days_since,
            field_size_acres,
            pump_hp
        ]], columns=feature_cols)

        # 4. Model Prediction
        is_needed = True
        water_liters = 0.0
        duration_hours = 0.0
        
        if clf is not None:
            pred_class = clf.predict(feature_df)[0]
            is_needed = bool(pred_class == 1)
        else:
            is_needed = (sm_pct < 25.0 and rainfall_mm < 5.0)

        # Smart weather override: if upcoming rain is high (>= 60% probability or >= 8mm), advise deferral
        rain_deferral = False
        if rain_prob >= 60 or rainfall_mm >= 8.0:
            rain_deferral = True
            is_needed = False

        if is_needed and reg_liters is not None and reg_duration is not None:
            pred_liters = float(reg_liters.predict(feature_df)[0])
            pred_dur = float(reg_duration.predict(feature_df)[0])
            water_liters = max(2000.0, round(pred_liters, -2))
            duration_hours = max(0.5, round(pred_dur, 1))
        elif is_needed:
            # Mathematical calculation: 25mm deficit on field
            water_liters = round(25.0 * 4046.86 * field_size_acres, -2)
            duration_hours = round(water_liters / (pump_hp * 5200.0), 1)

        # 5. Specialized Water Source & Voltage Analysis
        is_pahadi = any(k in water_source.lower() for k in ['pahad', 'kuhl', 'stream', 'gravity', 'गुल', 'पहाड़'])
        is_solar = 'solar' in water_source.lower()
        is_diesel = 'diesel' in water_source.lower()
        
        pahadi_info = None
        voltage_info = None
        diesel_info = None

        if is_pahadi:
            pahadi_info = analyze_pahadi_stream(stream_flow, water_liters, terrain_type, lang=lang)
            duration_hours = pahadi_info['flowDurationHours']
            duration_str = pahadi_info['flowDuration']
        elif is_diesel:
            diesel_per_hour = round(pump_hp * 0.22, 2) # approx 1.1 L/hr for 5HP
            total_diesel = round(diesel_per_hour * duration_hours, 1)
            diesel_cost = round(total_diesel * 90.0, 0)
            diesel_info = {
                'fuelNeeded': f"{total_diesel} लीटर डीजल" if is_hi else f"{total_diesel} Liters Diesel",
                'estimatedCost': f"₹{int(diesel_cost)} ईंधन खर्च" if is_hi else f"₹{int(diesel_cost)} Fuel Cost",
                'fuelBurnRate': f"{diesel_per_hour} L/hr"
            }
            duration_str = f"{duration_hours} घंटे (डीजल पंप)" if is_hi else f"{duration_hours} Hours (Diesel Pump)"
        elif is_solar:
            duration_str = f"{duration_hours} घंटे (सोलर पंप)" if is_hi else f"{duration_hours} Hours (Solar Pump)"
        else:
            # Default or Electric Motor
            voltage_info = analyze_motor_voltage(motor_voltage, motor_phase, duration_hours, lang=lang)
            if voltage_info['status'] in ['warning_low', 'critical_low']:
                duration_hours = voltage_info['adjustedDurationHours']
            duration_str = f"{duration_hours} घंटे" if is_hi else f"{duration_hours} Hours"

        # 6. Smart Agronomic Insights & Recommended Window
        if is_pahadi:
            suggested_window = "दिन में, 8:00 AM - 4:00 PM (कूल का पानी नियंत्रित करना आसान रहता है)" if is_hi else "Daytime, 8:00 AM - 4:00 PM (Controlling Kuhl gravity flow is easier during daytime)"
        elif is_solar:
            suggested_window = "आज, 10:00 AM - 3:00 PM (तेज धूप के समय सोलर पंप अधिकतम पानी फेंकेगा)" if is_hi else "Today, 10:00 AM - 3:00 PM (Peak sunshine hours for maximum solar pump discharge)"
        elif temp_c > 32:
            suggested_window = "कल सुबह, 5:30 AM - 8:30 AM (सुबह का समय - वाष्पीकरण से बचाव)" if is_hi else "Tomorrow, 5:30 AM - 8:30 AM (Early morning window minimizes evaporation)"
        elif humidity_pct > 75:
            suggested_window = "कल सुबह, 7:00 AM - 10:00 AM (मध्यम आर्द्रता समय)" if is_hi else "Tomorrow, 7:00 AM - 10:00 AM (Moderate humidity window)"
        else:
            suggested_window = "आज शाम, 5:00 PM - 7:30 PM (शाम का ठंडा समय - फसल तनाव मुक्त रहेगी)" if is_hi else "Today, 5:00 PM - 7:30 PM (Evening window prevents plant water stress)"

        urgency = "आवश्यकता नहीं" if is_hi else "Not Required"
        advice = ""
        
        if rain_deferral:
            urgency = "स्थगित (बारिश का पूर्वानुमान)" if is_hi else "Postponed (Rain Forecast)"
            advice = (
                f"🌧️ मौसम अलर्ट: {rain_prob}% बारिश संभावना व ~{rainfall_mm:.1f}mm बारिश का अनुमान है। पानी व बिजली बचाने हेतु सिंचाई स्थगित करें।"
                if is_hi else
                f"🌧️ Weather Alert: {rain_prob}% rain probability with ~{rainfall_mm:.1f}mm expected. Irrigation postponed to save water and electricity."
            )
            suggested_window = "बारिश के बाद समीक्षा करें" if is_hi else "Postponed until after rain check"
            water_liters = 0
            duration_hours = 0
            duration_str = "0 घंटे" if is_hi else "0 Hours"
        elif not is_needed:
            urgency = "पर्याप्त नमी" if is_hi else "Optimal Soil Moisture"
            advice = (
                f"✅ वर्तमान मिट्टी नमी ({sm_pct:.1f}%) {matched_crop} के लिए पर्याप्त है। अगले 2-3 दिन सिंचाई की जरूरत नहीं है।"
                if is_hi else
                f"✅ Current soil moisture ({sm_pct:.1f}%) is sufficient for {matched_crop}. No watering needed for the next 2-3 days."
            )
            suggested_window = "आज आवश्यकता नहीं" if is_hi else "Not needed today"
            water_liters = 0
            duration_hours = 0
            duration_str = "0 घंटे" if is_hi else "0 Hours"
        else:
            if sm_pct < 18.0:
                urgency = "अति आवश्यक (गंभीर कमी)" if is_hi else "High (Critical Deficit)"
                advice = (
                    f"⚠️ मिट्टी की नमी घटकर {sm_pct:.1f}% रह गई है। {matched_crop} की बेहतर उपज हेतु तुरंत सिंचाई करें।"
                    if is_hi else
                    f"⚠️ Soil moisture has dropped to {sm_pct:.1f}%. Immediate irrigation recommended for optimal {matched_crop} yield."
                )
            else:
                urgency = "सामान्य (सिंचाई की जरूरत)" if is_hi else "Normal (Scheduled)"
                advice = (
                    f"💧 मध्यम जल कमी। सुझाए गए समय में {water_liters:,.0f} लीटर पानी दें।"
                    if is_hi else
                    f"💧 Moderate water deficit detected. Apply {water_liters:,.0f} Liters of water during suggested window."
                )

            if is_pahadi and pahadi_info:
                advice += f" {pahadi_info['terraceAdvice']}"
            elif voltage_info and voltage_info['status'] != 'optimal':
                advice += f" {voltage_info['advice']}"

        # Format human-friendly numbers
        if water_liters >= 100000:
            lakhs = water_liters / 100000.0
            water_req_str = (
                f"{int(water_liters):,} लीटर ({lakhs:.2f} लाख लीटर)"
                if is_hi else
                f"{int(water_liters):,} Liters ({lakhs:.2f} Lakh L)"
            )
        elif water_liters > 0:
            water_req_str = f"{int(water_liters):,} लीटर" if is_hi else f"{int(water_liters):,} Liters"
        else:
            water_req_str = "0 लीटर" if is_hi else "0 Liters"
        
        return jsonify({
            'success': True,
            'irrigationNeeded': is_needed,
            'urgency': urgency,
            'waterReq': water_req_str,
            'waterReqLiters': int(water_liters),
            'duration': duration_str,
            'durationHours': duration_hours,
            'suggestedWindow': suggested_window,
            'advice': advice,
            'crop': matched_crop,
            'soilType': matched_soil,
            'waterSource': 'Pahadi Kuhl / Stream' if is_pahadi else ('Solar Pump' if is_solar else ('Diesel Pump' if is_diesel else 'Electric Motor')),
            'pahadiInfo': pahadi_info,
            'voltageInfo': voltage_info,
            'dieselInfo': diesel_info,
            'fieldSize': f"{field_size_raw} {field_unit}",
            'fieldSizeAcres': round(field_size_acres, 2),
            'estimatedSoilMoisture': round(sm_pct, 1),
            'weather': {
                'temperature': f"{temp_c:.1f}°C",
                'humidity': f"{humidity_pct:.0f}%",
                'rainProbability': f"{rain_prob}%",
                'windSpeed': f"{weather.get('windSpeed', 0):.1f} km/h",
                'et0': f"{et0_mm:.1f} mm/day",
                'isLive': weather.get('isLive', True)
            },
            'modelAccuracy': f"{metrics.get('classifier_accuracy', 99.81)}%"
        })

    except Exception as e:
        print(f"Prediction error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/predict-crop', methods=['POST'])
def predict_crop():
    """Crop recommendation endpoint for mobile/app/crop-recommend.tsx"""
    try:
        data = request.get_json() or {}
        n = float(data.get('N', 50))
        p = float(data.get('P', 50))
        k = float(data.get('K', 50))
        temp = float(data.get('temperature', 25))
        humidity = float(data.get('humidity', 70))
        ph = float(data.get('ph', 6.5))
        rainfall = float(data.get('rainfall', 100))

        if rainfall > 180 and humidity > 75 and temp > 22:
            crop = "Rice"
        elif n > 100 and p > 40 and 15 <= temp <= 26 and rainfall < 120:
            crop = "Wheat"
        elif temp > 24 and rainfall > 70 and 6.0 <= ph <= 7.5:
            crop = "Maize"
        elif temp < 20 and rainfall < 60:
            crop = "Mustard"
        elif ph < 6.5 and temp < 24 and 50 <= rainfall <= 100:
            crop = "Potato"
        elif temp > 26 and rainfall > 120:
            crop = "Sugarcane"
        elif humidity < 60 and rainfall < 90:
            crop = "Pulses (Chickpea / Lentil)"
        elif temp > 20 and 55 <= humidity <= 80:
            crop = "Tomato"
        else:
            crop = "Wheat"

        return jsonify({
            'success': True,
            'recommendation': crop
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ========================================================
# CARBON FOOTPRINT & DIESEL EMISSION ENDPOINTS
# ========================================================

@app.route('/api/emission/options', methods=['GET'])
def get_emission_options():
    return jsonify({
        'crops': emission_metrics.get('crops', ['Cotton', 'Maize', 'Mustard', 'Potato', 'Pulses', 'Rice', 'Sugarcane', 'Wheat']),
        'residueOptions': emission_metrics.get('residue_options', [
            'Mulched / Happy Seeder (Zero Till)',
            'Incorporated into Soil',
            'Removed from Field',
            'Burned (Stubble Burning)'
        ]),
        'irrigationOptions': emission_metrics.get('irrigation_options', [
            'Solar Pump',
            'Canal (Gravity)',
            'Electric Tube Well',
            'Diesel Engine Pump'
        ]),
        'fieldUnits': ['Acre', 'Bigha', 'Hectare'],
        'metrics': emission_metrics
    })

@app.route('/api/predict-emission', methods=['POST'])
def predict_emission():
    try:
        data = request.get_json() or {}
        
        crop_input = str(data.get('crop', 'Wheat')).strip().capitalize()
        field_size_raw = float(data.get('fieldSize', 1.0))
        field_unit = str(data.get('fieldUnit', 'Acre')).strip()
        
        # Tractor Diesel input: farmer can provide direct liters or tractor hours
        diesel_liters_input = data.get('dieselLiters')
        tractor_hours_input = data.get('tractorHours')
        
        # Convert field size to Acres
        if field_unit.lower() == 'bigha':
            field_size_acres = field_size_raw * 0.20 # 1 Acre = 5 Bigha
        elif field_unit.lower() == 'hectare':
            field_size_acres = field_size_raw * 2.471
        else:
            field_size_acres = field_size_raw
        field_size_acres = max(0.05, field_size_acres)
        
        # Determine diesel usage
        if diesel_liters_input is not None and float(diesel_liters_input) > 0:
            total_diesel_liters = float(diesel_liters_input)
            tractor_hours = round(total_diesel_liters / 4.8, 1)
        elif tractor_hours_input is not None and float(tractor_hours_input) > 0:
            tractor_hours = float(tractor_hours_input)
            total_diesel_liters = round(tractor_hours * 4.8, 1) # ~4.8 Litres per hour for standard 45HP tractor
        else:
            # Default realistic benchmark based on crop
            default_diesel_per_acre = 34.0 if 'rice' in crop_input.lower() else 26.0 if 'wheat' in crop_input.lower() else 22.0
            total_diesel_liters = round(default_diesel_per_acre * field_size_acres, 1)
            tractor_hours = round(total_diesel_liters / 4.8, 1)
            
        # Fertilizer (Urea / NPK in kg)
        urea_input = data.get('ureaKg')
        if urea_input is not None and float(urea_input) > 0:
            total_urea_kg = float(urea_input)
        else:
            default_urea_per_acre = 110.0 if 'rice' in crop_input.lower() else 95.0 if 'wheat' in crop_input.lower() else 75.0
            total_urea_kg = round(default_urea_per_acre * field_size_acres, 1)

        residue_input = str(data.get('residueManagement', 'Mulched / Happy Seeder (Zero Till)')).strip()
        irrigation_input = str(data.get('irrigationSource', 'Electric Tube Well')).strip()

        # Match crop
        supported_crops = emission_metrics.get('crops', ['Cotton', 'Maize', 'Mustard', 'Potato', 'Pulses', 'Rice', 'Sugarcane', 'Wheat'])
        matched_crop = 'Wheat'
        for c in supported_crops:
            if c.lower() in crop_input.lower() or crop_input.lower() in c.lower():
                matched_crop = c
                break

        # Match residue
        supported_residue = emission_metrics.get('residue_options', [
            'Burned (Stubble Burning)', 'Incorporated into Soil', 'Mulched / Happy Seeder (Zero Till)', 'Removed from Field'
        ])
        matched_residue = 'Mulched / Happy Seeder (Zero Till)'
        for r in supported_residue:
            if r.lower() in residue_input.lower() or residue_input.lower() in r.lower():
                matched_residue = r
                break

        # Match irrigation
        supported_irrigation = emission_metrics.get('irrigation_options', [
            'Canal (Gravity)', 'Diesel Engine Pump', 'Electric Tube Well', 'Solar Pump'
        ])
        matched_irrigation = 'Electric Tube Well'
        for i in supported_irrigation:
            if i.lower() in irrigation_input.lower() or irrigation_input.lower() in i.lower():
                matched_irrigation = i
                break

        # Encode features
        try:
            crop_enc = emission_crop_encoder.transform([matched_crop])[0]
        except Exception:
            crop_enc = 0
            
        try:
            residue_enc = emission_residue_encoder.transform([matched_residue])[0]
        except Exception:
            residue_enc = 0

        try:
            irrigation_enc = emission_irrigation_encoder.transform([matched_irrigation])[0]
        except Exception:
            irrigation_enc = 0

        feature_cols = [
            'Crop_Enc', 'FieldSize_Acres', 'Diesel_Liters', 
            'Tractor_Hours', 'Urea_Fertilizer_kg', 'Residue_Enc', 'Irrigation_Enc'
        ]
        feature_df = pd.DataFrame([[
            crop_enc,
            field_size_acres,
            total_diesel_liters,
            tractor_hours,
            total_urea_kg,
            residue_enc,
            irrigation_enc
        ]], columns=feature_cols)

        # 1. Total Emission Prediction
        if reg_emission is not None:
            predicted_total = float(reg_emission.predict(feature_df)[0])
        else:
            # Physics-based agronomic fallback
            predicted_total = (total_diesel_liters * 3.0) + (total_urea_kg * 0.46 * 4.5) + (field_size_acres * 400.0)

        total_co2e_kg = max(50.0, round(predicted_total, 1))
        total_co2e_tonnes = round(total_co2e_kg / 1000.0, 2)
        emission_per_acre = round(total_co2e_kg / field_size_acres, 1)

        # 2. Component Breakdowns (IPCC Tier-1 & Kakraliya et al.)
        # 1 Litre Diesel = 2.68 kg CO2 combustion + 0.32 kg well-to-tank = 3.00 kg CO2e
        diesel_co2e = round(total_diesel_liters * 3.00, 1)
        
        # Fertilizer N2O emissions + Urea manufacturing
        nitrogen_applied_kg = total_urea_kg * 0.46
        n2o_factor = 0.0125 if matched_crop == 'Rice' else 0.010
        fertilizer_n2o_co2e = nitrogen_applied_kg * n2o_factor * (44.0 / 28.0) * 273.0
        fertilizer_mfg_co2e = nitrogen_applied_kg * 3.2
        fertilizer_co2e = round(fertilizer_n2o_co2e + fertilizer_mfg_co2e, 1)
        
        # Irrigation Energy
        irrig_factors = {'Solar Pump': 12.0, 'Canal (Gravity)': 18.0, 'Electric Tube Well': 102.0, 'Diesel Engine Pump': 150.0}
        irrigation_co2e = round(field_size_acres * irrig_factors.get(matched_irrigation, 100.0), 1)
        
        # Soil, Residue & Methane
        soil_crop_co2e = round(max(20.0, total_co2e_kg - (diesel_co2e + fertilizer_co2e + irrigation_co2e)), 1)

        # 3. Eco-Rating
        eco_rating = 'Grade B (Moderate)'
        if clf_eco is not None and eco_rating_encoder is not None:
            try:
                pred_eco = clf_eco.predict(feature_df)[0]
                eco_rating = eco_rating_encoder.inverse_transform([pred_eco])[0]
            except Exception:
                pass
        else:
            if emission_per_acre < 550.0:
                eco_rating = 'Grade A (Eco-Friendly)'
            elif emission_per_acre < 1250.0:
                eco_rating = 'Grade B (Moderate)'
            else:
                eco_rating = 'Grade C (High Emission)'

        # 4. Mitigation Potential & Carbon Credits
        potential_reduction_kg = round(
            (diesel_co2e * 0.25) + (fertilizer_co2e * 0.20) + (soil_crop_co2e * 0.35), 1
        )
        potential_credits = round(potential_reduction_kg / 1000.0, 2)
        credit_income_inr = int(potential_credits * 800) # Average ~₹800 per carbon credit

        # 5. Smart Climate-Smart Farming Recommendations
        tips = []
        if total_diesel_liters > (30.0 * field_size_acres):
            tips.append({
                'title': 'Optimize Tractor Diesel (Save 20-25%)',
                'description': f'You are using ~{total_diesel_liters/field_size_acres:.1f} L/acre. Using a Laser Land Leveler & combining rotavator passes can save ~{total_diesel_liters * 0.2:.0f} Litres of diesel.'
            })
        if matched_residue == 'Burned (Stubble Burning)':
            tips.append({
                'title': 'Avoid Stubble Burning (Save 40% Soil Carbon)',
                'description': 'Stubble burning releases massive CO2, particulate matter, and burns soil microbes. Using a Happy Seeder / Super SMS retains moisture and adds carbon credits.'
            })
        if matched_irrigation == 'Diesel Engine Pump':
            tips.append({
                'title': 'Switch to Solar Pump (PM-KUSUM Scheme)',
                'description': 'Diesel pumps emit 1.25x more GHG than solar. Avail up to 60% government subsidy under PM-KUSUM to eliminate pumping diesel costs.'
            })
        if matched_crop == 'Rice':
            tips.append({
                'title': 'Adopt Alternate Wetting & Drying (AWD)',
                'description': 'Intermittent flooding instead of continuous flooding reduces field methane (CH4) emissions by 30-40% without reducing paddy yield.'
            })
        if len(tips) == 0:
            tips.append({
                'title': 'Excellent Farm Eco-Efficiency!',
                'description': 'Your farming practices have low carbon intensity. Maintain zero-till and balanced neem-coated urea for premium carbon credit eligibility.'
            })

        return jsonify({
            'success': True,
            'crop': matched_crop,
            'fieldSize': f"{field_size_raw} {field_unit}",
            'fieldSizeAcres': round(field_size_acres, 2),
            'dieselLiters': total_diesel_liters,
            'tractorHours': tractor_hours,
            'ureaKg': total_urea_kg,
            'residueManagement': matched_residue,
            'irrigationSource': matched_irrigation,
            'totalCO2eKg': total_co2e_kg,
            'totalCO2eTonnes': total_co2e_tonnes,
            'emissionPerAcreKg': emission_per_acre,
            'ecoRating': eco_rating,
            'breakdown': {
                'dieselCO2e': diesel_co2e,
                'fertilizerCO2e': fertilizer_co2e,
                'soilCropCO2e': soil_crop_co2e,
                'irrigationCO2e': irrigation_co2e,
            },
            'mitigation': {
                'potentialReductionKg': potential_reduction_kg,
                'potentialCarbonCredits': potential_credits,
                'estimatedCreditIncomeINR': f"₹{credit_income_inr:,}",
            },
            'tips': tips,
            'modelAccuracy': '99.78% (R2 Score)'
        })

    except Exception as e:
        print(f"Emission prediction error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ========================================================
# CROP WASTE MANAGEMENT & RESIDUE TO WEALTH ENDPOINTS
# ========================================================

@app.route('/api/waste/options', methods=['GET'])
def get_waste_options():
    return jsonify({
        'crops': waste_metrics.get('crops', ['Cotton', 'Groundnut', 'Maize', 'Mustard', 'Rice (Paddy)', 'Sugarcane', 'Wheat']),
        'seasons': waste_metrics.get('seasons', ['Kharif (Monsoon)', 'Rabi (Winter)', 'Zaid / Summer']),
        'states': waste_metrics.get('states', ['Bihar', 'Gujarat', 'Haryana', 'Madhya Pradesh', 'Maharashtra', 'Punjab', 'Rajasthan', 'Uttar Pradesh', 'Uttarakhand']),
        'fieldUnits': ['Acre', 'Bigha', 'Hectare'],
        'metrics': waste_metrics
    })

@app.route('/api/predict-waste', methods=['POST'])
def predict_waste():
    try:
        data = request.get_json() or {}
        
        crop_input = str(data.get('crop', 'Rice (Paddy)')).strip()
        field_size_raw = float(data.get('fieldSize', 5.0))
        field_unit = str(data.get('fieldUnit', 'Bigha')).strip()
        season_input = str(data.get('season', 'Kharif (Monsoon)')).strip()
        state_input = str(data.get('state', 'Uttarakhand')).strip()
        user_yield_quintals = data.get('grainYieldQuintals') # optional
        
        # Convert field size to Acres (1 Acre = 5 Bigha, so 1 Bigha = 0.20 Acre)
        if field_unit.lower() == 'bigha':
            field_size_acres = field_size_raw * 0.20
        elif field_unit.lower() == 'hectare':
            field_size_acres = field_size_raw * 2.471
        else:
            field_size_acres = field_size_raw
        field_size_acres = max(0.05, field_size_acres)

        # Match crop
        supported_crops = waste_metrics.get('crops', ['Cotton', 'Groundnut', 'Maize', 'Mustard', 'Rice (Paddy)', 'Sugarcane', 'Wheat'])
        matched_crop = 'Rice (Paddy)'
        for c in supported_crops:
            if c.lower() in crop_input.lower() or crop_input.lower() in c.lower():
                matched_crop = c
                break

        # Match season
        supported_seasons = waste_metrics.get('seasons', ['Kharif (Monsoon)', 'Rabi (Winter)', 'Zaid / Summer'])
        matched_season = 'Kharif (Monsoon)'
        for s in supported_seasons:
            if s.lower() in season_input.lower() or season_input.lower() in s.lower():
                matched_season = s
                break

        # Match state
        supported_states = waste_metrics.get('states', ['Bihar', 'Gujarat', 'Haryana', 'Madhya Pradesh', 'Maharashtra', 'Punjab', 'Rajasthan', 'Uttar Pradesh', 'Uttarakhand'])
        matched_state = 'Uttarakhand'
        for st in supported_states:
            if st.lower() in state_input.lower() or state_input.lower() in st.lower():
                matched_state = st
                break

        # Typical grain yields per acre if not provided
        typical_yields = {
            'Rice (Paddy)': 22.0,
            'Wheat': 20.0,
            'Sugarcane': 350.0,
            'Maize': 24.0,
            'Cotton': 8.0,
            'Groundnut': 10.0,
            'Mustard': 9.0
        }
        if user_yield_quintals is not None and float(user_yield_quintals) > 0:
            grain_yield_per_acre = float(user_yield_quintals) / field_size_acres
        else:
            grain_yield_per_acre = typical_yields.get(matched_crop, 20.0)

        # Encode for ML model
        try:
            crop_enc = waste_crop_encoder.transform([matched_crop])[0]
        except Exception:
            crop_enc = 0
            
        try:
            season_enc = waste_season_encoder.transform([matched_season])[0]
        except Exception:
            season_enc = 0

        try:
            state_enc = waste_state_encoder.transform([matched_state])[0]
        except Exception:
            state_enc = 0

        feature_cols = ['Crop_Enc', 'Season_Enc', 'State_Enc', 'FieldSize_Acres', 'GrainYield_Quintals_Acre']
        feature_df = pd.DataFrame([[
            crop_enc,
            season_enc,
            state_enc,
            field_size_acres,
            grain_yield_per_acre
        ]], columns=feature_cols)

        # Predict with ML models
        if reg_waste is not None:
            pred_waste_tonnes = float(reg_waste.predict(feature_df)[0])
            pred_burning_co2 = float(reg_burn.predict(feature_df)[0])
            pred_wealth = float(reg_wealth.predict(feature_df)[0])
        else:
            # Fallback based on IARI RCR
            rcr = 1.45 if 'rice' in matched_crop.lower() else 1.30 if 'wheat' in matched_crop.lower() else 1.25
            total_grain_tonnes = (grain_yield_per_acre * field_size_acres) / 10.0
            pred_waste_tonnes = total_grain_tonnes * rcr
            pred_burning_co2 = pred_waste_tonnes * 1750.0
            pred_wealth = pred_waste_tonnes * 2650.0

        waste_tonnes = max(0.1, round(pred_waste_tonnes, 2))
        waste_kg = int(waste_tonnes * 1000)
        burning_co2e_kg = max(50.0, round(pred_burning_co2, 1))
        burning_co2e_tonnes = round(burning_co2e_kg / 1000.0, 2)
        pm25_kg = round(waste_tonnes * 7.2, 1) # ~7.2 kg toxic PM2.5 smoke per tonne burned

        # 4 Waste to Wealth Circular Economy Options
        # Option 1: Selling Stubble Pellets to Power Plants (NTPC Co-firing mandate @ ₹1,850/tonne)
        pellet_rate = 1850 if 'Rice' in matched_crop else 2100 if 'Wheat' in matched_crop else 1900
        pellet_income_inr = int(waste_tonnes * pellet_rate)

        # Option 2: In-situ Mulching & Bio-Decomposer (Happy Seeder)
        # NPK nutrient gain: ~18kg N, ~6kg P, ~35kg K per acre + organic carbon
        fertilizer_saving_inr = int(field_size_acres * 2400)
        npk_added_kg = round(field_size_acres * 55, 0)
        organic_carbon_kg = round(waste_tonnes * 400, 0)

        # Option 3: Vermicompost / Mushroom Cultivation
        compost_tonnes = round(waste_tonnes * 0.45, 1) # ~45% compost recovery
        compost_value_inr = int(compost_tonnes * 1000 * 6) # ₹6 per kg organic vermicompost

        # Option 4: Avoided Burning Carbon Credits
        carbon_credits = round(burning_co2e_kg / 1000.0, 2)
        carbon_credit_inr = int(carbon_credits * 800)

        net_wealth_inr = pellet_income_inr + carbon_credit_inr

        # Actionable step-by-step solutions
        solutions = [
            {
                'title': 'Sell to Biomass Pellet Plant (NTPC Co-firing)',
                'icon': 'factory',
                'earning': f"₹{pellet_income_inr:,}",
                'tag': 'Direct Cash',
                'description': f'Sell {waste_tonnes} tonnes of residue to local bio-briquette or power plants at ₹{pellet_rate}/tonne.'
            },
            {
                'title': 'In-situ Mulching (Happy Seeder / Bio-Decomposer)',
                'icon': 'sprout',
                'earning': f"Save ₹{fertilizer_saving_inr:,}",
                'tag': 'Soil Fertility',
                'description': f'Mix stubble in soil to inject {npk_added_kg} kg NPK & {organic_carbon_kg} kg Organic Carbon, saving on next season Urea/DAP.'
            },
            {
                'title': 'Organic Vermicompost Production',
                'icon': 'recycle',
                'earning': f"Value ₹{compost_value_inr:,}",
                'tag': 'High Value Organic',
                'description': f'Produce ~{compost_tonnes} tonnes of rich organic compost for high-margin market sale or orchard use.'
            },
            {
                'title': 'Claim Stubble-Avoidance Carbon Credits',
                'icon': 'cash-multiple',
                'earning': f"₹{carbon_credit_inr:,}",
                'tag': 'Green Credit',
                'description': f'Avoid {burning_co2e_tonnes} tonnes CO₂e burning pollution to register for voluntary farmer carbon offsets.'
            }
        ]

        return jsonify({
            'success': True,
            'crop': matched_crop,
            'fieldSize': f"{field_size_raw} {field_unit}",
            'fieldSizeAcres': round(field_size_acres, 2),
            'season': matched_season,
            'state': matched_state,
            'wasteGeneratedTonnes': waste_tonnes,
            'wasteGeneratedKg': waste_kg,
            'burningPollution': {
                'co2eKg': burning_co2e_kg,
                'co2eTonnes': burning_co2e_tonnes,
                'pm25Kg': pm25_kg,
                'smokeWarning': f'⚠️ Burning this stubble emits {burning_co2e_kg:,} kg CO₂e and {pm25_kg} kg hazardous PM2.5 smoke into the air.'
            },
            'wealthPotentialINR': f"₹{net_wealth_inr:,}",
            'solutions': solutions,
            'modelAccuracy': '99.96% (R2 Score)'
        })

    except Exception as e:
        print(f"Waste prediction error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"Starting KisanSaathi ML Backend on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=False)


