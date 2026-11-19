/**
 * Скрипт генерации 20 локальных векторных иллюстраций спортивных площадок (вид сверху).
 * - Формат: SVG, viewBox="0 0 800 600" (aspect-ratio 4:3);
 * - Без текста внутри изображений (всю типографику формирует HTML);
 * - По 4 уникальных варианта для каждого из 5 видов спорта:
 *   1) Футбол (football/1..4.svg)
 *   2) Баскетбол (basketball/1..4.svg)
 *   3) Волейбол (volleyball/1..4.svg)
 *   4) Универсальная площадка (universal/1..4.svg)
 *   5) Легкая атлетика (athletics/1..4.svg)
 * - Палитра: фирменная зелёная гамма (#16a34a, #166534, #f0fdf4, #14532d, #059669 и др.).
 */

const fs = require('fs');
const path = require('path');

const BASE_DIR = path.join(__dirname, '..', 'public', 'img', 'venues');

// Вспомогательная функция для генерации общих элементов окружения
function getSurroundings(variant, lightingType = 'day') {
  const isEvening = variant === 3;
  const mastGlow = isEvening
    ? `<circle cx="60" cy="50" r="160" fill="url(#lightGlow)" opacity="0.6"/>
       <circle cx="740" cy="50" r="160" fill="url(#lightGlow)" opacity="0.6"/>
       <circle cx="60" cy="550" r="160" fill="url(#lightGlow)" opacity="0.6"/>
       <circle cx="740" cy="550" r="160" fill="url(#lightGlow)" opacity="0.6"/>`
    : '';

  const masts = `
    <!-- Осветительные мачты -->
    <g fill="#cbd5e1" stroke="#475569" stroke-width="2">
      <circle cx="50" cy="40" r="7"/>
      <circle cx="750" cy="40" r="7"/>
      <circle cx="50" cy="560" r="7"/>
      <circle cx="750" cy="560" r="7"/>
    </g>
  `;

  // Скамейки для зрителей / запасных
  const benches = variant % 2 === 0 ? `
    <g fill="#166534" stroke="#d1fae5" stroke-width="1.5">
      <rect x="260" y="555" width="80" height="14" rx="3"/>
      <rect x="460" y="555" width="80" height="14" rx="3"/>
      <rect x="360" y="555" width="80" height="14" rx="3"/>
    </g>
  ` : `
    <g fill="#166534" stroke="#d1fae5" stroke-width="1.5">
      <rect x="280" y="30" width="100" height="12" rx="3"/>
      <rect x="420" y="30" width="100" height="12" rx="3"/>
    </g>
  `;

  return { mastGlow, masts, benches };
}

