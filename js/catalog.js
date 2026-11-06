// Справочники анкеты: активности, уход за собой, ограничения, цели.
// no — при каких ограничениях вариант не предлагаем; level — с какого уровня дня (1 мягкий … 3 активный).

export const LIMITS = [
  { id: 'knees', icon: '🦵', name: 'Колени' },
  { id: 'back', icon: '🧍‍♀️', name: 'Спина' },
  { id: 'pregnancy', icon: '🤰', name: 'Беременность' }
];

export const GOALS = [
  { id: 'weight', icon: '⚖️', name: 'Вес', text: 'Хочу снизить вес' },
  { id: 'volume', icon: '📏', name: 'Объёмы', text: 'Хочу подтянуть тело и уменьшить объёмы' },
  { id: 'wellbeing', icon: '🌿', name: 'Самочувствие', text: 'Хочу больше энергии и лёгкости' }
];

export const ACTIVITIES = [
  { id: 'walk', icon: '🚶‍♀️', name: 'Прогулка', level: 1, color: '#a8d5b4' },
  { id: 'yoga', icon: '🧘', name: 'Йога', level: 1, color: '#c9b6e8' },
  { id: 'stretch', icon: '🤸‍♀️', name: 'Стретчинг', level: 1, color: '#f7b6d2' },
  { id: 'pilates', icon: '🩰', name: 'Пилатес', level: 2, color: '#e8b8c8' },
  { id: 'hiit', icon: '⏱️', name: 'Табата / HIIT дома', level: 3, no: ['knees', 'pregnancy'], color: '#f08a6c' },
  { id: 'dance', icon: '💃', name: 'Танцы по видео', level: 2, color: '#f4a6bd' },
  { id: 'weights', icon: '🏋️‍♀️', name: 'Резинки и гантели дома', level: 2, no: ['back'], color: '#d9668b' },
  { id: 'pool', icon: '🏊‍♀️', name: 'Бассейн', level: 2, color: '#9cc9ee' },
  { id: 'bike', icon: '🚴‍♀️', name: 'Велосипед / велотренажёр', level: 2, color: '#7fb8d8' },
  { id: 'rope', icon: '🪢', name: 'Скакалка', level: 3, no: ['knees', 'back', 'pregnancy'], color: '#ffc49b' },
  { id: 'stairs', icon: '🪜', name: 'Ступеньки вместо лифта', level: 2, no: ['knees'], color: '#ffd98a' },
  { id: 'breath', icon: '🌬️', name: 'Дыхательные практики', level: 1, color: '#b9dbf5' },
  { id: 'joints', icon: '🦴', name: 'ЛФК / суставная гимнастика', level: 1, color: '#a9c98f' },
  { id: 'bodyflex', icon: '🫁', name: 'Бодифлекс', level: 2, no: ['pregnancy'], color: '#c9ab86' }
];

export const CARE = [
  { id: 'brush', icon: '🪮', name: 'Массажная щётка для сухого массажа', task: 'Сухой массаж щёткой 5 минут перед душем' },
  { id: 'guasha', icon: '💎', name: 'Гуаша / роллер для лица', task: 'Массаж лица гуашей или роллером 5 минут' },
  { id: 'cups', icon: '🫙', name: 'Антицеллюлитные банки', task: 'Баночный массаж проблемных зон 10 минут', no: ['pregnancy'] },
  { id: 'ball', icon: '🎾', name: 'Массажный мяч / МФР-ролл', task: 'Прокатать мышцы МФР-роллом или мячом 10 минут' },
  { id: 'bath', icon: '🛁', name: 'Ванночки с солью / магнием', task: 'Тёплая ванночка с солью или магнием', no: ['pregnancy'] },
  { id: 'wrap', icon: '🌯', name: 'Обёртывания', task: 'Сделать обёртывание', no: ['pregnancy'] },
  { id: 'oil', icon: '🧴', name: 'Кремы / масла для массажа', task: 'Самомассаж с кремом или маслом 5 минут' }
];

export const allowed = (item, limits = []) => !(item.no || []).some((l) => limits.includes(l));
