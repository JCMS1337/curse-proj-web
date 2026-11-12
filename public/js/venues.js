/**
 * Модуль каталога площадок и интерактивной карты Leaflet.
 */

let map = null;
let markers = [];
let allVenues = [];

document.addEventListener('DOMContentLoaded', async () => {
  initMap();
  await loadSportTypes();
  parseUrlFilters();
  setupFilterListeners();
  await fetchVenues();
});

// Инициализация интерактивной карты Leaflet
function initMap() {
  // Центр Новосибирска (район площади Ленина)
  const nskCenter = [55.0302, 82.9204];

  map = L.map('map', {
    zoomControl: true,
  }).setView(nskCenter, 12);

  // Слой бесплатных тайлов OpenStreetMap
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);
}

// Загрузка списка видов спорта для селекта
async function loadSportTypes() {
  try {
    const res = await api.get('/auth/dictionaries');
    const select = document.getElementById('filter-sport');
    if (res.data && res.data.sport_types) {
      res.data.sport_types.forEach((st) => {
        const opt = document.createElement('option');
        opt.value = st.id;
        opt.textContent = st.name;
        select.appendChild(opt);
      });
    }
  } catch (err) {
    console.error('Ошибка загрузки видов спорта:', err);
  }
}

// Чтение параметров URL (?sport_type_id=1&search=Спартак)
function parseUrlFilters() {
  const params = new URLSearchParams(window.location.search);
  const search = params.get('search');
  const sportTypeId = params.get('sport_type_id');

  if (search) {
    document.getElementById('filter-search').value = search;
  }
  if (sportTypeId) {
    document.getElementById('filter-sport').value = sportTypeId;
  }
}

// Слушатели событий изменения фильтров
function setupFilterListeners() {
  const searchInput = document.getElementById('filter-search');
  const sportSelect = document.getElementById('filter-sport');
  const lightingCheck = document.getElementById('filter-lighting');
  const fenceCheck = document.getElementById('filter-fence');
  const resetBtn = document.getElementById('filter-reset');

  let debounceTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(fetchVenues, 300);
  });

  sportSelect.addEventListener('change', fetchVenues);
  lightingCheck.addEventListener('change', fetchVenues);
  fenceCheck.addEventListener('change', fetchVenues);

  resetBtn.addEventListener('click', () => {
    searchInput.value = '';
    sportSelect.value = '';
    lightingCheck.checked = false;
    fenceCheck.checked = false;
    window.history.replaceState({}, '', '/venues.html');
    fetchVenues();
  });
}

// Загрузка площадок с сервера
async function fetchVenues() {
  const search = document.getElementById('filter-search').value.trim();
  const sportTypeId = document.getElementById('filter-sport').value;
  const lighting = document.getElementById('filter-lighting').checked;
  const fence = document.getElementById('filter-fence').checked;

  const params = {};
  if (search) params.search = search;
  if (sportTypeId) params.sport_type_id = sportTypeId;
  if (lighting) params.has_lighting = 'true';
  if (fence) params.has_fence = 'true';

  const listContainer = document.getElementById('venues-list');
  const countBadge = document.getElementById('venues-count-badge');

  listContainer.innerHTML = `
    <div class="p-8 text-center text-slate-400 text-sm">
      <div class="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent mb-2"></div>
      <div>Поиск площадок...</div>
    </div>
  `;

  try {
    const res = await api.get('/venues', { params });
    allVenues = res.data || [];
    countBadge.textContent = allVenues.length;

    renderVenuesList(allVenues);
    renderMapMarkers(allVenues);
  } catch (err) {
    listContainer.innerHTML = `
      <div class="p-8 text-center text-red-500 text-sm">
        Ошибка при загрузке площадок. Попробуйте обновить страницу.
      </div>
    `;
  }
}

