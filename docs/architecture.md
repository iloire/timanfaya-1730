# Architecture

```
src/sim/    pure TypeScript, no three.js, no DOM — unit-tested
  terrain.ts  Heightmap with 5 m detail tiles (from driving-sim / paragliding-sim)
  sun.ts      sun position and daylight hours (same)
  lava.ts     the 1730–36 lava field: GEODE units → episodes, areas, point-in-polygon
src/game/   three.js scene and page
  site.ts         loads public/sites/<id>/: heightmap, detail tiles, lava.json
  terrain-view.ts LOD terrain chunks with skirts; the material blends the lava overlay
  lava-layer.ts   the lava polygons drawn into one canvas texture over the field
  world.ts        sea, sky, sun light, fog
  main.ts         camera (MapControls), vent labels, the map key
public/sites/lanzarote/  site.json + generated terrain and lava
public/data/             hand-kept data (vents.json); schema in its README
scripts/fetch-lava.ts    IGME GEODE → lava.json
scripts/fetch-terrain.ts IGN MDT05 + PNOA → height.bin, ortho.jpg, detail tiles near the lava
```

## Frames

As in driving-sim. Site frame: **x east, y north, z up**, metres, origin at the bbox's south-west
corner (UTM 28N, EPSG:4083). three.js: `X = x − e/2, Y = z, Z = e/2 − y`.

The site box is 604000–658000 E, 3181000–3235000 N: the whole island, with its west coast.
(driving-sim's box starts at 616000 E and cuts off the strip where the 1730 lava reached the sea.)

## Terrain

The coarse map (2048², ~26 m) and orthophoto cover the whole island. The 5 m tiles (3 km, 600²
samples, a 2048² photo each) cover only tiles with land within 1.5 km of a lava polygon. Nothing
is carved: 1730 had no roads.

## Lava

`fetch-lava` queries IGME GEODE's ArcGIS REST service (layer 8, zone Z2910) for units 73–79 in
EPSG:4083 and stores the rings in the site frame. Units → episodes are in `UNITS` (`lava.ts`):
73/74 episode 1, 75/76 episode 2, 77/78 episode 3 (lava/cones), 79 the ash of all three. The
memoir of MAGNA sheet 1081-I numbers the same units in the same order.

`LavaLayer` paints the polygons into a 4096-px canvas over the field's box (~7.5 m/px). The
terrain shader maps each fragment's site position into that box and blends the texel over the
photo. The uniforms are shared objects, so toggling an episode redraws one canvas and every
chunk's material follows.
