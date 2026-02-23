// =============================================
//  Weather Dashboard — Main Script
// =============================================

// ────────────────────────────────────────────
//  🔑  PASTE YOUR OPENWEATHERMAP API KEY BELOW
// ────────────────────────────────────────────
const API_KEY = 'a8ee1ee1fa425a23ba449314070cd940';
// ────────────────────────────────────────────
//  Get a free key at: https://home.openweathermap.org/api_keys
// ────────────────────────────────────────────

const BASE_URL = 'https://api.openweathermap.org/data/2.5';

// --- DOM Elements ---
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const dom = {
  app: $('#app'),
  bgGradient: $('#bgGradient'),
  searchInput: $('#searchInput'),
  searchBtn: $('#searchBtn'),
  locationBtn: $('#locationBtn'),
  unitToggle: $('#unitToggle'),
  loading: $('#loading'),
  errorState: $('#errorState'),
  errorMessage: $('#errorMessage'),
  retryBtn: $('#retryBtn'),
  mainContent: $('#mainContent'),
  cityName: $('#cityName'),
  dateTime: $('#dateTime'),
  weatherIcon: $('#weatherIcon'),
  currentTemp: $('#currentTemp'),
  weatherDesc: $('#weatherDesc'),
  humidity: $('#humidity'),
  windSpeed: $('#windSpeed'),
  pressure: $('#pressure'),
  visibility: $('#visibility'),
  feelsLike: $('#feelsLike'),
  uvIndex: $('#uvIndex'),
  forecastGrid: $('#forecastGrid'),
};

// --- State ---
let state = {
  unit: 'metric',       // 'metric' = °C,  'imperial' = °F
  lastCity: 'London',   // default city
  lastLat: null,
  lastLon: null,
};

// =============================================
//  API FETCH HELPERS
// =============================================

async function fetchCurrentWeather(query) {
  const params = typeof query === 'string'
    ? `q=${encodeURIComponent(query)}`
    : `lat=${query.lat}&lon=${query.lon}`;
  const url = `${BASE_URL}/weather?${params}&units=${state.unit}&appid=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(res.status === 404 ? 'City not found. Try a different name.' : 'Failed to fetch weather data.');
  return res.json();
}

async function fetchForecast(query) {
  const params = typeof query === 'string'
    ? `q=${encodeURIComponent(query)}`
    : `lat=${query.lat}&lon=${query.lon}`;
  const url = `${BASE_URL}/forecast?${params}&units=${state.unit}&appid=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch forecast.');
  return res.json();
}

// =============================================
//  RENDER FUNCTIONS
// =============================================

function tempUnit() {
  return state.unit === 'metric' ? '°C' : '°F';
}

function speedUnit() {
  return state.unit === 'metric' ? 'm/s' : 'mph';
}

function iconUrl(code, large = false) {
  return `https://openweathermap.org/img/wn/${code}${large ? '@4x' : '@2x'}.png`;
}

function formatDate(unix, tz) {
  const d = new Date((unix + tz) * 1000);
  return d.toUTCString().replace(/:\d{2} GMT/, '').replace(/^.*,\s*/, '');
}

