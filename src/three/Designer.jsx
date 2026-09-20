import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import {
  CanvasTexture,
  CatmullRomCurve3,
  DataTexture,
  DoubleSide,
  Euler,
  LinearFilter,
  Matrix4,
  MeshToonMaterial,
  NearestFilter,
  Quaternion,
  RedFormat,
  SkinnedMesh,
  SRGBColorSpace,
  TubeGeometry,
  Vector3,
} from 'three';
import { heroState, clamp01 } from './heroState';
import { boardMatrix, boardQuaternion, DESIGNER_ROOT, paperToLocal, PAPER } from './sceneConfig';
import { REST_POINT } from './sketchPaths';
import { damp } from './ik';
import { getMaterials, TONES } from './toonGradient';
import { geo, Part } from './parts';
import { getOutlineMaterial } from './Outline';
import { frameMap, Hand, HumanRig, Limb } from './designerRig';
import designerUrl from './models/designer.glb?url';

useGLTF.preload(designerUrl);

/**
 * The character renders on its own layer (the main camera enables it): drei's ContactShadows and
 * the lamp's shadow map would otherwise redraw the skinned meshes every frame, with shader
 * variants that compile on first use, for shadows that are not visible at this scale.
 */
const CHARACTER_LAYER = 1;

/** Seat placement: the model origin sits between the hip joints. */
const SCALE = 1.04;
const PLACE = new Vector3(DESIGNER_ROOT.x, 0.745, DESIGNER_ROOT.z - 0.04);
const PLACE_Q = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI);
const TO_MODEL = new Matrix4().compose(PLACE, PLACE_Q, new Vector3(SCALE, SCALE, SCALE)).invert();
const TO_MODEL_Q = PLACE_Q.clone().invert();

const worldToModel = (v) => v.applyMatrix4(TO_MODEL);
const dirToModel = (v) => v.applyQuaternion(TO_MODEL_Q).normalize();
const boardDir = (x, y, z) => dirToModel(new Vector3(x, y, z).normalize().applyQuaternion(boardQuaternion));

// ── Poses (model space unless noted) ─────────────────────────────────────
const X = new Vector3(1, 0, 0);
const Y = new Vector3(0, 1, 0);
const Z = new Vector3(0, 0, 1);

// Tripod grip (hand rest frame). Natural curls [mcp, pip, dip] per finger (thumb → pinky), the
// pencil's offset under the index pad, and IK contacts around the pencil for the thumb and
// middle finger as [dorsal, radial, along-pencil] metres (null = keep the curl).
const GRIP = {
  curls: [
    [0, 0.25, 0.2],
    [0.42, 0.62, 0.28],
    [0.62, 0.85, 0.45],
    [0.95, 1.15, 0.6],
    [1.1, 1.2, 0.6],
  ],
  pad: 0.0085,
  back: 0.004,
  web: 0.013,
  tip: 0.028,
  contacts: [[-0.002, 0.0045, 0.013], null, [-0.005, -0.0075, -0.004], null, null],
};
const RELAXED = {
  curls: [
    [0.08, 0.12, 0.1],
    [0.12, 0.2, 0.12],
    [0.16, 0.25, 0.15],
    [0.2, 0.3, 0.18],
    [0.24, 0.34, 0.2],
  ],
  spread: [0, -0.12, -0.03, 0.05, 0.15],
};

