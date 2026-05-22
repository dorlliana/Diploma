// GDD-шаблони — кожна секція є окремою колонкою завдань.
// Користувач обирає потрібні секції в модальному вікні.

export const GDD_SECTIONS = [
  {
    id: 'concept',
    title: 'Основний концепт',
    description: 'Назва, жанр, унікальність, аудиторія',
    contentType: 'kanban',
    size: { width: 280, height: null },
    tasks: [
      {
        id: 'c1', text: 'Назва гри', done: false,
        children: [
          { id: 'c1a', text: 'Робоча назва', done: false, children: [] },
          { id: 'c1b', text: 'Варіанти назв', done: false, children: [] },
        ],
      },
      {
        id: 'c2', text: 'Жанр та піджанр', done: false,
        children: [
          { id: 'c2a', text: 'Основний жанр', done: false, children: [] },
          { id: 'c2b', text: 'Схожі ігри (референси)', done: false, children: [] },
        ],
      },
      {
        id: 'c3', text: 'Унікальні особливості', done: false,
        children: [
          { id: 'c3a', text: 'Головна фішка (USP)', done: false, children: [] },
          { id: 'c3b', text: 'Чим відрізняється від конкурентів', done: false, children: [] },
          { id: 'c3c', text: 'Core loop (петля геймплею)', done: false, children: [] },
        ],
      },
      {
        id: 'c4', text: 'Цільова аудиторія', done: false,
        children: [
          { id: 'c4a', text: 'Вік та платформа', done: false, children: [] },
          { id: 'c4b', text: 'Портрет гравця', done: false, children: [] },
          { id: 'c4c', text: 'Win/Lose умови', done: false, children: [] },
        ],
      },
    ],
  },

  {
    id: 'mechanics',
    title: 'Ігрові механіки',
    description: 'Рух, бойова система, прогресія',
    contentType: 'kanban',
    size: { width: 280, height: null },
    tasks: [
      {
        id: 'm1', text: 'Рух персонажа', done: false,
        children: [
          { id: 'm1a', text: 'Базовий рух (WASD / стік)', done: false, children: [] },
          { id: 'm1b', text: 'Стрибок / прискорення', done: false, children: [] },
          { id: 'm1c', text: 'Спеціальні переміщення', done: false, children: [] },
        ],
      },
      {
        id: 'm2', text: 'Бойова система', done: false,
        children: [
          { id: 'm2a', text: 'Атаки та комбо', done: false, children: [] },
          { id: 'm2b', text: 'Ухилення / блок', done: false, children: [] },
          { id: 'm2c', text: 'Здоров\'я та шкода', done: false, children: [] },
        ],
      },
      {
        id: 'm3', text: 'Прогресія та апгрейди', done: false,
        children: [
          { id: 'm3a', text: 'Система рівнів / досвіду', done: false, children: [] },
          { id: 'm3b', text: 'Дерево навичок', done: false, children: [] },
          { id: 'm3c', text: 'Предмети та спорядження', done: false, children: [] },
        ],
      },
      {
        id: 'm4', text: 'Взаємодія з об\'єктами', done: false,
        children: [
          { id: 'm4a', text: 'Підбір предметів', done: false, children: [] },
          { id: 'm4b', text: 'Діалоги та NPC', done: false, children: [] },
          { id: 'm4c', text: 'Головоломки / механізми', done: false, children: [] },
        ],
      },
    ],
  },

  {
    id: 'world',
    title: 'Світоустрій',
    description: 'Сюжет, сеттинг, персонажі, лор',
    contentType: 'kanban',
    size: { width: 280, height: null },
    tasks: [
      {
        id: 'w1', text: 'Сюжет', done: false,
        children: [
          { id: 'w1a', text: 'Основна передісторія', done: false, children: [] },
          { id: 'w1b', text: 'Зав\'язка та кульмінація', done: false, children: [] },
          { id: 'w1c', text: 'Кінцівки', done: false, children: [] },
        ],
      },
      {
        id: 'w2', text: 'Сеттинг', done: false,
        children: [
          { id: 'w2a', text: 'Епоха та всесвіт', done: false, children: [] },
          { id: 'w2b', text: 'Атмосфера та тональність', done: false, children: [] },
        ],
      },
      {
        id: 'w3', text: 'Головні персонажі', done: false,
        children: [
          { id: 'w3a', text: 'Протагоніст', done: false, children: [] },
          { id: 'w3b', text: 'Антагоніст', done: false, children: [] },
          { id: 'w3c', text: 'Другорядні персонажі', done: false, children: [] },
        ],
      },
      {
        id: 'w4', text: 'Лор та історія світу', done: false,
        children: [
          { id: 'w4a', text: 'Хронологія подій', done: false, children: [] },
          { id: 'w4b', text: 'Фракції та організації', done: false, children: [] },
          { id: 'w4c', text: 'Правила всесвіту', done: false, children: [] },
        ],
      },
    ],
  },

  {
    id: 'levels',
    title: 'Локації та Контент',
    description: 'Локації, складність, NPC',
    contentType: 'kanban',
    size: { width: 280, height: null },
    tasks: [
      {
        id: 'l1', text: 'Структура локацій', done: false,
        children: [
          { id: 'l1a', text: 'Перелік рівнів / зон', done: false, children: [] },
          { id: 'l1b', text: 'Карта світу', done: false, children: [] },
          { id: 'l1c', text: 'Хаб / меню', done: false, children: [] },
        ],
      },
      {
        id: 'l2', text: 'Прогресія складності', done: false,
        children: [
          { id: 'l2a', text: 'Крива складності', done: false, children: [] },
          { id: 'l2b', text: 'Вороги та їх поведінка', done: false, children: [] },
          { id: 'l2c', text: 'Боси', done: false, children: [] },
        ],
      },
      {
        id: 'l3', text: 'Персонажі та NPC', done: false,
        children: [
          { id: 'l3a', text: 'Мирні NPC', done: false, children: [] },
          { id: 'l3b', text: 'Вороги', done: false, children: [] },
          { id: 'l3c', text: 'Торгівці / квестодавці', done: false, children: [] },
        ],
      },
    ],
  },

  {
    id: 'visual',
    title: 'Візуал та музика',
    description: 'Арт-стиль, палітра, саундтрек',
    contentType: 'kanban',
    size: { width: 280, height: null },
    tasks: [
      {
        id: 'v1', text: 'Арт-стиль', done: false,
        children: [
          { id: 'v1a', text: 'Загальний напрям (піксель, 3D, 2D)', done: false, children: [] },
          { id: 'v1b', text: 'Візуальні референси', done: false, children: [] },
          { id: 'v1c', text: 'Стиль інтерфейсу (UI)', done: false, children: [] },
        ],
      },
      {
        id: 'v2', text: 'Палітра кольорів', done: false,
        children: [
          { id: 'v2a', text: 'Основна палітра', done: false, children: [] },
          { id: 'v2b', text: 'Палітра локацій', done: false, children: [] },
          { id: 'v2c', text: 'Палітра персонажів', done: false, children: [] },
        ],
      },
      {
        id: 'v3', text: 'Анімації', done: false,
        children: [
          { id: 'v3a', text: 'Анімації персонажа', done: false, children: [] },
          { id: 'v3b', text: 'Ефекти (частинки, спалахи)', done: false, children: [] },
        ],
      },
      {
        id: 'v4', text: 'Саундтрек', done: false,
        children: [
          { id: 'v4a', text: 'Загальний музичний настрій', done: false, children: [] },
          { id: 'v4b', text: 'Треки для локацій', done: false, children: [] },
          { id: 'v4c', text: 'Бойова музика', done: false, children: [] },
        ],
      },
      {
        id: 'v5', text: 'Звукові ефекти', done: false,
        children: [
          { id: 'v5a', text: 'Звуки інтерфейсу', done: false, children: [] },
          { id: 'v5b', text: 'Звуки бою', done: false, children: [] },
          { id: 'v5c', text: 'Ambient-звуки локацій', done: false, children: [] },
        ],
      },
    ],
  },

  {
    id: 'tech',
    title: 'Технічні вимоги',
    description: 'Платформи, двигун, інструменти',
    contentType: 'kanban',
    size: { width: 280, height: null },
    tasks: [
      {
        id: 't1', text: 'Платформи', done: false,
        children: [
          { id: 't1a', text: 'Цільова платформа', done: false, children: [] },
          { id: 't1b', text: 'Мінімальні вимоги', done: false, children: [] },
          { id: 't1c', text: 'Підтримка контролерів', done: false, children: [] },
        ],
      },
      {
        id: 't2', text: 'Двигун (Engine)', done: false,
        children: [
          { id: 't2a', text: 'GameMaker Studio 2', done: false, children: [] },
          { id: 't2b', text: 'Версія та ліцензія', done: false, children: [] },
        ],
      },
      {
        id: 't3', text: 'Інструменти розробки', done: false,
        children: [
          { id: 't3a', text: 'IDE та редактори', done: false, children: [] },
          { id: 't3b', text: 'Система контролю версій (Git)', done: false, children: [] },
          { id: 't3c', text: 'Інструменти для арту', done: false, children: [] },
          { id: 't3d', text: 'Інструменти для звуку', done: false, children: [] },
        ],
      },
      {
        id: 't4', text: 'Технічні обмеження', done: false,
        children: [
          { id: 't4a', text: 'Максимальний розмір білду', done: false, children: [] },
          { id: 't4b', text: 'Обмеження FPS / пам\'яті', done: false, children: [] },
          { id: 't4c', text: 'Мережевий функціонал', done: false, children: [] },
        ],
      },
    ],
  },
];