# Timanfaya 1730 — plan

A browser piece that replays the 1730–1736 eruption of Timanfaya on the real island: the ground as it
is today, rolled back to before the eruption, then the vents opening one after another, the lava
burying the villages and reaching the sea, until the malpaís we know today is left. It is made for the
Cabildo de Lanzarote, as a web link and as a 2–3 minute film for FITUR (late January 2027).

A spinoff of [driving-sim](https://github.com/iloire/driving-sim), which got its terrain from
[paragliding-sim](https://github.com/iloire/paragliding-sim). No car, no game: a timeline, a camera
and the island.

## What it shows

1. **Before.** The island in 1730, the Vega de Tomaren and its villages: no malpaís, no
   cones, the old ground under them farmland. A time scrubber reads *1 de septiembre de 1730*.
2. **The eruption, scene by scene.** About 13 scenes, from Caldera de los Cuervos (1 Sep 1730) to Montaña
   Colorada (April 1736). In each, the vents open, glowing lava advances from them, and the flows
   cool to black. Ash darkens the sky during the big phases. The camera moves on its own.
3. **The villages.** Chimanfaya, Santa Catalina, Mazo, Tíngafa, Rodeo, Las Jarretas, Chupadero…
   drawn as small white clusters, each one going under on its date, with its name and the date
   it was lost.
4. **The diary.** Short lines from the Cura de Yaiza as captions, with the date.
5. **Today.** The flow fades into today's orthophoto, and the camera pulls back over the national park.

Two ways to watch: **Film** plays the scenes with its camera paths. **Explorar** pauses the
clock anywhere and lets you fly.

## Data

All of it with licences that allow reuse, credited on screen.

| What | Source | Licence |
|---|---|---|
| Terrain 5 m, orthophoto | IGN MDT05 + PNOA (as in driving-sim) | CC BY 4.0 |
| Lava field outline, 3 episodes | IGME GEODE Z2910, units 73–79, ArcGIS REST query (EPSG:25828) | IGME generic: reuse with attribution |
| 5 phases and vents | Digitised by hand from Muller & Longpré 2024 Fig. 1 (Carracedo et al. 1992). We trace the facts, never reuse the figure | ours |
| Chronology, villages, dates | Muller & Longpré 2024; Pallarés Padilla; Quintana & de León, *Chimanfaya* | facts, cited |
| Diary quotes | Our own translation from von Buch's 1825 German (public domain) | ours |

The 3 IGME episodes map onto the 5 phases: episode 1 = phase 1, episode 2 = phases 2–4,
episode 3 = phase 5. So only episode 2 has to be split by hand.

Research notes from the first pass are in `docs/research/` (local only, gitignored: some of
that text is in copyright).

### Things nobody knows, and how the piece says so

- **The ground before 1730.** No one has published it. We approximate it by lowering the DEM
  inside the lava outline: about 5–10 m at the edges, 20–30 m across the field and up to 60–100 m in
  the central west (Purcell et al. 2022). The 1730–36 cones are removed, and the area is painted as
  farmland. The credits say it is a reconstruction.
- **Where the villages were.** No coordinates are published. We use the hills that carry their
  names and mark them as *ubicación aproximada*. José de León (via the Fundación César Manrique) is
  the person to ask for better positions.
- **Disputed dates.** The end of the eruption (April 1736, or 1735 per Pallarés) and some dates in
  September 1730. We show the usual date and note the dispute in the credits.

## Data files, not code

As in the other sims, what is likely to be changed lives in JSON with its schema in a README:

- `public/data/scenes.json`: each scene's date, phase, vents, villages lost, quote (es/en), caption
  and camera path.
- `public/data/villages.json`: name, position, date lost, confidence.
- `public/data/vents.json`: name, phase, position, dates active.
- The lava: `scripts/fetch-lava.ts` pulls the GEODE polygons and writes, for each phase, a raster in
  the site frame with the **arrival time** of the lava at each cell: the time to reach it from that
  phase's vents, inside its outline. The shader compares that time to the clock, so each front
  advances from its vents and cools behind them without any per-frame geometry. It is a stylised
  flow, not a simulation, and the credits say so.

## Milestones

1. ~~**Scaffold.** Vite + TypeScript + three.js, Vitest, ESLint, CI on GitHub Actions with the badge;
   a public repo. Copy `terrain.ts`, `sun.ts`, the terrain view and the sky from driving-sim. Only
   the detail tiles near the lava field (75 tiles, 87 MB), not the whole island. Free camera over
   today's island.~~ ✅ Public, deployed to GitHub Pages on every push.
2. **Lava data.** ~~`fetch-lava.ts`, GEODE → the site frame → per-episode overlay.~~ ✅ ~~The vents by
   phase (`public/data/vents.json`).~~ ✅ ~~Tests: areas match the published ~146 km².~~ ✅ Still to do:
   split episode 2 into phases 2, 3 and 4 by hand.
3. **Clock and lava.** Timeline from 1 Sep 1730 to Apr 1736 with a scrubber; arrival-time rasters;
   lava shader (glowing front, crust, cooled black); vent glow and fountains.
4. **Before.** The lowered DEM and the farmland texture inside the outline, blended back to today as the
   clock runs.
5. **Villages and diary.** Clusters of white houses that burn and go under; captions with quotes.
6. **Film.** Camera paths per scene, music-free timing, a frame-by-frame 4K export (render each
   frame offline, not a screen recording) → the FITUR film.
7. **Polish for the Cabildo.** Spanish first with English, title and credits, README with a
   screenshot.

## Before showing it to the Cabildo

- **Permissions:** CACT owns the Montañas del Fuego branding and the Fundación owns Manrique's devil
  logo, so we use neither. Filming in the national park needs permits, which we don't need because
  nothing is filmed.
- **A historian's read** of the scene texts. José de León would be the one.
