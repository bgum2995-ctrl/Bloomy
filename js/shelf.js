import { getAllDays, todayKey } from './storage.js';
import { monthFlower, flowerSVG, renderFlowerCard } from './flower.js';
import { monthBadges, badgeHTML } from './rewards.js';
import { monthTitle, longDate } from './util.js';
import { MILESTONES } from './activity.js';
import { get } from './storage.js';

export function renderShelf(root) {
  const current = todayKey().slice(0, 7);
  const months = [...new Set(Object.keys(getAllDays()).map((k) => k.slice(0, 7)))]
    .filter((m) => m < current)
    .sort()
    .reverse();

  root.innerHTML = `
    <section class="card">
      <h2>Награды этого месяца</h2>
      <p>Выполни условие до конца месяца — награда встанет на полку вместе с цветком.</p>
      <div class="badges">${monthBadges(current).map((b) => badgeHTML(b, true)).join('')}</div>
    </section>

    ${renderFlowerCard()}

    <section class="card">
      <h2>Вехи серии</h2>
      <p>Награды за дни активности подряд — остаются навсегда.</p>
      <div class="badges">${MILESTONES.map((m) => {
        const got = get('milestones').find((h) => h.n === m.n);
        return `<div class="badge ${got ? 'earned' : ''}"><span class="badge-ico">${m.icon}</span><b>${m.name}</b><small>${got ? longDate(got.date) : `${m.n} дней подряд`}</small></div>`;
      }).join('')}</div>
    </section>

    <section class="card">
      <h2>Полка цветов</h2>
      ${months.length ? `
        <div class="shelf">
          ${months.map((m) => {
            const f = monthFlower(m);
            const earned = monthBadges(m).filter((b) => b.earned);
            return `
              <div class="shelf-item">
                ${flowerSVG(f)}
                <b>${monthTitle(m)}</b>
                <small>${f.stageName}</small>
                <div class="shelf-badges">${earned.map((b) => `<span title="${b.name}">${b.icon}</span>`).join('')}</div>
              </div>`;
          }).join('')}
        </div>` : '<p>Пока пусто. В конце месяца сюда встанет твой первый цветок 🌱</p>'}
    </section>`;
}
