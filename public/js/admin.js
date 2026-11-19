/**
 * Модуль административной панели (управление бронями, площадками, блокировками и пользователями).
 */

let currentAdminTab = 'bookings';
let cachedSportTypes = [];
let cachedVenues = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth(['admin', 'venue_manager'])) return;

  await loadSportTypesForModals();
  await loadVenuesForModals();

  setupAdminForms();
  switchAdminTab('bookings');
});

// Переключение вкладок админ-панели
function switchAdminTab(tab) {
  currentAdminTab = tab;

  const tabs = ['bookings', 'venues', 'blocks', 'users'];
  tabs.forEach(t => {
    const btn = document.getElementById(`admin-tab-${t}`);
    const sec = document.getElementById(`section-${t}`);
    if (t === tab) {
      btn.className = 'pb-3 text-[#16a34a] border-b-2 border-[#16a34a] whitespace-nowrap transition';
      sec.classList.remove('hidden');
    } else {
      btn.className = 'pb-3 text-slate-500 hover:text-slate-800 whitespace-nowrap transition';
      sec.classList.add('hidden');
    }
  });

  if (tab === 'bookings') loadAdminBookings();
  if (tab === 'venues') loadAdminVenues();
  if (tab === 'blocks') loadAdminBlocks();
  if (tab === 'users') loadAdminUsers();
}

