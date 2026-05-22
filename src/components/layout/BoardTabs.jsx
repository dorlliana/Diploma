import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FiAlertTriangle, FiCheckCircle, FiClock, FiRefreshCw } from 'react-icons/fi';
import ConfirmDialog from '../modals/ConfirmDialog';

const DEFAULT_WORKSPACE_NAME = 'Простір';

const BoardTabs = ({
  boards,
  currentBoard,
  setBoard,
  onAddBoard,
  onRenameBoard,
  onDeleteBoard,
  onReorderBoards,
  syncStatus = 'synced',
  syncError = '',
}) => {
  const [renamingBoard, setRenamingBoard] = useState(null);
  const [renameValue, setRenameValue]     = useState('');
  const [dragIndex, setDragIndex]         = useState(null);
  const [dropTarget, setDropTarget]       = useState(null);
  const [boardToDelete, setBoardToDelete] = useState(null);
  const scrollRef = useRef(null);

  // Прокручуємо до активної вкладки при зміні
  useEffect(() => {
    if (!scrollRef.current) return;
    const active = scrollRef.current.querySelector('.board-tab-active');
    if (active) {
      active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [currentBoard]);

  // Генеруємо унікальну назву нового простору
  const getDefaultWorkspaceName = useCallback(() => {
    if (!boards.includes(DEFAULT_WORKSPACE_NAME)) return DEFAULT_WORKSPACE_NAME;
    let index = 2;
    while (boards.includes(`${DEFAULT_WORKSPACE_NAME} ${index}`)) {
      index += 1;
    }
    return `${DEFAULT_WORKSPACE_NAME} ${index}`;
  }, [boards]);

  const handleCreateWorkspace = useCallback(async () => {
    const name = getDefaultWorkspaceName();
    await onAddBoard(name);
    setRenamingBoard(name);
    setRenameValue(name);
  }, [getDefaultWorkspaceName, onAddBoard]);

  const handleRename = (oldName) => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== oldName) {
      onRenameBoard(oldName, trimmed);
    }
    setRenamingBoard(null);
    setRenameValue('');
  };

  const requestDelete = useCallback((board) => {
    if (boards.length <= 1) return;
    setBoardToDelete(board);
  }, [boards.length]);

  const confirmDelete = useCallback(() => {
    if (boardToDelete) {
      onDeleteBoard(boardToDelete);
      setBoardToDelete(null);
    }
  }, [boardToDelete, onDeleteBoard]);

  // Прокручування вниз на вкладці — видалення простору
  const handleTabWheel = useCallback((e, board) => {
    if (e.deltaY > 0) {
      e.preventDefault();
      e.stopPropagation();
      if (boards.length > 1) {
        requestDelete(board);
      }
    }
  }, [boards.length, requestDelete]);

  // Drag-and-drop вкладок
  const handleDragStart = (e, index) => {
    if (renamingBoard) { e.preventDefault(); return; }
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const before = e.clientX < rect.left + rect.width / 2;
    setDropTarget({ index, before });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (dragIndex === null || !dropTarget) { resetDrag(); return; }
    let toIndex = dropTarget.before ? dropTarget.index : dropTarget.index + 1;
    if (dragIndex < toIndex) toIndex -= 1;
    if (dragIndex !== toIndex) onReorderBoards(dragIndex, toIndex);
    resetDrag();
  };

  const resetDrag = () => { setDragIndex(null); setDropTarget(null); };

  const getTabClassName = (board, index) => {
    const classes = ['board-tab'];
    if (currentBoard === board) classes.push('board-tab-active');
    if (dragIndex === index) classes.push('board-tab--dragging');
    if (dropTarget?.index === index) {
      classes.push(dropTarget.before ? 'board-tab--drop-before' : 'board-tab--drop-after');
    }
    return classes.join(' ');
  };

  // Іконки і підписи стану синхронізації
  const syncView = {
    loading: { icon: <FiRefreshCw />, label: 'Завантаження дошки', className: 'sync-indicator--active'  },
    pending: { icon: <FiClock />,     label: 'Очікує збереження',  className: 'sync-indicator--pending' },
    saving:  { icon: <FiRefreshCw />, label: 'Збереження...',      className: 'sync-indicator--active'  },
    synced:  { icon: <FiCheckCircle />,label: 'Синхронізовано',    className: 'sync-indicator--synced'  },
    error:   { icon: <FiAlertTriangle />, label: 'Помилка синхронізації', className: 'sync-indicator--error' },
  }[syncStatus] || { icon: <FiClock />, label: 'Перевірка...', className: 'sync-indicator--pending' };

  return (
    <>
      <div className="board-tabs-bar">
        <div
          className="board-tabs-scroll"
          ref={scrollRef}
          onDragOver={(e) => e.preventDefault()}
          onDrop={resetDrag}
        >
          {boards.map((board, index) => (
            <div
              key={board}
              className={getTabClassName(board, index)}
              draggable={renamingBoard !== board}
              onClick={() => setBoard(board)}
              onDoubleClick={() => { setRenamingBoard(board); setRenameValue(board); }}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={handleDrop}
              onDragEnd={resetDrag}
              onWheel={(e) => handleTabWheel(e, board)}
              title="Перетягни для зміни порядку · Двічі клікни щоб перейменувати · Scroll вниз для видалення"
            >
              {currentBoard === board && <span className="board-tab-indicator" />}

              {renamingBoard === board ? (
                <input
                  autoFocus
                  className="board-tab-rename-input"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename(board);
                    if (e.key === 'Escape') { setRenamingBoard(null); setRenameValue(''); }
                  }}
                  onBlur={() => handleRename(board)}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="board-tab-label">{board}</span>
              )}

              {boards.length > 1 && (
                <span
                  className="board-tab-close"
                  onClick={(e) => { e.stopPropagation(); requestDelete(board); }}
                  title="Закрити простір"
                >
                  x
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="board-tabs-add-slot">
          <button
            type="button"
            className="board-tab-add"
            onClick={handleCreateWorkspace}
            title="Новий простір"
          >
            +
          </button>
        </div>

        <div className="board-tabs-filler">
          <div
            className={`sync-indicator ${syncView.className}`}
            title={syncError || syncView.label}
            aria-live="polite"
          >
            <span className="sync-indicator__icon">{syncView.icon}</span>
            <span className="sync-indicator__label">{syncView.label}</span>
          </div>
        </div>
      </div>

      {boardToDelete && (
        <ConfirmDialog
          title="Закрити простір?"
          message={`Простір «${boardToDelete}» та всі ноди на ньому будуть видалені назавжди. Цю дію не можна скасувати.`}
          confirmLabel="Закрити та видалити"
          cancelLabel="Скасувати"
          danger
          onConfirm={confirmDelete}
          onCancel={() => setBoardToDelete(null)}
        />
      )}
    </>
  );
};

export default BoardTabs;