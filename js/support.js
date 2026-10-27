import { getDay, todayKey } from './storage.js';
import { pickBy } from './util.js';
import { cycleInfo } from './cycle.js';

// Слова поддержки в конце дня — шаблонные, подбираются по тому, как прошёл день.
const TEXTS = {
  none: [
    'Сегодня не получилось — и это нормально. Завтра новый день, а цветок дождётся тебя 🌱',
    'Бывают дни, когда главное — просто прожить их. Ты справилась. Отдыхай.',
    'Ты не обязана быть продуктивной каждый день. Обними себя и ложись спать пораньше.'
  ],
  some: [
    'Ты сделала шаг — а шаги складываются в путь. Горжусь тобой 💛',
    'Даже немного — это больше, чем ничего. Цветок уже чувствует заботу.',
    'Неидеальный день — всё равно хороший день. Спасибо, что заботишься о себе.'
  ],
  most: [
    'Почти всё получилось! Это очень хороший день, ты молодец ✨',
    'Сегодня ты много для себя сделала. Цветок тянется к солнцу вместе с тобой.',
    'Отличный ритм! Отдохни как следует — ты это заслужила.'
  ],
  all: [
    'Все задания выполнены! Ты просто сияешь 🌸',
    'Идеальный день. Запомни это чувство — ты на это способна.',
    'Цветок счастлив, и ты тоже можешь собой гордиться. Сладких снов 🌙'
  ]
};

const EXTRA = {
  lowEnergy: 'Ты держалась, даже когда сил было мало. Это настоящая сила.',
  cycle: 'Помни: в эти дни цикла организму труднее. Ты справляешься лучше, чем думаешь.'
};

export function supportText() {
  const day = getDay();
  const total = day.cards?.length || 0;
  const done = day.done.length;
  const ratio = total ? done / total : 0;
  const bucket = done === 0 ? 'none' : ratio >= 1 ? 'all' : ratio >= 0.6 ? 'most' : 'some';
  const lines = [pickBy(todayKey() + bucket, TEXTS[bucket])];
  if (day.energy != null && day.energy < 35 && done > 0) lines.push(EXTRA.lowEnergy);
  const c = cycleInfo();
  if (c && c.energyShift < 0) lines.push(EXTRA.cycle);
  return lines;
}

export function renderSupport(force = false) {
  if (!force && new Date().getHours() < 18) return '';
  return `
    <section class="card support">
      <h2>🌙 Итог дня</h2>
      ${supportText().map((t) => `<p>${t}</p>`).join('')}
    </section>`;
}
