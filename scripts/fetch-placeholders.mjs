#!/usr/bin/env node
/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  fetch-placeholders.mjs
 *  Downloads free interior photography into every image path the site expects,
 *  so the portfolio looks complete before the studio's own photos arrive.
 *
 *  Usage
 *    npm run fetch:images                 # fill in missing images
 *    npm run fetch:images -- --force      # re-download everything
 *    npm run fetch:images -- --only=linen-penthouse   (a project slug, "studio" or "team")
 *    npm run fetch:images -- --dry-run    # list what would be downloaded
 *    npm run fetch:images -- --provider=pexels
 *
 *  Providers
 *    curated   (default, no key) one hand-picked Unsplash photo per slot, listed in
 *              scripts/curated-photos.js — the same set every time, matched to captions.
 *    unsplash  (needs a key) fresh photos from the Unsplash Search API.
 *    pexels    (needs a key) fresh photos from the Pexels API.
 *
 *  Keys (in .env or .env.local — never shipped to the browser)
 *    UNSPLASH_ACCESS_KEY=…   https://unsplash.com/developers
 *    PEXELS_API_KEY=…        https://www.pexels.com/api/
 *
 *  For every image three files are written:
 *    NN.jpg        full size (exactly the width × height declared in the data files)
 *    NN-800.jpg    800 px wide variant (used by srcset)
 *    NN-lqip.jpg   ~32 px wide blur placeholder
 *  Photographer credits are collected in public/images/CREDITS.md.
 *  Requires Node 18+ (global fetch).
 * ─────────────────────────────────────────────────────────────────────────────
 */
import fs from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');

// ── CLI ──────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const FORCE = flag('force');
const DRY = flag('dry-run');
const ONLY = option('only');
const CONCURRENCY = Number(option('concurrency') || 4);

// ── .env loader (no dependency) ──────────────────────────────────────────────
function loadEnv() {
  for (const file of ['.env', '.env.local']) {
    const full = path.join(ROOT, file);
    if (!existsSync(full)) continue;
    for (const line of readFileSync(full, 'utf8').split(/\r?\n/)) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (!match || line.trim().startsWith('#')) continue;
      const value = match[2].replace(/^['"]|['"]$/g, '');
      if (value && !process.env[match[1]]) process.env[match[1]] = value;
    }
  }
}
loadEnv();

const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY;
const PEXELS_KEY = process.env.PEXELS_API_KEY;
const PROVIDER = option('provider') || 'curated';

// ── Data ─────────────────────────────────────────────────────────────────────
const { projects } = await import(pathToFileURL(path.join(ROOT, 'src/data/projects.js')).href);
const { site } = await import(pathToFileURL(path.join(ROOT, 'src/data/site.js')).href);
const { curatedPhotos } = await import(pathToFileURL(path.join(ROOT, 'scripts/curated-photos.js')).href);

const PROJECT_QUERIES = {
  'the-terracotta-house': ['terracotta interior living room', 'warm clay home interior'],
  'linen-penthouse': ['neutral minimalist penthouse interior', 'beige luxury living room'],
  'stone-and-teak-villa': ['stone wood villa interior', 'luxury villa living room wood'],
  'brass-courtyard-residence': ['courtyard house interior', 'heritage home interior arches'],
  'monsoon-retreat': ['cozy cabin interior rain window', 'green interior wood cabin'],
  'the-atelier-office': ['modern office interior wood', 'minimal workspace design'],
  'ivory-suite-hotel': ['luxury hotel suite interior', 'boutique hotel lobby'],
  'sandalwood-cafe': ['cafe interior wood rattan', 'cozy coffee shop interior'],
};

/** A job = one image path + the size it must have + what to search for. */
function buildJobs() {
  const jobs = [];
  for (const project of projects) {
    const queries = PROJECT_QUERIES[project.slug] || [`${project.type} interior`];
    project.images.forEach((image, i) => {
      jobs.push({
        group: project.slug,
        query: queries[i % queries.length],
        src: image.src,
        width: image.width,
        height: image.height,
        label: `${project.title} — ${image.title}`,
      });
    });
  }

  const studio = [
    { src: site.about.heroImage, width: 1200, height: 1600, query: 'architect studio drafting table' },
    { src: site.founder.portrait, width: 1200, height: 1600, query: 'interior designer portrait' },
    ...site.story.map((s, i) => ({
      src: s.image,
      width: 1200,
      height: 1500,
      query: ['architect sketching floor plan', 'craftsman woodworking workshop', 'material samples interior design'][i % 3],
    })),
    ...site.about.gallery.map((src) => ({ src, width: 1400, height: 1000, query: 'design studio workspace' })),
  ];
  studio.forEach((job) => jobs.push({ group: 'studio', label: `Studio — ${path.basename(job.src)}`, ...job }));

  site.team.forEach((member, i) => {
    jobs.push({ group: 'team', src: member.image, width: 900, height: 1125, query: 'professional portrait', label: `Team ${i + 1}` });
    jobs.push({ group: 'team', src: member.imageAlt, width: 900, height: 1125, query: 'architect at work portrait', label: `Team ${i + 1} (alt)` });
  });

  return jobs.filter((job) => job.src && (!ONLY || job.group === ONLY));
}

const orientationOf = (w, h) => (w / h > 1.15 ? 'landscape' : w / h < 0.87 ? 'portrait' : 'square');

// ── Providers ────────────────────────────────────────────────────────────────
async function getJSON(url, headers) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
  return res.json();
}

