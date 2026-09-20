/**
 * Builds src/three/models/designer.glb — the hero's designer — from MakeHuman CC0 assets.
 *
 *   npm run build:designer   (installs this folder's own toolchain first; see package.json here)
 *
 * Recipe: MakeHuman base mesh morphed to a young woman, fitted clothes (blouse from
 * female_elegantsuit01, trousers from female_casualsuit01, shoes04), eyes and eyebrows, and a
 * hair shell grown from the scalp (the bun is added at runtime). The 163-bone default skeleton
 * is pruned to 81 bones (face and toe bones folded into their parents).
 *
 * Every bone has an identity rest rotation, so a bone's bind matrix is a pure translation and
 * the runtime (src/three/designerRig.js) can work entirely in the character's model space.
 * Bone tails are stored in node extras (`userData.tail`).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, meshopt, prune } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import { Sources, parseObj, applyTarget, jointPositions, parseWeights, parseMhclo, fitProxy } from './makehuman.mjs';
import { triangulate, vertexNormals, inflate, loopSubdivide, clipByField } from './geometry.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, '../../src/three/models/designer.glb');
const src = new Sources(path.join(HERE, '.cache'));
const SCALE = 0.1; // MakeHuman decimetres → metres

// ── Body shape ───────────────────────────────────────────────────────────
const MORPHS = [
  ['caucasian-female-young', 0.45],
  ['african-female-young', 0.25],
  ['asian-female-young', 0.3],
  ['universal-female-young-averagemuscle-averageweight', 1],
  ['proportions/female-young-averagemuscle-averageweight-idealproportions', 0.6],
];

// ── Skeleton: bones kept from MakeHuman's default rig ────────────────────
const sides = (names) => names.flatMap((n) => [`${n}.L`, `${n}.R`]);
const KEEP = new Set([
  'root', 'spine05', 'spine04', 'spine03', 'spine02', 'spine01', 'neck01', 'neck02', 'neck03', 'head', 'jaw',
  ...sides(['eye', 'orbicularis03', 'orbicularis04']),
  ...sides(['clavicle', 'shoulder01', 'upperarm01', 'upperarm02', 'lowerarm01', 'lowerarm02', 'wrist']),
  ...sides(['metacarpal1', 'metacarpal2', 'metacarpal3', 'metacarpal4']),
  ...sides([1, 2, 3, 4, 5].flatMap((f) => [1, 2, 3].map((k) => `finger${f}-${k}`))),
  ...sides(['pelvis', 'upperleg01', 'upperleg02', 'lowerleg01', 'lowerleg02', 'foot']),
]);

// ── Garments (from the CC0 system-asset pack) ────────────────────────────
// `piece`: keep the upper or lower connected piece of a two-piece outfit.
const GARMENTS = [
  { name: 'Top', dir: 'clothes/female_elegantsuit01', file: 'female_elegantsuit01', piece: 'upper', subdivide: 1, inflate: 0.003 },
  { name: 'Trousers', dir: 'clothes/female_casualsuit01', file: 'female_casualsuit01', piece: 'lower', subdivide: 1, inflate: 0.004 },
  { name: 'Shoes', dir: 'clothes/shoes04', file: 'shoes04' },
];

// ── Hair: hairline height (model metres) by azimuth around the head (0° forehead, 180° nape) ──
const HAIRLINE = [
  [0, 0.735], [25, 0.732], [45, 0.721], [60, 0.705], [72, 0.69], [82, 0.675], [90, 0.694],
  [100, 0.7], [112, 0.69], [125, 0.66], [145, 0.628], [180, 0.607],
];
const HEAD_CENTER_Z = 0.045;

// ─────────────────────────────────────────────────────────────────────────
const smoothstep = (a, b, v) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const base = parseObj(await src.repo('3dobjs/base.obj'));
const coords = Float64Array.from(base.v);
for (const [target, weight] of MORPHS) applyTarget(coords, await src.repo(`targets/macrodetails/${target}.target`), weight);
const bodyPos = (i) => [coords[i * 3] * SCALE, coords[i * 3 + 1] * SCALE, coords[i * 3 + 2] * SCALE];

const skel = JSON.parse(await src.repo('rigs/default.mhskel'));
const joints = jointPositions(skel, coords);
const keptAncestor = (name) => {
  let n = name;
  while (n && !KEEP.has(n)) n = skel.bones[n].parent;
  return n;
};
const depth = (n) => {
  let d = 0;
  for (let p = skel.bones[n].parent; p; p = skel.bones[p].parent) d += 1;
  return d;
};
const boneNames = Object.keys(skel.bones)
  .filter((n) => KEEP.has(n))
  .sort((a, b) => depth(a) - depth(b));
const boneIndex = new Map(boneNames.map((n, i) => [n, i]));
const glName = (n) => n.replace(/\.L$/, '_L').replace(/\.R$/, '_R');
const headOf = (n) => joints[skel.bones[n].head].map((x) => x * SCALE);
const tailOf = (n) => joints[skel.bones[n].tail].map((x) => x * SCALE);

const bodyWeights = parseWeights(await src.repo('rigs/default_weights.mhw'), coords.length / 3).map((m) => {
  const merged = new Map();
  for (const [bone, w] of m) {
    const kept = keptAncestor(bone);
    merged.set(kept, (merged.get(kept) || 0) + w);
  }
  return merged;
});

// ── Parts ────────────────────────────────────────────────────────────────
const parts = [];
const hidden = new Set();

/** Indexed buffers for one part; vertices are welded by id unless `uv` is given. */
function addPart(name, { tris, pos, weights, normal, uv }) {
  const normals = normal ? null : vertexNormals(tris, pos);
  const remap = new Map();
  const P = [];
  const N = [];
  const J = [];
  const W = [];
  const UV = [];
  const I = [];
  for (const tri of tris) {
    for (const c of tri) {
      const key = uv ? `${c.v}/${c.t}` : c.v;
      let idx = remap.get(key);
      if (idx === undefined) {
        idx = P.length / 3;
        remap.set(key, idx);
        P.push(...pos(c.v));
        N.push(...(normal ? normal(c.v) : normals.get(c.v)));
        const list = [...weights(c.v)].filter(([, w]) => w > 1e-4).sort((a, b) => b[1] - a[1]).slice(0, 4);
        const sum = list.reduce((s, [, w]) => s + w, 0) || 1;
        for (let k = 0; k < 4; k += 1) {
          J.push(list[k] ? boneIndex.get(list[k][0]) : 0);
          W.push(list[k] ? list[k][1] / sum : k === 0 && !list.length ? 1 : 0);
        }
        if (uv) UV.push(...uv(c.t));
      }
      I.push(idx);
    }
  }
  parts.push({ name, P, N, J, W, UV: uv ? UV : null, I });
}

