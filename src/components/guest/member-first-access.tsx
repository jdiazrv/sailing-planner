"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { GuestOnboardingTour } from "@/components/guest/guest-onboarding-tour";
import { MemberWelcomeModal } from "@/components/guest/member-welcome-modal";
import { getStartTourStep, REPLAY_TOUR_EVENT } from "@/lib/onboarding";
import type { OnboardingStep } from "@/types/database";

type MemberFirstAccessProps = {
  canViewVisits: boolean;
  canManageUsers: boolean;
  canShare: boolean;
  canEditBoat: boolean;
  isSuperuser: boolean;
  boatName: string;
  onboardingStep?: OnboardingStep | null;
  viewerId: string;
  hasSeason?: boolean;
  hasSegments?: boolean;
  hasVisits?: boolean;
  replayGuide?: boolean;
};

export function MemberFirstAccess({
  canViewVisits,
  canManageUsers,
  canShare,
  canEditBoat,
  isSuperuser,
  boatName,
  onboardingStep,
  viewerId,
  hasSeason = false,
  hasSegments = false,
  hasVisits = false,
  replayGuide = false,
}: MemberFirstAccessProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isReadOnly = !canEditBoat && !canManageUsers && !canShare;
  const [currentStep, setCurrentStep] = useState<OnboardingStep | null>(onboardingStep ?? null);
  const [manualReplayStep, setManualReplayStep] = useState<OnboardingStep | null>(null);

  useEffect(() => {
    setCurrentStep(onboardingStep ?? null);
  }, [onboardingStep, viewerId]);

  useEffect(() => {
    setManualReplayStep(null);
  }, [viewerId]);

  useEffect(() => {
    const handleReplayTour = () => {
      if (currentStep) {
        return;
      }

      setManualReplayStep(getStartTourStep({ canEditBoat, hasSeason }));
    };

    window.addEventListener(REPLAY_TOUR_EVENT, handleReplayTour);

    return () => {
      window.removeEventListener(REPLAY_TOUR_EVENT, handleReplayTour);
    };
  }, [canEditBoat, currentStep, hasSeason]);

  useEffect(() => {
    if (!replayGuide || currentStep) {
      return;
    }

    setManualReplayStep(getStartTourStep({ canEditBoat, hasSeason }));

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("replayGuide");
    const nextUrl = nextParams.toString() ? `${pathname}?${nextParams.toString()}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [canEditBoat, currentStep, hasSeason, pathname, replayGuide, router, searchParams]);

  const dismissTour = async () => {
    if (manualReplayStep) {
      setManualReplayStep(null);
      return;
    }

    await fetch("/api/onboarding/progress", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "dismiss" }),
    });

    setCurrentStep(null);
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

  const activeStep = manualReplayStep ?? currentStep;
  const tourEnabled = Boolean(activeStep && activeStep !== "welcome");

  const completeTour = () => {
    if (manualReplayStep) {
      setManualReplayStep(null);
      return;
    }

    void fetch("/api/onboarding/complete", { method: "POST" }).then(() => {
      setCurrentStep(null);
    });
  };

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
        isSuperuser={isSuperuser}
        isReadOnly={isReadOnly}
        hasSegments={hasSegments}
        hasVisits={hasVisits}
        enabled={tourEnabled}
        memberPhase={activeStep}
        onDismiss={() => {
          void dismissTour();
        }}
        onComplete={() => {
          completeTour();
        }}
        resetKey={viewerId}
        variant="member"
      />
    </>
  );
}
