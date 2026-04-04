import greeceCoastalZonesGeoJson from "@/lib/data/greece-coastal-zones.json";

import type { CoastalZoneGeometry, CoastalZoneMatch } from "@/lib/coastal-zones";

export type { CoastalZoneGeometry, CoastalZoneMatch } from "@/lib/coastal-zones";

type LegacyCoastalZoneProperties = {
  id: string;
  name: string;
  kind: "macro_zone" | "island" | "coast";
  country: string;
  aliases: string[];
};

type LegacyCoastalZoneFeature = {
  type: "Feature";
  properties: LegacyCoastalZoneProperties;
  geometry: CoastalZoneGeometry;
};

type LegacyCoastalZoneFeatureCollection = {
  type: "FeatureCollection";
  name: string;
  features: LegacyCoastalZoneFeature[];
};

type IslandManifestEntry = {
  id: string;
  name: string;
  kind: "island" | "islet";
  country: string;
  aliases: string[];
  geometryPath: string;
  rank: number;
  wikidata: string | null;
};

type CoastalZoneKind = "macro_zone" | "coast" | "island" | "islet";

const LEGACY_GREECE_COASTAL_ZONES =
  greeceCoastalZonesGeoJson as LegacyCoastalZoneFeatureCollection;

const normalizeZoneText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const mergeAliases = (...groups: ReadonlyArray<readonly string[]>) =>
  [...new Set(groups.flat().map((value) => value.trim()).filter(Boolean))];

const buildLegacyIslandAliasMap = () => {
  const map = new Map<string, string[]>();

  for (const feature of LEGACY_GREECE_COASTAL_ZONES.features) {
    if (feature.properties.kind !== "island") {
      continue;
    }

    const aliases = [feature.properties.name, ...feature.properties.aliases];
    for (const alias of aliases) {
      const normalized = normalizeZoneText(alias);
      if (!normalized) {
        continue;
      }

      map.set(normalized, mergeAliases(map.get(normalized) ?? [], aliases));
    }
  }

  return map;
};

const LEGACY_ISLAND_ALIAS_MAP = buildLegacyIslandAliasMap();

const CURATED_ISLAND_ALIASES: Record<string, string[]> = {
  cephalonia: ["Kefalonia", "Cephalonia", "Cefalonia", "Isla de Cefalonia"],
  chios: ["Chios", "Khios", "Hios", "Quios", "Isla de Quios"],
  corfu: ["Corfu", "Corfu island", "Corfu is.", "Kerkira", "Kerkyra", "Corfu island Greece", "Corfú", "Corfú", "Isla de Corfú"],
  crete: ["Crete", "Kriti", "Creta", "Crete island", "South Crete", "Sur de Creta", "Isla de Creta"],
  euboea: ["Euboea", "Euboia", "Evia", "Evia island", "Isla de Evia", "Eubea"],
  icaria: ["Ikaria", "Icaria", "Isla de Icaria", "Isla de Ikaria"],
  kos: ["Kos", "Cos", "Isla de Cos"],
  lemnos: ["Lemnos", "Limnos", "Isla de Lemnos", "Isla de Limnos"],
  lesbos: ["Lesbos", "Lesvos", "Isla de Lesbos", "Isla de Lesvos"],
  rhodes: ["Rhodes", "Rodas", "Isla de Rodas"],
  samos: ["Samos", "Isla de Samos"],
  zakynthos: ["Zakynthos", "Zante", "Zacinto", "Isla de Zante", "Isla de Zacinto"],
};

