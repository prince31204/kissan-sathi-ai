/**
 * KisanSaathi AI — Unified Live Weather Service
 *
 * Utilizes the official OpenWeatherMap API Key for hyper-accurate real-time observations and forecasts.
 * Priority 1: Backend /api/v1/agro/weather (OpenWeatherMap via server)
 * Priority 2: Direct OpenWeatherMap API (Client-side with key)
 * Priority 3: Open-Meteo Fallback
 */

export const OPENWEATHERMAP_API_KEY = process.env.EXPO_PUBLIC_WEATHER_API_KEY || '';
const BACKEND_BASE = 'http://localhost:8000';

export interface UnifiedDailyForecast {
  day: string;
  date: string;
  temp: number;
  max: number;
  min: number;
  condition: string;
  rainProb: number;
  rainSumMm: number;
  windSpeed: number;
}

export interface UnifiedWeatherData {
  isLive: boolean;
  source: string;
  cityName: string;
  temperature: number;
  feelsLike: number;
  tempMax: number;
  tempMin: number;
  humidity: number;
  windSpeed: number; // km/h
  windText: string;
  rainProbability: number;
  precipitationMm: number;
  pressure: number;
  condition: string;
  description: string;
  et0: number;
  forecast: UnifiedDailyForecast[];
  timestamp: string;
}

/**
 * Standardize weather condition strings
 */
export function normalizeWeatherCondition(main: string, desc?: string): string {
  const m = (main || '').toLowerCase();
  const d = (desc || '').toLowerCase();

  if (m === 'clear' || d.includes('clear')) return 'Clear Sky';
  if (m === 'clouds' || d.includes('cloud')) {
    if (d.includes('few') || d.includes('scattered')) return 'Partly Cloudy';
    return 'Overcast Clouds';
  }
  if (m === 'rain' || d.includes('rain')) {
    if (d.includes('light')) return 'Light Rain';
    if (d.includes('heavy')) return 'Heavy Rain';
    return 'Rainy';
  }
  if (m === 'drizzle') return 'Drizzle';
  if (m === 'thunderstorm' || d.includes('thunder')) return 'Thunderstorm';
  if (m === 'snow' || d.includes('snow')) return 'Snowy';
  if (['mist', 'smoke', 'haze', 'fog'].includes(m)) return 'Foggy';
  return 'Partly Cloudy';
}

/**
 * Fetch directly from OpenWeatherMap API using official API key
 */
