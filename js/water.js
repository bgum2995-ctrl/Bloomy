import { getDay, updateDay, getSettings, updateSettings, todayKey, get } from './storage.js';
import { getProfile, saveProfile, isPregnant, waterByWeight } from './profile.js';

const WEEKDAYS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

export function renderWater(root) {
  const { waterGoal, glassSize } = getSettings();
  const water = getDay().water;
  const pct = Math.min(100, Math.round((water / waterGoal) * 100));

  root.innerHTML = `
    <section class="card water">
      <h2>Вода сегодня</h2>
      <p>Проведи по стакану вверх или вниз, чтобы налить, сколько выпила</p>
      <div class="glass-wrap">
        <div class="glass" role="slider" tabindex="0" aria-label="Выпито воды, мл"
             aria-valuemin="0" aria-valuemax="${waterGoal}" aria-valuenow="${water}">
          <div class="glass-fill" style="height:${pct}%"></div>
          <div class="glass-label">${pct}%</div>
        </div>
      </div>
      <p class="water-amount">${water} / ${waterGoal} мл</p>
      ${water >= waterGoal ? '<p class="water-done">Норма выполнена 💧</p>' : ''}
      <div class="row">
        <button class="btn" data-act="minus">− ${glassSize} мл</button>
        <button class="btn primary" data-act="plus">+ стакан ${glassSize} мл</button>
      </div>
    </section>

    <section class="card">
      <h2>Последние 7 дней</h2>
      <div class="week">${weekBars(waterGoal)}</div>
    </section>

    <section class="card">
      <h2>Настройки</h2>
      <div class="settings">
        <label>Норма, мл<input type="number" min="250" step="250" name="waterGoal" value="${waterGoal}"></label>
        <label>Стакан, мл<input type="number" min="50" step="50" name="glassSize" value="${glassSize}"></label>
      </div>
      ${byWeight() ? `
        <div class="row">
          <button class="btn small" data-act="auto">${getProfile()?.waterAuto ? '✓ Считается по весу' : 'Посчитать по весу'}: ${byWeight()} мл</button>
        </div>
        <p class="small-note">30 мл на кг, но не меньше 1,6 л из напитков (ориентир EFSA для женщин), при беременности +300 мл.</p>` : ''}
    </section>
  `;

  root.querySelector('[data-act="plus"]').onclick = () => {
    updateDay({ water: water + glassSize });
    renderWater(root);
  };
  root.querySelector('[data-act="minus"]').onclick = () => {
    updateDay({ water: Math.max(0, water - glassSize) });
    renderWater(root);
  };
  root.querySelectorAll('.settings input').forEach((input) => {
    input.onchange = () => {
      const value = Math.round(Number(input.value));
      if (value > 0) updateSettings({ [input.name]: value });
      // своя норма отключает подсчёт по весу
      if (input.name === 'waterGoal' && getProfile()?.waterAuto) saveProfile({ ...getProfile(), waterAuto: false });
      renderWater(root);
    };
  });
  root.querySelector('[data-act="auto"]')?.addEventListener('click', () => {
    updateSettings({ waterGoal: byWeight() });
    const p = getProfile();
    if (p) saveProfile({ ...p, waterAuto: true });
    renderWater(root);
  });
  setupGlass(root, water, waterGoal, glassSize);
}

function lastWeight() {
  const rows = [...get('measurements')].filter((m) => m.weight).sort((a, b) => a.date.localeCompare(b.date));
  return rows.pop()?.weight || null;
}

const byWeight = () => waterByWeight(lastWeight(), isPregnant());

// Стакан наливается пальцем или курсором, как батарейка энергии.
function setupGlass(root, saved, goal, glassSize) {
  const glass = root.querySelector('.glass');
  const fill = root.querySelector('.glass-fill');
  const label = root.querySelector('.glass-label');
  const amount = root.querySelector('.water-amount');
  let value = saved;

  const paint = () => {
    const pct = Math.min(100, Math.round((value / goal) * 100));
    fill.style.height = `${pct}%`;
    label.textContent = `${pct}%`;
    amount.textContent = `${value} / ${goal} мл`;
    glass.setAttribute('aria-valuenow', value);
  };
  const setFromY = (clientY) => {
    const rect = glass.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (rect.bottom - clientY) / rect.height));
    value = Math.round((ratio * goal) / 50) * 50;
    paint();
  };
  const commit = () => {
    updateDay({ water: value });
    renderWater(root);
  };

  glass.addEventListener('pointerdown', (e) => {
    glass.setPointerCapture(e.pointerId);
    fill.style.transition = 'none';
    setFromY(e.clientY);
  });
  glass.addEventListener('pointermove', (e) => {
    if (glass.hasPointerCapture(e.pointerId)) setFromY(e.clientY);
  });
  glass.addEventListener('pointerup', commit);
  glass.addEventListener('keydown', (e) => {
    const step = { ArrowUp: glassSize, ArrowRight: glassSize, ArrowDown: -glassSize, ArrowLeft: -glassSize }[e.key];
    if (!step) return;
    e.preventDefault();
    value = Math.max(0, value + step);
    commit();
    root.querySelector('.glass')?.focus();
  });
}

function weekBars(goal) {
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const pct = Math.min(100, Math.round((getDay(todayKey(d)).water / goal) * 100));
    out.push(`
      <div class="bar-col">
        <div class="bar"><span style="height:${pct}%"></span></div>
        <small>${WEEKDAYS[d.getDay()]}</small>
      </div>`);
  }
  return out.join('');
}
