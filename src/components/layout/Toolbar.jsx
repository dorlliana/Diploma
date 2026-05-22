import React from 'react';
import { FaRegStickyNote, FaImage, FaMusic, FaCode, FaLink, FaTasks } from 'react-icons/fa';
import { FiBookOpen, FiDownloadCloud, FiFileText, FiList, FiLogOut, FiTrash2 } from 'react-icons/fi';

const Toolbar = ({
  onActivateConnection,
  onToggleTaskPanel,
  onOpenGDD,
  onExportGDD,
  onExportGDDPdf,
  user,
  onLogout,
  onDeleteAccount,
}) => {
  // Елементи інвентарю — перетягуються на дошку
  const menuItems = [
    { type: 'text',       icon: <FaRegStickyNote />, tooltip: 'Текстова нотатка' },
    { type: 'image',      icon: <FaImage />,         tooltip: 'Зображення'       },
    { type: 'audio',      icon: <FaMusic />,         tooltip: 'Аудіоресурс'     },
    { type: 'code',       icon: <FaCode />,          tooltip: 'GML-скрипт'       },
    { type: 'kanban',     icon: <FaTasks />,         tooltip: 'Список завдань'   },
    { type: 'connection', icon: <FaLink />,          tooltip: "З'єднати ноди (Left Alt)"    },
  ];

  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="sidebar">
      <section className="sidebar-section">
        <div className="sidebar-title">Елементи</div>
        <div className="sidebar-menu">
          {menuItems.map((item) => (
            <div
              key={item.type}
              className="sidebar-item"
              draggable={item.type !== 'connection'}
              onClick={item.type === 'connection' ? onActivateConnection : undefined}
              onDragStart={(e) => onDragStart(e, item.type)}
              data-tooltip={item.tooltip}
            >
              {item.icon}
            </div>
          ))}
        </div>
      </section>

      <section className="sidebar-section">
        <div className="sidebar-title">Інструменти</div>
        <div className="sidebar-menu">
          <button
            type="button"
            className="sidebar-item sidebar-item--tool"
            onClick={onToggleTaskPanel}
            data-tooltip="Панель завдань"
          >
            <FiList />
          </button>
          <button
            type="button"
            className="sidebar-item sidebar-item--tool"
            onClick={onOpenGDD}
            data-tooltip="GDD-шаблон"
          >
            <FiBookOpen />
          </button>
          <button
            type="button"
            className="sidebar-item sidebar-item--tool"
            onClick={onExportGDD}
            data-tooltip="Експорт GDD (.md)"
          >
            <FiDownloadCloud />
          </button>
          <button
            type="button"
            className="sidebar-item sidebar-item--tool"
            onClick={onExportGDDPdf}
            data-tooltip="Експорт GDD (PDF)"
          >
            <FiFileText />
          </button>
        </div>
      </section>

      <div className="sidebar-user">
        <span className="sidebar-user-email">{user?.email}</span>
        <button
          type="button"
          className="sidebar-user-action"
          onClick={onLogout}
          title="Вийти"
        >
          <FiLogOut />
        </button>
        <button
          type="button"
          className="sidebar-user-action sidebar-user-action--danger"
          onClick={onDeleteAccount}
          title="Видалити акаунт"
        >
          <FiTrash2 />
        </button>
      </div>
    </aside>
  );
};

export default Toolbar;