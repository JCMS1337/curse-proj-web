/**
 * Модуль карточки площадки, календаря доступности и формы бронирования.
 */

let venueId = null;
let currentVenue = null;
let currentAvailability = null;
let selectedDateStr = null;

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  venueId = parseInt(params.get('id'), 10);

  if (!venueId || isNaN(venueId)) {
    showError('Ошибка', 'Не указан идентификатор площадки').then(() => {
      window.location.href = '/venues.html';
    });
    return;
  }

  // Настройка даты по умолчанию (сегодня в формате YYYY-MM-DD)
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  selectedDateStr = `${yyyy}-${mm}-${dd}`;

  const datePicker = document.getElementById('schedule-date-picker');
  datePicker.value = selectedDateStr;
  datePicker.min = selectedDateStr;

  datePicker.addEventListener('change', (e) => {
    selectedDateStr = e.target.value;
    loadAvailability();
  });

  // Автозаполнение организации текущего пользователя
  const user = getUser();
  const orgInput = document.getElementById('book-organization');
  if (user && orgInput) {
    orgInput.value = user.organization_name || 'Индивидуальный тренер / без ОУ';
  } else if (orgInput) {
    orgInput.value = 'Требуется авторизация в системе';
  }

  // Обработка отправки формы бронирования
  document.getElementById('booking-form')?.addEventListener('submit', handleBookingSubmit);

  await loadVenueDetails();
  await loadAvailability();
});

// Загрузка детальной информации о площадке
async function loadVenueDetails() {
  try {
    const res = await api.get(`/venues/${venueId}`);
    currentVenue = res.data;

    document.getElementById('venue-loading').classList.add('hidden');
    document.getElementById('venue-content').classList.remove('hidden');

    // Хлебные крошки и заголовки
    document.getElementById('breadcrumb-venue-name').textContent = currentVenue.name;
    document.getElementById('venue-title').textContent = currentVenue.name;
    document.getElementById('venue-address').innerHTML = `
      <svg class="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      ${escapeHtml(currentVenue.address)}
    `;
    document.getElementById('venue-sport-badge').textContent = currentVenue.sport_type_name;

    // Параметры
    document.getElementById('venue-dimensions').textContent = currentVenue.dimensions || 'Не указаны';
    document.getElementById('venue-surface').textContent = currentVenue.surface_type || 'Стандартное';
    document.getElementById('venue-lighting').textContent = currentVenue.has_lighting ? 'Есть (мачтовое/LED)' : 'Отсутствует';
    document.getElementById('venue-fence').textContent = currentVenue.has_fence ? 'Есть по периметру' : 'Открытая зона';
    document.getElementById('venue-description').textContent = currentVenue.description || 'Описание отсутствует.';

    // Галерея фото
    const photos = currentVenue.photos && currentVenue.photos.length > 0
      ? currentVenue.photos
      : [{ photo_url: 'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?auto=format&fit=crop&w=1000&q=80' }];

    const mainPhoto = document.getElementById('main-photo');
    mainPhoto.src = photos[0].photo_url;

    const thumbContainer = document.getElementById('thumbnails-container');
    thumbContainer.innerHTML = photos.map((p, idx) => `
      <button type="button" class="w-20 h-14 rounded-lg overflow-hidden border-2 flex-shrink-0 transition ${idx === 0 ? 'border-blue-600 ring-2 ring-blue-100' : 'border-transparent hover:border-slate-300'}"
              onclick="selectPhoto('${p.photo_url}', this)">
        <img src="${p.photo_url}" class="w-full h-full object-cover">
      </button>
    `).join('');

    // Оборудование
    const eqGrid = document.getElementById('equipment-grid');
    if (currentVenue.equipment && currentVenue.equipment.length > 0) {
      eqGrid.innerHTML = currentVenue.equipment.map(eq => `
        <div class="p-3.5 rounded-xl border border-slate-100 bg-slate-50 flex flex-col justify-between">
          <span class="font-bold text-slate-800 text-xs">${escapeHtml(eq.name)}</span>
          <div class="mt-2 flex items-center justify-between text-[11px]">
            <span class="text-slate-500 font-medium">Кол-во: <b class="text-slate-700">${eq.quantity}</b></span>
            <span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium">${escapeHtml(eq.condition)}</span>
          </div>
        </div>
      `).join('');
    } else {
      eqGrid.innerHTML = `<div class="col-span-4 text-xs text-slate-400">Сведения об инвентаре отсутствуют.</div>`;
    }

  } catch (err) {
    document.getElementById('venue-loading').innerHTML = `
      <div class="text-red-500 text-sm">Не удалось загрузить данные площадки: ${escapeHtml(err.error || err.message)}</div>
    `;
  }
}

