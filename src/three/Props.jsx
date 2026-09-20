import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { ContactShadows, Sparkles } from '@react-three/drei';
import { Color, Object3D } from 'three';
import { heroState, buildProgress } from './heroState';
import { DESIGNER_ROOT } from './sceneConfig';
import { getMaterials } from './toonGradient';
import { geo, Part, Strut } from './parts';

const WARM = new Color('#ffd7a8');
const HOT = new Color('#ffb46e');

/** Pendant lamp with a flickering warm spot that "warms up" during the build phase. */
function PendantLamp({ shadows, outlines }) {
  const m = getMaterials();
  const spot = useRef(null);
  const glow = useRef(null);
  const shade = useRef(null);
  const target = useMemo(() => {
    const o = new Object3D();
    o.position.set(-0.02, 0.86, 0.02);
    return o;
  }, []);
  const color = useMemo(() => new Color(), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const warm = buildProgress(heroState.progress);
    const flicker = 1 + Math.sin(t * 13.1) * 0.018 + Math.sin(t * 31.7) * 0.012 + (Math.sin(t * 2.3) > 0.985 ? -0.06 : 0);
    if (spot.current) {
      spot.current.intensity = (1.9 + warm * 1.1) * flicker;
      color.copy(WARM).lerp(HOT, warm);
      spot.current.color.copy(color);
    }
    if (glow.current) glow.current.intensity = (0.18 + warm * 0.2) * flicker;
    if (shade.current) shade.current.rotation.z = Math.sin(t * 0.7) * 0.012;
  });

  return (
    <group position={[0.06, 0, -0.04]}>
      <Part geometry={geo.cylinder(0.004, 0.004, 1.5, 6)} material={m.graphite} position={[0, 2.5, 0]} outline={false} castShadow={false} />
      <group ref={shade} position={[0, 1.75, 0]}>
        <Part geometry={geo.cylinder(0.018, 0.03, 0.05, 16)} material={m.brass} position={[0, 0.03, 0]} outline={outlines} castShadow={false} />
        <Part geometry={geo.cone(0.21, 0.19, 36, true)} material={m.rust} position={[0, -0.08, 0]} outline={outlines} thickness={2} castShadow={false} />
        <mesh geometry={geo.cone(0.205, 0.186, 36, true)} material={m.shadeInner} position={[0, -0.08, 0]} />
        <mesh geometry={geo.sphere(0.042, 20, 14)} material={m.bulb} position={[0, -0.14, 0]} />
        <Part geometry={geo.torus(0.21, 0.004, 6, 48)} material={m.brass} position={[0, -0.175, 0]} rotation={[Math.PI / 2, 0, 0]} outline={false} castShadow={false} />
      </group>
      <primitive object={target} />
      <spotLight
        ref={spot}
        position={[0, 1.6, 0]}
        target={target}
        angle={0.78}
        penumbra={0.85}
        distance={4.5}
        decay={1.35}
        intensity={1.9}
        color={WARM}
        castShadow={shadows}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      <pointLight ref={glow} position={[0, 1.62, 0]} intensity={0.18} distance={2.2} decay={2} color="#ffc98f" />
    </group>
  );
}

/** Tall drafting stool with a curved backrest and brass foot ring. */
function DesignerChair({ outlines }) {
  const m = getMaterials();
  const [x, , z] = DESIGNER_ROOT.toArray();
  return (
    <group position={[x, 0, z]}>
      <Part geometry={geo.cylinder(0.21, 0.2, 0.05, 32)} material={m.rustDark} position={[0, 0.635, 0]} outline={outlines} />
      <Part geometry={geo.cylinder(0.2, 0.2, 0.012, 32)} material={m.walnut} position={[0, 0.604, 0]} outline={outlines} />
      <Part geometry={geo.cylinder(0.024, 0.024, 0.4, 12)} material={m.graphite} position={[0, 0.4, 0]} outline={outlines} />
      <Part geometry={geo.torus(0.23, 0.009, 8, 40)} material={m.brass} position={[0, 0.22, 0]} rotation={[Math.PI / 2, 0, 0]} outline={outlines} />
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        return (
          <Strut
            key={i}
            from={[Math.cos(a) * 0.05, 0.4, Math.sin(a) * 0.05]}
            to={[Math.cos(a) * 0.27, 0.0, Math.sin(a) * 0.27]}
            width={0.022}
            material={m.walnut}
            outline={outlines}
            round={0.005}
          />
        );
      })}
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        return (
          <Strut
            key={`r${i}`}
            from={[Math.cos(a) * 0.19, 0.22, Math.sin(a) * 0.19]}
            to={[Math.cos(a) * 0.23, 0.22, Math.sin(a) * 0.23]}
            width={0.012}
            material={m.brass}
            outline={false}
          />
        );
      })}
      {/* backrest behind the designer (designer faces −Z, so the back is +Z) */}
      <Part geometry={geo.torus(0.17, 0.018, 10, 32, Math.PI)} material={m.walnut} position={[0, 0.66, 0.02]} rotation={[-Math.PI / 2, 0, Math.PI]} outline={outlines} />
      <Strut from={[-0.17, 0.66, 0.02]} to={[-0.15, 0.86, 0.1]} width={0.02} material={m.walnut} outline={outlines} round={0.004} />
      <Strut from={[0.17, 0.66, 0.02]} to={[0.15, 0.86, 0.1]} width={0.02} material={m.walnut} outline={outlines} round={0.004} />
      <Part geometry={geo.rbox(0.34, 0.07, 0.03, 0.012)} material={m.rustDark} position={[0, 0.89, 0.11]} rotation={[-0.25, 0, 0]} outline={outlines} />
    </group>
  );
}

