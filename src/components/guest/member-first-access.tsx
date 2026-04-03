"use client";

import { GuestOnboardingTour } from "@/components/guest/guest-onboarding-tour";

type MemberFirstAccessProps = {
  canViewVisits: boolean;
  canManageUsers: boolean;
  canShare: boolean;
  canEditBoat: boolean;
  viewerId: string;
};

export function MemberFirstAccess({
  canViewVisits,
  canManageUsers,
  canShare,
  canEditBoat,
  viewerId,
}: MemberFirstAccessProps) {
  return (
    <GuestOnboardingTour
      canViewVisits={canViewVisits}
      canEditBoat={canEditBoat}
      canManageUsers={canManageUsers}
      canShare={canShare}
      enabled
      resetKey={viewerId}
      variant="member"
    />
  );
}
