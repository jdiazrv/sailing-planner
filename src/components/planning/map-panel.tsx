"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useI18n } from "@/components/i18n/provider";
import { hasGoogleMapsKey, loadGoogleMaps } from "@/lib/google-maps";
import { recordApiUsage } from "@/lib/api-usage";
import {
  loadGreekCoastalZoneGeometryLazy,
  matchGreekCoastalZoneLazy,
  type CoastalZoneMatch,
  type CoastalZoneGeometry,
} from "@/lib/coastal-zones-runtime";
import type { PortStopView, VisitView } from "@/lib/planning";

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
  coastalZone: CoastalZoneMatch | null;
};

type MapSelection = {
  entityId: string;
  tone: "trip" | "visit";
};

type MapPanelProps = {
  tripSegments: PortStopView[];
  visits: VisitView[];
  title?: string;
  tall?: boolean;
  selectedEntityId?: string | null;
  dataTour?: string;
  deemphasized?: boolean;
  onSelectEntity?: (selection: MapSelection) => void;
};

type GoogleBaseMap = "roadmap" | "satellite" | "hybrid";

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

const toCoordinate = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const getZonePolygons = (geometry: CoastalZoneGeometry) =>
  geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;

const toSvgPath = (rings: number[][][]) =>
  rings
    .map((ring) =>
      ring
        .map(([lng, lat], index) => {
          const point = toPoint(lat, lng);
          return `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`;
        })
        .join(" ") + " Z",
    )
    .join(" ");