// Отображение списка карточек
function renderVenuesList(venues) {
  const container = document.getElementById('venues-list');

  if (venues.length === 0) {
    container.innerHTML = `
      <div class="p-8 text-center text-slate-400 text-sm">
        <svg class="w-12 h-12 mx-auto text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Площадок по заданным критериям не найдено. Попробуйте изменить фильтры.
      </div>
    `;
    return;
  }

  container.innerHTML = venues
    .map(
      (v) => `
    <div id="venue-card-${v.id}" class="venue-card p-3 rounded-xl border border-slate-200/80 hover:border-blue-400 hover:shadow-sm bg-white transition cursor-pointer flex gap-3.5" onclick="focusOnVenue(${v.id})">
      <div class="w-24 h-24 rounded-lg bg-slate-100 flex-shrink-0 overflow-hidden relative">
        <img src="${v.main_photo_url || 'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?auto=format&fit=crop&w=400&q=80'}" 
             alt="${escapeHtml(v.name)}" 
             class="w-full h-full object-cover">
        ${v.has_lighting ? `<span class="absolute bottom-1 right-1 p-1 bg-amber-500 text-white rounded-md text-[10px]" title="Освещение">💡</span>` : ''}
      </div>

      <div class="flex-grow flex flex-col justify-between overflow-hidden">
        <div>
          <div class="flex items-center gap-1.5 mb-1">
            <span class="px-2 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700 rounded-md">
              ${escapeHtml(v.sport_type_name)}
            </span>
            <span class="text-[11px] text-slate-400 font-medium truncate">
              ${escapeHtml(v.dimensions || '')}
            </span>
          </div>
          <h4 class="font-bold text-slate-800 text-sm leading-snug line-clamp-1">${escapeHtml(v.name)}</h4>
          <p class="text-xs text-slate-500 line-clamp-1 mt-0.5">${escapeHtml(v.address)}</p>
        </div>

        <div class="flex items-center justify-between pt-2 border-t border-slate-50 mt-1">
          <span class="text-[11px] text-slate-400 font-medium">${escapeHtml(v.surface_type || 'Покрытие стандартное')}</span>
          <a href="/venue.html?id=${v.id}" class="px-2.5 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition" onclick="event.stopPropagation()">
            Забронировать
          </a>
        </div>
      </div>
    </div>
  `
    )
    .join('');
}

// Отображение меток на карте
function renderMapMarkers(venues) {
  // Очистка старых маркеров
  markers.forEach((m) => map.removeLayer(m));
  markers = [];

  if (venues.length === 0) return;

  const latLngs = [];

  venues.forEach((v) => {
    const lat = parseFloat(v.latitude);
    const lng = parseFloat(v.longitude);

    if (isNaN(lat) || isNaN(lng)) return;

    latLngs.push([lat, lng]);

    // Кастомная иконка маркера
    const icon = L.divIcon({
      className: 'custom-venue-pin',
      html: `
        <div style="background-color: #2563eb; color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2); border: 2px solid white; cursor: pointer;">
          <svg style="width: 18px; height: 18px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
      popupAnchor: [0, -18],
    });

    const marker = L.marker([lat, lng], { icon }).addTo(map);

    const popupContent = `
      <div style="width: 250px; font-family: inherit;">
        <img src="${v.main_photo_url || 'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?auto=format&fit=crop&w=400&q=80'}" 
             style="width: 100%; height: 120px; object-fit: cover;">
        <div style="padding: 12px;">
          <span style="font-size: 11px; background: #eff6ff; color: #1d4ed8; font-weight: 600; padding: 2px 8px; border-radius: 4px;">
            ${escapeHtml(v.sport_type_name)}
          </span>
          <h4 style="margin: 6px 0 4px 0; font-weight: bold; font-size: 14px; color: #0f172a;">${escapeHtml(v.name)}</h4>
          <p style="margin: 0 0 10px 0; font-size: 12px; color: #64748b;">${escapeHtml(v.address)}</p>
          <a href="/venue.html?id=${v.id}" 
             style="display: block; text-align: center; background: #2563eb; color: white; padding: 6px 12px; border-radius: 8px; text-decoration: none; font-size: 12px; font-weight: 600;">
            Открыть карточку и бронь
          </a>
        </div>
      </div>
    `;

    marker.bindPopup(popupContent);
    marker.venueId = v.id;

    marker.on('click', () => {
      highlightVenueCard(v.id);
    });

    markers.push(marker);
  });

  // Автоматическое масштабирование под метки
  if (latLngs.length > 0) {
    map.fitBounds(L.latLngBounds(latLngs), { padding: [40, 40], maxZoom: 14 });
  }
}

// Фокусировка на площадке при клике на карточку
function focusOnVenue(venueId) {
  const venue = allVenues.find((v) => v.id === venueId);
  const marker = markers.find((m) => m.venueId === venueId);

  if (venue && marker) {
    map.setView([parseFloat(venue.latitude), parseFloat(venue.longitude)], 15, { animate: true });
    marker.openPopup();
    highlightVenueCard(venueId);
  }
}

function highlightVenueCard(venueId) {
  document.querySelectorAll('.venue-card').forEach((c) => {
    c.classList.remove('ring-2', 'ring-blue-500', 'bg-blue-50/30');
  });
  const activeCard = document.getElementById(`venue-card-${venueId}`);
  if (activeCard) {
    activeCard.classList.add('ring-2', 'ring-blue-500', 'bg-blue-50/30');
    activeCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}
