import { renderWater } from './water.js';

const view = document.getElementById('view');

const soon = (icon, title, text) => (root) => {
  root.innerHTML = `
    <section class="card soon">
      <span class="big">${icon}</span>
      <h2>${title}</h2>
      <p>${text}</p>
    </section>`;
};

const routes = {
  today: soon('🌱', 'Сегодня', 'Здесь появятся батарейка энергии, чек-лист и цветок.'),
  water: renderWater,
  shelf: soon('🪴', 'Полка цветов', 'Здесь будут стоять цветы за прошлые месяцы.'),
  more: soon('✨', 'Ещё', 'Отдых, цикл, замеры и анализы — скоро.')
};

function navigate() {
  const route = location.hash.slice(1);
  const name = routes[route] ? route : 'today';
  routes[name](view);
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.route === name));
}

document.querySelectorAll('.tab').forEach((t) => {
  t.onclick = () => { location.hash = t.dataset.route; };
});

document.getElementById('today-label').textContent = new Date().toLocaleDateString('ru-RU', {
  weekday: 'long', day: 'numeric', month: 'long'
});

window.addEventListener('hashchange', navigate);
navigate();
