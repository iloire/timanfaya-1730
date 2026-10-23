// The 1730–1736 lava field as IGME's GEODE map draws it (zone Z2910, Lanzarote): the lavas and
// cones of the three episodes the geologists can tell apart on the ground, plus the ash of all
// three. scripts/fetch-lava.ts writes public/sites/<site>/lava.json; this reads it.
// The episodes map onto the five phases of the historical record (Carracedo & Rodríguez
// Badiola 1991): episode 1 = phase 1, episode 2 = phases 2–4, episode 3 = phase 5.

export type LavaKind = 'lava' | 'cone' | 'ash';

export interface LavaFeature {
  /** GEODE unit code (CODE_UNIO). */
  unit: string;
  /** 1–3, or 0 for the ash, which falls across all three. */
  episode: number;
  kind: LavaKind;
  /** Rings in the site frame (x east, y north, metres), each a flat [x0, y0, x1, y1, …]; the first is the outline, the rest holes. */
  rings: number[][];
}

export interface LavaFile {
  source: string;
  features: LavaFeature[];
}

/** GEODE units of the 1730–36 eruption → episode and kind. 80–82 are the 1824 eruption, left out. */
export const UNITS: Record<string, { episode: number; kind: LavaKind }> = {
  '73': { episode: 1, kind: 'lava' },
  '74': { episode: 1, kind: 'cone' },
  '75': { episode: 2, kind: 'lava' },
  '76': { episode: 2, kind: 'cone' },
  '77': { episode: 3, kind: 'lava' },
  '78': { episode: 3, kind: 'cone' },
  '79': { episode: 0, kind: 'ash' },
};

/** Signed area of a ring (positive anticlockwise), m². */
export function ringArea(ring: number[]): number {
  let sum = 0;
  for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
    sum += ring[j] * ring[i + 1] - ring[i] * ring[j + 1];
  }
  return sum / 2;
}

/** A feature's area, m²: its outline less its holes, whichever way the rings wind. */
export function featureArea(f: LavaFeature): number {
  const [outer, ...holes] = f.rings.map((r) => Math.abs(ringArea(r)));
  return outer - holes.reduce((a, b) => a + b, 0);
}

/** Inside the feature: inside its outline and in none of its holes (even–odd over all rings). */
export function contains(f: LavaFeature, x: number, y: number): boolean {
  let inside = false;
  for (const ring of f.rings) {
    for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
      const yi = ring[i + 1], yj = ring[j + 1];
      if ((yi > y) !== (yj > y) && x < ((ring[j] - ring[i]) * (y - yi)) / (yj - yi) + ring[i]) inside = !inside;
    }
  }
  return inside;
}

/** The episode whose lava or cone covers a point, or 0 where there is none (ash doesn't count). */
export function episodeAt(features: LavaFeature[], x: number, y: number): number {
  for (const f of features) if (f.kind !== 'ash' && contains(f, x, y)) return f.episode;
  return 0;
}

/** Bounding box [x0, y0, x1, y1] of some features. */
export function bounds(features: LavaFeature[]): [number, number, number, number] {
  const b: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const f of features) {
    for (const ring of f.rings) {
      for (let i = 0; i < ring.length; i += 2) {
        b[0] = Math.min(b[0], ring[i]); b[1] = Math.min(b[1], ring[i + 1]);
        b[2] = Math.max(b[2], ring[i]); b[3] = Math.max(b[3], ring[i + 1]);
      }
    }
  }
  return b;
}