// 1. ФУТБОЛ
function generateFootball(variant) {
  const themes = [
    { bg1: '#15803d', bg2: '#166534', court: '#16a34a', stripe: '#15803d', lines: '#ffffff' }, // Классический сочный газон
    { bg1: '#166534', bg2: '#14532d', court: '#15803d', stripe: '#166534', lines: '#f0fdf4' }, // Темный плотный газон
    { bg1: '#14532d', bg2: '#0f3d21', court: '#14532d', stripe: '#114424', lines: '#ffffff' }, // Вечерний под прожекторами
    { bg1: '#047857', bg2: '#065f46', court: '#059669', stripe: '#047857', lines: '#ecfdf5' }, // Изумрудная синтетика
  ];
  const t = themes[variant - 1];
  const { mastGlow, masts, benches } = getSurroundings(variant);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${t.bg1}"/>
      <stop offset="100%" stop-color="${t.bg2}"/>
    </linearGradient>
    <radialGradient id="lightGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fef08a" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#fef08a" stop-opacity="0"/>
    </radialGradient>
    <pattern id="stripes" width="70" height="600" patternUnits="userSpaceOnUse">
      <rect width="35" height="600" fill="${t.court}"/>
      <rect x="35" width="35" height="600" fill="${t.stripe}"/>
    </pattern>
  </defs>

  <!-- Фон стадиона -->
  <rect width="800" height="600" fill="url(#bgGrad)"/>
  
  <!-- Защитное ограждение по периметру -->
  <rect x="70" y="45" width="660" height="510" rx="18" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="2" stroke-dasharray="6,4"/>
  
  <!-- Поле с полосатым газоном -->
  <rect x="90" y="60" width="620" height="480" rx="10" fill="url(#stripes)" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
  
  <!-- Разметка футбольного поля -->
  <g stroke="${t.lines}" stroke-width="3" fill="none">
    <!-- Внешняя линия -->
    <rect x="120" y="80" width="560" height="440" rx="4"/>
    <!-- Средняя линия -->
    <line x1="400" y1="80" x2="400" y2="520"/>
    <!-- Центральный круг и точка -->
    <circle cx="400" cy="300" r="55"/>
    <circle cx="400" cy="300" r="3.5" fill="${t.lines}"/>

    <!-- Левая штрафная площадь -->
    <rect x="120" y="190" width="95" height="220"/>
    <!-- Левая вратарская площадь -->
    <rect x="120" y="240" width="40" height="120"/>
    <!-- Левая точка пенальти и дуга -->
    <circle cx="185" cy="300" r="3.5" fill="${t.lines}"/>
    <path d="M 215 255 A 55 55 0 0 1 215 345"/>
    <!-- Левые ворота -->
    <rect x="100" y="260" width="20" height="80" fill="rgba(255,255,255,0.3)" stroke="${t.lines}" stroke-width="2"/>

    <!-- Правая штрафная площадь -->
    <rect x="585" y="190" width="95" height="220"/>
    <!-- Правая вратарская площадь -->
    <rect x="640" y="240" width="40" height="120"/>
    <!-- Правая точка пенальти и дуга -->
    <circle cx="615" cy="300" r="3.5" fill="${t.lines}"/>
    <path d="M 585 255 A 55 55 0 0 0 585 345"/>
    <!-- Правые ворота -->
    <rect x="680" y="260" width="20" height="80" fill="rgba(255,255,255,0.3)" stroke="${t.lines}" stroke-width="2"/>

    <!-- Угловые секторы -->
    <path d="M 120 95 A 15 15 0 0 0 135 80"/>
    <path d="M 120 505 A 15 15 0 0 1 135 520"/>
    <path d="M 680 95 A 15 15 0 0 1 665 80"/>
    <path d="M 680 505 A 15 15 0 0 0 665 520"/>
  </g>

  ${benches}
  ${masts}
  ${mastGlow}
</svg>`;
}

// 2. БАСКЕТБОЛ
function generateBasketball(variant) {
  const themes = [
    { bg: '#166534', court: '#15803d', key: '#16a34a', lines: '#ffffff' }, // Классический зеленый корт
    { bg: '#14532d', court: '#166534', key: '#059669', lines: '#f0fdf4' }, // Глубокий темно-зеленый
    { bg: '#064e3b', court: '#047857', key: '#10b981', lines: '#ffffff' }, // Вечерний с контрастными зонами
    { bg: '#15803d', court: '#16a34a', key: '#15803d', lines: '#fef08a' }, // Золотисто-желтая разметка
  ];
  const t = themes[variant - 1];
  const { mastGlow, masts, benches } = getSurroundings(variant);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
  <defs>
    <radialGradient id="lightGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fef08a" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#fef08a" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Фон площадки -->
  <rect width="800" height="600" fill="${t.bg}"/>
  <rect x="70" y="45" width="660" height="510" rx="14" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="2"/>

  <!-- Основное баскетбольное покрытие -->
  <rect x="90" y="65" width="620" height="470" rx="10" fill="${t.court}"/>

  <!-- Трехсекундные зоны («краска») с заливкой -->
  <rect x="130" y="235" width="125" height="130" fill="${t.key}" opacity="0.6"/>
  <rect x="545" y="235" width="125" height="130" fill="${t.key}" opacity="0.6"/>

  <!-- Разметка корта -->
  <g stroke="${t.lines}" stroke-width="3" fill="none">
    <!-- Внешние границы -->
    <rect x="130" y="95" width="540" height="410" rx="4"/>
    <!-- Центральная линия -->
    <line x1="400" y1="95" x2="400" y2="505"/>
    <!-- Центральный круг -->
    <circle cx="400" cy="300" r="50"/>

    <!-- Левая зона: 3-очковая дуга -->
    <path d="M 130 150 L 195 150 A 155 155 0 0 1 195 450 L 130 450"/>
    <!-- Левая штрафная зона и круг броска -->
    <rect x="130" y="235" width="125" height="130"/>
    <circle cx="255" cy="300" r="45"/>
    <!-- Левый щит и кольцо -->
    <line x1="155" y1="270" x2="155" y2="330" stroke="${t.lines}" stroke-width="4"/>
    <line x1="130" y1="300" x2="155" y2="300" stroke="${t.lines}" stroke-width="3"/>
    <circle cx="170" cy="300" r="9" stroke="#ea580c" stroke-width="3" fill="none"/>

    <!-- Правая зона: 3-очковая дуга -->
    <path d="M 670 150 L 605 150 A 155 155 0 0 0 605 450 L 670 450"/>
    <!-- Правая штрафная зона и круг броска -->
    <rect x="545" y="235" width="125" height="130"/>
    <circle cx="545" cy="300" r="45"/>
    <!-- Правый щит и кольцо -->
    <line x1="645" y1="270" x2="645" y2="330" stroke="${t.lines}" stroke-width="4"/>
    <line x1="670" y1="300" x2="645" y2="300" stroke="${t.lines}" stroke-width="3"/>
    <circle cx="630" cy="300" r="9" stroke="#ea580c" stroke-width="3" fill="none"/>
  </g>

  ${benches}
  ${masts}
  ${mastGlow}
</svg>`;
}

