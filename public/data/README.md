# Data files

Hand-kept data the piece reads at runtime. Edit these; no code change needed.

## `vents.json`

The eruptive vents of 1730–1736, one per named cone or group of cones.

| Field | Type | Meaning |
|---|---|---|
| `name` | string | Name shown on screen |
| `phase` | 1–5 | Eruptive phase (Carracedo et al. 1992). Phase 1 → GEODE episode 1, phases 2–4 → episode 2, phase 5 → episode 3 |
| `lat`, `lon` | number | WGS84 position of the summit |
| `osm` | string, optional | The OpenStreetMap name when it differs from `name`, so the point can be found again |

`source` at the top says where the list and the positions come from.

The lava field itself is not here: `npm run fetch-lava` writes it to
`public/sites/lanzarote/lava.json` from IGME's map (see `src/sim/lava.ts`).
