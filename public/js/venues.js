/**
 * Модуль каталога площадок и интерактивной карты Leaflet.
 * Основная подложка: OpenStreetMap (с флагом referrerPolicy: 'origin').
 * Резервная подложка: Esri World Street Map (автоматический переход при 5 ошибках подряд).
 * Кластеризация меток: Leaflet.markercluster в зелёной гамме SportBook.
 */

let map = null;
let mainTileLayer = null;
let fallbackTileLayer = null;
let tileErrorCount = 0;
let isUsingFallback = false;
let markerClusterGroup = null;
let markers = [];
let allVenues = [];

// Границы Новосибирска (чужие регионы и страны заблокированы)
const NSK_BOUNDS = [
  [54.80, 82.60], // Юго-запад
  [55.20, 83.30], // Северо-восток
];
const NSK_CENTER = [55.03, 82.92];

document.addEventListener('DOMContentLoaded', async () => {
  initMap();
  await loadSportTypes();
  parseUrlFilters();
  setupFilterListeners();
  await fetchVenues();
});

// Инициализация интерактивной карты Leaflet
function initMap() {
  map = L.map('map', {
    center: NSK_CENTER,
    zoom: 11,
    minZoom: 10,
    maxBounds: NSK_BOUNDS,
    maxBoundsViscosity: 1.0,
    zoomControl: true,
    attributionControl: false, // Отключаем стандартный контрол Leaflet с флагом
  });

  // Собственный контрол атрибуции без префикса (без флага)
  L.control.attribution({ prefix: false }).addTo(map);

  // Основная подложка: OpenStreetMap
  mainTileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">участники OpenStreetMap</a>',
    referrerPolicy: 'origin',
  });

  // Обработка 5 ошибок подряд с переключением на Esri World Street Map
  mainTileLayer.on('tileerror', () => {
    tileErrorCount++;
    if (tileErrorCount >= 5 && !isUsingFallback) {
      isUsingFallback = true;
      console.warn('Основная подложка OpenStreetMap недоступна (5 ошибок подряд). Переключение на резервную подложку Esri World Street Map.');
      map.removeLayer(mainTileLayer);

      fallbackTileLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri',
      });
      fallbackTileLayer.addTo(map);
    }
  });

  mainTileLayer.on('tileload', () => {
    tileErrorCount = 0;
  });

  mainTileLayer.addTo(map);

  // Инициализация кластеризатора маркеров в фирменной зелёной палитре
  markerClusterGroup = L.markerClusterGroup({
    showCoverageOnHover: false,
    maxClusterRadius: 40,
    spiderfyOnMaxZoom: true,
    zoomToBoundsOnClick: true,
    iconCreateFunction: function (cluster) {
      const count = cluster.getChildCount();
      let sizeClass = 'marker-cluster-small';
      if (count > 8) sizeClass = 'marker-cluster-medium';
      if (count > 20) sizeClass = 'marker-cluster-large';
      return new L.DivIcon({
        html: `<div><span>${count}</span></div>`,
        className: `marker-cluster ${sizeClass}`,
        iconSize: new L.Point(40, 40),
      });
    },
  });

  map.addLayer(markerClusterGroup);
}

// Загрузка списка видов спорта для селекта
async function loadSportTypes() {
  try {
    const res = await api.get('/sport-types');
    const select = document.getElementById('filter-sport');
    const sportTypes = res.data?.data || res.data || [];
    sportTypes.forEach((st) => {
      const opt = document.createElement('option');
      opt.value = st.id;
      opt.textContent = st.name;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error('Ошибка загрузки видов спорта:', err);
  }
}

// Считывание параметров фильтра из URL
function parseUrlFilters() {
  const params = new URLSearchParams(window.location.search);
  const sportTypeId = params.get('sport_type_id');
  const search = params.get('search');
  const bank = params.get('bank');
  const district = params.get('district');

  if (sportTypeId) {
    const select = document.getElementById('filter-sport');
    if (select) select.value = sportTypeId;
  }
  if (search) {
    const input = document.getElementById('filter-search');
    if (input) input.value = search;
  }
  if (bank) {
    const select = document.getElementById('filter-bank');
    if (select) select.value = bank;
  }
  if (district) {
    const select = document.getElementById('filter-district');
    if (select) select.value = district;
  }
}

// Настройка слушателей событий на фильтрах
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
    if (searchInput) searchInput.value = '';
    if (sportSelect) sportSelect.value = '';
    if (bankSelect) bankSelect.value = '';
    if (districtSelect) districtSelect.value = '';
    if (lightingCheck) lightingCheck.checked = false;
    if (fenceCheck) fenceCheck.checked = false;
    window.history.replaceState({}, '', window.location.pathname);
    fetchVenues();
  });
}

