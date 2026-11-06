import { renderWater } from './water.js';
import { renderToday } from './today.js';
import { renderShelf } from './shelf.js';
import { renderMore } from './more.js';
import { renderCycle } from './cycle.js';
import { renderRest } from './rest.js';
import { renderMeasure } from './measure.js';
import { renderHealth } from './health.js';
import { getReminders } from './reminders.js';
import { maybeShowMonthSummary } from './rewards.js';
import { renderOnboarding, resetOnboarding } from './onboarding.js';
import { renderActivity, streakInfo, toast } from './activity.js';
import { getProfile, userName } from './profile.js';
import { getDay, updateDay } from './storage.js';
import { plural } from './util.js';

const view = document.getElementById('view');

// tab — какая вкладка подсвечивается для страницы из раздела «Ещё»
const routes = {
  today: [renderToday, 'today'],
  water: [renderWater, 'water'],
  shelf: [renderShelf, 'shelf'],
  more: [renderMore, 'more'],
  cycle: [renderCycle, 'more'],
  rest: [renderRest, 'more'],
  measure: [renderMeasure, 'more'],
  health: [renderHealth, 'more'],
  activity: [renderActivity, 'activity'],
  welcome: [renderOnboarding, null]
};

let current = null;

function navigate() {
  let route = location.hash.slice(1);
  // Первый вход — сначала анкета.
  if (!getProfile() && route !== 'welcome') {
    location.replace('#welcome');
    route = 'welcome';
  }
  const name = routes[route] ? route : 'today';
  if (name === 'welcome' && current !== 'welcome') resetOnboarding();
  current = name;
  document.body.classList.toggle('onboarding', name === 'welcome');
  const [render, tab] = routes[name];
  render(view);
  window.scrollTo(0, 0);
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.route === tab));
  document.querySelector('[data-route="more"]').classList.toggle('has-dot', getReminders().length > 0);
}

document.querySelectorAll('.tab').forEach((t) => {
  t.onclick = () => { location.hash = t.dataset.route; };
});

function setDate() {
  document.getElementById('today-label').textContent = new Date().toLocaleDateString('ru-RU', {
    weekday: 'long', day: 'numeric', month: 'long'
  });
}

// Если приложение оставили открытым через полночь — обновляем экран при возвращении.
let shownDay = new Date().toDateString();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || shownDay === new Date().toDateString()) return;
  shownDay = new Date().toDateString();
  setDate();
  navigate();
  maybeShowMonthSummary();
  greet();
});

// Один раз в день — приветствие с текущей серией.
function greet() {
  if (!getProfile() || getDay().greeted) return;
  const { count } = streakInfo();
  updateDay({ greeted: true });
  const name = userName();
  const hi = name ? `С возвращением, ${name}!` : 'С возвращением!';
  toast(count ? `${hi} 🔥 Серия: ${count} ${plural(count, ['день', 'дня', 'дней'])}` : `${hi} Начнём серию сегодня 🌱`);
}

window.addEventListener('hashchange', navigate);
setDate();
navigate();
maybeShowMonthSummary();
greet();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
