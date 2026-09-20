import { useCallback, useEffect, useRef, useState } from 'react';
import { gsap, SplitText, Draggable, useGSAP, MQ } from '../../../lib/gsap';
import { pad2 } from '../../../lib/content';
import { Figures } from '../../../lib/figures';
import { site } from '../../../data/site';
import { useFontsReady } from '../../../hooks/useFontsReady';
import SectionLabel from '../../ui/SectionLabel';
import s from './Testimonials.module.css';

const AUTOPLAY = 8;

/**
 * Large italic quotes that cross-fade with SplitText line transitions.
 * Controls: arrows, drag / swipe, keyboard (← →). Autoplay pauses on hover / focus.
 */
export default function Testimonials() {
  const items = site.testimonials;
  const rootRef = useRef(null);
  const stageRef = useRef(null);
  const timerRef = useRef(null);
  const splitsRef = useRef([]);
  const busy = useRef(false);
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const fontsReady = useFontsReady();

  // Split every quote once (autoSplit keeps lines correct on resize).
  const { contextSafe } = useGSAP(
    () => {
      if (!fontsReady) return undefined;
      const quotes = gsap.utils.toArray('[data-quote]', stageRef.current);
      splitsRef.current = quotes.map((q) =>
        SplitText.create(q.querySelector('[data-quote-text]'), {
          aria: 'none',
          type: 'lines',
          mask: 'lines',
          linesClass: 'split-line',
          autoSplit: true,
          onSplit(self) {
            self.elements[0].classList.add('is-split');
          },
        }),
      );
      quotes.forEach((q, i) => gsap.set(q, { autoAlpha: i === indexRef.current ? 1 : 0 }));

      const mm = gsap.matchMedia();
      mm.add(MQ.motion, () => {
        const first = splitsRef.current[indexRef.current];
        gsap.from(first.lines, {
          yPercent: 110,
          rotate: 2,
          duration: 1.3,
          stagger: 0.09,
          ease: 'rust.out',
          scrollTrigger: { trigger: stageRef.current, start: 'top 80%' },
        });
        gsap.fromTo('[data-t-meta]', { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 1, stagger: 0.08, scrollTrigger: { trigger: stageRef.current, start: 'top 80%' } });
        gsap.fromTo('[data-quote-mark]', { scale: 0.4, rotate: -30, autoAlpha: 0 }, { scale: 1, rotate: 0, autoAlpha: 1, duration: 1.4, ease: 'back.out(2)', scrollTrigger: { trigger: rootRef.current, start: 'top 75%' } });
      });

      return () => {
        mm.revert();
        splitsRef.current.forEach((sp) => sp.revert());
        splitsRef.current = [];
      };
    },
    { scope: rootRef, dependencies: [fontsReady] },
  );

  const restartTimer = useCallback(() => {
    if (!timerRef.current) return;
    gsap.fromTo(timerRef.current, { scaleX: 0 }, { scaleX: 1, duration: AUTOPLAY, ease: 'none', overwrite: true });
  }, []);

  const goTo = contextSafe((next) => {
    const count = items.length;
    const to = ((next % count) + count) % count;
    const from = indexRef.current;
    if (to === from || busy.current) return;
    busy.current = true;
    const quotes = gsap.utils.toArray('[data-quote]', stageRef.current);
    const outSplit = splitsRef.current[from];
    const inSplit = splitsRef.current[to];
    const dir = next > from ? 1 : -1;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tl = gsap.timeline({
      onComplete: () => {
        busy.current = false;
      },
    });
    if (reduce || !outSplit || !inSplit) {
      tl.to(quotes[from], { autoAlpha: 0, duration: 0.3 }).set(quotes[to], { autoAlpha: 1 }).fromTo(quotes[to], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 });
    } else {
      tl.to(outSplit.lines, { yPercent: -110 * dir, duration: 0.7, stagger: 0.04, ease: 'rust.in' })
        .to(quotes[from].querySelectorAll('[data-quote-meta]'), { autoAlpha: 0, y: -10, duration: 0.4 }, 0)
        .set(quotes[from], { autoAlpha: 0 })
        .set(outSplit.lines, { yPercent: 0 })
        .set(quotes[to], { autoAlpha: 1 })
        .fromTo(inSplit.lines, { yPercent: 110 * dir, rotate: 2 * dir }, { yPercent: 0, rotate: 0, duration: 1.1, stagger: 0.07, ease: 'rust.out' })
        .fromTo(quotes[to].querySelectorAll('[data-quote-meta]'), { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'rust.out' }, '-=0.8');
    }
    indexRef.current = to;
    setIndex(to);
    restartTimer();
  });

  // Autoplay (pauses on hover / focus / hidden tab).
  useEffect(() => {
    if (!fontsReady) return undefined;
    const root = rootRef.current;
    let paused = false;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return undefined;
    restartTimer();
    const id = window.setInterval(() => {
      if (!paused && !document.hidden) goTo(indexRef.current + 1);
    }, AUTOPLAY * 1000);
    const pause = () => {
      paused = true;
      gsap.getTweensOf(timerRef.current).forEach((t) => t.pause());
    };
    const resume = () => {
      paused = false;
      gsap.getTweensOf(timerRef.current).forEach((t) => t.resume());
    };
    root.addEventListener('pointerenter', pause);
    root.addEventListener('pointerleave', resume);
    root.addEventListener('focusin', pause);
    root.addEventListener('focusout', resume);
    return () => {
      window.clearInterval(id);
      root.removeEventListener('pointerenter', pause);
      root.removeEventListener('pointerleave', resume);
      root.removeEventListener('focusin', pause);
      root.removeEventListener('focusout', resume);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fontsReady]);

  // Drag / swipe.
  useGSAP(
    () => {
      const stage = stageRef.current;
      const proxy = document.createElement('div');
      proxy.setAttribute('aria-hidden', 'true');
      proxy.style.cssText = 'position:absolute;width:1px;height:1px;visibility:hidden;pointer-events:none;';
      stage.appendChild(proxy);
      const [drag] = Draggable.create(proxy, {
        type: 'x',
        trigger: stage,
        minimumMovement: 8,
        allowNativeTouchScrolling: true,
        onDragEnd() {
          const dx = this.endX - this.startX;
          if (Math.abs(dx) > 50) goTo(indexRef.current + (dx < 0 ? 1 : -1));
        },
      });
      return () => {
        drag.kill();
        proxy.remove();
      };
    },
    { scope: rootRef },
  );

  const onKeyDown = (e) => {
    if (e.key === 'ArrowRight') goTo(indexRef.current + 1);
    if (e.key === 'ArrowLeft') goTo(indexRef.current - 1);
  };

  return (
    <section
      ref={rootRef}
      className={`section theme-espresso ${s.testimonials}`}
      aria-roledescription="carousel"
      aria-labelledby="testimonials-heading"
    >
      <div className="container">
        <div className={s.head}>
          <SectionLabel index={4}>Kind words</SectionLabel>
          <h2 id="testimonials-heading" className="visually-hidden">
            Client testimonials
          </h2>
        </div>

        <div className={s.body}>
          <span className={s.mark} data-quote-mark="" aria-hidden="true">
            “
          </span>
          <div
            ref={stageRef}
            className={s.stage}
            tabIndex={0}
            onKeyDown={onKeyDown}
            data-cursor="Drag"
            role="group"
            aria-live="polite"
            aria-label="Testimonials. Use left and right arrow keys to change."
          >
            {items.map((t, i) => (
              <figure
                key={t.name}
                className={s.quote}
                data-quote=""
                aria-hidden={i !== index}
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${items.length}`}
              >
                <blockquote>
                  <p className={s.text} data-quote-text="" data-split="">
                    {t.quote}
                  </p>
                </blockquote>
                <figcaption className={s.caption} data-quote-meta="">
                  <span className={s.name}>{t.name}</span>
                  <span className={s.project}>{t.project}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>

        <div className={s.controls}>
          <p className={s.count} data-t-meta="">
            <Figures>{pad2(index + 1)}</Figures>
            <span className={s.slash}>/</span>
            <Figures>{pad2(items.length)}</Figures>
          </p>
          <div className={s.timer} data-t-meta="" aria-hidden="true">
            <span ref={timerRef} className={s.timerBar} />
          </div>
          <div className={s.arrows} data-t-meta="">
            <button type="button" className={s.arrow} onClick={() => goTo(indexRef.current - 1)} aria-label="Previous testimonial">
              ←
            </button>
            <button type="button" className={s.arrow} onClick={() => goTo(indexRef.current + 1)} aria-label="Next testimonial">
              →
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
