/**
 * MakeHuman (CC0) sources and file formats for build.mjs.
 *
 * Base mesh, skeleton, weights, targets and eyes come from the MakeHuman repository (pinned commit);
 * clothes and eyebrows come from the official CC0 system-asset pack. Only the few entries we need
 * are read from that 280 MB zip, using HTTP range requests. Everything is cached on disk.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const MH_COMMIT = 'a8bc2d54ff0ac92e78ff71431b1023eda42bf482';
const MH_RAW = `https://raw.githubusercontent.com/makehumancommunity/makehuman/${MH_COMMIT}/makehuman/data/`;
const ASSET_PACK = 'https://files.makehumancommunity.org/asset_packs/makehuman_system_assets/makehuman_system_assets_cc0.zip';

async function fetchOk(url, init) {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
  return res;
}

async function range(url, start, end) {
  const res = await fetchOk(url, { headers: { Range: `bytes=${start}-${end}` } });
  if (res.status !== 206) throw new Error(`Server ignored the range request — ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Reads selected entries of a remote zip without downloading the whole archive. */
async function readRemoteZip(url, wanted) {
  const size = Number((await fetchOk(url, { method: 'HEAD' })).headers.get('content-length'));
  const tail = await range(url, Math.max(0, size - 65557), size - 1);
  let eocd = -1;
  for (let i = tail.length - 22; i >= 0; i -= 1) {
    if (tail.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('Zip end-of-central-directory not found');
  const cdSize = tail.readUInt32LE(eocd + 12);
  const cdOffset = tail.readUInt32LE(eocd + 16);
  const cd = await range(url, cdOffset, cdOffset + cdSize - 1);
  const entries = new Map();
  for (let p = 0; p < cd.length && cd.readUInt32LE(p) === 0x02014b50; ) {
    const nameLen = cd.readUInt16LE(p + 28);
    const extraLen = cd.readUInt16LE(p + 30);
    const commentLen = cd.readUInt16LE(p + 32);
    const name = cd.toString('utf8', p + 46, p + 46 + nameLen);
    entries.set(name, {
      method: cd.readUInt16LE(p + 10),
      compressed: cd.readUInt32LE(p + 20),
      offset: cd.readUInt32LE(p + 42),
    });
    p += 46 + nameLen + extraLen + commentLen;
  }
  const out = new Map();
  for (const name of wanted) {
    const entry = entries.get(name);
    if (!entry) throw new Error(`Missing ${name} in ${url}`);
    const head = await range(url, entry.offset, entry.offset + 29);
    const dataStart = entry.offset + 30 + head.readUInt16LE(26) + head.readUInt16LE(28);
    const data = await range(url, dataStart, dataStart + entry.compressed - 1);
    out.set(name, entry.method === 8 ? zlib.inflateRawSync(data) : data);
  }
  return out;
}

export class Sources {
  constructor(cacheDir) {
    this.dir = cacheDir;
  }

  /** A file from the MakeHuman repository's data folder, e.g. "rigs/default.mhskel". */
  async repo(file) {
    const local = path.join(this.dir, 'repo', file);
    if (!fs.existsSync(local)) {
      const res = await fetchOk(MH_RAW + file);
      fs.mkdirSync(path.dirname(local), { recursive: true });
      fs.writeFileSync(local, Buffer.from(await res.arrayBuffer()));
    }
    return fs.readFileSync(local, 'utf8');
  }

  /** Files from the CC0 system-asset pack, e.g. "clothes/shoes04/shoes04.obj". */
  async pack(files) {
    const missing = files.filter((f) => !fs.existsSync(path.join(this.dir, 'pack', f)));
    if (missing.length) {
      const got = await readRemoteZip(ASSET_PACK, missing);
      for (const [name, buf] of got) {
        const local = path.join(this.dir, 'pack', name);
        fs.mkdirSync(path.dirname(local), { recursive: true });
        fs.writeFileSync(local, buf);
      }
    }
    return new Map(files.map((f) => [f, fs.readFileSync(path.join(this.dir, 'pack', f), 'utf8')]));
  }
}

// ── Formats ──────────────────────────────────────────────────────────────

/** OBJ with per-group faces; indices are 0-based, `t` is the UV index (or -1). */
export function parseObj(text) {
  const v = [];
  const vt = [];
  const groups = new Map();
  let faces = [];
  groups.set('default', faces);
  for (const line of text.split('\n')) {
    const s = line.trim();
    if (!s || s[0] === '#') continue;
    const p = s.split(/\s+/);
    if (p[0] === 'v') v.push(+p[1], +p[2], +p[3]);
    else if (p[0] === 'vt') vt.push(+p[1], +p[2]);
    else if (p[0] === 'g' || p[0] === 'o') {
      const name = p.slice(1).join(' ');
      if (!groups.has(name)) groups.set(name, []);
      faces = groups.get(name);
    } else if (p[0] === 'f') {
      const f = { v: [], t: [] };
      for (let i = 1; i < p.length; i += 1) {
        const [a, b] = p[i].split('/');
        f.v.push(+a - 1);
        f.t.push(b ? +b - 1 : -1);
      }
      faces.push(f);
    }
  }
  for (const [k, f] of groups) if (!f.length) groups.delete(k);
  return { v: new Float64Array(v), vt: new Float64Array(vt), groups };
}

/** Morph target: lines of "index dx dy dz". */
export function applyTarget(coords, text, weight) {
  for (const line of text.split('\n')) {
    const s = line.trim();
    if (!s || s[0] === '#') continue;
    const [i, dx, dy, dz] = s.split(/\s+/).map(Number);
    coords[i * 3] += dx * weight;
    coords[i * 3 + 1] += dy * weight;
    coords[i * 3 + 2] += dz * weight;
  }
}

/** Joint positions of an .mhskel skeleton: each joint is the mean of its helper vertices. */
export function jointPositions(skel, coords) {
  const out = {};
  for (const [name, idx] of Object.entries(skel.joints)) {
    const p = [0, 0, 0];
    for (const i of idx) for (let k = 0; k < 3; k += 1) p[k] += coords[i * 3 + k];
    out[name] = p.map((x) => x / idx.length);
  }
  return out;
}

/** Per-vertex bone weights from an .mhw file: Array<Map<bone, weight>>. */
export function parseWeights(text, count) {
  const per = Array.from({ length: count }, () => new Map());
  for (const [bone, list] of Object.entries(JSON.parse(text).weights)) {
    for (const [v, w] of list) if (v < count) per[v].set(bone, (per[v].get(bone) || 0) + w);
  }
  return per;
}

/** Proxy fitting file (.mhclo): reference triangles + offsets, and body vertices it hides. */
export function parseMhclo(text) {
  const clo = { scales: {}, refs: [], deleteVerts: new Set(), meta: {} };
  let mode = null;
  for (const line of text.split('\n')) {
    const s = line.trim();
    if (!s || s[0] === '#') continue;
    const p = s.split(/\s+/);
    if (p[0] === 'verts' || p[0] === 'delete_verts') {
      mode = p[0];
      continue;
    }
    if (/^\d/.test(p[0]) && mode === 'verts') {
      clo.refs.push(p.length === 1 ? [+p[0], +p[0], +p[0], 1, 0, 0, 0, 0, 0] : p.slice(0, 9).map(Number));
      continue;
    }
    if (/^\d/.test(p[0]) && mode === 'delete_verts') {
      for (let i = 0; i < p.length; i += 1) {
        if (p[i + 1] === '-') {
          for (let k = +p[i]; k <= +p[i + 2]; k += 1) clo.deleteVerts.add(k);
          i += 2;
        } else clo.deleteVerts.add(+p[i]);
      }
      continue;
    }
    mode = null;
    if (/^[xyz]_scale$/.test(p[0])) clo.scales[p[0][0]] = [+p[1], +p[2], +p[3]];
    else clo.meta[p[0]] = p.slice(1).join(' ');
  }
  return clo;
}

/** Fits proxy vertices onto the morphed base mesh (MakeHuman's proxy.getCoords). */
export function fitProxy(clo, coords) {
  const scale = (axis, k) => {
    const d = clo.scales[axis];
    return d ? Math.abs(coords[d[0] * 3 + k] - coords[d[1] * 3 + k]) / d[2] : 1;
  };
  const s = [scale('x', 0), scale('y', 1), scale('z', 2)];
  const out = new Float64Array(clo.refs.length * 3);
  clo.refs.forEach(([a, b, c, wa, wb, wc, ...d], i) => {
    for (let k = 0; k < 3; k += 1) {
      out[i * 3 + k] = coords[a * 3 + k] * wa + coords[b * 3 + k] * wb + coords[c * 3 + k] * wc + d[k] * s[k];
    }
  });
  return out;
}
