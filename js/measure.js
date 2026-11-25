import { get, set, todayKey, updateSettings } from './storage.js';
import { getProfile, isPregnant, waterByWeight } from './profile.js';
import { backLink, shortDate, longDate, addDays, parseKey } from './util.js';

export const FIELDS = [
  { id: 'weight', name: 'Вес', unit: 'кг' },
  { id: 'arms', name: 'Руки', unit: 'см' },
  { id: 'belly', name: 'Живот', unit: 'см' },
  { id: 'waist', name: 'Талия', unit: 'см' },
  { id: 'glutes', name: 'Ягодицы', unit: 'см' },
  { id: 'thigh', name: 'Бедро', unit: 'см' }
];

let metric = 'weight';
let editing = null; // дата замера, открытого для правки

const sorted = () => [...get('measurements')].sort((a, b) => a.date.localeCompare(b.date));
const fmt = (v) => (v == null ? '—' : String(Math.round(v * 10) / 10).replace('.', ','));

// Неделя начинается с понедельника; ключ недели — дата её понедельника.
export const weekOf = (key) => addDays(key, -((parseKey(key).getDay() + 6) % 7));
const sameWeek = (a, b) => weekOf(a) === weekOf(b);
const weekLabel = (key) => {
  const s = weekOf(key), e = addDays(s, 6);
  return s.slice(5, 7) === e.slice(5, 7) ? `${Number(s.slice(8))}–${shortDate(e)}` : `${shortDate(s)}–${shortDate(e)}`;
};

// Напоминание: раз в неделю, если на этой неделе замеров ещё нет.
export function measureDue() {
  const today = todayKey();
  return !get('measurements').some((m) => sameWeek(m.date, today));
}

function chart(rows) {
  const field = FIELDS.find((f) => f.id === metric);
  const pts = rows.filter((r) => r[metric] != null).map((r) => ({ date: r.date, v: r[metric] }));
  if (pts.length < 2) {
    return `<p class="chart-empty">${pts.length ? 'Нужно хотя бы два замера, чтобы увидеть график' : 'Пока нет данных'}</p>`;
  }
  const W = 320, H = 170, L = 36, R = 12, T = 14, B = 26;
  let min = Math.min(...pts.map((p) => p.v));
  let max = Math.max(...pts.map((p) => p.v));
  const pad = Math.max(0.5, (max - min) * 0.15);
  min -= pad; max += pad;
  const x = (i) => L + (i * (W - L - R)) / (pts.length - 1);
  const y = (v) => T + ((max - v) * (H - T - B)) / (max - min);
  const ticks = [max - pad, (max + min) / 2, min + pad];
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(' ');
  const labelIdx = new Set([0, pts.length - 1]);
  return `
    <svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${field.name}: график изменений">
      ${ticks.map((t) => `
        <line x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}" class="grid"/>
        <text x="${L - 6}" y="${y(t) + 4}" class="axis" text-anchor="end">${fmt(t)}</text>`).join('')}
      <path d="${line}" class="line"/>
      ${pts.map((p, i) => `
        <g class="pt" tabindex="0" data-i="${i}">
          <circle cx="${x(i)}" cy="${y(p.v)}" r="14" class="hit"/>
          <circle cx="${x(i)}" cy="${y(p.v)}" r="4.5" class="dot"/>
          <title>${shortDate(p.date)}: ${fmt(p.v)} ${field.unit}</title>
        </g>
        ${labelIdx.has(i) ? `<text x="${x(i)}" y="${H - 8}" class="axis" text-anchor="${i ? 'end' : 'start'}">${shortDate(p.date)}</text>` : ''}`).join('')}
    </svg>
    <p class="chart-tip" aria-live="polite">${diffText(pts, field)}</p>`;
}

function diffText(pts, field) {
  const d = pts[pts.length - 1].v - pts[0].v;
  if (Math.abs(d) < 0.05) return `${field.name}: без изменений с ${shortDate(pts[0].date)}`;
  return `${field.name}: ${d < 0 ? '−' : '+'}${fmt(Math.abs(d))} ${field.unit} с ${shortDate(pts[0].date)}`;
}