// 3. ВОЛЕЙБОЛ
function generateVolleyball(variant) {
  const themes = [
    { bg: '#15803d', court: '#16a34a', zone: '#15803d', lines: '#ffffff' }, // Зеленый резиновый корт
    { bg: '#166534', court: '#059669', zone: '#047857', lines: '#f0fdf4' }, // Изумрудно-зеленый
    { bg: '#14532d', court: '#166534', zone: '#14532d', lines: '#ffffff' }, // Вечерний корт
    { bg: '#065f46', court: '#10b981', zone: '#059669', lines: '#fef08a' }, // Контрастный корт с желтой линией
  ];
  const t = themes[variant - 1];
  const { mastGlow, masts, benches } = getSurroundings(variant);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
  <defs>
    <radialGradient id="lightGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fef08a" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#fef08a" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Фон зоны безопасности -->
  <rect width="800" height="600" fill="${t.bg}"/>
  <rect x="60" y="40" width="680" height="520" rx="16" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="2"/>

  <!-- Свободная зона вокруг площадки -->
  <rect x="90" y="70" width="620" height="460" rx="10" fill="${t.zone}"/>

  <!-- Игровая волейбольная площадка (18x9 метров, соотношение 2:1) -->
  <rect x="170" y="130" width="460" height="340" fill="${t.court}"/>

  <!-- Разметка -->
  <g stroke="${t.lines}" stroke-width="3" fill="none">
    <!-- Границы корта -->
    <rect x="170" y="130" width="460" height="340"/>
    <!-- Линия под сеткой -->
    <line x1="400" y1="130" x2="400" y2="470" stroke-width="4"/>
    <!-- Линии атаки (3 метра от сетки с каждой стороны) -->
    <line x1="323" y1="130" x2="323" y2="470" stroke-dasharray="8,5"/>
    <line x1="477" y1="130" x2="477" y2="470" stroke-dasharray="8,5"/>
  </g>

  <!-- Волейбольная сетка (вид сверху с тросами и антеннами) -->
  <line x1="400" y1="105" x2="400" y2="495" stroke="#ffffff" stroke-width="5"/>
  <line x1="400" y1="105" x2="400" y2="495" stroke="#0f172a" stroke-width="2" stroke-dasharray="4,3"/>
  <!-- Стойки сетки -->
  <circle cx="400" cy="105" r="5" fill="#e2e8f0" stroke="#334155" stroke-width="2"/>
  <circle cx="400" cy="495" r="5" fill="#e2e8f0" stroke="#334155" stroke-width="2"/>
  <!-- Красно-белые антенны на краях сетки -->
  <line x1="400" y1="130" x2="400" y2="137" stroke="#ef4444" stroke-width="4"/>
  <line x1="400" y1="463" x2="400" y2="470" stroke="#ef4444" stroke-width="4"/>

  <!-- Судейская вышка -->
  <rect x="388" y="85" width="24" height="15" rx="3" fill="#334155" stroke="#94a3b8" stroke-width="1.5"/>

  ${benches}
  ${masts}
  ${mastGlow}
</svg>`;
}

// 4. УНИВЕРСАЛЬНАЯ ПЛОЩАДКА
function generateUniversal(variant) {
  const themes = [
    { bg: '#166534', court: '#15803d', lines1: '#ffffff', lines2: '#fef08a', lines3: '#67e8f9' },
    { bg: '#14532d', court: '#166534', lines1: '#f0fdf4', lines2: '#fde047', lines3: '#a5f3fc' },
    { bg: '#047857', court: '#059669', lines1: '#ffffff', lines2: '#fef08a', lines3: '#e0e7ff' },
    { bg: '#15803d', court: '#16a34a', lines1: '#ffffff', lines2: '#facc15', lines3: '#5eead4' },
  ];
  const t = themes[variant - 1];
  const { mastGlow, masts, benches } = getSurroundings(variant);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
  <defs>
    <radialGradient id="lightGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fef08a" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#fef08a" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Фон и круговое ограждение -->
  <rect width="800" height="600" fill="${t.bg}"/>
  <rect x="65" y="45" width="670" height="510" rx="20" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="3" stroke-dasharray="7,4"/>

  <!-- Основное полимерное покрытие корта -->
  <rect x="85" y="65" width="630" height="470" rx="12" fill="${t.court}"/>

  <!-- 1. Футбольная разметка (белый цвет) -->
  <g stroke="${t.lines1}" stroke-width="3" fill="none">
    <rect x="120" y="90" width="560" height="420" rx="6"/>
    <line x1="400" y1="90" x2="400" y2="510"/>
    <circle cx="400" cy="300" r="50"/>
    <!-- Мини-футбольные вратарские зоны -->
    <rect x="120" y="210" width="70" height="180"/>
    <rect x="105" y="250" width="15" height="100" fill="rgba(255,255,255,0.25)" stroke-width="2"/>
    <rect x="610" y="210" width="70" height="180"/>
    <rect x="680" y="250" width="15" height="100" fill="rgba(255,255,255,0.25)" stroke-width="2"/>
  </g>

  <!-- 2. Баскетбольная разметка (желтый цвет) -->
  <g stroke="${t.lines2}" stroke-width="2.5" fill="none">
    <path d="M 120 160 L 190 160 A 140 140 0 0 1 190 440 L 120 440"/>
    <rect x="120" y="235" width="105" height="130"/>
    <circle cx="225" cy="300" r="38"/>
    <circle cx="155" cy="300" r="8" stroke="#ea580c" stroke-width="2.5"/>

    <path d="M 680 160 L 610 160 A 140 140 0 0 0 610 440 L 680 440"/>
    <rect x="575" y="235" width="105" height="130"/>
    <circle cx="575" cy="300" r="38"/>
    <circle cx="645" cy="300" r="8" stroke="#ea580c" stroke-width="2.5"/>
  </g>

  <!-- 3. Волейбольная разметка (голубая пунктирная) -->
  <g stroke="${t.lines3}" stroke-width="2" stroke-dasharray="6,4" fill="none">
    <rect x="190" y="140" width="420" height="320"/>
    <line x1="330" y1="140" x2="330" y2="460"/>
    <line x1="470" y1="140" x2="470" y2="460"/>
  </g>

  <!-- Центральная съемная сетка / стойки -->
  <line x1="400" y1="80" x2="400" y2="520" stroke="#ffffff" stroke-width="4" stroke-dasharray="3,3"/>
  <circle cx="400" cy="80" r="5" fill="#f8fafc" stroke="#334155" stroke-width="2"/>
  <circle cx="400" cy="520" r="5" fill="#f8fafc" stroke="#334155" stroke-width="2"/>

  ${benches}
  ${masts}
  ${mastGlow}
</svg>`;
}

