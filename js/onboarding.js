import { get, set, getDay, updateDay, updateSettings, getSettings, todayKey } from './storage.js';
import { GOALS, LIMITS, ACTIVITIES, CARE, allowed } from './catalog.js';
import { getProfile, saveProfile, waterByWeight } from './profile.js';
import { FIELDS } from './measure.js';
import { dealCards } from './tasks.js';
import { planLevel } from './plan.js';
import { esc, uid } from './util.js';

// Стартовая анкета: по одному вопросу на экран. По ответам строятся карточки, план и норма воды.
const STEPS = ['hello', 'goal', 'measure', 'time', 'limits', 'acts', 'care', 'cycle', 'water', 'remind', 'done'];

let step = 0;
let draft = null;

function freshDraft() {
  const p = getProfile();
  const cycle = get('cycle');
  const last = [...get('measurements')].sort((a, b) => a.date.localeCompare(b.date)).pop() || {};
  return {
    name: p?.name || '',
    goal: p?.goal || null,
    measure: Object.fromEntries(FIELDS.map((f) => [f.id, last[f.id] ?? ''])),
    minutes: p?.minutes || 20,
    limits: p?.limits || [],
    activities: p?.activities || [],
    ownActs: [],
    care: p?.care || [],
    cycleStart: cycle.starts.slice().sort().pop() || '',
    cycleLength: cycle.length || 28,
    waterAuto: p ? !!p.waterAuto : true,
    water: getSettings().waterGoal,
    morning: p?.morning || '08:00',
    evening: p?.evening || '20:00'
  };
}

export function resetOnboarding() {
  step = 0;
  draft = null;
}

const toggle = (list, id) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
const pregnant = () => draft.limits.includes('pregnancy');
const autoWater = () => waterByWeight(Number(draft.measure.weight) || null, pregnant());

const chip = (on, attrs, text, extra = '') => `<button type="button" class="pick ${on ? 'on' : ''}" ${attrs} ${extra}>${text}</button>`;