/** Coffee mug with slow steam. */
function Mug({ position, outlines }) {
  const m = getMaterials();
  const steam = useRef([]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    steam.current.forEach((s, i) => {
      if (!s) return;
      const k = (t * 0.25 + i / 3) % 1;
      s.position.set(Math.sin(t * 1.3 + i * 2) * 0.01, 0.1 + k * 0.12, Math.cos(t + i) * 0.006);
      s.scale.setScalar(0.35 + k * 0.6);
      s.material.opacity = Math.sin(k * Math.PI) * 0.14;
    });
  });
  return (
    <group position={position}>
      <Part geometry={geo.cylinder(0.042, 0.037, 0.1, 28)} material={m.white} position={[0, 0.05, 0]} outline={outlines} />
      <Part geometry={geo.cylinder(0.0425, 0.041, 0.022, 28)} material={m.rust} position={[0, 0.06, 0]} outline={false} />
      <Part geometry={geo.torus(0.026, 0.007, 8, 20, Math.PI)} material={m.white} position={[0.042, 0.052, 0]} rotation={[0, 0, -Math.PI / 2]} outline={outlines} />
      <mesh geometry={geo.cylinder(0.037, 0.037, 0.002, 24)} material={m.espresso} position={[0, 0.093, 0]} />
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          ref={(el) => {
            steam.current[i] = el;
          }}
          geometry={geo.sphere(0.012, 10, 8)}
        >
          <meshBasicMaterial color="#f7f3ee" transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

/** Side table: mug + three material swatches (marble, oak, brass). */
function SideTable({ outlines }) {
  const m = getMaterials();
  return (
    <group position={[0.78, 0, 0.18]}>
      <Part geometry={geo.cylinder(0.23, 0.23, 0.026, 36)} material={m.walnut} position={[0, 0.62, 0]} outline={outlines} receiveShadow />
      <Part geometry={geo.cylinder(0.03, 0.04, 0.6, 14)} material={m.walnutDark} position={[0, 0.31, 0]} outline={outlines} />
      <Part geometry={geo.cylinder(0.14, 0.16, 0.02, 28)} material={m.brass} position={[0, 0.01, 0]} outline={outlines} />
      <Mug position={[0.07, 0.633, 0.06]} outlines={outlines} />
      <group position={[-0.06, 0.633, -0.05]}>
        <Part geometry={geo.rbox(0.12, 0.012, 0.085, 0.003)} material={m.marble} position={[0, 0.006, 0]} rotation={[0, 0.3, 0]} outline={outlines} />
        <Part geometry={geo.rbox(0.12, 0.012, 0.085, 0.003)} material={m.oak} position={[0.01, 0.018, 0.012]} rotation={[0, -0.15, 0]} outline={outlines} />
        <Part geometry={geo.rbox(0.12, 0.006, 0.085, 0.002)} material={m.brass} position={[0.022, 0.027, 0.026]} rotation={[0, -0.55, 0]} outline={outlines} />
      </group>
    </group>
  );
}

/** Bin of rolled blueprints on the floor. */
function BlueprintBin({ outlines }) {
  const m = getMaterials();
  const rolls = [
    { x: -0.03, z: 0.02, r: 0.034, h: 0.78, tilt: [0.08, 0, 0.1], mat: m.blueprint },
    { x: 0.04, z: -0.02, r: 0.03, h: 0.7, tilt: [-0.06, 0, -0.12], mat: m.bone },
    { x: 0.0, z: -0.05, r: 0.028, h: 0.86, tilt: [-0.14, 0, 0.02], mat: m.linen },
    { x: -0.05, z: -0.03, r: 0.026, h: 0.64, tilt: [0.02, 0, 0.18], mat: m.bone },
    { x: 0.05, z: 0.04, r: 0.03, h: 0.72, tilt: [0.12, 0, -0.06], mat: m.blueprint },
  ];
  return (
    <group position={[-0.82, 0, -0.18]}>
      <Part geometry={geo.cylinder(0.14, 0.12, 0.36, 28, true)} material={m.rustDark} position={[0, 0.18, 0]} outline={outlines} />
      <mesh geometry={geo.cylinder(0.12, 0.12, 0.01, 24)} material={m.espresso} position={[0, 0.01, 0]} />
      {rolls.map((r, i) => (
        <group key={i} position={[r.x, 0.02, r.z]} rotation={r.tilt}>
          <Part geometry={geo.cylinder(r.r, r.r, r.h, 20)} material={r.mat} position={[0, r.h / 2, 0]} outline={outlines} />
          <Part geometry={geo.cylinder(r.r + 0.002, r.r + 0.002, 0.012, 20)} material={m.rust} position={[0, r.h * 0.72, 0]} outline={false} />
        </group>
      ))}
    </group>
  );
}

/** A potted plant and a low credenza give the studio depth. */
function Backdrop({ outlines }) {
  const m = getMaterials();
  const leaves = [
    [0.0, 1.05, 0.0, 0.16, 0.3],
    [0.14, 0.9, 0.06, 0.13, -0.5],
    [-0.13, 0.94, -0.04, 0.14, 0.6],
    [0.07, 1.22, -0.06, 0.12, 0.2],
    [-0.08, 1.18, 0.07, 0.11, -0.3],
    [0.16, 1.1, -0.08, 0.1, -0.9],
    [-0.16, 0.8, 0.05, 0.12, 0.9],
  ];
  return (
    <group>
      <group position={[-1.35, 0, -0.95]}>
        <Part geometry={geo.cylinder(0.2, 0.15, 0.42, 28)} material={m.rust} position={[0, 0.21, 0]} outline={outlines} />
        <Strut from={[0, 0.4, 0]} to={[0.02, 1.1, 0]} width={0.02} material={m.walnut} outline={false} />
        {leaves.map(([x, y, z, s, r], i) => (
          <Part
            key={i}
            geometry={geo.sphere(1, 12, 10)}
            material={i % 2 ? m.sageDark : m.sage}
            position={[x, y, z]}
            scale={[s, s * 0.45, s * 0.8]}
            rotation={[0.3, r, r * 0.6]}
            outline={outlines}
          />
        ))}
      </group>
      <group position={[1.35, 0, -1.05]} rotation={[0, -0.35, 0]}>
        <Part geometry={geo.rbox(1.1, 0.5, 0.38, 0.02)} material={m.walnut} position={[0, 0.3, 0]} outline={outlines} />
        {[-0.36, 0, 0.36].map((x) => (
          <Part key={x} geometry={geo.box(0.005, 0.4, 0.002)} material={m.walnutDark} position={[x + 0.18, 0.3, 0.191]} outline={false} />
        ))}
        <Part geometry={geo.sphere(0.12, 20, 14)} material={m.bone} position={[-0.3, 0.64, 0]} scale={[1, 1.25, 1]} outline={outlines} />
        <Part geometry={geo.cylinder(0.03, 0.05, 0.08, 16)} material={m.bone} position={[-0.3, 0.8, 0]} outline={false} />
        <Part geometry={geo.rbox(0.28, 0.04, 0.2, 0.006)} material={m.sage} position={[0.25, 0.57, 0]} outline={outlines} />
        <Part geometry={geo.rbox(0.24, 0.035, 0.18, 0.006)} material={m.rust} position={[0.26, 0.607, 0]} rotation={[0, 0.2, 0]} outline={outlines} />
        <Part geometry={geo.rbox(0.2, 0.03, 0.16, 0.006)} material={m.linen} position={[0.25, 0.64, 0]} rotation={[0, -0.1, 0]} outline={outlines} />
      </group>
    </group>
  );
}

/**
 * Floor, rug, lamp, chair, side table, blueprints, dust and grounding shadows.
 */
export default function Props({ quality = 'high' }) {
  const m = getMaterials();
  const high = quality === 'high';
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} material={m.floor} receiveShadow>
        <circleGeometry args={[7, 48]} />
      </mesh>
      <mesh geometry={geo.rbox(2.5, 0.012, 2.0, 0.005)} material={m.brass} position={[0, 0.004, 0.18]} receiveShadow />
      <mesh geometry={geo.rbox(2.44, 0.014, 1.94, 0.005)} material={m.rug} position={[0, 0.006, 0.18]} receiveShadow />

      <PendantLamp shadows={high} outlines />
      <DesignerChair outlines />
      <SideTable outlines />
      <BlueprintBin outlines={high} />
      <Backdrop outlines={high} />

      <ContactShadows
        position={[0, 0.015, 0.1]}
        scale={3.4}
        blur={2.6}
        far={1.4}
        opacity={0.6}
        resolution={high ? 512 : 256}
        frames={high ? Infinity : 1}
        color="#0b0908"
      />
      <Sparkles count={high ? 60 : 26} scale={[2.6, 1.3, 1.4]} position={[0.1, 1.45, -0.55]} size={high ? 1.1 : 1.5} speed={0.2} opacity={0.35} noise={0.5} color="#eccb9a" />
    </group>
  );
}
