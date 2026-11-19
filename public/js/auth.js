/**
 * Модуль обработки входа и регистрации пользователей.
 */

document.addEventListener('DOMContentLoaded', async () => {
  setupTabs();
  await loadOrganizations();

  // Обработка форм
  document.getElementById('login-form')?.addEventListener('submit', handleLogin);
  document.getElementById('register-form')?.addEventListener('submit', handleRegister);

  // Проверка вкладки в URL (?tab=register)
  const params = new URLSearchParams(window.location.search);
  if (params.get('tab') === 'register') {
    switchTab('register');
  }
});

// Настройка переключателя вкладок
function setupTabs() {
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');

  tabLogin?.addEventListener('click', () => switchTab('login'));
  tabRegister?.addEventListener('click', () => switchTab('register'));
}

function switchTab(tab) {
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const loginContainer = document.getElementById('login-container');
  const registerContainer = document.getElementById('register-container');

  if (tab === 'login') {
    tabLogin.className = 'flex-1 py-3 text-sm font-bold text-[#16a34a] border-b-2 border-[#16a34a] bg-white rounded-t-xl transition';
    tabRegister.className = 'flex-1 py-3 text-sm font-medium text-slate-500 hover:text-slate-800 transition';
    loginContainer.classList.remove('hidden');
    registerContainer.classList.add('hidden');
  } else {
    tabRegister.className = 'flex-1 py-3 text-sm font-bold text-[#16a34a] border-b-2 border-[#16a34a] bg-white rounded-t-xl transition';
    tabLogin.className = 'flex-1 py-3 text-sm font-medium text-slate-500 hover:text-slate-800 transition';
    loginContainer.classList.add('hidden');
    registerContainer.classList.remove('hidden');
  }
}

// Загрузка образовательных учреждений для формы регистрации
async function loadOrganizations() {
  try {
    const res = await api.get('/auth/dictionaries');
    const orgSelect = document.getElementById('reg-organization');
    if (res.data && res.data.organizations) {
      res.data.organizations.forEach(org => {
        const opt = document.createElement('option');
        opt.value = org.id;
        opt.textContent = `${org.name} (${org.address})`;
        orgSelect.appendChild(opt);
      });
    }
  } catch (err) {
    console.error('Ошибка загрузки организаций:', err);
  }
}

// Обработка отправки формы входа
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  const btn = document.getElementById('login-submit-btn');
  btn.disabled = true;
  btn.textContent = 'Выполняется вход...';

  try {
    const res = await api.post('/auth/login', { email, password });
    setAuth(res.data.token, res.data.user);

    showSuccess('Вход выполнен', `Добро пожаловать, ${res.data.user.full_name}!`).then(() => {
      redirectAfterAuth(res.data.user);
    });
  } catch (err) {
    showError('Ошибка авторизации', err.error || 'Неверный адрес почты или пароль');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Войти';
  }
}

// Обработка отправки формы регистрации
async function handleRegister(e) {
  e.preventDefault();

  const full_name = document.getElementById('reg-fullname').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const phone = document.getElementById('reg-phone').value.trim();
  const organization_id = document.getElementById('reg-organization').value;
  const role_id = parseInt(document.getElementById('reg-role').value, 10);
  const password = document.getElementById('reg-password').value;

  const btn = document.getElementById('reg-submit-btn');
  btn.disabled = true;
  btn.textContent = 'Создание учетной записи...';

  try {
    const payload = {
      full_name,
      email,
      phone: phone || null,
      organization_id: organization_id ? parseInt(organization_id, 10) : null,
      role_id,
      password,
    };

    const res = await api.post('/auth/register', payload);
    setAuth(res.data.token, res.data.user);

    showSuccess('Регистрация завершена', 'Учетная запись успешно создана. Добро пожаловать!').then(() => {
      redirectAfterAuth(res.data.user);
    });
  } catch (err) {
    showError('Ошибка регистрации', err.error || 'Не удалось зарегистрировать пользователя');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Зарегистрироваться';
  }
}

// Быстрый демо-вход кнопками (для демонстрации)
async function quickLogin(email, password) {
  document.getElementById('login-email').value = email;
  document.getElementById('login-password').value = password;

  try {
    const res = await api.post('/auth/login', { email, password });
    setAuth(res.data.token, res.data.user);

    showSuccess('Вход выполнен', `Авторизован как: ${res.data.user.full_name} (${res.data.user.role_name})`).then(() => {
      redirectAfterAuth(res.data.user);
    });
  } catch (err) {
    showError('Ошибка быстрого входа', err.error || 'Не удалось выполнить вход');
  }
}

// Перенаправление после успешной авторизации
function redirectAfterAuth(user) {
  const params = new URLSearchParams(window.location.search);
  const redirect = params.get('redirect');

  if (redirect && redirect.startsWith('/')) {
    window.location.href = redirect;
    return;
  }

  if (user.role_name === 'admin' || user.role_name === 'venue_manager') {
    window.location.href = '/admin.html';
  } else {
    window.location.href = '/cabinet.html';
  }
}
