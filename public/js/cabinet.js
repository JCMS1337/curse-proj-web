/**
 * Модуль личного кабинета преподавателя / представителя школы.
 */

let allBookings = [];
let currentTab = 'upcoming'; // 'upcoming' или 'history'

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;

  renderUserProfile();
  setupTabs();
  setupRescheduleForm();
  await loadMyBookings();
});

// Отображение данных профиля
function renderUserProfile() {
  const user = getUser();
  if (!user) return;

  document.getElementById('user-name').textContent = user.full_name;
  document.getElementById('user-org').textContent = user.organization_name || 'Муниципальное учреждение';
  document.getElementById('user-email').textContent = user.email;
  document.getElementById('user-phone').textContent = user.phone || 'Телефон не указан';

  // Инициалы
  const parts = user.full_name.split(' ');
  const initials = parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : user.full_name.slice(0, 2).toUpperCase();
  document.getElementById('user-avatar-initials').textContent = initials;

  const roleTitles = {
    teacher: 'Учитель физкультуры / Тренер',
    school_admin: 'Администрация школы',
    venue_manager: 'Управляющий спортплощадками',
    admin: 'Системный администратор',
  };
  document.getElementById('user-role-badge').textContent = roleTitles[user.role_name] || user.role_name;
}

// Настройка переключателя вкладок
function setupTabs() {
  const tabUpcoming = document.getElementById('tab-upcoming');
  const tabHistory = document.getElementById('tab-history');

  tabUpcoming?.addEventListener('click', () => switchTab('upcoming'));
  tabHistory?.addEventListener('click', () => switchTab('history'));
}

function switchTab(tab) {
  currentTab = tab;
  const tabUpcoming = document.getElementById('tab-upcoming');
  const tabHistory = document.getElementById('tab-history');

  if (tab === 'upcoming') {
    tabUpcoming.className = 'pb-3 text-sm font-bold text-[#16a34a] border-b-2 border-[#16a34a] transition flex items-center gap-2';
    tabHistory.className = 'pb-3 text-sm font-medium text-slate-500 hover:text-slate-800 transition flex items-center gap-2';
  } else {
    tabHistory.className = 'pb-3 text-sm font-bold text-[#16a34a] border-b-2 border-[#16a34a] transition flex items-center gap-2';
    tabUpcoming.className = 'pb-3 text-sm font-medium text-slate-500 hover:text-slate-800 transition flex items-center gap-2';
  }

  renderBookingsList();
}

// Загрузка бронирований текущего пользователя
async function loadMyBookings() {
  const loadingEl = document.getElementById('bookings-loading');
  const container = document.getElementById('bookings-container');
  const emptyState = document.getElementById('empty-state');

  loadingEl.classList.remove('hidden');
  container.innerHTML = '';
  emptyState.classList.add('hidden');

  try {
    const res = await api.get('/bookings/my');
    allBookings = res.data || [];

    updateCounters();
    renderBookingsList();
  } catch (err) {
    showError('Ошибка загрузки бронирований', err.error || 'Не удалось получить список броней');
  } finally {
    loadingEl.classList.add('hidden');
  }
}

// Обновление счетчиков на вкладках
function updateCounters() {
  const now = new Date();
  const upcoming = allBookings.filter(b => b.status !== 'cancelled' && new Date(b.end_at) >= now);
  const history = allBookings.filter(b => b.status === 'cancelled' || new Date(b.end_at) < now);

  document.getElementById('count-upcoming').textContent = upcoming.length;
  document.getElementById('count-history').textContent = history.length;
}

