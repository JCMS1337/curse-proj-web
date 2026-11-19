/**
 * Модуль каталога площадок и интерактивной карты Leaflet (CARTO Positron).
 */

let map = null;
let markers = [];
let allVenues = [];

// Границы Новосибирска (чужие регионы и страны заблокированы)
const NSK_BOUNDS = [
  [54.80, 82.60], // Юго-запад
  [55.20, 83.30]  // Северо-восток
];
const NSK_CENTER = [55.03, 82.92];

document.addEventListener('DOMContentLoaded', async () => {
  initMap();
  await loadSportTypes();
  parseUrlFilters();
  setupFilterListeners();
  await fetchVenues();
});

// Инициализация интерактивной карты Leaflet с подложкой CARTO Positron
function initMap() {
  map = L.map('map', {
    center: NSK_CENTER,
    zoom: 11,
    minZoom: 10,
    maxBounds: NSK_BOUNDS,
    maxBoundsViscosity: 1.0,
    zoomControl: true,
  });

  // Нейтральная неполитическая подложка CARTO Positron (без флагов и внешних спорных обозначений)
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd',
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  }).addTo(map);
}

// Загрузка списка видов спорта для селекта
async function loadSportTypes() {
  try {
    const res = await api.get('/sport-types');
    const select = document.getElementById('filter-sport');
    if (res.data) {
      res.data.forEach((st) => {
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

// Чтение параметров URL
function parseUrlFilters() {
  const params = new URLSearchParams(window.location.search);
  const search = params.get('search');
  const sportTypeId = params.get('sport_type_id');
  const bank = params.get('bank');
  const district = params.get('district');

  if (search) document.getElementById('filter-search').value = search;
  if (sportTypeId) document.getElementById('filter-sport').value = sportTypeId;
  if (bank) document.getElementById('filter-bank').value = bank;
  if (district) document.getElementById('filter-district').value = district;
}

// Слушатели событий изменения фильтров
function setupFilterListeners() {
  const searchInput = document.getElementById('filter-search');
  const sportSelect = document.getElementById('filter-sport');
  const bankSelect = document.getElementById('filter-bank');
  const districtSelect = document.getElementById('filter-district');
  const lightingCheck = document.getElementById('filter-lighting');
  const fenceCheck = document.getElementById('filter-fence');
  const resetBtn = document.getElementById('filter-reset');

  let debounceTimer;
  searchInput?.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(fetchVenues, 300);
  });

  sportSelect?.addEventListener('change', fetchVenues);
  bankSelect?.addEventListener('change', fetchVenues);
  districtSelect?.addEventListener('change', fetchVenues);
  lightingCheck?.addEventListener('change', fetchVenues);
  fenceCheck?.addEventListener('change', fetchVenues);

  resetBtn?.addEventListener('click', () => {
    searchInput.value = '';
    sportSelect.value = '';
    bankSelect.value = '';
    districtSelect.value = '';
    lightingCheck.checked = false;
    fenceCheck.checked = false;
    window.history.replaceState({}, '', '/venues.html');
    fetchVenues();
  });
}

// Загрузка площадок с сервера
async function fetchVenues() {
  const search = document.getElementById('filter-search')?.value.trim() || '';
  const sportTypeId = document.getElementById('filter-sport')?.value || '';
  const bank = document.getElementById('filter-bank')?.value || '';
  const district = document.getElementById('filter-district')?.value || '';
  const lighting = document.getElementById('filter-lighting')?.checked;
  const fence = document.getElementById('filter-fence')?.checked;

  const params = {};
  if (search) params.search = search;
  if (sportTypeId) params.sport_type_id = sportTypeId;
  if (bank) params.bank = bank;
  if (district) params.district = district;
  if (lighting) params.has_lighting = 'true';
  if (fence) params.has_fence = 'true';

  const listContainer = document.getElementById('venues-list');
  const countBadge = document.getElementById('venues-count-badge');

  listContainer.innerHTML = `
    <div class="p-8 text-center text-slate-400 text-xs">
      <div class="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#16a34a] border-t-transparent mb-2"></div>
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
      <div class="p-8 text-center text-red-500 text-xs">
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
      <div class="p-8 text-center text-slate-400 text-xs">
        <svg class="w-12 h-12 mx-auto text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Площадок по выбранным фильтрам не найдено.
      </div>
    `;
    return;
  }

  container.innerHTML = venues
    .map(
      (v) => `
    <div id="venue-card-${v.id}" class="venue-card p-3 rounded-xl border border-[#d1fae5] hover:border-[#16a34a] hover:shadow-sm bg-white transition cursor-pointer flex gap-3" onclick="focusOnVenue(${v.id})">
      <div class="w-24 h-24 rounded-lg bg-[#f0fdf4] flex-shrink-0 overflow-hidden relative border border-slate-100">
        <img src="${v.main_photo_url || '/img/venues/football_1.svg'}" 
             alt="${escapeHtml(v.name)}" 
             class="w-full h-full object-cover">
        ${v.has_lighting ? `<span class="absolute bottom-1 right-1 p-1 bg-amber-500 text-white rounded text-[9px]" title="Освещение">💡</span>` : ''}
      </div>

      <div class="flex-grow flex flex-col justify-between overflow-hidden">
        <div>
          <div class="flex items-center gap-1.5 mb-1 flex-wrap">
            <span class="px-2 py-0.5 text-[10px] font-bold bg-[#dcfce7] text-[#166534] rounded-md">
              ${escapeHtml(v.sport_type_name || v.sport_type)}
            </span>
            <span class="px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 rounded-md">
              ${v.bank === 'left' ? 'Левый берег' : 'Правый берег'}
            </span>
            ${v.district ? `<span class="text-[10px] text-slate-400 font-medium">${escapeHtml(v.district)} р-н</span>` : ''}
          </div>
          <h4 class="font-bold text-slate-900 text-xs leading-snug line-clamp-1">${escapeHtml(v.name)}</h4>
          <p class="text-[11px] text-slate-500 line-clamp-1 mt-0.5">${escapeHtml(v.address)}</p>
        </div>

        <div class="flex items-center justify-between pt-2 border-t border-slate-100 mt-1">
          <span class="text-[10px] text-slate-500 font-medium">${escapeHtml(v.surface_type || 'Стандартное')}</span>
          <a href="/venue.html?id=${v.id}" class="px-3 py-1 text-xs font-semibold bg-[#16a34a] hover:bg-[#15803d] text-white rounded-lg transition" onclick="event.stopPropagation()">
            Забронировать
          </a>
        </div>
      </div>
    </div>
  `
    )
    .join('');
}

// Отображение зеленых маркеров на карте
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

    // Стильный зеленый маркер SportBook
    const icon = L.divIcon({
      className: 'sportbook-venue-pin',
      html: `
        <div style="background-color: #16a34a; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.25); border: 2.5px solid white; cursor: pointer; transition: transform 0.15s ease;">
          <svg style="width: 16px; height: 16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16],
    });

    const marker = L.marker([lat, lng], { icon }).addTo(map);

    const bankLabel = v.bank === 'left' ? 'Левый берег' : 'Правый берег';
    const popupContent = `
      <div style="width: 250px; font-family: inherit;">
        <img src="${v.main_photo_url || '/img/venues/football_1.svg'}" 
             style="width: 100%; height: 120px; object-fit: cover;">
        <div style="padding: 12px;">
          <div style="display: flex; gap: 4px; margin-bottom: 6px;">
            <span style="font-size: 10px; background: #dcfce7; color: #166534; font-weight: 700; padding: 2px 6px; border-radius: 4px;">
              ${escapeHtml(v.sport_type_name || v.sport_type)}
            </span>
            <span style="font-size: 10px; background: #f1f5f9; color: #475569; font-weight: 600; padding: 2px 6px; border-radius: 4px;">
              ${bankLabel}
            </span>
          </div>
          <h4 style="margin: 0 0 4px 0; font-weight: bold; font-size: 13px; color: #0f172a; line-height: 1.3;">${escapeHtml(v.name)}</h4>
          <p style="margin: 0 0 10px 0; font-size: 11px; color: #64748b;">${escapeHtml(v.address)}</p>
          <a href="/venue.html?id=${v.id}" 
             style="display: block; text-align: center; background: #16a34a; color: white; padding: 7px 12px; border-radius: 8px; text-decoration: none; font-size: 11px; font-weight: 700;">
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

  // Автоматическая подгонка границ карты под отфильтрованные маркеры
  if (latLngs.length > 0) {
    const bounds = L.latLngBounds(latLngs);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }
}

// Фокусировка на площадке при клике на карточку
function focusOnVenue(venueId) {
  const venue = allVenues.find((v) => v.id === venueId);
  const marker = markers.find((m) => m.venueId === venueId);

  if (venue && marker) {
    map.setView([parseFloat(venue.latitude), parseFloat(venue.longitude)], 14, { animate: true });
    marker.openPopup();
    highlightVenueCard(venueId);
  }
}

function highlightVenueCard(venueId) {
  document.querySelectorAll('.venue-card').forEach((c) => {
    c.classList.remove('ring-2', 'ring-[#16a34a]', 'bg-[#f0fdf4]');
  });
  const activeCard = document.getElementById(`venue-card-${venueId}`);
  if (activeCard) {
    activeCard.classList.add('ring-2', 'ring-[#16a34a]', 'bg-[#f0fdf4]');
    activeCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}
