import { getDay, updateDay, getAllDays, get, set, todayKey } from './storage.js';
import { cycleInfo } from './cycle.js';
import { activityById, myActivities, dailyMinutes, isPregnant } from './profile.js';
import { addDays, parseKey, plural, monthTitle, esc, uid, longDate } from './util.js';

// Серия как в Duolingo, только про движение.
// Обычный день засчитывается от 10 минут активности, мягкий (мало энергии, месячные, ПМС) — от любой.
// Раз в неделю пропуск закрывает «заморозка».
export const MIN_MINUTES = 10;
export const MILESTONES = [
  { n: 7, icon: '🔥', name: 'Неделя подряд' },
  { n: 30, icon: '💪', name: 'Месяц подряд' },
  { n: 100, icon: '👑', name: '100 дней подряд' }
];

const actsOf = (key) => getDay(key).acts || [];
export const dayMinutes = (key) => actsOf(key).reduce((s, x) => s + (x.min || 0), 0);

export function isSoftDay(key = todayKey()) {
  const d = getDay(key);
  if (d.energy != null && d.energy < 35) return true;
  const c = cycleInfo(key);
  return !!c && c.energyShift < 0;
}

export const needMinutes = (key = todayKey()) => (isSoftDay(key) ? 1 : MIN_MINUTES);
export const qualifies = (key) => actsOf(key).length > 0 && dayMinutes(key) >= needMinutes(key);

const weekKey = (key) => addDays(key, -((parseKey(key).getDay() + 6) % 7));

export function streakInfo() {
  const today = todayKey();
  const all = getAllDays();
  const keys = Object.keys(all).filter((k) => all[k].acts?.length).sort();
  const res = { count: 0, best: 0, frozen: new Set(), todayDone: qualifies(today), freezeLeft: 1 };
  if (!keys.length) return res;
  let run = 0;
  let pending = [];
  const used = new Set();
  for (let k = keys[0]; k <= today; k = addDays(k, 1)) {
    if (qualifies(k)) {
      run++;
      pending.forEach((p) => res.frozen.add(p));
      pending = [];
      res.best = Math.max(res.best, run);
      continue;
    }
    if (k === today || run === 0) continue;
    const w = weekKey(k);
    if (!used.has(w)) { used.add(w); pending.push(k); continue; }
    pending.forEach((p) => used.delete(weekKey(p)));
    pending = [];
    run = 0;
  }
  pending.forEach((p) => res.frozen.add(p));
  res.count = run;
  res.freezeLeft = used.has(weekKey(today)) ? 0 : 1;
  return res;
}

// Новые вехи сохраняются навсегда и встают на полку.
export function checkMilestones() {
  const { count } = streakInfo();
  const have = get('milestones');
  const fresh = MILESTONES.filter((m) => count >= m.n && !have.some((h) => h.n === m.n));
  if (fresh.length) {
    set('milestones', [...have, ...fresh.map((m) => ({ n: m.n, date: todayKey() }))]);
    fresh.forEach((m) => toast(`${m.icon} Новая веха: ${m.name}! Награда на полке`));
  }
}

export function addActivity(a, min, key = todayKey(), id = uid()) {
  updateDay({ acts: [...actsOf(key), { id, a, min }] }, key);
  checkMilestones();
}

export function removeActivity(id, key = todayKey()) {
  updateDay({ acts: actsOf(key).filter((x) => x.id !== id) }, key);
}

export function toast(text) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = text;
  document.body.append(el);
  setTimeout(() => el.classList.add('hide'), 3200);
  setTimeout(() => el.remove(), 3800);
}

const days = (n) => `${n} ${plural(n, ['день', 'дня', 'дней'])}`;

export function streakLine() {
  const s = streakInfo();
  const today = todayKey();
  if (s.todayDone) return 'Сегодня серия продлена ✨';
  if (isSoftDay(today)) return 'Сегодня мягкий день — засчитается любая активность';
  const left = MIN_MINUTES - dayMinutes(today);
  return `До продления серии: ${left} мин активности`;
}

// Карточка на экране «Сегодня».
export function renderStreakCard() {
  const s = streakInfo();
  return `
    <a class="card streak-mini ${s.todayDone ? 'lit' : ''}" href="#activity">
      <span class="streak-fire">🔥</span>
      <span><b>${s.count ? `${days(s.count)} подряд` : 'Начни серию сегодня'}</b><small>${streakLine()}</small></span>
      <span class="streak-go">＋</span>
    </a>`;
}

