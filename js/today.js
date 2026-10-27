import { getDay, updateDay } from './storage.js';
import { taskById, dealCards, swapCard } from './tasks.js';
import { renderFlowerCard } from './flower.js';
import { renderCycleHint } from './cycle.js';
import { renderPlan, planLevel } from './plan.js';
import { renderSupport } from './support.js';
import { renderReminders, bindReminders } from './reminders.js';
const LEVELS = [
  [20, 'Совсем без сил — сегодня бережём себя'],
  [45, 'Сил немного — двигаемся мягко'],
  [70, 'Нормальная энергия'],
  [90, 'Бодрый день'],
  [101, 'Энергии через край ⚡']
];

const energyText = (v) => LEVELS.find(([max]) => v < max)[1];

export function renderToday(root) {
  let day = getDay();
  // дни из первой версии: задания уже отмечены, а карточек ещё не было
  if (!day.cards && day.done.length) {
    const cards = dealCards(planLevel(day.energy) ?? 2);
    updateDay({ cards: [...new Set([...day.done, ...cards])].filter(taskById) });
    day = getDay();
  }
  const energy = day.energy ?? 0;
  const done = new Set(day.done);
  const cards = (day.cards || []).map(taskById).filter(Boolean);
  const count = cards.filter((t) => done.has(t.id)).length;
  const allDone = cards.length > 0 && count === cards.length;

  root.innerHTML = `
    ${renderReminders()}
    ${renderFlowerCard()}

    <section class="card energy">
      <h2>Как у тебя с энергией?</h2>
      <p>Проведи по батарейке, чтобы налить свой уровень</p>
      <div class="battery-wrap">
        <div class="battery" role="slider" tabindex="0" aria-label="Уровень энергии"
             aria-valuemin="0" aria-valuemax="100" aria-valuenow="${energy}">
          <div class="battery-fill"></div>
          <div class="battery-label"></div>
        </div>
        <div class="battery-cap"></div>
      </div>
      <p class="energy-text"></p>
    </section>

    ${renderCycleHint()}
    ${renderPlan(day.energy)}

    <section class="card checklist">
      ${cards.length ? `
        <div class="checklist-head">
          <h2>Карточки на сегодня</h2>
          <span class="counter">${count} / ${cards.length}</span>
        </div>
        <div class="progress"><span style="width:${Math.round((count / cards.length) * 100)}%"></span></div>
        <ul class="tasks">
          ${cards.map((t) => `
            <li class="task-card">
              <button class="task ${done.has(t.id) ? 'done' : ''}" data-id="${t.id}" aria-pressed="${done.has(t.id)}">
                <span class="check"></span>
                <span class="task-ico">${t.icon}</span>
                <span class="task-text">${t.text}</span>
              </button>
              ${!day.swapped && !done.has(t.id) ? `<button class="swap" data-swap="${t.id}" aria-label="Заменить карточку" title="Заменить карточку">↻</button>` : ''}
            </li>`).join('')}
        </ul>
        <p class="swap-note">${day.swapped ? 'Замена на сегодня использована' : '↻ — одну карточку в день можно заменить'}</p>
        ${allDone ? '<p class="all-done">Все задания выполнены — цветок счастлив 🌸</p>' : ''}
      ` : `
        <h2>Карточки на сегодня</h2>
        <p>Наполни батарейку — и я соберу задания под твоё состояние.</p>
        <div class="row"><button class="btn" data-act="deal">Собрать без оценки</button></div>
      `}
    </section>

    ${renderSupport(allDone)}
  `;

  const rerender = () => renderToday(root);
  bindReminders(root, rerender);
  setupBattery(root, day.energy, (value) => {
    if (!getDay().cards) dealCards(planLevel(value));
    rerender();
  });

  root.querySelector('[data-act="deal"]')?.addEventListener('click', () => {
    dealCards(2);
    rerender();
  });

  root.querySelectorAll('.task').forEach((btn) => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      if (done.has(id)) done.delete(id); else done.add(id);
      updateDay({ done: [...done] });
      rerender();
    };
  });

  root.querySelectorAll('[data-swap]').forEach((btn) => {
    btn.onclick = () => {
      if (swapCard(btn.dataset.swap)) rerender();
    };
  });
}

function setupBattery(root, saved, onCommit) {
  const battery = root.querySelector('.battery');
  const fill = root.querySelector('.battery-fill');
  const label = root.querySelector('.battery-label');
  const text = root.querySelector('.energy-text');
  let value = saved ?? 0;

  const paint = () => {
    fill.style.width = `${value}%`;
    fill.style.background = value < 30 ? 'var(--pink)' : value < 65 ? 'var(--sun)' : 'var(--mint)';
    label.textContent = saved === null && value === 0 ? '?' : `${value}%`;
    text.textContent = saved === null && value === 0 ? '' : energyText(value);
    battery.setAttribute('aria-valuenow', value);
  };

  const setFromX = (clientX) => {
    const rect = battery.getBoundingClientRect();
    value = Math.round(Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) * 100);
    saved = value;
    paint();
  };

  const commit = () => {
    updateDay({ energy: value });
    onCommit(value);
  };

  battery.addEventListener('pointerdown', (e) => {
    battery.setPointerCapture(e.pointerId);
    setFromX(e.clientX);
  });
  battery.addEventListener('pointermove', (e) => {
    if (battery.hasPointerCapture(e.pointerId)) setFromX(e.clientX);
  });
  battery.addEventListener('pointerup', commit);
  battery.addEventListener('keydown', (e) => {
    const step = { ArrowRight: 5, ArrowUp: 5, ArrowLeft: -5, ArrowDown: -5 }[e.key];
    if (!step) return;
    e.preventDefault();
    value = Math.min(100, Math.max(0, value + step));
    saved = value;
    paint();
    commit();
    root.querySelector('.battery')?.focus();
  });

  paint();
}
