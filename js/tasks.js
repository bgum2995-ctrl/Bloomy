import { getDay, updateDay } from './storage.js';
import { shuffle } from './util.js';
import { allowed, CARE } from './catalog.js';
import { hasProfile, limits, myActivities, myCare, dailyMinutes, activityById } from './profile.js';

// Готовый набор заданий. level: 1 — мягкое (подходит в любой день), 2 — обычное, 3 — активное.
// move — общие задания на движение: если анкета пройдена, их заменяют любимые активности из неё.
// no — при каких ограничениях задание не предлагаем.
export const TASKS = [
  { id: 'breakfast', level: 1, icon: '🥣', text: 'Позавтракать в первый час после пробуждения' },
  { id: 'veggies', level: 1, icon: '🥗', text: 'Съесть порцию овощей или зелени' },
  { id: 'walk', level: 2, icon: '🚶‍♀️', text: 'Прогуляться 20 минут' },
  { id: 'stretch', move: true, level: 1, icon: '🧘‍♀️', text: 'Сделать 5 минут растяжки' },
  { id: 'sweets', level: 2, icon: '🍓', text: 'Заменить сладкое фруктом или ягодами' },
  { id: 'dinner', level: 2, icon: '🌙', text: 'Поужинать за 3 часа до сна' },
  { id: 'sleep', level: 1, icon: '😴', text: 'Лечь спать до 23:30' },
  { id: 'protein', level: 1, icon: '🥚', text: 'Добавить белок в каждый приём пищи' },
  { id: 'slow', level: 1, icon: '🍽️', text: 'Поесть медленно, без телефона' },
  { id: 'tea', level: 1, icon: '🍵', text: 'Выпить чашку травяного чая вместо перекуса' },
  { id: 'sun', level: 1, icon: '☀️', text: 'Побыть 10 минут на дневном свету' },
  { id: 'posture', level: 1, icon: '🪑', text: 'Три раза за день расправить плечи и потянуться' },
  { id: 'breath', level: 1, icon: '🌬️', text: 'Сделать дыхательную паузу 3 минуты' },
  { id: 'fruit', level: 1, icon: '🍎', text: 'Съесть фрукт на перекус' },
  { id: 'nosoda', level: 2, icon: '🥤', text: 'Обойтись сегодня без сладких напитков' },
  { id: 'stairs', move: true, no: ['knees'], level: 2, icon: '🪜', text: 'Подняться по лестнице вместо лифта' },
  { id: 'steps', level: 2, icon: '👟', text: 'Пройти 7 000 шагов' },
  { id: 'plate', level: 2, icon: '🥦', text: 'Половина тарелки на обед — овощи' },
  { id: 'cook', level: 2, icon: '🍳', text: 'Приготовить домашний обед или ужин' },
  { id: 'dance', move: true, level: 2, icon: '💃', text: 'Потанцевать под 3 любимые песни' },
  { id: 'yoga', move: true, level: 2, icon: '🧘', text: 'Сделать 15 минут йоги' },
  { id: 'nosnack', level: 2, icon: '⏰', text: 'Не перекусывать после ужина' },
  { id: 'workout', move: true, no: ['pregnancy'], level: 3, icon: '🏋️‍♀️', text: 'Тренировка 30 минут' },
  { id: 'brisk', move: true, no: ['knees'], level: 3, icon: '🏃‍♀️', text: 'Быстрая прогулка или бег 30 минут' },
  { id: 'steps10', no: ['knees'], level: 3, icon: '🦶', text: 'Пройти 10 000 шагов' },
  { id: 'squats', move: true, no: ['knees', 'pregnancy'], level: 3, icon: '🍑', text: '3 подхода приседаний по 15 раз' },
  { id: 'abs', move: true, no: ['pregnancy'], level: 3, icon: '💪', text: 'Планка 3 × 40 секунд' },
  { id: 'prep', level: 3, icon: '🥡', text: 'Заготовить полезную еду на завтра' }
];

const byId = Object.fromEntries(TASKS.map((t) => [t.id, t]));

// Карточки из анкеты: 'act:<активность>:<минуты>' и 'care:<уход>'.
export function taskById(id) {
  if (byId[id]) return byId[id];
  const [kind, key, min] = String(id).split(':');
  if (kind === 'act') {
    const a = activityById(key);
    return { id, icon: a.icon, text: `${a.name} — ${min} мин`, act: key, min: Number(min) };
  }
  if (kind === 'care') {
    const c = CARE.find((x) => x.id === key);
    return c ? { id, icon: c.icon, text: c.task } : null;
  }
  return null;
}

export const CARD_COUNT = { 1: 4, 2: 5, 3: 6 };

export const minutesFor = (level, base = dailyMinutes()) => (level === 1 ? Math.max(5, Math.round(base / 2)) : base);

function pools(level) {
  const lim = limits();
  const personal = hasProfile();
  const base = TASKS.filter((t) => t.level <= level && allowed(t, lim) && !(personal && t.move));
  const acts = personal
    ? myActivities().filter((a) => (a.level || 1) <= level).map((a) => `act:${a.id}:${minutesFor(level)}`)
    : [];
  const care = personal ? myCare().map((c) => `care:${c.id}`) : [];
  return { base: base.map((t) => t.id), acts, care, levelTop: base.filter((t) => t.level === level).map((t) => t.id) };
}

// Раздаёт карточки на день под уровень плана: в бодрый день больше и активнее, в тяжёлый — мягче.
// Если пройдена анкета — обязательно одна любимая активность и одна процедура ухода.
export function dealCards(level) {
  const { base, acts, care, levelTop } = pools(level);
  const count = CARD_COUNT[level] - (hasProfile() && dailyMinutes() <= 10 ? 1 : 0);
  const cards = [];
  const a = shuffle(acts)[0];
  if (a) cards.push(a);
  const c = shuffle(care)[0];
  if (c) cards.push(c);
  const top = shuffle(levelTop)[0];
  if (top && !a) cards.push(top);
  for (const id of shuffle(base)) {
    if (cards.length >= count) break;
    if (!cards.includes(id)) cards.push(id);
  }
  updateDay({ cards, level });
  return cards;
}

// Раз в сутки можно заменить одну невыполненную карточку — на карточку того же вида.
export function swapCard(id) {
  const day = getDay();
  if (day.swapped || !day.cards || day.done.includes(id)) return false;
  const p = pools(day.level ?? 2);
  const kind = id.startsWith('act:') ? p.acts : id.startsWith('care:') ? p.care : p.base;
  let options = kind.filter((x) => !day.cards.includes(x));
  if (!options.length) options = p.base.filter((x) => !day.cards.includes(x));
  if (!options.length) return false;
  const next = options[Math.floor(Math.random() * options.length)];
  updateDay({ cards: day.cards.map((c) => (c === id ? next : c)), swapped: true });
  return true;
}
