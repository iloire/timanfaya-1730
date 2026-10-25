# Changelog

## 2026-10-25 09:43

- Public, and live on GitHub Pages: every push to `main` deploys, and CI checks the page, the lava
  and a terrain tile on the real URL.

## 2026-10-23 13:32

- First version: the 1730–36 lava field on the real island. The terrain engine (5 m IGN terrain, PNOA
  photo, sky) comes from driving-sim without the car, over a wider box that keeps the west coast.
  The lava comes from IGME's GEODE map (`npm run fetch-lava`), drawn by episode over the photo,
  with the vents of each phase named over their cones and a map key to turn each episode on and off.
  Spanish first. Tests check the field adds up to the published ~146 km².