let shownMonth = null;
let selected = null;

export function renderActivity(root) {
  const today = todayKey();
  shownMonth ??= today.slice(0, 7);
  selected ??= today;
  const s = streakInfo();
  const mine = myActivities();
  const have = get('milestones');

  root.innerHTML = `
    <section class="card streak-hero ${s.todayDone ? 'lit' : ''}">
      <div class="streak-big">🔥<b>${s.count}</b></div>
      <h2>${plural(s.count, ['день', 'дня', 'дней'])} подряд</h2>
      <p>${streakLine()}</p>
      <div class="streak-meta">
        <span>🏆 Рекорд: ${days(s.best)}</span>
        <span>❄️ Заморозка: ${s.freezeLeft ? 'есть на этой неделе' : 'использована'}</span>
      </div>
      <div class="milestones">
        ${MILESTONES.map((m) => {
          const got = have.find((h) => h.n === m.n);
          return `<div class="milestone ${got ? 'earned' : ''}"><span>${m.icon}</span><b>${m.n}</b><small>${got ? 'получено' : `${Math.min(s.count, m.n)} / ${m.n}`}</small></div>`;
        }).join('')}
      </div>
    </section>

    <section class="card">
      <h2>Записать активность</h2>
      ${isPregnant() ? '<p class="small-note">Нагрузку во время беременности лучше согласовать с врачом.</p>' : ''}
      <form class="form act-form">
        <label class="full">Что делала
          <select name="a">
            ${mine.map((a) => `<option value="${a.id}">${a.icon} ${esc(a.name)}</option>`).join('')}
            <option value="__new">＋ Своя активность…</option>
          </select>
        </label>
        <label class="full custom-name" hidden>Название<input name="name" maxlength="40" placeholder="Например, скандинавская ходьба"></label>
        <label>Минут<input type="number" name="min" min="1" max="600" value="${dailyMinutes()}" required></label>
        <label>Дата<input type="date" name="date" value="${today}" max="${today}" required></label>
        <button class="btn primary full">Записать</button>
      </form>
      <p class="form-error" hidden></p>
    </section>

    <section class="card">
      <div class="cal-head">
        <button class="icon-btn" data-month="-1" aria-label="Предыдущий месяц">‹</button>
        <h2>${monthTitle(shownMonth)}</h2>
        <button class="icon-btn" data-month="1" aria-label="Следующий месяц" ${shownMonth >= today.slice(0, 7) ? 'disabled' : ''}>›</button>
      </div>
      ${calendar(s)}
      <div class="day-detail">${dayDetail(selected)}</div>
    </section>

    ${stats(shownMonth)}`;

  const form = root.querySelector('.act-form');
  const select = form.elements.a;
  const nameBox = root.querySelector('.custom-name');
  select.onchange = () => { nameBox.hidden = select.value !== '__new'; };
  form.onsubmit = (e) => {
    e.preventDefault();
    const err = root.querySelector('.form-error');
    const min = Math.round(Number(form.elements.min.value));
    const date = form.elements.date.value || today;
    let a = select.value;
    if (a === '__new') {
      const name = form.elements.name.value.trim();
      if (!name) { err.hidden = false; err.textContent = 'Напиши название своей активности'; return; }
      const custom = get('custom');
      const found = custom.find((c) => c.name.toLowerCase() === name.toLowerCase());
      a = found?.id || `c-${uid()}`;
      if (!found) set('custom', [...custom, { id: a, name }]);
    }
    if (!(min > 0) || date > today) return;
    addActivity(a, min, date);
    selected = date;
    shownMonth = date.slice(0, 7);
    renderActivity(root);
  };

  root.querySelectorAll('[data-month]').forEach((b) => {
    b.onclick = () => {
      const [y, m] = shownMonth.split('-').map(Number);
      const d = new Date(y, m - 1 + Number(b.dataset.month), 1);
      shownMonth = todayKey(d).slice(0, 7);
      renderActivity(root);
    };
  });
  root.querySelectorAll('[data-day]').forEach((b) => {
    b.onclick = () => { selected = b.dataset.day; renderActivity(root); };
  });
  root.querySelectorAll('[data-del]').forEach((b) => {
    b.onclick = () => {
      removeActivity(b.dataset.del, selected);
      // если запись пришла из карточки — снимаем и отметку карточки
      const card = b.dataset.del.startsWith('card:') ? b.dataset.del.slice(5) : null;
      if (card) updateDay({ done: getDay(selected).done.filter((d) => d !== card) }, selected);
      renderActivity(root);
    };
  });
}

