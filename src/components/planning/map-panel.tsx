"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useI18n } from "@/components/i18n/provider";
import { hasGoogleMapsKey, loadGoogleMaps, type GoogleMapsRuntime } from "@/lib/google-maps";
import { recordApiUsage } from "@/lib/api-usage";
import {
  loadGreekCoastalZoneGeometryLazy,
  matchGreekCoastalZoneLazy,
  type CoastalZoneMatch,
  type CoastalZoneGeometry,
} from "@/lib/coastal-zones-runtime";
import {
  formatShortDate,
  getVisitDisplayName,
  hasVisitDateRange,
  sortTripSegmentsBySchedule,
  type PortStopView,
  type VisitView,
} from "@/lib/planning";

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

type StopTooltipData = {
  variant: "stop";
  title: string;
  dateRange: string;
  visits: Array<{
    id: string;
    name: string;
    dateRange: string;
  }>;
};

type VisitTooltipData = {
  variant: "visit";
  title: string;
  subtitle?: string | null;
  lines: string[];
  note?: string | null;
};

type MapTooltipData = StopTooltipData | VisitTooltipData;

type GoogleMarkerHandle = {
  detach: () => void;
};

type MapPanelProps = {
  tripSegments: PortStopView[];
  visits: VisitView[];
  title?: string;
  eyebrow?: string | null;
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

const buildSequenceBySegment = (tripSegments: PortStopView[]) => {
  const sequence = new Map<string, number>();

  sortTripSegmentsBySchedule(tripSegments).forEach((segment, index) => {
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
  const orderedSegments = sortTripSegmentsBySchedule(tripSegments);

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
        label: `${getVisitDisplayName(visit, "Visit")} embark`,
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
        label: `${getVisitDisplayName(visit, "Visit")} disembark`,
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
  sortTripSegmentsBySchedule(tripSegments)
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

const buildMarkerTooltip = (
  marker: Marker,
  tripSegmentsById: Map<string, PortStopView>,
  visitsById: Map<string, VisitView>,
  visits: VisitView[],
  t: ReturnType<typeof useI18n>["t"],
) => {
  if (marker.tone === "trip") {
    const segment = tripSegmentsById.get(marker.entityId);
    if (!segment) {
      return {
        variant: "visit",
        title: marker.label,
        lines: [],
      } satisfies VisitTooltipData;
    }

    return {
      variant: "stop",
      title: segment.location_label,
      dateRange: `${formatShortDate(segment.start_date)} – ${formatShortDate(segment.end_date)}`,
      visits: visits.flatMap((visit) => {
        if (
          !hasVisitDateRange(visit) ||
          visit.embark_date > segment.end_date ||
          visit.disembark_date < segment.start_date
        ) {
          return [];
        }

        return [{
          id: visit.id,
          name: getVisitDisplayName(visit, t("planning.visit")),
          dateRange: `${formatShortDate(visit.embark_date)} – ${formatShortDate(visit.disembark_date)}`,
        }];
      }),
    } satisfies StopTooltipData;
  }

  const visit = visitsById.get(marker.entityId);
  if (!visit) {
    return {
      variant: "visit",
      title: marker.label,
      lines: [],
    } satisfies VisitTooltipData;
  }

  const embarkLabel = t("planning.embarkPlace");
  const disembarkLabel = t("planning.disembarkPlace");
  const markerRole = marker.id.startsWith("visit-embark-")
    ? t("planning.embarkPoint")
    : marker.id.startsWith("visit-disembark-")
      ? t("planning.disembarkPoint")
      : null;
  const embarkLine =
    visit.embark_date && visit.embark_place_label
      ? `${embarkLabel}: ${visit.embark_place_label} · ${formatShortDate(visit.embark_date)}`
      : visit.embark_place_label
        ? `${embarkLabel}: ${visit.embark_place_label}`
        : visit.embark_date
          ? `${embarkLabel}: ${formatShortDate(visit.embark_date)}`
          : "";
  const disembarkLine =
    visit.disembark_date && visit.disembark_place_label
      ? `${disembarkLabel}: ${visit.disembark_place_label} · ${formatShortDate(visit.disembark_date)}`
      : visit.disembark_place_label
        ? `${disembarkLabel}: ${visit.disembark_place_label}`
        : visit.disembark_date
          ? `${disembarkLabel}: ${formatShortDate(visit.disembark_date)}`
          : "";

  return {
    variant: "visit",
    title: getVisitDisplayName(visit, t("planning.visit")),
    subtitle: markerRole ?? t(`status.${visit.status}` as never),
    lines: [embarkLine, disembarkLine].filter(Boolean),
    note: visit.public_notes ?? null,
  } satisfies VisitTooltipData;
};

const createTooltipContent = (tooltip: MapTooltipData) => {
  const wrapper = document.createElement("div");
  wrapper.className = `map-tooltip-card map-tooltip-card--${tooltip.variant}`;

  const title = document.createElement("strong");
  title.className = "map-tooltip-card__title";
  title.textContent = tooltip.title;
  wrapper.appendChild(title);

  if (tooltip.variant === "stop") {
    const dateRange = document.createElement("div");
    dateRange.className = "map-tooltip-card__date";
    dateRange.textContent = tooltip.dateRange;
    wrapper.appendChild(dateRange);

    if (tooltip.visits.length) {
      const visitsList = document.createElement("div");
      visitsList.className = "map-tooltip-card__visits";
      tooltip.visits.forEach((visit) => {
        const visitItem = document.createElement("div");
        visitItem.className = "map-tooltip-card__visit";

        const visitName = document.createElement("strong");
        visitName.className = "map-tooltip-card__visit-name";
        visitName.textContent = visit.name;
        visitItem.appendChild(visitName);

        const visitDates = document.createElement("div");
        visitDates.className = "map-tooltip-card__visit-dates";
        visitDates.textContent = visit.dateRange;
        visitItem.appendChild(visitDates);

        visitsList.appendChild(visitItem);
      });
      wrapper.appendChild(visitsList);
    }

    return wrapper;
  }

  if (tooltip.subtitle) {
    const subtitle = document.createElement("div");
    subtitle.className = "map-tooltip-card__subtitle";
    subtitle.textContent = tooltip.subtitle;
    wrapper.appendChild(subtitle);
  }

  tooltip.lines.forEach((line) => {
    const row = document.createElement("div");
    row.className = "map-tooltip-card__line";
    row.textContent = line;
    wrapper.appendChild(row);
  });

  if (tooltip.note) {
    const note = document.createElement("div");
    note.className = "map-tooltip-card__note";
    note.textContent = tooltip.note;
    wrapper.appendChild(note);
  }

  return wrapper;
};

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
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  // Refs for the Google Maps instances — kept stable across re-renders for imperative updates.
  const mapsApiRef = useRef<GoogleMapsRuntime | null>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const googleMarkersRef = useRef<GoogleMarkerHandle[]>([]);
  const routePolylinesRef = useRef<google.maps.Polyline[]>([]);
  const coastalPolygonsRef = useRef<google.maps.Polygon[]>([]);
  const tRef = useRef(t);
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
  const tripSegmentsById = useMemo(
    () => new Map(tripSegments.map((segment) => [segment.id, segment])),
    [tripSegments],
  );
  const visitsById = useMemo(
    () => new Map(visits.map((visit) => [visit.id, visit])),
    [visits],
  );
  const markerTooltips = useMemo(
    () =>
      new Map(
        markers.map((marker) => [
          marker.id,
          buildMarkerTooltip(marker, tripSegmentsById, visitsById, visits, t),
        ]),
      ),
    [markers, t, tripSegmentsById, visits, visitsById],
  );
  const [fallbackTooltip, setFallbackTooltip] = useState<{
    x: number;
    y: number;
    data: MapTooltipData;
  } | null>(null);
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

  const teardownGoogleMap = () => {
    googleMarkersRef.current.forEach((markerView) => {
      markerView.detach();
    });
    googleMarkersRef.current = [];

    routePolylinesRef.current.forEach((polyline) => polyline.setMap(null));
    routePolylinesRef.current = [];

    coastalPolygonsRef.current.forEach((polygon) => polygon.setMap(null));
    coastalPolygonsRef.current = [];

    infoWindowRef.current?.close();

    googleMapRef.current = null;
    mapsApiRef.current = null;

    if (mapRef.current) {
      mapRef.current.replaceChildren();
    }
  };

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
    tRef.current = t;
  }, [t]);

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

  // Effect: Initialise the Google Map ONCE per mount — records exactly one billable API call.
  useEffect(() => {
    if (!hasGoogleMapsKey || !mapRef.current) {
      teardownGoogleMap();
      setGoogleAvailable(false);
      return;
    }

    let detached = false;
    const previousAuthFailure = window.gm_authFailure;

    window.gm_authFailure = () => {
      if (!detached) {
        teardownGoogleMap();
        setGoogleAvailable(false);
        setMapReady(false);
        setMapMessage(tRef.current("planning.googleBlocked"));
      }
    };

    void (async () => {
      const runtime = await loadGoogleMaps();
      if (!runtime || !mapRef.current || detached) {
        if (!detached) {
          teardownGoogleMap();
          setGoogleAvailable(false);
          setMapReady(false);
          setMapMessage(tRef.current("planning.googleUnavailable"));
        }
        return;
      }

      const map = new runtime.maps.Map(mapRef.current, {
        center: { lat: 37.9, lng: 18.0 },
        zoom: 6,
        mapTypeControl: false,
        mapTypeId: baseMap,
        ...(runtime.mapId ? { mapId: runtime.mapId } : {}),
        streetViewControl: false,
        fullscreenControl: false,
        gestureHandling: "greedy",
      });

      mapsApiRef.current = runtime;
      googleMapRef.current = map;
      infoWindowRef.current = new runtime.maps.InfoWindow();

      setGoogleAvailable(true);
      setMapReady(true);
      setMapMessage(tRef.current("planning.mapReady"));
      // One Dynamic Maps load per mount — the only billable call in this file.
      void recordApiUsage("google_maps", "dynamic_maps");
    })();

    return () => {
      detached = true;
      teardownGoogleMap();
      window.gm_authFailure = previousAuthFailure;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Map is created once. Initial baseMap is captured from state at mount time.

  // Effect: Update map type and seamarks imperatively — no new Map instance created.
  useEffect(() => {
    const map = googleMapRef.current;
    const runtime = mapsApiRef.current;
    if (!map || !runtime || !mapReady) return;

    map.setMapTypeId(baseMap);
    map.overlayMapTypes.clear();
  }, [baseMap, mapReady]);

  // Effect: Keep the local coastal GeoJSON highlight in sync with the current selection.
  useEffect(() => {
    const map = googleMapRef.current;
    const runtime = mapsApiRef.current;
    if (!map || !runtime || !mapReady) return;
    const maps = runtime.maps;

    coastalPolygonsRef.current.forEach((polygon) => polygon.setMap(null));
    coastalPolygonsRef.current = [];

    if (!selectedCoastalGeometry) {
      return;
    }

    getZonePolygons(selectedCoastalGeometry).forEach((polygon) => {
      coastalPolygonsRef.current.push(
        new maps.Polygon({
          map,
          paths: polygon.map((ring) =>
            ring.map(([lng, lat]) => ({ lat, lng })),
          ),
          strokeColor: "#0a9396",
          strokeOpacity: 0.95,
          strokeWeight: 3,
          fillColor: "#0a9396",
          fillOpacity: baseMap === "roadmap" ? 0.14 : 0.1,
        }),
      );
    });
  }, [baseMap, mapReady, selectedCoastalGeometry]);

  // Effect: Update markers and route polylines imperatively.
  useEffect(() => {
    const map = googleMapRef.current;
    const runtime = mapsApiRef.current;
    if (!map || !runtime || !mapReady) return;
    const maps = runtime.maps;
    const markerLibrary = runtime.marker;
    const useAdvancedMarkers = Boolean(runtime.mapId && markerLibrary?.AdvancedMarkerElement);

    // Clear previous overlays.
    googleMarkersRef.current.forEach((markerView) => {
      markerView.detach();
    });
    googleMarkersRef.current = [];
    routePolylinesRef.current.forEach((p) => p.setMap(null));
    routePolylinesRef.current = [];

    // Route polylines.
    if (showRoute && routePoints.length > 1) {
      const backLine = new maps.Polyline({
        map,
        path: routePoints,
        geodesic: true,
        strokeColor: baseMap === "roadmap" ? "#7a5a00" : "#7c5b0a",
        strokeOpacity: hasSelection ? 0.24 : 0.72,
        strokeWeight: baseMap === "roadmap" ? 5 : 4,
      });
      const frontLine = new maps.Polyline({
        map,
        path: routePoints,
        geodesic: true,
        strokeColor: baseMap === "roadmap" ? "#f0b90b" : "#f4c542",
        strokeOpacity: hasSelection ? 0.78 : 0.98,
        strokeWeight: baseMap === "roadmap" ? 2.8 : hasSelection ? 2.2 : 2.6,
      });
      routePolylinesRef.current.push(backLine, frontLine);
    }

    // Build bounds and markers.
    const bounds = new maps.LatLngBounds();
    markers.forEach((marker) => {
      bounds.extend({ lat: marker.latitude, lng: marker.longitude });
    });

    const selectedMarkers = markers.filter(
      (marker) => marker.entityId === selectedEntityId,
    );

    const createMarkerContent = (marker: Marker, selected: boolean) => {
      const element = document.createElement("div");
      const size = selected ? 18 : 14;
      const strokeWidth = selected ? 3 : 2;

      element.style.width = `${size}px`;
      element.style.height = `${size}px`;
      element.style.borderRadius = "999px";
      element.style.background = marker.color;
      element.style.border = `${strokeWidth}px solid ${selected ? "#17211f" : "#ffffff"}`;
      element.style.boxSizing = "border-box";
      element.style.display = "flex";
      element.style.alignItems = "center";
      element.style.justifyContent = "center";
      element.style.color = "#ffffff";
      element.style.fontSize = marker.order ? "9px" : "10px";
      element.style.fontWeight = "700";
      element.style.opacity = selected ? "1" : hasSelection ? "0.38" : "1";
      element.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.22)";
      element.textContent = marker.order ? String(marker.order) : marker.glyph;

      return element;
    };

    markers.forEach((marker) => {
      const selected = marker.entityId === selectedEntityId;
      const tooltip = markerTooltips.get(marker.id) ?? {
        variant: "visit",
        title: marker.label,
        lines: [],
      };
      if (useAdvancedMarkers && markerLibrary) {
        const markerContent = createMarkerContent(marker, selected);
        const markerView = new markerLibrary.AdvancedMarkerElement({
          content: markerContent,
          gmpClickable: Boolean(onSelectEntityRef.current),
          map,
          position: { lat: marker.latitude, lng: marker.longitude },
          title: marker.label,
        });
        const openInfo = () => {
          infoWindowRef.current?.setContent(createTooltipContent(tooltip));
          infoWindowRef.current?.open({
            anchor: markerView,
            map,
            shouldFocus: false,
          });
        };
        const closeInfo = () => infoWindowRef.current?.close();
        markerContent.addEventListener("mouseenter", openInfo);
        markerContent.addEventListener("mouseleave", closeInfo);

        const clickListener = onSelectEntityRef.current
          ? markerView.addListener("click", () => {
              openInfo();
              onSelectEntityRef.current?.({
                entityId: marker.entityId,
                tone: marker.tone,
              });
            })
          : null;

        googleMarkersRef.current.push({
          detach: () => {
            clickListener?.remove();
            markerContent.removeEventListener("mouseenter", openInfo);
            markerContent.removeEventListener("mouseleave", closeInfo);
            markerView.map = null;
          },
        });
        return;
      }

      const markerView = new maps.Marker({
        icon: {
          fillColor: marker.color,
          fillOpacity: selected ? 1 : hasSelection ? 0.38 : 1,
          path: maps.SymbolPath.CIRCLE,
          scale: selected ? 9 : 7,
          strokeColor: selected ? "#17211f" : "#ffffff",
          strokeOpacity: 1,
          strokeWeight: selected ? 3 : 2,
        },
        label: marker.order
          ? {
              color: "#ffffff",
              fontSize: "9px",
              fontWeight: "700",
              text: String(marker.order),
            }
          : marker.glyph
            ? {
                color: "#ffffff",
                fontSize: "10px",
                fontWeight: "700",
                text: marker.glyph,
              }
            : undefined,
        map,
        opacity: selected ? 1 : hasSelection ? 0.38 : 1,
        position: { lat: marker.latitude, lng: marker.longitude },
        title: marker.label,
        zIndex: selected ? 2 : 1,
      });

      const clickListener = onSelectEntityRef.current
        ? markerView.addListener("click", () => {
            infoWindowRef.current?.setContent(createTooltipContent(tooltip));
            infoWindowRef.current?.open({
              anchor: markerView,
              map,
              shouldFocus: false,
            });
            onSelectEntityRef.current?.({
              entityId: marker.entityId,
              tone: marker.tone,
            });
          })
        : null;
      const mouseOverListener = markerView.addListener("mouseover", () => {
        infoWindowRef.current?.setContent(createTooltipContent(tooltip));
        infoWindowRef.current?.open({
          anchor: markerView,
          map,
          shouldFocus: false,
        });
      });
      const mouseOutListener = markerView.addListener("mouseout", () => {
        infoWindowRef.current?.close();
      });

      googleMarkersRef.current.push({
        detach: () => {
          clickListener?.remove();
          mouseOverListener.remove();
          mouseOutListener.remove();
          markerView.setMap(null);
        },
      });
    });

    // Pan to selection, or fit all markers into view.
    if (selectedMarkers.length === 1) {
      map.panTo({
        lat: selectedMarkers[0].latitude,
        lng: selectedMarkers[0].longitude,
      });
      map.setZoom(7);
    } else if (selectedMarkers.length > 1) {
      const selectedBounds = new maps.LatLngBounds();
      selectedMarkers.forEach((marker) => {
        selectedBounds.extend({ lat: marker.latitude, lng: marker.longitude });
      });
      map.fitBounds(selectedBounds, 96);
    } else if (!bounds.isEmpty()) {
      map.fitBounds(bounds, 48);
    }
  }, [baseMap, hasSelection, mapReady, markers, markerTooltips, routePoints, selectedEntityId, showRoute]);

  return (
    <article
      className={`dashboard-card map-panel${tall ? " map-panel--tall" : ""}`}
      data-tour={dataTour}
      data-map-emphasis={deemphasized ? "muted" : "active"}
    >
      <div className="card-header">
        <div>
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
          <div
            aria-hidden={!mapReady}
            className="map-google"
            data-ready={mapReady ? "true" : "false"}
            ref={mapRef}
          />
          {!mapReady ? <div className="map-empty">{mapMessage}</div> : null}
        </div>
      ) : (
        <div
          className={`map-canvas${hasSelection ? " has-selection" : ""}`}
          onClick={() => setFallbackTooltip(null)}
        >
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
              className="map-route-layer"
              style={{
                inset: 0,
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
              const tooltip = markerTooltips.get(marker.id);

              return (
                <button
                  className={`map-marker is-${marker.tone} is-${marker.shape}${selectedEntityId === marker.entityId ? " is-selected" : ""}${marker.glyph === "I" ? " is-island" : ""}`}
                  key={marker.id}
                  onClick={(event) => {
                    event.stopPropagation();
                    setFallbackTooltip({
                      x: point.x,
                      y: point.y,
                      data: tooltip ?? {
                        variant: "visit",
                        title: marker.label,
                        lines: [],
                      },
                    });
                    onSelectEntityRef.current?.({
                      entityId: marker.entityId,
                      tone: marker.tone,
                    });
                  }}
                  style={{ left: `${point.x}%`, top: `${point.y}%`, background: marker.color }}
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
          {fallbackTooltip ? (
            <div
              className={`map-tooltip-overlay map-tooltip-overlay--${fallbackTooltip.data.variant}`}
              style={{ left: `${fallbackTooltip.x}%`, top: `${fallbackTooltip.y}%` }}
            >
              {fallbackTooltip.data.variant === "stop" ? (
                <div className="map-tooltip-card map-tooltip-card--stop">
                  <strong className="map-tooltip-card__title">{fallbackTooltip.data.title}</strong>
                  <div className="map-tooltip-card__date">{fallbackTooltip.data.dateRange}</div>
                  {fallbackTooltip.data.visits.length ? (
                    <div className="map-tooltip-card__visits">
                      {fallbackTooltip.data.visits.map((visit) => (
                        <div className="map-tooltip-card__visit" key={visit.id}>
                          <strong className="map-tooltip-card__visit-name">{visit.name}</strong>
                          <div className="map-tooltip-card__visit-dates">{visit.dateRange}</div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="map-tooltip-card map-tooltip-card--visit">
                  <strong className="map-tooltip-card__title">{fallbackTooltip.data.title}</strong>
                  {fallbackTooltip.data.subtitle ? (
                    <div className="map-tooltip-card__subtitle">{fallbackTooltip.data.subtitle}</div>
                  ) : null}
                  {fallbackTooltip.data.lines.map((line) => (
                    <div className="map-tooltip-card__line" key={line}>{line}</div>
                  ))}
                  {fallbackTooltip.data.note ? (
                    <div className="map-tooltip-card__note">{fallbackTooltip.data.note}</div>
                  ) : null}
                </div>
              )}
            </div>
          ) : null}
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
