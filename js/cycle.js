import { get, set, todayKey } from './storage.js';
import { daysBetween, addDays, pickBy, longDate, shortDate, backLink, esc } from './util.js';

// Фазы цикла. Это ориентиры, а не диагноз: у каждой всё по-своему.
export const PHASES = {
  menstrual: {
    name: 'Менструация', color: '#f4a6bd', energyShift: -1,
    feel: [
      'Сегодня может хотеться тепла и покоя. Энергии меньше — это нормально.',
      'Возможны слабость и тянущие ощущения. Береги себя и не требуй рекордов.',
      'Организм занят важной работой. Тёплый чай, плед и мягкое движение — твои друзья.'
    ],
    tip: 'Больше железа и тепла: гречка, зелень, тёплые супы. Движение — только мягкое.'
  },
  follicular: {
    name: 'Фолликулярная фаза', color: '#a8d5b4', energyShift: 0,
    feel: [
      'Энергия постепенно растёт, настроение светлеет. Хорошее время для нового.',
      'Тело легче откликается на нагрузку — можно добавить активности.',
      'Голова ясная, хочется действовать. Отличный момент начать привычку.'
    ],
    tip: 'Хорошо идут тренировки и новые полезные блюда.'
  },
  ovulation: {
    name: 'Овуляция', color: '#ffd98a', energyShift: 0,
    feel: [
      'Пик энергии и уверенности. Ты можешь чувствовать себя особенно бодро.',
      'Самые энергичные дни цикла — хорошо для активности и общения.',
      'Можешь чувствовать прилив сил и лёгкость. Используй его в удовольствие.'
    ],
    tip: 'Можно взять задание поактивнее — тело готово.'
  },
  luteal: {
    name: 'Лютеиновая фаза', color: '#c9b6e8', energyShift: 0,
    feel: [
      'Энергия ровная, но может захотеться сладкого и уюта.',
      'Аппетит может подрасти — это гормоны, а не слабость воли.',
      'Хорошо работают привычные спокойные ритуалы и режим сна.'
    ],
    tip: 'Сложные углеводы и белок помогут не тянуться к сладкому.'
  },
  pms: {
    name: 'Перед месячными', color: '#e8b8c8', energyShift: -1,
    feel: [
      'Возможны отёки, раздражительность и тяга к сладкому. Будь к себе мягче.',
      'Вес может немного подрасти из‑за воды — это временно и не про жир.',
      'Настроение может скакать. Меньше требований к себе, больше заботы.'
    ],
    tip: 'Меньше соли, больше воды и сна. Замеры в эти дни лучше не делать.'
  }
};

function averageLength(starts, fallback) {
  const gaps = [];
  for (let i = 1; i < starts.length; i++) {
    const g = daysBetween(starts[i - 1], starts[i]);
    if (g >= 20 && g <= 45) gaps.push(g);
  }
  if (!gaps.length) return fallback;
  return Math.round(gaps.slice(-6).reduce((a, b) => a + b, 0) / Math.min(gaps.length, 6));
}

function phaseOf(day, len, period) {
  const ov = len - 14;
  if (day <= period) return 'menstrual';
  if (day < ov - 1) return 'follicular';
  if (day <= ov + 1) return 'ovulation';
  if (day > len - 5) return 'pms';
  return 'luteal';
}

// Информация о цикле на дату. null — если цикл ещё не настроен.
export function cycleInfo(key = todayKey()) {
  const { starts, length, period } = get('cycle');
  const past = starts.filter((s) => s <= key).sort();
  if (!past.length) return null;
  const last = past[past.length - 1];
  const len = averageLength(starts, length);
  const sinceStart = daysBetween(last, key) + 1;
  const late = sinceStart > len;
  // если новый старт не отмечен, считаем по прогнозу
  const day = ((sinceStart - 1) % len) + 1;
  const phase = phaseOf(day, len, period);
  const nextStart = addDays(last, len * Math.ceil(sinceStart / len));
  return {
    day, len, phase, late, last,
    ...PHASES[phase],
    feeling: pickBy(key + phase, PHASES[phase].feel),
    nextStart,
    daysToNext: daysBetween(key, nextStart)
  };
}