// 1. ЗАГРУЗКА И УПРАВЛЕНИЕ БРОНИРОВАНИЯМИ
async function loadAdminBookings() {
  const tbody = document.getElementById('admin-bookings-tbody');
  const countEl = document.getElementById('admin-bookings-count');
  const statusFilter = document.getElementById('admin-filter-status').value;

  tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-slate-400 text-xs">Загрузка...</td></tr>`;

  try {
    const params = {};
    if (statusFilter) params.status = statusFilter;

    const res = await api.get('/admin/bookings', { params });
    const bookings = res.data || [];
    countEl.textContent = `Всего: ${bookings.length}`;

    if (bookings.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-slate-400 text-xs">Бронирований не найдено</td></tr>`;
      return;
    }

    const statusBadges = {
      confirmed: '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Подтверждено</span>',
      pending: '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">На согласовании</span>',
      cancelled: '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 line-through">Отменено</span>',
    };

    tbody.innerHTML = bookings.map(b => `
      <tr class="hover:bg-slate-50/80 transition">
        <td class="p-3.5">
          <span class="font-bold text-slate-900 block text-xs">№ ${b.id} — ${escapeHtml(b.venue_name)}</span>
          <span class="text-[11px] text-slate-400 block">${escapeHtml(b.sport_type_name)}</span>
        </td>
        <td class="p-3.5">
          <span class="font-semibold text-slate-800 block">${escapeHtml(b.organization_name || 'Без ОУ')}</span>
          <span class="text-[11px] text-slate-500">${escapeHtml(b.user_full_name)} (${escapeHtml(b.user_email)})</span>
        </td>
        <td class="p-3.5 whitespace-nowrap">
          <span class="font-semibold text-slate-800 block">${formatDate(b.start_at)}</span>
          <span class="text-[11px] text-[#166534] font-medium">${formatTime(b.start_at)} — ${formatTime(b.end_at)}</span>
        </td>
        <td class="p-3.5">
          <span class="block truncate max-w-xs text-slate-700" title="${escapeHtml(b.purpose)}">${escapeHtml(b.purpose)}</span>
          <span class="text-[11px] text-slate-400">Участников: <b>${b.participants_count}</b></span>
        </td>
        <td class="p-3.5">
          ${statusBadges[b.status] || b.status}
        </td>
        <td class="p-3.5 text-right whitespace-nowrap">
          <div class="flex items-center justify-end gap-1.5">
            ${b.status !== 'confirmed' ? `
              <button onclick="changeBookingStatus(${b.id}, 'confirmed')" class="px-2.5 py-1 text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition" title="Подтвердить">
                ✓
              </button>
            ` : ''}
            ${b.status !== 'cancelled' ? `
              <button onclick="changeBookingStatus(${b.id}, 'cancelled')" class="px-2.5 py-1 text-[11px] font-semibold bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition" title="Отменить">
                ✕
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-red-500 text-xs">${escapeHtml(err.error || 'Ошибка')}</td></tr>`;
  }
}

async function changeBookingStatus(id, newStatus) {
  try {
    await api.patch(`/admin/bookings/${id}/status`, { status: newStatus });
    showSuccess('Статус обновлен');
    loadAdminBookings();
  } catch (err) {
    showError('Ошибка', err.error || 'Не удалось обновить статус');
  }
}

// 2. ЗАГРУЗКА И УПРАВЛЕНИЕ ПЛОЩАДКАМИ
async function loadAdminVenues() {
  const tbody = document.getElementById('admin-venues-tbody');
  tbody.innerHTML = `<tr><td colspan="8" class="p-8 text-center text-slate-400 text-xs">Загрузка...</td></tr>`;

  try {
    const res = await api.get('/admin/venues');
    const venues = res.data || [];

    if (venues.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="p-8 text-center text-slate-400 text-xs">Площадок не найдено</td></tr>`;
      return;
    }

    tbody.innerHTML = venues.map(v => `
      <tr class="hover:bg-slate-50/80 transition">
        <td class="p-3.5 font-bold text-slate-500">#${v.id}</td>
        <td class="p-3.5">
          <span class="font-bold text-slate-900 block">${escapeHtml(v.name)}</span>
          <span class="text-[11px] text-slate-400">${escapeHtml(v.dimensions || '')} • ${escapeHtml(v.surface_type || '')}</span>
        </td>
        <td class="p-3.5">
          <span class="px-2 py-0.5 rounded bg-[#dcfce7] text-[#166534] font-semibold text-[10px]">${escapeHtml(v.sport_type_name)}</span>
        </td>
        <td class="p-3.5 text-slate-600 truncate max-w-xs">
          <span>${escapeHtml(v.address)}</span>
          <span class="block text-[10px] text-slate-400">${escapeHtml(v.district || '—')} район (${v.bank === 'left' ? 'левый берег' : 'правый берег'})</span>
        </td>
        <td class="p-3.5 text-[11px] text-slate-500">
          ${v.has_lighting ? '💡 Освещение ' : ''}
          ${v.has_fence ? '🛡️ Ограждение' : ''}
        </td>
        <td class="p-3.5 font-bold text-slate-700 text-center">${v.total_bookings}</td>
        <td class="p-3.5">
          ${v.is_active 
            ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Активна</span>' 
            : '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">Скрыта</span>'}
        </td>
        <td class="p-3.5 text-right whitespace-nowrap">
          <button onclick="toggleVenueActive(${v.id}, ${v.is_active})" class="px-2.5 py-1 text-[11px] font-semibold ${v.is_active ? 'bg-amber-50 hover:bg-amber-100 text-amber-700' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'} rounded-lg transition">
            ${v.is_active ? 'Деактивировать' : 'Активировать'}
          </button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" class="p-8 text-center text-red-500 text-xs">${escapeHtml(err.error || 'Ошибка')}</td></tr>`;
  }
}

async function toggleVenueActive(id, currentActive) {
  try {
    if (currentActive) {
      await api.delete(`/admin/venues/${id}`);
    } else {
      await api.put(`/admin/venues/${id}`, { is_active: true });
    }
    showSuccess('Статус площадки изменен');
    loadAdminVenues();
  } catch (err) {
    showError('Ошибка', err.error || 'Не удалось обновить статус площадки');
  }
}

// 3. ЗАГРУЗКА И УПРАВЛЕНИЕ БЛОКИРОВКАМИ НА РЕМОНТ
async function loadAdminBlocks() {
  const tbody = document.getElementById('admin-blocks-tbody');
  tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-slate-400 text-xs">Загрузка...</td></tr>`;

  try {
    const res = await api.get('/admin/blocks');
    const blocks = res.data || [];

    if (blocks.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-slate-400 text-xs">Активных блокировок нет</td></tr>`;
      return;
    }

    tbody.innerHTML = blocks.map(b => `
      <tr class="hover:bg-slate-50/80 transition">
        <td class="p-3.5 font-bold text-slate-500">#${b.id}</td>
        <td class="p-3.5">
          <span class="font-bold text-slate-900 block">${escapeHtml(b.venue_name)}</span>
          <span class="text-[11px] text-slate-400">${escapeHtml(b.venue_address)}</span>
        </td>
        <td class="p-3.5 whitespace-nowrap">
          <span class="font-semibold text-amber-800 block">${formatDateTime(b.start_at)}</span>
          <span class="text-[11px] text-slate-500">до ${formatDateTime(b.end_at)}</span>
        </td>
        <td class="p-3.5 font-semibold text-slate-800">${escapeHtml(b.reason)}</td>
        <td class="p-3.5 text-slate-500 text-[11px]">${escapeHtml(b.note || '—')}</td>
        <td class="p-3.5 text-right whitespace-nowrap">
          <button onclick="handleDeleteBlock(${b.id})" class="px-2.5 py-1 text-[11px] font-semibold bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition">
            Снять блокировку
          </button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-red-500 text-xs">${escapeHtml(err.error || 'Ошибка')}</td></tr>`;
  }
}

async function handleDeleteBlock(id) {
  const result = await showConfirm('Снять блокировку площадки?', 'Площадка снова станет доступна для бронирования школами.');
  if (result.isConfirmed) {
    try {
      await api.delete(`/admin/blocks/${id}`);
      showSuccess('Блокировка снята');
      loadAdminBlocks();
    } catch (err) {
      showError('Ошибка', err.error || 'Не удалось удалить блокировку');
    }
  }
}

// 4. ЗАГРУЗКА СПИСКА ПОЛЬЗОВАТЕЛЕЙ
async function loadAdminUsers() {
  const tbody = document.getElementById('admin-users-tbody');
  tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-slate-400 text-xs">Загрузка...</td></tr>`;

  try {
    const res = await api.get('/admin/users');
    const users = res.data || [];

    tbody.innerHTML = users.map(u => `
      <tr class="hover:bg-slate-50/80 transition">
        <td class="p-3.5 font-bold text-slate-500">#${u.id}</td>
        <td class="p-3.5 font-bold text-slate-900">${escapeHtml(u.full_name)}</td>
        <td class="p-3.5 text-slate-600">${escapeHtml(u.email)}</td>
        <td class="p-3.5 text-slate-500">${escapeHtml(u.phone || '—')}</td>
        <td class="p-3.5">
          <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#dcfce7] text-[#166534]">
            ${escapeHtml(u.role_name)}
          </span>
        </td>
        <td class="p-3.5 text-slate-600">${escapeHtml(u.organization_name || '—')}</td>
        <td class="p-3.5 font-bold text-slate-800 text-center">${u.bookings_count}</td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-red-500 text-xs">${escapeHtml(err.error || 'Ошибка доступа к списку пользователей')}</td></tr>`;
  }
}

// ЗАГРУЗКА СПРАВОЧНИКОВ ДЛЯ МОДАЛОК
async function loadSportTypesForModals() {
  try {
    const res = await api.get('/auth/dictionaries');
    cachedSportTypes = res.data?.sport_types || [];
    const select = document.getElementById('venue-new-sport');
    if (select) {
      select.innerHTML = cachedSportTypes.map(st => `<option value="${st.id}">${escapeHtml(st.name)}</option>`).join('');
    }
  } catch (e) {}
}

async function loadVenuesForModals() {
  try {
    const res = await api.get('/venues?is_active=all');
    cachedVenues = res.data || [];
    const select = document.getElementById('block-venue-id');
    if (select) {
      select.innerHTML = cachedVenues.map(v => `<option value="${v.id}">${escapeHtml(v.name)}</option>`).join('');
    }
  } catch (e) {}
}

// МОДАЛКИ: ДОБАВЛЕНИЕ ПЛОЩАДКИ
function openCreateVenueModal() {
  document.getElementById('create-venue-modal').classList.remove('hidden');
}

function closeCreateVenueModal() {
  document.getElementById('create-venue-modal').classList.add('hidden');
}

// МОДАЛКИ: БЛОКИРОВКА ПЛОЩАДКИ
function openCreateBlockModal() {
  // Предзаполнение дат (с завтрашнего утра на 8 часов)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(8, 0, 0, 0);

  const tomorrowEnd = new Date(tomorrow);
  tomorrowEnd.setHours(16, 0, 0, 0);

  const formatLocal = (d) => {
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().slice(0, 16);
  };

  document.getElementById('block-start-at').value = formatLocal(tomorrow);
  document.getElementById('block-end-at').value = formatLocal(tomorrowEnd);

  document.getElementById('create-block-modal').classList.remove('hidden');
}

function closeCreateBlockModal() {
  document.getElementById('create-block-modal').classList.add('hidden');
}

// НАСТРОЙКА ОБРАБОТЧИКОВ ФОРМ МОДАЛОК
function setupAdminForms() {
  // Создание площадки
  document.getElementById('create-venue-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
      name: document.getElementById('venue-new-name').value.trim(),
      bank: document.getElementById('venue-new-bank').value,
      district: document.getElementById('venue-new-district').value.trim(),
      sport_type_id: parseInt(document.getElementById('venue-new-sport').value, 10),
      dimensions: document.getElementById('venue-new-dimensions').value.trim(),
      address: document.getElementById('venue-new-address').value.trim(),
      latitude: parseFloat(document.getElementById('venue-new-lat').value),
      longitude: parseFloat(document.getElementById('venue-new-lng').value),
      surface_type: document.getElementById('venue-new-surface').value.trim(),
      has_lighting: document.getElementById('venue-new-lighting').checked,
      has_fence: document.getElementById('venue-new-fence').checked,
      photos: [document.getElementById('venue-new-photo').value.trim()],
      description: document.getElementById('venue-new-desc').value.trim(),
    };

    const btn = document.getElementById('create-venue-btn');
    btn.disabled = true;

    try {
      await api.post('/admin/venues', payload);
      closeCreateVenueModal();
      showSuccess('Площадка добавлена', 'Объект успешно внесен в каталог и доступен на интерактивной карте.');
      await loadVenuesForModals();
      loadAdminVenues();
    } catch (err) {
      showError('Ошибка создания', err.error || 'Не удалось создать спортивную площадку');
    } finally {
      btn.disabled = false;
    }
  });

  // Создание блокировки на ремонт
  document.getElementById('create-block-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const venue_id = parseInt(document.getElementById('block-venue-id').value, 10);
    const start_at = new Date(document.getElementById('block-start-at').value).toISOString();
    const end_at = new Date(document.getElementById('block-end-at').value).toISOString();
    const reason = document.getElementById('block-reason').value.trim();
    const note = document.getElementById('block-note').value.trim();

    const btn = document.getElementById('create-block-btn');
    btn.disabled = true;

    try {
      await api.post('/admin/blocks', {
        venue_id,
        start_at,
        end_at,
        reason,
        note,
      });

      closeCreateBlockModal();
      showSuccess('Блокировка установлена', 'Площадка заблокирована на указанный период.');
      loadAdminBlocks();
    } catch (err) {
      showError('Конфликт блокировки', err.error || 'Не удалось установить блокировку (возможно, на этот период уже есть активные брони).');
    } finally {
      btn.disabled = false;
    }
  });
}
