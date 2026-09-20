/**
 * Single source of truth for GSAP.
 * Registers every plugin exactly once, defines the studio's custom eases and
 * global defaults. Every component imports gsap (and plugins) from here.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Draggable } from 'gsap/Draggable';
import { InertiaPlugin } from 'gsap/InertiaPlugin';
import { SplitText } from 'gsap/SplitText';
import { Flip } from 'gsap/Flip';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { CustomEase } from 'gsap/CustomEase';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP, ScrollTrigger, Draggable, InertiaPlugin, SplitText, Flip, DrawSVGPlugin, CustomEase);

// Studio eases (cubic-bezier expressed as SVG path data for CustomEase).
CustomEase.create('rust.out', 'M0,0 C0.22,1 0.36,1 1,1');
CustomEase.create('rust.inOut', 'M0,0 C0.65,0 0.35,1 1,1');
CustomEase.create('rust.in', 'M0,0 C0.64,0 0.78,0 1,1');

gsap.defaults({ ease: 'rust.out', duration: 1.1 });

ScrollTrigger.config({ ignoreMobileResize: true });
ScrollTrigger.defaults({ start: 'top 80%' });

// Lenis drives smooth scrolling from the GSAP ticker, so frames must never be "caught up".
gsap.ticker.lagSmoothing(0);

/** Shared motion constants so every reveal feels like part of one system. */
export const MOTION = {
  reveal: 1.2,
  revealFast: 0.9,
  revealSlow: 1.4,
  stagger: 0.08,
  staggerTight: 0.05,
  staggerLoose: 0.12,
  lineFrom: { yPercent: 110, rotate: 2.5 },
  start: 'top 80%',
};

/** Media query keys used with gsap.matchMedia() throughout the app. */
export const MQ = {
  desktop: '(min-width: 768px) and (prefers-reduced-motion: no-preference)',
  mobile: '(max-width: 767px) and (prefers-reduced-motion: no-preference)',
  motion: '(prefers-reduced-motion: no-preference)',
  reduce: '(prefers-reduced-motion: reduce)',
  fine: '(hover: hover) and (pointer: fine)',
};

/**
 * SplitText adds aria-label to the split element by default, which is only valid on
 * elements whose role supports naming (headings). Everything else keeps its text
 * readable as-is ('none'), or is decorative and hidden by the markup.
 */
export function splitAria(el) {
  return el && /^H[1-6]$/.test(el.tagName) ? 'auto' : 'none';
}

/** Resolves once web fonts are ready (never rejects, never hangs longer than 2.5s). */
let fontsPromise;
export function whenFontsReady() {
  if (!fontsPromise) {
    fontsPromise =
      typeof document === 'undefined' || !document.fonts
        ? Promise.resolve()
        : Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]).then(() => undefined);
  }
  return fontsPromise;
}

/** Debounced global refresh — safe to call from many places at once. */
let refreshId = 0;
export function refreshScrollTriggers(delay = 60) {
  if (typeof window === 'undefined') return;
  window.clearTimeout(refreshId);
  refreshId = window.setTimeout(() => ScrollTrigger.refresh(), delay);
}

export { gsap, ScrollTrigger, Draggable, InertiaPlugin, SplitText, Flip, DrawSVGPlugin, CustomEase, useGSAP };
export default gsap;
