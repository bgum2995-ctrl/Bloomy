import { getDay, updateDay } from './storage.js';
import { shuffle } from './util.js';

// Готовый набор заданий. level: 1 — мягкое (подходит в любой день), 2 — обычное, 3 — активное.
// Позже будем править тексты и набор.
export const TASKS = [
  { id: 'breakfast', level: 1, icon: '🥣', text: 'Позавтракать в первый час после пробуждения' },
  { id: 'veggies', level: 1, icon: '🥗', text: 'Съесть порцию овощей или зелени' },
  { id: 'walk', level: 2, icon: '🚶‍♀️', text: 'Прогуляться 20 минут' },
  { id: 'stretch', level: 1, icon: '🧘‍♀️', text: 'Сделать 5 минут растяжки' },
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
  { id: 'stairs', level: 2, icon: '🪜', text: 'Подняться по лестнице вместо лифта' },
  { id: 'steps', level: 2, icon: '👟', text: 'Пройти 7 000 шагов' },
  { id: 'plate', level: 2, icon: '🥦', text: 'Половина тарелки на обед — овощи' },
  { id: 'cook', level: 2, icon: '🍳', text: 'Приготовить домашний обед или ужин' },
  { id: 'dance', level: 2, icon: '💃', text: 'Потанцевать под 3 любимые песни' },
  { id: 'yoga', level: 2, icon: '🧘', text: 'Сделать 15 минут йоги' },
  { id: 'nosnack', level: 2, icon: '⏰', text: 'Не перекусывать после ужина' },
  { id: 'workout', level: 3, icon: '🏋️‍♀️', text: 'Тренировка 30 минут' },
  { id: 'brisk', level: 3, icon: '🏃‍♀️', text: 'Быстрая прогулка или бег 30 минут' },
  { id: 'steps10', level: 3, icon: '🦶', text: 'Пройти 10 000 шагов' },
  { id: 'squats', level: 3, icon: '🍑', text: '3 подхода приседаний по 15 раз' },
  { id: 'abs', level: 3, icon: '💪', text: 'Планка 3 × 40 секунд' },
  { id: 'prep', level: 3, icon: '🥡', text: 'Заготовить полезную еду на завтра' }
];

const byId = Object.fromEntries(TASKS.map((t) => [t.id, t]));
export const taskById = (id) => byId[id];

export const CARD_COUNT = { 1: 4, 2: 5, 3: 6 };

// Раздаёт карточки на день под уровень плана: в бодрый день больше и активнее, в тяжёлый — мягче.
export function dealCards(level) {
  const pool = shuffle(TASKS.filter((t) => t.level <= level));
  const cards = [];
  // хотя бы одно задание «своего» уровня, чтобы день ощущался насыщеннее
  const top = pool.find((t) => t.level === level);
  if (top) cards.push(top.id);
  for (const t of pool) {
    if (cards.length >= CARD_COUNT[level]) break;
    if (!cards.includes(t.id)) cards.push(t.id);
  }
  updateDay({ cards, level });
  return cards;
}

// Раз в сутки можно заменить одну невыполненную карточку.
export function swapCard(id) {
  const day = getDay();
  if (day.swapped || !day.cards || day.done.includes(id)) return false;
  const level = day.level ?? 2;
  const options = TASKS.filter((t) => t.level <= level && !day.cards.includes(t.id));
  if (!options.length) return false;
  const next = options[Math.floor(Math.random() * options.length)];
  updateDay({ cards: day.cards.map((c) => (c === id ? next.id : c)), swapped: true });
  return true;
}