const buildCuratedMacroZones = () => {
  const macroZones = [
    {
      id: "ionian-north",
      name: "Ionian North",
      aliases: ["Ionian North", "Jonico Norte", "Norte Jonico", "Corfu arc", "Arco Corfu"],
      islandIds: ["corfu", "paxos", "antipaxos", "othonoi"],
      centerLatitude: 39.58,
      centerLongitude: 20.03,
    },
    {
      id: "ionian-central",
      name: "Ionian Central",
      aliases: ["Ionian Central", "Jonico Central", "Centro Jonico", "Lefkada arc", "Arco Lefkada"],
      islandIds: ["lefkada", "meganisi", "kalamos", "kastos"],
      centerLatitude: 38.82,
      centerLongitude: 20.77,
    },
    {
      id: "ionian-south",
      name: "Ionian South",
      aliases: [
        "Ionian South",
        "Jonico Sur",
        "Sur Jonico",
        "Kefalonia and Ithaca",
        "Cefalonia e Itaca",
      ],
      islandIds: ["cephalonia", "ithaca", "zakynthos"],
      centerLatitude: 38.13,
      centerLongitude: 20.72,
    },
    {
      id: "gulf-core",
      name: "Gulf Core",
      aliases: [
        "Gulf Core",
        "Nucleo Golfo",
        "Saronic Gulf",
        "Golfo Saronico",
        "Argolic Gulf",
        "Golfo Argolico",
      ],
      islandIds: ["salamis", "aegina", "poros", "hydra", "spetses", "agistri", "dokos"],
      centerLatitude: 37.63,
      centerLongitude: 23.39,
    },
    {
      id: "cyclades-west",
      name: "Cyclades West",
      aliases: ["Cyclades West", "Cicladas Oeste", "Cicladas Occidentales"],
      islandIds: ["kea", "kythnos", "serifos", "sifnos"],
      centerLatitude: 37.17,
      centerLongitude: 24.57,
    },
    {
      id: "cyclades-central",
      name: "Cyclades Central",
      aliases: ["Cyclades Central", "Cicladas Centrales", "Centro Cicladas"],
      islandIds: ["syros", "mykonos", "tinos", "andros"],
      centerLatitude: 37.56,
      centerLongitude: 25.11,
    },
    {
      id: "cyclades-east-south",
      name: "Cyclades East-South",
      aliases: ["Cyclades East-South", "Cicladas Este-Sur", "Cicladas Oriental Sur"],
      islandIds: ["naxos", "antiparos", "ios", "amorgos", "santorini", "milos", "anafi", "folegandros", "sikinos"],
      centerLatitude: 36.9,
      centerLongitude: 25.53,
    },
    {
      id: "sporades",
      name: "Sporades",
      aliases: ["Sporades", "Esporadas"],
      islandIds: ["skiathos", "skopelos", "alonissos", "skyros", "kyra-panagia"],
      centerLatitude: 39.27,
      centerLongitude: 23.93,
    },
    {
      id: "north-aegean-west",
      name: "North Aegean West",
      aliases: ["North Aegean West", "Egeo Norte Oeste", "Norte Egeo Oeste"],
      islandIds: ["lemnos", "lesbos", "agios-efstratios"],
      centerLatitude: 39.42,
      centerLongitude: 25.48,
    },
    {
      id: "north-aegean-east",
      name: "North Aegean East",
      aliases: ["North Aegean East", "Egeo Norte Este", "Norte Egeo Este", "Samos and Ikaria", "Samos e Icaria"],
      islandIds: ["chios", "samos", "icaria", "fourni", "oinousses"],
      centerLatitude: 37.93,
      centerLongitude: 26.35,
    },
    {
      id: "dodecanese-north",
      name: "Dodecanese North",
      aliases: ["Dodecanese North", "Dodecaneso Norte", "Norte Dodecaneso"],
      islandIds: ["patmos", "leros", "kalymnos", "kos", "lipsi"],
      centerLatitude: 37.02,
      centerLongitude: 27.21,
    },
    {
      id: "dodecanese-south",
      name: "Dodecanese South",
      aliases: ["Dodecanese South", "Dodecaneso Sur", "Sur Dodecaneso"],
      islandIds: ["karpathos", "kasos", "rhodes", "symi", "tilos", "chalki", "astypalea", "nisyros"],
      centerLatitude: 36.28,
      centerLongitude: 27.86,
    },
    {
      id: "crete-north-arc",
      name: "Crete North Arc",
      aliases: ["Crete North Arc", "Arco Norte de Creta", "Creta Norte"],
      islandIds: ["crete"],
      centerLatitude: 35.3,
      centerLongitude: 24.85,
    },
    {
      id: "crete-south-arc-gavdos",
      name: "Crete South Arc + Gavdos",
      aliases: ["Crete South Arc + Gavdos", "Arco Sur de Creta y Gavdos", "Creta Sur y Gavdos"],
      islandIds: ["crete", "gavdos", "gavdopoula"],
      centerLatitude: 34.91,
      centerLongitude: 24.83,
    },
  ] as const;

  return macroZones.map(
    (zone) =>
      ({
        id: zone.id,
        name: zone.name,
        kind: "macro_zone" as const,
        country: "GR",
        aliases: mergeAliases([zone.name], zone.aliases),
        rank: 500,
        islandIds: [...zone.islandIds],
        centerLatitude: zone.centerLatitude,
        centerLongitude: zone.centerLongitude,
      }) satisfies CoastalZoneMatch,
  );
};

let coastalZonesPromise: Promise<CoastalZoneMatch[]> | null = null;
let islandMatchByIdPromise: Promise<Map<string, CoastalZoneMatch>> | null = null;

const getZoneTokens = (feature: CoastalZoneMatch) => {
  const values = [feature.name, ...feature.aliases];
  return values.map(normalizeZoneText).filter(Boolean);
};

