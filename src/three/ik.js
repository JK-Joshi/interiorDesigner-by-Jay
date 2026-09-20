import { Vector3 } from 'three';

const _dir = new Vector3();
const _bend = new Vector3();

/**
 * Analytic two-bone IK (shoulder → elbow → wrist): solves the elbow position.
 * Bone orientation is handled by the caller (see designerRig.js → Limb).
 * @param {Vector3} root     shoulder (world)
 * @param {Vector3} target   wrist target (world)
 * @param {Vector3} pole     preferred bend direction (world, need not be normalised)
 * @param {number}  a        upper-bone length
 * @param {number}  b        lower-bone length
 * @param {Vector3} outElbow result
 * @returns {number} reach deficit (0 when the target is reachable)
 */
export function solveTwoBone(root, target, pole, a, b, outElbow) {
  _dir.subVectors(target, root);
  const raw = _dir.length();
  if (raw < 1e-6) _dir.set(0, -1, 0);
  else _dir.divideScalar(raw);

  const d = Math.min(Math.max(raw, Math.abs(a - b) + 1e-4), a + b - 1e-4);
  const cosA = Math.min(1, Math.max(-1, (a * a + d * d - b * b) / (2 * a * d)));
  const sinA = Math.sqrt(1 - cosA * cosA);

  _bend.copy(pole).addScaledVector(_dir, -pole.dot(_dir));
  if (_bend.lengthSq() < 1e-8) {
    _bend.set(0, 0, 1).addScaledVector(_dir, -_dir.z);
  }
  _bend.normalize();

  outElbow.copy(root).addScaledVector(_dir, a * cosA).addScaledVector(_bend, a * sinA);
  return Math.max(0, raw - (a + b));
}

/** Frame-rate independent damping factor. */
export const damp = (lambda, dt) => 1 - Math.exp(-lambda * dt);