const fromPack = async (file) => (await src.pack([file])).get(file);
const fromRepo = (file) => src.repo(file);

async function loadProxy(dir, file, read = fromPack) {
  const clo = parseMhclo(await read(`${dir}/${file}.mhclo`));
  const obj = parseObj(await read(`${dir}/${clo.meta.obj_file}`));
  const fitted = fitProxy(clo, coords);
  return {
    clo,
    obj,
    fitted,
    faces: [...obj.groups.values()].flat(),
    pos: (i) => [fitted[i * 3] * SCALE, fitted[i * 3 + 1] * SCALE, fitted[i * 3 + 2] * SCALE],
    // Proxy weights: the body weights of its reference triangle, blended.
    weights: (i) => {
      const [a, b, c, wa, wb, wc] = clo.refs[i];
      const m = new Map();
      for (const [v, f] of [
        [a, wa],
        [b, wb],
        [c, wc],
      ]) {
        if (f) for (const [bone, w] of bodyWeights[v]) m.set(bone, (m.get(bone) || 0) + w * f);
      }
      return m;
    },
  };
}

/** Upper or lower connected piece of a garment. */
function pieceFaces(proxy, which) {
  const n = proxy.obj.v.length / 3;
  const parent = Int32Array.from({ length: n }, (_, i) => i);
  const find = (a) => (parent[a] === a ? a : (parent[a] = find(parent[a])));
  for (const f of proxy.faces) for (let k = 1; k < f.v.length; k += 1) parent[find(f.v[k])] = find(f.v[0]);
  const heights = new Map();
  for (let i = 0; i < n; i += 1) {
    const r = find(i);
    const h = heights.get(r) || [0, 0];
    h[0] += proxy.obj.v[i * 3 + 1];
    h[1] += 1;
    heights.set(r, h);
  }
  const sorted = [...heights.entries()].sort((a, b) => b[1][0] / b[1][1] - a[1][0] / a[1][1]);
  const keep = which === 'upper' ? sorted[0][0] : sorted[sorted.length - 1][0];
  return proxy.faces.filter((f) => find(f.v[0]) === keep);
}

