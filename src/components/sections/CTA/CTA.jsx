import { useRef } from 'react';
import { gsap, SplitText, splitAria, useGSAP, MQ } from '../../../lib/gsap';
import { useFontsReady } from '../../../hooks/useFontsReady';
import SectionLabel from '../../ui/SectionLabel';
import MagneticButton from '../../ui/MagneticButton';
import s from './CTA.module.css';

/**
 * Rust call-to-action: "Let's sketch your next space" with a pencil underline
 * that draws beneath "your" and a magnetic button.
 */
export default function CTA({ title = true }) {
  const rootRef = useRef(null);
  const headingRef = useRef(null);
  const fontsReady = useFontsReady();

  useGSAP(
    () => {
      if (!fontsReady) return undefined;
      const heading = headingRef.current;
      const mm = gsap.matchMedia();
      mm.add({ motion: MQ.motion, reduce: MQ.reduce }, (ctx) => {
        if (ctx.conditions.reduce) {
          heading.classList.add('is-split');
          gsap.set('[data-underline]', { drawSVG: '100%' });
          return undefined;
        }
        const split = SplitText.create(heading, {
          aria: splitAria(heading),
          type: 'words,lines',
          mask: 'lines',
          linesClass: 'split-line',
          autoSplit: true,
          onSplit(self) {
            heading.classList.add('is-split');
            const tl = gsap.timeline({ scrollTrigger: { trigger: rootRef.current, start: 'top 70%' } });
            tl.from(self.lines, { yPercent: 115, rotate: 3, duration: 1.3, stagger: 0.1, ease: 'rust.out' })
              .fromTo('[data-underline]', { drawSVG: '0%' }, { drawSVG: '100%', duration: 1.2, ease: 'rust.inOut' }, 0.7)
              .fromTo('[data-cta-fade]', { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1, stagger: 0.1, ease: 'rust.out' }, 0.5);
            return tl;
          },
        });
        gsap.fromTo(
          '[data-cta-bg]',
          { scale: 0.92, borderRadius: '48px' },
          {
            scale: 1,
            borderRadius: '0px',
            ease: 'none',
            scrollTrigger: { trigger: rootRef.current, start: 'top bottom', end: 'top 30%', scrub: true },
          },
        );
        return () => split.revert();
      });
      return () => mm.revert();
    },
    { scope: rootRef, dependencies: [fontsReady] },
  );

  return (
    <section ref={rootRef} className={s.cta} aria-labelledby="cta-heading">
      <div className={s.bg} data-cta-bg="" aria-hidden="true" />
      <div className={`container ${s.inner}`}>
        <SectionLabel tone="onRust">Your project</SectionLabel>
        <h2 ref={headingRef} id="cta-heading" className={`display ${s.heading}`} data-split="">
          Let’s sketch{' '}
          <em className={s.your}>
            your
            <svg className={s.underline} viewBox="0 0 220 30" preserveAspectRatio="none" aria-hidden="true">
              <path data-underline="" d="M4 18 C 40 8, 80 26, 120 14 S 190 8, 216 20 M20 24 C 70 18, 140 26, 200 20" />
            </svg>
          </em>{' '}
          next space
        </h2>
        {title ? (
          <p className={s.text} data-cta-fade="">
            A thirty-minute call is where every Rust Design Studio project begins. Tell us about your home, workplace or hotel.
          </p>
        ) : null}
        <div className={s.actions} data-cta-fade="">
          <MagneticButton to="/book" variant="light" size="xl" strength={0.45}>
            Book an Appointment
          </MagneticButton>
          <MagneticButton to="/about" variant="ghost" arrow={false}>
            Meet the studio
          </MagneticButton>
        </div>
      </div>
    </section>
  );
}
