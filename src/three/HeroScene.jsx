import { startTransition, useEffect, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { gsap } from '../lib/gsap';
import { heroState, shouldRenderHero, sketchProgress, buildProgress, clamp01 } from './heroState';
import { samplePen } from './sketchPaths';
import { CAMERA_KEYS, paperToWorld } from './sceneConfig';
import { damp } from './ik';
import DraftingTable from './DraftingTable';
import SketchPaper from './SketchPaper';
import PlanModel from './PlanModel';
import Props from './Props';
import Designer from './Designer';
import { OutlineSizeSync } from './Outline';
import { warmup } from './warmup';

if (!heroState.penWorld) heroState.penWorld = new Vector3();

const keyPos = CAMERA_KEYS.map((k) => new Vector3(...k.pos));
const keyTarget = CAMERA_KEYS.map((k) => new Vector3(...k.target));
const smoother = (u) => u * u * u * (u * (u * 6 - 15) + 10);

function sampleCamera(p, outPos, outTarget) {
  let i = 0;
  while (i < CAMERA_KEYS.length - 2 && p > CAMERA_KEYS[i + 1].p) i += 1;
  const a = CAMERA_KEYS[i];
  const b = CAMERA_KEYS[i + 1];
  const u = smoother(clamp01((p - a.p) / (b.p - a.p)));
  outPos.lerpVectors(keyPos[i], keyPos[i + 1], u);
  outTarget.lerpVectors(keyTarget[i], keyTarget[i + 1], u);
}

const SLOW_FRAME_SAMPLES = 60;
const SLOW_FRAME_MS = 80;

/**
 * frameloop="demand": we only invalidate once the warm-up is done, while the hero is
 * visible, the tab is active and the curtain has not fully lifted (progress < 0.9).
 * If the device renders at a crawl (median frame > 80 ms) we hand over to the SVG sketch.
 */
function RenderDriver({ onSlow }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const samples = [];
    let rendering = false;
    let decided = !onSlow;
    let readyAt = 0;
    const tick = (time, deltaTime) => {
      if (!heroState.sceneReady) {
        rendering = false;
        return;
      }
      if (!readyAt) readyAt = time;
      if (!decided && rendering && time - readyAt > 1.5 && deltaTime < 1000) {
        samples.push(deltaTime);
        if (samples.length >= SLOW_FRAME_SAMPLES) {
          decided = true;
          const median = samples.sort((a, b) => a - b)[samples.length >> 1];
          if (median > SLOW_FRAME_MS) onSlow();
        }
      }
      rendering = shouldRenderHero();
      if (rendering) invalidate();
    };
    const onVisible = () => {
      if (!document.hidden && heroState.sceneReady) invalidate();
    };
    gsap.ticker.add(tick);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      gsap.ticker.remove(tick);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [invalidate, onSlow]);
  return null;
}

/**
 * Takes over the render call (a positive priority disables R3F's automatic render),
 * so nothing is drawn — and no shader compiled synchronously — before the warm-up.
 */
function Renderer() {
  useFrame(({ gl, scene, camera }) => {
    if (heroState.sceneReady) gl.render(scene, camera);
  }, 1);
  return null;
}

/** Compiles programs and uploads textures in small tasks, then starts rendering. */
function Warmup({ onReady }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const job = { cancelled: false };
    warmup(gl, scene, camera, job)
      .catch(() => {})
      .then(() => {
        if (job.cancelled) return;
        heroState.sceneReady = true;
        invalidate();
        // Reveal once the first real frame is on screen.
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            if (!job.cancelled) onReady?.();
          }),
        );
      });
    return () => {
      job.cancelled = true;
      heroState.sceneReady = false;
    };
  }, [gl, scene, camera, invalidate, onReady]);
  return null;
}

/**
 * Mounts the heavy scene graph in a transition: React builds it in small, interruptible
 * slices instead of one long task (geometry, outline hulls, procedural textures).
 */
function Staged({ children, onReady }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    startTransition(() => setMounted(true));
  }, []);
  if (!mounted) return null;
  return (
    <>
      {children}
      <Warmup onReady={onReady} />
    </>
  );
}

/**
 * Reads the scroll-driven master progress and turns it into damped scene state:
 * sketch progress → pen sample → world IK target, build progress, camera path.
 */
