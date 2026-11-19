/**
 * Клиентский модуль API и авторизации.
 * Предоставляет настроенный экземпляр Axios с автоматической подстановкой JWT токена,
 * вспомогательные методы проверки авторизации и отображения уведомлений SweetAlert2.
 */

// Базовый URL для запросов к REST API
const API_BASE = '/api';

// Экземпляр Axios
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Перехватчик запросов: добавление токена авторизации
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('sport_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Перехватчик ответов: перехват 401 и единая обработка ошибок
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response) {
      // Истек токен или неавторизован
      if (error.response.status === 401) {
        const isAuthPage = window.location.pathname.includes('login.html');
        if (!isAuthPage && (window.location.pathname.includes('cabinet.html') || window.location.pathname.includes('admin.html'))) {
          clearAuth();
          window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
        }
      }
      return Promise.reject(error.response.data || error.response);
    }
    return Promise.reject({ error: 'Сервер недоступен. Проверьте подключение к сети.' });
  }
);

// Управление состоянием авторизации в localStorage
function setAuth(token, user) {
  localStorage.setItem('sport_token', token);
  localStorage.setItem('sport_user', JSON.stringify(user));
}

function getToken() {
  return localStorage.getItem('sport_token');
}

function getUser() {
  const userStr = localStorage.getItem('sport_user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch (e) {
    return null;
  }
}

function clearAuth() {
  localStorage.removeItem('sport_token');
  localStorage.removeItem('sport_user');
}

function isAuthenticated() {
  return !!getToken();
}

function hasRole(...roles) {
  const user = getUser();
  return user && roles.includes(user.role_name);
}

// Защита страницы (редирект неавторизованных)
function requireAuth(allowedRoles = []) {
  if (!isAuthenticated()) {
    window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname + window.location.search);
    return false;
  }

  if (allowedRoles.length > 0 && !hasRole(...allowedRoles)) {
    Swal.fire({
      icon: 'error',
      title: 'Доступ ограничен',
      text: 'У вашей учетной записи нет прав для просмотра данной страницы.',
      confirmButtonText: 'На главную',
    }).then(() => {
      window.location.href = '/index.html';
    });
    return false;
  }

  return true;
}

// Уведомления через SweetAlert2
function showSuccess(title, text = '') {
  return Swal.fire({
    icon: 'success',
    title,
    text,
    timer: 2500,
    showConfirmButton: false,
    customClass: { popup: 'rounded-2xl shadow-xl' }
  });
}

function showError(title, text = '') {
  return Swal.fire({
    icon: 'error',
    title,
    text,
    confirmButtonText: 'Понятно',
    confirmButtonColor: '#16a34a',
    customClass: { popup: 'rounded-2xl shadow-xl' }
  });
}

function showConfirm(title, text = '', confirmText = 'Подтвердить') {
  return Swal.fire({
    icon: 'warning',
    title,
    text,
    showCancelButton: true,
    confirmButtonColor: '#16a34a',
    cancelButtonColor: '#94a3b8',
    confirmButtonText: confirmText,
    cancelButtonText: 'Отмена',
    customClass: { popup: 'rounded-2xl shadow-xl' }
  });
}

// Обновление навигационной панели на страницах
function updateNavigation() {
  const user = getUser();
  const navAuthContainer = document.getElementById('nav-auth-container');
  const adminNavLink = document.getElementById('nav-admin-link');
  const cabinetNavLink = document.getElementById('nav-cabinet-link');

  if (adminNavLink) {
    if (user && (user.role_name === 'admin' || user.role_name === 'venue_manager')) {
      adminNavLink.classList.remove('hidden');
    } else {
      adminNavLink.classList.add('hidden');
    }
  }

  if (cabinetNavLink) {
    if (user) {
      cabinetNavLink.classList.remove('hidden');
    } else {
      cabinetNavLink.classList.add('hidden');
    }
  }

  if (navAuthContainer) {
    if (user) {
      const roleBadges = {
        teacher: 'bg-[#dcfce7] text-[#166534]',
        school_admin: 'bg-emerald-100 text-emerald-800',
        venue_manager: 'bg-amber-100 text-amber-800',
        admin: 'bg-[#166534] text-white',
      };
      const roleTitles = {
        teacher: 'Учитель',
        school_admin: 'Администрация школы',
        venue_manager: 'Управляющий',
        admin: 'Администратор',
      };

      const badgeClass = roleBadges[user.role_name] || 'bg-slate-100 text-slate-800';
      const roleTitle = roleTitles[user.role_name] || user.role_name;

      navAuthContainer.innerHTML = `
        <div class="flex items-center gap-3">
          <a href="/cabinet.html" class="flex flex-col text-right hover:opacity-80 transition">
            <span class="text-sm font-semibold text-slate-800 leading-tight">${escapeHtml(user.full_name)}</span>
            <span class="text-xs text-slate-500">${escapeHtml(user.organization_name || 'Муниципалитет')}</span>
          </a>
          <span class="px-2.5 py-0.5 text-xs font-medium rounded-full ${badgeClass}">${roleTitle}</span>
          <button id="logout-btn" class="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Выйти из системы">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      `;

      document.getElementById('logout-btn')?.addEventListener('click', () => {
        clearAuth();
        showSuccess('Вы вышли из системы').then(() => {
          window.location.href = '/index.html';
        });
      });
    } else {
      navAuthContainer.innerHTML = `
        <div class="flex items-center gap-2">
          <a href="/login.html" class="px-4 py-2 text-sm font-medium text-slate-700 hover:text-[#16a34a] transition">Вход</a>
          <a href="/login.html?tab=register" class="px-4 py-2 text-sm font-medium text-white bg-[#16a34a] hover:bg-[#15803d] rounded-lg shadow-sm transition">Регистрация</a>
        </div>
      `;
    }
  }
}

// Экранирование HTML для предотвращения XSS
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Форматирование даты и времени на русском языке
function formatDateTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Инициализация навигации при загрузке документа
document.addEventListener('DOMContentLoaded', updateNavigation);
