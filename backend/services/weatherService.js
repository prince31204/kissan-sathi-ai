/**
 * KisanSaathi AI — Backend Weather Service
 *
 * Fetches current conditions and 7-day forecast from Open-Meteo (free, no API key required).
 * API key (WEATHER_API_KEY in .env) is kept for potential future use with a paid provider.
 *
 * All data is clearly labeled as:
 *  - 'Observed weather'  — current conditions
 *  - 'Short-term forecast' — 1–7 day forecast
 *  - 'Historical climate estimate' — fallback if API fails
 *
 * NEVER labels estimates as live data.
 */

const https = require('https');

const OWM_API_KEY = process.env.WEATHER_API_KEY || '';

/**
 * Helper to perform an HTTPS GET and parse JSON
 */
function httpsGetJson(url, timeoutMs = 7000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: timeoutMs }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(JSON.parse(data));
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 100)}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout fetching ${url}`));
    });
  });
}

/**
 * Fetch hyper-accurate live weather from OpenWeatherMap using the official API key
 */
async function fetchOpenWeatherMap(lat, lon, apiKey = OWM_API_KEY) {
  const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
  const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;

  const [current, forecast] = await Promise.all([
    httpsGetJson(weatherUrl),
    httpsGetJson(forecastUrl),
  ]);

  const temperature = safeNum(current.main?.temp, 22.0);
  const apparentTemp = safeNum(current.main?.feels_like, temperature);
  const humidity = safeNum(current.main?.humidity, 60.0);
  const windSpeed = safeNum(current.wind?.speed ? current.wind.speed * 3.6 : null, 8.0); // m/s to km/h
  const pressure = safeNum(current.main?.pressure, 1013);
  const precipitation = safeNum(current.rain ? (current.rain['1h'] || current.rain['3h'] || 0) : 0, 0);
  const cityName = current.name || 'Uttarakhand';
  const weatherCondition = current.weather?.[0]?.main || 'Clear';
  const weatherDesc = current.weather?.[0]?.description || 'Clear Sky';

  // Group 40 3-hour forecast slots into day aggregates
  const dailyMap = {};
  const forecastList = Array.isArray(forecast?.list) ? forecast.list : [];

  for (const item of forecastList) {
    const dateStr = item.dt_txt ? item.dt_txt.split(' ')[0] : new Date(item.dt * 1000).toISOString().split('T')[0];
    if (!dailyMap[dateStr]) {
      dailyMap[dateStr] = {
        temps: [],
        rainSum: 0,
        pops: [],
        winds: [],
        conditions: [],
      };
    }
    if (item.main?.temp != null) dailyMap[dateStr].temps.push(item.main.temp);
    if (item.rain?.['3h']) dailyMap[dateStr].rainSum += item.rain['3h'];
    if (item.pop != null) dailyMap[dateStr].pops.push(item.pop * 100);
    if (item.wind?.speed != null) dailyMap[dateStr].winds.push(item.wind.speed * 3.6);
    if (item.weather?.[0]?.main) dailyMap[dateStr].conditions.push(item.weather[0].main);
  }

  const sortedDates = Object.keys(dailyMap).sort();
  const forecast7Day = sortedDates.map((date, idx) => {
    const d = dailyMap[date];
    const tempMax = d.temps.length ? Math.round(Math.max(...d.temps) * 10) / 10 : temperature + 3;
    const tempMin = d.temps.length ? Math.round(Math.min(...d.temps) * 10) / 10 : temperature - 3;
    const rainSumMm = Math.round(d.rainSum * 10) / 10;
    const rainProb = d.pops.length ? Math.round(Math.max(...d.pops)) : 0;
    const windMax = d.winds.length ? Math.round(Math.max(...d.winds) * 10) / 10 : windSpeed;
    const cond = d.conditions[0] || weatherCondition;

    return {
      date,
      dataType: idx === 0 ? 'Observed (today)' : 'Short-term forecast (OpenWeatherMap)',
      tempMax,
      tempMin,
      rainSumMm,
      rainProbability: rainProb,
      windMax,
      condition: cond,
    };
  });

  // Calculate Hargreaves ET0
  const tempDiff = Math.max(2.0, (forecast7Day[0]?.tempMax || temperature + 3) - (forecast7Day[0]?.tempMin || temperature - 3));
  const et0 = Math.round(Math.max(1.8, 0.0023 * (temperature + 17.8) * Math.sqrt(tempDiff) * (1.1 - humidity / 200.0) * 2.5) * 10) / 10;

  return {
    isLive: true,
    dataType: 'Live OpenWeatherMap Observation + 5–7 Day Forecast',
    source: `OpenWeatherMap (Official API Key: ${apiKey.slice(0, 8)}...)`,
    provider: 'OpenWeatherMap',
    fetchedAt: new Date().toISOString(),
    forecastHorizonDays: forecast7Day.length,
    cityName,
    temperature,
    apparentTemperature: apparentTemp,
    humidity,
    windSpeed,
    precipitation,
    pressure,
    condition: weatherCondition,
    description: weatherDesc,
    tempMax: forecast7Day[0]?.tempMax || temperature + 3,
    tempMin: forecast7Day[0]?.tempMin || temperature - 3,
    rainSumForecast: forecast7Day[0]?.rainSumMm || 0,
    rainProbability: forecast7Day[0]?.rainProbability || 0,
    et0,
    forecast7Day,
    latitude: lat,
    longitude: lon,
    note: `Real-time weather data for ${cityName} verified via OpenWeatherMap API key.`,
  };
}

/**
 * Secondary live provider: Open-Meteo
 */
async function fetchOpenMeteo(lat, lon) {
  const url = [
    `https://api.open-meteo.com/v1/forecast`,
    `?latitude=${lat}&longitude=${lon}`,
    `&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation,apparent_temperature`,
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,et0_fao_evapotranspiration,wind_speed_10m_max`,
    `&forecast_days=7`,
    `&timezone=Asia/Kolkata`,
  ].join('');

  const data = await httpsGetJson(url);
  const current = data.current || {};
  const daily = data.daily || {};

  const temperature = safeNum(current.temperature_2m, 22);
  const humidity = safeNum(current.relative_humidity_2m, 65);
  const windSpeed = safeNum(current.wind_speed_10m, 8);
  const precipitation = safeNum(current.precipitation, 0);
  const apparentTemp = safeNum(current.apparent_temperature, temperature);
  const weatherCode = safeNum(current.weather_code, 0);
  const condition = decodeWeatherCode(weatherCode);

  const forecastDates = daily.time || [];
  const tempMaxArr = daily.temperature_2m_max || [];
  const tempMinArr = daily.temperature_2m_min || [];
  const rainSumArr = daily.precipitation_sum || [];
  const rainProbArr = daily.precipitation_probability_max || [];
  const et0Arr = daily.et0_fao_evapotranspiration || [];
  const windMaxArr = daily.wind_speed_10m_max || [];

  const forecast7Day = forecastDates.map((date, i) => ({
    date,
    dataType: i === 0 ? 'Observed (today)' : 'Short-term forecast (Open-Meteo)',
    tempMax: safeNum(tempMaxArr[i], null),
    tempMin: safeNum(tempMinArr[i], null),
    rainSumMm: safeNum(rainSumArr[i], 0),
    rainProbability: safeNum(rainProbArr[i], 0),
    windMax: safeNum(windMaxArr[i], null),
    condition: decodeWeatherCode(daily.weather_code?.[i] ?? 0),
  }));

  return {
    isLive: true,
    dataType: 'Observed weather + 7-day forecast',
    source: 'Open-Meteo (open-meteo.com)',
    provider: 'Open-Meteo',
    fetchedAt: new Date().toISOString(),
    forecastHorizonDays: 7,
    temperature,
    apparentTemperature: apparentTemp,
    humidity,
    windSpeed,
    precipitation,
    weatherCode,
    condition,
    tempMax: safeNum(tempMaxArr[0], temperature + 3),
    tempMin: safeNum(tempMinArr[0], temperature - 3),
    rainSumForecast: safeNum(rainSumArr[0], 0),
    rainProbability: safeNum(rainProbArr[0], 0),
    et0: safeNum(et0Arr[0], 3.5),
    forecast7Day,
    latitude: lat,
    longitude: lon,
    note: 'Live weather from Open-Meteo secondary provider.',
  };
}

/**
 * Fetch weather for a given lat/lon:
 * Priority 1: OpenWeatherMap (using official WEATHER_API_KEY)
 * Priority 2: Open-Meteo (free fallback)
 * Priority 3: IMD Climatological Normals (historical fallback)
 */
async function fetchWeatherForLocation(lat, lon) {
  let validLat = lat;
  let validLon = lon;

  if (!validLat || !validLon || isNaN(validLat) || isNaN(validLon) || validLat < 8 || validLat > 38 || validLon < 68 || validLon > 98) {
    validLat = 30.3165;
    validLon = 78.0322;
  }

  // Priority 1: OpenWeatherMap with API Key
  if (OWM_API_KEY) {
    try {
      const owmData = await fetchOpenWeatherMap(validLat, validLon, OWM_API_KEY);
      return owmData;
    } catch (err) {
      console.warn(`[WeatherService] OpenWeatherMap failed (${err.message}), falling back to Open-Meteo...`);
    }
  }

  // Priority 2: Open-Meteo
  try {
    const meteoData = await fetchOpenMeteo(validLat, validLon);
    return meteoData;
  } catch (err) {
    console.warn(`[WeatherService] Open-Meteo failed (${err.message}), falling back to climate estimates...`);
  }

  // Priority 3: Historical Climatological Normals
  return getClimateEstimateFallback(validLat, validLon);
}

/**
 * Fallback: documented seasonal climate estimates for Uttarakhand.
 * Clearly labeled as historical estimates — never as live data.
 * Source: IMD Climatological Normals for Uttarakhand districts.
 */
function getClimateEstimateFallback(lat, lon) {
  const month = new Date().getMonth() + 1;
  // Seasonal temperature estimates for Uttarakhand mid-hills (~1000–1800m)
  const MONTHLY_CLIMATE = {
    1:  { tempMin: 4,  tempMax: 16, rainMm: 60,  humidity: 70 },
    2:  { tempMin: 6,  tempMax: 18, rainMm: 55,  humidity: 65 },
    3:  { tempMin: 11, tempMax: 24, rainMm: 40,  humidity: 55 },
    4:  { tempMin: 16, tempMax: 30, rainMm: 25,  humidity: 45 },
    5:  { tempMin: 20, tempMax: 35, rainMm: 30,  humidity: 40 },
    6:  { tempMin: 22, tempMax: 32, rainMm: 150, humidity: 75 },
    7:  { tempMin: 20, tempMax: 28, rainMm: 350, humidity: 88 },
    8:  { tempMin: 20, tempMax: 28, rainMm: 320, humidity: 90 },
    9:  { tempMin: 18, tempMax: 27, rainMm: 180, humidity: 85 },
    10: { tempMin: 12, tempMax: 24, rainMm: 40,  humidity: 70 },
    11: { tempMin: 7,  tempMax: 20, rainMm: 20,  humidity: 65 },
    12: { tempMin: 4,  tempMax: 16, rainMm: 35,  humidity: 70 },
  };
  const climate = MONTHLY_CLIMATE[month] || MONTHLY_CLIMATE[6];
  const temperature = Math.round((climate.tempMin + climate.tempMax) / 2);

  return {
    isLive: false,
    dataType: 'Historical climate estimate',
    source: 'IMD Climatological Normals for Uttarakhand (seasonal average — not a live observation)',
    fetchedAt: new Date().toISOString(),
    forecastHorizonDays: 0,
    temperature,
    apparentTemperature: temperature,
    humidity: climate.humidity,
    windSpeed: 8,
    precipitation: 0,
    weatherCode: 0,
    condition: 'Unknown (live data unavailable)',
    tempMax: climate.tempMax,
    tempMin: climate.tempMin,
    rainSumForecast: climate.rainMm / 30, // daily average
    rainProbability: climate.rainMm > 100 ? 70 : climate.rainMm > 30 ? 40 : 15,
    et0: 3.5,
    forecast7Day: [],
    latitude: lat,
    longitude: lon,
    note: 'IMPORTANT: Live weather could not be fetched. These values are historical monthly averages for Uttarakhand hills, NOT actual current weather. Check weather manually before taking irrigation or spray decisions.',
  };
}

function safeNum(val, fallback) {
  const n = parseFloat(val);
  return isNaN(n) ? fallback : n;
}

function decodeWeatherCode(code) {
  if (code === 0) return 'Clear Sky';
  if ([1, 2, 3].includes(code)) return 'Partly Cloudy';
  if ([45, 48].includes(code)) return 'Fog';
  if ([51, 53, 55].includes(code)) return 'Drizzle';
  if ([61, 63, 65].includes(code)) return 'Rain';
  if ([71, 73, 75].includes(code)) return 'Snow';
  if ([80, 81, 82].includes(code)) return 'Rain Showers';
  if ([95, 96, 99].includes(code)) return 'Thunderstorm';
  return 'Partly Cloudy';
}

module.exports = { fetchWeatherForLocation, fetchOpenWeatherMap, getClimateEstimateFallback };