// Writing hand: pencil leans back over the knuckles toward the right shoulder (board space).
const PENCIL_WRITE = boardDir(0.32, 0.78, 0.55);
const PENCIL_REST = boardDir(0.25, 0.55, 0.8);
const PALM_WRITE = dirToModel(new Vector3(-0.75, -0.55, 0.1));
const PALM_REST = dirToModel(new Vector3(-0.6, -0.75, 0.2));
// Thinking gesture (head space): the pencil rises from below-front to her lips, palm toward her.
const THINK_PENCIL = new Vector3(0.3, 0.46, -0.84).normalize();
const THINK_PALM = new Vector3(0.85, -0.05, -0.5).normalize();
const LIPS = new Vector3(0, 0.604, 0.146);
const PENCIL_END = 0.16; // graphite tip → eraser end
const POLE_THINK = dirToModel(new Vector3(0.35, -1, 0.15));
const NECK = [
  ['neck01', 0.22],
  ['neck02', 0.18],
  ['neck03', 0.15],
  ['head', 0.45],
];
// Left hand flat on the scale ruler, fingers toward the far edge.
const LEFT_FINGERS = boardDir(0.35, 0, -1);
const LEFT_PALM = boardDir(0, -1, 0);
// Elbow and knee poles (world → model).
const POLE_R = dirToModel(new Vector3(0.6, -0.8, 0.25));
const POLE_L = dirToModel(new Vector3(-0.9, -0.5, 0.3));
const POLE_KNEE = dirToModel(new Vector3(0, 0.15, -1));
// Feet on the stool's brass foot ring (world).
const FOOT_L = worldToModel(new Vector3(-0.1, 0.3, DESIGNER_ROOT.z - 0.15));
const FOOT_R = worldToModel(new Vector3(0.11, 0.29, DESIGNER_ROOT.z - 0.14));
const FOOT_FWD = dirToModel(new Vector3(0, -0.35, -1));
const FOOT_UP = dirToModel(new Vector3(0, 1, -0.35));

const smoothstep = (a, b, v) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

function toonRamp(values, linear) {
  const t = new DataTexture(new Uint8Array(values), values.length, 1, RedFormat);
  t.minFilter = linear ? LinearFilter : NearestFilter;
  t.magFilter = linear ? LinearFilter : NearestFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
}

/** Iris / pupil texture laid out like MakeHuman's eye UVs (two eyes on one sheet). */
function eyeTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#efe9e1';
  ctx.fillRect(0, 0, 128, 128);
  for (const [u, v] of [
    [0.288, 0.708],
    [0.705, 0.298],
  ]) {
    ctx.fillStyle = '#3b2417';
    ctx.beginPath();
    ctx.arc(u * 128, v * 128, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0d0a08';
    ctx.beginPath();
    ctx.arc(u * 128, v * 128, 5.5, 0, Math.PI * 2);
    ctx.fill();
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.flipY = false;
  return t;
}

/** Eyebrows drawn onto MakeHuman's brow UV layout (left brow on top, mirrored one below). */
function browTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1c130e';
  const brow = (flip, dy) => {
    const bx = (x) => (flip ? 512 - x : x) / 2;
    const by = (y) => (y + dy) / 2;
    ctx.beginPath();
    ctx.moveTo(bx(22), by(210));
    ctx.quadraticCurveTo(bx(175), by(158), bx(484), by(244));
    ctx.quadraticCurveTo(bx(250), by(202), bx(26), by(236));
    ctx.closePath();
    ctx.fill();
  };
  brow(false, 0);
  brow(true, 128);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.flipY = false;
  return t;
}

let characterMaterials = null;
function getCharacterMaterials() {
  if (characterMaterials) return characterMaterials;
  // Softer (filtered) ramps than the props: skin and cloth read as rounded forms.
  const soft = toonRamp([78, 132, 186, 228, 255], true);
  const cloth = toonRamp([74, 130, 190, 236, 255], true);
  const make = (color, gradientMap = cloth, extra = {}) => new MeshToonMaterial({ color, gradientMap, ...extra });
  characterMaterials = {
    Body: make(TONES.skin, soft),
    Top: make('#e4d8c6', cloth, { side: DoubleSide }),
    Trousers: make(TONES.sage, cloth, { side: DoubleSide }),
    Shoes: make(TONES.espresso),
    Eyes: make('#ffffff', soft, { map: eyeTexture() }),
    Brows: make('#ffffff', cloth, { map: browTexture(), alphaTest: 0.4 }),
    Hair: make('#2a1d16'),
    HairTie: make(TONES.rust),
  };
  return characterMaterials;
}

