"use client";

import { useEffect, useRef } from "react";

export function Dialog({
  open,
  onClose,
  title,
  contentClassName,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  contentClassName?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open) {
      if (!el.open) el.showModal();
    } else {
      el.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="modal"
      aria-modal="true"
      onClose={onClose}
    >
      <div className={["modal__inner", contentClassName].filter(Boolean).join(" ")}>
        <div className="modal__header">
          <h3>{title}</h3>
          <button
            type="button"
            className="modal__close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
        <div className="modal__body">{children}</div>
      </div>
    </dialog>
  );
}
