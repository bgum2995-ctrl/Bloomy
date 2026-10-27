import { getDay, updateDay } from './storage.js';
import { measureDue } from './measure.js';
import { doctorsDue } from './health.js';
import { cycleInfo } from './cycle.js';
import { esc } from './util.js';

// Веб-приложение не может само прислать уведомление, поэтому напоминания
// показываются при открытии. Скрытое напоминание не возвращается до завтра.
export function getReminders() {
  const list = [];
  const hour = new Date().getHours();

  if (measureDue()) {
    list.push({
      id: 'measure', icon: '📏', route: 'measure',
      text: hour >= 18 ? 'Вечер — хорошее время записать замеры за этот месяц' : 'В этом месяце замеров ещё нет'
    });
  }
  doctorsDue().forEach((d) => list.push({
    id: `doc-${d.id}`, icon: '🩺', route: 'health',
    text: d.left < 0 ? `Пора к врачу: ${esc(d.name)}` : d.left === 0 ? `Сегодня пора: ${esc(d.name)}` : `Скоро пора: ${esc(d.name)} — через ${d.left} дн.`
  }));
  const c = cycleInfo();
  if (c && !c.late && c.daysToNext <= 2) {
    list.push({ id: 'period', icon: '🌙', route: 'cycle', text: `Месячные ожидаются примерно через ${c.daysToNext} дн. Подготовь всё нужное` });
  }
  if (c?.late) {
    list.push({ id: 'period-late', icon: '🌙', route: 'cycle', text: 'Месячные ещё не отмечены — отметь начало, чтобы прогноз был точнее' });
  }

  const hidden = getDay().hidden || [];
  return list.filter((r) => !hidden.includes(r.id));
}

export function renderReminders() {
  const list = getReminders();
  if (!list.length) return '';
  return `
    <section class="reminders">
      ${list.map((r) => `
        <div class="reminder">
          <a href="#${r.route}"><span>${r.icon}</span>${r.text}</a>
          <button class="icon-btn" data-hide="${r.id}" aria-label="Скрыть до завтра">✕</button>
        </div>`).join('')}
    </section>`;
}

export function bindReminders(root, rerender) {
  root.querySelectorAll('[data-hide]').forEach((b) => {
    b.onclick = () => {
      updateDay({ hidden: [...(getDay().hidden || []), b.dataset.hide] });
      rerender();
    };
  });
}
