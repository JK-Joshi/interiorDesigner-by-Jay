import { CanvasTexture, DataTexture, MeshToonMaterial, NearestFilter, RedFormat, SRGBColorSpace, RepeatWrapping } from 'three';

const gradients = new Map();

/**
 * Stepped gradient map for MeshToonMaterial (3–4 flat light bands → vector look).
 */
export function getToonGradient(steps = 4) {
  if (gradients.has(steps)) return gradients.get(steps);
  const ramps = {
    3: [96, 178, 255],
    4: [72, 138, 204, 255],
    paper: [196, 232, 255],
  };
  const ramp = ramps[steps] || ramps[4];
  const data = new Uint8Array(ramp);
  const texture = new DataTexture(data, ramp.length, 1, RedFormat);
  texture.minFilter = NearestFilter;
  texture.magFilter = NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  gradients.set(steps, texture);
  return texture;
}

/** Scene palette (sRGB hex — three converts to linear). */
export const TONES = {
  floor: '#211a16',
  rug: '#3a2e27',
  oak: '#c89b69',
  walnut: '#6b4a34',
  walnutDark: '#4a3224',
  paper: '#f5efe5',
  bone: '#f2ece3',
  linen: '#e6dccd',
  rust: '#b7472a',
  rustDark: '#7e2f1c',
  brass: '#c29f62',
  espresso: '#2e2520',
  espressoLight: '#3d312a',
  sage: '#737860',
  sageDark: '#565a47',
  skin: '#c68a63',
  skinShade: '#a8704f',
  hair: '#1f1814',
  graphite: '#3b3835',
  stone: '#a89a8a',
  marble: '#ebe6de',
  blueprint: '#c7d0d0',
  shade: '#b7472a',
  outline: '#120f0d',
};

function marbleTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = TONES.marble;
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = 'rgba(120, 110, 100, 0.55)';
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 7; i += 1) {
    ctx.beginPath();
    let x = Math.random() * 256;
    let y = 0;
    ctx.moveTo(x, y);
    while (y < 256) {
      x += (Math.random() - 0.5) * 26;
      y += 18 + Math.random() * 12;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.wrapS = RepeatWrapping;
  t.wrapT = RepeatWrapping;
  return t;
}

let cache = null;

/** Shared toon materials (created once per page load). */
export function getMaterials() {
  if (cache) return cache;
  const g4 = getToonGradient(4);
  const g3 = getToonGradient(3);
  const make = (color, extra = {}) => new MeshToonMaterial({ color, gradientMap: g4, ...extra });
  cache = {
    floor: make(TONES.floor, { gradientMap: g3 }),
    rug: make(TONES.rug, { gradientMap: g3 }),
    oak: make(TONES.oak),
    walnut: make(TONES.walnut),
    walnutDark: make(TONES.walnutDark),
    bone: make(TONES.bone),
    linen: make(TONES.linen),
    rust: make(TONES.rust),
    rustDark: make(TONES.rustDark),
    brass: make(TONES.brass, { gradientMap: g3 }),
    espresso: make(TONES.espresso),
    espressoLight: make(TONES.espressoLight),
    sage: make(TONES.sage),
    sageDark: make(TONES.sageDark),
    skin: make(TONES.skin),
    hair: make(TONES.hair, { gradientMap: g3 }),
    graphite: make(TONES.graphite),
    stone: make(TONES.stone),
    blueprint: make(TONES.blueprint),
    marble: make('#ffffff', { map: marbleTexture() }),
    shadeInner: make('#f6e2c4', { side: 1, emissive: '#ffb56b', emissiveIntensity: 0.35 }),
    bulb: new MeshToonMaterial({ color: '#fff1d6', emissive: '#ffd9a0', emissiveIntensity: 1.6, gradientMap: g3 }),
    eye: new MeshToonMaterial({ color: '#15110e', gradientMap: g3 }),
    white: make('#fbf8f3'),
  };
  return cache;
}
