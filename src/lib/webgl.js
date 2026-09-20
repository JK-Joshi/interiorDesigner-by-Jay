/**
 * Decides whether the home hero runs the 3D scene or the SVG sketch.
 *
 * - Cheap checks (memory, cores, Save-Data, screen) run synchronously.
 * - The GPU probe creates one throwaway WebGL context and rejects software
 *   rasterisers (SwiftShader, llvmpipe, Basic Render Driver): they can technically
 *   draw the scene, but at single-digit frame rates. It runs in a worker on an
 *   OffscreenCanvas: the first WebGL context of a page costs 150–600 ms of blocking
 *   GPU-process start-up, and doing it off the main thread also warms the GPU
 *   process, so the scene's own context is created in a few milliseconds.
 * - The answer is kept for the session.
 *
 * QA override: add ?hero=3d or ?hero=svg to any URL (also kept for the session).
 */
const MODE_KEY = 'rust:hero-mode';
const OVERRIDE_KEY = 'rust:hero-override';
const SOFTWARE_RENDERER = /swiftshader|llvmpipe|softpipe|software|basic render|mesa offscreen/i;

function storageGet(key) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key, value) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* private mode — the probe simply runs again next time */
  }
}

const isMode = (value) => value === '3d' || value === 'svg';

/** '3d' | 'svg' | null — forced via ?hero=… */
export function heroOverride() {
  if (typeof window === 'undefined') return null;
  const fromQuery = new URLSearchParams(window.location.search).get('hero');
  if (isMode(fromQuery)) {
    storageSet(OVERRIDE_KEY, fromQuery);
    return fromQuery;
  }
  const stored = storageGet(OVERRIDE_KEY);
  return isMode(stored) ? stored : null;
}

/** Synchronous, context-free capability check → 'high' | 'low' | 'none'. */
export function heroQuality() {
  if (typeof window === 'undefined') return 'none';
  const hasWebGL = 'WebGL2RenderingContext' in window || 'WebGLRenderingContext' in window;
  const nav = window.navigator;
  const lowMemory = typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 2;
  const lowCpu = typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency <= 2;
  const saveData = Boolean(nav.connection && nav.connection.saveData);
  if (!hasWebGL || lowMemory || lowCpu || saveData) return 'none';
  const small = window.matchMedia('(max-width: 900px), (pointer: coarse)').matches;
  return small ? 'low' : 'high';
}

/** The session's known hero mode, without probing. */
export function knownHeroMode() {
  const forced = heroOverride();
  if (forced) return forced;
  const stored = storageGet(MODE_KEY);
  return isMode(stored) ? stored : null;
}

/** Remember a decision (e.g. the scene turned out too slow on this device). */
export function rememberHeroMode(mode) {
  if (isMode(mode)) storageSet(MODE_KEY, mode);
}

const CONTEXT_ATTRS = { failIfMajorPerformanceCaveat: true, antialias: false, depth: false, stencil: false };
const PROBE_TIMEOUT = 5000;

/**
 * Returns the renderer string, or null when no (acceptable) context could be created.
 * Self-contained (it is also stringified into the worker) — only params and globals.
 */
function readRenderer(canvas, attrs) {
  const gl = canvas.getContext('webgl2', attrs) || canvas.getContext('webgl', attrs);
  if (!gl) return null;
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  const renderer = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER) || '');
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return renderer;
}

const WORKER_SOURCE = `
self.onmessage = () => {
  let renderer = null;
  try {
    if (typeof OffscreenCanvas !== 'undefined') {
      renderer = (${readRenderer.toString()})(new OffscreenCanvas(1, 1), ${JSON.stringify(CONTEXT_ATTRS)});
    }
  } catch (error) {
    renderer = null;
  }
  self.postMessage({ renderer });
};
`;

/** Worker probe → renderer string, or null if the worker can't tell (no OffscreenCanvas WebGL). */
function probeInWorker() {
  return new Promise((resolve) => {
    let worker = null;
    let url = '';
    let timer = 0;
    const finish = (value) => {
      window.clearTimeout(timer);
      worker?.terminate();
      if (url) URL.revokeObjectURL(url);
      resolve(value);
    };
    try {
      if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') {
        resolve(null);
        return;
      }
      url = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: 'text/javascript' }));
      worker = new Worker(url);
      worker.onmessage = (event) => finish(event.data?.renderer ?? null);
      worker.onerror = () => finish(null);
      timer = window.setTimeout(() => finish(null), PROBE_TIMEOUT);
      worker.postMessage(0);
    } catch {
      finish(null);
    }
  });
}

function probeOnMainThread() {
  try {
    return readRenderer(document.createElement('canvas'), CONTEXT_ATTRS);
  } catch {
    return null;
  }
}

/** Probes the GPU once per session → Promise<'3d' | 'svg'>. */
export async function probeHeroMode() {
  const known = knownHeroMode();
  if (known) return known;
  // A null from the worker is ambiguous (older browsers lack WebGL in workers), so
  // only the main-thread probe may conclude that WebGL is unavailable.
  const renderer = (await probeInWorker()) ?? probeOnMainThread();
  const mode = renderer !== null && !SOFTWARE_RENDERER.test(renderer) ? '3d' : 'svg';
  rememberHeroMode(mode);
  return mode;
}