const getKindPriority = (kind: CoastalZoneKind) => {
  switch (kind) {
    case "island":
    case "islet":
      return 4;
    case "coast":
      return 3;
    case "macro_zone":
      return 2;
    default:
      return 1;
  }
};

const getZonePolygons = (geometry: CoastalZoneGeometry) =>
  geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;

const geometryCache = new Map<string, CoastalZoneGeometry>();

const loadIslandManifest = async () => {
  const manifestModule = await import("@/lib/data/greece-islands-manifest.json");
  return manifestModule.default as IslandManifestEntry[];
};

const getCoastalZones = async () => {
  if (!coastalZonesPromise) {
    coastalZonesPromise = (async () => {
      const manifest = await loadIslandManifest();
      const islandMatches = manifest.map((entry) => {
        const mergedAliases = mergeAliases(
          [entry.name],
          entry.aliases,
          CURATED_ISLAND_ALIASES[entry.id] ?? [],
          ...entry.aliases.map((alias) =>
            LEGACY_ISLAND_ALIAS_MAP.get(normalizeZoneText(alias)) ?? []),
        );

        return {
          id: entry.id,
          name: entry.name,
          kind: entry.kind,
          country: entry.country,
          aliases: mergedAliases,
          geometryPath: entry.geometryPath,
          rank: entry.rank,
        } satisfies CoastalZoneMatch;
      });

      const islandMatchById = new Map(
        islandMatches.map((entry) => [entry.id, entry]),
      );
      const macroZones = buildCuratedMacroZones().map((zone) => ({
        ...zone,
        islandIds: (zone.islandIds ?? []).filter((id) => islandMatchById.has(id)),
      }));

      islandMatchByIdPromise = Promise.resolve(islandMatchById);
      return [...islandMatches, ...macroZones];
    })();
  }

  return coastalZonesPromise;
};

export const getGreekCoastalZonesLazy = async () => getCoastalZones();

const getIslandMatchById = async () => {
  if (!islandMatchByIdPromise) {
    await getCoastalZones();
  }

  return islandMatchByIdPromise ?? new Map<string, CoastalZoneMatch>();
};

export const matchGreekCoastalZoneLazy = async (
  locationLabel: string | null | undefined,
) => {
  const normalizedLabel = normalizeZoneText(locationLabel ?? "");

  if (!normalizedLabel) {
    return null;
  }

  const zones = await getCoastalZones();

  return (
    zones
      .map((feature) => ({
        feature,
        score: Math.max(
          ...getZoneTokens(feature).map((token) => {
            if (normalizedLabel === token) return 1000 + token.length;
            if (normalizedLabel.includes(token)) return 100 + token.length;
            if (token.includes(normalizedLabel)) return 10 + token.length;
            return -1;
          }),
        ),
      }))
      .filter((entry) => entry.score > 0)
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }

        const rightKindPriority = getKindPriority(right.feature.kind);
        const leftKindPriority = getKindPriority(left.feature.kind);
        if (rightKindPriority !== leftKindPriority) {
          return rightKindPriority - leftKindPriority;
        }

        return right.feature.rank - left.feature.rank;
      })
      .map((entry) => entry.feature)[0] ?? null
  );
};

export const loadGreekCoastalZoneGeometryLazy = async (
  zone: CoastalZoneMatch | null | undefined,
) => {
  if (!zone) {
    return null;
  }

  if (zone.geometry) {
    return zone.geometry;
  }

  if (zone.kind === "macro_zone" && zone.islandIds?.length) {
    const cached = geometryCache.get(zone.id);
    if (cached) {
      return cached;
    }

    const islandMatchById = await getIslandMatchById();
    const polygons: number[][][][] = [];
    for (const islandId of zone.islandIds) {
      const islandZone = islandMatchById.get(islandId);
      if (!islandZone) {
        continue;
      }

      const islandGeometry = await loadGreekCoastalZoneGeometryLazy(islandZone);
      if (!islandGeometry) {
        continue;
      }

      polygons.push(...getZonePolygons(islandGeometry));
    }

    if (!polygons.length) {
      return null;
    }

    const macroGeometry: CoastalZoneGeometry = {
      type: "MultiPolygon",
      coordinates: polygons,
    };
    geometryCache.set(zone.id, macroGeometry);
    return macroGeometry;
  }

  if (!zone.geometryPath) {
    return null;
  }

  const cached = geometryCache.get(zone.id);
  if (cached) {
    return cached;
  }

  const response = await fetch(zone.geometryPath, { cache: "force-cache" });
  if (!response.ok) {
    throw new Error(`Unable to load coastal geometry for ${zone.id}`);
  }

  const geometry = (await response.json()) as CoastalZoneGeometry;
  geometryCache.set(zone.id, geometry);
  return geometry;
};