export async function fetchDirectOpenWeatherMap(lat: number, lon: number): Promise<UnifiedWeatherData> {
  const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHERMAP_API_KEY}&units=metric`;
  const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHERMAP_API_KEY}&units=metric`;

  const [currentRes, forecastRes] = await Promise.all([
    fetch(currentUrl),
    fetch(forecastUrl),
  ]);

  if (!currentRes.ok) {
    throw new Error(`OpenWeatherMap current weather failed with HTTP ${currentRes.status}`);
  }

  const current = await currentRes.json();
  const forecast = forecastRes.ok ? await forecastRes.json() : null;

  const temp = Math.round(current.main?.temp ?? 22);
  const feelsLike = Math.round(current.main?.feels_like ?? temp);
  const humidity = Math.round(current.main?.humidity ?? 60);
  const windKmH = Math.round((current.wind?.speed ?? 2) * 3.6);
  const pressure = Math.round(current.main?.pressure ?? 1013);
  const precip = current.rain ? (current.rain['1h'] || current.rain['3h'] || 0) : 0;
  const cityName = current.name || 'Uttarakhand';
  const condMain = current.weather?.[0]?.main || 'Clear';
  const condDesc = current.weather?.[0]?.description || 'Clear Sky';
  const condition = normalizeWeatherCondition(condMain, condDesc);

  // Group 3-hour forecasts into daily buckets
  const dailyMap: Record<string, { temps: number[]; rainSum: number; pops: number[]; winds: number[]; conds: string[] }> = {};
  const forecastList = Array.isArray(forecast?.list) ? forecast.list : [];

  for (const item of forecastList) {
    const dateStr = item.dt_txt ? item.dt_txt.split(' ')[0] : new Date(item.dt * 1000).toISOString().split('T')[0];
    if (!dailyMap[dateStr]) {
      dailyMap[dateStr] = { temps: [], rainSum: 0, pops: [], winds: [], conds: [] };
    }
    if (item.main?.temp != null) dailyMap[dateStr].temps.push(item.main.temp);
    if (item.rain?.['3h']) dailyMap[dateStr].rainSum += item.rain['3h'];
    if (item.pop != null) dailyMap[dateStr].pops.push(item.pop * 100);
    if (item.wind?.speed != null) dailyMap[dateStr].winds.push(item.wind.speed * 3.6);
    if (item.weather?.[0]?.main) dailyMap[dateStr].conds.push(normalizeWeatherCondition(item.weather[0].main, item.weather[0].description));
  }

  const sortedDates = Object.keys(dailyMap).sort();
  const daysList: UnifiedDailyForecast[] = sortedDates.slice(0, 5).map((dateStr, idx) => {
    const d = dailyMap[dateStr];
    const dateObj = new Date(dateStr);
    const day = idx === 0 ? 'Today' : dateObj.toLocaleDateString('en-US', { weekday: 'short' });
    const max = d.temps.length ? Math.round(Math.max(...d.temps)) : temp + 4;
    const min = d.temps.length ? Math.round(Math.min(...d.temps)) : temp - 5;
    const rainSumMm = Math.round(d.rainSum * 10) / 10;
    const rainProb = d.pops.length ? Math.round(Math.max(...d.pops)) : 0;
    const windSpeed = d.winds.length ? Math.round(Math.max(...d.winds)) : windKmH;
    const cond = d.conds[0] || condition;

    return {
      day,
      date: dateStr,
      temp: max,
      max,
      min,
      condition: cond,
      rainProb,
      rainSumMm,
      windSpeed,
    };
  });

  const high = daysList[0]?.max ?? Math.round(current.main?.temp_max ?? temp + 3);
  const low = daysList[0]?.min ?? Math.round(current.main?.temp_min ?? temp - 4);
  const rainProb = daysList[0]?.rainProb ?? (precip > 0 ? 80 : 10);

  // Hargreaves ET0 estimation
  const tempDiff = Math.max(2.0, high - low);
  const et0 = Math.round(Math.max(1.8, 0.0023 * (temp + 17.8) * Math.sqrt(tempDiff) * (1.1 - humidity / 200.0) * 2.5) * 10) / 10;

  return {
    isLive: true,
    source: 'OpenWeatherMap (Official API Key)',
    cityName,
    temperature: temp,
    feelsLike,
    tempMax: high,
    tempMin: low,
    humidity,
    windSpeed: windKmH,
    windText: `${windKmH} km/h`,
    rainProbability: rainProb,
    precipitationMm: precip,
    pressure,
    condition,
    description: condDesc,
    et0,
    forecast: daysList,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
}

/**
 * Open-Meteo Fallback Provider
 */
