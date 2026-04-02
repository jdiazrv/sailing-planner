"use client";

import { useState } from "react";

import { GuestOnboardingTour } from "@/components/guest/guest-onboarding-tour";
import { GuestWelcomeModal } from "@/components/guest/guest-welcome-modal";

type GuestFirstAccessProps = {
  creatorName: string;
  seasonName: string;
  expiresAt: string | null;
  canViewVisits: boolean;
  resetKey?: string;
};

export function GuestFirstAccess({
  creatorName,
  seasonName,
  expiresAt,
  canViewVisits,
  resetKey,
}: GuestFirstAccessProps) {
  const [tourEnabled, setTourEnabled] = useState(false);

  return (
    <>
      <GuestWelcomeModal
        canViewVisits={canViewVisits}
        creatorName={creatorName}
        expiresAt={expiresAt}
        onCloseComplete={() => setTourEnabled(true)}
        seasonName={seasonName}
      />
      <GuestOnboardingTour
        canViewVisits={canViewVisits}
        enabled={tourEnabled}
        resetKey={resetKey}
      />
    </>
  );
}