// Запрос площадок с бэкенда с учетом фильтров
async function fetchVenues() {
  const search = document.getElementById('filter-search')?.value.trim();
  const sport_type_id = document.getElementById('filter-sport')?.value;
  const bank = document.getElementById('filter-bank')?.value;
  const district = document.getElementById('filter-district')?.value;
  const has_lighting = document.getElementById('filter-lighting')?.checked;
  const has_fence = document.getElementById('filter-fence')?.checked;

  const params = {};
  if (search) params.search = search;
  if (sport_type_id) params.sport_type_id = sport_type_id;
  if (bank) params.bank = bank;
  if (district) params.district = district;
  if (has_lighting) params.has_lighting = true;
  if (has_fence) params.has_fence = true;

  try {
    const res = await api.get('/venues', { params });
    allVenues = res.data || [];

    // Обновляем счетчик
    const badge = document.getElementById('venues-count-badge');
    if (badge) badge.textContent = allVenues.length;

    renderVenuesList(allVenues);
    renderMapMarkers(allVenues);
  } catch (err) {
    console.error('Ошибка загрузки площадок:', err);
    document.getElementById('venues-list').innerHTML = `
      <div class="p-8 text-center text-red-500 text-xs">
        Не удалось загрузить данные площадок. Попробуйте обновить страницу.
      </div>
    `;
  }
}

// Определение SVG-иконки для маркера по виду спорта
function getSportMarkerConfig(sportName, sportTypeId) {
  const s = (sportName || '').toLowerCase();
  const id = parseInt(sportTypeId, 10);

  if (id === 1 || s.includes('футбол')) {
    return {
      bg: '#16a34a',
      shape: 'border-radius: 50%;',
      svg: `<svg style="width: 16px; height: 16px;" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polygon points="12 7 15 10 14 14 10 14 9 10"/></svg>`,
    };
  }
  if (id === 2 || s.includes('баскетбол')) {
    return {
      bg: '#15803d',
      shape: 'border-radius: 8px;',
      svg: `<svg style="width: 16px; height: 16px;" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2"><circle cx="12" cy="12" r="9"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="12" y1="3" x2="12" y2="21"/><path d="M5.5 5.5c4 4 4 9 0 13"/><path d="M18.5 5.5c-4 4-4 9 0 13"/></svg>`,
    };
  }
  if (id === 3 || s.includes('волейбол')) {
    return {
      bg: '#166534',
      shape: 'border-radius: 50%;',
      svg: `<svg style="width: 16px; height: 16px;" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 7.8 4.5"/><path d="M12 12l6.8-4.5"/><path d="M12 12v9"/><path d="M12 12L4.2 7.5"/></svg>`,
    };
  }
  if (id === 4 || s.includes('универсальн')) {
    return {
      bg: '#059669',
      shape: 'border-radius: 6px; transform: rotate(45deg);',
      svgStyle: 'transform: rotate(-45deg);',
      svg: `<svg style="width: 16px; height: 16px;" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2"><rect x="3" y="3" width="18" height="18" rx="4"/><line x1="12" y1="3" x2="12" y2="21"/><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="6"/></svg>`,
    };
  }
  // Легкая атлетика
  return {
    bg: '#047857',
    shape: 'border-radius: 12px;',
    svg: `<svg style="width: 16px; height: 16px;" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2"><path d="M13 4a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="m4 17 3-3 3 2 4-5-2-4 4-2"/><path d="m14 13 3 4 3-1"/><path d="m7 21 3-4"/></svg>`,
  };
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
    .map((v) => {
      const sportName = v.sport_type_name || v.sport_type;
      const bankLabel = v.bank === 'left' ? 'Левый берег' : 'Правый берег';
      const fallbackUrl = `/img/venues/${getSportFolder(v.sport_type_id)}/1.svg`;

      return `
    <div id="venue-card-${v.id}" class="venue-card p-3 rounded-xl border border-[#d1fae5] hover:border-[#16a34a] hover:shadow-sm bg-white transition cursor-pointer flex gap-3" onclick="focusOnVenue(${v.id})">
      <div class="w-28 flex-shrink-0 overflow-hidden rounded-lg bg-[#f0fdf4]" style="aspect-ratio: 4/3;">
        <img src="${v.main_photo_url || fallbackUrl}" 
             alt="Иллюстративное фото: ${escapeHtml(v.name)}" 
             loading="lazy"
             width="112"
             height="84"
             onerror="this.onerror=null; this.src='${fallbackUrl}';"
             class="w-full h-full object-cover">
      </div>

      <div class="flex-grow flex flex-col justify-between overflow-hidden">
        <div>
          <div class="flex items-center gap-1.5 mb-1 flex-wrap">
            <span class="px-2 py-0.5 text-[10px] font-bold bg-[#dcfce7] text-[#166534] rounded-md">
              ${escapeHtml(sportName)}
            </span>
            <span class="px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 rounded-md">
              ${bankLabel}
            </span>
            ${v.district ? `<span class="text-[10px] text-slate-400 font-medium">${escapeHtml(v.district)} р-н</span>` : ''}
            ${v.has_lighting ? `<span class="px-1.5 py-0.5 text-[10px] font-semibold bg-[#dcfce7] text-[#166534] rounded-md flex items-center gap-1"><span>💡</span> Освещение</span>` : ''}
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
  `;
    })
    .join('');
}

