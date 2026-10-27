// Мелкие помощники, общие для всех экранов.

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

export function plural(n, [one, few, many]) {
  const a = n % 10, b = n % 100;
  if (a === 1 && b !== 11) return one;
  if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few;
  return many;
}

export const parseKey = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const daysBetween = (fromKey, toKey) =>
  Math.round((parseKey(toKey) - parseKey(fromKey)) / 86400000);

export const MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];

export const monthTitle = (monthKey) => {
  const [y, m] = monthKey.split('-').map(Number);
  const name = MONTHS[m - 1];
  return `${name[0].toUpperCase()}${name.slice(1)} ${y}`;
};

export const shortDate = (key) =>
  parseKey(key).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });

export const longDate = (key) =>
  parseKey(key).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

// Детерминированный «случайный» выбор по строке: один и тот же день — один и тот же текст.
export function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

export const pickBy = (seed, list) => list[hash(seed) % list.length];

export function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const backLink = (title) => `
  <div class="page-head">
    <a class="back" href="#more" aria-label="Назад">←</a>
    <h1>${title}</h1>
  </div>`;

export const addDays = (key, n) => {
  const d = parseKey(key);
  d.setDate(d.getDate() + n);
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
