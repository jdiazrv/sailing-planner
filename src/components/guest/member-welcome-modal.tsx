"use client";

import { useState } from "react";

import { useI18n } from "@/components/i18n/provider";
import { Dialog } from "@/components/ui/dialog";

type MemberWelcomeModalProps = {
  boatName: string;
  onDismissTour: () => void;
  onStartTour: () => void;
};

export function MemberWelcomeModal({
  boatName,
  onDismissTour,
  onStartTour,
}: MemberWelcomeModalProps) {
  const { locale } = useI18n();
  const [open, setOpen] = useState(true);

  const handleStartTour = () => {
    setOpen(false);
    onStartTour();
  };

  const handleDismissTour = () => {
    setOpen(false);
    onDismissTour();
  };

  return (
    <Dialog
      onClose={handleDismissTour}
      open={open}
      title={locale === "es" ? "Bienvenido a bordo" : "Welcome aboard"}
    >
      <div className="guest-welcome-modal">
        <p className="guest-welcome-modal__lead">
          {locale === "es"
            ? "Gracias por unirte. Vamos a hacer un tour rapido de la plataforma."
            : "Thanks for joining. We will do a quick platform tour."}
        </p>
        <p className="guest-welcome-modal__body">
          {locale === "es"
            ? "Puedes salir del tour en cualquier momento con el boton Cerrar."
            : "You can exit the tour at any time using the Close button."}
        </p>
        <p className="guest-welcome-modal__body">
          {locale === "es"
            ? "Te han asignado al barco"
            : "You have been assigned to the boat"}{" "}
          <strong>{boatName}</strong>.
        </p>
        <p className="guest-welcome-modal__body">
          {locale === "es"
            ? "Lo primero sera abrir el menu de Barco y terminar la configuracion de tu barco."
            : "First, we will open the Boat menu and finish configuring your boat."}
        </p>
        <div className="modal__footer">
          <button className="secondary-button" onClick={handleDismissTour} type="button">
            {locale === "es" ? "Saltar" : "Skip"}
          </button>
          <button className="primary-button" onClick={handleStartTour} type="button">
            {locale === "es" ? "Empezar tour" : "Start tour"}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
