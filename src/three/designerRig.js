import { Matrix4, Quaternion, Vector3 } from 'three';
import { solveTwoBone } from './ik';

/**
 * Pose solver for the MakeHuman-based designer (see scripts/designer/build.mjs).
 *
 * Every bone of the GLB has an identity rest rotation, so "model space" (the character's own
 * frame: Y up, facing +Z, left hand at +X) is also each bone's rest frame. The rig keeps its own
 * forward kinematics in model space; callers set model-space rotations and the rig converts
 * them to local quaternions for three.js.
 */

const _m = new Matrix4();
const _qa = new Quaternion();
const _qb = new Quaternion();
const _x = new Vector3();
const _y = new Vector3();
const _z = new Vector3();
const _v = new Vector3();
const IDENTITY = new Quaternion();

/** Quaternion mapping the frame (primary a0, secondary b0) onto (a1, b1); primaries match exactly. */
export function frameMap(a0, b0, a1, b1, out) {
  frameQuat(a0, b0, _qa);
  frameQuat(a1, b1, _qb);
  return out.copy(_qb).multiply(_qa.invert());
}

function frameQuat(primary, secondary, out) {
  _y.copy(primary).normalize();
  _x.copy(secondary).addScaledVector(_y, -secondary.dot(_y));
  if (_x.lengthSq() < 1e-10) _x.set(1, 0, 0).addScaledVector(_y, -_y.x);
  _x.normalize();
  _z.crossVectors(_x, _y);
  _m.makeBasis(_x, _y, _z);
  return out.setFromRotationMatrix(_m);
}

/** Twist part of `q` around unit `axis` (swing–twist decomposition). */
export function twistAbout(q, axis, out) {
  const d = q.x * axis.x + q.y * axis.y + q.z * axis.z;
  out.set(axis.x * d, axis.y * d, axis.z * d, q.w);
  const len = Math.hypot(out.x, out.y, out.z, out.w);
  if (len < 1e-9) return out.identity();
  out.set(out.x / len, out.y / len, out.z / len, out.w / len);
  if (out.w < 0) out.set(-out.x, -out.y, -out.z, -out.w);
  return out;
}

export class HumanRig {
  constructor(root) {
    this.bones = {};
    this.order = [];
    this.parent = {};
    this.offset = {};
    this.restHead = {};
    this.tail = {};
    this.local = {};
    this.modelQ = {};
    this.modelP = {};
    root.updateMatrixWorld(true);
    root.traverse((o) => {
      if (!o.isBone) return;
      const name = o.name;
      this.bones[name] = o;
      this.order.push(name);
      this.parent[name] = o.parent?.isBone ? o.parent.name : null;
      this.offset[name] = o.position.clone();
      const p = this.parent[name];
      this.restHead[name] = p ? this.restHead[p].clone().add(o.position) : o.position.clone();
      this.tail[name] = o.userData.tail ? new Vector3().fromArray(o.userData.tail) : this.restHead[name].clone();
      this.local[name] = new Quaternion();
      this.modelQ[name] = new Quaternion();
      this.modelP[name] = this.restHead[name].clone();
    });
    this.rootName = this.order[0];
    this.rootOffset = new Vector3();
  }

  reset() {
    for (const name of this.order) this.local[name].identity();
    this.rootOffset.set(0, 0, 0);
  }

  /** Model-space forward kinematics for every bone (parents precede children). */
  fk() {
    for (const name of this.order) {
      const p = this.parent[name];
      if (!p) {
        this.modelQ[name].copy(this.local[name]);
        this.modelP[name].copy(this.offset[name]).add(this.rootOffset);
      } else {
        this.modelQ[name].multiplyQuaternions(this.modelQ[p], this.local[name]);
        this.modelP[name].copy(this.offset[name]).applyQuaternion(this.modelQ[p]).add(this.modelP[p]);
      }
    }
  }

