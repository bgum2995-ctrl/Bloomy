import { getAllDays, getSettings, get, set, todayKey } from './storage.js';
import { monthFlower, flowerSVG } from './flower.js';
import { monthTitle, addDays } from './util.js';

// Награды месяца считаются из сохранённых дней.
export function monthStats(month) {
  const days = getAllDays();
  const { waterGoal } = getSettings();
  const keys = Object.keys(days).filter((k) => k.startsWith(month));
  const flower = monthFlower(month);
  return {
    flower,
    activeDays: keys.filter((k) => days[k].done?.length).length,
    fullDays: keys.filter((k) => days[k].cards?.length && days[k].done?.length >= days[k].cards.length).length,
    waterDays: keys.filter((k) => days[k].water >= waterGoal).length,
    restCount: keys.reduce((s, k) => s + (days[k].rest || 0), 0),
    energyDays: keys.filter((k) => days[k].energy != null).length,
    measured: get('measurements').some((m) => m.date.startsWith(month)),
    hasData: keys.length > 0
  };
}

export const BADGES = [
  { id: 'bloom', icon: '🌸', name: 'Цветок расцвёл', goal: 'Вырастить цветок до цветения', need: 4, value: (s) => s.flower.stage },
  { id: 'steady', icon: '🔥', name: 'Постоянство', goal: '20 дней с выполненными заданиями', need: 20, value: (s) => s.activeDays },
  { id: 'perfect', icon: '⭐', name: 'Идеальные дни', goal: '7 дней, когда выполнено всё', need: 7, value: (s) => s.fullDays },
  { id: 'water', icon: '💧', name: 'Водный баланс', goal: '20 дней с нормой воды', need: 20, value: (s) => s.waterDays },
  { id: 'rest', icon: '🧘‍♀️', name: 'Умею отдыхать', goal: '10 пауз отдыха', need: 10, value: (s) => s.restCount },
  { id: 'listen', icon: '🔋', name: 'Слышу себя', goal: '25 утренних отметок энергии', need: 25, value: (s) => s.energyDays },
  { id: 'measure', icon: '📏', name: 'Замеры сделаны', goal: 'Записать замеры за месяц', need: 1, value: (s) => (s.measured ? 1 : 0) }
];

export function monthBadges(month) {
  const s = monthStats(month);
  return BADGES.map((b) => {
    const v = Math.min(b.need, b.value(s));
    return { ...b, progress: v, earned: v >= b.need };
  });
}

export const badgeHTML = (b, showProgress) => `
  <div class="badge ${b.earned ? 'earned' : ''}" title="${b.goal}">
    <span class="badge-ico">${b.icon}</span>
    <b>${b.name}</b>
    <small>${showProgress && !b.earned ? `${b.progress} / ${b.need}` : b.earned ? 'получено' : b.goal}</small>
  </div>`;

// При первом открытии в новом месяце — показываем итоги прошлого.
export function maybeShowMonthSummary() {
  const prev = addDays(todayKey().slice(0, 7) + '-01', -1).slice(0, 7);
  const seen = get('seenRewards');
  if (seen.includes(prev)) return;
  const stats = monthStats(prev);
  set('seenRewards', [...seen, prev]);
  if (!stats.hasData) return;
  const earned = monthBadges(prev).filter((b) => b.earned);

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-box" role="dialog" aria-modal="true" aria-label="Итоги месяца">
      <h2>Итоги: ${monthTitle(prev)}</h2>
      <div class="modal-flower">${flowerSVG(stats.flower)}</div>
      <p>Твой цветок «${stats.flower.stageName}» встал на полку 🪴</p>
      ${earned.length
        ? `<p><b>Награды месяца:</b></p><div class="badges">${earned.map((b) => badgeHTML(b)).join('')}</div>`
        : '<p>В этом месяце наград нет — но цветок всё равно твой. Новый месяц, новый росток 🌱</p>'}
      <button class="btn primary wide">Ура!</button>
    </div>`;
  document.body.append(modal);
  modal.querySelector('button').onclick = () => modal.remove();
}