/** A coiled chignon: a hair rope spiralling inward and upward into a dome (bun-local, +Y out). */
function bunGeometry() {
  const points = [];
  const turns = 2.3;
  for (let i = 0; i <= 90; i += 1) {
    const s = i / 90;
    const a = s * turns * Math.PI * 2;
    const r = 0.031 * (1 - 0.82 * s);
    const h = 0.03 * Math.sin(s * Math.PI * 0.5) + 0.004;
    points.push(new Vector3(Math.cos(a) * r, h, Math.sin(a) * r));
  }
  return new TubeGeometry(new CatmullRomCurve3(points), 120, 0.0115, 8, false);
}

/** Hooks the GLB meshes up to toon materials and skinned outlines. */
function prepareCharacter(scene, dpr, outlines) {
  const mats = getCharacterMaterials();
  const meshes = [];
  scene.traverse((o) => {
    if (o.isSkinnedMesh) meshes.push(o);
  });
  for (const mesh of meshes) {
    const decal = mesh.name === 'Eyes' || mesh.name === 'Brows';
    mesh.material = mats[mesh.name] || mats.Body;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = false;
    const old = mesh.children.find((c) => c.userData.outline);
    if (old) mesh.remove(old);
    if (outlines && !decal) {
      // The GLB's vertices are welded with smooth normals, so the hull can share the geometry
      // (no creasing pass needed).
      const hull = new SkinnedMesh(mesh.geometry, getOutlineMaterial(TONES.outline, 1.5 * dpr));
      hull.bind(mesh.skeleton, mesh.bindMatrix);
      hull.frustumCulled = false;
      hull.userData.outline = true;
      hull.raycast = () => {};
      mesh.add(hull);
    }
  }
}

/**
 * The designer: a MakeHuman-based character (CC0, built by scripts/designer/build.mjs) seated
 * at the drafting table. Her pencil tip follows the sketch through arm IK with a solved tripod
 * grip; the other hand steadies the ruler, head and eyes track the pencil, and once the model
 * rises she sits back with the pencil at her lips.
 */
