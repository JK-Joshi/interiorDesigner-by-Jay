import { useRef } from 'react';
import { gsap, useGSAP, MQ } from '../../../lib/gsap';
import { pad2 } from '../../../lib/content';
import { site } from '../../../data/site';
import SectionLabel from '../../ui/SectionLabel';
import RevealText from '../../ui/RevealText';
import MagneticButton from '../../ui/MagneticButton';
import ImageWithFallback from '../../ui/ImageWithFallback';
import s from './Services.module.css';

/**
 * Numbered service rows. On hover a floating image follows the cursor
 * (quickTo, rotation from velocity) and the row slides + turns rust-light.
 */
export default function Services() {
  const rootRef = useRef(null);
  const floaterRef = useRef(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(
        { motion: MQ.motion, reduce: MQ.reduce, fine: '(hover: hover) and (pointer: fine)' },
        (ctx) => {
          const { reduce, fine } = ctx.conditions;
          const rows = gsap.utils.toArray('[data-service-row]');

          if (reduce) {
            gsap.fromTo(rows, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, stagger: 0.05, scrollTrigger: { trigger: '[data-service-list]', start: 'top 85%' } });
            return undefined;
          }

          rows.forEach((row) => {
            const tl = gsap.timeline({ scrollTrigger: { trigger: row, start: 'top 90%' } });
            tl.from(row.querySelector('[data-line]'), { scaleX: 0, duration: 1.3, ease: 'rust.inOut' })
              .from(row.querySelectorAll('[data-rise]'), { yPercent: 110, duration: 1.1, stagger: 0.06, ease: 'rust.out' }, 0.15)
              .fromTo(row.querySelectorAll('[data-fade]'), { autoAlpha: 0, x: -12 }, { autoAlpha: 1, x: 0, duration: 0.9, ease: 'rust.out' }, 0.35);
          });

          if (!fine) return undefined;

          const floater = floaterRef.current;
          const images = gsap.utils.toArray('[data-float]', floater);
          gsap.set(floater, { xPercent: -50, yPercent: -50, scale: 0.4, autoAlpha: 0 });
          const xTo = gsap.quickTo(floater, 'x', { duration: 0.65, ease: 'power3.out' });
          const yTo = gsap.quickTo(floater, 'y', { duration: 0.65, ease: 'power3.out' });
          const rTo = gsap.quickTo(floater, 'rotation', { duration: 0.8, ease: 'power3.out' });
          let lastX = 0;
          let current = -1;
          let first = true;

          const onMove = (e) => {
            if (first) {
              gsap.set(floater, { x: e.clientX, y: e.clientY });
              first = false;
            }
            xTo(e.clientX);
            yTo(e.clientY);
            const vx = e.clientX - lastX;
            lastX = e.clientX;
            rTo(gsap.utils.clamp(-14, 14, vx * 0.6));
          };

          const show = (index) => {
            if (index === current) return;
            const prev = current;
            current = index;
            gsap.to(floater, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'rust.out', overwrite: 'auto' });
            images.forEach((img, i) => {
              if (i === index) {
                gsap.fromTo(
                  img,
                  { clipPath: prev < index ? 'inset(100% 0% 0% 0%)' : 'inset(0% 0% 100% 0%)', zIndex: 2 },
                  { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.7, ease: 'rust.out', overwrite: true },
                );
                gsap.fromTo(img.firstElementChild, { scale: 1.3 }, { scale: 1, duration: 0.9, ease: 'rust.out', overwrite: true });
              } else {
                gsap.set(img, { zIndex: 1 });
              }
            });
          };
          const hide = () => {
            current = -1;
            first = true;
            gsap.to(floater, { autoAlpha: 0, scale: 0.4, duration: 0.5, ease: 'rust.out', overwrite: 'auto' });
          };

          const list = rootRef.current.querySelector('[data-service-list]');
          const enterHandlers = rows.map((row, i) => {
            const fn = () => show(i);
            row.addEventListener('pointerenter', fn);
            return [row, fn];
          });
          list.addEventListener('pointerleave', hide);
          window.addEventListener('pointermove', onMove, { passive: true });
          window.addEventListener('scroll', hide, { passive: true });

          return () => {
            enterHandlers.forEach(([row, fn]) => row.removeEventListener('pointerenter', fn));
            list.removeEventListener('pointerleave', hide);
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('scroll', hide);
          };
        },
      );
      return () => mm.revert();
    },
    { scope: rootRef },
  );

  return (
    <section ref={rootRef} className={`section theme-dark ${s.services}`} aria-labelledby="services-heading">
      <div className="container">
        <header className={s.head}>
          <SectionLabel index={2}>Services</SectionLabel>
          <RevealText as="h2" id="services-heading" className={`display ${s.title}`}>
            What we <em className="accent">design</em>
          </RevealText>
          <RevealText as="p" className={s.intro} delay={0.1}>
            One studio for every stage — from the first conversation to the last cushion. Residential, commercial and hospitality
            projects across Gujarat.
          </RevealText>
        </header>

        <ol className={s.list} data-service-list="">
          {site.services.map((service, i) => (
            <li key={service.title} className={s.row} data-service-row="">
              <span className={s.line} data-line="" aria-hidden="true" />
              <div className={s.rowInner}>
                <span className={s.mask}>
                  <span className={s.num} data-rise="">
                    ({pad2(i + 1)})
                  </span>
                </span>
                <h3 className={`${s.mask} ${s.nameMask}`}>
                  <span className={s.name} data-rise="">
                    {service.title}
                  </span>
                </h3>
                <p className={s.desc} data-fade="">
                  {service.description}
                </p>
                <span className={s.arrow} data-fade="" aria-hidden="true">
                  →
                </span>
              </div>
            </li>
          ))}
          <li className={s.lastLine} aria-hidden="true">
            <span className={s.line} data-line="" />
          </li>
        </ol>

        <div className={s.cta}>
          <MagneticButton to="/book" variant="outline">
            Start a project
          </MagneticButton>
        </div>
      </div>

      <div ref={floaterRef} className={s.floater} aria-hidden="true">
        {site.services.map((service) => (
          <div key={service.title} className={s.floatImage} data-float="">
            <div className={s.floatInner}>
              <ImageWithFallback src={service.image} alt="" width={1600} height={1067} sizes="360px" label={service.title} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
