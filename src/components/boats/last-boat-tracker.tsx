"use client";

import { useEffect } from "react";

import { trackLastBoat } from "@/app/boats/[boatId]/actions";

export function LastBoatTracker({ boatId }: { boatId: string }) {
  useEffect(() => {
    void trackLastBoat(boatId);
  }, [boatId]);
  return null;
}
