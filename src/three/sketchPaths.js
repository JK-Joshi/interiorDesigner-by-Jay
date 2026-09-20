/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  THE SKETCH — an apartment floor plan as ordered pencil strokes.
 *
 *  Coordinates are "paper units": the sheet is 1414 × 1000 (A-series landscape),
 *  origin top-left, y down. Normalised paper coordinates are (x / 1414, y / 1000).
 *
 *  Layers are drawn in order:
 *    outer walls → inner walls → door swings → windows → furniture →
 *    dimensions → room labels (hand-lettered) → signature "Rust."
 *
 *  The same data drives: the canvas texture on the 3D paper, the IK pencil target,
 *  the extruded 3D model (PlanModel) and the SVG fallback (SketchFallback).
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const PAPER_UNITS = { width: 1414, height: 1000 };
export const REST_POINT = [1292, 742];

const { PI, sin, cos, atan2, hypot, min, max, ceil, abs } = Math;
const deg = (d) => (d * PI) / 180;

// Deterministic pseudo-random (mulberry32).
function rng(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Primitive builders (each returns a polyline: [[x, y], …]) ────────────────
const line = (x1, y1, x2, y2) => [
  [x1, y1],
  [x2, y2],
];
const rect = (x1, y1, x2, y2) => [
  [x1, y1],
  [x2, y1],
  [x2, y2],
  [x1, y2],
  [x1, y1],
];

function arc(cx, cy, rx, ry, a0, a1, segments) {
  const n = segments ?? max(6, ceil(abs(a1 - a0) / (PI / 20)));
  const pts = [];
  for (let i = 0; i <= n; i += 1) {
    const a = a0 + ((a1 - a0) * i) / n;
    pts.push([cx + rx * cos(a), cy + ry * sin(a)]);
  }
  return pts;
}

const circle = (cx, cy, r) => arc(cx, cy, r, r, -PI / 2, PI * 1.5);
const ellipse = (cx, cy, rx, ry) => arc(cx, cy, rx, ry, -PI / 2, PI * 1.5);

function roundRect(x1, y1, x2, y2, r) {
  return [
    ...arc(x1 + r, y1 + r, r, r, PI, PI * 1.5, 4),
    ...arc(x2 - r, y1 + r, r, r, PI * 1.5, PI * 2, 4),
    ...arc(x2 - r, y2 - r, r, r, 0, PI / 2, 4),
    ...arc(x1 + r, y2 - r, r, r, PI / 2, PI, 4),
    [x1, y1 + r],
  ];
}

function spline(points, samples = 8) {
  const out = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    for (let s = 0; s < samples; s += 1) {
      const t = s / samples;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

// ── Single-stroke lettering (cap height 14, y down, per-glyph advance) ───────
const garc = (cx, cy, rx, ry, a0, a1) => arc(cx, cy, rx, ry, deg(a0), deg(a1), max(5, ceil(abs(a1 - a0) / 15)));

const FONT = {
  A: { w: 10, p: [[[0, 14], [5, 0], [10, 14]], [[2.2, 8.6], [7.8, 8.6]]] },
  B: {
    w: 9.5,
    p: [
      [[0, 14], [0, 0], [5, 0], ...garc(5, 3.5, 3.6, 3.5, -90, 90), [0, 7]],
      [[0, 7], [5.6, 7], ...garc(5.6, 10.5, 3.8, 3.5, -90, 90), [0, 14]],
    ],
  },
  C: { w: 10, p: [garc(5.4, 7, 4.8, 7, -40, -320)] },
  D: { w: 10, p: [[[0, 0], [0, 14]], [[0, 0], [3.2, 0], ...garc(3.2, 7, 6.4, 7, -90, 90), [0, 14]]] },
  E: { w: 8.5, p: [[[8.5, 0], [0, 0], [0, 14], [8.5, 14]], [[0, 7], [7, 7]]] },
  F: { w: 8.5, p: [[[8.5, 0], [0, 0], [0, 14]], [[0, 7], [7, 7]]] },
  G: { w: 10.5, p: [[...garc(5.4, 7, 5, 7, -40, -360), [10.4, 14]], [[10.4, 7.4], [6.2, 7.4]]] },
  H: { w: 10, p: [[[0, 0], [0, 14]], [[10, 0], [10, 14]], [[0, 7], [10, 7]]] },
  I: { w: 2, p: [[[1, 0], [1, 14]]] },
  J: { w: 8, p: [[[7.5, 0], [7.5, 10], ...garc(4, 10, 3.5, 4, 0, 180)]] },
  K: { w: 9.5, p: [[[0, 0], [0, 14]], [[9.2, 0], [0, 8.6]], [[3, 5.8], [9.6, 14]]] },
  L: { w: 8, p: [[[0, 0], [0, 14], [8, 14]]] },
  M: { w: 12, p: [[[0, 14], [0, 0], [6, 10], [12, 0], [12, 14]]] },
  N: { w: 10, p: [[[0, 14], [0, 0], [10, 14], [10, 0]]] },
  O: { w: 11, p: [garc(5.5, 7, 5.5, 7, -90, 270)] },
  P: { w: 9, p: [[[0, 14], [0, 0], [5.2, 0], ...garc(5.2, 3.8, 3.8, 3.8, -90, 90), [0, 7.6]]] },
  Q: { w: 11, p: [garc(5.5, 7, 5.5, 7, -90, 270), [[6.6, 9.6], [11.2, 14.6]]] },
  R: { w: 9.5, p: [[[0, 14], [0, 0], [5.2, 0], ...garc(5.2, 3.8, 3.8, 3.8, -90, 90), [0, 7.6]], [[4.4, 7.6], [9.6, 14]]] },
  S: { w: 9.5, p: [[...garc(4.8, 3.6, 4.2, 3.6, -20, -270), ...garc(4.8, 10.6, 4.6, 3.4, -90, 160)]] },
  T: { w: 10, p: [[[0, 0], [10, 0]], [[5, 0], [5, 14]]] },
  U: { w: 10, p: [[[0, 0], [0, 9.4], ...garc(5, 9.4, 5, 4.6, 180, 0), [10, 0]]] },
  V: { w: 10, p: [[[0, 0], [5, 14], [10, 0]]] },
  W: { w: 13, p: [[[0, 0], [3, 14], [6.5, 3.5], [10, 14], [13, 0]]] },
  X: { w: 10, p: [[[0, 0], [10, 14]], [[10, 0], [0, 14]]] },
  Y: { w: 10, p: [[[0, 0], [5, 7], [10, 0]], [[5, 7], [5, 14]]] },
  Z: { w: 10, p: [[[0, 0], [10, 0], [0, 14], [10, 14]]] },
  0: { w: 9, p: [garc(4.5, 7, 4.5, 7, -90, 270)] },
  1: { w: 6, p: [[[0.5, 3], [4, 0], [4, 14]]] },
  2: { w: 9, p: [[...garc(4.5, 4.2, 4.3, 4.2, -165, 35), [0, 14], [9, 14]]] },
  3: { w: 9, p: [[...garc(4.3, 3.5, 4, 3.5, -150, 90), ...garc(4.3, 10.5, 4.5, 3.5, -90, 150)]] },
  4: { w: 9.5, p: [[[7, 14], [7, 0], [0, 10], [9.5, 10]]] },
  5: { w: 9, p: [[[8.5, 0], [1.2, 0], [0.6, 6.2], ...garc(4.4, 9.6, 4.4, 4.4, -125, 150)]] },
  6: { w: 9, p: [[[7.6, 0.4], [3, 4.4], ...garc(4.5, 9.7, 4.2, 4.3, 200, 560)]] },
  7: { w: 9, p: [[[0, 0], [9, 0], [3, 14]]] },
  8: { w: 9, p: [garc(4.5, 3.4, 3.7, 3.4, 90, 450), garc(4.5, 10.5, 4.3, 3.5, -90, 270)] },
  9: { w: 9, p: [[...garc(4.5, 4.4, 4.3, 4.4, 20, 380), [8.4, 9], [5, 14]]] },
  '.': { w: 2, p: [garc(1, 13.2, 0.8, 0.8, 0, 360)] },
  ':': { w: 2, p: [garc(1, 4.5, 0.8, 0.8, 0, 360), garc(1, 13.2, 0.8, 0.8, 0, 360)] },
  '-': { w: 7, p: [[[0.5, 8], [6.5, 8]]] },
  '/': { w: 6, p: [[[0, 14], [6, 0]]] },
  ' ': { w: 5, p: [] },
};

/**
 * Hand-lettered text → strokes. (x, y) is the top-left of the caps box unless
 * align = 'center' (then x is the centre). `rotate` turns the whole word around its centre.
 */
function lettering(str, x, y, size, { align = 'left', rotate = 0, seed = 1, tracking = 0.34 } = {}) {
  const r = rng(seed);
  const scale = size / 14;
  const chars = str.toUpperCase().split('');
  const advance = (ch) => ((FONT[ch]?.w ?? 8) + tracking * 14) * scale;
  const width = chars.reduce((acc, ch) => acc + advance(ch), 0) - tracking * size;
  let cursor = align === 'center' ? x - width / 2 : x;
  const cx = align === 'center' ? x : x + width / 2;
  const cy = y + size / 2;
  const strokes = [];
  chars.forEach((ch) => {
    const glyph = FONT[ch];
    if (!glyph) {
      cursor += advance(ch);
      return;
    }
    const tilt = (r() - 0.5) * 0.06;
    const dy = (r() - 0.5) * size * 0.06;
    glyph.p.forEach((poly) => {
      const pts = poly.map(([gx, gy]) => {
        // slight per-glyph tilt + baseline wobble → hand-lettered feel
        const lx = gx * scale;
        const ly = gy * scale;
        const tx = lx + (ly - size / 2) * tilt;
        let px = cursor + tx;
        let py = y + ly + dy;
        if (rotate) {
          const ox = px - cx;
          const oy = py - cy;
          px = cx + ox * cos(rotate) - oy * sin(rotate);
          py = cy + ox * sin(rotate) + oy * cos(rotate);
        }
        return [px, py];
      });
      strokes.push(pts);
    });
    cursor += advance(ch);
  });
  return strokes;
}

// ── The plan ─────────────────────────────────────────────────────────────────
// Wall rectangles [x1, y1, x2, y2] (openings are gaps between segments).
export const WALLS = {
  outer: [
    // top (y 150–166)
    [140, 150, 230, 166],
    [370, 150, 500, 166],
    [560, 150, 660, 166],
    [800, 150, 910, 166],
    [1030, 150, 1080, 166],
    // bottom (y 804–820)
    [140, 804, 220, 820],
    [540, 804, 650, 820],
    [810, 804, 960, 820],
    [1040, 804, 1080, 820],
    // left (x 140–156)
    [140, 166, 156, 230],
    [140, 360, 156, 520],
    [140, 740, 156, 804],
    // right (x 1064–1080)
    [1064, 166, 1080, 240],
    [1064, 340, 1080, 804],
  ],
  inner: [
    [456, 166, 464, 196],
    [456, 252, 464, 346],
    [456, 406, 464, 444],
    [464, 306, 596, 314],
    [596, 166, 604, 436],
    [856, 166, 864, 436],
    [856, 444, 864, 560],
    [856, 760, 864, 804],
    [156, 436, 380, 444],
    [440, 436, 620, 444],
    [680, 436, 900, 444],
    [1020, 436, 1064, 444],
  ],
  columns: [[590, 610, 610, 630]],
};

// Furniture blocks for the 3D model: [x1, y1, x2, y2, height (world), tone]
export const BLOCKS = [
  [225, 172, 375, 362, 0.0048, 'linen'],
  [700, 196, 850, 344, 0.0048, 'linen'],
  [398, 522, 452, 738, 0.0056, 'sage'],
  [452, 522, 476, 738, 0.0095, 'sage'],
  [690, 540, 770, 720, 0.0072, 'oak'],
  [868, 170, 1060, 204, 0.0092, 'bone'],
  [1026, 204, 1060, 400, 0.0092, 'bone'],
  [910, 292, 990, 340, 0.0092, 'oak'],
  [568, 320, 592, 432, 0.0175, 'walnut'],
  [474, 280, 556, 302, 0.008, 'bone'],
  [162, 560, 186, 700, 0.0055, 'walnut'],
  [270, 590, 340, 670, 0.0042, 'marble'],
  [1034, 560, 1058, 700, 0.0072, 'oak'],
  [608, 210, 640, 330, 0.0072, 'oak'],
  [656, 556, 682, 582, 0.0052, 'rust'],
  [656, 617, 682, 643, 0.0052, 'rust'],
  [656, 678, 682, 704, 0.0052, 'rust'],
  [778, 556, 804, 582, 0.0052, 'rust'],
  [778, 617, 804, 643, 0.0052, 'rust'],
  [778, 678, 804, 704, 0.0052, 'rust'],
  [717, 506, 743, 532, 0.0052, 'rust'],
  [717, 728, 743, 754, 0.0052, 'rust'],
];

// Plants for the 3D model: [x, y, radius]
export const PLANTS = [
  [570, 480, 16],
  [180, 780, 14],
  [890, 780, 14],
  [236, 836, 10],
  [524, 836, 10],
];

/** Potted plant: a small pot ring with five leaf outlines radiating from it. */
function plant(cx, cy, r) {
  const leaves = [];
  for (let i = 0; i < 5; i += 1) {
    const a = deg(-90 + i * 72 + (i % 2) * 9);
    const dx = cos(a);
    const dy = sin(a);
    const nx = -dy;
    const ny = dx;
    const at = (along, side) => [cx + dx * r * along + nx * r * side, cy + dy * r * along + ny * r * side];
    leaves.push(spline([at(0.45, 0), at(0.9, 0.3), at(1.5, 0.02), at(0.9, -0.3), at(0.45, 0)], 4));
  }
  return [circle(cx, cy, r * 0.5), ...leaves];
}

const chair = (x1, y1, x2, y2) => roundRect(x1, y1, x2, y2, 4);

function windowLines(orientation, a, b, c1, c2) {
  const mid = (c1 + c2) / 2;
  if (orientation === 'h') return [line(a, c1, b, c1), line(a, mid, b, mid), line(a, c2, b, c2)];
  return [line(c1, a, c1, b), line(mid, a, mid, b), line(c2, a, c2, b)];
}

function dimensionH(y, xs, labels, seed) {
  const strokes = [line(xs[0], y, xs[xs.length - 1], y)];
  xs.forEach((x) => {
    strokes.push(line(x, y + 8, x, y + 32));
    strokes.push(line(x - 5, y + 5, x + 5, y - 5));
  });
  labels.forEach((label, i) => {
    const mid = (xs[i] + xs[i + 1]) / 2;
    strokes.push(...lettering(label, mid, y - 20, 11, { align: 'center', seed: seed + i }));
  });
  return strokes;
}

function dimensionV(x, ys, labels, seed) {
  const strokes = [line(x, ys[0], x, ys[ys.length - 1])];
  ys.forEach((y) => {
    strokes.push(line(x + 8, y, x + 32, y));
    strokes.push(line(x - 5, y + 5, x + 5, y - 5));
  });
  labels.forEach((label, i) => {
    const mid = (ys[i] + ys[i + 1]) / 2;
    strokes.push(...lettering(label, x - 13, mid - 5.5, 11, { align: 'center', rotate: -PI / 2, seed: seed + i }));
  });
  return strokes;
}

function signature() {
  const ox = 985;
  const oy = 878;
  const k = 1.3;
  const map = (pts) => pts.map(([x, y]) => [ox + x * k, oy + y * k]);
  const main = spline(
    [
      [6, 36], [9, 20], [12, 6], [15, 2], [22, 2], [28, 6], [27, 13], [19, 18], [13, 19], [20, 21],
      [26, 28], [31, 34], [35, 33], [37, 26], [38, 22], [38, 30], [41, 34], [46, 32], [49, 24],
      [48, 30], [50, 34], [54, 33], [57.5, 28], [60.5, 23.5], [62.5, 27], [64, 30.5], [62.4, 34],
      [58.2, 34.2], [61, 33.4], [66, 31.5], [70, 28], [74, 20], [75, 8], [74, 20], [74, 32], [78, 34], [83, 30],
    ],
    6,
  );
  return [
    map(main),
    map(spline([[67, 17], [74, 15.5], [82, 14]], 5)),
    map(circle(88.5, 32.5, 1.4)),
    map(spline([[2, 41], [30, 43], [60, 41], [92, 37]], 8)),
  ];
}

function buildLayers() {
  const outer = WALLS.outer.map((w) => ({ pts: rect(...w), fill: 0.55 }));
  const inner = [...WALLS.inner, ...WALLS.columns].map((w) => ({ pts: rect(...w), fill: 0.42 }));
  inner.push({ pts: line(590, 610, 610, 630) }, { pts: line(610, 610, 590, 630) });

  const doors = [
    line(440, 440, 440, 380),
    arc(440, 440, 60, 60, PI, PI * 1.5),
    line(460, 196, 516, 196),
    arc(460, 196, 56, 56, PI / 2, 0),
    line(460, 406, 520, 406),
    arc(460, 406, 60, 60, PI * 1.5, PI * 2),
    line(620, 440, 620, 380),
    arc(620, 440, 60, 60, 0, -PI / 2),
    line(960, 812, 960, 732),
    arc(960, 812, 80, 80, 0, -PI / 2),
    line(220, 810, 392, 810),
    line(368, 815, 540, 815),
    line(220, 804, 220, 820),
    line(540, 804, 540, 820),
  ].map((pts) => ({ pts }));

  const windows = [
    ...windowLines('h', 230, 370, 150, 166),
    ...windowLines('h', 500, 560, 150, 166),
    ...windowLines('h', 660, 800, 150, 166),
    ...windowLines('h', 910, 1030, 150, 166),
    ...windowLines('h', 650, 810, 804, 820),
    ...windowLines('v', 230, 360, 140, 156),
    ...windowLines('v', 520, 740, 140, 156),
    ...windowLines('v', 240, 340, 1064, 1080),
  ].map((pts) => ({ pts }));

  const furniture = [
    // master bedroom
    rect(225, 172, 375, 362),
    roundRect(235, 180, 295, 208, 6),
    roundRect(305, 180, 365, 208, 6),
    spline([[225, 238], [262, 232], [300, 240], [338, 234], [375, 238]], 5),
    line(262, 238, 300, 268),
    rect(188, 176, 218, 206),
    circle(203, 191, 7),
    rect(382, 176, 412, 206),
    circle(397, 191, 7),
    roundRect(170, 380, 206, 416, 8),
    arc(188, 398, 14, 14, PI, PI * 2),
    // bath
    rect(536, 172, 590, 232),
    line(536, 172, 590, 232),
    line(590, 172, 536, 232),
    rect(474, 280, 556, 302),
    ellipse(515, 291, 16, 7),
    rect(565, 290, 589, 302),
    ellipse(577, 276, 10, 13),
    // dress
    rect(470, 320, 560, 340),
    rect(568, 320, 592, 432),
    line(580, 326, 580, 426),
    // bedroom 2
    rect(700, 196, 850, 344),
    roundRect(818, 206, 844, 262, 6),
    roundRect(818, 278, 844, 334, 6),
    spline([[790, 196], [786, 232], [792, 270], [787, 308], [790, 344]], 5),
    rect(820, 170, 850, 192),
    rect(820, 348, 850, 370),
    circle(835, 359, 6),
    rect(608, 210, 640, 330),
    circle(662, 270, 14),
    arc(662, 270, 19, 19, -PI / 2, PI / 2),
    // kitchen
    rect(868, 170, 1060, 204),
    rect(1026, 204, 1060, 400),
    roundRect(930, 176, 990, 198, 4),
    line(960, 176, 960, 198),
    circle(1043, 240, 9),
    circle(1043, 272, 9),
    circle(1043, 312, 7),
    circle(1043, 342, 7),
    rect(868, 208, 906, 262),
    line(868, 256, 906, 256),
    rect(910, 292, 990, 340),
    circle(924, 362, 9),
    circle(950, 362, 9),
    circle(976, 362, 9),
    // living
    rect(240, 552, 370, 708),
    roundRect(270, 590, 340, 670, 10),
    rect(162, 560, 186, 700),
    line(192, 592, 192, 668),
    rect(398, 522, 476, 738),
    line(452, 540, 452, 720),
    line(398, 540, 476, 540),
    line(398, 720, 476, 720),
    line(398, 612, 452, 612),
    line(398, 648, 452, 648),
    roundRect(300, 468, 352, 516, 12),
    arc(326, 492, 20, 20, PI, PI * 2),
    circle(440, 768, 9),
    ...plant(570, 480, 16),
    ...plant(180, 780, 14),
    // dining
    rect(690, 540, 770, 720),
    ellipse(730, 630, 22, 30),
    chair(656, 556, 682, 582),
    chair(656, 617, 682, 643),
    chair(656, 678, 682, 704),
    chair(778, 556, 804, 582),
    chair(778, 617, 804, 643),
    chair(778, 678, 804, 704),
    chair(717, 506, 743, 532),
    chair(717, 728, 743, 754),
    // foyer
    rect(1034, 470, 1058, 540),
    rect(1034, 560, 1058, 700),
    ellipse(960, 640, 55, 40),
    ...plant(890, 780, 14),
    // balcony
    line(200, 850, 560, 850),
    line(200, 856, 560, 856),
    line(200, 820, 200, 856),
    line(560, 820, 560, 856),
    ...plant(236, 836, 10),
    ...plant(524, 836, 10),
    circle(330, 836, 8),
    circle(382, 836, 8),
    circle(356, 836, 5),
  ].map((pts) => ({ pts }));

  const dims = [
    ...dimensionH(112, [140, 460, 600, 860, 1080], ['3200', '1400', '2600', '2200'], 40),
    ...dimensionV(104, [150, 440, 820], ['2900', '3800'], 60),
    // north arrow
    circle(1112, 196, 20),
    line(1112, 220, 1112, 170),
    [[1104, 182], [1112, 170], [1120, 182]],
    ...lettering('N', 1112, 146, 12, { align: 'center', seed: 70 }),
    // scale bar
    line(470, 952, 670, 952),
    line(470, 946, 470, 958),
    line(510, 946, 510, 958),
    line(550, 946, 550, 958),
    line(670, 946, 670, 958),
    ...lettering('0', 470, 928, 9, { align: 'center', seed: 80 }),
    ...lettering('1', 510, 928, 9, { align: 'center', seed: 81 }),
    ...lettering('2', 550, 928, 9, { align: 'center', seed: 82 }),
    ...lettering('5M', 670, 928, 9, { align: 'center', seed: 83 }),
  ].map((pts) => ({ pts }));

  const labels = [
    ...lettering('MASTER BEDROOM', 300, 393, 11, { align: 'center', seed: 101 }),
    ...lettering('BATH', 515, 238, 10, { align: 'center', seed: 102 }),
    ...lettering('DRESS', 530, 417, 9, { align: 'center', seed: 103 }),
    ...lettering('BEDROOM', 740, 386, 12, { align: 'center', seed: 104 }),
    ...lettering('KITCHEN', 950, 398, 11, { align: 'center', seed: 105 }),
    ...lettering('LIVING', 300, 746, 13, { align: 'center', seed: 106 }),
    ...lettering('DINING', 730, 770, 12, { align: 'center', seed: 107 }),
    ...lettering('FOYER', 960, 514, 11, { align: 'center', seed: 108 }),
    ...lettering('BALCONY', 380, 866, 10, { align: 'center', seed: 109 }),
    ...lettering('PLAN - RESIDENCE 01', 140, 914, 16, { seed: 110 }),
    ...lettering('SCALE 1:100', 140, 944, 10, { seed: 111 }),
  ].map((pts) => ({ pts }));

  const sign = signature().map((pts) => ({ pts }));

  return [
    { name: 'outer-walls', width: 3.1, items: outer },
    { name: 'inner-walls', width: 2.3, items: inner },
    { name: 'doors', width: 1.5, items: doors },
    { name: 'windows', width: 1.4, items: windows },
    { name: 'furniture', width: 1.6, items: furniture },
    { name: 'dimensions', width: 1.1, items: dims },
    { name: 'labels', width: 1.55, items: labels },
    { name: 'signature', width: 2.8, items: sign },
  ];
}

/** Greedy nearest-neighbour ordering (reversing strokes when shorter) → natural pen travel. */
function orderStrokes(items, start) {
  const pool = items.slice();
  const out = [];
  let [cx, cy] = start;
  while (pool.length) {
    let best = 0;
    let bestD = Infinity;
    let reverse = false;
    for (let i = 0; i < pool.length; i += 1) {
      const p = pool[i].pts;
      const a = p[0];
      const b = p[p.length - 1];
      const da = hypot(a[0] - cx, a[1] - cy);
      const db = hypot(b[0] - cx, b[1] - cy);
      const closed = hypot(a[0] - b[0], a[1] - b[1]) < 0.5;
      if (da < bestD) {
        bestD = da;
        best = i;
        reverse = false;
      }
      if (!closed && db < bestD) {
        bestD = db;
        best = i;
        reverse = true;
      }
    }
    const item = pool.splice(best, 1)[0];
    const pts = reverse ? item.pts.slice().reverse() : item.pts;
    out.push({ ...item, pts });
    [cx, cy] = pts[pts.length - 1];
  }
  return out;
}

const STEP = 2.4;

/** Resample + jitter + pressure → one stroke record. */
function makeStroke(pts, width, layer, fill, seed) {
  const r = rng(seed * 7919 + 17);
  const phase = r() * 10;
  const resampled = [];
  for (let i = 0; i < pts.length - 1; i += 1) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[i + 1];
    const len = hypot(x2 - x1, y2 - y1);
    const n = max(1, ceil(len / STEP));
    for (let k = 0; k < n; k += 1) {
      resampled.push([x1 + ((x2 - x1) * k) / n, y1 + ((y2 - y1) * k) / n]);
    }
  }
  resampled.push(pts[pts.length - 1]);

  const count = resampled.length;
  const xy = new Float32Array(count * 2);
  const w = new Float32Array(count);
  const cum = new Float32Array(count);
  let total = 0;
  for (let i = 0; i < count; i += 1) {
    const [x, y] = resampled[i];
    const prev = resampled[max(0, i - 1)];
    const next = resampled[min(count - 1, i + 1)];
    const ang = atan2(next[1] - prev[1], next[0] - prev[0]);
    // perpendicular wobble: low-frequency drift + fine tremor
    const wobble = sin(i * 0.11 + phase) * 0.45 + sin(i * 0.37 + phase * 2) * 0.18 + (r() - 0.5) * 0.3;
    xy[i * 2] = x - sin(ang) * wobble;
    xy[i * 2 + 1] = y + cos(ang) * wobble;
    if (i > 0) total += hypot(xy[i * 2] - xy[i * 2 - 2], xy[i * 2 + 1] - xy[i * 2 - 1]);
    cum[i] = total;
  }
  for (let i = 0; i < count; i += 1) {
    const s = cum[i];
    const taper = 0.5 + 0.5 * min(1, s / 7, (total - s) / 7);
    const pressure = 0.82 + 0.2 * sin(i * 0.19 + phase) + 0.08 * sin(i * 0.051 + phase * 3);
    w[i] = width * pressure * taper;
  }
  return { xy, w, cum, length: total, layer, fill: fill || 0, count, outline: fill ? pts : null };
}

function build() {
  const layers = buildLayers();
  const strokes = [];
  let cursor = REST_POINT;
  let seed = 1;
  layers.forEach((layer) => {
    const ordered = orderStrokes(layer.items, cursor);
    ordered.forEach((item) => {
      strokes.push(makeStroke(item.pts, layer.width, layer.name, item.fill, seed));
      seed += 1;
    });
    const last = ordered[ordered.length - 1].pts;
    cursor = last[last.length - 1];
  });

  // Timeline: travel → draw → travel → draw … → travel back to rest.
  const segments = [];
  let t = 0;
  let ink = 0;
  let px = REST_POINT[0];
  let py = REST_POINT[1];
  const travelCost = (d) => d * 0.32 + 10;
  strokes.forEach((stroke, index) => {
    const sx = stroke.xy[0];
    const sy = stroke.xy[1];
    const d = hypot(sx - px, sy - py);
    const tc = travelCost(d);
    segments.push({ type: 'travel', t0: t, t1: t + tc, from: [px, py], to: [sx, sy], index, ink });
    t += tc;
    stroke.inkStart = ink;
    segments.push({ type: 'draw', t0: t, t1: t + stroke.length, index, ink });
    t += stroke.length;
    ink += stroke.length;
    px = stroke.xy[(stroke.count - 1) * 2];
    py = stroke.xy[(stroke.count - 1) * 2 + 1];
  });
  const dBack = hypot(REST_POINT[0] - px, REST_POINT[1] - py);
  segments.push({
    type: 'travel',
    t0: t,
    t1: t + travelCost(dBack),
    from: [px, py],
    to: REST_POINT,
    index: strokes.length,
    ink,
  });
  t += travelCost(dBack);

  return { strokes, segments, totalTime: t, totalInk: ink };
}

export const SKETCH = build();

const smooth = (u) => u * u * (3 - 2 * u);

function pointOnStroke(stroke, length, out) {
  const { cum, xy, count } = stroke;
  if (length <= 0) {
    out.x = xy[0];
    out.y = xy[1];
    return out;
  }
  if (length >= stroke.length) {
    out.x = xy[(count - 1) * 2];
    out.y = xy[(count - 1) * 2 + 1];
    return out;
  }
  let lo = 0;
  let hi = count - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] <= length) lo = mid;
    else hi = mid;
  }
  const span = cum[hi] - cum[lo] || 1;
  const f = (length - cum[lo]) / span;
  out.x = xy[lo * 2] + (xy[hi * 2] - xy[lo * 2]) * f;
  out.y = xy[lo * 2 + 1] + (xy[hi * 2 + 1] - xy[lo * 2 + 1]) * f;
  return out;
}