function selectPhoto(url, btn) {
  document.getElementById('main-photo').src = url;
  document.querySelectorAll('#thumbnails-container button').forEach(b => {
    b.classList.remove('border-blue-600', 'ring-2', 'ring-blue-100');
  });
  btn.classList.add('border-blue-600', 'ring-2', 'ring-blue-100');
}

// Загрузка доступности на выбранную дату
async function loadAvailability() {
  const slotsGrid = document.getElementById('slots-grid');
  slotsGrid.innerHTML = `<div class="col-span-7 text-center py-6 text-slate-400 text-xs">Загрузка слотов...</div>`;

  try {
    const from = `${selectedDateStr}T00:00:00Z`;
    const to = `${selectedDateStr}T23:59:59Z`;

    const res = await api.get(`/venues/${venueId}/availability`, { params: { from, to } });
    currentAvailability = res.data;

    renderSlotsGrid();
  } catch (err) {
    slotsGrid.innerHTML = `<div class="col-span-7 text-center py-6 text-red-500 text-xs">Ошибка загрузки расписания</div>`;
  }
}

// Построение почасовой сетки (с 08:00 до 22:00)
function renderSlotsGrid() {
  const container = document.getElementById('slots-grid');
  container.innerHTML = '';

  const bookings = currentAvailability?.bookings || [];
  const blocks = currentAvailability?.blocks || [];

  // Часы работы муниципальных площадок: 08:00 - 22:00
  for (let hour = 8; hour < 22; hour++) {
    const startHourStr = String(hour).padStart(2, '0') + ':00';
    const endHourStr = String(hour + 1).padStart(2, '0') + ':00';

    const slotStart = new Date(`${selectedDateStr}T${startHourStr}:00`);
    const slotEnd = new Date(`${selectedDateStr}T${endHourStr}:00`);

    // Проверяем пересечение с бронями
    const conflictBooking = bookings.find(b => {
      const bStart = new Date(b.start_at);
      const bEnd = new Date(b.end_at);
      return bStart < slotEnd && bEnd > slotStart;
    });

    // Проверяем пересечение с блокировками
    const conflictBlock = blocks.find(blk => {
      const blkStart = new Date(blk.start_at);
      const blkEnd = new Date(blk.end_at);
      return blkStart < slotEnd && blkEnd > slotStart;
    });

    let status = 'available';
    let label = 'Свободно';
    let info = '';

    if (conflictBlock) {
      status = 'blocked';
      label = 'Ремонт';
      info = conflictBlock.reason;
    } else if (conflictBooking) {
      status = 'booked';
      label = 'Занято';
      info = `${conflictBooking.organization_name || 'Бронь'}: ${conflictBooking.purpose}`;
    }

    const slotEl = document.createElement('div');
    slotEl.className = `time-slot p-2.5 rounded-xl border text-center transition flex flex-col justify-between min-h-[70px] ${
      status === 'available'
        ? 'available bg-emerald-50/70 border-emerald-200 text-emerald-800 hover:bg-emerald-100 hover:border-emerald-300 cursor-pointer'
        : status === 'blocked'
        ? 'bg-amber-50 border-amber-200 text-amber-800 cursor-not-allowed opacity-90'
        : 'bg-red-50 border-red-200 text-red-800 cursor-not-allowed opacity-90'
    }`;

    slotEl.title = info || `${startHourStr} - ${endHourStr}: Свободно для бронирования`;

    slotEl.innerHTML = `
      <span class="text-xs font-bold">${startHourStr} - ${endHourStr}</span>
      <span class="text-[10px] font-semibold mt-1 px-1.5 py-0.5 rounded ${
        status === 'available' ? 'bg-emerald-200/60' : status === 'blocked' ? 'bg-amber-200/60' : 'bg-red-200/60'
      }">
        ${label}
      </span>
      ${info ? `<span class="text-[9px] truncate mt-0.5 block text-slate-500">${escapeHtml(info)}</span>` : ''}
    `;

    if (status === 'available') {
      slotEl.onclick = () => selectSlot(startHourStr, endHourStr, slotEl);
    }

    container.appendChild(slotEl);
  }
}

