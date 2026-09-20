import { Euler, Matrix4, Quaternion, Vector3 } from 'three';
import { PAPER_UNITS } from './sketchPaths';

/**
 * World layout of the studio scene (metres, Y up).
 * The designer sits at +Z facing −Z; the drafting board is tilted toward them.
 */
export const BOARD = {
  position: new Vector3(0, 0.86, 0),
  tilt: 0.21, // radians — far edge higher
  size: [0.95, 0.035, 0.68],
};

export const PAPER = {
  width: 0.66,
  height: 0.66 * (PAPER_UNITS.height / PAPER_UNITS.width),
  offsetZ: -0.02,
  y: BOARD.size[1] / 2 + 0.0016,
};

export const DESIGNER_ROOT = new Vector3(0, 0, 0.52);

export const boardQuaternion = new Quaternion().setFromEuler(new Euler(BOARD.tilt, 0, 0));
export const boardMatrix = new Matrix4().compose(BOARD.position, boardQuaternion, new Vector3(1, 1, 1));

/** Paper units → board-local position. */
export function paperToLocal(px, py, lift, out) {
  return out.set(
    (px / PAPER_UNITS.width - 0.5) * PAPER.width,
    PAPER.y + lift,
    (py / PAPER_UNITS.height - 0.5) * PAPER.height + PAPER.offsetZ,
  );
}

/** Paper units → world position. */
export function paperToWorld(px, py, lift, out) {
  return paperToLocal(px, py, lift, out).applyMatrix4(boardMatrix);
}

/** Size of one paper unit in world metres. */
export const UNIT = PAPER.width / PAPER_UNITS.width;

/** Camera keyframes along the master timeline (progress, position, target). */
export const CAMERA_KEYS = [
  { p: 0.0, pos: [3.05, 1.9, 2.15], target: [-0.05, 0.98, 0.12] },
  { p: 0.12, pos: [2.35, 2.0, 2.35], target: [-0.04, 0.95, 0.1] },
  { p: 0.34, pos: [1.3, 2.1, 1.75], target: [-0.04, 0.9, 0.03] },
  { p: 0.55, pos: [0.62, 1.98, 1.22], target: [-0.05, 0.87, -0.02] },
  { p: 0.66, pos: [1.15, 2.2, 1.32], target: [-0.02, 0.88, -0.02] },
  { p: 0.8, pos: [1.25, 2.55, 1.05], target: [0.0, 0.9, -0.04] },
  { p: 1.0, pos: [1.0, 3.0, 0.72], target: [0.0, 0.92, -0.06] },
];
