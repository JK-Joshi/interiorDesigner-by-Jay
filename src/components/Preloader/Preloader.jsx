import { useRef } from 'react';
import { gsap, SplitText, useGSAP, whenFontsReady } from '../../lib/gsap';
import { lockScroll, unlockScroll } from '../../lib/lenis';
import { useAppState, markIntroReady, finishPreloader } from '../../lib/appState';
import { site } from '../../data/site';
import { Figures, setFigures } from '../../lib/figures';
import s from './Preloader.module.css';

const windowLoaded = (max) =>
  new Promise((resolve) => {
    if (document.readyState === 'complete') {
      resolve();
      return;
    }
    const t = window.setTimeout(resolve, max);
    window.addEventListener(
      'load',
      () => {
        window.clearTimeout(t);
        resolve();
      },
      { once: true },
    );
  });

const wait = (ms) => new Promise((r) => window.setTimeout(r, ms));

/** A hand-drawn feeling line across the screen (viewBox 0 0 1000 60). */
const LINE_PATH =
  'M-10 34 C 60 30, 120 38, 190 33 S 320 28, 400 32 S 520 38, 600 31 S 740 27, 820 33 S 940 36, 1010 30';

function PreloaderScreen() {
  const rootRef = useRef(null);
  const topRef = useRef(null);
  const bottomRef = useRef(null);
  const counterRef = useRef(null);
  const counterWrapRef = useRef(null);
  const wordRef = useRef(null);
  const metaRef = useRef(null);
  const lineRef = useRef(null);
  const svgRef = useRef(null);
  const pencilRef = useRef(null);

  const { contextSafe } = useGSAP(
    () => {
      lockScroll('preloader');
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const counterEl = counterRef.current;
      const path = lineRef.current;
      const svg = svgRef.current;
      const length = path.getTotalLength();
      const count = { v: 0 };
      const draw = { p: 0 };
      let split = null;
      let exited = false;
      let alive = true;

      const setCount = () => {
        setFigures(counterEl, String(Math.round(count.v)).padStart(3, '0'));
      };

      const movePencil = () => {
        const pt = path.getPointAtLength(length * draw.p);
        const box = svg.getBoundingClientRect();
        const x = (pt.x / 1000) * box.width;
        const y = (pt.y / 60) * box.height;
        gsap.set(path, { drawSVG: `0% ${draw.p * 100}%` });
        gsap.set(pencilRef.current, { x, y });
      };

      const exit = () => {
        if (exited || !alive) return;
        exited = true;
        const tl = gsap.timeline({ onComplete: finishPreloader });
        const chars = split ? split.chars : [wordRef.current];
        if (reduce) {
          tl.add(() => {
            markIntroReady();
            unlockScroll('preloader');
          }).to(rootRef.current, { autoAlpha: 0, duration: 0.4, ease: 'none' });
          return;
        }
        tl.to(counterWrapRef.current, { yPercent: -110, duration: 0.7, ease: 'rust.in' }, 0)
          .to(chars, { yPercent: -110, duration: 0.7, stagger: 0.012, ease: 'rust.in' }, 0)
          .to(metaRef.current, { autoAlpha: 0, y: -10, duration: 0.5, ease: 'rust.in' }, 0)
          .to([svg, pencilRef.current], { autoAlpha: 0, duration: 0.45, ease: 'none' }, 0.1)
          .add(() => {
            markIntroReady();
            unlockScroll('preloader');
          }, 0.6)
          .to(topRef.current, { yPercent: -100, duration: 1.25, ease: 'rust.inOut' }, 0.55)
          .to(bottomRef.current, { yPercent: 100, duration: 1.25, ease: 'rust.inOut' }, 0.55);
      };

      gsap.set(path, { drawSVG: '0%' });
      gsap.set(pencilRef.current, { rotation: -28 });
      setCount();

      if (!reduce) {
        gsap.from(counterWrapRef.current, { yPercent: 110, duration: 1, ease: 'rust.out' });
        gsap.to(count, { v: 86, duration: 2.1, ease: 'power2.inOut', onUpdate: setCount });
        gsap.to(draw, { p: 1, duration: 2.6, ease: 'rust.inOut', onUpdate: movePencil, delay: 0.2 });
        gsap.fromTo(pencilRef.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4, delay: 0.2 });
      } else {
        count.v = 100;
        setCount();
        gsap.set(path, { drawSVG: '100%' });
      }

      whenFontsReady().then(
        contextSafe(() => {
          if (!alive || !wordRef.current) return;
          if (reduce) {
            wordRef.current.classList.add('is-split');
            return;
          }
          split = SplitText.create(wordRef.current, { type: 'chars,words', mask: 'chars', aria: 'none' });
          wordRef.current.classList.add('is-split');
          gsap.from(split.chars, { yPercent: 115, duration: 1.1, stagger: 0.035, ease: 'rust.out' });
          gsap.fromTo(metaRef.current, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 1, delay: 0.7, ease: 'rust.out' });
        }),
      );

      Promise.all([whenFontsReady(), windowLoaded(4500), wait(reduce ? 300 : 2500)]).then(
        contextSafe(() => {
          if (!alive) return;
          if (reduce) {
            exit();
            return;
          }
          gsap.to(count, {
            v: 100,
            duration: 0.7,
            ease: 'rust.out',
            overwrite: true,
            onUpdate: setCount,
            onComplete: () => gsap.delayedCall(0.25, exit),
          });
        }),
      );

      return () => {
        alive = false;
        unlockScroll('preloader');
      };
    },
    { scope: rootRef },
  );

  return (
    <div ref={rootRef} className={s.root}>
      <p className="visually-hidden" role="status">
        Loading Rust Design Studio
      </p>
      <div ref={topRef} className={`${s.half} ${s.top}`} aria-hidden="true" />
      <div ref={bottomRef} className={`${s.half} ${s.bottom}`} aria-hidden="true" />

      <div className={s.content} aria-hidden="true">
        <p className={s.eyebrow}>Interior Architecture · Est. {site.foundedYear}</p>
        <p ref={wordRef} className={s.word} data-split="">
          RUST DESIGN STUDIO
        </p>
        <div className={s.lineWrap}>
          <svg ref={svgRef} className={s.line} viewBox="0 0 1000 60" preserveAspectRatio="none" aria-hidden="true">
            <path ref={lineRef} d={LINE_PATH} />
          </svg>
          <svg ref={pencilRef} className={s.pencil} viewBox="0 0 60 12" aria-hidden="true">
            <path d="M0 6 L9 3 L9 9 Z" fill="#3B3835" />
            <path d="M9 3 L13 1.8 L13 10.2 L9 9 Z" fill="#E7C9A0" />
            <rect x="13" y="1.8" width="36" height="8.4" fill="#B7472A" />
            <rect x="49" y="1.8" width="4" height="8.4" fill="#B8955A" />
            <rect x="53" y="1.8" width="6" height="8.4" rx="1.5" fill="#D9784F" />
          </svg>
        </div>
        <p ref={metaRef} className={s.meta}>
          {site.city}, {site.region} — {site.tagline}
        </p>
      </div>

      <div className={s.counterMask} aria-hidden="true">
        <p ref={counterWrapRef} className={s.counter}>
          <Figures ref={counterRef}>000</Figures>
          <span className={s.pct}>%</span>
        </p>
      </div>
    </div>
  );
}

/** First visit per session: counter, SplitText wordmark, DrawSVG pencil line, split exit. */
export default function Preloader() {
  const show = useAppState((st) => st.showPreloader);
  return show ? <PreloaderScreen /> : null;
}