async function fetchOpenMeteoFallback(lat: number, lon: number): Promise<UnifiedWeatherData> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo failed with HTTP ${res.status}`);

  const data = await res.json();
  const curTemp = Math.round(data.current?.temperature_2m ?? 22);
  const humidity = Math.round(data.current?.relative_humidity_2m ?? 60);
  const windKmH = Math.round(data.current?.wind_speed_10m ?? 8);
  const code = data.current?.weather_code ?? 0;

  const codeToCond = (c: number) => {
    if (c === 0) return 'Clear Sky';
    if ([1, 2, 3].includes(c)) return 'Partly Cloudy';
    if ([45, 48].includes(c)) return 'Foggy';
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(c)) return 'Rainy';
    if ([71, 73, 75].includes(c)) return 'Snowy';
    if ([95, 96, 99].includes(c)) return 'Thunderstorm';
    return 'Partly Cloudy';
  };

  const condition = codeToCond(code);
  const dailyTimes: string[] = data.daily?.time || [];
  const forecast: UnifiedDailyForecast[] = dailyTimes.slice(0, 5).map((dStr: string, idx: number) => {
    const dObj = new Date(dStr);
    const day = idx === 0 ? 'Today' : dObj.toLocaleDateString('en-US', { weekday: 'short' });
    const max = Math.round(data.daily.temperature_2m_max?.[idx] ?? curTemp + 4);
    const min = Math.round(data.daily.temperature_2m_min?.[idx] ?? curTemp - 5);
    const c = data.daily.weather_code?.[idx] ?? 1;
    return {
      day,
      date: dStr,
      temp: max,
      max,
      min,
      condition: codeToCond(c),
      rainProb: data.daily.precipitation_probability_max?.[idx] ?? 15,
      rainSumMm: data.daily.precipitation_sum?.[idx] ?? 0,
      windSpeed: windKmH,
    };
  });

  return {
    isLive: true,
    source: 'Open-Meteo (Satellite Fallback)',
    cityName: 'Uttarakhand',
    temperature: curTemp,
    feelsLike: curTemp,
    tempMax: forecast[0]?.max ?? curTemp + 4,
    tempMin: forecast[0]?.min ?? curTemp - 5,
    humidity,
    windSpeed: windKmH,
    windText: `${windKmH} km/h`,
    rainProbability: forecast[0]?.rainProb ?? 15,
    precipitationMm: 0,
    pressure: 1013,
    condition,
    description: condition,
    et0: 3.5,
    forecast,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
}

/**
 * Primary Unified Weather Retriever
 * 1. Checks Backend `/api/v1/agro/weather` (OpenWeatherMap via server)
 * 2. Directly calls OpenWeatherMap API (client-side using official key)
 * 3. Falls back to Open-Meteo
 */
export async function getUnifiedWeather(lat = 30.3165, lon = 78.0322): Promise<UnifiedWeatherData> {
  // Attempt 1: Backend service with timeout
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const backendRes = await fetch(`${BACKEND_BASE}/api/v1/agro/weather?lat=${lat}&lon=${lon}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (backendRes.ok) {
      const json = await backendRes.json();
      if (json.success && json.weather) {
        const w = json.weather;
        const forecastList: UnifiedDailyForecast[] = (w.forecast7Day || []).slice(0, 5).map((f: any, idx: number) => {
          const dObj = new Date(f.date);
          const day = idx === 0 ? 'Today' : dObj.toLocaleDateString('en-US', { weekday: 'short' });
          const maxVal = Math.round(f.tempMax ?? w.tempMax ?? 24);
          return {
            day,
            date: f.date,
            temp: maxVal,
            max: maxVal,
            min: Math.round(f.tempMin ?? w.tempMin ?? 14),
            condition: normalizeWeatherCondition(f.condition),
            rainProb: Math.round(f.rainProbability ?? 0),
            rainSumMm: Math.round((f.rainSumMm ?? 0) * 10) / 10,
            windSpeed: Math.round(f.windMax ?? w.windSpeed ?? 8),
          };
        });

        return {
          isLive: Boolean(w.isLive),
          source: w.source || 'OpenWeatherMap (Official API Key)',
          cityName: w.cityName || 'Uttarakhand',
          temperature: Math.round(w.temperature ?? 22),
          feelsLike: Math.round(w.apparentTemperature ?? w.temperature ?? 22),
          tempMax: Math.round(w.tempMax ?? 24),
          tempMin: Math.round(w.tempMin ?? 14),
          humidity: Math.round(w.humidity ?? 60),
          windSpeed: Math.round(w.windSpeed ?? 8),
          windText: `${Math.round(w.windSpeed ?? 8)} km/h`,
          rainProbability: Math.round(w.rainProbability ?? 0),
          precipitationMm: Math.round((w.precipitation ?? 0) * 10) / 10,
          pressure: Math.round(w.pressure ?? 1013),
          condition: normalizeWeatherCondition(w.condition, w.description),
          description: w.description || w.condition || 'Clear',
          et0: w.et0 || 3.5,
          forecast: forecastList.length ? forecastList : [],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
      }
    }
  } catch (err) {
    // Backend offline or timed out, proceed to Direct OWM
  }

  // Attempt 2: Direct OpenWeatherMap Client Call
  try {
    return await fetchDirectOpenWeatherMap(lat, lon);
  } catch (err) {
    console.warn('[UnifiedWeather] Direct OpenWeatherMap failed, using Open-Meteo fallback:', err);
  }

  // Attempt 3: Open-Meteo fallback
  return await fetchOpenMeteoFallback(lat, lon);
}
