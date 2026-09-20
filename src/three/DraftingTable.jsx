import { BOARD, boardQuaternion, PAPER } from './sceneConfig';
import { getMaterials } from './toonGradient';
import { geo, Part, Strut } from './parts';

/**
 * Tilted oak drafting board on walnut A-frames, with a pencil ledge,
 * a brass parallel bar and a triangular scale ruler.
 * Children are placed in board-local space (paper, extruded model).
 */
export default function DraftingTable({ children, outlines = true }) {
  const m = getMaterials();
  const [bw, bh, bd] = BOARD.size;
  const o = outlines;

  return (
    <group>
      {/* A-frame trestles */}
      {[-0.43, 0.43].map((x) => (
        <group key={x}>
          <Strut from={[x, 0, 0.3]} to={[x, 0.8, 0.06]} width={0.036} material={m.walnut} outline={o} round={0.006} />
          <Strut from={[x, 0, -0.3]} to={[x, 0.84, -0.06]} width={0.036} material={m.walnut} outline={o} round={0.006} />
          <Strut from={[x, 0.3, 0.23]} to={[x, 0.3, -0.23]} width={0.026} material={m.walnut} outline={o} round={0.005} />
          <Part geometry={geo.rbox(0.05, 0.03, 0.66, 0.01)} material={m.walnutDark} position={[x, 0.015, 0]} outline={o} />
          <Part
            geometry={geo.cylinder(0.022, 0.022, 0.05, 16)}
            material={m.brass}
            position={[x > 0 ? x + 0.03 : x - 0.03, 0.8, 0]}
            rotation={[0, 0, Math.PI / 2]}
            outline={o}
          />
          <Part
            geometry={geo.cylinder(0.009, 0.009, 0.09, 10)}
            material={m.brass}
            position={[x > 0 ? x + 0.06 : x - 0.06, 0.8, 0]}
            rotation={[0, 0, Math.PI / 2]}
            outline={false}
          />
        </group>
      ))}
      <Strut from={[-0.43, 0.3, 0]} to={[0.43, 0.3, 0]} width={0.028} material={m.walnut} outline={o} round={0.006} />
      <Strut from={[-0.43, 0.8, 0]} to={[0.43, 0.8, 0]} width={0.03} material={m.walnutDark} outline={o} round={0.006} />

      {/* The board (board-local space) */}
      <group position={BOARD.position} quaternion={boardQuaternion}>
        <Part geometry={geo.rbox(bw, bh, bd, 0.008)} material={m.oak} receiveShadow outline={o} />
        {/* walnut edge band + pencil ledge on the near edge */}
        <Part geometry={geo.rbox(bw + 0.01, 0.022, 0.03, 0.006)} material={m.walnut} position={[0, 0.012, bd / 2 + 0.008]} outline={o} />
        <Part geometry={geo.rbox(bw * 0.6, 0.012, 0.02, 0.004)} material={m.walnutDark} position={[0, 0.03, bd / 2 + 0.012]} outline={o} />
        {/* parallel bar */}
        <Part geometry={geo.rbox(bw - 0.03, 0.012, 0.032, 0.004)} material={m.bone} position={[0, bh / 2 + 0.008, 0.268]} outline={o} />
        {[-1, 1].map((s) => (
          <Part key={s} geometry={geo.rbox(0.03, 0.024, 0.04, 0.005)} material={m.brass} position={[s * (bw / 2 - 0.012), bh / 2 + 0.01, 0.268]} outline={o} />
        ))}
        {/* triangular scale ruler (left hand rests here) */}
        <Part
          geometry={geo.cylinder(0.013, 0.013, 0.34, 3)}
          material={m.bone}
          position={[-PAPER.width / 2 - 0.04, bh / 2 + 0.0085, 0.02]}
          rotation={[Math.PI / 2, Math.PI, 0]}
          outline={o}
        />
        <Part
          geometry={geo.box(0.004, 0.002, 0.3)}
          material={m.rust}
          position={[-PAPER.width / 2 - 0.04, bh / 2 + 0.0085, 0.02]}
          outline={false}
          castShadow={false}
        />
        {/* spare pencil + eraser on the board margin */}
        <Part
          geometry={geo.cylinder(0.005, 0.005, 0.16, 6)}
          material={m.graphite}
          position={[PAPER.width / 2 + 0.05, bh / 2 + 0.006, -0.1]}
          rotation={[Math.PI / 2, 0.3, 0]}
          outline={o}
        />
        <Part geometry={geo.rbox(0.03, 0.012, 0.02, 0.004)} material={m.rust} position={[PAPER.width / 2 + 0.06, bh / 2 + 0.006, 0.06]} rotation={[0, 0.4, 0]} outline={o} />
        {children}
      </group>
    </group>
  );
}
