import React from 'react';

const ConfirmDialog = ({
  title,
  message,
  confirmLabel = 'Підтвердити',
  cancelLabel = 'Скасувати',
  onConfirm,
  onCancel,
  danger = false,
}) => (
  <div className="modal-overlay" onClick={onCancel} role="presentation">
    <div
      className="modal modal--confirm"
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <h2 id="confirm-dialog-title" className="modal__title">{title}</h2>
      <p className="modal__message">{message}</p>
      <div className="modal__actions">
        <button type="button" className="modal__btn modal__btn--ghost" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={`modal__btn ${danger ? 'modal__btn--danger' : 'modal__btn--primary'}`}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

export default ConfirmDialog;
