/**
 * Mutable, render-free state shared between the pinned hero timeline (GSAP),
 * the R3F scene (useFrame), the SVG fallback and the infinite canvas.
 * Never put this in React state — it changes every frame.
 */
export const PHASES = {
  introEnd: 0.06,
  sketchEnd: 0.55,
  buildEnd: 0.72,
  curtainEnd: 0.88,
  interactive: 0.8,
  stopRender: 0.9,
};

export const heroState = {
  /** Smoothed master timeline progress 0 → 1. */
  progress: 0,
  /** Damped values computed by the scene director. */
  sketch: 0,
  build: 0,
  /** Stage is on screen (set by ScrollTrigger / IntersectionObserver). */
  inView: true,
  /** The pinned ScrollTrigger (used for "Projects" navigation). */
  trigger: null,
  /** Normalised pointer (-1 → 1) for subtle camera parallax. */
  pointer: { x: 0, y: 0 },
  /** Current pen sample (paper units) — see sketchPaths.samplePen. */
  pen: { x: 1292, y: 742, lift: 0, ink: 0, drawing: false, layer: null },
  /** Pencil tip target in world space (a THREE.Vector3, created by the scene). */
  penWorld: null,
  /** Graphite drawn so far (paper units of stroke length). */
  ink: 0,
  /** Render quality chosen at mount. */
  quality: 'high',
  /** When true the next frames are forced (e.g. after resize). */
  needsRender: true,
  /** Shaders compiled and textures uploaded — rendering may start. */
  sceneReady: false,
};

export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const range = (v, a, b) => clamp01((v - a) / (b - a));

export function sketchProgress(p = heroState.progress) {
  return range(p, PHASES.introEnd, PHASES.sketchEnd);
}

export function buildProgress(p = heroState.progress) {
  return range(p, PHASES.sketchEnd, PHASES.buildEnd);
}

export function shouldRenderHero() {
  if (typeof document !== 'undefined' && document.hidden) return false;
  if (!heroState.inView) return false;
  return heroState.progress < PHASES.stopRender || heroState.needsRender;
}

/** Shared state for the infinite canvas (read inside its ticker). */
export const canvasState = {
  /** Page-scroll drift added to the canvas offset (px). */
  scrollX: 0,
  scrollY: 0,
  /** Stage gallery accepts pointer input. */
  interactive: false,
  /** The stage gallery is visible at all (skip work while fully covered). */
  visible: false,
  /** Overlay / explore mode open — freeze the stage canvas. */
  frozen: false,
};