// Выбор временного интервала кликом по слоту
function selectSlot(startHour, endHour, el) {
  document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
  el.classList.add('selected');

  document.getElementById('book-start-time').value = startHour;
  document.getElementById('book-end-time').value = endHour;

  // Плавный скролл к форме
  document.getElementById('booking-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Отправка заявки на бронирование
async function handleBookingSubmit(e) {
  e.preventDefault();

  if (!isAuthenticated()) {
    Swal.fire({
      icon: 'info',
      title: 'Требуется авторизация',
      text: 'Для бронирования муниципальной площадки необходимо войти в систему под учетной записью учителя или тренера.',
      showCancelButton: true,
      confirmButtonText: 'Войти в систему',
      cancelButtonText: 'Отмена',
      confirmButtonColor: '#2563eb',
    }).then((res) => {
      if (res.isConfirmed) {
        window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
      }
    });
    return;
  }

  const startTime = document.getElementById('book-start-time').value;
  const endTime = document.getElementById('book-end-time').value;
  const purpose = document.getElementById('book-purpose').value.trim();
  const participantsCount = parseInt(document.getElementById('book-participants').value, 10);

  if (!startTime || !endTime || !purpose || isNaN(participantsCount)) {
    showError('Заполните все поля', 'Пожалуйста, укажите время начала, окончания, цель и количество участников.');
    return;
  }

  const startAt = new Date(`${selectedDateStr}T${startTime}:00`).toISOString();
  const endAt = new Date(`${selectedDateStr}T${endTime}:00`).toISOString();

  if (new Date(endAt) <= new Date(startAt)) {
    showError('Некорректное время', 'Время окончания должно быть строго позже времени начала.');
    return;
  }

  const submitBtn = document.getElementById('submit-booking-btn');
  const originalBtnText = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = `
    <span class="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></span>
    Отправка заявки...
  `;

  try {
    const res = await api.post('/bookings', {
      venue_id: venueId,
      start_at: startAt,
      end_at: endAt,
      purpose,
      participants_count: participantsCount,
    });

    await Swal.fire({
      icon: 'success',
      title: 'Площадка забронирована!',
      html: `
        <p class="text-sm text-slate-600 mb-2">Ваша заявка успешно зарегистрирована в системе.</p>
        <p class="text-xs text-slate-500">Дата: <b>${selectedDateStr}</b>, время: <b>${startTime} - ${endTime}</b></p>
      `,
      confirmButtonText: 'Перейти в личный кабинет',
      showCancelButton: true,
      cancelButtonText: 'Остаться здесь',
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#94a3b8',
    }).then((action) => {
      if (action.isConfirmed) {
        window.location.href = '/cabinet.html';
      } else {
        loadAvailability();
      }
    });

  } catch (err) {
    showError('Не удалось забронировать', err.error || 'Произошла ошибка при сохранении бронирования.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnText;
  }
}
