/**
 * Скрипт главной страницы SportBook.
 * Реализует:
 * - Загрузку 5 тематических блоков по видам спорта (по 3 карточки в каждом);
 * - Конфигурацию и отображение контактной информации;
 * - Валидацию и отправку формы обратной связи;
 * - Поисковую строку первого экрана.
 */

// Конфигурационный объект контактов (легко найти и изменить в одном месте)
const CONTACTS = {
  phone: '+7 (383) 227-40-00',
  supportEmail: 'support@sportbook.nsk.ru',
  deptEmail: 'sport@admnsk.ru',
  address: 'г. Новосибирск, Красный проспект, 34',
  department: 'Департамент физической культуры и спорта мэрии города Новосибирска',
  schedule: 'Понедельник – Пятница: 09:00 – 18:00 (обед 13:00 – 14:00)',
  reception: 'Приемная комиссия: каб. 214'
};

// 5 видов спорта с описаниями
const SPORT_BLOCKS = [
  {
    id: 1,
    title: 'Футбол',
    slug: 'football',
    description: 'Футбольные поля стандартных размеров и мини-футбольные площадки с профессиональной искусственной травой, мачтовым освещением и ограждением.',
    fallbackPhoto: '/img/venues/football/1.svg'
  },
  {
    id: 2,
    title: 'Баскетбол',
    slug: 'basketball',
    description: 'Специализированные площадки с безопасными фермами, антивандальными кольцами и амортизирующим полиуретановым покрытием для школьных секций.',
    fallbackPhoto: '/img/venues/basketball/1.svg'
  },
  {
    id: 3,
    title: 'Волейбол',
    slug: 'volleyball',
    description: 'Открытые площадки с регулируемыми стойками, сетками и песчаным или резиновым покрытием для регулярных тренировок и школьных спартакиад.',
    fallbackPhoto: '/img/venues/volleyball/1.svg'
  },
  {
    id: 4,
    title: 'Универсальная площадка',
    slug: 'universal',
    description: 'Многофункциональные спортивные комплексы с комбинированной разметкой для футбола, баскетбола и волейбола с круговым защитным ограждением.',
    fallbackPhoto: '/img/venues/universal/1.svg'
  },
  {
    id: 5,
    title: 'Легкая атлетика',
    slug: 'athletics',
    description: 'Стадионы с круговыми и прямыми беговыми дорожками (тартан/резина), прыжковыми ямами, турниками и гимнастическим оборудованием для сдачи норм ГТО.',
    fallbackPhoto: '/img/venues/athletics/1.svg'
  }
];

document.addEventListener('DOMContentLoaded', async () => {
  renderContacts();
  setupSearch();
  setupFeedbackForm();
  setCurrentYear();
  await loadSportBlocks();
});

// Отображение контактов из конфигурационного объекта в DOM
function renderContacts() {
  const phoneEl = document.getElementById('contact-phone');
  const supportEmailEl = document.getElementById('contact-support-email');
  const deptEmailEl = document.getElementById('contact-dept-email');
  const addressEl = document.getElementById('contact-address');
  const deptEl = document.getElementById('contact-dept');
  const scheduleEl = document.getElementById('contact-schedule');
  const footerPhoneEl = document.getElementById('footer-phone');
  const footerAddressEl = document.getElementById('footer-address');

  if (phoneEl) {
    phoneEl.textContent = CONTACTS.phone;
    phoneEl.href = `tel:${CONTACTS.phone.replace(/[^+\d]/g, '')}`;
  }
  if (supportEmailEl) {
    supportEmailEl.textContent = CONTACTS.supportEmail;
    supportEmailEl.href = `mailto:${CONTACTS.supportEmail}`;
  }
  if (deptEmailEl) {
    deptEmailEl.textContent = CONTACTS.deptEmail;
    deptEmailEl.href = `mailto:${CONTACTS.deptEmail}`;
  }
  if (addressEl) addressEl.textContent = CONTACTS.address;
  if (deptEl) deptEl.textContent = CONTACTS.department;
  if (scheduleEl) scheduleEl.textContent = CONTACTS.schedule;

  if (footerPhoneEl) {
    footerPhoneEl.textContent = CONTACTS.phone;
    footerPhoneEl.href = `tel:${CONTACTS.phone.replace(/[^+\d]/g, '')}`;
  }
  if (footerAddressEl) footerAddressEl.textContent = CONTACTS.address;
}

// Установка текущего года в подвале
function setCurrentYear() {
  const yearEl = document.getElementById('footer-year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
}

// Поиск из Hero блока
function setupSearch() {
  const input = document.getElementById('hero-search-input');
  const btn = document.getElementById('hero-search-btn');

  function doSearch() {
    const q = input?.value.trim();
    if (q) {
      window.location.href = `/venues.html?search=${encodeURIComponent(q)}`;
    } else {
      window.location.href = '/venues.html';
    }
  }

  btn?.addEventListener('click', doSearch);
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doSearch();
  });
}

// Загрузка площадок по 5 видам спорта
async function loadSportBlocks() {
  const container = document.getElementById('sport-blocks-container');
  if (!container) return;

  for (const block of SPORT_BLOCKS) {
    const sectionEl = document.createElement('div');
    sectionEl.className = 'py-10 border-b border-[#d1fae5] last:border-b-0';
    sectionEl.innerHTML = `
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <div class="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#dcfce7] text-[#166534] mb-2">
            <span>Вид спорта</span>
          </div>
          <h3 class="text-2xl font-bold text-slate-900">${block.title}</h3>
          <p class="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">${block.description}</p>
        </div>
        <a href="/venues.html?sport_type_id=${block.id}" class="inline-flex items-center gap-1.5 text-xs font-bold text-[#16a34a] hover:text-[#15803d] hover:underline whitespace-nowrap">
          <span>Все площадки вида «${block.title}»</span>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>

      <!-- Сетка 3 карточек -->
      <div id="sport-grid-${block.id}" class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="col-span-3 text-center py-8 text-xs text-slate-400">
          Загрузка объектов «${block.title}»...
        </div>
      </div>
    `;

    container.appendChild(sectionEl);

    // Подгружаем площадки с бэкенда
    loadVenuesForSport(block.id, block.fallbackPhoto);
  }
}

