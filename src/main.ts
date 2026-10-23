import './style.css';
import * as THREE from 'three';
import { MapControls } from 'three/examples/jsm/controls/MapControls.js';
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { EPISODE_COLOURS, LavaLayer } from './game/lava-layer';
import { loadSite } from './game/site';
import { TerrainView } from './game/terrain-view';
import { createSurround, Sunlight, toScene } from './game/world';
import { bounds } from './sim/lava';
import { dayOfYear, sunPosition } from './sim/sun';

declare const __COMMIT_SHA__: string;

const SITE = 'lanzarote';
/** The light the piece is seen in: the first afternoon of the eruption, 1 September, at five. */
const DAY = dayOfYear(new Date(2026, 8, 1));
const HOUR = 17;
/** The camera never goes nearer the ground than this (m). */
const MIN_AGL = 40;
/** Further than this from what it looks at (m), the camera sees the vents too small to name. */
const LABELS_WITHIN = 30000;

interface Vent { name: string; phase: number; lat: number; lon: number }

/** Phases 2–4 of the historical record are one episode on the geological map. */
const episodeOfPhase = (phase: number) => (phase === 1 ? 1 : phase === 5 ? 3 : 2);

/** The map key: GEODE units, what they are, when. */
const KEY: { episode: number; code: string; name: string; when: string }[] = [
  { episode: 1, code: '73·74', name: 'Episodio 1 · fase 1', when: 'Caldera de los Cuervos a Pico Partido, sep 1730 – ene 1731' },
  { episode: 2, code: '75·76', name: 'Episodio 2 · fases 2 a 4', when: 'Señalo, Rajada, Quemadas, Montañas del Fuego, 1731 en adelante' },
  { episode: 3, code: '77·78', name: 'Episodio 3 · fase 5', when: 'Las Nueces y Montaña Colorada, hasta 1736' },
  { episode: 0, code: '79', name: 'Piroclastos', when: 'La ceniza de los tres episodios' },
];

