/**
 * Hands a GSAP Flip state from the clicked canvas tile to the project overlay,
 * and back again on close. Plain module state — never triggers re-renders.
 */
import { Flip } from './gsap';

let pending = null;

export const flipStore = {
  /** Record the tile the user clicked, just before navigating. */
  capture({ slug, imageIndex, mediaEl, tileEl }) {
    const flipId = `flip-${slug}-${imageIndex}`;
    mediaEl.setAttribute('data-flip-id', flipId);
    pending = {
      slug,
      imageIndex,
      flipId,
      mediaEl,
      tileEl,
      state: Flip.getState(mediaEl, { props: 'borderRadius' }),
      time: performance.now(),
    };
    return pending;
  },
  /** Overlay asks: is there a live source for this image? */
  take(slug, imageIndex) {
    if (!pending || pending.slug !== slug || pending.imageIndex !== imageIndex) return null;
    // Only fresh captures animate (a stale one would Flip from an old position).
    if (performance.now() - pending.time > 1500) return null;
    return pending;
  },
  /** The source tile (if it still exists and is on-screen) for the reverse Flip. */
  source(slug) {
    if (!pending || pending.slug !== slug) return null;
    const el = pending.mediaEl;
    if (!el || !el.isConnected) return null;
    const r = el.getBoundingClientRect();
    const inView = r.bottom > 0 && r.right > 0 && r.top < window.innerHeight && r.left < window.innerWidth && r.width > 0;
    return inView ? pending : null;
  },
  hideSource() {
    if (pending?.mediaEl) pending.mediaEl.style.visibility = 'hidden';
  },
  showSource() {
    if (pending?.mediaEl) pending.mediaEl.style.visibility = '';
  },
  clear() {
    if (pending?.mediaEl) pending.mediaEl.style.visibility = '';
    pending = null;
  },
  get current() {
    return pending;
  },
};