// 5. ЛЕГКАЯ АТЛЕТИКА
function generateAthletics(variant) {
  const themes = [
    { bg: '#14532d', track: '#15803d', infield: '#16a34a', lines: '#ffffff', sand: '#fef08a' }, // Зеленый эко-стадион
    { bg: '#166534', track: '#166534', infield: '#15803d', lines: '#f0fdf4', sand: '#fde047' }, // Изумрудный тартан
    { bg: '#0f3d21', track: '#14532d', infield: '#166534', lines: '#ffffff', sand: '#fef08a' }, // Вечерний комплекс
    { bg: '#064e3b', track: '#047857', infield: '#059669', lines: '#ffffff', sand: '#fde68a' }, // Современный легкоатлетический кластер
  ];
  const t = themes[variant - 1];
  const { mastGlow, masts, benches } = getSurroundings(variant);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
  <defs>
    <radialGradient id="lightGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fef08a" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#fef08a" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Фон спорткомплекса -->
  <rect width="800" height="600" fill="${t.bg}"/>

  <!-- 4 Беговые дорожки (овалы / stadium pills) -->
  <!-- Дорожка 4 (внешняя) -->
  <rect x="70" y="70" width="660" height="460" rx="230" fill="${t.track}" stroke="${t.lines}" stroke-width="2.5"/>
  <!-- Дорожка 3 -->
  <rect x="95" y="95" width="610" height="410" rx="205" fill="${t.track}" stroke="${t.lines}" stroke-width="2.5"/>
  <!-- Дорожка 2 -->
  <rect x="120" y="120" width="560" height="360" rx="180" fill="${t.track}" stroke="${t.lines}" stroke-width="2.5"/>
  <!-- Дорожка 1 (внутренняя) -->
  <rect x="145" y="145" width="510" height="310" rx="155" fill="${t.track}" stroke="${t.lines}" stroke-width="2.5"/>

  <!-- Внутреннее поле (infield газон) -->
  <rect x="170" y="170" width="460" height="260" rx="130" fill="${t.infield}"/>

  <!-- Линия финиша и стартовые засечки -->
  <g stroke="${t.lines}" stroke-width="3">
    <!-- Финишная линия поперек дорожек -->
    <line x1="390" y1="455" x2="390" y2="530" stroke="#ef4444" stroke-width="4"/>
    <line x1="390" y1="70" x2="390" y2="145" stroke="${t.lines}" stroke-width="3"/>
    <!-- Стартовые линии со ступенчатым гандикапом -->
    <line x1="430" y1="455" x2="430" y2="480"/>
    <line x1="455" y1="480" x2="455" y2="505"/>
    <line x1="480" y1="505" x2="480" y2="530"/>
  </g>

  <!-- Сектор для прыжков в длину с разбега -->
  <g transform="translate(230, 260)">
    <!-- Беговая дорожка разбега -->
    <rect x="0" y="15" width="190" height="26" fill="${t.track}" stroke="${t.lines}" stroke-width="1.5"/>
    <!-- Брусок отталкивания -->
    <rect x="175" y="15" width="10" height="26" fill="#ffffff"/>
    <!-- Яма с песком -->
    <rect x="195" y="8" width="115" height="40" rx="5" fill="${t.sand}" stroke="#d97706" stroke-width="2"/>
  </g>

  <!-- Сектор ОФП и гимнастические турники (в верхней части внутреннего поля) -->
  <g transform="translate(320, 195)" stroke="#e2e8f0" stroke-width="3" fill="none">
    <line x1="0" y1="0" x2="40" y2="0"/>
    <line x1="50" y1="0" x2="100" y2="0"/>
    <line x1="110" y1="0" x2="160" y2="0"/>
    <circle cx="0" cy="0" r="3" fill="#64748b"/>
    <circle cx="40" cy="0" r="3" fill="#64748b"/>
    <circle cx="50" cy="0" r="3" fill="#64748b"/>
    <circle cx="100" cy="0" r="3" fill="#64748b"/>
    <circle cx="110" cy="0" r="3" fill="#64748b"/>
    <circle cx="160" cy="0" r="3" fill="#64748b"/>
  </g>

  ${benches}
  ${masts}
  ${mastGlow}
</svg>`;
}

function main() {
  console.log('Генерация 20 локальных векторных иллюстраций спортивных площадок...');

  const sports = [
    { dir: 'football', fn: generateFootball },
    { dir: 'basketball', fn: generateBasketball },
    { dir: 'volleyball', fn: generateVolleyball },
    { dir: 'universal', fn: generateUniversal },
    { dir: 'athletics', fn: generateAthletics },
  ];

  for (const s of sports) {
    const targetDir = path.join(BASE_DIR, s.dir);
    fs.mkdirSync(targetDir, { recursive: true });

    for (let i = 1; i <= 4; i++) {
      const filePath = path.join(targetDir, `${i}.svg`);
      const svgContent = s.fn(i);
      fs.writeFileSync(filePath, svgContent, 'utf8');
      console.log(`  [OK] Создан: ${path.relative(path.join(__dirname, '..'), filePath)}`);
    }
  }

  console.log('Все 20 SVG-иллюстраций успешно сгенерированы в public/img/venues/<sport>/');
}

main();
