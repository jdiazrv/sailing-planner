import { Dialog } from "@/components/ui/dialog";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive = false,
  pending = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog onClose={onCancel} open={open} title={title}>
      <div className="confirm-dialog">
        <p className="confirm-dialog__body">{description}</p>
        <div className="modal__footer">
          <button className="secondary-button" onClick={onCancel} type="button">
            {cancelLabel}
          </button>
          <button
            className={destructive ? "link-button link-button--danger" : "primary-button"}
            disabled={pending}
            onClick={onConfirm}
            type="button"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
