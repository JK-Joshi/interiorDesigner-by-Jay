import { useRef } from 'react';
import { gsap, useGSAP } from '../../../lib/gsap';
import { pad2 } from '../../../lib/content';
import { site } from '../../../data/site';
import SectionLabel from '../../ui/SectionLabel';
import RevealText from '../../ui/RevealText';
import s from './Process.module.css';

const H_PATH =
  'M0 60 C 90 40, 160 78, 250 58 S 420 36, 500 60 S 660 84, 750 58 S 900 34, 1000 60 S 1160 82, 1250 58 S 1400 40, 1500 60';
const V_PATH =
  'M30 0 C 12 60, 48 120, 30 180 S 14 300, 30 360 S 46 480, 30 540 S 14 660, 30 720 S 46 840, 30 900 S 20 960, 30 1000';

/**
 * Five steps joined by a pencil line that draws (DrawSVG) as you scroll.
 * Each step card reveals as the line reaches it; a small pencil rides the tip.
 */
export default function Process() {
  const rootRef = useRef(null);
  const steps = site.process;

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(
        {
          desktop: '(min-width: 900px) and (prefers-reduced-motion: no-preference)',
          mobile: '(max-width: 899px) and (prefers-reduced-motion: no-preference)',
          reduce: '(prefers-reduced-motion: reduce)',
        },
        (ctx) => {
          const { desktop, reduce } = ctx.conditions;
          const cards = gsap.utils.toArray('[data-step]');
          if (reduce) {
            gsap.set('[data-process-path]', { drawSVG: '100%' });
            gsap.fromTo(cards, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, stagger: 0.05, scrollTrigger: { trigger: '[data-process-track]', start: 'top 85%' } });
            return undefined;
          }

          const path = rootRef.current.querySelector(desktop ? '[data-path-h]' : '[data-path-v]');
          const svg = path.ownerSVGElement;
          const pencil = rootRef.current.querySelector('[data-pencil]');
          const length = path.getTotalLength();
          const viewBox = svg.viewBox.baseVal;
          const tip = { p: 0 };

          const movePencil = () => {
            const pt = path.getPointAtLength(length * tip.p);
            const ahead = path.getPointAtLength(Math.min(length, length * tip.p + 2));
            const box = svg.getBoundingClientRect();
            const host = rootRef.current.querySelector('[data-process-track]').getBoundingClientRect();
            const x = box.left - host.left + (pt.x / viewBox.width) * box.width;
            const y = box.top - host.top + (pt.y / viewBox.height) * box.height;
            const angle = (Math.atan2(ahead.y - pt.y, ahead.x - pt.x) * 180) / Math.PI;
            gsap.set(pencil, { x, y, rotation: angle - 150 });
          };

          gsap.set(path, { drawSVG: '0%' });
          gsap.set(cards, { autoAlpha: 0, y: 50 });

          const tl = gsap.timeline({
            defaults: { ease: 'none' },
            scrollTrigger: desktop
              ? {
                  trigger: '[data-process-pin]',
                  start: 'top top',
                  end: '+=160%',
                  pin: true,
                  scrub: 1,
                  anticipatePin: 1,
                  invalidateOnRefresh: true,
                  refreshPriority: 5,
                  onRefresh: movePencil,
                }
              : {
                  trigger: '[data-process-track]',
                  start: 'top 70%',
                  end: 'bottom 70%',
                  scrub: 1,
                  invalidateOnRefresh: true,
                  onRefresh: movePencil,
                },
          });
          tl.to(path, { drawSVG: '100%', duration: 1 }, 0).to(tip, { p: 1, duration: 1, onUpdate: movePencil }, 0);

          cards.forEach((card, i) => {
            const at = Math.min(0.92, (i + 0.5) / steps.length - 0.06);
            tl.to(card, { autoAlpha: 1, y: 0, duration: 0.08, ease: 'rust.out' }, at)
              .fromTo(card.querySelector('[data-dot]'), { scale: 0 }, { scale: 1, duration: 0.05, ease: 'back.out(3)' }, at)
              .fromTo(card.querySelector('[data-step-num]'), { yPercent: 110 }, { yPercent: 0, duration: 0.07, ease: 'rust.out' }, at + 0.01);
          });
          movePencil();
          return undefined;
        },
      );
      return () => mm.revert();
    },
    { scope: rootRef },
  );

  return (
    <section ref={rootRef} className={`theme-bone ${s.process}`} aria-labelledby="process-heading">
      <div className={s.pin} data-process-pin="">
        <div className="container">
          <header className={s.head}>
            <SectionLabel index={3} tone="light">
              Process
            </SectionLabel>
            <RevealText as="h2" id="process-heading" className={`display ${s.title}`}>
              From first line <em className="accent">to front door</em>
            </RevealText>
          </header>

          <div className={s.track} data-process-track="">
            <svg className={s.lineH} viewBox="0 0 1500 120" preserveAspectRatio="none" aria-hidden="true">
              <path d={H_PATH} data-path-h="" data-process-path="" />
            </svg>
            <svg className={s.lineV} viewBox="0 0 60 1000" preserveAspectRatio="none" aria-hidden="true">
              <path d={V_PATH} data-path-v="" data-process-path="" />
            </svg>
            <svg className={s.pencil} data-pencil="" viewBox="0 0 60 12" aria-hidden="true">
              <path d="M0 6 L9 3 L9 9 Z" fill="#3B3835" />
              <path d="M9 3 L13 1.8 L13 10.2 L9 9 Z" fill="#E7C9A0" />
              <rect x="13" y="1.8" width="36" height="8.4" fill="#B7472A" />
              <rect x="49" y="1.8" width="4" height="8.4" fill="#B8955A" />
              <rect x="53" y="1.8" width="6" height="8.4" rx="1.5" fill="#D9784F" />
            </svg>

            <ol className={s.steps}>
              {steps.map((step, i) => (
                <li key={step.title} className={s.step} data-step="">
                  <span className={s.dot} data-dot="" aria-hidden="true" />
                  <p className={s.numMask}>
                    <span className={s.num} data-step-num="">
                      {pad2(i + 1)}
                    </span>
                  </p>
                  <h3 className={s.stepTitle}>{step.title}</h3>
                  <p className={s.stepText}>{step.description}</p>
                  <p className={s.duration}>{step.duration}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