async function boot(): Promise<void> {
  const site = await loadSite(SITE);
  const terrain = site.terrain;
  const extent = terrain.extent;
  const vents = ((await (await fetch(`${import.meta.env.BASE_URL}data/vents.json`)).json()) as { vents: Vent[] }).vents;

  const canvas = document.getElementById('view') as HTMLCanvasElement;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, logarithmicDepthBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const labels = new CSS2DRenderer({ element: document.getElementById('labels')! });
  labels.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 300000);
  const sunlight = new Sunlight(scene, renderer);
  const [lat] = site.toLatLon(extent / 2, extent / 2);
  const sun = sunPosition(lat, DAY, HOUR);
  sunlight.set(sun.dir, sun.elevationDeg);

  const lava = new LavaLayer(site.lava.features, extent);
  const ortho = await new THREE.TextureLoader().loadAsync(site.orthoUrl);
  const terrainView = new TerrainView(terrain, ortho, site.detailTileM, site.detailTiles, renderer.capabilities.getMaxAnisotropy(), {
    load: (t) => site.loadTile(t),
    free: (t) => site.freeTile(t),
  }, lava);
  scene.add(terrainView.group, createSurround(extent));

  // Each vent named over its summit, earliest phase first, so it wins when names collide.
  const ventMarks = new THREE.Group();
  vents.sort((a, b) => a.phase - b.phase);
  for (const v of vents) {
    const [x, y] = site.fromLatLon(v.lat, v.lon);
    const el = document.createElement('div');
    el.className = 'vent';
    el.innerHTML = `<b></b><i>fase ${v.phase}</i>`;
    el.querySelector('b')!.textContent = v.name;
    el.style.color = EPISODE_COLOURS[episodeOfPhase(v.phase)];
    const mark = new CSS2DObject(el);
    toScene(extent, x, y, terrain.heightAt(x, y) + 10, mark.position);
    ventMarks.add(mark);
  }
  scene.add(ventMarks);

  // The map key: one row per unit, each a toggle.
  const list = document.getElementById('episodes')!;
  for (const k of KEY) {
    const li = document.createElement('li');
    li.innerHTML = `<label class="unit"><input type="checkbox" /><span class="chip"></span><span class="code"></span><span class="what"><span></span><small></small></span></label>`;
    const input = li.querySelector('input')!;
    input.checked = lava.shown[k.episode];
    (li.querySelector('.chip') as HTMLElement).style.background = EPISODE_COLOURS[k.episode];
    li.querySelector('.code')!.textContent = k.code;
    li.querySelector('.what span')!.textContent = k.name;
    li.querySelector('small')!.textContent = k.when;
    input.addEventListener('change', () => { lava.shown[k.episode] = input.checked; lava.draw(); });
    list.append(li);
  }
  const opacity = document.getElementById('opacity') as HTMLInputElement;
  opacity.value = String(lava.opacity);
  opacity.addEventListener('input', () => { lava.opacity = Number(opacity.value); });
  const ventsBox = document.getElementById('vents') as HTMLInputElement;
  // Set each frame from the box and the camera's distance; CSS2DRenderer hides labels of invisible objects.
  const showVents = () => ventsBox.checked && camera.position.distanceTo(controls.target) < LABELS_WITHIN;

  // Start south-east of the field, looking north-west across it with the sun to the west.
  const [fx0, fy0, fx1, fy1] = bounds(site.lava.features.filter((f) => f.kind !== 'ash'));
  const cx = (fx0 + fx1) / 2, cy = (fy0 + fy1) / 2;
  const target = toScene(extent, cx, cy, terrain.groundAt(cx, cy));
  camera.position.copy(target).add(new THREE.Vector3(5000, 15000, 18000));
  const controls = new MapControls(camera, renderer.domElement);
  controls.target.copy(target);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.47;
  controls.minDistance = 300;
  controls.maxDistance = 60000;
  controls.update();

  const sha = typeof __COMMIT_SHA__ === 'string' ? __COMMIT_SHA__ : '';
  if (sha) document.getElementById('sha')!.textContent = sha;

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    labels.setSize(window.innerWidth, window.innerHeight);
  });

  // Names that would overlap on screen: only the first (earliest) of them shows.
  const declutter = () => {
    const placed: DOMRect[] = [];
    for (const mark of ventMarks.children as CSS2DObject[]) {
      const el = mark.element;
      el.classList.remove('hidden');
      const r = el.getBoundingClientRect();
      const hit = placed.some((p) => r.left < p.right && r.right > p.left && r.top < p.bottom && r.bottom > p.top);
      el.classList.toggle('hidden', hit);
      if (!hit) placed.push(r);
    }
  };

  // The key starts folded on a phone, where it would cover half the island.
  if (matchMedia('(max-width: 640px)').matches) document.getElementById('legend')!.removeAttribute('open');

  if (import.meta.env.DEV) Object.assign(window, { view: { camera, controls, lava, site } });

  const ground = (p: THREE.Vector3) => terrain.groundAt(p.x + extent / 2, extent / 2 - p.z);
  let loaded = false;
  renderer.setAnimationLoop(() => {
    controls.update();
    const floor = ground(camera.position) + MIN_AGL;
    if (camera.position.y < floor) camera.position.y = floor;
    terrainView.update(camera.position, camera.position.y - ground(camera.position));
    ventMarks.visible = showVents();
    renderer.render(scene, camera);
    labels.render(scene, camera);
    if (ventMarks.visible) declutter();
    if (!loaded) {
      loaded = true;
      document.getElementById('loading')!.classList.add('done');
    }
  });
}

boot().catch((err) => {
  console.error(err);
  document.querySelector('.loading-line')!.textContent = `No se pudo cargar la isla: ${err instanceof Error ? err.message : err}`;
});
