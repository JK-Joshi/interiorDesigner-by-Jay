import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { gsap, ScrollTrigger, SplitText, useGSAP } from '../../lib/gsap';
import { appStore } from '../../lib/appState';
import { heroState, canvasState, PHASES } from '../../three/heroState';
import { useFontsReady } from '../../hooks/useFontsReady';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { projects } from '../../data/projects';
import { kernW } from '../../lib/kerning';
import { heroQuality, heroOverride, knownHeroMode, probeHeroMode, rememberHeroMode } from '../../lib/webgl';
import InfiniteCanvas from '../InfiniteCanvas/InfiniteCanvas';
import MobileGallery from './MobileGallery';
import HeroOverlay from './HeroOverlay';
import s from './HeroStage.module.css';

const loadScene = () => import('../../three/HeroScene');
const IMAGE_COUNT = projects.reduce((sum, p) => sum + p.images.length, 0);
const HeroScene = lazy(loadScene);
// The SVG sketch is only needed without WebGL / with reduced motion — keep it out of the main bundle.
const SketchFallback = lazy(() => import('./SketchFallback'));

/** If the 3D scene throws (e.g. the character model fails to load), show the SVG sketch instead. */
class SceneBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    this.props.onError(error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const idle = (fn) =>
  'requestIdleCallback' in window ? window.requestIdleCallback(fn, { timeout: 1200 }) : window.setTimeout(fn, 250);
const cancelIdle = (id) =>
  'cancelIdleCallback' in window ? window.cancelIdleCallback(id) : window.clearTimeout(id);

/**
 * The pinned home stage:
 *   galleryLayer (z1) — the infinite canvas, waiting behind the hero
 *   heroLayer    (z2) — the 3D designer + overlay copy, lifting like a curtain
 * One scrubbed master timeline drives everything (progress stored in heroState).
 */
export default function HeroStage({ onExplore }) {
  const stageRef = useRef(null);
  const galleryRef = useRef(null);
  const heroRef = useRef(null);
  const sceneRef = useRef(null);
  const overlayRef = useRef(null);
  const worksRef = useRef(null);
  const worksTitleRef = useRef(null);
  const hintRef = useRef(null);

  const reduced = usePrefersReducedMotion();
  const isMobile = useIsMobile();
  const fontsReady = useFontsReady();
  const [quality] = useState(heroQuality);
  const want3D = quality !== 'none' && !reduced;

  // '3d' | 'svg' once known — the GPU probe runs in a worker and is cached for the session.
  const [gpuMode, setGpuMode] = useState(knownHeroMode);
  useEffect(() => {
    if (!want3D || gpuMode) return undefined;
    let alive = true;
    probeHeroMode().then((result) => {
      if (alive) setGpuMode(result);
    });
    return () => {
      alive = false;
    };
  }, [want3D, gpuMode]);
  const mode = want3D ? gpuMode ?? 'pending' : 'svg';

  // Download the 3D chunk once we know it will be used, then mount the scene when the
  // main thread is idle so it doesn't compete with the preloader / first paint.
  const [mountScene, setMountScene] = useState(false);
  useEffect(() => {
    if (mode !== '3d') return undefined;
    let cancelled = false;
    let idleId = 0;
    loadScene().then(() => {
      if (cancelled) return;
      idleId = idle(() => setMountScene(true));
    });
    return () => {
      cancelled = true;
      cancelIdle(idleId);
    };
  }, [mode]);

  // Fresh state every time Home mounts.
  useEffect(() => {
    heroState.progress = 0;
    heroState.sketch = 0;
    heroState.build = 0;
    heroState.ink = 0;
    heroState.inView = true;
    return () => {
      heroState.inView = false;
      heroState.trigger = null;
      canvasState.visible = false;
      canvasState.interactive = false;
      canvasState.scrollX = 0;
      canvasState.scrollY = 0;
      appStore.set({ galleryActive: false });
    };
  }, []);

  const handleSceneReady = useCallback(() => {
    if (!sceneRef.current) return;
    gsap.fromTo(sceneRef.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.2, ease: 'none' });
  }, []);

  // The device can't keep up with the 3D scene — cross-fade to the SVG sketch.
  const handleSceneSlow = useCallback(() => {
    if (heroOverride() === '3d') return;
    rememberHeroMode('svg');
    const el = sceneRef.current;
    if (!el) {
      setGpuMode('svg');
      return;
    }
    gsap.to(el, {
      autoAlpha: 0,
      duration: 0.4,
      onComplete: () => {
        setGpuMode('svg');
        gsap.to(el, { autoAlpha: 1, duration: 0.8, delay: 0.1 });
      },
    });
  }, []);

  const handleSceneError = useCallback(() => setGpuMode('svg'), []);

  useGSAP(
    () => {
      if (!fontsReady) return undefined;
      const stage = stageRef.current;
      const gallery = galleryRef.current;
      const hero = heroRef.current;
      const ov = overlayRef.current;
      const mm = gsap.matchMedia();

      mm.add(
        {
          desktop: '(min-width: 768px) and (prefers-reduced-motion: no-preference)',
          mobile: '(max-width: 767px) and (prefers-reduced-motion: no-preference)',
          reduce: '(prefers-reduced-motion: reduce)',
        },
        (ctx) => {
          const { desktop, reduce } = ctx.conditions;

          if (reduce) {
            heroState.progress = 1;
            heroState.trigger = null;
            canvasState.interactive = true;
            gallery.inert = false;
            hero.inert = false;
            const vis = gsap.to(
              {},
              {
                scrollTrigger: {
                  trigger: gallery,
                  start: 'top bottom',
                  end: 'bottom top',
                  onToggle: (self) => {
                    canvasState.visible = self.isActive;
                  },
                },
              },
            );
            gsap.fromTo(worksRef.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, scrollTrigger: { trigger: gallery, start: 'top 70%' } });
            return () => vis.kill();
          }

          heroState.progress = 0;
          canvasState.visible = false;
          canvasState.interactive = false;
          gallery.inert = true;
          let active = false;
          let visible = false;

          const tl = gsap.timeline({
            defaults: { ease: 'none' },
            onUpdate: () => {
              const p = tl.progress();
              heroState.progress = p;
              const nowVisible = p > 0.66;
              if (nowVisible !== visible) {
                visible = nowVisible;
                canvasState.visible = nowVisible;
              }
              const nowActive = p >= PHASES.interactive;
              if (nowActive !== active) {
                active = nowActive;
                canvasState.interactive = nowActive;
                gallery.inert = !nowActive;
                hero.inert = nowActive;
                appStore.set({ galleryActive: nowActive });
              }
            },
            scrollTrigger: {
              trigger: stage,
              start: 'top top',
              end: desktop ? '+=500%' : '+=350%',
              pin: true,
              scrub: 1,
              anticipatePin: 1,
              invalidateOnRefresh: true,
              // Created after later sections (it waits for fonts) → must refresh first.
              refreshPriority: 10,
              onUpdate: (self) => {
                // Page scroll also drifts the canvas diagonally once the curtain starts lifting.
                const drift = Math.max(0, self.progress - PHASES.buildEnd) * (self.end - self.start);
                canvasState.scrollY = -drift * 0.42;
                canvasState.scrollX = -drift * 0.16;
              },
            },
          });
          heroState.trigger = tl.scrollTrigger;
          ScrollTrigger.sort();
          tl.set({}, {}, 1); // timeline length = 1 → positions read as progress

          // 0.00 – 0.06 intro hold → cue leaves first
          tl.to(ov.cueWrap, { autoAlpha: 0, y: 24, duration: 0.04 }, 0.012);

          // 0.06 – 0.55 sketching: headline masks out, phase counter rolls
          tl.to(ov.headlineInner, { yPercent: -112, duration: 0.09 }, 0.065)
            .to(ov.eyebrowWrap, { autoAlpha: 0, y: -20, duration: 0.05 }, 0.06)
            .to(ov.subWrap, { autoAlpha: 0, y: -28, duration: 0.06 }, 0.07)
            .fromTo(ov.phase, { autoAlpha: 0, x: -24 }, { autoAlpha: 1, x: 0, duration: 0.05 }, 0.07)
            .fromTo(ov.progress, { scaleY: 0 }, { scaleY: 1, duration: PHASES.curtainEnd - 0.06 }, 0.06)
            .to([ov.phaseNum, ov.phaseWord], { yPercent: -100 / 3, duration: 0.035 }, 0.12)
            .fromTo(ov.note1, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.05 }, 0.22)
            .to(ov.note1, { autoAlpha: 0, y: -40, duration: 0.05 }, 0.44);

          // 0.55 – 0.72 sketch becomes reality (3D handles the extrusion)
          tl.to([ov.phaseNum, ov.phaseWord], { yPercent: (-100 / 3) * 2, duration: 0.035 }, 0.56)
            .fromTo(ov.note2, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.04 }, 0.58)
            .to(ov.note2, { autoAlpha: 0, y: -40, duration: 0.04 }, 0.69)
            .to(ov.phase, { autoAlpha: 0, x: -24, duration: 0.04 }, 0.72);

          // 0.72 – 0.88 curtain reveal
          tl.fromTo(
            hero,
            { yPercent: 0, borderBottomLeftRadius: '50% 0vh', borderBottomRightRadius: '50% 0vh' },
            {
              yPercent: -100,
              borderBottomLeftRadius: '50% 22vh',
              borderBottomRightRadius: '50% 22vh',
              duration: PHASES.curtainEnd - PHASES.buildEnd,
              ease: 'power1.in',
            },
            PHASES.buildEnd,
          )
            .fromTo(
              gallery,
              { scale: 0.82, filter: 'blur(12px) brightness(0.4)' },
              { scale: 1, filter: 'blur(0px) brightness(1)', duration: 0.17, ease: 'power1.out' },
              0.7,
            )
            .fromTo(gallery, { '--reveal': 0 }, { '--reveal': 1, duration: 0.16 }, PHASES.buildEnd)
            .set(gallery, { clearProps: 'filter' }, 0.875);

          // "Selected Works" splits in over the gallery, then leaves
          const split = SplitText.create(worksTitleRef.current, { type: 'chars,words', mask: 'chars', aria: 'none' });
          worksTitleRef.current.classList.add('is-split');
          tl.fromTo(worksRef.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, 0.765)
            .from(split.chars, { yPercent: 115, rotate: 8, stagger: 0.004, duration: 0.045 }, 0.77)
            .from('[data-works-line]', { scaleX: 0, duration: 0.05 }, 0.78)
            .to(worksRef.current, { autoAlpha: 0, yPercent: -30, duration: 0.04 }, 0.865);

          // 0.80 interactive, 0.88 hint
          tl.set(gallery, { pointerEvents: 'auto' }, PHASES.interactive)
            .set(hero, { pointerEvents: 'none' }, PHASES.interactive)
            .fromTo(hintRef.current, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.04 }, PHASES.curtainEnd);

          return () => {
            heroState.trigger = null;
            split.revert();
          };
        },
      );
      return () => mm.revert();
    },
    { scope: stageRef, dependencies: [fontsReady], revertOnUpdate: true },
  );

  return (
    <section ref={stageRef} className={`${s.stage} ${reduced ? s.static : ''}`} aria-label="Rust Design Studio — introduction and selected works">
      <div ref={galleryRef} className={s.galleryLayer} id="projects">
        <h2 className="visually-hidden">Selected works — every image from every project</h2>
        {isMobile ? (
          <MobileGallery onExplore={onExplore} />
        ) : (
          <InfiniteCanvas mode="stage" onExplore={onExplore} label="Selected works" />
        )}
        <div ref={worksRef} className={s.works} aria-hidden="true">
          <span className={`eyebrow ${s.worksEyebrow}`}>(Portfolio) — {projects.length} spaces, {IMAGE_COUNT} rooms</span>
          <p ref={worksTitleRef} className={s.worksTitle} data-split="">
            Selected <em>{kernW('Works')}</em>
          </p>
          <span className={s.worksLine} data-works-line="" />
        </div>
        <p ref={hintRef} className={s.hint} aria-hidden="true">
          <span className={s.hintIcon}>
            <span />
            <span />
          </span>
          <span className={s.hintFine}>Drag to explore · Click to open</span>
          <span className={s.hintTouch}>Swipe to scroll · Tap to open</span>
        </p>
      </div>

      <div ref={heroRef} className={s.heroLayer}>
        <div ref={sceneRef} className={s.scene}>
          <Suspense fallback={<div className={s.sceneLoading} aria-hidden="true" />}>
            {mode === 'svg' ? (
              <SketchFallback mode={reduced ? 'static' : 'scrub'} />
            ) : mode === '3d' && mountScene ? (
              <SceneBoundary onError={handleSceneError}>
                <HeroScene quality={quality} onReady={handleSceneReady} onSlow={handleSceneSlow} />
              </SceneBoundary>
            ) : (
              <div className={s.sceneLoading} aria-hidden="true" />
            )}
          </Suspense>
        </div>
        <div className={s.vignette} aria-hidden="true" />
        <HeroOverlay ref={overlayRef} />
      </div>
    </section>
  );
}
