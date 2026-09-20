import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BoxGeometry, ConeGeometry, CylinderGeometry, Vector3 } from 'three';
import { gsap } from '../lib/gsap';
import { WALLS, BLOCKS, PLANTS } from './sketchPaths';
import { paperToLocal, UNIT } from './sceneConfig';
import { heroState } from './heroState';
import { getMaterials, TONES } from './toonGradient';
import { useOutlineScale } from './parts';
import Outline from './Outline';

const unitBox = new BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
const plantCone = new ConeGeometry(1, 1, 7).translate(0, 0.5, 0);
const potGeo = new CylinderGeometry(1, 0.8, 1, 12).translate(0, 0.5, 0);

const backOut = gsap.parseEase('back.out(2.2)');
const expoOut = gsap.parseEase('expo.out');
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

const WALL_HEIGHT = { outer: 0.024, inner: 0.021, column: 0.024 };

/**
 * "Sketch becomes reality": wall polylines extrude into low walls (staggered sweep),
 * furniture pops in with back.out, and a tiny warm light switches on inside.
 * Everything is driven from heroState.build (damped 0 → 1).
 */
export default function PlanModel({ outlines = true, thickness: baseThickness = 1.3 }) {
  const m = getMaterials();
  const thickness = baseThickness * useOutlineScale();
  const lightRef = useRef(null);
  const wallRefs = useRef([]);
  const blockRefs = useRef([]);
  const plantRefs = useRef([]);

  const { walls, blocks, plants, center } = useMemo(() => {
    const tmp = new Vector3();
    const toPiece = ([x1, y1, x2, y2], height) => {
      paperToLocal((x1 + x2) / 2, (y1 + y2) / 2, 0, tmp);
      return {
        pos: [tmp.x, tmp.y, tmp.z],
        size: [(x2 - x1) * UNIT, height, (y2 - y1) * UNIT],
        cx: (x1 + x2) / 2,
        cy: (y1 + y2) / 2,
      };
    };
    const w = [
      ...WALLS.outer.map((r) => ({ ...toPiece(r, WALL_HEIGHT.outer), mat: 'bone' })),
      ...WALLS.inner.map((r) => ({ ...toPiece(r, WALL_HEIGHT.inner), mat: 'linen' })),
      ...WALLS.columns.map((r) => ({ ...toPiece(r, WALL_HEIGHT.column), mat: 'bone' })),
    ];
    // Sweep: walls rise from the left of the plan to the right.
    w.forEach((piece) => {
      piece.delay = ((piece.cx - 140) / 940) * 0.42 + ((piece.cy - 150) / 670) * 0.08;
    });
    const b = BLOCKS.map(([x1, y1, x2, y2, h, tone], i) => ({
      ...toPiece([x1, y1, x2, y2], h),
      mat: tone,
      delay: 0.5 + ((((x1 + x2) / 2 - 140) / 940) * 0.28 + (i % 3) * 0.02),
    }));
    const p = PLANTS.map(([x, y, r], i) => {
      paperToLocal(x, y, 0, tmp);
      return { pos: [tmp.x, tmp.y, tmp.z], r: r * UNIT, delay: 0.72 + i * 0.04 };
    });
    const c = paperToLocal(610, 480, 0.05, new Vector3());
    return { walls: w, blocks: b, plants: p, center: c };
  }, []);

  useFrame(() => {
    const t = heroState.build;
    for (let i = 0; i < walls.length; i += 1) {
      const mesh = wallRefs.current[i];
      if (!mesh) continue;
      const local = clamp01((t - walls[i].delay) / 0.34);
      const e = expoOut(local);
      mesh.visible = local > 0.001;
      mesh.scale.y = Math.max(0.0001, walls[i].size[1] * e);
    }
    for (let i = 0; i < blocks.length; i += 1) {
      const mesh = blockRefs.current[i];
      if (!mesh) continue;
      const local = clamp01((t - blocks[i].delay) / 0.22);
      const e = backOut(local);
      const [sx, sy, sz] = blocks[i].size;
      mesh.visible = local > 0.001;
      const k = Math.max(0.0001, e);
      mesh.scale.set(sx * (0.6 + 0.4 * k), Math.max(0.0001, sy * k), sz * (0.6 + 0.4 * k));
    }
    for (let i = 0; i < plants.length; i += 1) {
      const g = plantRefs.current[i];
      if (!g) continue;
      const local = clamp01((t - plants[i].delay) / 0.2);
      const e = Math.max(0.0001, backOut(local));
      g.visible = local > 0.001;
      g.scale.setScalar(e);
    }
    if (lightRef.current) {
      const glow = clamp01((t - 0.6) / 0.4);
      lightRef.current.intensity = glow * glow * 0.012;
    }
  }, -1);

  return (
    <group>
      {walls.map((piece, i) => (
        <mesh
          key={`w${i}`}
          ref={(el) => {
            wallRefs.current[i] = el;
          }}
          geometry={unitBox}
          material={m[piece.mat]}
          position={piece.pos}
          scale={[piece.size[0], 0.0001, piece.size[2]]}
          visible={false}
          castShadow
          receiveShadow
        >
          {outlines ? <Outline geometry={unitBox} thickness={thickness} color={TONES.outline} /> : null}
        </mesh>
      ))}
      {blocks.map((piece, i) => (
        <mesh
          key={`b${i}`}
          ref={(el) => {
            blockRefs.current[i] = el;
          }}
          geometry={unitBox}
          material={m[piece.mat]}
          position={piece.pos}
          scale={[piece.size[0], 0.0001, piece.size[2]]}
          visible={false}
          castShadow
        >
          {outlines ? <Outline geometry={unitBox} thickness={thickness * 0.85} color={TONES.outline} /> : null}
        </mesh>
      ))}
      {plants.map((piece, i) => (
        <group
          key={`p${i}`}
          ref={(el) => {
            plantRefs.current[i] = el;
          }}
          position={piece.pos}
          visible={false}
        >
          <mesh geometry={potGeo} material={m.rust} scale={[piece.r * 0.5, 0.004, piece.r * 0.5]} />
          <mesh geometry={plantCone} material={m.sage} position={[0, 0.003, 0]} scale={[piece.r * 1.1, 0.014, piece.r * 1.1]}>
            {outlines ? <Outline geometry={plantCone} thickness={thickness * 0.8} color={TONES.outline} /> : null}
          </mesh>
        </group>
      ))}
      <pointLight ref={lightRef} position={center} color="#ffb070" intensity={0} distance={0.45} decay={2} />
    </group>
  );
}
