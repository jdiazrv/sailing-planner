import fs from "node:fs";
import path from "node:path";

const inputPath = process.argv[2];

if (!inputPath) {
  console.error("Usage: node scripts/build-greece-islands-dataset.mjs /path/to/greece-islands.geojsonseq");
  process.exit(1);
}

const repoRoot = process.cwd();
const outputDir = path.resolve(repoRoot, "public/data/greece-islands");
const manifestPath = path.resolve(repoRoot, "src/lib/data/greece-islands-manifest.json");
const legacyPath = path.resolve(repoRoot, "src/lib/data/greece-coastal-zones.json");

const text = fs.readFileSync(inputPath, "utf8");
const records = text.split("\u001e").map((value) => value.trim()).filter(Boolean);
const features = records.map((record) => JSON.parse(record));
const legacy = JSON.parse(fs.readFileSync(legacyPath, "utf8"));

const legacyAliasMap = new Map();
for (const feature of legacy.features) {
  if (feature.properties.kind !== "island") {
    continue;
  }

  legacyAliasMap.set(feature.properties.id, feature.properties.aliases || []);
}

const slugify = (value) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const normalizeAlias = (value) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const geometryAreaScore = (geometry) => {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  let total = 0;

  for (const polygon of polygons) {
    const ring = polygon[0];
    if (!Array.isArray(ring) || ring.length < 3) {
      continue;
    }

    let area = 0;
    for (let index = 0; index < ring.length; index += 1) {
      const [x1, y1] = ring[index];
      const [x2, y2] = ring[(index + 1) % ring.length];
      area += x1 * y2 - x2 * y1;
    }

    total += Math.abs(area / 2);
  }

  return Math.round(total * 1000) / 1000;
};

const preferredName = (properties) =>
  properties["name:en"] || properties.int_name || properties["name:es"] || properties.name;

const islandFeatures = features.filter((feature) =>
  ["island", "islet"].includes(feature.properties?.place),
);
const namedIslands = islandFeatures.filter((feature) => preferredName(feature.properties));

const slugCounts = new Map();
const manifest = [];

fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });

for (const feature of namedIslands) {
  const properties = feature.properties;
  const primaryName = preferredName(properties);
  const baseSlug = slugify(primaryName || "island") || "island";
  const count = (slugCounts.get(baseSlug) || 0) + 1;
  slugCounts.set(baseSlug, count);
  const id = count === 1 ? baseSlug : `${baseSlug}--${count}`;

  const aliases = new Set(
    [
      properties.name,
      properties.int_name,
      properties["name:el"],
      properties["name:en"],
      properties["name:es"],
      properties["name:fr"],
      ...(legacyAliasMap.get(baseSlug) || []),
    ]
      .filter(Boolean)
      .map(normalizeAlias)
      .filter(Boolean),
  );

  const geometryPath = `/data/greece-islands/${id}.json`;
  fs.writeFileSync(
    path.join(outputDir, `${id}.json`),
    JSON.stringify(feature.geometry),
  );

  manifest.push({
    id,
    name: primaryName,
    kind: properties.place === "islet" ? "islet" : "island",
    country: "GR",
    aliases: [...aliases],
    geometryPath,
    rank: geometryAreaScore(feature.geometry),
    wikidata: properties.wikidata || null,
  });
}

manifest.sort((left, right) => right.rank - left.rank || left.name.localeCompare(right.name));
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

console.log(
  JSON.stringify(
    {
      totalFeatures: features.length,
      namedIslands: namedIslands.length,
      written: manifest.length,
    },
    null,
    2,
  ),
);