  /** Sets a bone's model-space rotation (its parent's FK must be current). */
  setModelQ(name, q) {
    const p = this.parent[name];
    if (p) this.local[name].copy(this.modelQ[p]).invert().multiply(q);
    else this.local[name].copy(q);
    this.fkFrom(name);
  }

  /** FK for one bone and its descendants only. */
  fkFrom(name) {
    const start = this.order.indexOf(name);
    const inSubtree = new Set([name]);
    for (let i = start; i < this.order.length; i += 1) {
      const n = this.order[i];
      if (i !== start && !inSubtree.has(this.parent[n])) continue;
      inSubtree.add(n);
      const p = this.parent[n];
      if (!p) {
        this.modelQ[n].copy(this.local[n]);
        this.modelP[n].copy(this.offset[n]).add(this.rootOffset);
      } else {
        this.modelQ[n].multiplyQuaternions(this.modelQ[p], this.local[n]);
        this.modelP[n].copy(this.offset[n]).applyQuaternion(this.modelQ[p]).add(this.modelP[p]);
      }
    }
  }

  /** Posed model-space position of a rest-space point rigidly attached to `bone`. */
  point(bone, restPoint, out) {
    return out.copy(restPoint).sub(this.restHead[bone]).applyQuaternion(this.modelQ[bone]).add(this.modelP[bone]);
  }

  /** Posed model-space direction of a rest-space vector attached to `bone`. */
  dir(bone, restDir, out) {
    return out.copy(restDir).applyQuaternion(this.modelQ[bone]);
  }

  /** Local rotation about a rest-space axis (valid because rest frames are identity). */
  rotateLocal(name, axis, angle) {
    _qa.setFromAxisAngle(axis, angle);
    this.local[name].multiply(_qa);
  }

  /** Copies the solved pose onto the three.js bones. */
  apply() {
    for (const name of this.order) this.bones[name].quaternion.copy(this.local[name]);
    this.bones[this.rootName].position.copy(this.offset[this.rootName]).add(this.rootOffset);
  }
}

/**
 * Two-bone limb whose segments may each be split into two skinned bones
 * (e.g. upperarm01 + upperarm02, lowerarm01 + lowerarm02).
 */
export class Limb {
  constructor(rig, { upper, upperAux, lower, lowerAux, end, hinge }) {
    Object.assign(this, { rig, upper, upperAux, lower, lowerAux, end });
    const h = rig.restHead;
    this.a = h[lower].distanceTo(h[upper]);
    this.b = h[end].distanceTo(h[lower]);
    this.u0 = h[lower].clone().sub(h[upper]).normalize();
    this.f0 = h[end].clone().sub(h[lower]).normalize();
    // Hinge (flexion axis): rotating the lower segment about +hinge flexes the joint.
    this.h0 = hinge ? hinge.clone().normalize() : new Vector3().crossVectors(this.u0, this.f0).normalize();
    this.elbow = new Vector3();
    this.q = new Quaternion();
    this.qf = new Quaternion();
    this.tw = new Quaternion();
    this.u = new Vector3();
    this.f = new Vector3();
    this.h = new Vector3();
    this.reach = 0;
  }

