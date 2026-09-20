import { useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import Outline from './Outline';
import { BoxGeometry, CapsuleGeometry, ConeGeometry, CylinderGeometry, Quaternion, SphereGeometry, TorusGeometry, Vector3 } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { TONES } from './toonGradient';

/**
 * Tiny geometry cache + a <Part> helper (mesh + optional vector outline),
 * shared by every stylised object in the scene.
 */
const cache = new Map();

function cached(key, factory) {
  if (!cache.has(key)) cache.set(key, factory());
  return cache.get(key);
}

export const geo = {
  box: (w, h, d) => cached(`box:${w}:${h}:${d}`, () => new BoxGeometry(w, h, d)),
  rbox: (w, h, d, r = 0.01, s = 3) => cached(`rbox:${w}:${h}:${d}:${r}:${s}`, () => new RoundedBoxGeometry(w, h, d, s, r)),
  capsule: (r, len, cap = 6, radial = 14) => cached(`cap:${r}:${len}:${cap}:${radial}`, () => new CapsuleGeometry(r, len, cap, radial)),
  sphere: (r, w = 24, h = 16, ps = 0, pl = Math.PI * 2, ts = 0, tl = Math.PI) =>
    cached(`sph:${r}:${w}:${h}:${ps}:${pl}:${ts}:${tl}`, () => new SphereGeometry(r, w, h, ps, pl, ts, tl)),
  cylinder: (rt, rb, h, seg = 20, open = false) =>
    cached(`cyl:${rt}:${rb}:${h}:${seg}:${open}`, () => new CylinderGeometry(rt, rb, h, seg, 1, open)),
  cone: (r, h, seg = 20, open = false) => cached(`cone:${r}:${h}:${seg}:${open}`, () => new ConeGeometry(r, h, seg, 1, open)),
  torus: (r, tube, rs = 10, ts = 28, arc = Math.PI * 2) =>
    cached(`tor:${r}:${tube}:${rs}:${ts}:${arc}`, () => new TorusGeometry(r, tube, rs, ts, arc)),
};

/** Outline thickness in CSS pixels → device pixels (drei's Outlines works in drawing-buffer px). */
export function useOutlineScale() {
  return useThree((s) => s.viewport.dpr);
}

export function Part({ geometry, material, outline = true, thickness = 1.6, outlineColor = TONES.outline, children, castShadow = true, receiveShadow = false, ...props }) {
  const dpr = useOutlineScale();
  return (
    <mesh geometry={geometry} material={material} castShadow={castShadow} receiveShadow={receiveShadow} {...props}>
      {outline ? <Outline geometry={geometry} thickness={thickness * dpr} color={outlineColor} /> : null}
      {children}
    </mesh>
  );
}

const UP = new Vector3(0, 1, 0);

/** A box stretched between two points (legs, struts, cords). */
export function Strut({ from, to, width = 0.03, depth, material, outline = true, thickness = 1.6, round = 0 }) {
  const { position, quaternion, length } = useMemo(() => {
    const a = new Vector3(...from);
    const b = new Vector3(...to);
    const dir = b.clone().sub(a);
    const len = dir.length();
    const q = new Quaternion().setFromUnitVectors(UP, dir.normalize());
    return { position: a.add(b).multiplyScalar(0.5).toArray(), quaternion: q, length: len };
  }, [from, to]);
  const geometry = round ? geo.rbox(width, length, depth ?? width, round) : geo.box(width, length, depth ?? width);
  return <Part geometry={geometry} material={material} position={position} quaternion={quaternion} outline={outline} thickness={thickness} />;
}