/** Hides the body only under the garment faces actually used (within 3.5 cm). */
function hideUnder(proxy, faces) {
  const cell = 0.4; // decimetres
  const grid = new Map();
  const cellKey = (x, y, z) => `${Math.floor(x / cell)},${Math.floor(y / cell)},${Math.floor(z / cell)}`;
  for (const i of new Set(faces.flatMap((f) => f.v))) {
    const k = cellKey(proxy.fitted[i * 3], proxy.fitted[i * 3 + 1], proxy.fitted[i * 3 + 2]);
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(i);
  }
  const near = (v) => {
    const [x, y, z] = [coords[v * 3], coords[v * 3 + 1], coords[v * 3 + 2]];
    for (let a = -1; a <= 1; a += 1)
      for (let b = -1; b <= 1; b += 1)
        for (let c = -1; c <= 1; c += 1) {
          const list = grid.get(cellKey(x + a * cell, y + b * cell, z + c * cell)) || [];
          for (const i of list) {
            if (Math.hypot(proxy.fitted[i * 3] - x, proxy.fitted[i * 3 + 1] - y, proxy.fitted[i * 3 + 2] - z) < 0.35) return true;
          }
        }
    return false;
  };
  for (const v of proxy.clo.deleteVerts) if (near(v)) hidden.add(v);
}

for (const g of GARMENTS) {
  const proxy = await loadProxy(g.dir, g.file);
  const faces = g.piece ? pieceFaces(proxy, g.piece) : proxy.faces;
  hideUnder(proxy, faces);
  let mesh = { tris: triangulate(faces), pos: proxy.pos, weights: proxy.weights };
  if (g.inflate) mesh = inflate(mesh, g.inflate);
  for (let k = 0; k < (g.subdivide || 0); k += 1) mesh = loopSubdivide(mesh);
  addPart(g.name, mesh);
}

// Eyes (rotate with the eye bones) and eyebrows, textured through their UVs at runtime.
for (const [name, dir, file, read] of [
  ['Eyes', 'eyes/low-poly', 'low-poly', fromRepo],
  ['Brows', 'eyebrows/eyebrow001', 'eyebrow001', fromPack],
]) {
  const proxy = await loadProxy(dir, file, read);
  addPart(name, {
    tris: triangulate(proxy.faces),
    pos: proxy.pos,
    weights: proxy.weights,
    uv: (t) => [proxy.obj.vt[t * 2], 1 - proxy.obj.vt[t * 2 + 1]],
  });
}