function formatTime(unix, tz) {
  const d = new Date((unix + tz) * 1000);
  const h = d.getUTCHours();
  const m = d.getUTCMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${m} ${ampm}`;
}

function setBackground(weatherId, icon) {
  const isNight = icon.endsWith('n');
  let cls = '';
  if (weatherId >= 200 && weatherId < 300) cls = 'stormy';
  else if (weatherId >= 300 && weatherId < 600) cls = 'rainy';
  else if (weatherId >= 600 && weatherId < 700) cls = 'snowy';
  else if (weatherId >= 700 && weatherId < 800) cls = 'misty';
  else if (weatherId === 800) cls = isNight ? 'clear-night' : 'sunny';
  else cls = 'cloudy';

  dom.bgGradient.className = 'bg-gradient ' + cls;
}

function renderCurrent(data) {
  const { name, sys, main, weather, wind, visibility: vis, dt, timezone } = data;
  const w = weather[0];

  dom.cityName.textContent = `${name}, ${sys.country}`;
  dom.dateTime.textContent = formatDate(dt, timezone);
  dom.weatherIcon.src = iconUrl(w.icon, true);
  dom.weatherIcon.alt = w.description;
  dom.currentTemp.textContent = `${Math.round(main.temp)}${tempUnit()}`;
  dom.weatherDesc.textContent = w.description;

  dom.humidity.textContent = `${main.humidity}%`;
  dom.windSpeed.textContent = `${wind.speed} ${speedUnit()}`;
  dom.pressure.textContent = `${main.pressure} hPa`;
  dom.visibility.textContent = `${(vis / 1000).toFixed(1)} km`;
  dom.feelsLike.textContent = `${Math.round(main.feels_like)}${tempUnit()}`;
  dom.uvIndex.textContent = `${formatTime(sys.sunrise, timezone)} / ${formatTime(sys.sunset, timezone)}`;

  setBackground(w.id, w.icon);
}

function renderForecast(data) {
  // Group by day and pick midday reading (or closest to 12:00)
  const daily = {};
  data.list.forEach((item) => {
    const date = item.dt_txt.split(' ')[0];
    if (!daily[date]) daily[date] = [];
    daily[date].push(item);
  });

  const days = Object.entries(daily).slice(0, 5);
  dom.forecastGrid.innerHTML = '';

  days.forEach(([dateStr, entries]) => {
    // Find min & max temp for the day
    let lo = Infinity, hi = -Infinity, midEntry = entries[0];
    entries.forEach((e) => {
      if (e.main.temp_min < lo) lo = e.main.temp_min;
      if (e.main.temp_max > hi) hi = e.main.temp_max;
      // Prefer the midday entry for icon/desc
      const hour = parseInt(e.dt_txt.split(' ')[1].split(':')[0], 10);
      if (Math.abs(hour - 13) < Math.abs(parseInt(midEntry.dt_txt.split(' ')[1].split(':')[0], 10) - 13)) {
        midEntry = e;
      }
    });

    const dayName = new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' });
    const w = midEntry.weather[0];

    const card = document.createElement('div');
    card.className = 'forecast-card';
    card.innerHTML = `
      <div class="forecast-day">${dayName}</div>
      <img class="forecast-icon" src="${iconUrl(w.icon)}" alt="${w.description}" />
      <div class="forecast-temp">
        <span class="temp-high">${Math.round(hi)}°</span>
        <span class="temp-low">${Math.round(lo)}°</span>
      </div>
      <div class="forecast-desc">${w.description}</div>
    `;
    dom.forecastGrid.appendChild(card);
  });
}

// =============================================
//  STATE MANAGEMENT
// =============================================

function showLoading() {
  dom.loading.classList.remove('hidden');
  dom.mainContent.classList.add('hidden');
  dom.errorState.classList.add('hidden');
}

function showMain() {
  dom.loading.classList.add('hidden');
  dom.mainContent.classList.remove('hidden');
  dom.errorState.classList.add('hidden');
}

function showError(msg) {
  dom.loading.classList.add('hidden');
  dom.mainContent.classList.add('hidden');
  dom.errorState.classList.remove('hidden');
  dom.errorMessage.textContent = msg;
}

async function loadWeather(query) {
  showLoading();
  try {
    const [current, forecast] = await Promise.all([
      fetchCurrentWeather(query),
      fetchForecast(query),
    ]);
    renderCurrent(current);
    renderForecast(forecast);
    showMain();

    // Save last successful query
    if (typeof query === 'string') {
      state.lastCity = query;
    } else {
      state.lastLat = query.lat;
      state.lastLon = query.lon;
    }
  } catch (err) {
    showError(err.message);
  }
}

function reloadLast() {
  if (state.lastLat && state.lastLon) {
    loadWeather({ lat: state.lastLat, lon: state.lastLon });
  } else {
    loadWeather(state.lastCity);
  }
}

// =============================================
//  EVENT HANDLERS
// =============================================

// Search
dom.searchBtn.addEventListener('click', () => {
  const city = dom.searchInput.value.trim();
  if (city) loadWeather(city);
});

dom.searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const city = dom.searchInput.value.trim();
    if (city) loadWeather(city);
  }
});

// Geolocation
dom.locationBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    showError('Geolocation is not supported by your browser.');
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => loadWeather({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
    () => showError('Location access denied. Please search manually.'),
  );
});

// Unit toggle
dom.unitToggle.addEventListener('click', () => {
  state.unit = state.unit === 'metric' ? 'imperial' : 'metric';
  dom.unitToggle.textContent = state.unit === 'metric' ? '°C' : '°F';
  reloadLast();
});

// Retry
dom.retryBtn.addEventListener('click', reloadLast);

// =============================================
//  INIT
// =============================================

(function init() {
  // Check for API key placeholder
  if (API_KEY === 'YOUR_API_KEY_HERE') {
    showError('API key not set — open script.js line 8 and paste your OpenWeatherMap API key.');
    return;
  }
  loadWeather(state.lastCity);
})();