export default function Designer({ outlines = true }) {
  const { scene } = useGLTF(designerUrl);
  const dpr = useThree((s) => s.viewport.dpr);
  const camera = useThree((s) => s.camera);
  const root = useRef(null);
  const pencil = useRef(null);
  const glasses = useRef(null);
  const bangle = useRef(null);
  const bun = useRef(null);

  useEffect(() => {
    prepareCharacter(scene, dpr, outlines);
  }, [scene, dpr, outlines]);

  const rig = useMemo(() => {
    const r = new HumanRig(scene);
    const handR = new Hand(r, 'R');
    const handL = new Hand(r, 'L');
    const armR = new Limb(r, { upper: 'upperarm01_R', upperAux: 'upperarm02_R', lower: 'lowerarm01_R', lowerAux: 'lowerarm02_R', end: 'wrist_R' });
    const armL = new Limb(r, { upper: 'upperarm01_L', upperAux: 'upperarm02_L', lower: 'lowerarm01_L', lowerAux: 'lowerarm02_L', end: 'wrist_L' });
    const legR = new Limb(r, { upper: 'upperleg01_R', upperAux: 'upperleg02_R', lower: 'lowerleg01_R', lowerAux: 'lowerleg02_R', end: 'foot_R', hinge: X });
    const legL = new Limb(r, { upper: 'upperleg01_L', upperAux: 'upperleg02_L', lower: 'lowerleg01_L', lowerAux: 'lowerleg02_L', end: 'foot_L', hinge: X });

    // Tripod grip, solved once in rest space: fingers curl to natural angles, the pencil lies
    // under the index pad and back over the thumb–index web, then the thumb (and middle finger)
    // reach for it.
    r.reset();
    GRIP.curls.forEach((c, f) => {
      handR.angles[f] = [...c];
      handR.applySolved(f);
    });
    r.fk();
    const H = r.restHead;
    const Pn = handR.palm;
    const indexTip = r.point('finger2-3_R', r.tail['finger2-3_R'], new Vector3());
    const pad = r.dir('finger2-3_R', Pn, new Vector3());
    const distal = r.dir('finger2-3_R', r.tail['finger2-3_R'].clone().sub(H['finger2-3_R']).normalize(), new Vector3());
    const pinch = indexTip.clone().addScaledVector(pad, GRIP.pad).addScaledVector(distal, -GRIP.back);
    const web = H['finger2-1_R'].clone().lerp(H['finger1-2_R'], 0.5).addScaledVector(Pn, -GRIP.web);
    const axis = web.clone().sub(pinch).normalize();
    const up = pad.clone().negate();
    up.addScaledVector(axis, -up.dot(axis)).normalize();
    const side = new Vector3().crossVectors(axis, up).normalize();
    if (side.dot(handR.radial) < 0) side.negate();
    const at = ([u, sd, al]) => pinch.clone().addScaledVector(up, u).addScaledVector(side, sd).addScaledVector(axis, al);
    GRIP.contacts.forEach((c, f) => c && handR.reach(f, at(c)));
    const gripPose = handR.capture();
    const wristRest = H.wrist_R;
    const grip = {
      axis,
      pinch: pinch.clone().sub(wristRest),
      tip: pinch.clone().addScaledVector(axis, -GRIP.tip).sub(wristRest),
      palm: Pn.clone(),
    };
    const palmL = handL.palmCenterRest(new Vector3()).sub(r.restHead.wrist_L);
    r.reset();
    r.fk();

    return {
      r,
      handR,
      handL,
      armR,
      armL,
      legR,
      legL,
      grip,
      gripPose,
      palmL,
      // scratch
      tip: new Vector3(),
      wrist: new Vector3(),
      palm: new Vector3(),
      look: new Vector3(),
      tmp: new Vector3(),
      a: new Vector3(),
      p: new Vector3(),
      pole: new Vector3(),
      q: new Quaternion(),
      q2: new Quaternion(),
      e: new Euler(0, 0, 0, 'YXZ'),
      penLocal: new Vector3(),
      restLocal: paperToLocal(REST_POINT[0], REST_POINT[1], 0, new Vector3()),
      restWorld: paperToLocal(REST_POINT[0], REST_POINT[1], 0.09, new Vector3()).applyMatrix4(boardMatrix),
      planCenter: paperToLocal(610, 470, 0.02, new Vector3()).applyMatrix4(boardMatrix),
      pose: { lean: 0.3, yaw: -0.1, shift: 0.02, deficit: 0, blinkAt: 2.2, blink: 0, headQ: new Quaternion() },
    };
  }, [scene]);

  // Accessories live on bones; their rest-space offsets come from the solved grip / joints.
  const attach = useMemo(() => {
    const { r, grip } = rig;
    const eyeL = r.restHead.eye_L;
    const eyeR = r.restHead.eye_R;
    const head = r.restHead.head;
    const wristL = r.restHead.wrist_L;
    const foreL = wristL.clone().sub(r.restHead.lowerarm02_L).normalize();
    // The bun sits on the back of the crown, facing away from the head's centre.
    const bunBase = new Vector3(0, 0.748, -0.04);
    const bunAxis = bunBase.clone().sub(new Vector3(0, 0.7, 0.045)).normalize();
    return {
      bun: {
        position: bunBase.clone().sub(head).toArray(),
        quaternion: new Quaternion().setFromUnitVectors(Y, bunAxis).toArray(),
        geometry: bunGeometry(),
      },
      pencil: { position: grip.pinch.toArray(), quaternion: new Quaternion().setFromUnitVectors(Y, grip.axis).toArray() },
      glasses: { center: eyeL.clone().add(eyeR).multiplyScalar(0.5).sub(head), half: eyeL.x - eyeR.x },
      bangle: {
        position: wristL.clone().addScaledVector(foreL, -0.035).sub(r.restHead.lowerarm02_L).toArray(),
        quaternion: new Quaternion().setFromUnitVectors(Y, foreL).toArray(),
      },
    };
  }, [rig]);

  useEffect(() => {
    const { r } = rig;
    const bind = (ref, bone) => {
      const obj = ref.current;
      if (obj && r.bones[bone]) r.bones[bone].add(obj);
      return () => obj?.removeFromParent();
    };
    const undo = [bind(pencil, 'wrist_R'), bind(glasses, 'head'), bind(bangle, 'lowerarm02_L'), bind(bun, 'head')];
    return () => undo.forEach((u) => u());
  }, [rig]);

  // Runs after the outlines and accessories are in place.
  useEffect(() => {
    camera.layers.enable(CHARACTER_LAYER);
    root.current?.traverse((o) => {
      if (o.isMesh) {
        o.layers.set(CHARACTER_LAYER);
        o.castShadow = false;
      }
    });
  }, [camera, rig, outlines, dpr]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const t = state.clock.elapsedTime;
    const w = rig;
    const { r } = w;
    const P = w.pose;
    const pen = heroState.pen;
    const build = heroState.build;
    const sketching = heroState.sketch > 0.0005 && heroState.sketch < 0.9995;
    const back = smoothstep(0.02, 0.4, build);

    // ── Torso follows the pencil ───────────────────────────────────────
    paperToLocal(pen.x, pen.y, 0, w.penLocal);
    let yawT = Math.max(-0.3, Math.min(0.4, -w.penLocal.x * 1.1));
    let leanT = 0.34 + -w.penLocal.z * 0.9 + P.deficit * 3;
    let shiftT = w.penLocal.x * 0.22;
    if (!sketching) {
      yawT = -w.restLocal.x * 0.5;
      leanT = 0.28;
      shiftT = w.restLocal.x * 0.1;
    }
    leanT = leanT * (1 - back) + 0.02 * back;
    yawT = yawT * (1 - back) + 0.04 * back;
    shiftT *= 1 - back;
    P.lean += (leanT - P.lean) * damp(3.5, dt);
    P.yaw += (yawT - P.yaw) * damp(3, dt);
    P.shift += (shiftT - P.shift) * damp(2.5, dt);

    const breath = Math.sin(t * 1.7) * 0.5 + 0.5;
    r.reset();
    r.rootOffset.set(-P.shift, 0, 0);
    r.local.root.setFromEuler(w.e.set(P.lean * 0.18, P.yaw * 0.15, 0, 'YXZ'));
    const spine = [
      ['spine05', 0.12, 0.12],
      ['spine04', 0.18, 0.18],
      ['spine03', 0.22, 0.22],
      ['spine02', 0.16, 0.2],
      ['spine01', 0.14, 0.13],
    ];
    for (const [name, lean, yaw] of spine) {
      const b = name === 'spine01' || name === 'spine02' ? breath * 0.012 : 0;
      r.local[name].setFromEuler(w.e.set(P.lean * lean + b, P.yaw * yaw, Math.sin(t * 0.5) * 0.004, 'YXZ'));
    }
    r.fk();

    // ── Legs: feet on the foot ring ─────────────────────────────────────
    frameMap(Y, Z, FOOT_UP, FOOT_FWD, w.q);
    w.legL.solve(FOOT_L, POLE_KNEE, w.q, [0, 0]);
    w.legR.solve(FOOT_R, POLE_KNEE, w.q, [0, 0]);

    // ── Head & eyes follow the pencil (or admire the model) ─────────────
    w.look.copy(back > 0.5 ? w.planCenter : heroState.penWorld);
    worldToModel(w.look);
    w.tmp.subVectors(w.look, r.modelP.head).normalize();
    // desired head rotation in spine01's frame
    w.q.copy(r.modelQ.spine01).invert();
    w.tmp.applyQuaternion(w.q);
    const yaw = Math.atan2(w.tmp.x, w.tmp.z);
    const pitch = Math.atan2(-w.tmp.y, Math.hypot(w.tmp.x, w.tmp.z));
    const nodPhase = clamp01((build - 0.42) / 0.3);
    const nod = Math.sin(nodPhase * Math.PI * 4) * 0.12 * Math.sin(nodPhase * Math.PI);
    const hp = Math.max(-0.35, Math.min(1.0, pitch)) + nod + Math.sin(t * 0.9) * 0.012;
    const hy = Math.max(-0.8, Math.min(0.8, yaw)) + Math.sin(t * 0.37) * 0.025;
    const hr = Math.sin(t * 0.53) * 0.02 - hy * 0.08 + back * 0.06;
    P.headQ.slerp(w.q.setFromEuler(w.e.set(hp, hy, hr, 'YXZ')), damp(6, dt));
    for (const [name, k] of NECK) r.local[name].identity().slerp(P.headQ, k);
    r.fkFrom('neck01');

    // Eyes: blink every few seconds, gaze toward the target.
    if (t > P.blinkAt) {
      P.blink = 1;
      P.blinkAt = t + 2.4 + Math.random() * 3.2;
    }
    P.blink = Math.max(0, P.blink - dt * 7);
    const lid = P.blink > 0 ? Math.sin(P.blink * Math.PI) : 0;
    const gazeDown = 0.18 * (1 - back * 0.5);
    r.local.orbicularis03_L.setFromAxisAngle(X, gazeDown + lid * 0.55);
    r.local.orbicularis03_R.setFromAxisAngle(X, gazeDown + lid * 0.55);
    r.local.orbicularis04_L.setFromAxisAngle(X, -lid * 0.12);
    r.local.orbicularis04_R.setFromAxisAngle(X, -lid * 0.12);
    r.fkFrom('head');
    for (const side of ['L', 'R']) {
      const eye = `eye_${side}`;
      w.tmp.subVectors(w.look, r.modelP[eye]).normalize().applyQuaternion(w.q.copy(r.modelQ.head).invert());
      const ey = Math.max(-0.5, Math.min(0.5, Math.atan2(w.tmp.x, w.tmp.z)));
      const ex = Math.max(-0.3, Math.min(0.45, Math.atan2(-w.tmp.y, Math.hypot(w.tmp.x, w.tmp.z))));
      r.local[eye].setFromEuler(w.e.set(ex, ey, 0, 'YXZ'));
    }

    // ── Right arm: pencil tip on the drawing point ──────────────────────
    worldToModel(w.tip.copy(heroState.penWorld));
    w.a.copy(PENCIL_WRITE);
    w.p.copy(PALM_WRITE);
    w.pole.copy(POLE_R);
    if (!sketching) {
      w.a.lerp(PENCIL_REST, 0.35).normalize();
      w.p.lerp(PALM_REST, 0.35).normalize();
    }
    if (back > 0) {
      // Sitting back to judge the model: the pencil's end comes up to her lips.
      const think = smoothstep(0.15, 1, back);
      w.tip.lerp(worldToModel(w.tmp.copy(w.restWorld)), clamp01(back * 2));
      r.dir('head', THINK_PENCIL, w.tmp);
      w.a.lerp(w.tmp, think).normalize();
      r.dir('head', THINK_PALM, w.tmp);
      w.p.lerp(w.tmp, think).normalize();
      r.point('head', LIPS, w.tmp).addScaledVector(w.a, -PENCIL_END);
      w.tip.lerp(w.tmp, think);
      w.pole.lerp(POLE_THINK, think).normalize();
    }
    frameMap(w.grip.axis, w.grip.palm, w.a, w.p, w.q);
    w.wrist.copy(w.grip.tip).applyQuaternion(w.q).negate().add(w.tip);
    // Shoulder girdle reaches toward the pencil.
    const reachR = clamp01((w.wrist.distanceTo(r.modelP.upperarm01_R) - 0.3) / 0.2);
    r.local.clavicle_R.setFromEuler(w.e.set(0, 0.2 * reachR, -0.06 * reachR, 'YXZ'));
    r.fkFrom('clavicle_R');
    w.handR.restore(w.gripPose);
    const deficit = w.armR.solve(w.wrist, w.pole, w.q);
    P.deficit += (Math.min(0.12, deficit) * (1 - back) - P.deficit) * damp(4, dt);

    // ── Left arm: palm on the ruler, sliding with the drawing ───────────
    const slide = Math.sin(heroState.sketch * Math.PI * 5) * 0.035 + Math.sin(t * 0.8) * 0.004;
    w.palm.set(-PAPER.width / 2 - 0.035, PAPER.y + 0.024, 0.05 + slide - back * 0.03).applyMatrix4(boardMatrix);
    worldToModel(w.palm);
    frameMap(w.handL.forward, w.handL.palm, LEFT_FINGERS, LEFT_PALM, w.q2);
    w.wrist.copy(w.palmL).applyQuaternion(w.q2).negate().add(w.palm);
    r.local.clavicle_L.setFromEuler(w.e.set(0, -0.08, 0.02, 'YXZ'));
    r.fkFrom('clavicle_L');
    w.handL.pose(RELAXED.curls, RELAXED.spread);
    w.armL.solve(w.wrist, POLE_L, w.q2);

    r.apply();
  });

  const m = getMaterials();
  const cm = getCharacterMaterials();
  const o = outlines;
  const g = attach.glasses;
  const rimY = g.center.y + 0.001;
  const rimZ = g.center.z + 0.026;
  return (
    <group ref={root} position={PLACE.toArray()} quaternion={PLACE_Q} scale={SCALE}>
      <primitive object={scene} />
      <group ref={pencil} position={attach.pencil.position} quaternion={attach.pencil.quaternion}>
        {/* local +Y runs from the tip end up toward the eraser */}
        <Part geometry={geo.cylinder(0.0036, 0.0036, 0.13, 6)} material={m.rust} position={[0, 0.053, 0]} outline={o} thickness={1.2} />
        <mesh geometry={geo.cylinder(0.0039, 0.0039, 0.008, 12)} material={m.brass} position={[0, 0.122, 0]} />
        <mesh geometry={geo.cylinder(0.0036, 0.0036, 0.009, 12)} material={m.rustDark} position={[0, 0.13, 0]} />
        <mesh geometry={geo.cone(0.0036, 0.013, 6)} material={m.oak} position={[0, -0.0185, 0]} rotation={[Math.PI, 0, 0]} />
        <mesh geometry={geo.cone(0.0013, 0.005, 6)} material={m.graphite} position={[0, -0.0255, 0]} rotation={[Math.PI, 0, 0]} />
      </group>
      <group ref={glasses} position={[g.center.x, rimY, rimZ]}>
        {[1, -1].map((s) => (
          <mesh key={s} geometry={geo.torus(0.0165, 0.0016, 8, 28)} material={m.brass} position={[(g.half / 2) * s, 0, 0]} />
        ))}
        <mesh geometry={geo.torus(0.007, 0.0014, 6, 12, Math.PI)} material={m.brass} position={[0, 0.003, 0]} />
        {[1, -1].map((s) => (
          <mesh
            key={`t${s}`}
            geometry={geo.cylinder(0.0012, 0.0012, 0.1, 6)}
            material={m.brass}
            position={[(g.half / 2 + 0.017) * s + 0.002 * s, 0.002, -0.05]}
            rotation={[Math.PI / 2, 0, 0]}
          />
        ))}
      </group>
      <group ref={bangle} position={attach.bangle.position} quaternion={attach.bangle.quaternion}>
        <mesh geometry={geo.torus(0.031, 0.0035, 8, 28)} material={m.brass} rotation={[Math.PI / 2, 0, 0]} />
      </group>
      <group ref={bun} position={attach.bun.position} quaternion={attach.bun.quaternion}>
        <Part geometry={attach.bun.geometry} material={cm.Hair} outline={o} />
        <Part geometry={geo.sphere(0.021, 16, 12)} material={cm.Hair} position={[0, 0.014, 0]} outline={false} />
        <Part geometry={geo.torus(0.029, 0.0055, 8, 32)} material={cm.HairTie} position={[0, 0.001, 0]} rotation={[Math.PI / 2, 0, 0]} outline={o} />
        {/* a spare pencil pushed through the bun */}
        <group position={[0, 0.016, 0]} rotation={[0.35, 0.5, 1.2]}>
          <Part geometry={geo.cylinder(0.0034, 0.0034, 0.13, 6)} material={m.oak} outline={o} thickness={1.2} />
          <mesh geometry={geo.cone(0.0034, 0.012, 6)} material={m.oak} position={[0, -0.071, 0]} rotation={[Math.PI, 0, 0]} />
          <mesh geometry={geo.cone(0.0012, 0.004, 6)} material={m.graphite} position={[0, -0.0785, 0]} rotation={[Math.PI, 0, 0]} />
          <mesh geometry={geo.cylinder(0.0036, 0.0036, 0.008, 10)} material={m.brass} position={[0, 0.067, 0]} />
        </group>
      </group>
    </group>
  );
}