  /**
   * @param {Vector3} target   end-joint (wrist/ankle) position, model space
   * @param {Vector3} pole     preferred bend direction, model space
   * @param {Quaternion} [endQ] model rotation for the end bone (hand/foot)
   * @param {number[]} [split] fraction of the end twist carried by lower / lowerAux
   * @returns {number} reach deficit in metres
   */
  solve(target, pole, endQ, split = [0.2, 0.7]) {
    const { rig } = this;
    const shoulder = rig.modelP[this.upper];
    const deficit = solveTwoBone(shoulder, target, pole, this.a, this.b, this.elbow);
    this.u.subVectors(this.elbow, shoulder).normalize();
    this.f.subVectors(target, this.elbow);
    if (this.f.lengthSq() < 1e-10) this.f.copy(this.u);
    this.f.normalize();
    this.h.crossVectors(this.u, this.f);
    if (this.h.lengthSq() < 1e-8) {
      // Straight limb: keep the hinge perpendicular to the pole plane.
      this.h.crossVectors(this.u, _v.copy(pole)).normalize();
    }
    this.h.normalize();

    frameMap(this.u0, this.h0, this.u, this.h, this.q);
    rig.setModelQ(this.upper, this.q);
    if (this.upperAux) rig.setModelQ(this.upperAux, this.q);

    frameMap(this.f0, this.h0, this.f, this.h, this.qf);
    if (endQ) {
      // Distribute the forearm twist (pronation) along the segment instead of breaking the wrist.
      _qa.copy(this.qf).invert().multiply(endQ);
      twistAbout(_qa, this.f0, this.tw);
      _qb.copy(IDENTITY).slerp(this.tw, split[0]);
      rig.setModelQ(this.lower, _qa.copy(this.qf).multiply(_qb));
      if (this.lowerAux) {
        _qb.copy(IDENTITY).slerp(this.tw, split[1]);
        rig.setModelQ(this.lowerAux, _qa.copy(this.qf).multiply(_qb));
      }
      rig.setModelQ(this.end, endQ);
    } else {
      rig.setModelQ(this.lower, this.qf);
      if (this.lowerAux) rig.setModelQ(this.lowerAux, this.qf);
    }
    this.reach = deficit;
    return deficit;
  }
}

/** Hand description in rest space: palm normal, finger direction, knuckle line and per-finger hinges. */
export class Hand {
  constructor(rig, side) {
    const s = side;
    this.rig = rig;
    this.side = s;
    const h = rig.restHead;
    const t = rig.tail;
    this.wrist = `wrist_${s}`;
    this.fingers = [1, 2, 3, 4, 5].map((f) => [1, 2, 3].map((k) => `finger${f}-${k}_${s}`));
    const mcp = (f) => h[`finger${f}-1_${s}`];
    this.knuckles = mcp(5).clone().sub(mcp(2)).normalize(); // index → pinky
    this.forward = mcp(2).clone().add(mcp(3)).add(mcp(4)).add(mcp(5)).multiplyScalar(0.25).sub(h[this.wrist]).normalize();
    // Palm normal: out of the palm, i.e. on the thumb-tip side of the hand plane.
    this.palm = new Vector3().crossVectors(this.forward, this.knuckles).normalize();
    const thumbTip = t[`finger1-3_${s}`];
    const palmCenter = this.palmCenterRest(new Vector3());
    if (this.palm.dot(_v.subVectors(thumbTip, palmCenter)) < 0) this.palm.negate();
    // Flexion hinge per finger chain: rotating +angle curls toward the palm.
    this.hinges = this.fingers.map((chain, i) => {
      const d = t[chain[2]].clone().sub(h[chain[0]]).normalize();
      if (i === 0) {
        // the thumb curls across the palm, toward its centre
        const toPalm = palmCenter.clone().sub(h[chain[1]]);
        return new Vector3().crossVectors(d, toPalm).normalize();
      }
      return new Vector3().crossVectors(d, this.palm).normalize();
    });
    // Radial direction (toward the thumb side), orthogonal to forward.
    this.radial = this.knuckles.clone().negate();
    this.radial.addScaledVector(this.forward, -this.radial.dot(this.forward)).normalize();
    this.angles = this.fingers.map(() => [0, 0, 0]);
    this.bases = this.fingers.map(() => new Quaternion());
  }

  palmCenterRest(out) {
    const h = this.rig.restHead;
    out.set(0, 0, 0);
    for (const f of [2, 3, 4, 5]) out.add(h[`finger${f}-1_${this.side}`]);
    return out.multiplyScalar(0.25).lerp(h[this.wrist], 0.3);
  }

