import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Language = 'hi' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  toggleLanguage: () => Promise<void>;
  t: (key: string, fallback?: string) => string;
}

const STORAGE_KEY = '@kisan_app_language';

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Nav & Common
    'nav.home': 'Home',
    'nav.cropHealth': 'Crop Health',
    'nav.irrigation': 'Irrigation',
    'nav.equipment': 'Equipment',
    'nav.profile': 'Profile',
    'common.namaste': 'Namaste',
    'common.hello': 'Hello',
    'common.notifications': 'Notifications',
    'common.history': 'History',
    'common.live': 'LIVE',
    'common.viewDetails': 'View Details',
    'common.viewAll': 'View All',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.language': 'Language',
    'common.activeLanguageName': 'English',
    'common.otherLanguageName': 'हिन्दी',
    'common.logout': 'Logout',
    'common.editProfile': 'Edit Profile',
    'common.back': 'Back',
    'common.loading': 'Loading...',

    // Home Screen
    'home.todayWeather': "Today's Weather",
    'home.humidity': 'Humidity',
    'home.quickActions': 'Quick Actions',
    'home.cropGuide': 'Crop Guide',
    'home.cropGuideDesc': 'AI Recommendation',
    'home.wasteWealth': 'Waste to Wealth',
    'home.wasteWealthActionDesc': 'Residue & Stubble',
    'home.carbonEco': 'Carbon & Eco',
    'home.carbonEcoDesc': 'Diesel & Emissions',
    'home.askAi': 'Ask AI',
    'home.askAiDesc': 'Agri Chatbot',
    'home.mandiPrices': 'Mandi Prices',
    'home.mandiPricesDesc': 'Check Live Rates',
    'home.smartIrrigation': 'Smart Irrigation',
    'home.smartIrrigationDesc': 'Water AI Planner',
    'home.rentEquip': 'Rent Equip',
    'home.rentEquipDesc': 'Tractors & Tools',
    'home.diseaseScan': 'Disease Scan',
    'home.diseaseScanDesc': 'AI Plant Scanner',
    'home.mandiPricesHeader': 'Mandi Prices (Latest)',
    'home.loadingPrices': 'Loading latest prices...',
    'home.cropHealth': 'Crop Health',
    'home.healthy': 'Healthy',
    'home.smartIrrigationAI': 'Smart Irrigation AI',
    'home.waterNeeded': 'Water needed',
    'home.duration': 'Duration',
    'home.window': 'Window',
    'home.smartIrrigationBtn': 'Smart Irrigation Planner',
    'home.carbonFootprintTitle': 'Carbon Footprint & Diesel',
    'home.carbonFootprintSub': 'Track Tractor Diesel & Greenhouse Gases',
    'home.carbonFootprintDesc': 'Calculate CO₂e from diesel, fertilizers & earn Carbon Credits',
    'home.calcCarbonBtn': 'Calculate Carbon Footprint',
    'home.wasteWealthTitle': 'Crop Waste to Wealth',
    'home.wasteWealthSub': 'Convert Crop Residue & Stubble to Income',
    'home.wasteWealthDesc': 'Predict tonnes of waste, prevent burning pollution & sell to bio-energy plants',
    'home.manageWasteBtn': 'Manage Farm Waste',
    'home.recentActivity': 'Recent Activity',

    // Irrigation Screen
    'irrigation.pageTitle': 'Smart Irrigation',
    'irrigation.liveWeather': 'Live Field Weather',
    'irrigation.temperature': 'Temperature',
    'irrigation.humidity': 'Humidity',
    'irrigation.rainForecast': 'Rain Forecast',
    'irrigation.windSpeed': 'Wind Speed',
    'irrigation.farmParams': 'Farm & Crop Parameters',
    'irrigation.selectCrop': 'Select Crop',
    'irrigation.fieldSize': 'Field Size',
    'irrigation.unit': 'Unit',
    'irrigation.soilType': 'Soil Type',
    'irrigation.waterSource': 'Irrigation Water Source',
    'irrigation.electricMotor': 'Electric Motor',
    'irrigation.electricMotorSub': 'Tube Well / Motor Pump',
    'irrigation.pahadiStream': 'Mountain Kuhl / Stream',
    'irrigation.pahadiStreamSub': 'Natural Gravity Water',
    'irrigation.solarPump': 'Solar Pump',
    'irrigation.solarPumpSub': 'Solar Powered Pump',
    'irrigation.dieselPump': 'Diesel Engine',
    'irrigation.dieselPumpSub': 'Diesel Pump Set',
    'irrigation.pahadiHeaderTitle': 'Mountain Natural Spring / Kuhl (Gravity Flow)',
    'irrigation.pahadiHeaderDesc': '🌿 Zero Electricity Bill • 100% Free Gravity Water',
    'irrigation.terrainType': 'Terrain Type',
    'irrigation.stepTerraces': 'Step Terraces',
    'irrigation.stepTerracesSub': 'Sloped mountain terraces',
    'irrigation.valleyPlain': 'Valley Plain',
    'irrigation.valleyPlainSub': 'Flat plains & foothills',
    'irrigation.streamDischarge': 'Kuhl Water Flow Rate',
    'irrigation.mediumKuhl': 'Medium Kuhl (~22 L/s)',
    'irrigation.mediumKuhlSub': 'Normal flow',
    'irrigation.fastStream': 'Fast Stream (~40 L/s)',
    'irrigation.fastStreamSub': 'High torrent flow',
    'irrigation.lowStream': 'Slow Stream (~10 L/s)',
    'irrigation.lowStreamSub': 'Trickle flow',
    'irrigation.electricHeaderTitle': 'Motor Voltage & Phase Monitoring',
    'irrigation.phaseType': 'Phase Type',
    'irrigation.singlePhase': '1-Phase (Single Phase ~220V)',
    'irrigation.threePhase': '3-Phase (Three Phase ~415V)',
    'irrigation.motorVoltage': 'Motor Voltage (Volts)',
    'irrigation.quickPresets': 'Quick Voltage Presets',
    'irrigation.pumpCapacity': 'Pump Capacity (HP)',
    'irrigation.daysSinceLast': 'Days Since Last Irrigation',
    'irrigation.soilMoistureOptional': 'Soil Moisture % (Optional / Sensor)',
    'irrigation.calculateBtn': 'Calculate Smart Irrigation Plan',
    'irrigation.analyzing': 'Analyzing with ML Model...',
    'irrigation.runningAiModel': 'Running Agronomic FAO-56 & Voltage AI Model...',
    'irrigation.aiDecision': 'AI Irrigation Decision',
    'irrigation.waterRequirement': 'Water Requirement',
    'irrigation.pumpRuntime': 'Pump Runtime',
    'irrigation.channelFlowTime': 'Channel Flow Time',
    'irrigation.suggestedWindow': 'Suggested Window',
    'irrigation.cropAndArea': 'Crop & Area',
    'irrigation.liveHumidity': 'Live Humidity',
    'irrigation.soilMoisture': 'Soil Moisture',
    'irrigation.savedHistoryBtn': 'Saved to Irrigation History • View All',
    'irrigation.pahadiAnalysisTitle': 'Mountain Kuhl Analysis (Gravity Flow)',
    'irrigation.voltageMonitorTitle': 'Motor Voltage & Protection',
    'irrigation.voltageStatus': 'Voltage Status',
    'irrigation.flowEfficiency': 'Pressure / Flow Rate',
    'irrigation.adjustedDuration': 'Adjusted Duration',

    // Crop Health Screen
    'cropHealth.pageTitle': 'Crop Health',
    'cropHealth.myCrops': 'My Crops',
    'cropHealth.lastChecked': 'Last checked',
    'cropHealth.addNew': 'Add New Crop Analysis',
    'cropHealth.recentAnalyses': 'Recent Analyses',
    'cropHealth.yesterdayAi': 'Yesterday • AI Disease Analysis',

    // Equipment Screen
    'equipment.pageTitle': 'Rent Equipment',
    'equipment.searchPlaceholder': 'Search tractors, rotavators, sprayers...',
    'equipment.perDay': '/day',

    // Profile & Settings
    'profile.title': 'Profile',
    'profile.myFields': 'My Fields',
    'profile.myCrops': 'My Crops',
    'profile.rentals': 'Rental Requests',
    'profile.diseaseHistory': 'Disease Analysis History',
    'profile.settings': 'Settings',
    'profile.preferences': 'Preferences',
    'profile.language': 'Language',
    'profile.pushNotifications': 'Push Notifications',
    'profile.locationServices': 'Location Services',
    'profile.legalAbout': 'Legal & About',
    'profile.privacyPolicy': 'Privacy Policy',
    'profile.termsOfService': 'Terms of Service',
    'profile.about': 'About KisanSaathi AI',
    'profile.helpSupport': 'Help & Support',
    'profile.logout': 'Logout',
    'profile.editProfile': 'Edit Profile',

    // Weather Screen
    'weather.pageTitle': 'Weather Forecast',
    'weather.currentTemp': 'Current Temperature',
    'weather.weeklyForecast': '7-Day Forecast',
    'weather.farmingAdvisory': 'Farming Advisory',
  },
  hi: {
    // Nav & Common
    'nav.home': 'होम',
    'nav.cropHealth': 'फसल स्वास्थ्य',
    'nav.irrigation': 'सिंचाई',
    'nav.equipment': 'उपकरण',
    'nav.profile': 'प्रोफ़ाइल',
    'common.namaste': 'नमस्ते',
    'common.hello': 'नमस्ते',
    'common.notifications': 'सूचनाएं',
    'common.history': 'इतिहास',
    'common.live': 'लाइव',
    'common.viewDetails': 'विवरण देखें',
    'common.viewAll': 'सभी देखें',
    'common.save': 'सहेजें',
    'common.cancel': 'रद्द करें',
    'common.language': 'भाषा',
    'common.activeLanguageName': 'हिन्दी',
    'common.otherLanguageName': 'English',
    'common.logout': 'लॉगआउट',
    'common.editProfile': 'प्रोफ़ाइल बदलें',
    'common.back': 'वापस',
    'common.loading': 'लोड हो रहा है...',

    // Home Screen
    'home.todayWeather': 'आज का मौसम',
    'home.humidity': 'नमी',
    'home.quickActions': 'मुख्य सेवाएं',
    'home.cropGuide': 'फसल गाइड',
    'home.cropGuideDesc': 'एआई सिफारिश',
    'home.wasteWealth': 'पराली संपदा',
    'home.wasteWealthActionDesc': 'अवशेष से कमाई',
    'home.carbonEco': 'कार्बन व इको',
    'home.carbonEcoDesc': 'डीजल व उत्सर्जन',
    'home.askAi': 'एआई से पूछें',
    'home.askAiDesc': 'कृषि चैटबॉट',
    'home.mandiPrices': 'मंडी भाव',
    'home.mandiPricesDesc': 'ताज़ा भाव देखें',
    'home.smartIrrigation': 'स्मार्ट सिंचाई',
    'home.smartIrrigationDesc': 'एआई सिंचाई योजना',
    'home.rentEquip': 'उपकरण किराया',
    'home.rentEquipDesc': 'ट्रैक्टर व मशीनें',
    'home.diseaseScan': 'रोग पहचान',
    'home.diseaseScanDesc': 'पत्तियों की जांच',
    'home.mandiPricesHeader': 'ताज़ा मंडी भाव',
    'home.loadingPrices': 'ताज़ा भाव लोड हो रहे हैं...',
    'home.cropHealth': 'फसल स्वास्थ्य',
    'home.healthy': 'स्वस्थ',
    'home.smartIrrigationAI': 'स्मार्ट सिंचाई एआई',
    'home.waterNeeded': 'आवश्यक पानी',
    'home.duration': 'समय',
    'home.window': 'सिंचाई का समय',
    'home.smartIrrigationBtn': 'स्मार्ट सिंचाई योजना बनाएं',
    'home.carbonFootprintTitle': 'कार्बन उत्सर्जन एवं डीजल',
    'home.carbonFootprintSub': 'ट्रैक्टर डीजल एवं ग्रीनहाउस गैस ट्रैक करें',
    'home.carbonFootprintDesc': 'डीजल, खाद से उत्सर्जित CO₂e मापें और कार्बन क्रेडिट अर्जित करें',
    'home.calcCarbonBtn': 'कार्बन फुटप्रिंट निकालें',
    'home.wasteWealthTitle': 'फसल अवशेष व पराली प्रबंधन',
    'home.wasteWealthSub': 'पराली और अवशेष को आमदनी में बदलें',
    'home.wasteWealthDesc': 'अवशेष की मात्रा जानें, प्रदूषण रोकें और बायो-एनर्जी प्लांट में बेचें',
    'home.manageWasteBtn': 'फसल अवशेष प्रबंधित करें',
    'home.recentActivity': 'हालिया गतिविधियां',

    // Irrigation Screen
    'irrigation.pageTitle': 'स्मार्ट सिंचाई',
    'irrigation.liveWeather': 'लाइव मौसम स्थिति',
    'irrigation.temperature': 'तापमान',
    'irrigation.humidity': 'नमी',
    'irrigation.rainForecast': 'बारिश संभावना',
    'irrigation.windSpeed': 'हवा की गति',
    'irrigation.farmParams': 'खेत एवं फसल विवरण',
    'irrigation.selectCrop': 'फसल चुनें',
    'irrigation.fieldSize': 'खेत का आकार',
    'irrigation.unit': 'इकाई',
    'irrigation.soilType': 'मिट्टी का प्रकार',
    'irrigation.waterSource': 'सिंचाई का स्रोत',
    'irrigation.electricMotor': 'इलेक्ट्रिक मोटर',
    'irrigation.electricMotorSub': 'ट्यूबवेल / मोटर पंप',
    'irrigation.pahadiStream': 'पहाड़ी स्रोत / कूल',
    'irrigation.pahadiStreamSub': 'प्राकृतिक गुरुत्वाकर्षण जल',
    'irrigation.solarPump': 'सोलर पंप',
    'irrigation.solarPumpSub': 'सौर ऊर्जा पंप',
    'irrigation.dieselPump': 'डीजल इंजन',
    'irrigation.dieselPumpSub': 'डीजल पंप सेट',
    'irrigation.pahadiHeaderTitle': 'पहाड़ी प्राकृतिक स्रोत / कूल (प्राकृतिक प्रवाह)',
    'irrigation.pahadiHeaderDesc': '🌿 शून्य बिजली बिल • 100% मुफ़्त प्राकृतिक गुरुत्वाकर्षण जल',
    'irrigation.terrainType': 'जमीन का प्रकार',
    'irrigation.stepTerraces': 'सीढ़ीदार खेत',
    'irrigation.stepTerracesSub': 'ढलान वाली पहाड़ी जमीन',
    'irrigation.valleyPlain': 'घाटी / समतल खेत',
    'irrigation.valleyPlainSub': 'समतल तलहटी',
    'irrigation.streamDischarge': 'कूल / स्रोत में पानी का बहाव',
    'irrigation.mediumKuhl': 'मध्यम कूल (~22 L/s)',
    'irrigation.mediumKuhlSub': 'सामान्य प्रवाह',
    'irrigation.fastStream': 'तेज गधेरा/धारा (~40 L/s)',
    'irrigation.fastStreamSub': 'तेज बहाव',
    'irrigation.lowStream': 'धीमा स्रोत (~10 L/s)',
    'irrigation.lowStreamSub': 'कम पानी',
    'irrigation.electricHeaderTitle': 'मोटर वोल्टेज एवं फेज मॉनिटरिंग',
    'irrigation.phaseType': 'फेज प्रकार',
    'irrigation.singlePhase': '1-फेज (सिंगल फेज ~220V)',
    'irrigation.threePhase': '3-फेज (थ्री फेज ~415V)',
    'irrigation.motorVoltage': 'मोटर वोल्टेज (वोल्ट)',
    'irrigation.quickPresets': 'त्वरित वोल्टेज चयन',
    'irrigation.pumpCapacity': 'पंप क्षमता (HP)',
    'irrigation.daysSinceLast': 'पिछली सिंचाई के दिन',
    'irrigation.soilMoistureOptional': 'मिट्टी की नमी % (वैकल्पिक / सेंसर)',
    'irrigation.calculateBtn': 'स्मार्ट सिंचाई योजना बनाएं',
    'irrigation.analyzing': 'एआई मॉडल विश्लेषण कर रहा है...',
    'irrigation.runningAiModel': 'एग्रोनोमिक FAO-56 एवं वोल्टेज एआई मॉडल चल रहा है...',
    'irrigation.aiDecision': 'एआई सिंचाई निर्णय',
    'irrigation.waterRequirement': 'पानी की आवश्यकता',
    'irrigation.pumpRuntime': 'पंप चलाने का समय',
    'irrigation.channelFlowTime': 'कूल प्रवाह समय',
    'irrigation.suggestedWindow': 'सुझाया गया समय',
    'irrigation.cropAndArea': 'फसल एवं रकबा',
    'irrigation.liveHumidity': 'लाइव नमी',
    'irrigation.soilMoisture': 'मिट्टी की नमी',
    'irrigation.savedHistoryBtn': 'सिंचाई इतिहास में सुरक्षित • सभी देखें',
    'irrigation.pahadiAnalysisTitle': 'पहाड़ी कूल विश्लेषण (प्राकृतिक प्रवाह)',
    'irrigation.voltageMonitorTitle': 'मोटर वोल्टेज एवं स्वास्थ्य सुरक्षा',
    'irrigation.voltageStatus': 'वोल्टेज स्थिति',
    'irrigation.flowEfficiency': 'पानी का प्रेशर / प्रवाह',
    'irrigation.adjustedDuration': 'समायोजित समय',

    // Crop Health Screen
    'cropHealth.pageTitle': 'फसल स्वास्थ्य',
    'cropHealth.myCrops': 'मेरी फसलें',
    'cropHealth.lastChecked': 'पिछली जांच',
    'cropHealth.addNew': 'नई फसल का विश्लेषण करें',
    'cropHealth.recentAnalyses': 'हालिया जांच',
    'cropHealth.yesterdayAi': 'कल • एआई रोग विश्लेषण',

    // Equipment Screen
    'equipment.pageTitle': 'उपकरण किराए पर',
    'equipment.searchPlaceholder': 'ट्रैक्टर, रोटावेटर, स्प्रेयर खोजें...',
    'equipment.perDay': '/दिन',

    // Profile & Settings
    'profile.title': 'प्रोफ़ाइल',
    'profile.myFields': 'मेरे खेत',
    'profile.myCrops': 'मेरी फसलें',
    'profile.rentals': 'उपकरण किराए के अनुरोध',
    'profile.diseaseHistory': 'रोग जांच इतिहास',
    'profile.settings': 'सेटिंग्स',
    'profile.preferences': 'प्राथमिकताएं',
    'profile.language': 'भाषा',
    'profile.pushNotifications': 'पुश सूचनाएं',
    'profile.locationServices': 'स्थान सेवाएं',
    'profile.legalAbout': 'कानूनी एवं विवरण',
    'profile.privacyPolicy': 'गोपनीयता नीति',
    'profile.termsOfService': 'सेवा की शर्तें',
    'profile.about': 'किसानसाथी एआई के बारे में',
    'profile.helpSupport': 'मदद एवं सहायता',
    'profile.logout': 'लॉगआउट',
    'profile.editProfile': 'प्रोफ़ाइल बदलें',

    // Weather Screen
    'weather.pageTitle': 'मौसम पूर्वानुमान',
    'weather.currentTemp': 'वर्तमान तापमान',
    'weather.weeklyForecast': '7-दिवसीय पूर्वानुमान',
    'weather.farmingAdvisory': 'कृषि मौसम सलाह',
  },
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'hi',
  setLanguage: async () => {},
  toggleLanguage: async () => {},
  t: (key: string, fallback?: string) => fallback || key,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('hi'); // Default to Hindi for Indian farmers

  useEffect(() => {
    // Load stored language preference
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === 'hi' || saved === 'en') {
        setLanguageState(saved);
      }
    }).catch((e) => console.log('Error loading saved language:', e));
  }, []);

  const setLanguage = async (newLang: Language) => {
    setLanguageState(newLang);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, newLang);
    } catch (e) {
      console.warn('Failed to save language preference:', e);
    }
  };

  const toggleLanguage = async () => {
    const nextLang: Language = language === 'hi' ? 'en' : 'hi';
    await setLanguage(nextLang);
  };

  const t = (key: string, fallback?: string): string => {
    const dict = translations[language];
    if (dict && dict[key] !== undefined) {
      return dict[key];
    }
    // Fallback to English dict if Hindi key missing
    if (translations.en[key] !== undefined) {
      return translations.en[key];
    }
    return fallback !== undefined ? fallback : key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
