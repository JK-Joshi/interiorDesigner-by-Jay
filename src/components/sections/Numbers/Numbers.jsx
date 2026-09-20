import { useRef } from 'react';
import { gsap, useGSAP, MQ } from '../../../lib/gsap';
import { site } from '../../../data/site';
import { CountUp } from '../../../lib/figures';
import s from './Numbers.module.css';

const format = (value, decimals) =>
  decimals ? value.toFixed(decimals) : new Intl.NumberFormat('en-IN').format(Math.round(value));

/**
 * Four counters separated by brass hairlines; they count up with a snap on entry.
 */
export default function Numbers() {
  const rootRef = useRef(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add({ motion: MQ.motion, reduce: MQ.reduce }, (ctx) => {
        const items = gsap.utils.toArray('[data-stat]');
        if (ctx.conditions.reduce) {
          gsap.fromTo(items, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, scrollTrigger: { trigger: rootRef.current, start: 'top 85%' } });
          return;
        }
        const tl = gsap.timeline({ scrollTrigger: { trigger: rootRef.current, start: 'top 80%' } });
        tl.fromTo(items, { '--rule': 0 }, { '--rule': 1, duration: 1.2, stagger: 0.1, ease: 'rust.inOut' }, 0)
          .from('[data-stat-top]', { scaleX: 0, duration: 1.4, ease: 'rust.inOut' }, 0);
        items.forEach((item, i) => {
          const valueEl = item.querySelector('[data-value]');
          const value = Number(item.dataset.value);
          const decimals = Number(item.dataset.decimals || 0);
          const counter = { v: 0 };
          valueEl.textContent = format(0, decimals);
          tl.from(item.querySelectorAll('[data-rise]'), { yPercent: 110, duration: 1, stagger: 0.08, ease: 'rust.out' }, 0.15 + i * 0.1).to(
            counter,
            {
              v: value,
              duration: 2.2,
              ease: 'rust.out',
              snap: { v: decimals ? 0.1 : 1 },
              onUpdate: () => {
                valueEl.textContent = format(counter.v, decimals);
              },
            },
            0.2 + i * 0.1,
          );
        });
      });
      return () => mm.revert();
    },
    { scope: rootRef },
  );

  return (
    <section ref={rootRef} className={`theme-light ${s.numbers}`} aria-label="Studio in numbers">
      <div className="container">
        <span className={s.top} data-stat-top="" aria-hidden="true" />
        <dl className={s.grid}>
          {site.stats.map((stat) => (
            <div
              key={stat.label}
              className={s.item}
              data-stat=""
              data-value={stat.value}
              data-decimals={stat.decimals || 0}
            >
              <dt className={s.mask}>
                <span className={s.label} data-rise="">
                  {stat.label}
                </span>
              </dt>
              <dd className={s.mask}>
                <span className={s.value} data-rise="">
                  <CountUp final={format(stat.value, stat.decimals)} data-value="" />
                  <span className={s.suffix}>{stat.suffix}</span>
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