  /**
   * Curls finger chains. `curls[f]` = [mcp, pip, dip] in radians for fingers 1 (thumb) → 5,
   * `spread[f]` rotates the whole finger about the palm normal (abduction).
   */
  pose(curls, spread = [0, 0, 0, 0, 0], thumbAxis = null) {
    const { rig } = this;
    this.fingers.forEach((chain, i) => {
      const hinge = i === 0 && thumbAxis ? thumbAxis : this.hinges[i];
      const c = curls[i];
      chain.forEach((bone, k) => {
        rig.local[bone].identity();
        if (k === 0 && spread[i]) rig.rotateLocal(bone, this.palm, spread[i]);
        rig.rotateLocal(bone, hinge, c[k]);
      });
    });
  }

  /**
   * Cyclic-coordinate-descent reach: bends finger `f` so its tip lands on `target` (model space).
   * Joints 2–3 (and 1 for fingers) are hinges; the thumb's base joint rotates freely.
   * Solve in rest pose (wrist unrotated); the result is kept in `angles` / `bases`.
   */
  reach(f, target, iterations = 40) {
    const { rig } = this;
    const chain = this.fingers[f];
    const hinge = this.hinges[f];
    const angles = this.angles[f];
    const tip = new Vector3();
    const joint = new Vector3();
    const v1 = new Vector3();
    const v2 = new Vector3();
    const axis = new Vector3();
    const q = new Quaternion();
    const lo = f === 0 ? [0, -0.25, -0.2] : [-0.25, 0, -0.1];
    const hi = f === 0 ? [0, 1.1, 1.2] : [1.55, 1.75, 1.3];
    const last = chain[2];
    for (let it = 0; it < iterations; it += 1) {
      for (let k = 2; k >= 0; k -= 1) {
        const bone = chain[k];
        rig.point(last, rig.tail[last], tip);
        joint.copy(rig.modelP[bone]);
        v1.subVectors(tip, joint);
        v2.subVectors(target, joint);
        if (f === 0 && k === 0) {
          // free-rotating thumb base, damped and limited
          q.setFromUnitVectors(v1.normalize(), v2.normalize());
          _qa.identity().slerp(q, 0.5);
          this.bases[f].premultiply(_qa);
          const angle = 2 * Math.acos(Math.min(1, Math.abs(this.bases[f].w)));
          if (angle > 1.3) this.bases[f].copy(IDENTITY).slerp(this.bases[f], 1.3 / angle);
        } else {
          axis.copy(hinge).applyQuaternion(rig.modelQ[rig.parent[bone]]);
          v1.addScaledVector(axis, -v1.dot(axis));
          v2.addScaledVector(axis, -v2.dot(axis));
          if (v1.lengthSq() < 1e-12 || v2.lengthSq() < 1e-12) continue;
          const delta = Math.atan2(_v.crossVectors(v1, v2).dot(axis), v1.dot(v2));
          angles[k] = Math.max(lo[k], Math.min(hi[k], angles[k] + delta));
        }
        this.applySolved(f);
        rig.fkFrom(chain[0]);
      }
    }
    return rig.point(last, rig.tail[last], tip).distanceTo(target);
  }

  /** Re-applies solved (or set) finger angles as local rotations. */
  applySolved(f) {
    const { rig } = this;
    this.fingers[f].forEach((bone, k) => {
      const local = rig.local[bone];
      if (k === 0) local.copy(this.bases[f]);
      else local.identity();
      rig.rotateLocal(bone, this.hinges[f], this.angles[f][k]);
    });
  }

  /** Snapshot / restore of the finger pose (local quaternions). */
  capture() {
    return this.fingers.map((chain) => chain.map((bone) => this.rig.local[bone].clone()));
  }

  restore(snapshot) {
    this.fingers.forEach((chain, i) => chain.forEach((bone, k) => this.rig.local[bone].copy(snapshot[i][k])));
  }
}
