'use client';

interface ConfirmDialogProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  danger?: boolean;
}

export default function ConfirmDialog({ title, message, onConfirm, onCancel, confirmLabel = 'Confirm', danger = false }: ConfirmDialogProps) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title.toUpperCase()}</h3>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5 }}>{message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onCancel}>CANCEL</button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>{confirmLabel.toUpperCase()}</button>
        </div>
      </div>
    </div>
  );
}
