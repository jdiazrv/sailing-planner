"use client";

import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const GOOGLE_MAPS_MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID?.trim() || null;

export type GoogleMapsRuntime = {
  maps: typeof google.maps;
  marker: typeof google.maps.marker | null;
  mapId: string | null;
};

let loaderPromise: Promise<GoogleMapsRuntime | null> | null = null;

export const hasGoogleMapsKey = Boolean(GOOGLE_MAPS_API_KEY);
export const hasGoogleMapsMapId = Boolean(GOOGLE_MAPS_MAP_ID);

export const loadGoogleMaps = async () => {
  if (!GOOGLE_MAPS_API_KEY) {
    return null;
  }

  if (!loaderPromise) {
    setOptions({
      key: GOOGLE_MAPS_API_KEY,
      v: "weekly",
      libraries: GOOGLE_MAPS_MAP_ID ? ["places", "maps", "marker"] : ["places", "maps"],
    });
    loaderPromise = Promise.all([
      importLibrary("maps"),
      GOOGLE_MAPS_MAP_ID ? importLibrary("marker") : Promise.resolve(null),
    ])
      .then(() => ({
        maps: window.google.maps,
        marker: GOOGLE_MAPS_MAP_ID ? window.google.maps.marker : null,
        mapId: GOOGLE_MAPS_MAP_ID,
      }))
      .catch(() => null);
  }

  return loaderPromise;
};
