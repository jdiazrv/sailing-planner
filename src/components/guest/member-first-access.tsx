"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { GuestOnboardingTour } from "@/components/guest/guest-onboarding-tour";
import { MemberWelcomeModal } from "@/components/guest/member-welcome-modal";
import { getStartTourStep } from "@/lib/onboarding";
import type { OnboardingStep } from "@/types/database";

type MemberFirstAccessProps = {
  canViewVisits: boolean;
  canManageUsers: boolean;
  canShare: boolean;
  canEditBoat: boolean;
  boatName: string;
  onboardingStep?: OnboardingStep | null;
  viewerId: string;
  hasSeason?: boolean;
  hasSegments?: boolean;
  hasVisits?: boolean;
};

export function MemberFirstAccess({
  canViewVisits,
  canManageUsers,
  canShare,
  canEditBoat,
  boatName,
  onboardingStep,
  viewerId,
  hasSeason = false,
  hasSegments = false,
  hasVisits = false,
}: MemberFirstAccessProps) {
  const isReadOnly = !canEditBoat && !canManageUsers && !canShare;
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<OnboardingStep | null>(onboardingStep ?? null);

  useEffect(() => {
    setCurrentStep(onboardingStep ?? null);
  }, [onboardingStep, viewerId]);

  const dismissTour = async () => {
    await fetch("/api/onboarding/progress", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "dismiss" }),
    });

    setCurrentStep(null);
    router.refresh();
  };

  const startTour = async () => {
    const nextStep = getStartTourStep({ canEditBoat, hasSeason });

    await fetch("/api/onboarding/progress", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ step: nextStep }),
    });

    setCurrentStep(nextStep);
  };

  const tourEnabled = Boolean(currentStep && currentStep !== "welcome");

  return (
    <>
      {currentStep === "welcome" ? (
        <MemberWelcomeModal
          boatName={boatName}
          canEditBoat={canEditBoat}
          hasSeason={hasSeason}
          onDismissTour={() => {
            void dismissTour();
          }}
          onStartTour={() => {
            void startTour();
          }}
        />
      ) : null}
      <GuestOnboardingTour
        canViewVisits={canViewVisits}
        canEditBoat={canEditBoat}
        canManageUsers={canManageUsers}
        canShare={canShare}
        isReadOnly={isReadOnly}
        hasSegments={hasSegments}
        hasVisits={hasVisits}
        enabled={tourEnabled}
        memberPhase={currentStep}
        onDismiss={() => {
          void dismissTour();
        }}
        resetKey={viewerId}
        variant="member"
      />
    </>
  );
}
