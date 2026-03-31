"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { hasGoogleMapsKey, loadGoogleMaps } from "@/lib/google-maps";
import type { TripSegmentView, VisitView } from "@/lib/planning";

declare global {
  interface Window {
    gm_authFailure?: () => void;
  }
}

type Marker = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  tone: "trip" | "visit";
};

type MapPanelProps = {
  tripSegments: TripSegmentView[];
  visits: VisitView[];
  title?: string;
};

const BOUNDS = {
  minLat: 30,
  maxLat: 47,
  minLng: -8,
  maxLng: 38,
};

const toPoint = (latitude: number, longitude: number) => {
  const x =
    ((longitude - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * 100;
  const y =
    100 - ((latitude - BOUNDS.minLat) / (BOUNDS.maxLat - BOUNDS.minLat)) * 100;

  return { x, y };
};

const buildMarkers = (tripSegments: TripSegmentView[], visits: VisitView[]) => {
  const tripMarkers: Marker[] = tripSegments
    .filter(
      (segment) =>
        typeof segment.latitude === "number" &&
        typeof segment.longitude === "number",
    )
    .map((segment) => ({
      id: `trip-${segment.id}`,
      label: segment.location_label,
      latitude: Number(segment.latitude),
      longitude: Number(segment.longitude),
      tone: "trip",
    }));

  const visitMarkers: Marker[] = visits.flatMap((visit) => {
    const markers: Marker[] = [];

    if (
      typeof visit.embark_latitude === "number" &&
      typeof visit.embark_longitude === "number"
    ) {
      markers.push({
        id: `visit-embark-${visit.id}`,
        label: `${visit.visitor_name ?? "Visit"} embark`,
        latitude: Number(visit.embark_latitude),
        longitude: Number(visit.embark_longitude),
        tone: "visit",
      });
    }

    if (
      typeof visit.disembark_latitude === "number" &&
      typeof visit.disembark_longitude === "number"
    ) {
      markers.push({
        id: `visit-disembark-${visit.id}`,
        label: `${visit.visitor_name ?? "Visit"} disembark`,
        latitude: Number(visit.disembark_latitude),
        longitude: Number(visit.disembark_longitude),
        tone: "visit",
      });
    }

    return markers;
  });

  return [...tripMarkers, ...visitMarkers];
};

export const MapPanel = ({
  tripSegments,
  visits,
  title = "Map snapshot",
}: MapPanelProps) => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [googleAvailable, setGoogleAvailable] = useState(hasGoogleMapsKey);
  const [mapMessage, setMapMessage] = useState(
    "Loading Google map and place markers...",
  );
  const markers = useMemo(
    () => buildMarkers(tripSegments, visits),
    [tripSegments, visits],
  );

  useEffect(() => {
    if (!hasGoogleMapsKey || !mapRef.current) {
      setGoogleAvailable(false);
      return;
    }

    let detached = false;
    const previousAuthFailure = window.gm_authFailure;

    window.gm_authFailure = () => {
      if (!detached) {
        setGoogleAvailable(false);
        setMapReady(false);
        setMapMessage(
          "Google Maps is blocked for this key or domain. Showing the fallback map instead.",
        );
      }
    };

    void (async () => {
      const maps = await loadGoogleMaps();
      if (!maps || !mapRef.current || detached) {
        if (!detached) {
          setGoogleAvailable(false);
          setMapReady(false);
          setMapMessage(
            "Google Maps could not be loaded. Showing the fallback map instead.",
          );
        }
        return;
      }

      const center = markers[0]
        ? { lat: markers[0].latitude, lng: markers[0].longitude }
        : { lat: 37.9, lng: 18.0 };

      const map = new maps.maps.Map(mapRef.current, {
        center,
        zoom: markers.length > 1 ? 5 : 6,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        gestureHandling: "greedy",
      });

      if (markers.length > 1) {
        const bounds = new maps.maps.LatLngBounds();
        markers.forEach((marker) => {
          bounds.extend({ lat: marker.latitude, lng: marker.longitude });
        });
        map.fitBounds(bounds, 48);
      }

      markers.forEach((marker) => {
        const pin = new maps.maps.Marker({
          map,
          position: { lat: marker.latitude, lng: marker.longitude },
          title: marker.label,
        });

        pin.setIcon({
          path: maps.maps.SymbolPath.CIRCLE,
          scale: 7,
          fillColor: marker.tone === "trip" ? "#005f73" : "#e07a5f",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        });
      });

      setGoogleAvailable(true);
      setMapReady(true);
    })();

    return () => {
      detached = true;
      window.gm_authFailure = previousAuthFailure;
    };
  }, [markers]);

  return (
    <article className="dashboard-card map-panel">
      <div className="card-header">
        <div>
          <p className="eyebrow">Map</p>
          <h2>{title}</h2>
        </div>
      </div>

      {hasGoogleMapsKey && googleAvailable ? (
        <div className="map-canvas map-canvas--google">
          <div className="map-google" ref={mapRef} />
          {!mapReady ? (
            <div className="map-empty">{mapMessage}</div>
          ) : null}
        </div>
      ) : (
        <div className="map-canvas">
          <div className="map-canvas__grid" />
          {markers.length ? (
            markers.map((marker) => {
              const point = toPoint(marker.latitude, marker.longitude);

              return (
                <button
                  className={`map-marker is-${marker.tone}`}
                  key={marker.id}
                  style={{ left: `${point.x}%`, top: `${point.y}%` }}
                  title={marker.label}
                  type="button"
                >
                  <span>{marker.label}</span>
                </button>
              );
            })
          ) : (
            <div className="map-empty">
              Add latitude and longitude to trip segments or visit places to see them
              on the map.
            </div>
          )}
          <div className="map-caption">
            {hasGoogleMapsKey
              ? mapMessage
              : "Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to render a live Google map here."}
          </div>
        </div>
      )}
    </article>
  );
};