// Отрисовка списка броней для выбранной вкладки
function renderBookingsList() {
  const container = document.getElementById('bookings-container');
  const emptyState = document.getElementById('empty-state');
  const now = new Date();

  const filtered = allBookings.filter(b => {
    const isPastOrCancelled = b.status === 'cancelled' || new Date(b.end_at) < now;
    return currentTab === 'upcoming' ? !isPastOrCancelled : isPastOrCancelled;
  });

  if (filtered.length === 0) {
    container.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  container.innerHTML = filtered.map(b => {
    const isUpcoming = b.status !== 'cancelled' && new Date(b.end_at) >= now;

    const statusBadges = {
      confirmed: '<span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">Подтверждено</span>',
      pending: '<span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">На согласовании</span>',
      cancelled: '<span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 line-through">Отменено</span>',
    };

    const startDate = new Date(b.start_at);
    const dateFormatted = startDate.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric', weekday: 'short' });
    const timeFormatted = `${formatTime(b.start_at)} — ${formatTime(b.end_at)}`;

    return `
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 transition hover:border-slate-300">
        
        <div class="flex items-start gap-4">
          <div class="w-24 aspect-[4/3] rounded-xl bg-[#f0fdf4] border border-[#d1fae5] flex-shrink-0 overflow-hidden relative">
            <img src="${b.venue_photo_url || '/img/venues/football/1.svg'}" 
                 alt="${escapeHtml(b.venue_name)}" 
                 loading="lazy"
                 width="96"
                 height="72"
                 onerror="this.onerror=null; this.src='/img/venues/football/1.svg';"
                 class="w-full h-full object-cover">
          </div>

          <div>
            <div class="flex items-center gap-2 flex-wrap mb-1">
              <span class="px-2 py-0.5 text-[10px] font-bold bg-[#dcfce7] text-[#166534] rounded-md">
                ${escapeHtml(b.sport_type_name)}
              </span>
              ${statusBadges[b.status] || ''}
              <span class="text-xs text-slate-400 font-medium">№ ${b.id}</span>
            </div>

            <h3 class="font-bold text-slate-900 text-base leading-snug">
              <a href="/venue.html?id=${b.venue_id}" class="hover:text-[#16a34a] transition">${escapeHtml(b.venue_name)}</a>
            </h3>

            <p class="text-xs text-slate-500 mt-0.5">${escapeHtml(b.venue_address)}</p>

            <div class="mt-2 text-xs text-slate-700 flex flex-wrap items-center gap-3">
              <span class="font-semibold text-[#166534] bg-[#dcfce7] px-2.5 py-1 rounded-lg">
                🗓️ ${dateFormatted}, ${timeFormatted}
              </span>
              <span class="text-slate-500">Участников: <b class="text-slate-800">${b.participants_count}</b></span>
            </div>

            <p class="text-xs text-slate-600 mt-2 bg-[#f0fdf4] p-2 rounded-lg border border-[#d1fae5] inline-block">
              <span class="font-medium text-slate-500">Цель:</span> ${escapeHtml(b.purpose)}
            </p>
          </div>
        </div>

        <!-- Кнопки управления -->
        ${isUpcoming ? `
          <div class="flex items-center gap-2 w-full md:w-auto justify-end pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
            <button onclick="openRescheduleModal(${b.id})" class="px-3.5 py-2 text-xs font-semibold text-[#166534] bg-[#dcfce7] hover:bg-emerald-200 rounded-xl transition">
              Перенести время
            </button>
            <button onclick="handleCancelBooking(${b.id})" class="px-3.5 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition">
              Отменить
            </button>
          </div>
        ` : ''}

      </div>
    `;
  }).join('');
}

// Отмена бронирования
async function handleCancelBooking(id) {
  const result = await showConfirm(
    'Отменить бронирование?',
    'Слот будет немедленно освобожден для других образовательных учреждений.',
    'Да, отменить бронь'
  );

  if (result.isConfirmed) {
    try {
      await api.delete(`/bookings/${id}`);
      showSuccess('Бронирование отменено', 'Слот снова доступен для общего выбора.');
      await loadMyBookings();
    } catch (err) {
      showError('Ошибка отмены', err.error || 'Не удалось отменить бронирование');
    }
  }
}

// Модальное окно переноса бронирования
function openRescheduleModal(id) {
  const booking = allBookings.find(b => b.id === id);
  if (!booking) return;

  document.getElementById('reschedule-booking-id').value = id;

  const startDate = new Date(booking.start_at);
  const endDate = new Date(booking.end_at);

  const yyyy = startDate.getFullYear();
  const mm = String(startDate.getMonth() + 1).padStart(2, '0');
  const dd = String(startDate.getDate()).padStart(2, '0');

  document.getElementById('reschedule-date').value = `${yyyy}-${mm}-${dd}`;
  document.getElementById('reschedule-start').value = startDate.toTimeString().slice(0, 5);
  document.getElementById('reschedule-end').value = endDate.toTimeString().slice(0, 5);

  document.getElementById('reschedule-modal').classList.remove('hidden');
}

function closeRescheduleModal() {
  document.getElementById('reschedule-modal').classList.add('hidden');
}

// Сохранение нового времени переноса
function setupRescheduleForm() {
  document.getElementById('reschedule-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('reschedule-booking-id').value;
    const dateStr = document.getElementById('reschedule-date').value;
    const startStr = document.getElementById('reschedule-start').value;
    const endStr = document.getElementById('reschedule-end').value;

    const startAt = new Date(`${dateStr}T${startStr}:00`).toISOString();
    const endAt = new Date(`${dateStr}T${endStr}:00`).toISOString();

    if (new Date(endAt) <= new Date(startAt)) {
      showError('Некорректное время', 'Время окончания должно быть позже времени начала');
      return;
    }

    const btn = document.getElementById('reschedule-submit-btn');
    btn.disabled = true;
    btn.textContent = 'Проверка слота...';

    try {
      await api.patch(`/bookings/${id}`, {
        start_at: startAt,
        end_at: endAt,
      });

      closeRescheduleModal();
      showSuccess('Время изменено', 'Бронирование успешно перенесено на новую дату и время.');
      await loadMyBookings();
    } catch (err) {
      showError('Конфликт времени', err.error || 'Не удалось перенести бронирование.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Сохранить новое время';
    }
  });
}
