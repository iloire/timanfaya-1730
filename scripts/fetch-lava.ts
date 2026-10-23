// Downloads the 1730–36 lava field from IGME's GEODE geological map (zone Z2910, Lanzarote) and
// writes public/sites/<site>/lava.json in the site frame (see src/sim/lava.ts). The polygons
// come straight from the ArcGIS REST query, in the site's CRS, to the decimetre.
// Licence: IGME generic licence, free reuse with attribution.
// Usage: npm run fetch-lava -- lanzarote
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { featureArea, UNITS, type LavaFeature, type LavaFile } from '../src/sim/lava';

const QUERY = 'https://mapas.igme.es/gis/rest/services/Cartografia_Geologica/IGME_Geode_50/MapServer/8/query';
const ZONE = 'Z2910';

interface EsriResponse {
  features: { attributes: { CODE_UNIO: string }; geometry: { rings: [number, number][][] } }[];
  exceededTransferLimit?: boolean;
  error?: { message: string };
}

async function main(): Promise<void> {
  const siteId = process.argv[2] ?? 'lanzarote';
  const dir = join('public', 'sites', siteId);
  const site = JSON.parse(readFileSync(join(dir, 'site.json'), 'utf8')) as { crs: string; bbox: number[]; lava: { file: string } };
  const [x0, y0] = site.bbox;
  const codes = Object.keys(UNITS).map((c) => `'${c}'`).join(',');
  const params = new URLSearchParams({
    where: `ZONA='${ZONE}' AND CODE_UNIO IN (${codes})`,
    outFields: 'CODE_UNIO',
    outSR: site.crs.split(':')[1],
    f: 'json',
  });
  const res = await fetch(`${QUERY}?${params}`);
  if (!res.ok) throw new Error(`GEODE: ${res.status} ${res.statusText}`);
  const body = (await res.json()) as EsriResponse;
  if (body.error) throw new Error(`GEODE: ${body.error.message}`);
  if (body.exceededTransferLimit) throw new Error('GEODE capped the answer: page the query');

  const r1 = (v: number) => Math.round(v * 10) / 10;
  const features: LavaFeature[] = body.features.map(({ attributes, geometry }) => ({
    unit: attributes.CODE_UNIO,
    ...UNITS[attributes.CODE_UNIO],
    // ArcGIS closes each ring with its first point again; the site frame doesn't need it.
    rings: geometry.rings.map((ring) => ring.slice(0, -1).flatMap(([e, n]) => [r1(e - x0), r1(n - y0)])),
  }));
  const file: LavaFile = {
    source: `IGME GEODE 1:50.000, zone ${ZONE}, units ${Object.keys(UNITS).join(', ')} (${new Date().toISOString().slice(0, 10)})`,
    features,
  };
  writeFileSync(join(dir, site.lava.file), JSON.stringify(file));
  for (const episode of [1, 2, 3, 0]) {
    const km2 = features.filter((f) => f.episode === episode).reduce((s, f) => s + featureArea(f), 0) / 1e6;
    console.log(`${episode ? `episode ${episode}` : 'ash'}: ${km2.toFixed(1)} km²`);
  }
  console.log(`${features.length} polygons → ${join(dir, site.lava.file)}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
