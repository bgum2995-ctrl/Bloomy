import { getDay, updateDay } from './storage.js';
import { backLink } from './util.js';

const IDEAS = [
  ['🛁', 'Тёплый душ или ванна с пеной'],
  ['📖', '15 минут любимой книги'],
  ['🎧', 'Спокойный плейлист с закрытыми глазами'],
  ['🌳', 'Посидеть у окна или на балконе без телефона'],
  ['☕', 'Чай в красивой чашке, медленно, только он'],
  ['🧴', 'Намазать руки кремом и сделать самомассаж'],
  ['🖍️', 'Порисовать или раскрасить что угодно'],
  ['🛏️', 'Полежать 10 минут с ногами на стене'],
  ['🕯️', 'Зажечь свечу и просто посмотреть на огонь'],
  ['✍️', 'Записать три вещи, за которые благодарна сегодня'],
  ['🐈', 'Погладить питомца или обнять плед'],
  ['🌸', 'Сделать маску для лица и ничего не делать']
];

const STEPS = [
  ['Вдох', 4000, 'in'],
  ['Пауза', 4000, 'hold'],
  ['Выдох', 6000, 'out'],
  ['Пауза', 2000, 'hold-out']
];

// два независимых таймера: дыхание и пауза
let breathT = null;
let pauseT = null;
const stopAll = () => { clearTimeout(breathT); clearTimeout(pauseT); breathT = pauseT = null; };

export function renderRest(root) {
  stopAll();
  const rest = getDay().rest;
  let ideaIndex = Math.floor(Math.random() * IDEAS.length);

  root.innerHTML = `
    ${backLink('Отдых')}
    <section class="card breathe">
      <h2>Дыхание 4 – 4 – 6</h2>
      <p>Вдох носом, пауза, медленный выдох. Пять кругов успокаивают нервную систему.</p>
      <div class="breathe-wrap"><div class="breathe-circle"><span>Готова?</span></div></div>
      <button class="btn primary" data-act="breathe">Начать</button>
    </section>

    <section class="card">
      <h2>Пауза-таймер</h2>
      <p>Отложи телефон и просто побудь в тишине.</p>
      <div class="timer" aria-live="polite">—</div>
      <div class="row">
        <button class="btn" data-min="3">3 мин</button>
        <button class="btn" data-min="5">5 мин</button>
        <button class="btn" data-min="10">10 мин</button>
      </div>
    </section>

    <section class="card idea">
      <h2>Идея для отдыха</h2>
      <p class="idea-text"></p>
      <div class="row"><button class="btn" data-act="idea">Другая идея</button></div>
    </section>

    <section class="card rest-count">
      <p>Пауз отдыха сегодня: <b>${rest}</b></p>
      <button class="btn primary" data-act="rested">Я отдохнула 💜</button>
    </section>`;

  const ideaText = root.querySelector('.idea-text');
  const showIdea = () => { ideaText.textContent = IDEAS[ideaIndex].join(' '); };
  showIdea();
  root.querySelector('[data-act="idea"]').onclick = () => {
    ideaIndex = (ideaIndex + 1 + Math.floor(Math.random() * (IDEAS.length - 1))) % IDEAS.length;
    showIdea();
  };

  const addRest = () => { updateDay({ rest: getDay().rest + 1 }); };
  root.querySelector('[data-act="rested"]').onclick = () => { addRest(); renderRest(root); };

  // дыхание
  const circle = root.querySelector('.breathe-circle');
  const label = circle.querySelector('span');
  const btn = root.querySelector('[data-act="breathe"]');
  btn.onclick = () => {
    if (breathT) {
      clearTimeout(breathT); breathT = null;
      circle.className = 'breathe-circle';
      label.textContent = 'Готова?';
      btn.textContent = 'Начать';
      return;
    }
    btn.textContent = 'Стоп';
    let i = 0;
    const total = 5 * STEPS.length;
    const tick = () => {
      if (!circle.isConnected) return;
      if (i >= total) {
        clearTimeout(breathT); breathT = null;
        circle.className = 'breathe-circle';
        label.textContent = 'Готово 💜';
        btn.textContent = 'Ещё раз';
        addRest();
        root.querySelector('.rest-count b').textContent = getDay().rest;
        return;
      }
      const [name, ms, cls] = STEPS[i % STEPS.length];
      circle.className = `breathe-circle ${cls}`;
      circle.style.transitionDuration = `${ms}ms`;
      label.textContent = `${name} · ${Math.floor(i / STEPS.length) + 1}/5`;
      i++;
      breathT = setTimeout(tick, ms);
    };
    tick();
  };

  // таймер паузы
  const out = root.querySelector('.timer');
  root.querySelectorAll('[data-min]').forEach((b) => {
    b.onclick = () => {
      clearTimeout(pauseT);
      const end = Date.now() + Number(b.dataset.min) * 60000;
      const tick = () => {
        if (!out.isConnected) return;
        const left = Math.max(0, Math.round((end - Date.now()) / 1000));
        out.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
        if (!left) {
          out.textContent = 'Пауза окончена 🌿';
          addRest();
          root.querySelector('.rest-count b').textContent = getDay().rest;
          pauseT = null;
          return;
        }
        pauseT = setTimeout(tick, 1000);
      };
      tick();
    };
  });
}
