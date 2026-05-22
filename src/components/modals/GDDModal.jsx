import React, { useState } from 'react';
import { GDD_SECTIONS } from '../../data/gddTemplate';

const COLS = 3;
const COL_X = [60, 380, 700];
const START_Y = 60;
const ROW_GAP = 60;

// Розраховуємо висоту колонки на основі кількості задач (включно з підзадачами)
const countAllTasks = (tasks) => {
  let count = 0;
  for (const t of tasks) {
    count++;
    if (t.children?.length) count += countAllTasks(t.children);
  }
  return count;
};

const NODE_HEADER_HEIGHT = 60;   // заголовок + прогрес бар
const NODE_FOOTER_HEIGHT = 44;   // кнопка "+ Задача" + padding
const TASK_ROW_HEIGHT    = 34;   // висота рядка задачі з padding/gap
const NODE_PADDING       = 20;   // padding зверху/знизу col-tasks
const NODE_MIN_HEIGHT    = 140;

const estimateNodeHeight = (section) => {
  const taskCount = countAllTasks(section.tasks || []);
  return Math.max(
    NODE_MIN_HEIGHT,
    NODE_HEADER_HEIGHT + NODE_PADDING + taskCount * TASK_ROW_HEIGHT + NODE_FOOTER_HEIGHT
  );
};

// Розраховуємо позиції для обраних секцій у 3 колонки
const calcPositions = (sections) => {
  // Висоти по колонках (поточний Y для кожної колонки)
  const colY = [START_Y, START_Y, START_Y];

  return sections.map((section, idx) => {
    const col = idx % COLS;
    const x = COL_X[col];
    const y = colY[col];
    colY[col] += estimateNodeHeight(section) + ROW_GAP;
    return { x, y };
  });
};

const GDDModal = ({ onConfirm, onClose }) => {
  const [selected, setSelected] = useState(new Set());

  const toggleSection = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === GDD_SECTIONS.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(GDD_SECTIONS.map((s) => s.id)));
    }
  };

  const handleConfirm = () => {
    if (selected.size === 0) return;

    const chosenSections = GDD_SECTIONS.filter((s) => selected.has(s.id));
    const positions = calcPositions(chosenSections);

    const template = chosenSections.map((section, idx) => ({
      ...section,
      label: section.title,
      position: positions[idx],
    }));

    onConfirm(template);
  };

  const allSelected  = selected.size === GDD_SECTIONS.length;
  const noneSelected = selected.size === 0;

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal gdd-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className="gdd-modal__header">
          <div>
            <h2 className="gdd-modal__title">GDD-шаблон</h2>
            <p className="gdd-modal__subtitle">
              Оберіть секції для додавання на дошку
            </p>
          </div>
          <button type="button" className="gdd-modal__close" onClick={onClose}>x</button>
        </header>

        <div className="gdd-modal__select-all-row">
          <button
            type="button"
            className={`gdd-modal__select-all ${allSelected ? 'gdd-modal__select-all--active' : ''}`}
            onClick={toggleAll}
          >
            {allSelected ? 'Скасувати вибір' : 'Обрати всі'}
          </button>
          <span className="gdd-modal__selected-count">
            Обрано: {selected.size} / {GDD_SECTIONS.length}
          </span>
        </div>

        <div className="gdd-modal__preview">
          <div className="gdd-modal__grid">
            {GDD_SECTIONS.map((section) => {
              const isActive = selected.has(section.id);
              return (
                <article
                  key={section.id}
                  className={`gdd-modal__col-preview ${isActive ? 'gdd-modal__col-preview--selected' : ''}`}
                  onClick={() => toggleSection(section.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && toggleSection(section.id)}
                >
                  <div className="gdd-modal__col-check">
                    <span className={`gdd-modal__checkbox ${isActive ? 'gdd-modal__checkbox--checked' : ''}`}>
                      {isActive ? 'v' : ''}
                    </span>
                  </div>

                  <div className="gdd-modal__col-header">
                    <span className="gdd-modal__col-title">{section.title}</span>
                    <span className="gdd-modal__col-desc">{section.description}</span>
                  </div>

                  <div className="gdd-modal__col-tasks">
                    {section.tasks.slice(0, 4).map((t) => (
                      <div key={t.id} className="gdd-modal__task-preview">
                        <span className="gdd-modal__task-check">—</span>
                        <span className="gdd-modal__task-text">{t.text}</span>
                        {t.children?.length > 0 && (
                          <span className="gdd-modal__task-sub">+{t.children.length}</span>
                        )}
                      </div>
                    ))}
                    {section.tasks.length > 4 && (
                      <div className="gdd-modal__task-more">
                        ще {section.tasks.length - 4} завдань...
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <p className="gdd-modal__warning">
          Поточні ноди на дошці будуть замінені обраними секціями
        </p>

        <footer className="gdd-modal__actions">
          <button
            type="button"
            className="modal__btn modal__btn--ghost"
            onClick={onClose}
          >
            Скасувати
          </button>
          <button
            type="button"
            className="modal__btn modal__btn--primary"
            onClick={handleConfirm}
            disabled={noneSelected}
          >
            Додати {selected.size > 0 ? `(${selected.size})` : ''} секцій
          </button>
        </footer>
      </div>
    </div>
  );
};

export default GDDModal;