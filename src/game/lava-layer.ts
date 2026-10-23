// The lava field painted over the terrain: IGME's polygons drawn into one canvas texture over the
// field's box, which the terrain material (terrain-view.ts) samples by site position and blends
// over the photo. Each episode has its own colour, its cones a darker shade of it, and the ash a
// faint veil. Changing what shows redraws the canvas; the uniforms are shared, so every chunk follows.

import * as THREE from 'three';
import { bounds, type LavaFeature } from '../sim/lava';

/** Lava colours by episode, then the ash (episode 0). */
export const EPISODE_COLOURS: Record<number, string> = { 1: '#ff7a1a', 2: '#e2321c', 3: '#ffc533', 0: '#9a8fa8' };
const CONE_SHADE = 0.55;
const MARGIN_M = 500;
const CANVAS_PX = 4096;

export interface LavaOverlay {
  uniforms: Record<string, THREE.IUniform>;
  /** Declarations and `vec3 lavaOver(vec3 colour, vec3 scenePos)` for the terrain shader. */
  glsl: string;
}

const GLSL = `
uniform sampler2D lavaMap;
uniform vec4 lavaRect;
uniform float lavaHalfE;
uniform float lavaOpacity;
vec3 lavaOver(vec3 c, vec3 p) {
  vec2 uv = (vec2(p.x + lavaHalfE, lavaHalfE - p.z) - lavaRect.xy) / lavaRect.zw;
  if (lavaOpacity <= 0.0 || any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) return c;
  vec4 l = texture2D(lavaMap, uv);
  return mix(c, l.rgb, l.a * lavaOpacity);
}`;

export class LavaLayer implements LavaOverlay {
  readonly glsl = GLSL;
  readonly uniforms: Record<string, THREE.IUniform>;
  /** Which episodes show (0 = the ash). */
  readonly shown: Record<number, boolean> = { 1: true, 2: true, 3: true, 0: false };
  private readonly canvas = document.createElement('canvas');
  private readonly texture: THREE.CanvasTexture;
  private readonly box: [number, number, number, number];

  constructor(private readonly features: LavaFeature[], extent: number) {
    const [x0, y0, x1, y1] = bounds(features);
    this.box = [x0 - MARGIN_M, y0 - MARGIN_M, x1 + MARGIN_M, y1 + MARGIN_M];
    const w = this.box[2] - this.box[0], h = this.box[3] - this.box[1];
    this.canvas.width = CANVAS_PX;
    this.canvas.height = Math.round((CANVAS_PX * h) / w);
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 8;
    this.uniforms = {
      lavaMap: { value: this.texture },
      lavaRect: { value: new THREE.Vector4(this.box[0], this.box[1], w, h) },
      lavaHalfE: { value: extent / 2 },
      lavaOpacity: { value: 0.6 },
    };
    this.draw();
  }

  set opacity(v: number) { this.uniforms.lavaOpacity.value = v; }
  get opacity(): number { return this.uniforms.lavaOpacity.value as number; }

  /** Repaints the canvas from `shown`: ash first, then the episodes in order, each with an outline. */
  draw(): void {
    const ctx = this.canvas.getContext('2d')!;
    const [bx0, , , by1] = this.box;
    const s = this.canvas.width / (this.box[2] - this.box[0]);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const order = [0, 1, 2, 3].filter((e) => this.shown[e]);
    for (const episode of order) {
      for (const f of this.features.filter((g) => g.episode === episode)) {
        ctx.beginPath();
        for (const ring of f.rings) {
          for (let i = 0; i < ring.length; i += 2) {
            const px = (ring[i] - bx0) * s, py = (by1 - ring[i + 1]) * s;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.closePath();
        }
        const colour = new THREE.Color(EPISODE_COLOURS[episode]);
        if (f.kind === 'cone') colour.multiplyScalar(CONE_SHADE);
        ctx.fillStyle = `#${colour.getHexString()}`;
        ctx.globalAlpha = f.kind === 'ash' ? 0.35 : 0.9;
        ctx.fill('evenodd');
        ctx.globalAlpha = 1;
        ctx.strokeStyle = 'rgba(255, 244, 230, 0.9)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
    this.texture.needsUpdate = true;
  }
}
