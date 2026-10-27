import { exportData, importData, todayKey } from './storage.js';
import { getReminders } from './reminders.js';

const ITEMS = [
  ['cycle', '🌙', 'Цикл', 'День цикла и самочувствие'],
  ['rest', '🧘‍♀️', 'Отдых', 'Дыхание, пауза, идеи'],
  ['measure', '📏', 'Замеры', 'Таблица и график'],
  ['health', '🩺', 'Здоровье', 'Врачи и анализы']
];

export function renderMore(root) {
  const due = new Set(getReminders().map((r) => r.route));
  root.innerHTML = `
    <div class="menu">
      ${ITEMS.map(([route, icon, title, text]) => `
        <a class="card menu-item" href="#${route}">
          <span class="menu-ico">${icon}</span>
          <span><b>${title}</b><small>${text}</small></span>
          ${due.has(route) ? '<i class="dot" aria-label="Есть напоминание"></i>' : ''}
        </a>`).join('')}
    </div>

    <section class="card">
      <h2>Резервная копия</h2>
      <p>Данные живут только в этом браузере. Сохрани копию, чтобы не потерять их или перенести на другое устройство. Файлы анализов в копию не входят.</p>
      <div class="row">
        <button class="btn" data-act="export">Скачать копию</button>
        <label class="btn">Загрузить копию<input type="file" accept="application/json,.json" hidden></label>
      </div>
      <p class="form-error" hidden></p>
    </section>`;

  root.querySelector('[data-act="export"]').onclick = () => {
    const url = URL.createObjectURL(new Blob([exportData()], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `bloomy-${todayKey()}.json` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  root.querySelector('input[type="file"]').onchange = async (e) => {
    const file = e.target.files[0];
    const err = root.querySelector('.form-error');
    if (!file) return;
    if (!confirm('Заменить текущие данные данными из копии?')) return;
    try {
      importData(await file.text());
      location.hash = 'today';
    } catch {
      err.hidden = false;
      err.textContent = 'Не получилось прочитать файл — это точно копия Bloomy?';
    }
  };
}
