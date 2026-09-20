import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { CanvasTexture, SRGBColorSpace, LinearMipmapLinearFilter, LinearFilter } from 'three';
import { SKETCH, PAPER_UNITS } from './sketchPaths';
import { PAPER } from './sceneConfig';
import { heroState } from './heroState';
import { getMaterials } from './toonGradient';
import { whenFontsReady } from '../lib/gsap';

const PAPER_COLOR = '#f5efe5';
const GRAPHITE = '#3b3835';

/**
 * Renders the floor plan into a 2D canvas up to a given ink length.
 * Moving forward only draws the new segments; moving backward ("erasing")
 * repaints the sheet from the pre-printed base.
 */
function createSketchRenderer(width) {
  const height = Math.round((width * PAPER_UNITS.height) / PAPER_UNITS.width);
  const k = width / PAPER_UNITS.width;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const base = document.createElement('canvas');
  base.width = width;
  base.height = height;
  const bctx = base.getContext('2d');

  // Graphite texture: opaque, slightly varied greys → reads like pencil.
  const grain = document.createElement('canvas');
  grain.width = 64;
  grain.height = 64;
  const gctx = grain.getContext('2d');
  const img = gctx.createImageData(64, 64);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = Math.random();
    const v = n > 0.82 ? 88 + n * 30 : 56 + n * 16;
    img.data[i] = v + 3;
    img.data[i + 1] = v;
    img.data[i + 2] = v - 3;
    img.data[i + 3] = 255;
  }
  gctx.putImageData(img, 0, 0);
  const pattern = ctx.createPattern(grain, 'repeat');

  const { strokes, totalInk } = SKETCH;
  let drawn = 0;

  function drawBase() {
    const u = k;
    bctx.fillStyle = PAPER_COLOR;
    bctx.fillRect(0, 0, width, height);

    // paper fibres
    for (let i = 0; i < 2400; i += 1) {
      bctx.fillStyle = Math.random() > 0.5 ? 'rgba(120, 100, 80, 0.035)' : 'rgba(255, 255, 255, 0.25)';
      bctx.fillRect(Math.random() * width, Math.random() * height, 1 + Math.random() * 2 * u, 1);
    }

    // faint drafting grid
    bctx.lineWidth = Math.max(1, 0.6 * u);
    for (let x = 30; x <= 1170; x += 20) {
      bctx.strokeStyle = (x - 30) % 100 === 0 ? 'rgba(110, 130, 140, 0.14)' : 'rgba(110, 130, 140, 0.07)';
      bctx.beginPath();
      bctx.moveTo(x * u, 30 * u);
      bctx.lineTo(x * u, 970 * u);
      bctx.stroke();
    }
    for (let y = 30; y <= 970; y += 20) {
      bctx.strokeStyle = (y - 30) % 100 === 0 ? 'rgba(110, 130, 140, 0.14)' : 'rgba(110, 130, 140, 0.07)';
      bctx.beginPath();
      bctx.moveTo(30 * u, y * u);
      bctx.lineTo(1170 * u, y * u);
      bctx.stroke();
    }

    // border + title block (pre-printed)
    bctx.strokeStyle = 'rgba(59, 56, 53, 0.85)';
    bctx.lineWidth = 2.2 * u;
    bctx.strokeRect(24 * u, 24 * u, 1366 * u, 952 * u);
    bctx.lineWidth = 0.8 * u;
    bctx.strokeRect(30 * u, 30 * u, 1354 * u, 940 * u);
    bctx.beginPath();
    bctx.moveTo(1170 * u, 30 * u);
    bctx.lineTo(1170 * u, 970 * u);
    [230, 340, 450, 560, 670, 780, 870].forEach((y) => {
      bctx.moveTo(1170 * u, y * u);
      bctx.lineTo(1384 * u, y * u);
    });
    bctx.stroke();

    const cx = 1277 * u;
    bctx.textAlign = 'center';
    bctx.fillStyle = '#b7472a';
    bctx.font = `500 ${70 * u}px "Playfair Display Variable", "Playfair Display", Georgia, serif`;
    bctx.fillText('R', cx, 118 * u);
    bctx.fillStyle = GRAPHITE;
    bctx.font = `500 ${15 * u}px Manrope, sans-serif`;
    if ('letterSpacing' in bctx) bctx.letterSpacing = `${4 * u}px`;
    bctx.fillText('RUST DESIGN STUDIO', cx + 2 * u, 160 * u);
    if ('letterSpacing' in bctx) bctx.letterSpacing = '0px';
    bctx.font = `italic 400 ${19 * u}px "Cormorant Garamond", Georgia, serif`;
    bctx.fillText('Rajkot · Gujarat', cx, 192 * u);

    const fields = [
      ['PROJECT', 'Residence 01', 230],
      ['DRAWING', 'Floor plan — concept', 340],
      ['SCALE', '1 : 100', 450],
      ['SHEET', 'A — 01', 560],
      ['DRAWN BY', 'R. D. S.', 670],
      ['DATE', String(new Date().getFullYear()), 780],
    ];
    fields.forEach(([label, value, y]) => {
      bctx.textAlign = 'left';
      bctx.fillStyle = 'rgba(59, 56, 53, 0.6)';
      bctx.font = `600 ${10 * u}px Manrope, sans-serif`;
      if ('letterSpacing' in bctx) bctx.letterSpacing = `${2.5 * u}px`;
      bctx.fillText(label, 1186 * u, (y + 26) * u);
      if ('letterSpacing' in bctx) bctx.letterSpacing = '0px';
      bctx.fillStyle = GRAPHITE;
      bctx.font = `italic 500 ${24 * u}px "Cormorant Garamond", Georgia, serif`;
      bctx.fillText(value, 1186 * u, (y + 70) * u);
    });
    bctx.textAlign = 'center';
    bctx.fillStyle = 'rgba(59, 56, 53, 0.55)';
    bctx.font = `500 ${9 * u}px Manrope, sans-serif`;
    bctx.fillText('FROM A PENCIL SKETCH', cx, 912 * u);
    bctx.fillText('TO A FINISHED SPACE', cx, 932 * u);
  }

  function findStroke(ink) {
    let lo = 0;
    let hi = strokes.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (strokes[mid].inkStart <= ink) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  }

  function strokePart(stroke, from, to) {
    const { xy, w, cum, count } = stroke;
    if (to <= from) return;
    let i = 0;
    while (i < count - 1 && cum[i + 1] <= from) i += 1;
    const lerpPoint = (idx, len) => {
      const next = Math.min(count - 1, idx + 1);
      const span = cum[next] - cum[idx] || 1;
      const f = Math.min(1, Math.max(0, (len - cum[idx]) / span));
      return [xy[idx * 2] + (xy[next * 2] - xy[idx * 2]) * f, xy[idx * 2 + 1] + (xy[next * 2 + 1] - xy[idx * 2 + 1]) * f];
    };
    const [sx, sy] = lerpPoint(i, from);
    let groupWidth = w[i];
    ctx.beginPath();
    ctx.moveTo(sx * k, sy * k);
    let pending = false;
    const flush = () => {
      ctx.lineWidth = Math.max(0.8, groupWidth * k);
      ctx.stroke();
    };
    for (let j = i + 1; j < count; j += 1) {
      const end = cum[j] >= to;
      const [x, y] = end ? lerpPoint(j - 1, to) : [xy[j * 2], xy[j * 2 + 1]];
      if (Math.abs(w[j] - groupWidth) > 0.18) {
        ctx.lineTo(x * k, y * k);
        flush();
        ctx.beginPath();
        ctx.moveTo(x * k, y * k);
        groupWidth = w[j];
        pending = false;
      } else {
        ctx.lineTo(x * k, y * k);
        pending = true;
      }
      if (end) break;
    }
    if (pending) flush();
  }

  function fillStroke(stroke) {
    if (!stroke.fill || !stroke.outline) return;
    ctx.save();
    ctx.fillStyle = `rgba(59, 56, 53, ${stroke.fill})`;
    ctx.beginPath();
    stroke.outline.forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k)));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawRange(a, b) {
    ctx.strokeStyle = pattern;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let s = findStroke(a); s < strokes.length; s += 1) {
      const stroke = strokes[s];
      if (stroke.inkStart >= b) break;
      const from = Math.max(0, a - stroke.inkStart);
      const to = Math.min(stroke.length, b - stroke.inkStart);
      if (to <= from) continue;
      strokePart(stroke, from, to);
      if (to >= stroke.length - 0.01 && stroke.fill) {
        fillStroke(stroke);
        strokePart(stroke, 0, stroke.length);
      }
    }
  }

  function redraw(ink) {
    ctx.drawImage(base, 0, 0);
    if (ink > 0) drawRange(0, ink);
  }

  drawBase();
  redraw(0);

  return {
    canvas,
    /** @returns {boolean} true when the canvas changed */
    update(ink) {
      const target = Math.min(totalInk, Math.max(0, Math.round(ink * 2) / 2));
      if (Math.abs(target - drawn) < 0.5) return false;
      if (target > drawn) drawRange(drawn, target);
      else redraw(target);
      drawn = target;
      return true;
    },
    rebuildBase() {
      drawBase();
      redraw(drawn);
    },
  };
}