export function renderMeasure(root) {
  const rows = sorted();
  const today = todayKey();
  // форма сразу открывает замер этой недели, если он уже есть
  const cur = (editing && rows.find((r) => r.date === editing)) || [...rows].reverse().find((r) => sameWeek(r.date, today));
  const last = [...rows].reverse().find((r) => r !== cur);
  const due = measureDue();

  root.innerHTML = `
    ${backLink('Замеры')}
    ${due ? `<section class="card notice">📏 На этой неделе замеров ещё нет. Лучше мерить утром, натощак, не в дни перед месячными.</section>` : ''}

    <section class="card">
      <h2>${cur ? `Замер недели ${weekLabel(cur.date)}` : 'Замер этой недели'}</h2>
      <p class="measure-hint">Один замер в неделю. Его можно исправить в любой момент.</p>
      <form class="form measure-form">
        <label class="full">Дата<input type="date" name="date" value="${cur ? cur.date : today}" max="${today}" required></label>
        ${FIELDS.map((f) => `
          <label>${f.name}, ${f.unit}
            <input type="text" inputmode="decimal" pattern="[0-9]+([.,][0-9]+)?" name="${f.id}" value="${cur?.[f.id] != null ? fmt(cur[f.id]) : ''}" placeholder="${last?.[f.id] != null ? fmt(last[f.id]) : ''}">
          </label>`).join('')}
        <button class="btn primary full">${cur ? 'Сохранить изменения' : 'Сохранить'}</button>
        ${editing ? '<button type="button" class="btn full" data-cancel>Отмена</button>' : ''}
      </form>
    </section>

    <section class="card">
      <h2>Как меняется</h2>
      <div class="chips">${FIELDS.map((f) => `<button class="chip ${f.id === metric ? 'active' : ''}" data-metric="${f.id}">${f.name}</button>`).join('')}</div>
      <div class="chart-box">${chart(rows)}</div>
    </section>

    <section class="card">
      <h2>Таблица</h2>
      ${rows.length ? `
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Неделя</th>${FIELDS.map((f) => `<th>${f.name}</th>`).join('')}<th></th><th></th></tr></thead>
            <tbody>
              ${[...rows].reverse().map((r) => `
                <tr>
                  <td title="${longDate(r.date)}">${weekLabel(r.date)}</td>
                  ${FIELDS.map((f) => `<td>${fmt(r[f.id])}</td>`).join('')}
                  <td><button class="icon-btn" data-edit="${r.date}" aria-label="Изменить замер ${longDate(r.date)}">✎</button></td>
                  <td><button class="icon-btn" data-del="${r.date}" aria-label="Удалить замер ${longDate(r.date)}">✕</button></td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>` : '<p>Здесь появятся твои замеры.</p>'}
    </section>`;

  root.querySelector('.measure-form').onsubmit = (e) => {
    e.preventDefault();
    const form = e.target;
    const row = { date: form.date.value };
    let any = false;
    FIELDS.forEach((f) => {
      const v = parseFloat(String(form[f.id].value).replace(',', '.'));
      if (Number.isFinite(v) && v > 0) { row[f.id] = v; any = true; }
    });
    if (!any || !row.date) return;
    // один замер на неделю: запись этой недели (и правимая) заменяется новыми значениями,
    // старые поля вне формы (например, прежняя «грудь») сохраняются
    const all = get('measurements');
    const replaced = all.filter((m) => m.date === cur?.date || sameWeek(m.date, row.date)).sort((a, b) => a.date.localeCompare(b.date));
    const keep = Object.assign({}, ...replaced);
    FIELDS.forEach((f) => delete keep[f.id]);
    set('measurements', [...all.filter((m) => !replaced.includes(m)), { ...keep, ...row }]);
    editing = null;
    // норма воды «по весу» обновляется вместе с новым весом
    if (row.weight && getProfile()?.waterAuto) updateSettings({ waterGoal: waterByWeight(row.weight, isPregnant()) });
    renderMeasure(root);
  };

  root.querySelectorAll('[data-metric]').forEach((b) => {
    b.onclick = () => { metric = b.dataset.metric; renderMeasure(root); };
  });

  root.querySelectorAll('[data-edit]').forEach((b) => {
    b.onclick = () => { editing = b.dataset.edit; renderMeasure(root); root.querySelector('.measure-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); };
  });
  const cancel = root.querySelector('[data-cancel]');
  if (cancel) cancel.onclick = () => { editing = null; renderMeasure(root); };

  root.querySelectorAll('[data-del]').forEach((b) => {
    b.onclick = () => {
      if (!confirm('Удалить этот замер?')) return;
      set('measurements', get('measurements').filter((m) => m.date !== b.dataset.del));
      if (editing === b.dataset.del) editing = null;
      renderMeasure(root);
    };
  });

  // подсказка со значением при наведении/касании точки
  const tip = root.querySelector('.chart-tip');
  const field = FIELDS.find((f) => f.id === metric);
  const pts = rows.filter((r) => r[metric] != null);
  root.querySelectorAll('.pt').forEach((g) => {
    const show = () => {
      const r = pts[Number(g.dataset.i)];
      tip.textContent = `${longDate(r.date)}: ${fmt(r[metric])} ${field.unit}`;
      root.querySelectorAll('.pt').forEach((o) => o.classList.toggle('on', o === g));
    };
    g.addEventListener('pointerenter', show);
    g.addEventListener('click', show);
    g.addEventListener('focus', show);
  });
}
