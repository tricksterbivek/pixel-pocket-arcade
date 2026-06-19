import { useEffect, useId, useRef } from 'react';
import { buttonClasses } from './Button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmation built on the native <dialog> element, which gives correct
 * dialog semantics, a focus trap, and Escape-to-cancel for free.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={descId}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      onClick={(e) => {
        // Click on the backdrop (the dialog element itself) cancels.
        if (e.target === ref.current) onCancel();
      }}
      className="m-auto w-[min(92vw,28rem)] rounded-lg border-2 border-border-strong bg-surface p-0 text-fg shadow-modal backdrop:bg-black/60"
    >
      <div className="p-6">
        <h2 id={titleId} className="text-xl text-fg">
          {title}
        </h2>
        <p id={descId} className="mt-3 text-muted">
          {message}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className={buttonClasses('secondary')} onClick={onCancel} autoFocus>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={buttonClasses(danger ? 'danger' : 'primary')}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
