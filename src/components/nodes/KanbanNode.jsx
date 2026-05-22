import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Handle, Position } from 'reactflow';

// ─── Утиліти ────────────────────────────────────────────────────────────────


let taskIdCounter = Date.now();
const newTaskId = () => `t_${taskIdCounter++}`;

const flattenTasks = (tasks, result = [], depth = 0) => {
  for (const t of tasks) {
    result.push({ ...t, depth });
    if (t.children?.length) flattenTasks(t.children, result, depth + 1);
  }
  return result;
};

const insertAfter = (tasks, afterId, newTask) => {
  const result = [];
  for (const t of tasks) {
    result.push({ ...t, children: insertAfter(t.children || [], afterId, newTask) });
    if (t.id === afterId) result.push(newTask);
  }
  return result;
};

const insertBefore = (tasks, beforeId, newTask) => {
  const result = [];
  for (const t of tasks) {
    if (t.id === beforeId) result.push(newTask);
    result.push({ ...t, children: insertBefore(t.children || [], beforeId, newTask) });
  }
  return result;
};

const removeTask = (tasks, id) =>
  tasks
    .filter(t => t.id !== id)
    .map(t => ({ ...t, children: removeTask(t.children || [], id) }));

const updateTask = (tasks, id, patch) =>
  tasks.map(t => {
    if (t.id === id) return { ...t, ...patch };
    return { ...t, children: updateTask(t.children || [], id, patch) };
  });

const findTask = (tasks, id) => {
  for (const t of tasks) {
    if (t.id === id) return t;
    const found = findTask(t.children || [], id);
    if (found) return found;
  }
  return null;
};

const containsTask = (task, id) => {
  if (!task) return false;
  if (task.id === id) return true;
  return (task.children || []).some(child => containsTask(child, id));
};

// Make task a child of its previous sibling (Tab indent)
const indentTask = (tasks, id) => {
  // Find the task and its previous sibling at the same level
  const tryIndent = (list) => {
    for (let i = 0; i < list.length; i++) {
      if (list[i].id === id) {
        if (i === 0) return null; // no previous sibling
        const newList = [...list];
        const [task] = newList.splice(i, 1);
        const prevSibling = { ...newList[i - 1] };
        prevSibling.children = [...(prevSibling.children || []), task];
        newList[i - 1] = prevSibling;
        return newList;
      }
      const result = tryIndent(list[i].children || []);
      if (result !== null) {
        return list.map((t, idx) =>
          idx === i ? { ...t, children: result } : t
        );
      }
    }
    return null;
  };
  return tryIndent(tasks) || tasks;
};

// Move task out one level (Shift+Tab)
const unindentTask = (tasks, id) => {
  const walk = (list, parentId = null) => {
    for (let i = 0; i < list.length; i++) {
      if (list[i].id === id) {
        return parentId;
      }
      const foundParentId = walk(list[i].children || [], list[i].id);
      if (foundParentId) return foundParentId;
    }
    return null;
  };

  const parentId = walk(tasks);
  if (!parentId) return tasks;

  const task = findTask(tasks, id);
  if (!task) return tasks;

  return insertAfter(removeTask(tasks, id), parentId, task);
};

const insertChildFirst = (tasks, parentId, newTask) =>
  tasks.map(t => {
    if (t.id === parentId) return { ...t, children: [newTask, ...(t.children || [])] };
    return { ...t, children: insertChildFirst(t.children || [], parentId, newTask) };
  });

const moveTaskWithin = (tasks, dragId, targetId, position) => {
  const dragged = findTask(tasks, dragId);
  if (!dragged || dragId === targetId) return tasks;
  if (containsTask(dragged, targetId)) return tasks;

  let without = removeTask(tasks, dragId);
  if (position === 'child') {
    without = insertChildFirst(without, targetId, dragged);
  } else if (position === 'before') {
    without = insertBefore(without, targetId, dragged);
  } else {
    without = insertAfter(without, targetId, dragged);
  }
  return without;
};

// ─── TaskRow ─────────────────────────────────────────────────────────────────