function calendar(s) {
  const today = todayKey();
  const first = `${shownMonth}-01`;
  const offset = (parseKey(first).getDay() + 6) % 7;
  const [y, m] = shownMonth.split('-').map(Number);
  const total = new Date(y, m, 0).getDate();
  const cells = Array(offset).fill('<span></span>');
  for (let d = 1; d <= total; d++) {
    const key = addDays(first, d - 1);
    const acts = actsOf(key);
    const colors = [...new Set(acts.map((x) => activityById(x.a).color))].slice(0, 3);
    const cls = [
      qualifies(key) ? 'done' : '', s.frozen.has(key) ? 'frozen' : '',
      key === today ? 'today' : '', key === selected ? 'sel' : '', key > today ? 'future' : ''
    ].join(' ');
    cells.push(`
      <button class="cal-day ${cls}" data-day="${key}" ${key > today ? 'disabled' : ''} aria-label="${longDate(key)}">
        <b>${d}</b>
        <i>${s.frozen.has(key) ? '❄️' : colors.map((c) => `<em style="background:${c}"></em>`).join('')}</i>
      </button>`);
  }
  return `
    <div class="cal">
      ${['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'].map((w) => `<small>${w}</small>`).join('')}
      ${cells.join('')}
    </div>`;
}

function dayDetail(key) {
  const acts = actsOf(key);
  const head = `<h3>${longDate(key)}${key === todayKey() ? ' · сегодня' : ''}</h3>`;
  if (!acts.length) return `${head}<p>Активности не записаны</p>`;
  return `${head}
    <ul class="list">
      ${acts.map((x) => {
        const a = activityById(x.a);
        return `<li><div><b>${a.icon} ${esc(a.name)}</b><small>${x.min} мин</small></div>
          <button class="icon-btn" data-del="${x.id}" aria-label="Удалить">✕</button></li>`;
      }).join('')}
    </ul>
    <p class="small-note">Всего: ${dayMinutes(key)} мин${qualifies(key) ? ' · день засчитан в серию 🔥' : ''}</p>`;
}

function stats(month) {
  const all = getAllDays();
  const monthKeys = Object.keys(all).filter((k) => k.startsWith(month) && all[k].acts?.length);
  const per = {};
  monthKeys.forEach((k) => all[k].acts.forEach((x) => { per[x.a] = (per[x.a] || 0) + x.min; }));
  const rows = Object.entries(per).sort((a, b) => b[1] - a[1]);
  const totalMin = rows.reduce((s, [, v]) => s + v, 0);
  const max = rows[0]?.[1] || 1;
  const allKeys = Object.keys(all).filter((k) => all[k].acts?.length);
  const allMin = allKeys.reduce((s, k) => s + dayMinutes(k), 0);
  const fav = rows[0] ? activityById(rows[0][0]) : null;

  return `
    <section class="card">
      <h2>Статистика</h2>
      <div class="stat-grid">
        <div><b>${monthKeys.length}</b><small>${plural(monthKeys.length, ['день', 'дня', 'дней'])} с активностью</small></div>
        <div><b>${totalMin}</b><small>минут за месяц</small></div>
        <div><b>${fav ? fav.icon : '—'}</b><small>${fav ? `любимое: ${esc(fav.name)}` : 'любимое появится'}</small></div>
      </div>
      ${rows.length ? `
        <div class="act-bars">
          ${rows.map(([id, v]) => {
            const a = activityById(id);
            return `<div class="act-bar"><span>${a.icon} ${esc(a.name)}</span><div><i style="width:${Math.round((v / max) * 100)}%;background:${a.color}"></i></div><small>${v} мин</small></div>`;
          }).join('')}
        </div>` : '<p>В этом месяце пока нет записей — начни с короткой прогулки 🌱</p>'}
      <p class="small-note">За всё время: ${days(allKeys.length)}, ${allMin} мин движения</p>
    </section>`;
}

