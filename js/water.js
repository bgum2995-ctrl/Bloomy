import { getDay, updateDay, getSettings, updateSettings, todayKey } from './storage.js';

const WEEKDAYS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

export function renderWater(root) {
  const { waterGoal, glassSize } = getSettings();
  const water = getDay().water;
  const pct = Math.min(100, Math.round((water / waterGoal) * 100));

  root.innerHTML = `
    <section class="card water">
      <h2>Вода сегодня</h2>
      <div class="glass-wrap">
        <div class="glass">
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
      renderWater(root);
    };
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
