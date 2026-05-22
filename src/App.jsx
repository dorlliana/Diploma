import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  addEdge,
  Background,
  Controls,
  ConnectionMode,
  EdgeLabelRenderer,
  BaseEdge,
  getBezierPath,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';

import Sidebar    from './components/layout/Toolbar';
import BoardTabs  from './components/layout/BoardTabs';
import TaskPanel  from './components/layout/TaskPanel';
import CustomNode from './components/nodes/CustomNode';
import Auth        from './components/modals/Auth';
import GDDModal   from './components/modals/GDDModal';
import useAuth    from './hooks/useAuth';
import useBoards  from './hooks/useBoards';
import { exportGDDMarkdown, exportGDDPdf } from './utils/exportGDD';
import './styles/index.css';

// ── Custom labelled edge ────────────────────────────────────────────────────

const LabelledEdge = ({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  data, markerEnd, style,
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  });
  const [editing, setEditing] = useState(false);
  const [label,   setLabel]   = useState(data?.label || '');
  const inputRef = useRef(null);

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
          onDoubleClick={() => setEditing(true)}
        >
          {editing ? (
            <input
              ref={inputRef}
              className="edge-label-input"
              value={label}
              onChange={e => setLabel(e.target.value)}
              onBlur={() => {
                setEditing(false);
                data?.onLabelChange?.(id, label);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === 'Escape') {
                  setEditing(false);
                  data?.onLabelChange?.(id, label);
                }
              }}
            />
          ) : label ? (
            <div className="edge-label-text">{label}</div>
          ) : (
            <div className="edge-label-empty" title="Двічі клікни, щоб додати підпис">+ label</div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

const edgeTypes = { labelled: LabelledEdge };
const nodeTypes = { task: CustomNode };

let idCounter = Date.now();
const getId = () => `node_${idCounter++}`;

// ── App ──────────────────────────────────────────────────────────────────────

const App = () => {
  const reactFlowWrapper = useRef(null);
  const boardLoadingRef  = useRef(false);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  const { user, loading: authLoading, logout, deleteAccount, reauthenticate } = useAuth();
  const {
    boards, currentBoard, setCurrentBoard,
    loading: boardsLoading,
    addBoard, renameBoard, deleteBoard, reorderBoards,
  } = useBoards(user?.uid);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  // menu: { id, top, left, isEdge? }
  const [menu,           setMenu]           = useState(null);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isConnecting,   setIsConnecting]   = useState(false);
  const [sourceNodeId,   setSourceNodeId]   = useState(null);
  const [showGDDModal,   setShowGDDModal]   = useState(false);
  const [showTaskPanel,  setShowTaskPanel]  = useState(false);
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false);
  const [deleteAccountPassword, setDeleteAccountPassword] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [accountError, setAccountError] = useState('');
  const [syncStatus, setSyncStatus] = useState('synced');
  const [syncError, setSyncError] = useState('');
  const [activeMediaUploads, setActiveMediaUploads] = useState(0);

  const onDeleteNodeRef   = useRef(null);
  const updateNodeDataRef = useRef(null);

  // ── updateNodeData ──────────────────────────────────────────────────────
  const updateNodeData = useCallback((nodeId, value, field = 'label') => {
    setNodes(nds =>
      nds.map(node =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, [field]: value } }
          : node
      )
    );
  }, [setNodes]);

  useEffect(() => { updateNodeDataRef.current = updateNodeData; }, [updateNodeData]);

  // ── onDeleteNode ────────────────────────────────────────────────────────
  const onDeleteNode = useCallback((nodeId) => {
    setNodes(nds => nds.filter(n => n.id !== nodeId));
    setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
    setMenu(null);
  }, [setNodes, setEdges]);

  useEffect(() => { onDeleteNodeRef.current = onDeleteNode; }, [onDeleteNode]);

  // ── onDeleteEdge ────────────────────────────────────────────────────────
  const onDeleteEdge = useCallback((edgeId) => {
    setEdges(eds => eds.filter(e => e.id !== edgeId));
    setMenu(null);
  }, [setEdges]);

  // ── Edge label change ───────────────────────────────────────────────────
  const onEdgeLabelChange = useCallback((edgeId, label) => {
    setEdges(eds =>
      eds.map(e =>
        e.id === edgeId ? { ...e, data: { ...e.data, label } } : e
      )
    );
  }, [setEdges]);

  const edgeLabelChangeRef = useRef(onEdgeLabelChange);
  useEffect(() => { edgeLabelChangeRef.current = onEdgeLabelChange; }, [onEdgeLabelChange]);

  // ── attachNodeHandlers ──────────────────────────────────────────────────
  const attachNodeHandlers = useCallback((node) => ({
    ...node,
    data: {
      ...node.data,
      nodeId:   node.id,
      onDelete: (id)       => onDeleteNodeRef.current?.(id),
      onChange: (val, fld) => updateNodeDataRef.current?.(node.id, val, fld),
    },
  }), []);

  // ── createNodeData ──────────────────────────────────────────────────────
  const createNodeData = useCallback((id, type, overrides = {}) => {
    const base = {
      label:           '',
      contentType:     type,
      content:         null,
      showDescription: false,
      size:            { width: 220, height: 150 },
      nodeId:          id,
      ...overrides,
      onDelete: (nodeId) => onDeleteNodeRef.current?.(nodeId),
      onChange: (val, fld) => updateNodeDataRef.current?.(id, val, fld),
    };
    if (type === 'kanban') {
      base.tasks = overrides.tasks || [];
      base.size  = overrides.size  || { width: 280, height: null };
    }
    return base;
  }, []);

  // ── Move node to another board ──────────────────────────────────────────
  const moveNodeToBoard = useCallback(async (nodeId, targetBoard) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node || !user) return;

    setNodes(nds => nds.filter(n => n.id !== nodeId));
    setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
    setMenu(null);

    try {
      const docRef  = doc(db, 'boards', `${user.uid}_${targetBoard}`);
      const snap    = await getDoc(docRef);
      const existing = snap.exists() ? snap.data() : { nodes: [], edges: [] };
      const nodeToSave = { ...node, data: { ...node.data, onDelete: null, onChange: null, nodeId: null } };
      await setDoc(docRef, {
        ...existing,
        nodes: [...(existing.nodes || []), nodeToSave],
        updatedAt: new Date(),
      });
    } catch (err) {
      console.error('Помилка переміщення ноди:', err);
    }
  }, [nodes, user, setNodes, setEdges]);

  // ── Node click (connect mode) ───────────────────────────────────────────
  const onNodeClick = useCallback((event, node) => {
    if (!isConnecting) return;
    if (!sourceNodeId) {
      setSourceNodeId(node.id);
    } else {
      if (sourceNodeId !== node.id) {
        const newEdge = {
          id:   `e${sourceNodeId}-${node.id}`,
          source: sourceNodeId,
          target: node.id,
          type:  'labelled',
          data:  { label: '', onLabelChange: edgeLabelChangeRef.current },
        };
        setEdges(eds => addEdge(newEdge, eds));
      }
      setIsConnecting(false);
      setSourceNodeId(null);
    }
  }, [isConnecting, sourceNodeId, setEdges]);

  const toggleDescription = useCallback((nodeId) => {
    setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, showDescription: true  } } : n));
    setMenu(null);
  }, [setNodes]);

  const hideDescription = useCallback((nodeId) => {
    setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, showDescription: false } } : n));
    setMenu(null);
  }, [setNodes]);

  const onKeyDown = useCallback((e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'Delete' || e.key === 'Backspace') {
      setNodes(nds => nds.filter(n => !n.selected));
      setEdges(eds => eds.filter(e => !e.selected));
    }
  }, [setNodes, setEdges]);

  // ── Drop from toolbar ───────────────────────────────────────────────────
  const onDrop = useCallback((event) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/reactflow');
    if (!type || !reactFlowInstance) return;
    const position = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const id = getId();
    const newNode = { id, type: 'task', position, data: createNodeData(id, type) };
    setNodes(nds => nds.concat(newNode));
  }, [reactFlowInstance, setNodes, createNodeData]);

  // ── GDD Template ────────────────────────────────────────────────────────
  const applyGDDTemplate = useCallback((template) => {
    const newNodes = template.map((item) => {
      const id = getId();
      const ct = item.contentType || 'text';
      return {
        id,
        type: 'task',
        position: item.position,
        data: createNodeData(id, ct, {
          label:       item.label       ?? '',
          content:     item.content     ?? null,
          showTitle:   item.showTitle   ?? false,
          tasks:       item.tasks       ?? [],
          size:        item.size,
          description: item.description ?? '',
        }),
      };
    });
    setNodes(newNodes);
    setEdges([]);
    setShowGDDModal(false);
  }, [setNodes, setEdges, createNodeData]);

  // ── Focus node ──────────────────────────────────────────────────────────
  const onFocusNode = useCallback((nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node || !reactFlowInstance) return;
    const w = node.data?.size?.width || 280;
    reactFlowInstance.setCenter(node.position.x + w / 2, node.position.y + 200, { zoom: 1.2, duration: 400 });
  }, [nodes, reactFlowInstance]);

  const handleExportGDD = useCallback(() => exportGDDMarkdown(nodes, currentBoard), [nodes, currentBoard]);
  const handleExportGDDPdf = useCallback(() => exportGDDPdf(nodes, currentBoard), [nodes, currentBoard]);

  const handleDeleteAccount = useCallback(async () => {
    if (!user) return;
    setAccountError('');
    const usesPasswordLogin = user.providerData?.some(provider => provider.providerId === 'password');
    if (usesPasswordLogin && !deleteAccountPassword.trim()) {
      setAccountError('Введіть пароль для підтвердження видалення акаунта.');
      return;
    }

    setIsDeletingAccount(true);
    let deleted = false;
    try {
      if (usesPasswordLogin) {
        await reauthenticate(deleteAccountPassword);
      }
      await Promise.all(boards.map((board) => deleteDoc(doc(db, 'boards', `${user.uid}_${board}`))));
      await deleteDoc(doc(db, 'boardsList', `boardsList_${user.uid}`));
      await deleteAccount();
      deleted = true;
    } catch (err) {
      console.error('Помилка видалення акаунта:', err);
      if (err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential') {
        setAccountError('Невірний пароль. Перевірте його і спробуйте ще раз.');
      } else if (err?.code === 'auth/requires-recent-login') {
        setAccountError('Для видалення акаунта потрібно вийти і увійти знову, а потім повторити дію.');
      } else {
        setAccountError('Не вдалося видалити акаунт. Спробуйте ще раз.');
      }
    } finally {
      setIsDeletingAccount(false);
      if (deleted) {
        setDeleteAccountPassword('');
        setShowDeleteAccountConfirm(false);
      }
    }
  }, [boards, deleteAccount, deleteAccountPassword, reauthenticate, user]);

  // ── Keyboard shortcuts ──────────────────────────────────────────────────
  useEffect(() => {
    const down = (e) => {
      if (e.code === 'Space' && e.target === document.body) { e.preventDefault(); setIsSpacePressed(true); }
      if (e.altKey || e.key === 'Alt') { e.preventDefault(); setIsConnecting(true); }
    };
    const up = (e) => {
      if (e.code === 'Space') setIsSpacePressed(false);
      if (e.key === 'Alt')    setIsConnecting(false);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup',   up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  // ── Load board ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !currentBoard || boardsLoading) return;
    const loadBoard = async () => {
      boardLoadingRef.current = true;
      setSyncStatus('loading');
      setSyncError('');
      try {
        const snap = await getDoc(doc(db, 'boards', `${user.uid}_${currentBoard}`));
        if (snap.exists()) {
          const data = snap.data();
          setNodes((data.nodes || []).map(n => attachNodeHandlers(n)));
          setEdges((data.edges || []).map(e => ({
            ...e,
            type: 'labelled',
            data: { ...e.data, onLabelChange: edgeLabelChangeRef.current },
          })));
        } else {
          setNodes([]); setEdges([]);
        }
        setSyncStatus('synced');
      } catch (err) {
        console.error('Помилка завантаження дошки:', err);
        setSyncStatus('error');
        setSyncError('Не вдалося завантажити дошку з бази даних.');
      } finally {
        boardLoadingRef.current = false;
      }
    };
    loadBoard();
  }, [currentBoard, user, boardsLoading, attachNodeHandlers, setNodes, setEdges]);

  // ── Autosave ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !currentBoard || boardsLoading) return;
    if (boardLoadingRef.current) return;
    setSyncStatus('pending');
    setSyncError('');
    const timer = setTimeout(async () => {
      if (boardLoadingRef.current) return;
      const nodesToSave = nodes.map(n => ({
        ...n,
        data: { ...n.data, onDelete: null, onChange: null, nodeId: null },
      }));
      const edgesToSave = edges.map(e => ({
        ...e,
        data: { ...e.data, onLabelChange: null },
      }));
      setSyncStatus('saving');
      try {
        await setDoc(doc(db, 'boards', `${user.uid}_${currentBoard}`), {
          nodes: nodesToSave, edges: edgesToSave, updatedAt: new Date(),
        });
        setSyncStatus('synced');
      } catch (err) {
        console.error('Помилка автозбереження:', err);
        setSyncStatus('error');
        setSyncError('Зміни ще не синхронізовані з базою даних.');
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [nodes, edges, currentBoard, user, boardsLoading]);

  useEffect(() => {
    const shouldWarn = activeMediaUploads > 0 || syncStatus === 'pending' || syncStatus === 'saving' || syncStatus === 'error';
    if (!shouldWarn) return undefined;
    const warnBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [activeMediaUploads, syncStatus]);

  useEffect(() => {
    const handleMediaUpload = (event) => {
      setActiveMediaUploads((count) => Math.max(0, count + (event.detail?.active ? 1 : -1)));
    };
    window.addEventListener('gamedev-tracker:media-upload', handleMediaUpload);
    return () => window.removeEventListener('gamedev-tracker:media-upload', handleMediaUpload);
  }, []);

  // ── onConnect ───────────────────────────────────────────────────────────
  const onConnect = useCallback((params) => {
    const newEdge = {
      ...params,
      type: 'labelled',
      data: { label: '', onLabelChange: edgeLabelChangeRef.current },
    };
    setEdges(eds => addEdge(newEdge, eds));
  }, [setEdges]);

  // ── Context menu helpers ────────────────────────────────────────────────
  const menuNode = menu && !menu.isEdge ? nodes.find(n => n.id === menu.id) : null;
  const menuCt   = menuNode?.data?.contentType;
  const menuEdge = menu && menu.isEdge  ? edges.find(e => e.id === menu.id) : null;

  // ── Render ──────────────────────────────────────────────────────────────
  if (authLoading || (user && boardsLoading)) {
    return <div className="app-loading">Завантаження...</div>;
  }

  if (!user) return <Auth />;

  return (
    <div className="app-container" onKeyDown={onKeyDown} tabIndex="0">
      <ReactFlowProvider>
        <Sidebar
          onActivateConnection={() => setIsConnecting(true)}
          onToggleTaskPanel={() => setShowTaskPanel(v => !v)}
          onOpenGDD={() => setShowGDDModal(true)}
          onExportGDDPdf={handleExportGDDPdf}
          onExportGDD={handleExportGDD}
          user={user}
          onLogout={logout}
          onDeleteAccount={() => {
            setAccountError('');
            setDeleteAccountPassword('');
            setShowDeleteAccountConfirm(true);
          }}
        />
        <BoardTabs
          boards={boards}
          currentBoard={currentBoard}
          setBoard={setCurrentBoard}
          onAddBoard={addBoard}
          onRenameBoard={renameBoard}
          onDeleteBoard={deleteBoard}
          onReorderBoards={reorderBoards}
          syncStatus={activeMediaUploads > 0 ? 'saving' : syncStatus}
          syncError={syncError}
        />
        <div className="workspace-row">
          <div className="canvas-area" ref={reactFlowWrapper}>
            <ReactFlow
              snapToGrid
              snapGrid={[20, 20]}
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onInit={setReactFlowInstance}
              onDrop={onDrop}
              onDragOver={e => e.preventDefault()}
              onNodeContextMenu={(e, node) => {
                e.preventDefault();
                setMenu({ id: node.id, top: e.clientY, left: e.clientX, isEdge: false });
              }}
              onEdgeContextMenu={(e, edge) => {
                e.preventDefault();
                setMenu({ id: edge.id, top: e.clientY, left: e.clientX, isEdge: true });
              }}
              onNodeClick={onNodeClick}
              onPaneClick={() => setMenu(null)}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              defaultEdgeOptions={{
                type: 'labelled',
                style: { strokeWidth: 2, stroke: '#007aff' },
                markerEnd: { type: 'arrowclosed', color: '#007aff' },
                data: { label: '', onLabelChange: edgeLabelChangeRef },
              }}
              connectionMode={ConnectionMode.Loose}
              panOnDrag={isSpacePressed ? [0, 1] : [1, 2]}
              selectionOnDrag={!isSpacePressed}
              fitView
              onConnect={onConnect}
            >
              <Background color="#333" gap={20} variant="dots" />

              {/* Context menu — NODE */}
              {menu && !menu.isEdge && menuNode && (
                <div
                  className="context-menu"
                  style={{ top: menu.top, left: menu.left }}
                  onMouseDown={e => e.stopPropagation()}
                >
                  {/* Title toggle — only for text notes */}
                  {menuCt === 'text' && (
                    menuNode?.data?.showTitle
                      ? (
                        <button
                          type="button"
                          onClick={() => {
                            setNodes(nds => nds.map(n => n.id === menu.id ? { ...n, data: { ...n.data, showTitle: false } } : n));
                            setMenu(null);
                          }}
                        >
                          Hide title
                        </button>
                      )
                      : (
                        <button
                          type="button"
                          onClick={() => {
                            setNodes(nds => nds.map(n => n.id === menu.id ? { ...n, data: { ...n.data, showTitle: true } } : n));
                            setMenu(null);
                          }}
                        >
                          Add title
                        </button>
                      )
                  )}

                  {/* Description toggle — not for text/code/kanban */}
                  {menuCt !== 'text' && menuCt !== 'code' && menuCt !== 'kanban' && (
                    menuNode?.data?.showDescription
                      ? (
                        <button type="button" onClick={() => hideDescription(menu.id)}>
                          Hide description
                        </button>
                      )
                      : (
                        <button type="button" onClick={() => toggleDescription(menu.id)}>
                          Add description
                        </button>
                      )
                  )}

                  {/* Move to board submenu */}
                  {boards.filter(b => b !== currentBoard).length > 0 && (
                    <div className="context-menu-submenu">
                      <span className="context-menu-submenu-label">Перемістити до →</span>
                      <div className="context-menu-submenu-list">
                        {boards
                          .filter(b => b !== currentBoard)
                          .map(b => (
                            <button key={b} type="button" onClick={() => moveNodeToBoard(menu.id, b)}>
                              {b}
                            </button>
                          ))
                        }
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    className="context-menu-danger"
                    onClick={() => onDeleteNode(menu.id)}
                  >
                    Видалити
                  </button>
                </div>
              )}

              {/* Context menu — EDGE */}
              {menu && menu.isEdge && menuEdge && (
                <div
                  className="context-menu"
                  style={{ top: menu.top, left: menu.left }}
                  onMouseDown={e => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => {
                      const currentLabel = menuEdge.data?.label || '';
                      const newLabel = window.prompt('Підпис стрілки:', currentLabel);
                      if (newLabel !== null) {
                        onEdgeLabelChange(menu.id, newLabel);
                      }
                      setMenu(null);
                    }}
                  >
                    Змінити підпис
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onEdgeLabelChange(menu.id, '');
                      setMenu(null);
                    }}
                  >
                    Очистити підпис
                  </button>
                  <button
                    type="button"
                    className="context-menu-danger"
                    onClick={() => onDeleteEdge(menu.id)}
                  >
                    Видалити стрілку
                  </button>
                </div>
              )}

              <Controls showInteractive={false} />
            </ReactFlow>
          </div>
          {showTaskPanel && (
            <TaskPanel nodes={nodes} onFocusNode={onFocusNode} onClose={() => setShowTaskPanel(false)} />
          )}
        </div>
      </ReactFlowProvider>

      {showGDDModal && (
        <GDDModal onConfirm={applyGDDTemplate} onClose={() => setShowGDDModal(false)} />
      )}

      {showDeleteAccountConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteAccountConfirm(false)} role="presentation">
          <div
            className="modal modal--confirm"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
          >
            <h2 id="delete-account-title" className="modal__title">Видалити акаунт?</h2>
            <p className="modal__message">
              Акаунт, список дошок і всі дані на дошках будуть видалені назавжди. Цю дію не можна скасувати.
            </p>
            {user.providerData?.some(provider => provider.providerId === 'password') && (
              <label className="modal__field">
                <span className="modal__label">Пароль</span>
                <input
                  autoFocus
                  className="modal__input"
                  type="password"
                  value={deleteAccountPassword}
                  onChange={(e) => {
                    setDeleteAccountPassword(e.target.value);
                    setAccountError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && deleteAccountPassword.trim()) {
                      handleDeleteAccount();
                    }
                    if (e.key === 'Escape') {
                      setShowDeleteAccountConfirm(false);
                    }
                  }}
                  placeholder="Введіть пароль"
                />
              </label>
            )}
            {accountError && (
              <div className="auth-error" style={{ marginBottom: '12px' }}>⚠️ {accountError}</div>
            )}
            <div className="modal__actions">
              <button
                type="button"
                className="modal__btn modal__btn--ghost"
                onClick={() => setShowDeleteAccountConfirm(false)}
                disabled={isDeletingAccount}
              >
                Скасувати
              </button>
              <button
                type="button"
                className="modal__btn modal__btn--danger"
                onClick={handleDeleteAccount}
                disabled={isDeletingAccount || (
                  user.providerData?.some(provider => provider.providerId === 'password') &&
                  !deleteAccountPassword.trim()
                )}
              >
                {isDeletingAccount ? 'Видалення...' : 'Видалити акаунт'}
              </button>
            </div>
          </div>
        </div>
      )}

      {accountError && !showDeleteAccountConfirm && (
        <div className="account-error-toast" role="alert">
          {accountError}
          <button type="button" onClick={() => setAccountError('')} aria-label="Закрити">x</button>
        </div>
      )}
    </div>
  );
};

export default App;