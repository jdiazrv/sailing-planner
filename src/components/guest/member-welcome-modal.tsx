"use client";

import { useRef, useState } from "react";

import { useI18n } from "@/components/i18n/provider";
import { Dialog } from "@/components/ui/dialog";
import { getMemberWelcomeCopy } from "@/lib/onboarding";

type MemberWelcomeModalProps = {
  boatName: string;
  canEditBoat: boolean;
  hasSeason: boolean;
  onDismissTour: () => void;
  onStartTour: () => void;
};

export function MemberWelcomeModal({
  boatName,
  canEditBoat,
  hasSeason,
  onDismissTour,
  onStartTour,
}: MemberWelcomeModalProps) {
  const { locale } = useI18n();
  const [open, setOpen] = useState(true);
  const skipDialogCloseRef = useRef(false);
  const copy = getMemberWelcomeCopy({ locale, boatName, canEditBoat, hasSeason });

  const handleStartTour = () => {
    skipDialogCloseRef.current = true;
    setOpen(false);
    onStartTour();
  };

  const handleDismissTour = () => {
    if (skipDialogCloseRef.current) {
      skipDialogCloseRef.current = false;
      return;
    }

    setOpen(false);
    onDismissTour();
  };

  return (
    <Dialog
      onClose={handleDismissTour}
      open={open}
      title={copy.title}
    >
      <div className="guest-welcome-modal">
        <p className="guest-welcome-modal__lead">{copy.lead}</p>
        <p className="guest-welcome-modal__body">{copy.closeHint}</p>
        <p className="guest-welcome-modal__body"><strong>{copy.assignedBoatBody}</strong></p>
        <p className="guest-welcome-modal__body">{copy.nextStepBody}</p>
        <div className="modal__footer">
          <button className="secondary-button" onClick={handleDismissTour} type="button">
            {copy.skip}
          </button>
          <button className="primary-button" onClick={handleStartTour} type="button">
            {copy.start}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
