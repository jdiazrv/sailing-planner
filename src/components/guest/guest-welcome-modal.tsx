"use client";

import { useState } from "react";

import { Dialog } from "@/components/ui/dialog";

type GuestWelcomeModalProps = {
  creatorName: string;
  seasonName: string;
  expiresAt: string | null;
  canViewVisits: boolean;
  onCloseComplete?: () => void;
};

export function GuestWelcomeModal({
  creatorName,
  seasonName,
  expiresAt,
  canViewVisits,
  onCloseComplete,
}: GuestWelcomeModalProps) {
  const [open, setOpen] = useState(true);

  const handleClose = () => {
    setOpen(false);
    onCloseComplete?.();
  };

  return (
    <Dialog onClose={handleClose} open={open} title="Invitacion activada">
      <div className="guest-welcome-modal">
        <p className="guest-welcome-modal__lead">
          <strong>{creatorName}</strong> le ha invitado a ver el planeamiento de su navegacion{" "}
          <strong>{seasonName}</strong>.
        </p>
        <p className="guest-welcome-modal__body">
          Este acceso es de solo lectura y esta pensado para seguir la temporada con una vista
          clara del plan y del timeline.
        </p>
        {canViewVisits ? (
          <p className="guest-welcome-modal__body">
            Ademas podra ver las fechas en las que se incorporaran los diferentes invitados asi
            como su lugar de embarque y desembarque.
          </p>
        ) : null}
        {expiresAt ? (
          <p className="guest-welcome-modal__meta">Este enlace expira el {expiresAt}.</p>
        ) : null}
        <p className="guest-welcome-modal__body">
          {canViewVisits
            ? "Puede alternar entre la vista de tramos y visitas, y usar el timeline para entender de un vistazo el recorrido completo de la navegacion."
            : "Puede seguir la vista de tramos y usar el timeline para entender de un vistazo el recorrido completo de la navegacion."}
        </p>
        <div className="modal__footer">
          <button className="primary-button" onClick={handleClose} type="button">
            Cerrar
          </button>
        </div>
      </div>
    </Dialog>
  );
}