/**
 * Pen state at sketch progress p (0 → 1).
 * Returns { x, y, lift (0 = on paper, 1 = raised), ink (drawn length), drawing, layer }.
 */
export function samplePen(p, out = {}) {
  const { segments, totalTime, strokes } = SKETCH;
  const t = Math.min(totalTime, Math.max(0, p * totalTime));
  let lo = 0;
  let hi = segments.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (segments[mid].t1 < t) lo = mid + 1;
    else hi = mid;
  }
  const seg = segments[lo];
  const u = seg.t1 > seg.t0 ? (t - seg.t0) / (seg.t1 - seg.t0) : 1;
  if (seg.type === 'draw') {
    const stroke = strokes[seg.index];
    const len = u * stroke.length;
    pointOnStroke(stroke, len, out);
    out.lift = 0;
    out.ink = seg.ink + len;
    out.drawing = true;
    out.layer = stroke.layer;
  } else {
    const k = smooth(u);
    out.x = seg.from[0] + (seg.to[0] - seg.from[0]) * k;
    out.y = seg.from[1] + (seg.to[1] - seg.from[1]) * k;
    const dist = hypot(seg.to[0] - seg.from[0], seg.to[1] - seg.from[1]);
    const height = min(1, 0.35 + dist / 260);
    out.lift = sin(PI * u) ** 0.7 * height;
    out.ink = seg.ink;
    out.drawing = false;
    out.layer = strokes[min(seg.index, strokes.length - 1)]?.layer;
  }
  return out;
}

export { pointOnStroke };

/** SVG path data for the fallback (one entry per stroke, in drawing order). */
export function toSvgPaths() {
  return SKETCH.strokes.map((stroke) => {
    const parts = [];
    for (let i = 0; i < stroke.count; i += 1) {
      const x = stroke.xy[i * 2].toFixed(1);
      const y = stroke.xy[i * 2 + 1].toFixed(1);
      parts.push(`${i === 0 ? 'M' : 'L'}${x} ${y}`);
    }
    const avgWidth = stroke.w.reduce((a, b) => a + b, 0) / stroke.count;
    return { d: parts.join(''), layer: stroke.layer, length: stroke.length, width: avgWidth, fill: stroke.fill, outline: stroke.outline };
  });
}

