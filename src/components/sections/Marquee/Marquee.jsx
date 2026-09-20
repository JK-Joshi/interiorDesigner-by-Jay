import { useRef } from 'react';
import { gsap, useGSAP, ScrollTrigger } from '../../../lib/gsap';
import { site } from '../../../data/site';
import s from './Marquee.module.css';

/**
 * Infinite, velocity-reactive text marquee. The direction flips with the scroll
 * direction and fast scrolling adds speed + a subtle skew.
 */
export function MarqueeRow({ items, speed = 60, reverse = false, variant = 'solid', separator = '✦', className }) {
  const rootRef = useRef(null);
  const trackRef = useRef(null);

  useGSAP(
    () => {
      const track = trackRef.current;
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const copies = track.children;
        let width = copies[0].offsetWidth;
        const wrap = () => gsap.utils.wrap(-width, 0);
        let wrapX = wrap();
        const setX = gsap.quickSetter(track, 'x', 'px');
        const setSkew = gsap.quickSetter(track, 'skewX', 'deg');
        let x = 0;
        let direction = reverse ? 1 : -1;
        let boost = 0;
        let skew = 0;
        let visible = false;

        const st = ScrollTrigger.create({
          trigger: rootRef.current,
          start: 'top bottom',
          end: 'bottom top',
          onToggle: (self) => {
            visible = self.isActive;
          },
          onUpdate: (self) => {
            const v = self.getVelocity();
            const dir = self.direction === 1 ? -1 : 1;
            direction = reverse ? -dir : dir;
            boost = gsap.utils.clamp(0, 14, Math.abs(v) / 180);
          },
        });

        const tick = (_, delta) => {
          if (!visible) return;
          const dt = Math.min(delta, 50) / 1000;
          boost *= 0.94;
          x = wrapX(x + direction * speed * (1 + boost) * dt);
          setX(x);
          skew += ((direction * boost * -0.9) - skew) * 0.1;
          setSkew(gsap.utils.clamp(-8, 8, skew));
        };
        gsap.ticker.add(tick);

        const ro = new ResizeObserver(() => {
          width = copies[0].offsetWidth;
          wrapX = wrap();
        });
        ro.observe(copies[0]);

        return () => {
          gsap.ticker.remove(tick);
          st.kill();
          ro.disconnect();
        };
      });
      return () => mm.revert();
    },
    { scope: rootRef },
  );

  const group = (hidden) => (
    <div className={s.group} aria-hidden={hidden || undefined}>
      {items.map((item) => (
        <span key={item} className={s.item}>
          <span className={s.word}>{item}</span>
          <span className={s.sep} aria-hidden="true">
            {separator}
          </span>
        </span>
      ))}
    </div>
  );

  return (
    <div ref={rootRef} className={[s.row, s[variant], className].filter(Boolean).join(' ')}>
      <div ref={trackRef} className={s.track}>
        {group(false)}
        {group(true)}
        {group(true)}
        {group(true)}
      </div>
    </div>
  );
}

/** Home marquee section: two rows moving in opposite directions. */
export default function Marquee() {
  const rootRef = useRef(null);
  useGSAP(
    () => {
      gsap.fromTo(rootRef.current.children, { yPercent: 60, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 1.2, stagger: 0.12, ease: 'rust.out', scrollTrigger: { trigger: rootRef.current, start: 'top 90%' } });
    },
    { scope: rootRef },
  );
  return (
    <section ref={rootRef} className={`theme-dark ${s.section}`} aria-label="What we design">
      <MarqueeRow items={site.marquee} speed={70} />
      <MarqueeRow items={site.marquee.map((m) => `${m} interiors`)} speed={50} reverse variant="outline" separator="—" />
    </section>
  );
}