// Отображение маркеров с кластеризацией на карте
function renderMapMarkers(venues) {
  markerClusterGroup.clearLayers();
  markers = [];

  if (venues.length === 0) return;

  const latLngs = [];

  venues.forEach((v) => {
    const lat = parseFloat(v.latitude);
    const lng = parseFloat(v.longitude);

    if (isNaN(lat) || isNaN(lng)) return;

    latLngs.push([lat, lng]);

    const cfg = getSportMarkerConfig(v.sport_type_name || v.sport_type, v.sport_type_id);
    const fallbackUrl = `/img/venues/${getSportFolder(v.sport_type_id)}/1.svg`;

    const icon = L.divIcon({
      className: 'sportbook-venue-pin',
      html: `
        <div style="background-color: ${cfg.bg}; color: white; width: 32px; height: 32px; ${cfg.shape} display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.25); border: 2.5px solid white; cursor: pointer; transition: transform 0.15s ease;">
          <div style="${cfg.svgStyle || ''} display: flex; align-items: center; justify-content: center;">
            ${cfg.svg}
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16],
    });

    const marker = L.marker([lat, lng], { icon });

    const bankLabel = v.bank === 'left' ? 'Левый берег' : 'Правый берег';
    const popupContent = `
      <div style="width: 250px; font-family: inherit;">
        <img src="${v.main_photo_url || fallbackUrl}" 
             alt="${escapeHtml(v.name)}"
             onerror="this.onerror=null; this.src='${fallbackUrl}';"
             style="width: 100%; height: 130px; object-fit: cover; aspect-ratio: 4/3; display: block;">
        <div style="padding: 12px;">
          <div style="display: flex; gap: 4px; margin-bottom: 6px; flex-wrap: wrap;">
            <span style="font-size: 10px; background: #dcfce7; color: #166534; font-weight: 700; padding: 2px 6px; border-radius: 4px;">
              ${escapeHtml(v.sport_type_name || v.sport_type)}
            </span>
            <span style="font-size: 10px; background: #f1f5f9; color: #475569; font-weight: 600; padding: 2px 6px; border-radius: 4px;">
              ${bankLabel}
            </span>
            ${v.has_lighting ? `<span style="font-size: 10px; background: #dcfce7; color: #166534; font-weight: 600; padding: 2px 6px; border-radius: 4px;">💡 Свет</span>` : ''}
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
    markerClusterGroup.addLayer(marker);
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
    if (markerClusterGroup && markerClusterGroup.hasLayer(marker)) {
      markerClusterGroup.zoomToShowLayer(marker, () => {
        marker.openPopup();
      });
    } else {
      map.setView([parseFloat(venue.latitude), parseFloat(venue.longitude)], 15, { animate: true });
      marker.openPopup();
    }
    highlightVenueCard(venueId);
  }
}

// Подсветка карточки при клике на маркер
function highlightVenueCard(venueId) {
  document.querySelectorAll('.venue-card').forEach((c) => {
    c.classList.remove('card-highlighted', 'ring-2', 'ring-[#16a34a]', 'bg-[#f0fdf4]');
  });
  const activeCard = document.getElementById(`venue-card-${venueId}`);
  if (activeCard) {
    activeCard.classList.add('card-highlighted');
    activeCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// Вспомогательная функция определения папки по ID вида спорта
function getSportFolder(sportTypeId) {
  const id = parseInt(sportTypeId, 10);
  switch (id) {
    case 1: return 'football';
    case 2: return 'basketball';
    case 3: return 'volleyball';
    case 4: return 'universal';
    case 5: return 'athletics';
    default: return 'football';
  }
}
