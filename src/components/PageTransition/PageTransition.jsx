import { forwardRef, useImperativeHandle, useRef } from 'react';
import { gsap, useGSAP } from '../../lib/gsap';
import { appStore } from '../../lib/appState';
import Monogram from '../ui/Monogram';
import s from './PageTransition.module.css';

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Rust panel wipe: rises over the page, sketches the "R" monogram (DrawSVG),
 * then lifts away. Controlled imperatively by the router shell:
 *   await ref.current.cover('About Us'); …swap page…; await ref.current.reveal();
 */
const PageTransition = forwardRef(function PageTransition(_, ref) {
  const rootRef = useRef(null);
  const panelRef = useRef(null);
  const outlineRef = useRef(null);
  const fillRef = useRef(null);
  const labelRef = useRef(null);
  const tlRef = useRef(null);

  const { contextSafe } = useGSAP(
    () => {
      gsap.set(panelRef.current, { yPercent: 100 });
    },
    { scope: rootRef },
  );

  const cover = contextSafe(
    (label = '') =>
      new Promise((resolve) => {
        tlRef.current?.kill();
        appStore.set({ transitioning: true });
        if (labelRef.current) labelRef.current.textContent = label;
        const paths = outlineRef.current.querySelectorAll('path');
        const tl = gsap.timeline({ onComplete: resolve });
        tlRef.current = tl;
        if (reduced()) {
          tl.set(rootRef.current, { autoAlpha: 1 })
            .set(panelRef.current, { yPercent: 0 })
            .fromTo(panelRef.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25, ease: 'none' })
            .set([fillRef.current, labelRef.current], { autoAlpha: 1 });
          return;
        }
        tl.set(rootRef.current, { autoAlpha: 1 })
          .set(panelRef.current, { autoAlpha: 1 })
          .set(fillRef.current, { autoAlpha: 0 })
          .set(outlineRef.current, { autoAlpha: 1 })
          .set(labelRef.current, { autoAlpha: 0, yPercent: 100 })
          .fromTo(
            panelRef.current,
            { yPercent: 100, borderTopLeftRadius: '50% 18vh', borderTopRightRadius: '50% 18vh' },
            {
              yPercent: 0,
              borderTopLeftRadius: '50% 0vh',
              borderTopRightRadius: '50% 0vh',
              duration: 0.85,
              ease: 'rust.inOut',
            },
          )
          .fromTo(paths, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.8, stagger: 0.07, ease: 'rust.inOut' }, 0.4)
          .to(fillRef.current, { autoAlpha: 1, duration: 0.35, ease: 'none' }, '-=0.25')
          .to(outlineRef.current, { autoAlpha: 0, duration: 0.3, ease: 'none' }, '<')
          .to(labelRef.current, { autoAlpha: 1, yPercent: 0, duration: 0.6, ease: 'rust.out' }, '-=0.45');
      }),
  );

  const reveal = contextSafe(
    () =>
      new Promise((resolve) => {
        tlRef.current?.kill();
        const done = () => {
          gsap.set(rootRef.current, { autoAlpha: 0 });
          appStore.set({ transitioning: false });
          resolve();
        };
        const tl = gsap.timeline({ onComplete: done });
        tlRef.current = tl;
        if (reduced()) {
          tl.to(panelRef.current, { autoAlpha: 0, duration: 0.25, ease: 'none' });
          return;
        }
        tl.to([fillRef.current, labelRef.current], {
          yPercent: -40,
          autoAlpha: 0,
          duration: 0.5,
          ease: 'rust.in',
          stagger: 0.05,
        })
          .to(
            panelRef.current,
            {
              yPercent: -100,
              borderBottomLeftRadius: '50% 18vh',
              borderBottomRightRadius: '50% 18vh',
              duration: 0.95,
              ease: 'rust.inOut',
            },
            0.15,
          )
          .set(panelRef.current, { borderRadius: 0 })
          .set(fillRef.current, { yPercent: 0 });
      }),
  );

  useImperativeHandle(ref, () => ({ cover, reveal }), [cover, reveal]);

  return (
    <div ref={rootRef} className={s.root} aria-hidden="true">
      <div ref={panelRef} className={s.panel}>
        <div className={s.mark}>
          <Monogram ref={outlineRef} className={s.outline} variant="outline" />
          <Monogram ref={fillRef} className={s.fill} />
        </div>
        <p className={s.labelMask}>
          <span ref={labelRef} className={s.label} />
        </p>
      </div>
    </div>
  );
});

export default PageTransition;
