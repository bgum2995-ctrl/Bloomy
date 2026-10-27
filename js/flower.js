import { getAllDays, todayKey } from './storage.js';
import { plural } from './util.js';

// Цветок месяца: растёт от выполненных заданий за месяц, подсыхает от пропущенных дней.
// Всё считается из сохранённых дней, поэтому отдельного состояния не нужно.

const STAGES = [
  { min: 0, name: 'Семечко' },
  { min: 3, name: 'Росток' },
  { min: 12, name: 'Молодой листочек' },
  { min: 28, name: 'Бутон' },
  { min: 50, name: 'Цветёт' },
  { min: 80, name: 'Пышное цветение' }
];

// Цвет лепестков меняется каждый месяц — у каждого месяца свой цветок.
const PALETTES = [
  ['#f4a6bd', '#fde4ec'], ['#c9b6e8', '#efe8fa'], ['#ffc49b', '#ffeadb'],
  ['#9cc9ee', '#e4f1fb'], ['#f7b6d2', '#fff0f6'], ['#ffd98a', '#fff4d6']
];

const DRY_TEXT = [
  'Цветок полит и доволен 💧',
  'Цветку немного не хватает заботы — выполни хотя бы одно задание',
  'Листики подсыхают… одно задание сегодня поможет',
  'Цветок совсем засох — но он оживёт, если вернуться к заданиям 🌱'
];

const shiftKey = (key, days) => {
  const [y, m, d] = key.split('-').map(Number);
  return todayKey(new Date(y, m - 1, d + days));
};

export function monthPoints(month) {
  const days = getAllDays();
  return Object.keys(days)
    .filter((k) => k.startsWith(month))
    .reduce((sum, k) => sum + (days[k].done?.length ?? 0), 0);
}

export function stageFor(points) {
  let stage = 0;
  STAGES.forEach((s, i) => { if (points >= s.min) stage = i; });
  return stage;
}

// Цветок прошлого месяца для полки — без засыхания, каким он вырос.
export function monthFlower(month) {
  const points = monthPoints(month);
  const stage = stageFor(points);
  const m = Number(month.slice(5, 7)) - 1;
  return { stage, stageName: STAGES[stage].name, points, dry: 0, palette: PALETTES[m % PALETTES.length] };
}

export function getFlower(date = new Date()) {
  const days = getAllDays();
  const today = todayKey(date);
  const month = today.slice(0, 7);
  const doneOn = (k) => (days[k]?.done?.length ?? 0);

  const points = monthPoints(month);

  // Пропуски считаем подряд со вчерашнего дня, но не раньше первого дня в приложении
  // и не раньше начала месяца (новый цветок начинает с чистого листа).
  const first = Object.keys(days).filter((k) => doneOn(k) > 0 || days[k].energy != null || days[k].water > 0).sort()[0];
  let missed = 0;
  if (doneOn(today) === 0 && first) {
    for (let k = shiftKey(today, -1); k >= first && k.startsWith(month) && doneOn(k) === 0; k = shiftKey(k, -1)) {
      missed++;
    }
  }
  const dry = Math.min(3, missed);

  const stage = stageFor(points);
  const next = STAGES[stage + 1];

  return {
    stage,
    stageName: STAGES[stage].name,
    points,
    toNext: next ? next.min - points : 0,
    dry,
    dryText: DRY_TEXT[dry],
    palette: PALETTES[date.getMonth() % PALETTES.length]
  };
}

// Цвета листьев/стебля от свежего к сухому.
const LEAF = ['#8fcb9b', '#a9c98f', '#c9c08a', '#c9ab86'];
const STEM = ['#7dbb8a', '#97b67f', '#b5ab7a', '#b39676'];

function petals(cx, cy, r, count, color, inner) {
  let out = '';
  for (let i = 0; i < count; i++) {
    const a = (360 / count) * i;
    out += `<ellipse cx="${cx}" cy="${cy - r}" rx="${r * 0.55}" ry="${r}" fill="${color}" transform="rotate(${a} ${cx} ${cy})"/>`;
  }
  return out + `<circle cx="${cx}" cy="${cy}" r="${r * 0.55}" fill="${inner}"/>`;
}

export function flowerSVG({ stage, dry, palette }) {
  const [petal, petalSoft] = palette;
  const leaf = LEAF[dry];
  const stem = STEM[dry];
  const droop = [0, 6, 14, 24][dry]; // наклон головки при засыхании
  const petalColor = dry >= 2 ? '#e2c9b8' : petal;

  // Высота стебля по стадиям
  const top = [150, 128, 104, 82, 66, 58][stage];

  let plant = '';
  if (stage === 0) {
    plant = `<ellipse cx="100" cy="152" rx="9" ry="6" fill="#c9a27e"/>`;
  } else {
    plant += `<path d="M100 160 Q${100 + droop / 3} ${(160 + top) / 2} ${100 + droop / 2} ${top}" stroke="${stem}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    // листья
    const leaves = stage === 1 ? 1 : stage === 2 ? 2 : 3;
    const spots = [[142, -1], [124, 1], [104, -1]];
    for (let i = 0; i < leaves; i++) {
      const [y, side] = spots[i];
      const tilt = side * (40 + dry * 12);
      plant += `<ellipse cx="${100 + side * 16}" cy="${y}" rx="17" ry="8" fill="${leaf}" transform="rotate(${tilt} ${100 + side * 16} ${y})"/>`;
    }
    const hx = 100 + droop / 2;
    if (stage === 3) {
      plant += `<g transform="rotate(${droop} ${hx} ${top})">
        <ellipse cx="${hx}" cy="${top - 10}" rx="10" ry="15" fill="${petalColor}"/>
        <path d="M${hx - 10} ${top - 4} Q${hx} ${top + 6} ${hx + 10} ${top - 4} L${hx} ${top + 4} Z" fill="${leaf}"/>
      </g>`;
    } else if (stage >= 4) {
      const r = stage === 4 ? 14 : 19;
      const count = stage === 4 ? 6 : 8;
      plant += `<g transform="rotate(${droop} ${hx} ${top})">
        ${stage === 5 ? petals(hx, top - r, r * 0.8, 8, petalSoft, petalSoft) : ''}
        ${petals(hx, top - r, r * 0.65, count, petalColor, dry >= 2 ? '#d8b98f' : '#ffd98a')}
      </g>`;
    }
  }

  return `
    <svg class="flower-svg ${dry ? '' : 'sway'}" viewBox="0 0 200 200" role="img" aria-label="Цветок">
      <ellipse cx="100" cy="190" rx="52" ry="6" fill="rgba(180,130,150,.15)"/>
      <g class="plant">${plant}</g>
      <path d="M62 158 H138 L130 190 H70 Z" fill="#f2b9a0"/>
      <rect x="56" y="152" width="88" height="12" rx="6" fill="#f6c9b4"/>
      <ellipse cx="100" cy="155" rx="38" ry="3.5" fill="#b9876a" opacity=".55"/>
    </svg>`;
}

export function renderFlowerCard() {
  const f = getFlower();
  const hint = f.toNext ? `До следующей стадии: ${f.toNext} ${plural(f.toNext, ['задание', 'задания', 'заданий'])}` : 'Цветок вырос полностью 🌸';
  return `
    <section class="card flower dry-${f.dry}">
      <div class="flower-pic">${flowerSVG(f)}</div>
      <div class="flower-info">
        <h2>${f.stageName}</h2>
        <p class="flower-dry">${f.dryText}</p>
        <p class="flower-next">${hint}</p>
      </div>
    </section>`;
}
