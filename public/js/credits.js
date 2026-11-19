/**
 * public/js/credits.js
 * Загрузка и рендеринг таблицы источников изображений для credits.html
 */

document.addEventListener('DOMContentLoaded', async () => {
  const tableBody = document.getElementById('credits-table-body');
  const countBadge = document.getElementById('credits-count-badge');

  try {
    const res = await api.get('/venues/credits');
    const photos = res.data || [];

    if (countBadge) {
      countBadge.textContent = `${photos.length} изображений`;
    }

    if (photos.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" class="px-6 py-8 text-center text-slate-400">
            Использованные изображения не найдены.
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = photos.map(p => {
      const licenseUrl = p.license_url || '#';
      const sourceUrl = p.source_url || '#';
      const title = p.title || 'Иллюстративное фото спортивной площадки';
      const author = p.author || 'Wikimedia Commons contributor';
      const license = p.license || 'Свободная лицензия';

      return `
        <tr class="hover:bg-slate-50 transition">
          <td class="px-6 py-4">
            <div class="w-20 aspect-[4/3] rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
              <img src="${p.photo_url}" 
                   alt="${escapeHtml(title)}" 
                   loading="lazy" 
                   width="80" 
                   height="60"
                   class="w-full h-full object-cover">
            </div>
          </td>
          <td class="px-6 py-4">
            <span class="font-bold text-slate-900 block leading-snug">${escapeHtml(title)}</span>
            <span class="text-[11px] text-slate-400 block mt-0.5 font-mono">${escapeHtml(p.photo_url)}</span>
          </td>
          <td class="px-6 py-4">
            <span class="font-medium text-slate-800">${escapeHtml(author)}</span>
          </td>
          <td class="px-6 py-4">
            <a href="${licenseUrl}" target="_blank" rel="noopener noreferrer" 
               class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#dcfce7] text-[#166534] hover:bg-[#bbf7d0] transition">
              <span>${escapeHtml(license)}</span>
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </td>
          <td class="px-6 py-4 text-right">
            <a href="${sourceUrl}" target="_blank" rel="noopener noreferrer" 
               class="inline-flex items-center gap-1 text-[#16a34a] hover:text-[#15803d] font-semibold hover:underline">
              <span>Wikimedia Commons</span>
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    console.error('Ошибка загрузки источников изображений:', err);
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="px-6 py-8 text-center text-red-500">
          Не удалось загрузить сведения об авторах: ${escapeHtml(err.message || 'Ошибка сети')}
        </td>
      </tr>
    `;
  }
});
