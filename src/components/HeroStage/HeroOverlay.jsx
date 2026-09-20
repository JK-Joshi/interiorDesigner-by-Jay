import { forwardRef, useImperativeHandle, useRef } from 'react';
import { gsap, SplitText, splitAria, useGSAP } from '../../lib/gsap';
import { useAppState } from '../../lib/appState';
import { useFontsReady } from '../../hooks/useFontsReady';
import { site } from '../../data/site';
import s from './HeroStage.module.css';

const PHASES = [
  ['01', 'Listen'],
  ['02', 'Sketch'],
  ['03', 'Build'],
];

/**
 * Text layer above the 3D hero. Plays its own intro after the preloader and
 * exposes its elements so the pinned master timeline can choreograph them.
 */
const HeroOverlay = forwardRef(function HeroOverlay(_, ref) {
  const rootRef = useRef(null);
  const els = {
    eyebrowWrap: useRef(null),
    eyebrow: useRef(null),
    headlineMask: useRef(null),
    headlineInner: useRef(null),
    headline: useRef(null),
    subWrap: useRef(null),
    sub: useRef(null),
    cueWrap: useRef(null),
    cue: useRef(null),
    cuePath: useRef(null),
    phase: useRef(null),
    phaseNum: useRef(null),
    phaseWord: useRef(null),
    progress: useRef(null),
    note1: useRef(null),
    note2: useRef(null),
  };
  const introReady = useAppState((st) => st.introReady);
  const fontsReady = useFontsReady();

  useImperativeHandle(ref, () =>
    Object.fromEntries(Object.entries(els).map(([key, r]) => [key, r.current])),
  );

  useGSAP(
    () => {
      if (!introReady || !fontsReady) return undefined;
      const headline = els.headline.current;
      const mm = gsap.matchMedia();
      mm.add({ motion: '(prefers-reduced-motion: no-preference)', reduce: '(prefers-reduced-motion: reduce)' }, (ctx) => {
        if (ctx.conditions.reduce) {
          headline.classList.add('is-split');
          gsap.fromTo([els.eyebrow.current, headline, els.sub.current, els.cue.current], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, stagger: 0.08, ease: 'none' });
          return undefined;
        }

        const split = SplitText.create(headline, {
          aria: splitAria(headline),
          type: 'lines',
          mask: 'lines',
          linesClass: 'split-line',
          autoSplit: true,
          onSplit(self) {
            headline.classList.add('is-split');
            return gsap.from(self.lines, {
              yPercent: 115,
              rotate: 3,
              transformOrigin: '0% 100%',
              duration: 1.45,
              stagger: 0.12,
              delay: 0.35,
              ease: 'rust.out',
            });
          },
        });

        gsap.from(els.eyebrow.current, { yPercent: 120, duration: 1.1, delay: 0.2, ease: 'rust.out' });
        gsap.fromTo(els.sub.current, { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.2, delay: 0.9, ease: 'rust.out' });
        gsap.fromTo(els.cue.current, { y: 16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1, delay: 1.3, ease: 'rust.out' });

        // Looping pencil-line scroll indicator.
        gsap
          .timeline({ repeat: -1, delay: 1.5, repeatDelay: 0.35 })
          .fromTo(els.cuePath.current, { drawSVG: '0% 0%' }, { drawSVG: '0% 100%', duration: 1.1, ease: 'rust.inOut' })
          .to(els.cuePath.current, { drawSVG: '100% 100%', duration: 0.9, ease: 'rust.inOut' }, '+=0.15');

        return () => split.revert();
      });
      return () => mm.revert();
    },
    { scope: rootRef, dependencies: [introReady, fontsReady] },
  );

  return (
    <div ref={rootRef} className={s.overlay}>
      <div className={s.intro}>
        <div ref={els.eyebrowWrap} className={s.mask}>
          <p ref={els.eyebrow} className={`eyebrow ${s.eyebrow}`}>
            {site.name} · {site.city} · {site.experience}
          </p>
        </div>
        <div ref={els.headlineMask} className={s.headlineMask}>
          <div ref={els.headlineInner}>
            <h1 ref={els.headline} className={`display ${s.headline}`} data-split="">
              We sketch spaces{' '}
              <em>that become home</em>
            </h1>
          </div>
        </div>
        <div ref={els.subWrap}>
          <p ref={els.sub} className={s.sub}>
            Luxury residential, commercial and hospitality interiors — drawn by hand first, then built with
            Gujarat’s finest artisans.
          </p>
        </div>
      </div>

      <div ref={els.cueWrap} className={s.cueWrap}>
        <div ref={els.cue} className={s.cue}>
          <svg className={s.cueSvg} viewBox="0 0 24 64" aria-hidden="true">
            <path
              ref={els.cuePath}
              d="M12 2 C 6 10, 18 16, 12 24 S 6 38, 12 46 S 16 56, 12 62"
            />
          </svg>
          <span>Scroll to watch the design unfold</span>
        </div>
      </div>

      <aside ref={els.phase} className={s.phase} aria-hidden="true">
        <p className={s.phaseRow}>
          <span className={s.phaseParen}>(</span>
          <span className={s.rollMask}>
            <span ref={els.phaseNum} className={s.roller}>
              {PHASES.map(([n]) => (
                <span key={n}>{n}</span>
              ))}
            </span>
          </span>
          <span className={s.phaseParen}>)</span>
          <span className={`${s.rollMask} ${s.phaseWordMask}`}>
            <span ref={els.phaseWord} className={s.roller}>
              {PHASES.map(([, w]) => (
                <span key={w}>{w}</span>
              ))}
            </span>
          </span>
        </p>
        <div className={s.progressTrack}>
          <span ref={els.progress} className={s.progressBar} />
        </div>
      </aside>

      <p ref={els.note1} className={s.note} aria-hidden="true">
        Every space begins <em>with a single line.</em>
      </p>
      <p ref={els.note2} className={s.note} aria-hidden="true">
        Then the line <em>becomes a wall.</em>
      </p>
    </div>
  );
});

export default HeroOverlay;