function body(name) {
  switch (name) {
    case 'hello': return `
      <div class="ob-hero">🌸</div>
      <h2>Привет! Я Bloomy</h2>
      <p>Ответь на несколько вопросов — и я соберу программу под тебя: задания, план дня и норму воды. Ответы можно поменять в любой момент.</p>
      <label class="ob-field">Как к тебе обращаться?<input name="name" maxlength="30" value="${esc(draft.name)}" placeholder="Имя"></label>`;
    case 'goal': return `
      <h2>Какая у тебя цель?</h2>
      <p>Выбери главное направление.</p>
      <div class="picks col">
        ${GOALS.map((g) => chip(draft.goal === g.id, `data-goal="${g.id}"`, `<span>${g.icon}</span><b>${g.name}</b><small>${g.text}</small>`)).join('')}
      </div>`;
    case 'measure': return `
      <h2>Стартовые замеры</h2>
      <p>Можно пропустить и записать позже в «Замерах». По весу я посчитаю норму воды.</p>
      <div class="form">
        ${FIELDS.map((f) => `<label>${f.name}, ${f.unit}<input type="number" step="0.1" min="0" inputmode="decimal" data-m="${f.id}" value="${draft.measure[f.id]}"></label>`).join('')}
      </div>`;
    case 'time': return `
      <h2>Сколько времени в день готова уделять?</h2>
      <p>Под это подстроится длительность активностей.</p>
      <div class="picks">
        ${[10, 20, 40].map((m) => chip(draft.minutes === m, `data-min="${m}"`, `<b>${m}</b><small>минут</small>`)).join('')}
      </div>`;
    case 'limits': return `
      <h2>Есть ограничения по здоровью?</h2>
      <p>Чтобы не предлагать лишнего. Можно выбрать несколько.</p>
      <div class="picks col">
        ${LIMITS.map((l) => chip(draft.limits.includes(l.id), `data-limit="${l.id}"`, `<span>${l.icon}</span><b>${l.name}</b>`)).join('')}
        ${chip(!draft.limits.length, 'data-limit="none"', '<span>👍</span><b>Ничего из этого</b>')}
      </div>
      ${pregnant() ? '<p class="small-note">При беременности уберу банки, обёртывания, горячие ванночки, HIIT, скакалку и бодифлекс, а цель «вес» заменю на «самочувствие». Нагрузку лучше согласовать с врачом.</p>' : ''}`;
    case 'acts': return `
      <h2>Какая активность тебе нравится?</h2>
      <p>Из неё я буду собирать карточки и список для серии.</p>
      <div class="picks wrap">
        ${ACTIVITIES.map((a) => {
          const ok = allowed(a, draft.limits);
          return chip(ok && draft.activities.includes(a.id), `data-act="${a.id}"`, `${a.icon} ${a.name}`, ok ? '' : 'disabled title="Не подходит при твоих ограничениях"');
        }).join('')}
        ${draft.ownActs.map((n, i) => chip(true, `data-own="${i}"`, `⭐ ${esc(n)} ✕`)).join('')}
      </div>
      <div class="ob-add"><input name="own" maxlength="40" placeholder="Своя активность"><button type="button" class="btn small" data-act-add>Добавить</button></div>`;
    case 'care': return `
      <h2>Что из ухода за собой у тебя есть?</h2>
      <p>Добавлю процедуры в карточки дня.</p>
      <div class="picks wrap">
        ${CARE.map((c) => {
          const ok = allowed(c, draft.limits);
          return chip(ok && draft.care.includes(c.id), `data-care="${c.id}"`, `${c.icon} ${c.name}`, ok ? '' : 'disabled title="Не подходит при твоих ограничениях"');
        }).join('')}
      </div>`;
    case 'cycle': return `
      <h2>Женский цикл</h2>
      <p>По нему я подскажу, как ты можешь себя чувствовать, и смягчу план в трудные дни.${pregnant() ? ' Во время беременности этот шаг можно пропустить.' : ''}</p>
      <div class="form">
        <label>Начало последних месячных<input type="date" name="cycleStart" max="${todayKey()}" value="${draft.cycleStart}"></label>
        <label>Длина цикла, дней<input type="number" name="cycleLength" min="20" max="45" value="${draft.cycleLength}"></label>
      </div>`;
    case 'water': {
      const auto = autoWater();
      return `
      <h2>Норма воды</h2>
      <p>${auto ? `По весу получается <b>${auto} мл</b> в день из напитков.` : 'Вес не указан, поэтому посчитать по весу не получится — впиши свою норму.'}</p>
      <p class="small-note">Считаю 30 мл на кг веса, но не меньше 1,6 л — это ориентир EFSA для женщин (2 л воды в сутки, ~80% из напитков). При беременности +300 мл.</p>
      <div class="picks col">
        ${auto ? chip(draft.waterAuto, 'data-water="auto"', `<span>⚖️</span><b>Посчитать по весу</b><small>${auto} мл</small>`) : ''}
        ${chip(!draft.waterAuto || !auto, 'data-water="own"', '<span>✍️</span><b>Своя норма</b>')}
      </div>
      ${!draft.waterAuto || !auto ? `<label class="ob-field">Мл в день<input type="number" name="water" min="500" max="5000" step="50" value="${draft.water}"></label>` : ''}`;
    }
    case 'remind': return `
      <h2>Когда напоминать?</h2>
      <p>Утром спрошу про энергию, вечером — про активность и замеры. Напоминания показываются, когда открываешь приложение.</p>
      <div class="form">
        <label>Утро<input type="time" name="morning" value="${draft.morning}"></label>
        <label>Вечер<input type="time" name="evening" value="${draft.evening}"></label>
      </div>`;
    case 'done': {
      const goal = GOALS.find((g) => g.id === finalGoal());
      return `
      <div class="ob-hero">🌱</div>
      <h2>${draft.name ? `${esc(draft.name)}, всё готово!` : 'Всё готово!'}</h2>
      <ul class="plan-list">
        <li><span>${goal?.icon || '🎯'}</span><div><b>Цель</b><br>${goal?.name || 'не выбрана'}${pregnant() && draft.goal === 'weight' ? ' (при беременности — самочувствие)' : ''}</div></li>
        <li><span>⏱️</span><div><b>Время</b><br>${draft.minutes} минут в день</div></li>
        <li><span>🏃‍♀️</span><div><b>Активности</b><br>${draft.activities.length + draft.ownActs.length || 'все подходящие'}</div></li>
        <li><span>💧</span><div><b>Вода</b><br>${waterValue()} мл в день</div></li>
      </ul>
      <p class="small-note">Пройти анкету заново можно в разделе «Ещё».</p>`;
    }
  }
  return '';
}

const finalGoal = () => (pregnant() && draft.goal === 'weight' ? 'wellbeing' : draft.goal);
const waterValue = () => (draft.waterAuto && autoWater() ? autoWater() : Number(draft.water) || getSettings().waterGoal);

function readInputs(root) {
  root.querySelectorAll('[data-m]').forEach((i) => { draft.measure[i.dataset.m] = i.value; });
  ['name', 'cycleStart', 'cycleLength', 'water', 'morning', 'evening'].forEach((n) => {
    const i = root.querySelector(`[name="${n}"]`);
    if (i) draft[n] = i.value;
  });
}

