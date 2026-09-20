import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { gsap, useGSAP } from '../../lib/gsap';
import { lockScroll, unlockScroll } from '../../lib/lenis';
import { appStore, useAppState } from '../../lib/appState';
import InfiniteCanvas from './InfiniteCanvas';
import s from './ExploreMode.module.css';

/**
 * Fullscreen explorer for touch devices: drag + inertia in every direction.
 * Opened via the "#explore" hash, so Esc, the close button and browser Back all close it.
 */
export default function ExploreMode({ onClose }) {
  const rootRef = useRef(null);
  const closeRef = useRef(null);
  const overlayOpen = useAppState((st) => st.overlayOpen);

  useEffect(() => {
    lockScroll('explore');
    appStore.set({ exploreOpen: true });
    const previous = document.activeElement;
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      unlockScroll('explore');
      appStore.set({ exploreOpen: false });
      if (previous instanceof HTMLElement) previous.focus({ preventScroll: true });
    };
  }, []);

  const { contextSafe } = useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add({ motion: '(prefers-reduced-motion: no-preference)' }, (ctx) => {
        if (!ctx.conditions.motion) return;
        gsap
          .timeline()
          .fromTo(
            rootRef.current,
            { clipPath: 'inset(100% 0% 0% 0%)' },
            { clipPath: 'inset(0% 0% 0% 0%)', duration: 1, ease: 'rust.inOut' },
          )
          .fromTo('[data-explore-ui]', { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.08, ease: 'rust.out' }, 0.6);
      });
      return () => mm.revert();
    },
    { scope: rootRef },
  );

  const close = contextSafe(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      onClose();
      return;
    }
    gsap.to(rootRef.current, {
      clipPath: 'inset(0% 0% 100% 0%)',
      duration: 0.8,
      ease: 'rust.inOut',
      onComplete: onClose,
    });
  });

  useEffect(() => {
    const onKey = (e) => {
      if (overlayOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
      if (e.key === 'Tab' && rootRef.current) {
        const focusables = rootRef.current.querySelectorAll('button, a[tabindex="0"], [tabindex="0"]');
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close, overlayOpen]);

  return createPortal(
    <div
      ref={rootRef}
      className={s.explore}
      role="dialog"
      aria-modal="true"
      aria-label="Explore all projects"
      data-own-scroll=""
    >
      <InfiniteCanvas mode="explore" label="All projects" />
      <div className={s.top} data-explore-ui="">
        <p className={s.title}>
          <span className="eyebrow">Selected works</span>
          <span className={s.hint}>Drag to explore · Tap to open</span>
        </p>
        <button ref={closeRef} type="button" className={s.close} onClick={close} aria-label="Close explore mode" data-cursor="Close">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 5l14 14M19 5L5 19" />
          </svg>
        </button>
      </div>
    </div>,
    document.body,
  );
}
