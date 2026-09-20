import { useRef } from 'react';
import { gsap, useGSAP, MQ } from '../../lib/gsap';
import { pad2 } from '../../lib/content';
import s from './SectionLabel.module.css';

/**
 * "(01) ——— Label" eyebrow. The number rolls in, the hairline draws, the label rises.
 */
export default function SectionLabel({ index, children, tone = 'dark', className, scroller, as: Tag = 'div', ...rest }) {
  const ref = useRef(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add({ motion: MQ.motion, reduce: MQ.reduce }, (ctx) => {
        const st = {
          trigger: ref.current,
          start: 'top 88%',
          scroller: scroller?.current || scroller || undefined,
          toggleActions: 'play none none none',
        };
        if (ctx.conditions.reduce) {
          gsap.fromTo(ref.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, scrollTrigger: st });
          return;
        }
        const tl = gsap.timeline({ scrollTrigger: st });
        const num = ref.current.querySelector('[data-sl-num]');
        if (num) tl.from(num, { yPercent: 110, duration: 0.9, ease: 'rust.out' }, 0);
        tl.from('[data-sl-line]', { scaleX: 0, duration: 1.2, ease: 'rust.inOut' }, 0.1)
          .from('[data-sl-text]', { yPercent: 110, duration: 0.9, ease: 'rust.out' }, 0.35);
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <Tag ref={ref} className={[s.label, s[tone], className].filter(Boolean).join(' ')} {...rest}>
      {index != null ? (
        <span className={s.mask}>
          <span className={s.num} data-sl-num="">
            ({pad2(index)})
          </span>
        </span>
      ) : null}
      <span className={s.line} data-sl-line="" aria-hidden="true" />
      <span className={s.mask}>
        <span className={s.text} data-sl-text="">
          {children}
        </span>
      </span>
    </Tag>
  );
}