function Director() {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const w = useMemo(
    () => ({
      pos: keyPos[0].clone(),
      target: keyTarget[0].clone(),
      dPos: new Vector3(),
      dTarget: new Vector3(),
      fwd: new Vector3(),
      right: new Vector3(),
      up: new Vector3(0, 1, 0),
      first: true,
    }),
    [],
  );

  useEffect(() => {
    const aspect = size.width / Math.max(1, size.height);
    camera.fov = aspect >= 1.25 ? 30 : aspect >= 0.9 ? 36 : 44;
    camera.updateProjectionMatrix();
    heroState.needsRender = true;
    const t = window.setTimeout(() => {
      heroState.needsRender = false;
    }, 600);
    return () => window.clearTimeout(t);
  }, [camera, size]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const p = heroState.progress;

    const sk = sketchProgress(p);
    heroState.sketch += (sk - heroState.sketch) * (w.first ? 1 : damp(4.5, dt));
    if (Math.abs(sk - heroState.sketch) < 1e-5) heroState.sketch = sk;
    const bd = buildProgress(p);
    heroState.build += (bd - heroState.build) * (w.first ? 1 : damp(3.2, dt));
    if (Math.abs(bd - heroState.build) < 1e-5) heroState.build = bd;

    const pen = samplePen(heroState.sketch, heroState.pen);
    heroState.ink = pen.ink;
    paperToWorld(pen.x, pen.y, 0.0007 + pen.lift * 0.042, heroState.penWorld);

    // Camera path.
    sampleCamera(p, w.dPos, w.dTarget);
    const aspect = size.width / Math.max(1, size.height);
    if (aspect < 1.1) {
      const k = 1 + (1.1 - aspect) * 1.1;
      w.dPos.sub(w.dTarget).multiplyScalar(k).add(w.dTarget);
    }
    w.fwd.subVectors(w.dTarget, w.dPos).normalize();
    w.right.crossVectors(w.fwd, w.up).normalize();
    const intro = 1 - clamp01((p - 0.015) / 0.2);
    if (aspect >= 1.1) w.dTarget.addScaledVector(w.right, -0.36 * intro);
    else w.dTarget.y += 0.2 * intro;
    w.dPos.addScaledVector(w.right, heroState.pointer.x * 0.05);
    w.dPos.y += heroState.pointer.y * 0.035;

    if (w.first) {
      w.pos.copy(w.dPos);
      w.target.copy(w.dTarget);
      w.first = false;
    }
    w.pos.lerp(w.dPos, damp(2.6, dt));
    w.target.lerp(w.dTarget, damp(3, dt));
    camera.position.copy(w.pos);
    camera.lookAt(w.target);
  }, -2);

  return null;
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.5} color="#fff1e0" />
      <hemisphereLight args={['#ffe6c7', '#15110e', 0.55]} />
      <directionalLight position={[2.4, 3.4, 2.6]} intensity={1.05} color="#ffe3c2" />
      <directionalLight position={[-2.6, 2.2, -2.4]} intensity={0.7} color="#a3b4ca" />
    </>
  );
}

/**
 * "The designer at work" — vector-toon R3F scene. Lazy-loaded by HeroStage.
 */
export default function HeroScene({ quality = 'high', onReady, onSlow }) {
  const high = quality === 'high';

  useEffect(() => {
    heroState.quality = quality;
    const onPointer = (e) => {
      heroState.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      heroState.pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('pointermove', onPointer, { passive: true });
    return () => window.removeEventListener('pointermove', onPointer);
  }, [quality]);

  return (
    <Canvas
      frameloop="demand"
      dpr={high ? [1, 1.75] : [1, 1.5]}
      flat
      shadows={high ? 'percentage' : false}
      camera={{ fov: 32, near: 0.05, far: 30, position: CAMERA_KEYS[0].pos }}
      gl={{ antialias: true, alpha: false, stencil: false, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.setClearColor('#1a1714', 1);
      }}
      style={{ width: '100%', height: '100%' }}
    >
      <color attach="background" args={['#1a1714']} />
      <fog attach="fog" args={['#1a1714', 3.4, 8.5]} />
      <RenderDriver onSlow={onSlow} />
      <Renderer />
      <OutlineSizeSync />
      <Director />
      <Lights />
      <Staged onReady={onReady}>
        <Props quality={quality} />
        <DraftingTable outlines>
          <SketchPaper resolution={high ? 2048 : 1024} />
          <PlanModel outlines />
        </DraftingTable>
        <Designer outlines />
      </Staged>
    </Canvas>
  );
}