const getTripMarkerMeta = (locationType: PortStopView["location_type"]) => {
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

const sortTripSegments = (tripSegments: PortStopView[]) =>
  [...tripSegments].sort(
    (a, b) =>
      a.start_date.localeCompare(b.start_date) ||
      a.end_date.localeCompare(b.end_date) ||
      (a.sort_order ?? 0) - (b.sort_order ?? 0),
  );

const buildSequenceBySegment = (tripSegments: PortStopView[]) => {
  const sequence = new Map<string, number>();

  sortTripSegments(tripSegments).forEach((segment, index) => {
    sequence.set(segment.id, index + 1);
  });

  return sequence;
};

const buildMarkers = (
  tripSegments: PortStopView[],
  visits: VisitView[],
  sequenceBySegment: Map<string, number>,
  coastalZoneBySegmentId: Map<string, CoastalZoneMatch | null>,
  coastalZoneByVisitKey: Map<string, CoastalZoneMatch | null>,
) => {
  const orderedSegments = sortTripSegments(tripSegments);

  const tripMarkers: Marker[] = orderedSegments.flatMap((segment, index) => {
    const latitude = toCoordinate(segment.latitude);
    const longitude = toCoordinate(segment.longitude);
    if (latitude == null || longitude == null) {
      return [];
    }

    const coastalMatch = coastalZoneBySegmentId.get(segment.id);
    const markerLocationType =
      segment.location_type === "zone" &&
      (coastalMatch?.kind === "island" || coastalMatch?.kind === "islet")
        ? "island"
        : segment.location_type;
    const meta = getTripMarkerMeta(markerLocationType);

    return [{
      id: `trip-${segment.id}`,
      entityId: segment.id,
      label: segment.location_label,
      latitude,
      longitude,
      tone: "trip",
      shape: "circle",
      color: meta.color,
      glyph: meta.glyph,
      order: sequenceBySegment.get(segment.id) ?? index + 1,
      sortValue: segment.sort_order || (index + 1) * 10,
      coastalZone: coastalMatch ?? null,
    }];
  });

  const visitMarkers: Marker[] = visits.flatMap((visit) => {
    const markers: Marker[] = [];

    const embarkLatitude = toCoordinate(visit.embark_latitude);
    const embarkLongitude = toCoordinate(visit.embark_longitude);
    if (embarkLatitude != null && embarkLongitude != null) {
      markers.push({
        id: `visit-embark-${visit.id}`,
        entityId: visit.id,
        label: `${visit.visitor_name ?? "Visit"} embark`,
        latitude: embarkLatitude,
        longitude: embarkLongitude,
        tone: "visit",
        shape: "circle",
        color: "#e07a5f",
        glyph: "E",
        order: null,
        sortValue: null,
        coastalZone: coastalZoneByVisitKey.get(`visit-embark-${visit.id}`) ?? null,
      });
    }

    const disembarkLatitude = toCoordinate(visit.disembark_latitude);
    const disembarkLongitude = toCoordinate(visit.disembark_longitude);
    if (disembarkLatitude != null && disembarkLongitude != null) {
      markers.push({
        id: `visit-disembark-${visit.id}`,
        entityId: visit.id,
        label: `${visit.visitor_name ?? "Visit"} disembark`,
        latitude: disembarkLatitude,
        longitude: disembarkLongitude,
        tone: "visit",
        shape: "circle",
        color: "#e07a5f",
        glyph: "D",
        order: null,
        sortValue: null,
        coastalZone: coastalZoneByVisitKey.get(`visit-disembark-${visit.id}`) ?? null,
      });
    }

    return markers;
  });

  return [...tripMarkers, ...visitMarkers];
};

const buildRoutePoints = (tripSegments: PortStopView[]) =>
  sortTripSegments(tripSegments)
    .map((segment) => {
      const latitude = toCoordinate(segment.latitude);
      const longitude = toCoordinate(segment.longitude);
      if (latitude == null || longitude == null) {
        return null;
      }

      return {
        lat: latitude,
        lng: longitude,
      };
    })
    .filter((point): point is { lat: number; lng: number } => Boolean(point));

export const MapPanel = ({
  tripSegments,
  visits,
  title = "Map snapshot",
  tall = false,
  selectedEntityId = null,
  dataTour,
  deemphasized = false,
  onSelectEntity,
}: MapPanelProps) => {
  const { t } = useI18n();
  const mapRef = useRef<HTMLDivElement | null>(null);
  const onSelectEntityRef = useRef(onSelectEntity);
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
  const [coastalZoneBySegmentId, setCoastalZoneBySegmentId] = useState(
    () => new Map<string, CoastalZoneMatch | null>(),
  );
  const [coastalZoneByVisitKey, setCoastalZoneByVisitKey] = useState(
    () => new Map<string, CoastalZoneMatch | null>(),
  );
  const markers = useMemo(
    () => buildMarkers(
      tripSegments,
      visits,
      sequenceBySegment,
      coastalZoneBySegmentId,
      coastalZoneByVisitKey,
    ),
    [coastalZoneBySegmentId, coastalZoneByVisitKey, sequenceBySegment, tripSegments, visits],
  );
  const routePoints = useMemo(() => buildRoutePoints(tripSegments), [tripSegments]);
  const hasSelection = Boolean(selectedEntityId);
  const selectedCoastalZone = useMemo(() => {
    const selectedMarker = markers.find((marker) => marker.entityId === selectedEntityId);
    return selectedMarker?.coastalZone ?? null;
  }, [markers, selectedEntityId]);
  const [selectedCoastalGeometry, setSelectedCoastalGeometry] =
    useState<CoastalZoneGeometry | null>(null);
  const selectedCoastalZonePolygons = useMemo(
    () => (selectedCoastalGeometry ? getZonePolygons(selectedCoastalGeometry) : []),
    [selectedCoastalGeometry],
  );

  useEffect(() => {
    let cancelled = false;

    const hasLocations = tripSegments.length > 0 || visits.length > 0;
    if (!hasLocations) {
      setCoastalZoneBySegmentId(new Map());
      setCoastalZoneByVisitKey(new Map());
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      const segmentEntries = await Promise.all(
        tripSegments.map(async (segment) => [
          segment.id,
          await matchGreekCoastalZoneLazy(segment.location_label),
        ] as const),
      );
      const visitEntries = await Promise.all(
        visits.flatMap((visit) => [
          (async () => [
            `visit-embark-${visit.id}`,
            await matchGreekCoastalZoneLazy(visit.embark_place_label),
          ] as const)(),
          (async () => [
            `visit-disembark-${visit.id}`,
            await matchGreekCoastalZoneLazy(visit.disembark_place_label),
          ] as const)(),
        ]),
      );

      if (cancelled) {
        return;
      }

      setCoastalZoneBySegmentId(new Map(segmentEntries));
      setCoastalZoneByVisitKey(new Map(visitEntries));
    })().catch(() => {
      if (cancelled) {
        return;
      }

      setCoastalZoneBySegmentId(new Map());
      setCoastalZoneByVisitKey(new Map());
    });

    return () => {
      cancelled = true;
    };
  }, [tripSegments, visits]);

  useEffect(() => {
    onSelectEntityRef.current = onSelectEntity;
  }, [onSelectEntity]);

  useEffect(() => {
    let cancelled = false;

    if (!selectedCoastalZone) {
      setSelectedCoastalGeometry(null);
      return () => {
        cancelled = true;
      };
    }

    void loadGreekCoastalZoneGeometryLazy(selectedCoastalZone)
      .then((geometry) => {
        if (!cancelled) {
          setSelectedCoastalGeometry(geometry);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSelectedCoastalGeometry(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedCoastalZone]);

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

      const primaryPoint = markers[0];
      const center = primaryPoint
        ? { lat: primaryPoint.latitude, lng: primaryPoint.longitude }
        : { lat: 37.9, lng: 18.0 };

      const map = new maps.maps.Map(mapRef.current, {
        center,
        zoom: markers.length > 1 ? 5 : 6,
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

      if (showRoute && routePoints.length > 1) {
        new maps.maps.Polyline({
          map,
          path: routePoints,
          geodesic: true,
          strokeColor: baseMap === "roadmap" ? "#7a5a00" : "#7c5b0a",
          strokeOpacity: hasSelection ? 0.24 : 0.72,
          strokeWeight: baseMap === "roadmap" ? 5 : 4,
        });

        new maps.maps.Polyline({
          map,
          path: routePoints,
          geodesic: true,
          strokeColor: baseMap === "roadmap" ? "#f0b90b" : "#f4c542",
          strokeOpacity: hasSelection ? 0.78 : 0.98,
          strokeWeight: baseMap === "roadmap" ? 2.8 : hasSelection ? 2.2 : 2.6,
        });
      }

      if (selectedCoastalGeometry) {
        getZonePolygons(selectedCoastalGeometry).forEach((polygon) => {
          new maps.maps.Polygon({
            map,
            paths: polygon.map((ring) =>
              ring.map(([lng, lat]) => ({
                lat,
                lng,
              })),
            ),
            strokeColor: "#0a9396",
            strokeOpacity: 0.95,
            strokeWeight: 3,
            fillColor: "#0a9396",
            fillOpacity: baseMap === "roadmap" ? 0.14 : 0.1,
          });
        });
      }

      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, 48);
      }

      const selectedMarkers = markers.filter(
        (marker) => marker.entityId === selectedEntityId,
      );

      markers.forEach((marker) => {
        const selected = marker.entityId === selectedEntityId;
        const markerView = new maps.maps.Marker({
          clickable: Boolean(onSelectEntityRef.current),
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
            path: maps.maps.SymbolPath.CIRCLE,
            scale: selected ? 9 : hasSelection ? 5.8 : 7,
            fillColor: marker.color,
            fillOpacity: selected ? 1 : hasSelection ? 0.38 : 1,
            strokeColor: selected ? "#17211f" : "#ffffff",
            strokeWeight: selected ? 3 : 2,
          },
        });

        if (onSelectEntityRef.current) {
          markerView.addListener("click", () => {
            onSelectEntityRef.current?.({
              entityId: marker.entityId,
              tone: marker.tone,
            });
          });
        }
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
      setMapMessage(t("planning.mapReady"));
      // Record one Dynamic Maps load event for billing tracking.
      void recordApiUsage("google_maps", "dynamic_maps");
    })();

    return () => {
      detached = true;
      window.gm_authFailure = previousAuthFailure;
    };
  }, [
    baseMap,
    hasSelection,
    markers,
    routePoints,
    selectedCoastalGeometry,
    selectedCoastalZone,
    selectedEntityId,
    showRoute,
    showSeamarks,
    t,
  ]);

  return (
    <article
      className={`dashboard-card map-panel${tall ? " map-panel--tall" : ""}`}
      data-tour={dataTour}
      data-map-emphasis={deemphasized ? "muted" : "active"}
    >
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
        <div className={`map-canvas${hasSelection ? " has-selection" : ""}`}>
          <div className="map-canvas__grid" />
          {selectedCoastalZonePolygons.length ? (
            <svg
              aria-hidden="true"
              className="map-coastal-zone"
              style={{
                inset: 0,
                pointerEvents: "none",
                position: "absolute",
                zIndex: 0,
              }}
              viewBox="0 0 100 100"
            >
              {selectedCoastalZonePolygons.map((polygon, index) => (
                <path
                  d={toSvgPath(polygon)}
                  fill="rgba(10, 147, 150, 0.14)"
                  fillRule="evenodd"
                  key={`${selectedCoastalZone?.id ?? "zone"}-${index}`}
                  stroke="#0a9396"
                  strokeLinejoin="round"
                  strokeOpacity="0.96"
                  strokeWidth="0.55"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>
          ) : null}
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
                stroke="#7a5a00"
                strokeDasharray="0"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity="0.6"
                strokeWidth="0.82"
                vectorEffect="non-scaling-stroke"
              />
              <polyline
                fill="none"
                points={routePoints
                  .map(({ lat, lng }) => {
                    const point = toPoint(lat, lng);
                    return `${point.x},${point.y}`;
                  })
                  .join(" ")}
                stroke="#f0b90b"
                strokeDasharray="0"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity="0.98"
                strokeWidth="0.44"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          ) : null}
          {markers.length ? (
            markers.map((marker) => {
              const point = toPoint(marker.latitude, marker.longitude);

              return (
                <button
                  className={`map-marker is-${marker.tone} is-${marker.shape}${selectedEntityId === marker.entityId ? " is-selected" : ""}${marker.glyph === "I" ? " is-island" : ""}`}
                  key={marker.id}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectEntityRef.current?.({
                      entityId: marker.entityId,
                      tone: marker.tone,
                    });
                  }}
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
