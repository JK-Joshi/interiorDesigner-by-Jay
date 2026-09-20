/**
 * Lenis smooth scrolling, driven by the GSAP ticker and synced to ScrollTrigger.
 *   lenis.on('scroll', ScrollTrigger.update)
 *   gsap.ticker.add((t) => lenis.raf(t * 1000))
 *   gsap.ticker.lagSmoothing(0)   ← set once in lib/gsap.js
 */
import Lenis from 'lenis';
import { gsap, ScrollTrigger } from './gsap';

let lenis = null;
let tick = null;
const locks = new Set();
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Creates (once) the page-level Lenis instance. */
export function createLenis() {
  if (lenis || typeof window === 'undefined') return lenis;
  lenis = new Lenis({
    lerp: 0.085,
    smoothWheel: true,
    syncTouch: false,
    wheelMultiplier: 1,
    touchMultiplier: 1.3,
    autoRaf: false,
    anchors: false,
    // Nested scroll areas (overlay, explore mode, horizontal strips) own their wheel events.
    prevent: (node) => Boolean(node?.hasAttribute?.('data-own-scroll')),
  });
  lenis.on('scroll', ScrollTrigger.update);
  tick = (time) => lenis?.raf(time * 1000);
  gsap.ticker.add(tick);
  if (locks.size) lenis.stop();
  return lenis;
}

export function destroyLenis() {
  if (!lenis) return;
  gsap.ticker.remove(tick);
  lenis.destroy();
  lenis = null;
  tick = null;
}

export const getLenis = () => lenis;

/**
 * A Lenis instance bound to a nested scroll container (e.g. the project overlay).
 * ScrollTriggers inside must use `scroller: wrapper`.
 */
export function createScopedLenis(wrapper, content, options = {}) {
  const instance = new Lenis({
    wrapper,
    content,
    eventsTarget: wrapper,
    lerp: 0.09,
    smoothWheel: true,
    syncTouch: false,
    autoRaf: false,
    overscroll: false,
    ...options,
  });
  instance.on('scroll', ScrollTrigger.update);
  const fn = (time) => instance.raf(time * 1000);
  gsap.ticker.add(fn);
  return {
    lenis: instance,
    destroy() {
      gsap.ticker.remove(fn);
      instance.destroy();
    },
  };
}

/** Reference-counted scroll lock (overlay, explore mode, preloader…). */
export function lockScroll(reason) {
  locks.add(reason);
  lenis?.stop();
  document.documentElement.classList.add('is-scroll-locked');
  document.body.classList.add('is-locked');
}

export function unlockScroll(reason) {
  locks.delete(reason);
  if (locks.size) return;
  lenis?.start();
  document.documentElement.classList.remove('is-scroll-locked');
  document.body.classList.remove('is-locked');
}

export const isScrollLocked = () => locks.size > 0;

/** Scrolls the page (works with or without Lenis). */
export function scrollToY(y, { immediate = false, duration = 1.8, onComplete } = {}) {
  if (lenis) {
    lenis.scrollTo(y, {
      immediate,
      duration: immediate ? undefined : duration,
      easing: easeInOutCubic,
      force: true,
      lock: !immediate,
      onComplete,
    });
    if (immediate) onComplete?.();
    return;
  }
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: y, behavior: immediate || reduce ? 'auto' : 'smooth' });
  onComplete?.();
}

export function scrollToTop(immediate = true) {
  scrollToY(0, { immediate });
  if (immediate) window.scrollTo(0, 0);
}