function Tape({ position, rotation }) {
  const m = getMaterials();
  return (
    <mesh position={position} rotation={rotation} material={m.linen}>
      <boxGeometry args={[0.07, 0.0012, 0.022]} />
    </mesh>
  );
}

/**
 * The drawing sheet on the drafting board (board-local coordinates).
 */
export default function SketchPaper({ resolution = 2048 }) {
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);

  const { renderer, texture } = useMemo(() => {
    const r = createSketchRenderer(resolution);
    const t = new CanvasTexture(r.canvas);
    t.colorSpace = SRGBColorSpace;
    t.generateMipmaps = true;
    t.minFilter = LinearMipmapLinearFilter;
    t.magFilter = LinearFilter;
    return { renderer: r, texture: t };
  }, [resolution]);

  useEffect(() => {
    texture.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
    texture.needsUpdate = true;
  }, [gl, texture]);

  useEffect(() => {
    let alive = true;
    whenFontsReady().then(() => {
      if (!alive) return;
      renderer.rebuildBase();
      texture.needsUpdate = true;
      invalidate();
    });
    return () => {
      alive = false;
    };
  }, [renderer, texture, invalidate]);

  useEffect(() => () => texture.dispose(), [texture]);

  useFrame(() => {
    if (renderer.update(heroState.ink)) texture.needsUpdate = true;
  }, -1);

  const hw = PAPER.width / 2;
  const hh = PAPER.height / 2;
  const y = PAPER.y + 0.0004;
  const z = PAPER.offsetZ;

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, PAPER.y, z]} receiveShadow>
        <planeGeometry args={[PAPER.width, PAPER.height]} />
        {/* Unlit so the graphite stays legible under the warm lamp. */}
        <meshBasicMaterial map={texture} color="#efe6d8" toneMapped={false} />
      </mesh>
      <Tape position={[-hw + 0.012, y, z - hh + 0.012]} rotation={[0, Math.PI / 4, 0]} />
      <Tape position={[hw - 0.012, y, z - hh + 0.012]} rotation={[0, -Math.PI / 4, 0]} />
      <Tape position={[-hw + 0.012, y, z + hh - 0.012]} rotation={[0, -Math.PI / 4, 0]} />
      <Tape position={[hw - 0.012, y, z + hh - 0.012]} rotation={[0, Math.PI / 4, 0]} />
    </group>
  );
}
