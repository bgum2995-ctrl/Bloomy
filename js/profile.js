import { get, set, getSettings } from './storage.js';
import { ACTIVITIES, CARE, allowed } from './catalog.js';

// Ответы анкеты и всё, что из них выводится.
export const getProfile = () => get('profile');
export const hasProfile = () => !!getProfile()?.done;
export const limits = () => getProfile()?.limits || [];
export const isPregnant = () => limits().includes('pregnancy');
export const dailyMinutes = () => getProfile()?.minutes || 20;
export const userName = () => getProfile()?.name?.trim() || '';

export function saveProfile(profile) {
  set('profile', profile);
}

// Норма воды из напитков.
// EFSA (2010): для женщин адекватное потребление воды — 2,0 л в сутки всего, из них ~80% (≈1,6 л) из напитков;
// при беременности +300 мл. Популярная оценка по весу — 30 мл на кг. Берём большее, но не больше 3 л.
export function waterByWeight(weight, pregnant = false) {
  if (!weight) return null;
  const base = Math.max(1600, Math.min(3000, weight * 30));
  return Math.round((base + (pregnant ? 300 : 0)) / 50) * 50;
}

const customList = () => get('custom').map((c) => ({ ...c, icon: '⭐', level: 1, color: '#b8a6d9', custom: true }));

export const allActivities = () => [...ACTIVITIES, ...customList()];
export const activityById = (id) => allActivities().find((a) => a.id === id) || { id, icon: '✨', name: 'Активность', color: '#ccc' };

// Активности из анкеты (или весь безопасный список, если анкета пропущена) + свои.
export function myActivities() {
  const p = getProfile();
  const chosen = p?.activities?.length ? p.activities : null;
  const base = ACTIVITIES.filter((a) => allowed(a, limits()) && (!chosen || chosen.includes(a.id)));
  return [...base, ...customList()];
}

export function myCare() {
  const care = getProfile()?.care || [];
  return CARE.filter((c) => care.includes(c.id) && allowed(c, limits()));
}