function finish() {
  const custom = get('custom');
  draft.ownActs.forEach((name) => {
    if (!custom.some((c) => c.name.toLowerCase() === name.toLowerCase())) custom.push({ id: `c-${uid()}`, name });
  });
  set('custom', custom);

  saveProfile({
    done: todayKey(),
    name: draft.name.trim(),
    goal: finalGoal(),
    minutes: draft.minutes,
    limits: draft.limits,
    activities: draft.activities.filter((id) => allowed(ACTIVITIES.find((a) => a.id === id), draft.limits)),
    care: draft.care.filter((id) => allowed(CARE.find((c) => c.id === id), draft.limits)),
    waterAuto: !!(draft.waterAuto && autoWater()),
    morning: draft.morning,
    evening: draft.evening
  });

  const m = Object.fromEntries(Object.entries(draft.measure).filter(([, v]) => v !== '' && Number(v) > 0).map(([k, v]) => [k, Number(v)]));
  if (Object.keys(m).length) {
    const date = todayKey();
    const prev = get('measurements').find((x) => x.date === date) || {};
    set('measurements', [...get('measurements').filter((x) => x.date !== date), { ...prev, ...m, date }]);
  }

  if (draft.cycleStart) {
    const cycle = get('cycle');
    const len = Math.min(45, Math.max(20, Math.round(Number(draft.cycleLength) || 28)));
    set('cycle', { ...cycle, length: len, starts: [...new Set([...cycle.starts, draft.cycleStart])].sort() });
  }

  updateSettings({ waterGoal: waterValue() });

  // Карточки на сегодня пересобираем под новые ответы, если ещё ничего не отмечено.
  const day = getDay();
  if (!day.done.length) {
    if (day.energy != null) dealCards(planLevel(day.energy));
    else updateDay({ cards: null });
  }
  draft = null;
  location.hash = 'today';
}

export function skipOnboarding() {
  if (!getProfile()) saveProfile({ skipped: true, date: todayKey() });
  draft = null;
  location.hash = 'today';
}

export function renderOnboarding(root) {
  draft ??= freshDraft();
  const name = STEPS[step];
  const last = step === STEPS.length - 1;
  root.innerHTML = `
    <section class="card onboarding">
      <div class="ob-top">
        <div class="progress"><span style="width:${Math.round((step / (STEPS.length - 1)) * 100)}%"></span></div>
        ${last ? '' : '<button class="link-btn" data-skip>Пропустить анкету</button>'}
      </div>
      <div class="ob-body">${body(name)}</div>
      <p class="form-error" hidden></p>
      <div class="row ob-nav">
        ${step ? '<button class="btn" data-back>Назад</button>' : ''}
        <button class="btn primary" data-next>${last ? 'Начать 🌸' : step === 0 ? 'Начать анкету' : 'Дальше'}</button>
      </div>
    </section>`;

  const rerender = () => { readInputs(root); renderOnboarding(root); };
  const err = root.querySelector('.form-error');

  root.querySelector('[data-skip]')?.addEventListener('click', skipOnboarding);
  root.querySelector('[data-back]')?.addEventListener('click', () => { readInputs(root); step--; renderOnboarding(root); });
  root.querySelector('[data-next]').onclick = () => {
    readInputs(root);
    if (name === 'goal' && !draft.goal) { err.hidden = false; err.textContent = 'Выбери направление'; return; }
    if (last) { finish(); return; }
    step++;
    renderOnboarding(root);
    window.scrollTo(0, 0);
  };

  root.querySelectorAll('[data-goal]').forEach((b) => { b.onclick = () => { draft.goal = b.dataset.goal; rerender(); }; });
  root.querySelectorAll('[data-min]').forEach((b) => { b.onclick = () => { draft.minutes = Number(b.dataset.min); rerender(); }; });
  root.querySelectorAll('[data-limit]').forEach((b) => {
    b.onclick = () => {
      draft.limits = b.dataset.limit === 'none' ? [] : toggle(draft.limits, b.dataset.limit);
      rerender();
    };
  });
  root.querySelectorAll('[data-act]').forEach((b) => { b.onclick = () => { draft.activities = toggle(draft.activities, b.dataset.act); rerender(); }; });
  root.querySelectorAll('[data-own]').forEach((b) => { b.onclick = () => { draft.ownActs.splice(Number(b.dataset.own), 1); rerender(); }; });
  root.querySelector('[data-act-add]')?.addEventListener('click', () => {
    const input = root.querySelector('[name="own"]');
    const v = input.value.trim();
    if (v && !draft.ownActs.includes(v)) draft.ownActs.push(v);
    rerender();
  });
  root.querySelectorAll('[data-care]').forEach((b) => { b.onclick = () => { draft.care = toggle(draft.care, b.dataset.care); rerender(); }; });
  root.querySelectorAll('[data-water]').forEach((b) => { b.onclick = () => { draft.waterAuto = b.dataset.water === 'auto'; rerender(); }; });
}
