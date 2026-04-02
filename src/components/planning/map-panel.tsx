"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useI18n } from "@/components/i18n/provider";
import { hasGoogleMapsKey, loadGoogleMaps } from "@/lib/google-maps";
import type { TripSegmentView, VisitView } from "@/lib/planning";

declare global {
  interface Window {
    gm_authFailure?: () => void;
  }
}

type Marker = {
  id: string;
  entityId: string;
  label: string;
  latitude: number;
  longitude: number;
  tone: "trip" | "visit";
  shape: "square" | "circle";
  color: string;
  glyph: string;
  order: number | null;
  sortValue: number | null;
};

type MapPanelProps = {
  tripSegments: TripSegmentView[];
  visits: VisitView[];
  title?: string;
  tall?: boolean;
  selectedEntityId?: string | null;
};

type GoogleBaseMap = "roadmap" | "satellite" | "hybrid";

const BOUNDS = {
  minLat: 30,
  maxLat: 47,
  minLng: -8,
  maxLng: 38,
};

const TRIP_SQUARE_PATH = "M -7 -7 L 7 -7 L 7 7 L -7 7 z";
const ZONE_RADIUS_METERS = 30000;

const toPoint = (latitude: number, longitude: number) => {
  const x =
    ((longitude - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * 100;
  const y =
    100 - ((latitude - BOUNDS.minLat) / (BOUNDS.maxLat - BOUNDS.minLat)) * 100;

  return { x, y };
};

const getTripMarkerMeta = (locationType: TripSegmentView["location_type"]) => {
  switch (locationType) {
    case "island":
      return { color: "#4f8f3a", glyph: "I" };
    case "city":
      return { color: "#355c7d", glyph: "C" };
    case "port":
      return { color: "#005f73", glyph: "P" };
    case "marina":
      return { color: "#0a9396", glyph: "M" };
    default:
      return { color: "#005f73", glyph: "" };
  }
};

const sortTripSegments = (tripSegments: TripSegmentView[]) =>
  [...tripSegments].sort(
    (a, b) =>
      a.start_date.localeCompare(b.start_date) ||
      a.end_date.localeCompare(b.end_date) ||
      (a.sort_order ?? 0) - (b.sort_order ?? 0),
  );

const buildSequenceBySegment = (tripSegments: TripSegmentView[]) => {
  const sequence = new Map<string, number>();

  sortTripSegments(tripSegments).forEach((segment, index) => {
    sequence.set(segment.id, index + 1);
  });

  return sequence;
};

const buildMarkers = (
  tripSegments: TripSegmentView[],
  visits: VisitView[],
  sequenceBySegment: Map<string, number>,
) => {
  const orderedSegments = sortTripSegments(tripSegments);

  const tripMarkers: Marker[] = orderedSegments
    .filter(
      (segment) =>
        segment.location_type !== "zone" &&
        typeof segment.latitude === "number" &&
        typeof segment.longitude === "number",
    )
    .map((segment, index) => {
      const meta = getTripMarkerMeta(segment.location_type);

      return {
        id: `trip-${segment.id}`,
        entityId: segment.id,
        label: segment.location_label,
        latitude: Number(segment.latitude),
        longitude: Number(segment.longitude),
        tone: "trip" as const,
        shape: "circle" as const,
        color: meta.color,
        glyph: meta.glyph,
        order: sequenceBySegment.get(segment.id) ?? index + 1,
        sortValue: segment.sort_order || (index + 1) * 10,
      };
    });

  const visitMarkers: Marker[] = visits.flatMap((visit) => {
    const markers: Marker[] = [];

    if (
      typeof visit.embark_latitude === "number" &&
      typeof visit.embark_longitude === "number"
    ) {
      markers.push({
        id: `visit-embark-${visit.id}`,
        entityId: visit.id,
        label: `${visit.visitor_name ?? "Visit"} embark`,
        latitude: Number(visit.embark_latitude),
        longitude: Number(visit.embark_longitude),
        tone: "visit",
        shape: "circle",
        color: "#e07a5f",
        glyph: "E",
        order: null,
        sortValue: null,
      });
    }

    if (
      typeof visit.disembark_latitude === "number" &&
      typeof visit.disembark_longitude === "number"
    ) {
      markers.push({
        id: `visit-disembark-${visit.id}`,
        entityId: visit.id,
        label: `${visit.visitor_name ?? "Visit"} disembark`,
        latitude: Number(visit.disembark_latitude),
        longitude: Number(visit.disembark_longitude),
        tone: "visit",
        shape: "circle",
        color: "#e07a5f",
        glyph: "D",
        order: null,
        sortValue: null,
      });
    }

    return markers;
  });

  return [...tripMarkers, ...visitMarkers];
};

const buildZones = (
  tripSegments: TripSegmentView[],
  sequenceBySegment: Map<string, number>,
) =>
  sortTripSegments(tripSegments)
    .filter(
      (segment) =>
        segment.location_type === "zone" &&
        typeof segment.latitude === "number" &&
        typeof segment.longitude === "number",
    )
    .map((segment, index) => ({
      id: `zone-${segment.id}`,
      entityId: segment.id,
      label: segment.location_label,
      latitude: Number(segment.latitude),
      longitude: Number(segment.longitude),
      order: sequenceBySegment.get(segment.id) ?? index + 1,
    }));

const buildRoutePoints = (tripSegments: TripSegmentView[]) =>
  sortTripSegments(tripSegments)
    .filter(
      (segment) =>
        typeof segment.latitude === "number" &&
        typeof segment.longitude === "number",
    )
    .map((segment) => ({
      lat: Number(segment.latitude),
      lng: Number(segment.longitude),
    }));

export const MapPanel = ({
  tripSegments,
  visits,
  title = "Map snapshot",
  tall = false,
  selectedEntityId = null,
}: MapPanelProps) => {
  const { t } = useI18n();
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [googleAvailable, setGoogleAvailable] = useState(hasGoogleMapsKey);
  const [mapMessage, setMapMessage] = useState(t("planning.loadingMap"));

  const [baseMap, setBaseMap] = useState<GoogleBaseMap>(() => {
    try {
      return (localStorage.getItem("map_baseMap") as GoogleBaseMap) ?? "roadmap";
    } catch {
      return "roadmap";
    }
  });
  const [showSeamarks, setShowSeamarks] = useState(() => {
    try {
      return localStorage.getItem("map_showSeamarks") === "true";
    } catch {
      return false;
    }
  });
  const [showRoute, setShowRoute] = useState(() => {
    try {
      return localStorage.getItem("map_showRoute") === "true";
    } catch {
      return false;
    }
  });
  const sequenceBySegment = useMemo(
    () => buildSequenceBySegment(tripSegments),
    [tripSegments],
  );
  const markers = useMemo(
    () => buildMarkers(tripSegments, visits, sequenceBySegment),
    [sequenceBySegment, tripSegments, visits],
  );
  const zones = useMemo(
    () => buildZones(tripSegments, sequenceBySegment),
    [sequenceBySegment, tripSegments],
  );
  const routePoints = useMemo(() => buildRoutePoints(tripSegments), [tripSegments]);

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
        setMapMessage(t("planning.googleBlocked"));
      }
    };

    void (async () => {
      const maps = await loadGoogleMaps();
      if (!maps || !mapRef.current || detached) {
        if (!detached) {
          setGoogleAvailable(false);
          setMapReady(false);
          setMapMessage(t("planning.googleUnavailable"));
        }
        return;
      }

      const primaryPoint = markers[0] ?? zones[0];
      const center = primaryPoint
        ? { lat: primaryPoint.latitude, lng: primaryPoint.longitude }
        : { lat: 37.9, lng: 18.0 };

      const map = new maps.maps.Map(mapRef.current, {
        center,
        zoom: markers.length + zones.length > 1 ? 5 : 6,
        mapTypeControl: false,
        mapTypeId: baseMap,
        streetViewControl: false,
        fullscreenControl: false,
        gestureHandling: "greedy",
      });

      if (showSeamarks) {
        map.overlayMapTypes.clear();
        map.overlayMapTypes.push(
          new maps.maps.ImageMapType({
            getTileUrl(coord, zoom) {
              return `https://tiles.openseamap.org/seamark/${zoom}/${coord.x}/${coord.y}.png`;
            },
            tileSize: new maps.maps.Size(256, 256),
            name: "OpenSeaMap",
            opacity: 0.8,
          }),
        );
      } else {
        map.overlayMapTypes.clear();
      }

      const bounds = new maps.maps.LatLngBounds();
      markers.forEach((marker) => {
        bounds.extend({ lat: marker.latitude, lng: marker.longitude });
      });
      zones.forEach((zone) => {
        bounds.extend({ lat: zone.latitude, lng: zone.longitude });
      });

      if (showRoute && routePoints.length > 1) {
        new maps.maps.Polyline({
          map,
          path: routePoints,
          geodesic: true,
          strokeColor: "#f4c542",
          strokeOpacity: 0.85,
          strokeWeight: 2,
        });
      }

      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, 48);
      }

      zones.forEach((zone) => {
        new maps.maps.Circle({
          map,
          center: { lat: zone.latitude, lng: zone.longitude },
          radius: ZONE_RADIUS_METERS,
          strokeColor: "#005f73",
          strokeOpacity: 0.85,
          strokeWeight: 2,
          fillColor: "#0a9396",
          fillOpacity: 0.12,
        });

        new maps.maps.Marker({
          map,
          position: { lat: zone.latitude, lng: zone.longitude },
          title: `${zone.label} ${t("planning.zone").toLowerCase()}`,
          label: {
            text: String(zone.order),
            color: "#ffffff",
            fontSize: "9px",
            fontWeight: "700",
          },
          icon: {
            path: TRIP_SQUARE_PATH,
            scale: 1,
            fillColor: "#005f73",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
        });
      });

      const selectedMarkers = markers.filter(
        (marker) => marker.entityId === selectedEntityId,
      );

      markers.forEach((marker) => {
        const selected = marker.entityId === selectedEntityId;
        new maps.maps.Marker({
          map,
          position: { lat: marker.latitude, lng: marker.longitude },
          title: marker.label,
          label: marker.glyph
            ? marker.tone === "trip" && marker.order
              ? {
                  text: String(marker.order),
                  color: "#ffffff",
                  fontSize: "9px",
                  fontWeight: "700",
                }
              : {
                  text: marker.glyph,
                  color: "#ffffff",
                  fontSize: "10px",
                  fontWeight: "700",
                }
            : marker.order
              ? {
                  text: String(marker.order),
                  color: "#ffffff",
                  fontSize: "9px",
                  fontWeight: "700",
                }
              : undefined,
          icon: {
            path:
              marker.shape === "square"
                ? TRIP_SQUARE_PATH
                : maps.maps.SymbolPath.CIRCLE,
            scale: selected ? 9 : 7,
            fillColor: marker.color,
            fillOpacity: 1,
            strokeColor: selected ? "#17211f" : "#ffffff",
            strokeWeight: selected ? 3 : 2,
          },
        });
      });

      if (selectedMarkers.length === 1) {
        map.panTo({
          lat: selectedMarkers[0].latitude,
          lng: selectedMarkers[0].longitude,
        });
        map.setZoom(7);
      } else if (selectedMarkers.length > 1) {
        const selectedBounds = new maps.maps.LatLngBounds();
        selectedMarkers.forEach((marker) => {
          selectedBounds.extend({ lat: marker.latitude, lng: marker.longitude });
        });
        map.fitBounds(selectedBounds, 96);
      }

      setGoogleAvailable(true);
      setMapReady(true);
    })();

    return () => {
      detached = true;
      window.gm_authFailure = previousAuthFailure;
    };
  }, [
    baseMap,
    markers,
    routePoints,
    selectedEntityId,
    showRoute,
    showSeamarks,
    t,
    zones,
  ]);

  return (
    <article className={`dashboard-card map-panel${tall ? " map-panel--tall" : ""}`}>
      <div className="card-header">
        <div>
          <p className="eyebrow">{t("planning.map")}</p>
          <h2>{title}</h2>
        </div>
      </div>

      <div className="map-toolbar">
        <label>
          <span>{t("planning.mapBase")}</span>
          <select
            onChange={(event) => {
              const value = event.target.value as GoogleBaseMap;
              setBaseMap(value);
              try { localStorage.setItem("map_baseMap", value); } catch { /* noop */ }
            }}
            value={baseMap}
          >
            <option value="roadmap">{t("planning.mapRoadmap")}</option>
            <option value="satellite">{t("planning.mapSatellite")}</option>
            <option value="hybrid">{t("planning.mapHybrid")}</option>
          </select>
        </label>
        <label className="checkbox-field">
          <input
            checked={showSeamarks}
            onChange={(event) => {
              const checked = event.target.checked;
              setShowSeamarks(checked);
              try { localStorage.setItem("map_showSeamarks", String(checked)); } catch { /* noop */ }
            }}
            type="checkbox"
          />
          <span>{t("planning.mapSeamarks")}</span>
        </label>
        <label className="checkbox-field">
          <input
            checked={showRoute}
            onChange={(event) => {
              const checked = event.target.checked;
              setShowRoute(checked);
              try { localStorage.setItem("map_showRoute", String(checked)); } catch { /* noop */ }
            }}
            type="checkbox"
          />
          <span>{t("planning.mapRoute")}</span>
        </label>
      </div>

      {hasGoogleMapsKey && googleAvailable ? (
        <div className="map-canvas map-canvas--google">
          <div className="map-google" ref={mapRef} />
          {!mapReady ? <div className="map-empty">{mapMessage}</div> : null}
        </div>
      ) : (
        <div className="map-canvas">
          <div className="map-canvas__grid" />
          {showRoute && routePoints.length > 1 ? (
            <svg
              aria-hidden="true"
              style={{
                inset: 0,
                pointerEvents: "none",
                position: "absolute",
                zIndex: 1,
              }}
              viewBox="0 0 100 100"
            >
              <polyline
                fill="none"
                points={routePoints
                  .map(({ lat, lng }) => {
                    const point = toPoint(lat, lng);
                    return `${point.x},${point.y}`;
                  })
                  .join(" ")}
                stroke="#f4c542"
                strokeDasharray="0"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity="0.85"
                strokeWidth="0.4"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          ) : null}
          {zones.map((zone) => {
            const point = toPoint(zone.latitude, zone.longitude);

            return (
              <div
                className={`map-zone${selectedEntityId === zone.entityId ? " is-selected" : ""}`}
                key={zone.id}
                style={{ left: `${point.x}%`, top: `${point.y}%` }}
                title={`${zone.label} ${t("planning.zone").toLowerCase()}`}
              >
                <strong>{zone.order}</strong>
                <span>{zone.label}</span>
              </div>
            );
          })}
          {markers.length || zones.length ? (
            markers.map((marker) => {
              const point = toPoint(marker.latitude, marker.longitude);

              return (
                <button
                  className={`map-marker is-${marker.tone} is-${marker.shape}${selectedEntityId === marker.entityId ? " is-selected" : ""}${marker.glyph === "I" ? " is-island" : ""}`}
                  key={marker.id}
                  style={{ left: `${point.x}%`, top: `${point.y}%`, background: marker.color }}
                  title={marker.label}
                  type="button"
                >
                  {marker.order ? (
                    <strong className="map-marker__order">{marker.order}</strong>
                  ) : null}
                  {marker.glyph && !marker.order ? (
                    <strong className="map-marker__glyph">{marker.glyph}</strong>
                  ) : null}
                  <span>{marker.label}</span>
                </button>
              );
            })
          ) : (
            <div className="map-empty">
              {t("planning.mapEmpty")}
            </div>
          )}
          <div className="map-caption">
            {hasGoogleMapsKey
              ? mapMessage
              : t("planning.mapCaptionFallback")}
          </div>
          <div className="map-legend">
            <span>
              <i className="map-legend__trip" />
              {t("planning.tripPoint")}
            </span>
            <span>
              <i className="map-legend__island" />
              {t("planning.island")}
            </span>
            <span>
              <i className="map-legend__visit" />
              {t("planning.visit")}
            </span>
            <span>
              <i className="map-legend__zone" />
              {t("planning.zone")}
            </span>
          </div>
        </div>
      )}
    </article>
  );
};
