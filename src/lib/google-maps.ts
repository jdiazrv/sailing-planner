"use client";

import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

let loaderPromise: Promise<typeof google | null> | null = null;

export const hasGoogleMapsKey = Boolean(GOOGLE_MAPS_API_KEY);

export const loadGoogleMaps = async () => {
  if (!GOOGLE_MAPS_API_KEY) {
    return null;
  }

  if (!loaderPromise) {
    setOptions({
      key: GOOGLE_MAPS_API_KEY,
      v: "weekly",
      libraries: ["places", "maps", "marker"],
    });
    loaderPromise = importLibrary("maps")
      .then(() => window.google)
      .catch(() => null);
  }

  return loaderPromise;
};
