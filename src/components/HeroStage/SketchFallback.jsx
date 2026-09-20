import { useMemo, useRef } from 'react';
import { gsap, useGSAP } from '../../lib/gsap';
import { toSvgPaths, samplePen, SKETCH, PAPER_UNITS } from '../../three/sketchPaths';
import { heroState, sketchProgress, buildProgress } from '../../three/heroState';
import s from './HeroStage.module.css';

/** Flat illustrated designer at a drafting table (side view). */
function DesignerSilhouette() {
  return (
    <svg className={s.silhouette} viewBox="0 0 420 460" aria-hidden="true">
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* drafting table */}
        <path d="M40 440 L120 250 M200 440 L120 250" stroke="#6b4a34" strokeWidth="9" />
        <path d="M70 372 L170 372" stroke="#6b4a34" strokeWidth="7" />
        <path d="M10 262 L232 206" stroke="#c89b69" strokeWidth="16" />
        <path d="M34 250 L206 207" stroke="#f5efe5" strokeWidth="6" />
        <path d="M228 204 L236 214" stroke="#6b4a34" strokeWidth="8" />
        {/* stool */}
        <path d="M300 316 L360 316" stroke="#7e2f1c" strokeWidth="12" />
        <path d="M330 322 L330 400 M330 400 L300 440 M330 400 L362 440" stroke="#3b3835" strokeWidth="6" />
        <path d="M304 392 L356 392" stroke="#c29f62" strokeWidth="4" />
        <path d="M372 318 C 380 280, 382 250, 372 236" stroke="#6b4a34" strokeWidth="7" />
      </g>
      {/* designer */}
      <g strokeLinejoin="round" stroke="#120f0d" strokeWidth="3">
        <path d="M312 312 C 300 312, 262 314, 238 318 L 236 334 C 262 334, 300 334, 330 330 Z" fill="#737860" />
        <path d="M240 320 C 232 350, 236 370, 250 392 L 262 390 C 254 366, 252 346, 256 326 Z" fill="#737860" />
        <path d="M246 392 L 280 396 L 280 406 L 244 404 Z" fill="#2e2520" />
        <path d="M318 316 C 318 270, 300 232, 276 214 C 262 206, 250 214, 256 228 C 270 254, 290 282, 300 316 Z" fill="#2e2520" />
        <path d="M276 222 C 250 236, 226 244, 206 236" fill="none" stroke="#2e2520" strokeWidth="16" strokeLinecap="round" />
        <path d="M276 222 C 250 236, 226 244, 206 236" fill="none" stroke="#120f0d" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
        <circle cx="203" cy="235" r="7" fill="#c68a63" />
        <path d="M196 238 L 186 252" stroke="#b7472a" strokeWidth="4" strokeLinecap="round" />
        <path d="M272 206 L 268 196" stroke="#c68a63" strokeWidth="10" strokeLinecap="round" />
        <ellipse cx="262" cy="180" rx="24" ry="27" fill="#c68a63" transform="rotate(-24 262 180)" />
        <path d="M244 166 C 250 146, 282 146, 290 170 C 288 182, 280 190, 276 196 C 280 178, 272 170, 258 172 C 252 172, 246 170, 244 166 Z" fill="#1f1814" />
        <circle cx="292" cy="160" r="11" fill="#1f1814" />
        <circle cx="246" cy="184" r="6" fill="none" stroke="#c29f62" strokeWidth="2" />
      </g>
    </svg>
  );
}

/**
 * SVG version of the hero sketch for no-WebGL, low-power devices and reduced motion.
 * mode="scrub": strokes draw with DrawSVGPlugin in sync with the hero scroll progress.
 * mode="static": the finished plan.
 */
export default function SketchFallback({ mode = 'scrub', className }) {
  const rootRef = useRef(null);
  const paths = useMemo(() => toSvgPaths(), []);
  const fills = useMemo(() => paths.filter((p) => p.fill && p.outline), [paths]);

  useGSAP(
    () => {
      const strokes = gsap.utils.toArray('[data-stroke]', rootRef.current);
      const fillEls = gsap.utils.toArray('[data-fill]', rootRef.current);
      gsap.set('[data-plan]', { rotation: -2, transformPerspective: 1200 });
      if (mode === 'static') {
        gsap.set(strokes, { drawSVG: '100%' });
        gsap.set(fillEls, { fillOpacity: 0.55 });
        return undefined;
      }
      const tl = gsap.timeline({ paused: true });
      strokes.forEach((el, i) => {
        tl.fromTo(el, { drawSVG: '0%' }, { drawSVG: '100%', duration: Math.max(0.001, paths[i].length), ease: 'none' });
      });
      tl.progress(0);

      const pen = {};
      let smooth = 0;
      let lastInk = -1;
      let lastBuild = -1;
      const tick = () => {
        const target = sketchProgress(heroState.progress);
        smooth += (target - smooth) * 0.14;
        if (Math.abs(target - smooth) < 1e-4) smooth = target;
        const ink = samplePen(smooth, pen).ink / SKETCH.totalInk;
        if (Math.abs(ink - lastInk) > 0.0004) {
          tl.progress(ink);
          lastInk = ink;
        }
        const b = buildProgress(heroState.progress);
        if (Math.abs(b - lastBuild) > 0.002) {
          gsap.set(fillEls, { fillOpacity: b * 0.75 });
          gsap.set('[data-plan]', { scale: 1 + b * 0.03, rotateX: b * 12 });
          lastBuild = b;
        }
      };
      gsap.ticker.add(tick);
      return () => gsap.ticker.remove(tick);
    },
    { scope: rootRef, dependencies: [mode, paths] },
  );

  return (
    <div ref={rootRef} className={[s.fallback, className].filter(Boolean).join(' ')} role="img" aria-label="Hand-drawn floor plan of an apartment, sketched by a designer at a drafting table">
      <div className={s.paper} data-plan="">
        <svg viewBox={`0 0 ${PAPER_UNITS.width} ${PAPER_UNITS.height}`} className={s.planSvg} aria-hidden="true">
          <rect x="24" y="24" width="1366" height="952" fill="none" stroke="#3b3835" strokeWidth="2.2" opacity="0.85" />
          <path d="M1170 30 V970 M1170 230 H1384 M1170 340 H1384 M1170 450 H1384 M1170 560 H1384" stroke="#3b3835" strokeWidth="0.9" opacity="0.6" />
          <text x="1277" y="120" textAnchor="middle" fontFamily="Playfair Display Variable, Playfair Display, Georgia, serif" fontSize="70" fill="#b7472a">
            R
          </text>
          <text x="1277" y="162" textAnchor="middle" fontFamily="Manrope, sans-serif" fontSize="14" letterSpacing="4" fill="#3b3835">
            RUST DESIGN STUDIO
          </text>
          <g>
            {fills.map((p, i) => (
              <path
                key={`f${i}`}
                data-fill=""
                d={`M${p.outline.map(([x, y]) => `${x} ${y}`).join(' L')} Z`}
                fill="#b7472a"
                fillOpacity="0"
              />
            ))}
          </g>
          <g fill="none" stroke="#3b3835" strokeLinecap="round" strokeLinejoin="round">
            {paths.map((p, i) => (
              <path key={i} data-stroke="" d={p.d} strokeWidth={Math.max(0.9, p.width)} />
            ))}
          </g>
        </svg>
      </div>
      <DesignerSilhouette />
    </div>
  );
}
