"use client";

import { GuestOnboardingTour } from "@/components/guest/guest-onboarding-tour";

type MemberFirstAccessProps = {
  canViewVisits: boolean;
  viewerId: string;
};

export function MemberFirstAccess({ canViewVisits, viewerId }: MemberFirstAccessProps) {
  return (
    <GuestOnboardingTour
      canViewVisits={canViewVisits}
      enabled
      resetKey={viewerId}
      variant="member"
    />
  );
}
