import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { gsap, Flip, ScrollTrigger, useGSAP } from '../../lib/gsap';
import { appStore } from '../../lib/appState';
import { createScopedLenis, lockScroll, unlockScroll } from '../../lib/lenis';
import { flipStore } from '../../lib/flipStore';
import { pad2 } from '../../lib/content';
import { getProject, getProjectIndex, projects } from '../../data/projects';
import { useMagnetic } from '../../hooks/useMagnetic';
import Seo from '../Seo/Seo';
import ProjectContent from './ProjectContent';
import s from './ProjectOverlay.module.css';

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Full-screen project overlay rendered above Home (background-location pattern).
 * Owns its own scroll container + Lenis; every ScrollTrigger inside uses it as scroller.
 */
export default function ProjectOverlay({ slug, imageIndex = 0, closing = false, instant = false, onClosed, onRequestClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const overlayRef = useRef(null);
  const backdropRef = useRef(null);
  const scrollerRef = useRef(null);
  const contentRef = useRef(null);
  const topRef = useRef(null);
  const closeRef = useRef(null);
  const wipeRef = useRef(null);
  const lenisRef = useRef(null);
  const returnFocus = useRef(null);
  const [display, setDisplay] = useState(() => ({ slug, imageIndex, flip: flipStore.take(slug, imageIndex) }));
  const [lenisReady, setLenisReady] = useState(false);
  const swapping = useRef(false);

  const project = getProject(display.slug);
  const index = getProjectIndex(display.slug);

  useMagnetic(closeRef, { strength: 0.4 });

  // ── Mount: lock the page, create the overlay's own Lenis
  useLayoutEffect(() => {
    returnFocus.current = document.activeElement;
    appStore.set({ overlayOpen: true });
    lockScroll('overlay');
    const scoped = createScopedLenis(scrollerRef.current, contentRef.current);
    lenisRef.current = scoped.lenis;
    setLenisReady(true);
    return () => {
      scoped.destroy();
      lenisRef.current = null;
      unlockScroll('overlay');
      appStore.set({ overlayOpen: false });
    };
  }, []);

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
    const t = window.setTimeout(() => ScrollTrigger.refresh(), 120);
    return () => window.clearTimeout(t);
  }, []);

  // ── Entrance chrome (backdrop + top bar)
  const { contextSafe } = useGSAP(
    () => {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      gsap.fromTo(
        backdropRef.current,
        { autoAlpha: 0 },
        { autoAlpha: 1, duration: reduce ? 0.3 : 0.9, ease: 'none' },
      );
      if (!reduce) {
        gsap.fromTo('[data-top-item]', { yPercent: -120, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 1, stagger: 0.08, delay: 0.5, ease: 'rust.out' });
      }
    },
    { scope: overlayRef },
  );

  // ── Close (Esc, ✕, browser Back → `closing` prop)
  useEffect(() => {
    if (!closing) return;
    const finish = () => {
      flipStore.clear();
      const target = returnFocus.current;
      onClosed?.();
      if (target instanceof HTMLElement && target.isConnected) target.focus({ preventScroll: true });
    };
    if (instant) {
      finish();
      return;
    }
    const run = contextSafe(() => {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const lenis = lenisRef.current;
      const hero = scrollerRef.current?.querySelector('[data-hero-media]');
      const source = flipStore.source(display.slug);
      const scrolled = (lenis ? lenis.scroll : scrollerRef.current?.scrollTop || 0) > 24;
      const canFlip = !reduce && hero && source && source.imageIndex === display.imageIndex && !scrolled;
      lenis?.stop();

      const tl = gsap.timeline({ onComplete: finish });
      tl.to('[data-top-item]', { autoAlpha: 0, duration: 0.3, ease: 'none' }, 0);

      if (canFlip) {
        tl.to(contentRef.current.querySelectorAll('[data-overlay-content], [data-hero-scrim]'), {
          autoAlpha: 0,
          duration: 0.35,
          ease: 'none',
        }, 0)
          .to(hero.firstElementChild, { scale: 1, xPercent: 0, duration: 0.9, ease: 'rust.inOut', overwrite: true }, 0.05)
          .add(
            Flip.fit(hero, source.mediaEl, {
              duration: 0.95,
              ease: 'rust.inOut',
              scale: false,
              absolute: true,
              props: 'borderRadius',
            }),
            0.05,
          )
          .to(backdropRef.current, { autoAlpha: 0, duration: 0.6, ease: 'none' }, 0.35);
      } else {
        tl.to(scrollerRef.current, {
          autoAlpha: 0,
          scale: reduce ? 1 : 0.96,
          duration: reduce ? 0.25 : 0.6,
          ease: 'rust.in',
        }, 0).to(backdropRef.current, { autoAlpha: 0, duration: reduce ? 0.25 : 0.5, ease: 'none' }, 0.15);
      }
    });
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closing]);

  // ── Next project inside the overlay: curtain wipe → swap → scroll reset → reveal
  useEffect(() => {
    if (closing || slug === display.slug || swapping.current) return;
    swapping.current = true;
    const run = contextSafe(() => {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      gsap
        .timeline()
        .set(wipeRef.current, { autoAlpha: 1 })
        .fromTo(
          wipeRef.current,
          { yPercent: 100 },
          { yPercent: 0, duration: reduce ? 0.01 : 0.85, ease: 'rust.inOut' },
        )
        .add(() => {
          flipStore.clear();
          setDisplay({ slug, imageIndex: 0, flip: null });
        });
    });
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, closing]);

  // After the swap has rendered: reset scroll, refresh, reveal.
  useLayoutEffect(() => {
    if (!swapping.current) return;
    const lenis = lenisRef.current;
    lenis?.scrollTo(0, { immediate: true, force: true });
    if (scrollerRef.current) scrollerRef.current.scrollTop = 0;
    ScrollTrigger.refresh();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tween = gsap.to(wipeRef.current, {
      yPercent: -100,
      duration: reduce ? 0.01 : 0.95,
      delay: 0.15,
      ease: 'rust.inOut',
      onComplete: () => {
        swapping.current = false;
        gsap.set(wipeRef.current, { autoAlpha: 0 });
      },
    });
    return () => tween.kill();
  }, [display.slug]);

  // ── Keyboard: Esc closes, Tab is trapped
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onRequestClose?.();
        return;
      }
      if (e.key !== 'Tab' || !overlayRef.current) return;
      const nodes = Array.from(overlayRef.current.querySelectorAll(FOCUSABLE)).filter(
        (n) => n.offsetParent !== null || n === document.activeElement,
      );
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (!overlayRef.current.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onRequestClose]);

  const handleNext = (next) => {
    const background = location.state?.backgroundLocation;
    navigate(`/project/${next.slug}`, {
      replace: true,
      state: { backgroundLocation: background, imageIndex: 0 },
    });
  };

  if (!project) return null;

  return (
    <div
      ref={overlayRef}
      className={s.overlay}
      role="dialog"
      aria-modal="true"
      aria-label={`${project.title} — project`}
      data-own-scroll=""
    >
      <Seo
        title={project.title}
        description={`${project.subtitle}. ${project.summary}`}
        path={`/project/${project.slug}`}
        image={project.cover}
        type="article"
      />
      <div ref={backdropRef} className={s.backdrop} aria-hidden="true" />

      <div ref={scrollerRef} className={s.scroller}>
        <div ref={contentRef} className={s.content}>
          {lenisReady ? (
            <ProjectContent
              key={display.slug}
              project={project}
              imageIndex={display.imageIndex}
              flip={display.flip}
              scroller={scrollerRef}
              lenis={() => lenisRef.current}
              onNext={handleNext}
              hudClassName={s.hudOverlay}
            />
          ) : null}
        </div>
      </div>

      <header ref={topRef} className={s.topBar}>
        <p className={s.topIndex} data-top-item="">
          <span className={s.topNum}>
            ({pad2(index + 1)} / {pad2(projects.length)})
          </span>
          <span className={s.topCat}>{project.category}</span>
        </p>
        <div data-top-item="">
          <button
            ref={closeRef}
            type="button"
            className={s.close}
            onClick={onRequestClose}
            aria-label="Close project"
            data-cursor="Close"
          >
            <span className={s.closeLabel}>Close</span>
            <span className={s.closeIcon} data-magnetic-inner="" aria-hidden="true">
              ✕
            </span>
          </button>
        </div>
      </header>

      <div ref={wipeRef} className={s.wipe} aria-hidden="true" />
    </div>
  );
}
