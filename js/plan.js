import { cycleInfo } from './cycle.js';
import { pickBy } from './util.js';
import { todayKey, getDay } from './storage.js';
import { getProfile, hasProfile, myActivities, isPregnant } from './profile.js';
import { minutesFor, taskById } from './tasks.js';

const GOAL_TIPS = {
  weight: ['🎯', 'Цель: вес', 'Небольшой дефицит без голода: овощи, белок, меньше сладких напитков'],
  volume: ['🎯', 'Цель: объёмы', 'Силовые и тонус: резинки, пилатес, приседания — плюс белок в каждый приём пищи'],
  wellbeing: ['🎯', 'Цель: самочувствие', 'Сон, вода и движение в удовольствие — без подсчётов']
};

// Движение из анкеты: любимая активность под уровень дня и выбранное время.
function personalMove(level) {
  const card = (getDay().cards || []).find((c) => c.startsWith('act:'));
  if (card && taskById(card)) {
    const t = taskById(card);
    return [t.icon, 'Движение', `${t.text}${level === 1 ? ', в мягком темпе' : ''}`];
  }
  const list = myActivities().filter((a) => (a.level || 1) <= level);
  if (!list.length) return null;
  const a = pickBy(todayKey() + 'move', list);
  return [a.icon, 'Движение', `${a.name} — ${minutesFor(level)} мин${level === 1 ? ', в мягком темпе' : ''}`];
}

// План дня собирается из шаблонов: уровень по энергии, поправка на фазу цикла.
export function planLevel(energy) {
  if (energy == null) return null;
  let level = energy < 35 ? 1 : energy < 70 ? 2 : 3;
  const c = cycleInfo();
  if (c) level += c.energyShift;
  return Math.min(3, Math.max(1, level));
}

const PLANS = {
  1: {
    title: 'Мягкий день',
    intro: [
      'Сегодня бережём силы. Немного заботы — уже победа.',
      'День для тишины и восстановления. Делай только то, что приятно телу.'
    ],
    items: [
      ['🚶‍♀️', 'Движение', 'Короткая прогулка или 5 минут растяжки'],
      ['🍲', 'Еда', 'Тёплая, простая еда, без экспериментов'],
      ['💧', 'Вода', 'Тёплая вода и травяной чай в течение дня'],
      ['🛋️', 'Отдых', 'Хотя бы две паузы по 10 минут без экрана'],
      ['😴', 'Сон', 'Лечь пораньше — сон сегодня главное задание']
    ]
  },
  2: {
    title: 'Ровный день',
    intro: [
      'Обычный хороший день. Двигаемся спокойно и с удовольствием.',
      'Сил достаточно — выполняй задания в своём темпе.'
    ],
    items: [
      ['🚶‍♀️', 'Движение', 'Прогулка 20–30 минут или лёгкая йога'],
      ['🥗', 'Еда', 'Овощи и белок в каждом приёме пищи'],
      ['💧', 'Вода', 'Стакан воды перед каждой едой'],
      ['🌿', 'Отдых', 'Дыхательная пауза после обеда'],
      ['😴', 'Сон', 'Экран отложить за 30 минут до сна']
    ]
  },
  3: {
    title: 'Активный день',
    intro: [
      'Энергии много — отличный день, чтобы продвинуться!',
      'Ты на подъёме. Возьми задание поактивнее, но не забудь про отдых.'
    ],
    items: [
      ['🏃‍♀️', 'Движение', 'Тренировка 30 минут или быстрая прогулка'],
      ['🥦', 'Еда', 'Полноценный обед и заготовка еды на завтра'],
      ['💧', 'Вода', 'Добрать норму воды до вечера, особенно после тренировки'],
      ['🧘‍♀️', 'Отдых', 'Растяжка после нагрузки'],
      ['😴', 'Сон', '7–8 часов, чтобы мышцы восстановились']
    ]
  }
};

function items(plan, level) {
  if (!hasProfile()) return plan.items;
  const move = personalMove(level);
  const list = plan.items.map((it) => (it[1] === 'Движение' && move ? move : it));
  const goal = GOAL_TIPS[getProfile().goal];
  if (goal) list.unshift(goal);
  if (isPregnant()) list.push(['🤰', 'Бережно', 'Любую нагрузку согласуй с врачом, слушай тело']);
  return list;
}

export function renderPlan(energy) {
  const level = planLevel(energy);
  if (!level) return '';
  const plan = PLANS[level];
  const c = cycleInfo();
  return `
    <section class="card plan plan-${level}">
      <div class="plan-head">
        <h2>План: ${plan.title}</h2>
        <span class="plan-dots">${'●'.repeat(level)}${'○'.repeat(3 - level)}</span>
      </div>
      <p>${pickBy(todayKey() + 'plan', plan.intro)}</p>
      <ul class="plan-list">
        ${items(plan, level).map(([icon, name, text]) => `<li><span>${icon}</span><div><b>${name}</b><br>${text}</div></li>`).join('')}
        ${c ? `<li><span>🌙</span><div><b>Цикл</b><br>${c.tip}</div></li>` : ''}
      </ul>
    </section>`;
}