const UNSPLASH_CDN = 'https://images.unsplash.com/photo-';

const providers = {
  /**
   * Hand-picked photos, no API key: every slot has its own id in curated-photos.js
   * and is cropped to the exact size the layout declares.
   */
  curated: {
    name: 'Unsplash (curated)',
    forJob(job) {
      const id = curatedPhotos[job.src];
      if (!id) return null;
      return {
        id: `unsplash-${id}`,
        sized: (w, h, q = 78) => `${UNSPLASH_CDN}${id}?w=${w}${h ? `&h=${h}` : ''}&fit=crop&crop=entropy&fm=jpg&q=${q}`,
        author: 'Unsplash contributor',
        authorUrl: 'https://unsplash.com',
        pageUrl: `${UNSPLASH_CDN}${id}`,
      };
    },
    async search() {
      return [];
    },
    async track() {},
  },
  unsplash: {
    name: 'Unsplash',
    async search(query, orientation, page) {
      const o = orientation === 'square' ? 'squarish' : orientation;
      const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=${o}&per_page=30&page=${page}&content_filter=high`;
      const data = await getJSON(url, { Authorization: `Client-ID ${UNSPLASH_KEY}`, 'Accept-Version': 'v1' });
      return data.results.map((p) => ({
        id: `unsplash-${p.id}`,
        sized: (w, h, q = 78) => `${p.urls.raw}&w=${w}${h ? `&h=${h}` : ''}&fit=crop&crop=entropy&fm=jpg&q=${q}`,
        author: p.user?.name || 'Unknown',
        authorUrl: `${p.user?.links?.html || 'https://unsplash.com'}?utm_source=rust_design_studio&utm_medium=referral`,
        pageUrl: `${p.links?.html}?utm_source=rust_design_studio&utm_medium=referral`,
        track: p.links?.download_location,
      }));
    },
    async track(photo) {
      if (!photo.track) return;
      try {
        await fetch(photo.track, { headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` } });
      } catch {
        /* tracking is best-effort */
      }
    },
  },
  pexels: {
    name: 'Pexels',
    async search(query, orientation, page) {
      const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=${orientation}&per_page=40&page=${page}`;
      const data = await getJSON(url, { Authorization: PEXELS_KEY });
      return data.photos.map((p) => ({
        id: `pexels-${p.id}`,
        sized: (w, h) => `${p.src.original}?auto=compress&cs=tinysrgb&fit=crop&w=${w}${h ? `&h=${h}` : ''}`,
        author: p.photographer || 'Unknown',
        authorUrl: p.photographer_url || 'https://www.pexels.com',
        pageUrl: p.url,
      }));
    },
    async track() {},
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const used = new Set();
const pools = new Map();

async function nextPhoto(provider, query, orientation) {
  const key = `${query}|${orientation}`;
  let pool = pools.get(key);
  if (!pool) {
    pool = { items: [], page: 1, done: false };
    pools.set(key, pool);
  }
  for (;;) {
    const candidate = pool.items.find((p) => !used.has(p.id));
    if (candidate) {
      used.add(candidate.id);
      return candidate;
    }
    if (pool.done) return null;
    const results = await provider.search(query, orientation, pool.page);
    pool.page += 1;
    if (!results.length || pool.page > 4) pool.done = true;
    pool.items.push(...results);
  }
}

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} downloading ${url}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, buffer);
  return buffer.length;
}

function variantPaths(src) {
  const abs = path.join(PUBLIC, src.replace(/^\//, ''));
  const { dir, name, ext } = path.parse(abs);
  return { full: abs, small: path.join(dir, `${name}-800${ext}`), lqip: path.join(dir, `${name}-lqip${ext}`) };
}

async function runPool(items, worker) {
  let index = 0;
  const runners = Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (index < items.length) {
      const i = index;
      index += 1;
      await worker(items[i], i);
    }
  });
  await Promise.all(runners);
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const jobs = buildJobs().filter((job) => FORCE || !existsSync(variantPaths(job.src).full));
  const total = buildJobs().length;

  console.log(`\nRust Design Studio — placeholder photography`);
  console.log(`${jobs.length} of ${total} image(s) to fetch${ONLY ? ` (only: ${ONLY})` : ''}${FORCE ? ' [force]' : ''}\n`);

  if (DRY) {
    for (const job of jobs) {
      console.log(`  ${job.src}  ${job.width}×${job.height}  ${orientationOf(job.width, job.height)}  “${job.query}”`);
    }
    console.log('\nDry run — nothing downloaded.');
    return;
  }
  if (!jobs.length) {
    console.log('Everything is already in place. Use --force to re-download.');
    return;
  }
  if (!PROVIDER || !providers[PROVIDER]) {
    console.error(
      'No photo API key found.\n' +
        'Add UNSPLASH_ACCESS_KEY or PEXELS_API_KEY to .env (see .env.example), then run again.\n' +
        'The site works without photos — every missing image renders a designed placeholder.',
    );
    process.exitCode = 1;
    return;
  }
  const provider = providers[PROVIDER];
  if ((PROVIDER === 'unsplash' && !UNSPLASH_KEY) || (PROVIDER === 'pexels' && !PEXELS_KEY)) {
    console.error(`--provider=${PROVIDER} requires its API key in .env.`);
    process.exitCode = 1;
    return;
  }
  console.log(`Using ${provider.name}.\n`);

  const credits = [];
  let failures = 0;
  // Pick photos sequentially (keeps API usage low and avoids duplicates)…
  const planned = [];
  for (const job of jobs) {
    try {
      const photo = provider.forJob
        ? provider.forJob(job)
        : await nextPhoto(provider, job.query, orientationOf(job.width, job.height));
      if (!photo) throw new Error(provider.forJob ? `no curated photo for ${job.src}` : `no results for “${job.query}”`);
      planned.push({ job, photo });
    } catch (error) {
      failures += 1;
      console.warn(`  ✗ ${job.src} — ${error.message}`);
    }
  }
  // …then download in parallel.
  await runPool(planned, async ({ job, photo }) => {
    const out = variantPaths(job.src);
    const smallHeight = Math.round((800 * job.height) / job.width);
    try {
      const bytes = await download(photo.sized(job.width, job.height), out.full);
      // The 800 px variant is displayed small (gallery tiles, thumbnails) — compress it harder.
      await download(photo.sized(800, smallHeight, 62), out.small);
      await download(photo.sized(32, Math.round((32 * job.height) / job.width)), out.lqip);
      await provider.track(photo);
      credits.push({ job, photo });
      console.log(`  ✓ ${job.src}  (${Math.round(bytes / 1024)} KB)  © ${photo.author}`);
    } catch (error) {
      failures += 1;
      console.warn(`  ✗ ${job.src} — ${error.message}`);
    }
  });

  if (credits.length) {
    const creditsFile = path.join(PUBLIC, 'images', 'CREDITS.md');
    const previous = existsSync(creditsFile) ? await fs.readFile(creditsFile, 'utf8') : '';
    const kept = previous
      .split('\n')
      .filter((line) => line.startsWith('| /') && !credits.some((c) => line.startsWith(`| ${c.job.src} `)));
    const rows = [
      ...kept,
      ...credits.map((c) => `| ${c.job.src} | ${c.job.label.replace(/\|/g, '/')} | [${c.photo.author}](${c.photo.authorUrl}) | [${provider.name}](${c.photo.pageUrl}) |`),
    ].sort();
    const md = `# Placeholder photo credits\n\nTemporary stock photography used until the studio's own images are added.\nReplace the files and delete this document when you do.\n\n| File | Used for | Photographer | Source |\n| --- | --- | --- | --- |\n${rows.join('\n')}\n`;
    await fs.mkdir(path.dirname(creditsFile), { recursive: true });
    await fs.writeFile(creditsFile, md);
  }

  console.log(`\nDone — ${credits.length} downloaded, ${failures} failed.`);
  if (failures) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
