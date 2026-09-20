/**
 * Mesh helpers for build.mjs.
 *
 * A mesh is { tris, pos, weights }: `tris` is a list of triangles whose corners are
 * { v: vertexId, t: uvIndex }, `pos(v)` returns [x, y, z] and `weights(v)` a Map<bone, weight>.
 */

export function triangulate(faces) {
  const tris = [];
  const corner = (f, k) => ({ v: f.v[k], t: f.t[k] });
  for (const f of faces) {
    if (f.v.length < 3) continue;
    for (let k = 1; k < f.v.length - 1; k += 1) tris.push([corner(f, 0), corner(f, k), corner(f, k + 1)]);
  }
  return tris;
}

function faceNormal(a, b, c) {
  const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  return [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
}

/** Area-weighted smooth normals per vertex id (shared across UV seams). */
export function vertexNormals(tris, pos) {
  const acc = new Map();
  for (const tri of tris) {
    const n = faceNormal(...tri.map((k) => pos(k.v)));
    for (const k of tri) {
      const s = acc.get(k.v) || [0, 0, 0];
      s[0] += n[0];
      s[1] += n[1];
      s[2] += n[2];
      acc.set(k.v, s);
    }
  }
  for (const [v, n] of acc) {
    const l = Math.hypot(n[0], n[1], n[2]) || 1;
    acc.set(v, [n[0] / l, n[1] / l, n[2] / l]);
  }
  return acc;
}

/** Pushes vertices out along their normals by `amount(position)` metres. */
export function inflate(mesh, amount) {
  const normals = vertexNormals(mesh.tris, mesh.pos);
  const amt = typeof amount === 'function' ? amount : () => amount;
  return {
    ...mesh,
    pos: (v) => {
      const p = mesh.pos(v);
      const n = normals.get(v) || [0, 0, 0];
      const d = amt(p);
      return [p[0] + n[0] * d, p[1] + n[1] * d, p[2] + n[2] * d];
    },
  };
}

function mixWeights(list) {
  const m = new Map();
  for (const [w, f] of list) for (const [bone, x] of w) m.set(bone, (m.get(bone) || 0) + x * f);
  return m;
}

/** One step of Loop subdivision (UVs are dropped; weights are interpolated). */
export function loopSubdivide(mesh) {
  const ids = new Map();
  const P = [];
  const W = [];
  const idOf = (v) => {
    if (!ids.has(v)) {
      ids.set(v, P.length);
      P.push(mesh.pos(v));
      W.push(mesh.weights(v));
    }
    return ids.get(v);
  };
  const tris = mesh.tris.map((t) => t.map((k) => idOf(k.v)));
  const n0 = P.length;
  const key = (a, b) => (a < b ? `${a}_${b}` : `${b}_${a}`);
  const edges = new Map();
  for (const [a, b, c] of tris) {
    for (const [u, v, o] of [
      [a, b, c],
      [b, c, a],
      [c, a, b],
    ]) {
      const k = key(u, v);
      if (!edges.has(k)) edges.set(k, { u, v, opp: [] });
      edges.get(k).opp.push(o);
    }
  }
  const neighbours = Array.from({ length: n0 }, () => new Set());
  const rim = Array.from({ length: n0 }, () => []);
  for (const e of edges.values()) {
    neighbours[e.u].add(e.v);
    neighbours[e.v].add(e.u);
    if (e.opp.length === 1) {
      rim[e.u].push(e.v);
      rim[e.v].push(e.u);
    }
  }
  const mix = (terms) => {
    const out = [0, 0, 0];
    for (const [i, f] of terms) for (let k = 0; k < 3; k += 1) out[k] += P[i][k] * f;
    return out;
  };
  const newP = [];
  const newW = [];
  for (let i = 0; i < n0; i += 1) {
    if (rim[i].length === 2) newP.push(mix([[i, 0.75], [rim[i][0], 0.125], [rim[i][1], 0.125]]));
    else if (rim[i].length) newP.push(P[i]);
    else {
      const nb = [...neighbours[i]];
      const beta = nb.length > 3 ? 3 / (8 * nb.length) : 3 / 16;
      newP.push(mix([[i, 1 - nb.length * beta], ...nb.map((j) => [j, beta])]));
    }
    newW.push(W[i]);
  }
  for (const e of edges.values()) {
    e.id = newP.length;
    if (e.opp.length === 2) newP.push(mix([[e.u, 0.375], [e.v, 0.375], [e.opp[0], 0.125], [e.opp[1], 0.125]]));
    else newP.push(mix([[e.u, 0.5], [e.v, 0.5]]));
    newW.push(mixWeights([[W[e.u], 0.5], [W[e.v], 0.5]]));
  }
  const mid = (a, b) => edges.get(key(a, b)).id;
  const out = [];
  const T = (...v) => v.map((x) => ({ v: x, t: -1 }));
  for (const [a, b, c] of tris) {
    const ab = mid(a, b);
    const bc = mid(b, c);
    const ca = mid(c, a);
    out.push(T(a, ab, ca), T(ab, b, bc), T(ca, bc, c), T(ab, bc, ca));
  }
  return { tris: out, pos: (v) => newP[v], weights: (v) => newW[v] };
}

/**
 * Keeps the part of the mesh where `field(position) > 0`, cutting straddling triangles
 * exactly on the zero contour (new vertices interpolate position, weights and normal).
 * Returns the clipped mesh plus a `normal(v)` accessor.
 */
export function clipByField(mesh, field) {
  const normals = vertexNormals(mesh.tris, mesh.pos);
  const value = new Map();
  const f = (v) => {
    if (!value.has(v)) value.set(v, field(mesh.pos(v)));
    return value.get(v);
  };
  const extra = [];
  const cuts = new Map();
  const BASE = 1e8;
  const cut = (a, b) => {
    const k = a < b ? `${a}_${b}` : `${b}_${a}`;
    if (!cuts.has(k)) {
      const t = f(a) / (f(a) - f(b));
      const pa = mesh.pos(a);
      const pb = mesh.pos(b);
      const na = normals.get(a);
      const nb = normals.get(b);
      extra.push({
        pos: pa.map((x, i) => x + (pb[i] - x) * t),
        normal: na.map((x, i) => x + (nb[i] - x) * t),
        weights: mixWeights([[mesh.weights(a), 1 - t], [mesh.weights(b), t]]),
      });
      cuts.set(k, BASE + extra.length - 1);
    }
    return cuts.get(k);
  };
  const T = (...v) => v.map((x) => ({ v: x, t: -1 }));
  const tris = [];
  for (const tri of mesh.tris) {
    const ids = tri.map((k) => k.v);
    const inside = ids.map((v) => f(v) > 0);
    const count = inside.filter(Boolean).length;
    if (count === 3) tris.push(tri);
    if (count === 0 || count === 3) continue;
    // Rotate so the odd corner comes first, keeping the winding.
    let r = 0;
    while (inside[r] !== (count === 1)) r += 1;
    const [a, b, c] = [ids[r], ids[(r + 1) % 3], ids[(r + 2) % 3]];
    const ab = cut(a, b);
    const ca = cut(c, a);
    if (count === 1) tris.push(T(a, ab, ca));
    else tris.push(T(ab, b, c), T(ab, c, ca));
  }
  const get = (v, key, fallback) => (v >= BASE ? extra[v - BASE][key] : fallback(v));
  return {
    tris,
    pos: (v) => get(v, 'pos', mesh.pos),
    weights: (v) => get(v, 'weights', mesh.weights),
    normal: (v) => get(v, 'normal', (x) => normals.get(x)),
  };
}
