import { get, set, todayKey } from './storage.js';
import { backLink, esc, longDate, shortDate, addDays, daysBetween, uid, plural } from './util.js';
import { listTests, getTest, saveTest, deleteTest } from './db.js';

// Врачи: как часто ходить и когда была в последний раз. Следующий визит считается сам.
export const nextVisit = (d) => (d.last ? addMonths(d.last, d.every) : todayKey());

function addMonths(key, n) {
  const [y, m, day] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return addDays(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`, Math.min(day, last) - 1);
}

// Врачи, к которым пора в ближайшие 14 дней или уже пора.
export function doctorsDue() {
  const today = todayKey();
  return get('doctors')
    .map((d) => ({ ...d, next: nextVisit(d), left: daysBetween(today, nextVisit(d)) }))
    .filter((d) => d.left <= 14)
    .sort((a, b) => a.left - b.left);
}

const SUGGEST = [
  ['Гинеколог', 12], ['Терапевт', 12], ['Стоматолог', 6], ['Эндокринолог', 12], ['Общий анализ крови', 6]
];

const whenText = (left) => {
  if (left < 0) return `пора, просрочено на ${-left} ${plural(-left, ['день', 'дня', 'дней'])}`;
  if (left === 0) return 'пора сегодня';
  return `через ${left} ${plural(left, ['день', 'дня', 'дней'])}`;
};

const MAX_FILE = 25 * 1024 * 1024;

export async function renderHealth(root) {
  const doctors = get('doctors');
  const today = todayKey();
  let tests = [];
  let dbError = false;
  try {
    tests = (await listTests()).sort((a, b) => b.date.localeCompare(a.date));
  } catch {
    dbError = true;
  }

  root.innerHTML = `
    ${backLink('Здоровье')}
    <section class="card private">🔒 Всё хранится только в этом браузере на этом устройстве и никуда не отправляется.</section>

    <section class="card">
      <h2>Врачи</h2>
      ${doctors.length ? `
        <ul class="list doctors">
          ${doctors.map((d) => {
            const left = daysBetween(today, nextVisit(d));
            return `
              <li class="${left <= 14 ? 'due' : ''}">
                <div>
                  <b>${esc(d.name)}</b>
                  <small>${d.last ? `была ${shortDate(d.last)} · ` : ''}раз в ${d.every} мес. · ${whenText(left)}</small>
                </div>
                <div class="li-actions">
                  <button class="btn small" data-visit="${d.id}">Была сегодня</button>
                  <button class="icon-btn" data-deldoc="${d.id}" aria-label="Удалить">✕</button>
                </div>
              </li>`;
          }).join('')}
        </ul>` : '<p>Добавь врачей, к которым ходишь регулярно — напомню, когда пора.</p>'}
      <form class="form doc-form">
        <label class="full">Врач или обследование<input name="name" list="doc-suggest" required maxlength="60" placeholder="Например, гинеколог"></label>
        <datalist id="doc-suggest">${SUGGEST.map(([n]) => `<option value="${n}">`).join('')}</datalist>
        <label>Раз в, мес.<input type="number" name="every" min="1" max="36" value="12" required></label>
        <label>Последний визит<input type="date" name="last" max="${today}"></label>
        <button class="btn primary full">Добавить</button>
      </form>
    </section>

    <section class="card">
      <h2>Анализы</h2>
      ${dbError ? '<p>Браузер не даёт сохранять файлы (возможно, приватный режим).</p>' : `
        <form class="form test-form">
          <label class="full">Название<input name="title" required maxlength="80" placeholder="Например, общий анализ крови"></label>
          <label>Дата<input type="date" name="date" value="${today}" max="${today}" required></label>
          <label>Файл (фото или PDF)<input type="file" name="file" accept="image/*,application/pdf" required></label>
          <label class="full">Заметка<input name="note" maxlength="200" placeholder="Необязательно"></label>
          <button class="btn primary full">Сохранить анализ</button>
          <p class="form-error full" hidden></p>
        </form>
        ${tests.length ? `
          <ul class="list tests">
            ${tests.map((t) => `
              <li>
                <div>
                  <b>${esc(t.title)}</b>
                  <small>${longDate(t.date)}${t.note ? ` · ${esc(t.note)}` : ''}</small>
                </div>
                <div class="li-actions">
                  <button class="btn small" data-open="${t.id}">Открыть</button>
                  <button class="icon-btn" data-deltest="${t.id}" aria-label="Удалить">✕</button>
                </div>
              </li>`).join('')}
          </ul>` : '<p class="small-note">Пока анализов нет.</p>'}
      `}
    </section>`;

  root.querySelector('.doc-form').onsubmit = (e) => {
    e.preventDefault();
    const f = e.target;
    const every = Math.min(36, Math.max(1, Math.round(Number(f.every.value)) || 12));
    set('doctors', [...doctors, { id: uid(), name: f.name.value.trim(), every, last: f.last.value || null }]);
    renderHealth(root);
  };
  root.querySelectorAll('[data-visit]').forEach((b) => {
    b.onclick = () => {
      set('doctors', doctors.map((d) => (d.id === b.dataset.visit ? { ...d, last: today } : d)));
      renderHealth(root);
    };
  });
  root.querySelectorAll('[data-deldoc]').forEach((b) => {
    b.onclick = () => {
      if (!confirm('Удалить напоминание?')) return;
      set('doctors', doctors.filter((d) => d.id !== b.dataset.deldoc));
      renderHealth(root);
    };
  });

  const testForm = root.querySelector('.test-form');
  if (testForm) {
    testForm.onsubmit = async (e) => {
      e.preventDefault();
      const f = e.target;
      const file = f.file.files[0];
      const err = f.querySelector('.form-error');
      if (!file) return;
      if (file.size > MAX_FILE) {
        err.hidden = false;
        err.textContent = 'Файл больше 25 МБ — попробуй сжать фото.';
        return;
      }
      try {
        await saveTest({
          id: uid(), title: f.title.value.trim(), date: f.date.value, note: f.note.value.trim(),
          name: file.name, type: file.type, file
        });
        renderHealth(root);
      } catch {
        err.hidden = false;
        err.textContent = 'Не получилось сохранить — возможно, в браузере закончилось место.';
      }
    };
  }
  root.querySelectorAll('[data-open]').forEach((b) => {
    b.onclick = async () => {
      const t = await getTest(b.dataset.open);
      if (t) showFile(t);
    };
  });
  root.querySelectorAll('[data-deltest]').forEach((b) => {
    b.onclick = async () => {
      if (!confirm('Удалить анализ вместе с файлом?')) return;
      await deleteTest(b.dataset.deltest);
      renderHealth(root);
    };
  });
}

function showFile(t) {
  const url = URL.createObjectURL(t.file);
  const isImage = t.type.startsWith('image/');
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-box" role="dialog" aria-modal="true" aria-label="${esc(t.title)}">
      <h2>${esc(t.title)}</h2>
      <p>${longDate(t.date)}</p>
      ${isImage ? `<img class="file-preview" src="${url}" alt="${esc(t.title)}">` : ''}
      <div class="row">
        ${isImage ? '' : `<a class="btn primary" href="${url}" target="_blank" rel="noopener">Открыть</a>`}
        <a class="btn" href="${url}" download="${esc(t.name)}">Скачать</a>
        <button class="btn" data-close>Закрыть</button>
      </div>
    </div>`;
  document.body.append(modal);
  const close = () => { modal.remove(); URL.revokeObjectURL(url); };
  modal.querySelector('[data-close]').onclick = close;
  modal.onclick = (e) => { if (e.target === modal) close(); };
}