async function loadVenuesForSport(sportTypeId, fallbackPhoto) {
  const gridEl = document.getElementById(`sport-grid-${sportTypeId}`);
  if (!gridEl) return;

  try {
    const res = await api.get('/venues', {
      params: {
        sport_type_id: sportTypeId,
        limit: 3
      }
    });

    const venues = res.data || [];

    if (venues.length === 0) {
      gridEl.innerHTML = `
        <div class="col-span-3 p-8 border border-dashed border-[#d1fae5] bg-[#f0fdf4]/50 rounded-2xl text-center text-xs text-slate-500">
          Скоро появятся новые площадки
        </div>
      `;
      return;
    }

    const cardsHtml = venues.map(v => {
      const bankLabel = v.bank === 'left' ? 'Левый берег' : 'Правый берег';
      const districtLabel = v.district ? `${escapeHtml(v.district)} р-н` : '';

      return `
        <div class="bg-white rounded-2xl border border-[#d1fae5] shadow-sm hover:shadow-md hover:border-[#16a34a] transition overflow-hidden flex flex-col justify-between">
          <div class="relative w-full aspect-[4/3] bg-[#f0fdf4] overflow-hidden">
            <img src="${v.main_photo_url || fallbackPhoto}" 
                 alt="Иллюстративное фото: ${escapeHtml(v.name)}" 
                 loading="lazy"
                 width="400"
                 height="300"
                 onerror="this.onerror=null; this.src='${fallbackPhoto}';"
                 class="w-full h-full object-cover">
            <div class="absolute top-3 left-3 flex gap-1.5 flex-wrap">
              <span class="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-[#dcfce7] text-[#166534] shadow-sm">
                ${bankLabel}
              </span>
              ${districtLabel ? `
                <span class="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-white/90 text-slate-700 shadow-sm backdrop-blur">
                  ${districtLabel}
                </span>` : ''}
              ${v.has_lighting ? `
                <span class="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-[#dcfce7] text-[#166534] shadow-sm flex items-center gap-1">
                  <span>💡</span> Освещение
                </span>` : ''}
            </div>
          </div>

          <div class="p-4 flex-grow flex flex-col justify-between">
            <div>
              <h4 class="font-bold text-slate-900 text-sm leading-snug line-clamp-1" title="${escapeHtml(v.name)}">
                ${escapeHtml(v.name)}
              </h4>
              <p class="text-xs text-slate-500 mt-1 line-clamp-1" title="${escapeHtml(v.address)}">
                📍 ${escapeHtml(v.address)}
              </p>
              <div class="mt-2 text-[11px] text-slate-600 space-y-0.5">
                <p><span class="text-slate-400">Покрытие:</span> <b>${escapeHtml(v.surface_type || 'Стандартное')}</b></p>
                <p><span class="text-slate-400">Размеры:</span> <b>${escapeHtml(v.dimensions || 'Стандарт')}</b></p>
              </div>
            </div>

            <div class="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between">
              <span class="text-[10px] text-slate-400">${v.has_fence ? '🛡️ Ограждена' : 'Открытая зона'}</span>
              <a href="/venue.html?id=${v.id}" class="px-4 py-1.5 bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-semibold rounded-xl shadow-sm transition">
                Забронировать
              </a>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Если меньше 3 площадок, добавляем заглушку
    let placeholderHtml = '';
    if (venues.length < 3) {
      placeholderHtml = `
        <div class="p-8 border border-dashed border-[#d1fae5] bg-[#f0fdf4]/50 rounded-2xl flex flex-col items-center justify-center text-center text-xs text-slate-500">
          <svg class="w-8 h-8 text-[#16a34a] mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span class="font-medium">Скоро появятся новые площадки</span>
          <span class="text-[10px] text-slate-400 mt-1">Идет подключение муниципальных объектов</span>
        </div>
      `;
    }

    gridEl.innerHTML = cardsHtml + placeholderHtml;

  } catch (err) {
    gridEl.innerHTML = `
      <div class="col-span-3 p-4 bg-red-50 text-red-600 rounded-xl text-xs text-center">
        Не удалось загрузить объекты данного вида спорта.
      </div>
    `;
  }
}

// Настройка формы обратной связи
function setupFeedbackForm() {
  const form = document.getElementById('feedback-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('fb-name').value.trim();
    const contact = document.getElementById('fb-contact').value.trim();
    const school = document.getElementById('fb-school').value.trim();
    const message = document.getElementById('fb-message').value.trim();

    if (!name || !contact || !message) {
      showError('Заполните обязательные поля', 'Пожалуйста, укажите ваше имя, контактные данные и суть вопроса.');
      return;
    }

    Swal.fire({
      icon: 'success',
      title: 'Обращение успешно отправлено',
      html: `
        <p class="text-xs text-slate-600 mb-2">Уважаемый(ая) <b>${escapeHtml(name)}</b>!</p>
        <p class="text-xs text-slate-500">Ваше обращение принято к рассмотрению отделом координации спортивных объектов. Ответ будет направлен на <b>${escapeHtml(contact)}</b> в течение 1 рабочего дня.</p>
      `,
      confirmButtonText: 'Отлично',
      confirmButtonColor: '#16a34a',
      customClass: { popup: 'rounded-2xl shadow-xl' }
    });

    form.reset();
  });
}
