import React, { useState, useMemo } from 'react';

// Рекурсивно збираємо всі завдання з усіх kanban-нод
const collectAllTasks = (nodes) => {
  const result = [];
  const kanbanNodes = nodes.filter((n) => n.data?.contentType === 'kanban');

  const walk = (tasks, columnLabel, columnId, depth = 0) => {
    for (const t of tasks) {
      result.push({ id: t.id, text: t.text, done: t.done, depth, columnLabel, columnId });
      if (t.children?.length) walk(t.children, columnLabel, columnId, depth + 1);
    }
  };

  for (const node of kanbanNodes) {
    walk(node.data.tasks || [], node.data.label || 'Без назви', node.id);
  }
  return result;
};

const TaskPanel = ({ nodes, onFocusNode, onClose }) => {
  const [filterCol, setFilterCol] = useState('all');
  const [showDone, setShowDone]   = useState(true);

  const kanbanNodes = useMemo(
    () => nodes.filter((n) => n.data?.contentType === 'kanban'),
    [nodes],
  );

  // Усі завдання включно з підзавданнями
  const allTasks = useMemo(() => collectAllTasks(nodes), [nodes]);

  // Загальний прогрес — рахуємо всі рівні
  const totalDone  = allTasks.filter((t) => t.done).length;
  const totalCount = allTasks.length;
  const donePercent = totalCount ? Math.round((totalDone / totalCount) * 100) : 0;

  const filtered = useMemo(
    () => allTasks.filter((t) => {
      if (!showDone && t.done) return false;
      if (filterCol !== 'all' && t.columnId !== filterCol) return false;
      return true;
    }),
    [allTasks, filterCol, showDone],
  );

  const grouped = useMemo(() => {
    const map = new Map();
    for (const t of filtered) {
      if (!map.has(t.columnId)) {
        map.set(t.columnId, { label: t.columnLabel, id: t.columnId, tasks: [] });
      }
      map.get(t.columnId).tasks.push(t);
    }
    return [...map.values()];
  }, [filtered]);

  // Лічильники по кожній колонці (всі рівні)
  const colCounts = useMemo(() => {
    const map = new Map();
    for (const t of allTasks) {
      if (!map.has(t.columnId)) map.set(t.columnId, { total: 0, done: 0 });
      const c = map.get(t.columnId);
      c.total++;
      if (t.done) c.done++;
    }
    return map;
  }, [allTasks]);

  return (
    <aside className="task-panel">
      <header className="task-panel__header">
        <span className="task-panel__title">Завдання</span>
        <div className="task-panel__header-actions">
          <button
            type="button"
            className={`task-panel__toggle ${showDone ? 'task-panel__toggle--active' : 'task-panel__toggle--inactive'}`}
            onClick={() => setShowDone((v) => !v)}
            title={showDone ? 'Сховати виконані' : 'Показати виконані'}
          >
            {showDone ? 'Сховати виконані' : 'Показати виконані'}
          </button>
          <button type="button" className="task-panel__close" onClick={onClose}>x</button>
        </div>
      </header>

      {totalCount > 0 && (
        <section className="task-panel__progress">
          <div className="task-panel__progress-header">
            <span className="task-panel__progress-label">Загальний прогрес</span>
            <span className="task-panel__progress-percent">{donePercent}%</span>
          </div>
          <div className="task-panel__progress-bar">
            <div className="task-panel__progress-fill" style={{ width: `${donePercent}%` }} />
          </div>
          <div className="task-panel__progress-stats">
            <span className="task-panel__stat-done">{totalDone} виконано</span>
            <span className="task-panel__stat-left">{totalCount - totalDone} залишилось</span>
          </div>
        </section>
      )}

      {kanbanNodes.length > 0 && (
        <div className="task-panel__filters">
          <button
            type="button"
            className={`task-panel__filter-btn ${filterCol === 'all' ? 'task-panel__filter-btn--active' : ''}`}
            onClick={() => setFilterCol('all')}
          >
            Всі
          </button>
          {kanbanNodes.map((n) => (
            <button
              key={n.id}
              type="button"
              className={`task-panel__filter-btn ${filterCol === n.id ? 'task-panel__filter-btn--active' : ''}`}
              onClick={() => setFilterCol(n.id)}
            >
              {n.data.label || 'Без назви'}
            </button>
          ))}
        </div>
      )}

      <div className="task-panel__list">
        {kanbanNodes.length === 0 && (
          <p className="task-panel__empty">
            Перетягніть «Список завдань» на дошку, щоб почати
          </p>
        )}
        {grouped.length === 0 && kanbanNodes.length > 0 && (
          <p className="task-panel__empty">Завдань не знайдено</p>
        )}
        {grouped.map((col) => {
          const counts = colCounts.get(col.id) || { total: 0, done: 0 };
          return (
            <section key={col.id} className="task-panel__col-group">
              <div className="task-panel__col-header">
                <button
                  type="button"
                  className="task-panel__col-goto"
                  onClick={() => onFocusNode(col.id)}
                  title="Перейти до колонки"
                >
                  &rarr;
                </button>
                <span className="task-panel__col-name">{col.label}</span>
                <span className="task-panel__col-badge">
                  <span className="task-panel__col-done">{counts.done}</span>
                  <span className="task-panel__col-sep">/</span>
                  <span className="task-panel__col-total">{counts.total}</span>
                </span>
              </div>
              {counts.total > 0 && (
                <div className="task-panel__col-progress">
                  <div
                    className="task-panel__col-progress-fill"
                    style={{ width: `${counts.total ? Math.round((counts.done / counts.total) * 100) : 0}%` }}
                  />
                </div>
              )}
              {col.tasks.map((t) => (
                <div
                  key={t.id}
                  className={`task-panel__task-row ${t.done ? 'task-panel__task-row--done' : ''}`}
                  style={{ paddingLeft: 12 + t.depth * 14 }}
                >
                  <span className={`task-panel__checkbox ${t.done ? 'task-panel__checkbox--done' : ''}`}>
                    {t.done ? 'v' : ''}
                  </span>
                  <span
                    className={`task-panel__task-text ${t.depth === 0 ? 'task-panel__task-text--root' : 'task-panel__task-text--nested'} ${t.done ? 'task-panel__task-text--struck' : ''}`}
                  >
                    {t.text || '(без назви)'}
                  </span>
                </div>
              ))}
            </section>
          );
        })}
      </div>
    </aside>
  );
};

export default TaskPanel;