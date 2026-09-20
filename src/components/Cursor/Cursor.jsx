import { useEffect, useRef } from 'react';
import { gsap, useGSAP } from '../../lib/gsap';
import { useFinePointer } from '../../hooks/useMediaQuery';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import s from './Cursor.module.css';

const INTERACTIVE = 'a, button, [role="button"], summary, label, select, [data-cursor-hover]';

/**
 * 8px dot + 40px ring following the pointer (quickTo).
 * Elements can request a label with data-cursor="Drag" | "View" | "Scroll" | "Close".
 */
export default function Cursor() {
  const fine = useFinePointer();
  const reduced = usePrefersReducedMotion();
  const enabled = fine && !reduced;
  const rootRef = useRef(null);
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const labelRef = useRef(null);

  useEffect(() => {
    document.documentElement.classList.toggle('has-custom-cursor', enabled);
    return () => document.documentElement.classList.remove('has-custom-cursor');
  }, [enabled]);

  useGSAP(
    () => {
      if (!enabled) return undefined;
      const dot = dotRef.current;
      const ring = ringRef.current;
      const label = labelRef.current;
      const root = rootRef.current;

      gsap.set([dot, ring], { xPercent: -50, yPercent: -50, x: -100, y: -100 });
      const dotX = gsap.quickTo(dot, 'x', { duration: 0.12, ease: 'power3.out' });
      const dotY = gsap.quickTo(dot, 'y', { duration: 0.12, ease: 'power3.out' });
      const ringX = gsap.quickTo(ring, 'x', { duration: 0.5, ease: 'power3.out' });
      const ringY = gsap.quickTo(ring, 'y', { duration: 0.5, ease: 'power3.out' });

      let visible = false;
      let currentLabel = '';
      let currentHover = false;

      const show = () => {
        if (visible) return;
        visible = true;
        gsap.to(root, { autoAlpha: 1, duration: 0.3, ease: 'none', overwrite: 'auto' });
      };
      const hide = () => {
        if (!visible) return;
        visible = false;
        gsap.to(root, { autoAlpha: 0, duration: 0.3, ease: 'none', overwrite: 'auto' });
      };

      const setState = (text, hover) => {
        if (text === currentLabel && hover === currentHover) return;
        currentLabel = text;
        currentHover = hover;
        if (text) label.textContent = text;
        root.dataset.mode = text ? 'label' : hover ? 'hover' : 'idle';
        gsap.to(ring, {
          width: text ? 92 : hover ? 60 : 40,
          height: text ? 92 : hover ? 60 : 40,
          duration: 0.55,
          ease: 'rust.out',
          overwrite: 'auto',
        });
        gsap.to(label, {
          autoAlpha: text ? 1 : 0,
          scale: text ? 1 : 0.6,
          duration: 0.4,
          ease: 'rust.out',
          overwrite: 'auto',
        });
        gsap.to(dot, { scale: text ? 0 : hover ? 0.5 : 1, duration: 0.35, ease: 'rust.out', overwrite: 'auto' });
      };

      const onMove = (e) => {
        if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
        dotX(e.clientX);
        dotY(e.clientY);
        ringX(e.clientX);
        ringY(e.clientY);
        show();
      };
      const onOver = (e) => {
        const target = e.target;
        if (!(target instanceof Element)) return;
        if (target.tagName === 'IFRAME') {
          hide();
          return;
        }
        const labelled = target.closest('[data-cursor]');
        const text = labelled?.getAttribute('data-cursor') || '';
        const hover = Boolean(target.closest(INTERACTIVE));
        setState(text, hover);
      };
      const onLeaveWindow = (e) => {
        if (!e.relatedTarget) hide();
      };
      const onDown = () => gsap.to(ring, { scale: 0.85, duration: 0.25, ease: 'rust.out', overwrite: 'auto' });
      const onUp = () => gsap.to(ring, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.5)', overwrite: 'auto' });

      window.addEventListener('pointermove', onMove, { passive: true });
      document.addEventListener('pointerover', onOver, { passive: true });
      document.addEventListener('pointerout', onLeaveWindow, { passive: true });
      window.addEventListener('pointerdown', onDown, { passive: true });
      window.addEventListener('pointerup', onUp, { passive: true });

      // Labels can change without pointer movement (e.g. overlay opens beneath the pointer).
      const recheck = () => {
        const el = document.elementFromPoint(gsap.getProperty(ring, 'x'), gsap.getProperty(ring, 'y'));
        if (el) onOver({ target: el });
      };
      const interval = window.setInterval(recheck, 400);

      return () => {
        window.clearInterval(interval);
        window.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerover', onOver);
        document.removeEventListener('pointerout', onLeaveWindow);
        window.removeEventListener('pointerdown', onDown);
        window.removeEventListener('pointerup', onUp);
      };
    },
    { dependencies: [enabled], scope: rootRef },
  );

  if (!enabled) return null;

  return (
    <div ref={rootRef} className={s.cursor} aria-hidden="true" data-mode="idle">
      <div ref={ringRef} className={s.ring}>
        <span ref={labelRef} className={s.label} />
      </div>
      <div ref={dotRef} className={s.dot} />
    </div>
  );
}
