import greeceCoastalZonesGeoJson from "@/lib/data/greece-coastal-zones.json";
import greeceIslandsManifestJson from "@/lib/data/greece-islands-manifest.json";

type CoastalZoneKind = "macro_zone" | "coast" | "island" | "islet";

export type CoastalZoneGeometry =
  | {
      type: "Polygon";
      coordinates: number[][][];
    }
  | {
      type: "MultiPolygon";
      coordinates: number[][][][];
    };

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

export type CoastalZoneMatch = {
  id: string;
  name: string;
  kind: CoastalZoneKind;
  country: string;
  aliases: string[];
  rank: number;
  geometry?: CoastalZoneGeometry;
  geometryPath?: string;
};

const LEGACY_GREECE_COASTAL_ZONES =
  greeceCoastalZonesGeoJson as LegacyCoastalZoneFeatureCollection;
const GREECE_ISLANDS_MANIFEST =
  greeceIslandsManifestJson as IslandManifestEntry[];

const normalizeZoneText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const mergeAliases = (...groups: string[][]) =>
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

      map.set(
        normalized,
        mergeAliases(map.get(normalized) ?? [], aliases),
      );
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

const ISLAND_MATCHES = GREECE_ISLANDS_MANIFEST.map((entry) => {
  const mergedAliases = mergeAliases(
    [entry.name],
    entry.aliases,
    CURATED_ISLAND_ALIASES[entry.id] ?? [],
    ...entry.aliases.map((alias) => LEGACY_ISLAND_ALIAS_MAP.get(normalizeZoneText(alias)) ?? []),
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

const MACRO_ZONE_MATCHES = LEGACY_GREECE_COASTAL_ZONES.features
  .filter((feature) => feature.properties.kind !== "island")
  .map(
    (feature) =>
      ({
        id: feature.properties.id,
        name: feature.properties.name,
        kind: feature.properties.kind,
        country: feature.properties.country,
        aliases: mergeAliases([feature.properties.name], feature.properties.aliases),
        geometry: feature.geometry,
        rank: 10_000,
      }) satisfies CoastalZoneMatch,
  );

const GREECE_COASTAL_ZONES: CoastalZoneMatch[] = [
  ...ISLAND_MATCHES,
  ...MACRO_ZONE_MATCHES,
];

const getZoneTokens = (feature: CoastalZoneMatch) => {
  const values = [feature.name, ...feature.aliases];
  return values.map(normalizeZoneText).filter(Boolean);
};

export const getGreekCoastalZones = () => GREECE_COASTAL_ZONES;

export const findGreekCoastalZoneMatches = (
  locationLabel: string | null | undefined,
) => {
  const normalizedLabel = normalizeZoneText(locationLabel ?? "");

  if (!normalizedLabel) {
    return [] as CoastalZoneMatch[];
  }

  return getGreekCoastalZones()
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

      return right.feature.rank - left.feature.rank;
    })
    .map((entry) => entry.feature);
};

export const matchGreekCoastalZone = (
  locationLabel: string | null | undefined,
) => findGreekCoastalZoneMatches(locationLabel)[0] ?? null;

const geometryCache = new Map<string, CoastalZoneGeometry>();

export const loadGreekCoastalZoneGeometry = async (
  zone: CoastalZoneMatch | null | undefined,
) => {
  if (!zone) {
    return null;
  }

  if (zone.geometry) {
    return zone.geometry;
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
