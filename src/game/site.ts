// Loads a site folder from public/sites/<id>/ and converts between lat/lon and the local frame
// (x east, y north, metres from the bbox's south-west corner). The 5 m detail tiles cover the
// lava field and its edges; a tile's heights load with its photo as the camera nears it
// (terrain-view.ts).

import proj4 from 'proj4';
import type { LavaFile } from '../sim/lava';
import { Heightmap } from '../sim/terrain';

export interface SiteSpec {
  name: string;
  country: string;
  proj4: string;
  crs: string;
  bbox: [number, number, number, number];
  /** `unitM`: metres per stored step, omitted = 0.1. */
  heightmap: { file: string; size: number; unitM?: number };
  ortho: { file: string; size: number };
  /** Native-resolution tiles, written by scripts/fetch-terrain.ts. */
  detail: { dir: string; tileM: number; orthoSize: number };
  /** The 1730–36 lava field, written by scripts/fetch-lava.ts. */
  lava: { file: string };
}

export interface DetailTile {
  col: number;
  row: number;
  orthoUrl: string;
  binUrl: string;
}

export interface Site {
  spec: SiteSpec;
  terrain: Heightmap;
  orthoUrl: string;
  detailTileM: number;
  detailTiles: DetailTile[];
  lava: LavaFile;
  toLatLon(x: number, y: number): [number, number];
  fromLatLon(lat: number, lon: number): [number, number];
  /** Loads one tile's 5 m heights. */
  loadTile(t: DetailTile): Promise<void>;
  /** Frees them (the coarse map takes over there). */
  freeTile(t: DetailTile): void;
}

const BASE = `${import.meta.env.BASE_URL}sites/`;

export async function loadSite(id: string): Promise<Site> {
  const base = `${BASE}${id}/`;
  const spec = (await (await fetch(`${base}site.json`)).json()) as SiteSpec;
  const detailDir = `${base}${spec.detail.dir}/`;
  const [heights, index, lava] = await Promise.all([
    fetch(`${base}${spec.heightmap.file}`).then((r) => r.arrayBuffer()),
    fetch(`${detailDir}tiles.json`).then((r) => r.json() as Promise<{ size: number; tiles: [number, number][] }>),
    fetch(`${base}${spec.lava.file}`).then((r) => r.json() as Promise<LavaFile>),
  ]);
  const [x0, y0, x1] = spec.bbox;
  const unitM = spec.heightmap.unitM ?? 0.1;
  const tileM = spec.detail.tileM;
  const terrain = Heightmap.fromInt16(heights, spec.heightmap.size, x1 - x0, unitM);
  const proj = proj4('EPSG:4326', spec.proj4);

  const detailTiles = index.tiles.map(([col, row]): DetailTile => ({
    col, row, orthoUrl: `${detailDir}${col}_${row}.jpg`, binUrl: `${detailDir}${col}_${row}.bin`,
  }));
  const pending = new Map<DetailTile, Promise<void>>();
  const loadTile = (t: DetailTile): Promise<void> => {
    if (terrain.detailAt((t.col + 0.5) * tileM, (t.row + 0.5) * tileM)) return Promise.resolve();
    let p = pending.get(t);
    if (!p) {
      p = fetch(t.binUrl).then((r) => r.arrayBuffer()).then((buf) => {
        terrain.addDetail(tileM, t.col, t.row, Heightmap.fromInt16(buf, index.size, tileM, unitM, t.col * tileM, t.row * tileM));
      }).finally(() => pending.delete(t));
      pending.set(t, p);
    }
    return p;
  };

  return {
    spec,
    terrain,
    orthoUrl: `${base}${spec.ortho.file}`,
    detailTileM: tileM,
    detailTiles,
    lava,
    toLatLon(x, y) {
      const [lon, lat] = proj.inverse([x + x0, y + y0]);
      return [lat, lon];
    },
    fromLatLon(lat, lon) {
      const [e, n] = proj.forward([lon, lat]);
      return [e - x0, n - y0];
    },
    loadTile,
    freeTile(t) {
      terrain.removeDetail(t.col, t.row);
    },
  };
}
