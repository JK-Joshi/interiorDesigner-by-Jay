import { gsap, SplitText, splitAria, useGSAP, MOTION, MQ } from '../lib/gsap';
import { useFontsReady } from './useFontsReady';

/**
 * SplitText line (or word / char) reveal with masks.
 * Uses autoSplit + onSplit so the animation survives resizes & font swaps.
 *
 * @param {React.RefObject<HTMLElement>} ref
 * @param {object} options
 *   type: 'lines' | 'words' | 'chars'
 *   trigger: element | false (false = play immediately / controlled by `play`)
 *   start, scroller, delay, stagger, duration, rotate
 *   play: boolean — when trigger === false the animation waits for play === true
 */
export function useSplitReveal(ref, options = {}) {
  const {
    type = 'lines',
    trigger,
    start = MOTION.start,
    scroller,
    delay = 0,
    stagger,
    duration = MOTION.reveal,
    rotate = MOTION.lineFrom.rotate,
    play = true,
    enabled = true,
    dependencies = [],
  } = options;
  const fontsReady = useFontsReady();

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || !fontsReady || !enabled) return undefined;
      if (trigger === false && !play) return undefined;

      const scrollTrigger =
        trigger === false
          ? undefined
          : {
              trigger: trigger?.current || trigger || el,
              start,
              scroller: scroller?.current || scroller || undefined,
              toggleActions: 'play none none none',
            };

      const mm = gsap.matchMedia();
      mm.add({ motion: MQ.motion, reduce: MQ.reduce }, (ctx) => {
        if (ctx.conditions.reduce) {
          el.classList.add('is-split');
          gsap.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, delay: delay * 0.5, ease: 'none', scrollTrigger });
          return undefined;
        }
        const splitType = type === 'lines' ? 'lines' : type === 'words' ? 'words,lines' : 'chars,words,lines';
        const split = SplitText.create(el, {
          aria: splitAria(el),
          type: splitType,
          mask: type === 'chars' ? 'chars' : type === 'words' ? 'words' : 'lines',
          autoSplit: true,
          linesClass: 'split-line',
          wordsClass: 'split-word',
          charsClass: 'split-char',
          onSplit(self) {
            el.classList.add('is-split');
            const targets = type === 'lines' ? self.lines : type === 'words' ? self.words : self.chars;
            return gsap.from(targets, {
              yPercent: 115,
              rotate: type === 'chars' ? 0 : rotate,
              rotateX: type === 'chars' ? -60 : 0,
              transformOrigin: '0% 100%',
              duration,
              delay,
              ease: 'rust.out',
              stagger: stagger ?? (type === 'lines' ? MOTION.stagger : type === 'words' ? 0.035 : 0.022),
              scrollTrigger,
            });
          },
        });
        return () => split.revert();
      });
      return () => mm.revert();
    },
    { scope: ref, dependencies: [fontsReady, play, enabled, type, ...dependencies], revertOnUpdate: true },
  );
}
