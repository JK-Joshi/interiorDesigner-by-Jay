import { gsap, useGSAP } from '../lib/gsap';

/**
 * Magnetic hover: the element leans toward the pointer (quickTo) and springs back.
 * Only on fine pointers with motion allowed.
 */
export function useMagnetic(ref, { strength = 0.35, innerStrength = 0.18, inner } = {}) {
  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return undefined;
      const mm = gsap.matchMedia();
      mm.add('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)', () => {
        const innerEl = inner?.current || el.querySelector('[data-magnetic-inner]');
        const xTo = gsap.quickTo(el, 'x', { duration: 0.8, ease: 'elastic.out(1, 0.45)' });
        const yTo = gsap.quickTo(el, 'y', { duration: 0.8, ease: 'elastic.out(1, 0.45)' });
        const ixTo = innerEl ? gsap.quickTo(innerEl, 'x', { duration: 0.8, ease: 'elastic.out(1, 0.45)' }) : null;
        const iyTo = innerEl ? gsap.quickTo(innerEl, 'y', { duration: 0.8, ease: 'elastic.out(1, 0.45)' }) : null;
        let rect = null;

        const enter = () => {
          const r = el.getBoundingClientRect();
          const cx = gsap.getProperty(el, 'x');
          const cy = gsap.getProperty(el, 'y');
          rect = { left: r.left - cx, top: r.top - cy, width: r.width, height: r.height };
        };
        const move = (e) => {
          if (!rect) enter();
          const dx = e.clientX - (rect.left + rect.width / 2);
          const dy = e.clientY - (rect.top + rect.height / 2);
          xTo(dx * strength);
          yTo(dy * strength);
          ixTo?.(dx * innerStrength);
          iyTo?.(dy * innerStrength);
        };
        const leave = () => {
          rect = null;
          xTo(0);
          yTo(0);
          ixTo?.(0);
          iyTo?.(0);
        };

        el.addEventListener('pointerenter', enter);
        el.addEventListener('pointermove', move);
        el.addEventListener('pointerleave', leave);
        return () => {
          el.removeEventListener('pointerenter', enter);
          el.removeEventListener('pointermove', move);
          el.removeEventListener('pointerleave', leave);
        };
      });
      return () => mm.revert();
    },
    { scope: ref },
  );
}
