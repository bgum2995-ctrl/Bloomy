// Всё хранится в localStorage под одним ключом. version — для будущих миграций.
// Файлы анализов лежат отдельно, в IndexedDB (см. db.js).
const KEY = 'bloomy:v1';

const defaults = () => ({
  version: 1,
  settings: { waterGoal: 2000, glassSize: 250 },
  days: {}, // 'YYYY-MM-DD' -> { water, energy, done, cards, swapped, rest }
  cycle: { starts: [], length: 28, period: 5 },
  measurements: [], // { date, weight, arms, chest, waist, glutes, thigh }
  doctors: [], // { id, name, every, last }
  seenRewards: [] // месяцы 'YYYY-MM', итоги которых уже показаны
});

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    return merge(JSON.parse(raw));
  } catch {
    return defaults();
  }
}

function merge(data) {
  const base = defaults();
  return {
    ...base,
    ...data,
    settings: { ...base.settings, ...data.settings },
    cycle: { ...base.cycle, ...data.cycle }
  };
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Не удалось сохранить данные', e);
  }
}

export function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getSettings() {
  return state.settings;
}

export function updateSettings(patch) {
  state.settings = { ...state.settings, ...patch };
  save();
}

export function getDay(key = todayKey()) {
  return { water: 0, energy: null, done: [], cards: null, swapped: false, rest: 0, ...state.days[key] };
}

export function updateDay(patch, key = todayKey()) {
  state.days[key] = { ...getDay(key), ...patch };
  save();
}

export function getAllDays() {
  return state.days;
}

// Разделы целиком: cycle, measurements, doctors, seenRewards.
export const get = (part) => state[part];

export function set(part, value) {
  state[part] = value;
  save();
}

export const exportData = () => JSON.stringify(state, null, 2);

export function importData(json) {
  const data = JSON.parse(json);
  if (!data || typeof data !== 'object' || !data.days) throw new Error('Это не файл Bloomy');
  state = merge(data);
  save();
}
