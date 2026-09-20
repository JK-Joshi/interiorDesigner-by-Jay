import { forwardRef, useImperativeHandle, useRef } from 'react';
import { gsap } from '../../lib/gsap';
import { pad2 } from '../../lib/content';
import { Figures, setFigures } from '../../lib/figures';
import s from './ProjectOverlay.module.css';

/**
 * Thin fixed progress bar + "04 / 09" counter for the walkthrough.
 * Updated imperatively (no React renders while scrolling).
 */
const WalkthroughHUD = forwardRef(function WalkthroughHUD({ className }, ref) {
  const rootRef = useRef(null);
  const barRef = useRef(null);
  const currentRef = useRef(null);
  const totalRef = useRef(null);
  const last = useRef({ active: false, index: -1 });

  useImperativeHandle(
    ref,
    () => ({
      update({ progress, index, total, active }) {
        if (!rootRef.current) return;
        if (active !== last.current.active) {
          last.current.active = active;
          gsap.to(rootRef.current, { autoAlpha: active ? 1 : 0, duration: 0.4, ease: 'none', overwrite: 'auto' });
        }
        gsap.set(barRef.current, { scaleX: Math.max(0, Math.min(1, progress)) });
        if (index !== last.current.index) {
          last.current.index = index;
          setFigures(currentRef.current, pad2(index + 1));
          gsap.fromTo(currentRef.current, { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.45, ease: 'rust.out' });
        }
        setFigures(totalRef.current, pad2(total));
      },
      hide() {
        last.current.active = false;
        if (rootRef.current) gsap.set(rootRef.current, { autoAlpha: 0 });
      },
    }),
    [],
  );

  return (
    <div ref={rootRef} className={[s.hud, className].filter(Boolean).join(' ')} aria-hidden="true">
      <div className={s.hudCounter}>
        <span className={s.hudMask}>
          <Figures ref={currentRef}>01</Figures>
        </span>
        <span className={s.hudSlash}>/</span>
        <Figures ref={totalRef}>01</Figures>
      </div>
      <div className={s.hudTrack}>
        <span ref={barRef} className={s.hudBar} />
      </div>
    </div>
  );
});

export default WalkthroughHUD;
