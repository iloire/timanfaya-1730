import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { bounds, contains, episodeAt, featureArea, ringArea, type LavaFeature, type LavaFile } from './lava';

// A 100 m square with a 20 m square hole, wound the way ArcGIS does (outline clockwise, hole anticlockwise).
const square = (x0: number, y0: number, s: number) => [x0, y0, x0, y0 + s, x0 + s, y0 + s, x0 + s, y0];
const holed: LavaFeature = { unit: '73', episode: 1, kind: 'lava', rings: [square(0, 0, 100), square(40, 40, 20).reverse()] };

describe('lava geometry', () => {
  it('measures a ring, signed by its winding', () => {
    expect(ringArea(square(0, 0, 100))).toBe(-10000);
    expect(Math.abs(ringArea(square(0, 0, 100)))).toBe(10000);
  });

  it('takes the holes out of the area', () => {
    expect(featureArea(holed)).toBe(10000 - 400);
  });

  it('knows inside, outside and in a hole', () => {
    expect(contains(holed, 10, 10)).toBe(true);
    expect(contains(holed, 50, 50)).toBe(false);
    expect(contains(holed, 150, 50)).toBe(false);
  });

  it('gives the episode under a point, ignoring the ash', () => {
    const ash: LavaFeature = { unit: '79', episode: 0, kind: 'ash', rings: [square(-500, -500, 1000)] };
    const later: LavaFeature = { unit: '77', episode: 3, kind: 'lava', rings: [square(200, 0, 100)] };
    expect(episodeAt([ash, holed, later], 10, 10)).toBe(1);
    expect(episodeAt([ash, holed, later], 250, 50)).toBe(3);
    expect(episodeAt([ash, holed, later], -300, -300)).toBe(0);
  });

  it('boxes the features', () => {
    expect(bounds([holed])).toEqual([0, 0, 100, 100]);
  });
});

// The real map, as fetched: its lavas should add up to the field the literature measures.
describe('the 1730–36 field (lava.json)', () => {
  const file = JSON.parse(readFileSync('public/sites/lanzarote/lava.json', 'utf8')) as LavaFile;
  const km2 = (kind: string, episode?: number) => file.features
    .filter((f) => f.kind === kind && (episode === undefined || f.episode === episode))
    .reduce((sum, f) => sum + featureArea(f), 0) / 1e6;

  it('covers about 146 km² of new lava (Carracedo et al. 1992)', () => {
    expect(km2('lava')).toBeGreaterThan(140);
    expect(km2('lava')).toBeLessThan(152);
  });

  it('has episode 2 as the largest', () => {
    expect(km2('lava', 2)).toBeGreaterThan(km2('lava', 1));
    expect(km2('lava', 2)).toBeGreaterThan(km2('lava', 3));
  });

  it('reaches from the west coast to near Arrecife', () => {
    const [x0, , x1] = bounds(file.features.filter((f) => f.kind === 'lava'));
    expect(x1 - x0).toBeGreaterThan(25000);
  });
});
