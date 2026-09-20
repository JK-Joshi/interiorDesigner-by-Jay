import { gsap, useGSAP, MQ } from '../lib/gsap';

/**
 * The studio's standard image entrance:
 *   wrapper  clip-path inset(100% 0 0 0) → inset(0% 0 0 0)
 *   <img>    scale 1.35 → 1, brightness(0.6) → 1
 *   parallax layer yPercent -8 → 8 while scrolling (scrubbed, linear)
 *
 * Expected markup:
 *   <figure ref>                       ← wrapper (clip)
 *     <div data-parallax>              ← optional parallax layer (oversized)
 *       <img data-reveal-inner />      ← scaled / brightened
 */
export function useImageReveal(ref, options = {}) {
  const {
    parallax = true,
    parallaxAmount = 8,
    scroller,
    start = 'top 85%',
    delay = 0,
    direction = 'up', // up | left | right
    trigger,
    play = true,
    dependencies = [],
  } = options;

  useGSAP(
    () => {
      const wrapper = ref.current;
      if (!wrapper) return undefined;
      if (!play) {
        // Waiting (e.g. behind the preloader): keep the image hidden so it can't flash.
        const wait = gsap.matchMedia();
        wait.add(MQ.motion, () => {
          gsap.set(wrapper, { clipPath: 'inset(100% 0% 0% 0%)' });
        });
        return () => wait.revert();
      }
      const inner = wrapper.querySelector('[data-reveal-inner]') || wrapper.querySelector('img');
      const layer = wrapper.querySelector('[data-parallax]');
      const scrollerEl = scroller?.current || scroller || undefined;
      const hidden =
        direction === 'left'
          ? 'inset(0% 100% 0% 0%)'
          : direction === 'right'
            ? 'inset(0% 0% 0% 100%)'
            : 'inset(100% 0% 0% 0%)';

      const mm = gsap.matchMedia();
      mm.add({ motion: MQ.motion, reduce: MQ.reduce }, (ctx) => {
        const st =
          trigger === false
            ? undefined
            : {
                trigger: trigger?.current || trigger || wrapper,
                start,
                scroller: scrollerEl,
                toggleActions: 'play none none none',
              };

        if (ctx.conditions.reduce) {
          gsap.fromTo(wrapper, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, ease: 'none', delay, scrollTrigger: st });
          return;
        }

        const tl = gsap.timeline({ delay, scrollTrigger: st });
        tl.fromTo(
          wrapper,
          { clipPath: hidden },
          { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'rust.inOut' },
        );
        if (inner) {
          tl.fromTo(
            inner,
            { scale: 1.35, filter: 'brightness(0.6)' },
            { scale: 1, filter: 'brightness(1)', duration: 1.8, ease: 'rust.out', clearProps: 'filter' },
            0,
          );
        }

        if (parallax && layer) {
          gsap.fromTo(
            layer,
            { yPercent: -parallaxAmount },
            {
              yPercent: parallaxAmount,
              ease: 'none',
              scrollTrigger: {
                trigger: wrapper,
                start: 'top bottom',
                end: 'bottom top',
                scrub: true,
                scroller: scrollerEl,
              },
            },
          );
        }
      });
      return () => mm.revert();
    },
    { scope: ref, dependencies: [play, ...dependencies], revertOnUpdate: true },
  );
}