const TaskRow = ({
  task, depth, maxDepth,
  onToggle, onTextChange, onDelete, onAddAfter,
  onIndent, onUnindent,
  onDragStart, onDragOver, onDrop,
  dragOverId, dragOverPos,
  autoFocus,
}) => {
  const inputRef   = useRef(null);
  const isDragOver = dragOverId === task.id;
  const [editingText, setEditingText] = useState(autoFocus);
  const [draftText, setDraftText] = useState(task.text || '');

  useEffect(() => {
    if (editingText && inputRef.current) {
      inputRef.current.focus();
      const len = inputRef.current.value.length;
      inputRef.current.setSelectionRange(len, len);
    }
  }, [editingText]);

  const commitText = () => {
    setEditingText(false);
    onTextChange(task.id, draftText);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitText();
      onAddAfter(task.id, depth);
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        onUnindent(task.id);
      } else {
        // Only indent if depth < maxDepth
        if (depth < maxDepth) {
          onIndent(task.id);
        }
      }
    }
    if (e.key === 'Backspace' && inputRef.current?.value === '') {
      e.preventDefault();
      onDelete(task.id);
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      commitText();
    }
  };

  return (
    <div
      className="kanban-task-row-wrap"
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      onDragOver={(e) => onDragOver(e, task.id)}
      onDrop={(e) => onDrop(e, task.id)}
      style={{ paddingLeft: depth * 16 }}
    >
      {isDragOver && dragOverPos === 'before' && (
        <div className="kanban-drop-line kanban-drop-line-before" />
      )}

      <div className={`kanban-task-row ${isDragOver && dragOverPos === 'child' ? 'kanban-drop-child' : ''}`}>
        <span className="kanban-drag-handle nodrag" title="Перетягнути">⠿</span>

        <span
          className={`kanban-checkbox nodrag ${task.done ? 'kanban-checkbox-done' : ''}`}
          onClick={() => onToggle(task.id)}
        >
          {task.done ? '✓' : ''}
        </span>

        <input
          ref={inputRef}
          className={`kanban-task-input ${editingText ? 'nodrag' : 'kanban-task-input--preview'}`}
          readOnly={!editingText}
          onDoubleClick={() => setEditingText(true)}
          defaultValue={task.text}
          placeholder={depth === 0 ? 'Нова задача...' : 'Підзадача...'}
          style={{ textDecoration: task.done ? 'line-through' : 'none', opacity: task.done ? 0.5 : 1 }}
          onChange={(e) => setDraftText(e.target.value)}
          onBlur={(e) => {
            setEditingText(false);
            onTextChange(task.id, e.target.value);
          }}
          onKeyDown={handleKeyDown}
        />

        <span
          className="kanban-task-delete nodrag"
          onClick={() => onDelete(task.id)}
          title="Видалити"
        >
          ✕
        </span>
      </div>

      {isDragOver && dragOverPos === 'after' && (
        <div className="kanban-drop-line kanban-drop-line-after" />
      )}
    </div>
  );
};

// ─── KanbanNode ───────────────────────────────────────────────────────────────

// Cross-column drag uses a global event emitter pattern via window custom events.
// When a task is dropped onto a column that doesn't own it, the source column
// removes the task and the target column adds it.
const CROSS_COL_EVENT = 'kanban:cross-column-drop';

