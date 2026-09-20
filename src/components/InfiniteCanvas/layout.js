/**
 * Seamless, gap-free masonry TILE for the infinite canvas.
 *
 * One rectangular tile (W × H) is built from C columns of width `cw` and gutter `g`.
 * Each column's natural heights are scaled so that heights + gutters === H exactly,
 * so every column ends flush and the tile wraps in both axes with zero seams.
 * The rendered area is over-scanned by 10% per side so velocity skew/scale never
 * exposes an edge.
 */

export const OVERSCAN = 0.1;

export function getColumnCount(width) {
  if (width >= 1280) return 7;
  if (width >= 1024) return 6;
  if (width >= 640) return 4;
  return 3;
}

export function getGutter(width) {
  if (width < 640) return 8;
  if (width < 1024) return 12;
  return 14;
}

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

function targetColumnWidth(width) {
  if (width >= 1024) return clamp(width * 0.17, 220, 340);
  if (width >= 640) return width * 0.27;
  return width * 0.42;
}

/**
 * @param {Array<{width:number,height:number}>} images
 * @param {number} viewportWidth
 * @param {number} viewportHeight
 */
export function buildLayout(images, viewportWidth, viewportHeight) {
  const vw = Math.max(320, Math.round(viewportWidth));
  const vh = Math.max(320, Math.round(viewportHeight));
  const mx = Math.round(vw * OVERSCAN);
  const my = Math.round(vh * OVERSCAN);
  const areaW = vw + mx * 2;
  const areaH = vh + my * 2;

  const C = getColumnCount(vw);
  const g = getGutter(vw);
  // W = C·(cw+g) must be ≥ areaW + cw + g  →  cw ≥ areaW/(C−1) − g
  const minCw = Math.ceil(areaW / (C - 1)) - g + 1;
  const cw = Math.max(minCw, Math.round(targetColumnWidth(vw)));
  const W = C * (cw + g);

  const natural = images.map((img) => (cw * img.height) / img.width);
  const naturalMax = Math.max(...natural);
  let minColumn = areaH + naturalMax * 1.3 + g;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const columns = Array.from({ length: C }, () => ({ items: [], sum: 0 }));
    const shortest = () => columns.reduce((a, b) => (b.sum < a.sum ? b : a));
    const place = (index, copy) => {
      const col = shortest();
      col.items.push({ index, copy, natural: natural[index] });
      col.sum += natural[index] + g;
    };

    // Every image at least once…
    images.forEach((_, i) => place(i, 0));
    // …then repeat the list until each column is tall enough.
    let cursor = 0;
    let guard = 0;
    while (Math.min(...columns.map((c) => c.sum)) < minColumn && guard < 4000) {
      const i = cursor % images.length;
      place(i, 1 + Math.floor(cursor / images.length));
      cursor += 1;
      guard += 1;
    }

    const H = Math.round(columns.reduce((acc, c) => acc + c.sum, 0) / C);
    const items = [];
    let tallest = 0;

    columns.forEach((col, ci) => {
      const gutters = col.items.length * g;
      const available = H - gutters;
      const naturalSum = col.sum - gutters;
      const scale = available / naturalSum;
      let y = 0;
      let used = 0;
      col.items.forEach((entry, k) => {
        const isLast = k === col.items.length - 1;
        const h = isLast ? available - used : Math.max(40, Math.round(entry.natural * scale));
        used += h;
        tallest = Math.max(tallest, h);
        const image = images[entry.index];
        items.push({
          key: `${image.projectSlug}-${image.imageIndex}-${entry.copy}`,
          baseX: ci * (cw + g),
          baseY: y,
          w: cw,
          h,
          column: ci,
          image,
          projectSlug: image.projectSlug,
          // stagger seed for the reveal cascade (0 → 0.6)
          delay: Number((((ci * 0.37 + k * 0.61) % 1) * 0.6).toFixed(3)),
        });
        y += h + g;
      });
    });

    // Wrap guarantee: H > visible area + tallest item + gutter.
    if (H > areaH + tallest + g) {
      const safeHeight = Math.floor((H - tallest - g) / (1 + OVERSCAN * 2)) - 1;
      return { items, W, H, cw, g, C, vw, vh, mx, my, areaW, areaH, safeHeight };
    }
    minColumn += tallest;
  }

  throw new Error('InfiniteCanvas: unable to build a seamless layout');
}