export function renderCycleHint() {
  const c = cycleInfo();
  if (!c) {
    return `
      <a class="card hint-card" href="#cycle">
        <span class="hint-ico">🌙</span>
        <span><b>Учесть цикл</b><br><small>Укажи дату последних месячных — подскажу, как ты можешь себя чувствовать</small></span>
      </a>`;
  }
  return `
    <a class="card cycle-hint" href="#cycle" style="--phase:${c.color}">
      <div class="cycle-day"><b>${c.day}</b><small>день</small></div>
      <div>
        <h3>${c.name}</h3>
        <p>${c.feeling}</p>
      </div>
    </a>`;
}

export function renderCycle(root) {
  const cycle = get('cycle');
  const c = cycleInfo();
  const starts = [...cycle.starts].sort().reverse();

  const strip = c ? Array.from({ length: c.len }, (_, i) => {
    const d = i + 1;
    const p = PHASES[phaseOf(d, c.len, cycle.period)];
    return `<span class="strip-day ${d === c.day ? 'now' : ''}" style="background:${p.color}" title="${d} день — ${p.name}"></span>`;
  }).join('') : '';

  root.innerHTML = `
    ${backLink('Цикл')}
    ${c ? `
      <section class="card cycle-main" style="--phase:${c.color}">
        <div class="cycle-big"><b>${c.day}</b><small>день из ${c.len}</small></div>
        <h2>${c.name}</h2>
        <p>${c.feeling}</p>
        <p class="tip">💡 ${c.tip}</p>
        <div class="strip">${strip}</div>
        <div class="legend">${Object.values(PHASES).map((p) => `<span><i style="background:${p.color}"></i>${p.name}</span>`).join('')}</div>
        <p class="next">${c.late
          ? `Месячные ожидались ${shortDate(addDays(c.last, c.len))} — отметь, когда начнутся`
          : `Следующие месячные примерно ${shortDate(c.nextStart)} (через ${c.daysToNext} дн.)`}</p>
      </section>` : `
      <section class="card">
        <h2>Настроим цикл</h2>
        <p>Укажи, когда начались последние месячные. Всё хранится только в этом браузере.</p>
      </section>`}

    <section class="card">
      <button class="btn primary wide" data-act="today">🩸 Месячные начались сегодня</button>
      <form class="form" data-form="start">
        <label>Или выбери дату начала<input type="date" name="date" max="${todayKey()}" required></label>
        <button class="btn">Добавить</button>
      </form>
    </section>

    <section class="card">
      <h2>Настройки</h2>
      <form class="form row-form" data-form="settings">
        <label>Длина цикла, дней<input type="number" name="length" min="20" max="45" value="${cycle.length}"></label>
        <label>Месячные, дней<input type="number" name="period" min="2" max="10" value="${cycle.period}"></label>
        <button class="btn">Сохранить</button>
      </form>
      <p class="small-note">Когда отмечено несколько циклов, длина считается автоматически по средней.</p>
    </section>

    ${starts.length ? `
      <section class="card">
        <h2>История</h2>
        <ul class="list">
          ${starts.map((s) => `<li><span>${esc(longDate(s))}</span><button class="icon-btn" data-del="${s}" aria-label="Удалить">✕</button></li>`).join('')}
        </ul>
      </section>` : ''}
  `;

  const addStart = (date) => {
    if (!date || cycle.starts.includes(date)) return;
    set('cycle', { ...cycle, starts: [...cycle.starts, date].sort() });
    renderCycle(root);
  };

  root.querySelector('[data-act="today"]').onclick = () => addStart(todayKey());
  root.querySelector('[data-form="start"]').onsubmit = (e) => {
    e.preventDefault();
    addStart(e.target.date.value);
  };
  root.querySelector('[data-form="settings"]').onsubmit = (e) => {
    e.preventDefault();
    const length = Math.min(45, Math.max(20, Number(e.target.length.value) || 28));
    const period = Math.min(10, Math.max(2, Number(e.target.period.value) || 5));
    set('cycle', { ...cycle, length, period });
    renderCycle(root);
  };
  root.querySelectorAll('[data-del]').forEach((b) => {
    b.onclick = () => {
      set('cycle', { ...cycle, starts: cycle.starts.filter((s) => s !== b.dataset.del) });
      renderCycle(root);
    };
  });
}
