// Всё хранится в localStorage под одним ключом. version — для будущих миграций.
const KEY = 'bloomy:v1';

const defaults = () => ({
  version: 1,
  settings: { waterGoal: 2000, glassSize: 250 },
  days: {} // 'YYYY-MM-DD' -> { water, energy, done }
});

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    const data = JSON.parse(raw);
    const base = defaults();
    return { ...base, ...data, settings: { ...base.settings, ...data.settings } };
  } catch {
    return defaults();
  }
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
  return { water: 0, energy: null, done: [], ...state.days[key] };
}

export function updateDay(patch, key = todayKey()) {
  state.days[key] = { ...getDay(key), ...patch };
  save();
}