const KanbanNode = ({ data, selected }) => {
  const tasks = useMemo(() => data.tasks ?? [], [data.tasks]);
  const label = data.label || '';

  const [editingTitle, setEditingTitle] = useState(false);
  const [dragId,       setDragId]       = useState(null);
  const [dragOverId,   setDragOverId]   = useState(null);
  const [dragOverPos,  setDragOverPos]  = useState(null);
  const [lastAddedId,  setLastAddedId]  = useState(null);

  // nodeId exposed through data for cross-column logic
  const nodeId = data.nodeId;

  // ── Auto-height: no fixed height, node grows with content ──
  // We remove the Resizable wrapper and let the node size itself.
  // Width is still resizable via a custom handle on the right edge.
  const width = data.size?.width || 280;
  const onResizeWidth = useCallback((e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = width;
    const onMove = (me) => {
      const newW = Math.max(220, startW + (me.clientX - startX));
      data.onChange({ width: newW, height: null }, 'size');
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [width, data]);

  // ── Cross-column: listen for incoming tasks ──
  useEffect(() => {
    const handler = (e) => {
      const { task, targetNodeId, targetTaskId, position } = e.detail;
      if (targetNodeId !== nodeId) return;

      let updated;
      if (targetTaskId) {
        if (position === 'child') {
          updated = insertChildFirst(tasks, targetTaskId, task);
        } else if (position === 'before') {
          updated = insertBefore(tasks, targetTaskId, task);
        } else {
          updated = insertAfter(tasks, targetTaskId, task);
        }
      } else {
        updated = [...tasks, task];
      }
      data.onChange(updated, 'tasks');
    };
    window.addEventListener(CROSS_COL_EVENT, handler);
    return () => window.removeEventListener(CROSS_COL_EVENT, handler);
  }, [nodeId, tasks, data]);

  // ── Task CRUD ──

  const addTaskAtBottom = useCallback(() => {
    const t = { id: newTaskId(), text: '', done: false, children: [] };
    data.onChange([...tasks, t], 'tasks');
    setLastAddedId(t.id);
  }, [tasks, data]);

  const addTaskAfter = useCallback((afterId) => {
    const t = { id: newTaskId(), text: '', done: false, children: [] };
    const updated = insertAfter(tasks, afterId, t);
    data.onChange(updated, 'tasks');
    setLastAddedId(t.id);
  }, [tasks, data]);

  const handleIndent = useCallback((id) => {
    const updated = indentTask(tasks, id);
    data.onChange(updated, 'tasks');
  }, [tasks, data]);

  const handleUnindent = useCallback((id) => {
    const updated = unindentTask(tasks, id);
    data.onChange(updated, 'tasks');
  }, [tasks, data]);

  const toggleTask = useCallback((id) => {
    const task = findTask(tasks, id);
    if (!task) return;
    const toggleAll = (t, done) => ({
      ...t, done,
      children: (t.children || []).map(c => toggleAll(c, done)),
    });
    data.onChange(updateTask(tasks, id, toggleAll(task, !task.done)), 'tasks');
  }, [tasks, data]);

  const changeText = useCallback((id, text) => {
    data.onChange(updateTask(tasks, id, { text }), 'tasks');
  }, [tasks, data]);

  const deleteTask = useCallback((id) => {
    data.onChange(removeTask(tasks, id), 'tasks');
  }, [tasks, data]);

  // ── Drag & Drop ──

  const handleDragStart = useCallback((e, id) => {
    e.stopPropagation();
    setDragId(id);
    e.dataTransfer.effectAllowed = 'move';
    // Encode both taskId and sourceNodeId for cross-column detection
    e.dataTransfer.setData('kanban-task-id', id);
    e.dataTransfer.setData('kanban-source-node', nodeId || '');
  }, [nodeId]);

  const handleDragOver = useCallback((e, id) => {
    e.preventDefault();
    e.stopPropagation();
    if (id === dragId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const h = rect.height;
    let pos;
    if (y < h * 0.25)      pos = 'before';
    else if (y > h * 0.75) pos = 'after';
    else                    pos = 'child';
    setDragOverId(id);
    setDragOverPos(pos);
  }, [dragId]);

  const handleDrop = useCallback((e, targetId) => {
    e.preventDefault();
    e.stopPropagation();

    const taskId      = e.dataTransfer.getData('kanban-task-id');
    const sourceNode  = e.dataTransfer.getData('kanban-source-node');

    if (!taskId) return;

    if (sourceNode && sourceNode !== nodeId) {
      const draggedTask = window.__kanbanDraggedTask;
      if (!draggedTask) return;

      // Cross-column drop: ask source column to remove, then add here
      window.dispatchEvent(new CustomEvent('kanban:remove-task', {
        detail: { taskId, sourceNodeId: sourceNode }
      }));
      // Get the task data from the source via a sync request
      window.dispatchEvent(new CustomEvent(CROSS_COL_EVENT, {
        detail: {
          task: draggedTask,
          targetNodeId: nodeId,
          targetTaskId: targetId,
          position: dragOverPos,
        }
      }));
    } else {
      // Same-column drop
      if (!dragId || dragId === targetId) { setDragId(null); setDragOverId(null); return; }
      const updated = moveTaskWithin(tasks, dragId, targetId, dragOverPos);
      data.onChange(updated, 'tasks');
    }

    setDragId(null);
    setDragOverId(null);
    setDragOverPos(null);
  }, [dragId, dragOverPos, tasks, data, nodeId]);

  // Expose dragged task to window so cross-column drop can grab it
  useEffect(() => {
    if (!dragId) return;
    window.__kanbanDraggedTask = findTask(tasks, dragId);
  }, [dragId, tasks]);

  // Listen for remove requests from cross-column drops
  useEffect(() => {
    const handler = (e) => {
      const { taskId, sourceNodeId } = e.detail;
      if (sourceNodeId !== nodeId) return;
      data.onChange(removeTask(tasks, taskId), 'tasks');
    };
    window.addEventListener('kanban:remove-task', handler);
    return () => window.removeEventListener('kanban:remove-task', handler);
  }, [nodeId, tasks, data]);

  const handleDragEnd = useCallback(() => {
    setDragId(null);
    setDragOverId(null);
    setDragOverPos(null);
  }, []);

  // Handle drop on empty area of column (append to end)
  const handleColumnDrop = useCallback((e) => {
    e.preventDefault();
    const taskId     = e.dataTransfer.getData('kanban-task-id');
    const sourceNode = e.dataTransfer.getData('kanban-source-node');
    if (!taskId) return;

    if (sourceNode && sourceNode !== nodeId) {
      const draggedTask = window.__kanbanDraggedTask;
      if (!draggedTask) return;

      window.dispatchEvent(new CustomEvent('kanban:remove-task', {
        detail: { taskId, sourceNodeId: sourceNode }
      }));
      window.dispatchEvent(new CustomEvent(CROSS_COL_EVENT, {
        detail: {
          task: draggedTask,
          targetNodeId: nodeId,
          targetTaskId: null,
          position: 'after',
        }
      }));
    } else {
      if (dragId) {
        const dragged = findTask(tasks, dragId);
        if (dragged) {
          const without = removeTask(tasks, dragId);
          data.onChange([...without, dragged], 'tasks');
        }
      }
    }
    setDragId(null);
    setDragOverId(null);
  }, [nodeId, dragId, tasks, data]);

  // ── Flatten for render ──
  const flat = flattenTasks(tasks);
  const doneCount  = flat.filter(t => t.done).length;
  const totalCount = flat.length;

  // maxDepth for Tab indent: previous sibling's depth + 1
  // We compute it per-task at render time
  const getMaxDepthForTask = (taskId) => {
    const idx = flat.findIndex(t => t.id === taskId);
    if (idx <= 0) return 0;
    return flat[idx - 1].depth + 1;
  };

  return (
    <div
      className={`kanban-node custom-node ${selected ? 'selected' : ''}`}
      style={{ width, position: 'relative' }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleColumnDrop}
    >
      <Handle type="target" position={Position.Top}    className="node-magnet nodrag" style={{ top: 0, left: '50%', transform: 'translate(-50%, -50%)' }} />
      <Handle type="source" position={Position.Bottom} className="node-magnet nodrag" style={{ bottom: 0, left: '50%', transform: 'translate(-50%, 50%)' }} />

      {/* Width-only resize handle */}
      <div
        className="kanban-resize-handle nodrag"
        onMouseDown={onResizeWidth}
        title="Змінити ширину"
      />

      {/* ── Header ── */}
      <div className="kanban-node-header">
        {editingTitle ? (
          <input
            autoFocus
            className="kanban-title-input nodrag"
            defaultValue={label}
            placeholder="Назва колонки..."
            onBlur={(e) => { data.onChange(e.target.value, 'label'); setEditingTitle(false); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'Escape') {
                data.onChange(e.target.value, 'label');
                setEditingTitle(false);
              }
            }}
          />
        ) : (
          <span
            className="kanban-title"
            onDoubleClick={() => setEditingTitle(true)}
            title="Двічі клікни щоб перейменувати"
          >
            {label || 'Без назви'}
          </span>
        )}
        {totalCount > 0 && (
          <span className="kanban-count-badge">{doneCount}/{totalCount}</span>
        )}
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="kanban-progress-bar">
          <div
            className="kanban-progress-fill"
            style={{ width: `${Math.round((doneCount / totalCount) * 100)}%` }}
          />
        </div>
      )}

      {/* ── Task list ── */}
      <div className="kanban-task-list" onDragEnd={handleDragEnd}>
        {flat.length === 0 && (
          <div className="kanban-empty-hint">
            Enter або ＋ щоб додати задачу · Tab — підзадача
          </div>
        )}
        {flat.map(({ id, text, done, depth }) => (
          <TaskRow
            key={id}
            task={{ id, text, done }}
            depth={depth}
            maxDepth={getMaxDepthForTask(id)}
            onToggle={toggleTask}
            onTextChange={changeText}
            onDelete={deleteTask}
            onAddAfter={addTaskAfter}
            onIndent={handleIndent}
            onUnindent={handleUnindent}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            dragOverId={dragOverId}
            dragOverPos={dragOverPos}
            autoFocus={lastAddedId === id}
          />
        ))}
      </div>

      {/* ── Footer ── */}
      <div className="kanban-node-footer nodrag">
        <button className="kanban-add-btn" onClick={addTaskAtBottom}>
          ＋ Задача
        </button>
      </div>
    </div>
  );
};

export default KanbanNode;