// Hair shell: subdivide the scalp, trim it on the hairline, then grow it outward —
// thin at the hairline, fuller on the crown, with a soft centre parting at the front.
const allBody = base.groups.get('body');
function hairlineAt(deg) {
  for (let k = 1; k < HAIRLINE.length; k += 1) {
    const [a0, y0] = HAIRLINE[k - 1];
    const [a1, y1] = HAIRLINE[k];
    if (deg <= a1) return y0 + ((deg - a0) / (a1 - a0)) * (y1 - y0);
  }
  return HAIRLINE[HAIRLINE.length - 1][1];
}
const hairDepth = ([x, y, z]) => (y < 0.58 ? -1 : y - hairlineAt(Math.abs((Math.atan2(x, z - HEAD_CENTER_Z) * 180) / Math.PI)));
{
  const scalpFaces = allBody.filter((f) => f.v.some((v) => hairDepth(bodyPos(v)) > -0.006));
  let scalp = { tris: triangulate(scalpFaces), pos: bodyPos, weights: (v) => bodyWeights[v] };
  scalp = loopSubdivide(loopSubdivide(scalp));
  const hair = clipByField(scalp, hairDepth);
  addPart('Hair', {
    tris: hair.tris,
    weights: hair.weights,
    pos: (v) => {
      const q = hair.pos(v);
      const n = hair.normal(v);
      const l = Math.hypot(n[0], n[1], n[2]) || 1;
      const d0 = Math.max(0, hairDepth(q));
      const parting = q[2] > 0 ? 0.0035 * Math.exp(-((q[0] / 0.005) ** 2)) * smoothstep(0, 0.02, d0) : 0;
      const d = 0.0032 + 0.0095 * smoothstep(0, 0.03, d0) - parting;
      return [q[0] + (n[0] / l) * d, q[1] + (n[1] / l) * d, q[2] + (n[2] / l) * d];
    },
  });
}

// Body, minus what the clothes cover.
addPart('Body', {
  tris: triangulate(allBody.filter((f) => !f.v.some((v) => hidden.has(v)))),
  pos: bodyPos,
  weights: (v) => bodyWeights[v],
});

// ── glTF ─────────────────────────────────────────────────────────────────
const doc = new Document();
doc.createBuffer();
const buffer = doc.getRoot().listBuffers()[0];
const root = doc.createNode('Designer');
doc.createScene('Designer').addChild(root);

const nodes = boneNames.map((n) => {
  const h = headOf(n);
  const parent = keptAncestor(skel.bones[n].parent);
  const ph = parent ? headOf(parent) : [0, 0, 0];
  const node = doc
    .createNode(glName(n))
    .setTranslation([h[0] - ph[0], h[1] - ph[1], h[2] - ph[2]])
    .setExtras({ tail: tailOf(n).map((x) => +x.toFixed(5)) });
  return { node, parent };
});
for (const { node, parent } of nodes) (parent ? nodes[boneIndex.get(parent)].node : root).addChild(node);

const ibm = new Float32Array(boneNames.length * 16);
boneNames.forEach((n, i) => {
  const h = headOf(n);
  ibm.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -h[0], -h[1], -h[2], 1], i * 16);
});
const skin = doc
  .createSkin('Designer')
  .setSkeleton(nodes[0].node)
  .setInverseBindMatrices(doc.createAccessor().setType('MAT4').setArray(ibm).setBuffer(buffer));
for (const { node } of nodes) skin.addJoint(node);

const accessor = (type, array) => doc.createAccessor().setType(type).setArray(array).setBuffer(buffer);
for (const part of parts) {
  const prim = doc
    .createPrimitive()
    .setAttribute('POSITION', accessor('VEC3', new Float32Array(part.P)))
    .setAttribute('NORMAL', accessor('VEC3', new Float32Array(part.N)))
    .setAttribute('JOINTS_0', accessor('VEC4', new Uint8Array(part.J)))
    .setAttribute('WEIGHTS_0', accessor('VEC4', new Float32Array(part.W)))
    .setIndices(accessor('SCALAR', new Uint32Array(part.I)))
    .setMaterial(doc.createMaterial(part.name));
  if (part.UV) prim.setAttribute('TEXCOORD_0', accessor('VEC2', new Float32Array(part.UV)));
  root.addChild(doc.createNode(part.name).setMesh(doc.createMesh(part.name).addPrimitive(prim)).setSkin(skin));
}

await MeshoptEncoder.ready;
// keepAttributes: UVs are used by textures assigned at runtime (eyes, brows).
await doc.transform(dedup(), prune({ keepAttributes: true }), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
fs.mkdirSync(path.dirname(OUT), { recursive: true });
await new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder }).write(OUT, doc);

const summary = parts.map((p) => `${p.name} ${p.P.length / 3}v`).join(', ');
console.log(`designer.glb: ${boneNames.length} bones; ${summary}; ${(fs.statSync(OUT).size / 1024).toFixed(0)} KB`);
