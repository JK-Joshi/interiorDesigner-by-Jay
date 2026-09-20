import { useRef } from 'react';
import { gsap, SplitText, useGSAP, MQ } from '../../../lib/gsap';
import { useFontsReady } from '../../../hooks/useFontsReady';
import { site } from '../../../data/site';
import SectionLabel from '../../ui/SectionLabel';
import MagneticButton from '../../ui/MagneticButton';
import RevealText from '../../ui/RevealText';
import s from './Statement.module.css';

const ACCENT_WORDS = /^(quiet,|material-first)$/i;
// Un-filled words stay ≥ 3:1 on linen (large text), then fill to ink.
const FROM = '#7a6e63';
const TO = '#1a1714';
const ACCENT = '#b7472a';

/**
 * Linen statement: words fill from stone to ink as you scroll (SplitText words, scrubbed).
 */
export default function Statement() {
  const rootRef = useRef(null);
  const textRef = useRef(null);
  const fontsReady = useFontsReady();

  useGSAP(
    () => {
      if (!fontsReady) return undefined;
      const el = textRef.current;
      const mm = gsap.matchMedia();
      mm.add({ motion: MQ.motion, reduce: MQ.reduce }, (ctx) => {
        const split = SplitText.create(el, {
          aria: 'none',
          type: 'words',
          wordsClass: 'split-word',
          autoSplit: true,
          onSplit(self) {
            el.classList.add('is-split');
            self.words.forEach((w) => {
              if (ACCENT_WORDS.test(w.textContent.trim())) w.dataset.accent = '1';
            });
            if (ctx.conditions.reduce) {
              gsap.set(self.words, { color: (i, w) => (w.dataset.accent ? ACCENT : TO) });
              return undefined;
            }
            return gsap.fromTo(
              self.words,
              { color: FROM },
              {
                color: (i, w) => (w.dataset.accent ? ACCENT : TO),
                ease: 'none',
                stagger: 0.12,
                scrollTrigger: {
                  trigger: el,
                  start: 'top 78%',
                  end: 'bottom 42%',
                  scrub: true,
                },
              },
            );
          },
        });
        if (!ctx.conditions.reduce) {
          gsap.fromTo('[data-statement-foot] > *', { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.1, stagger: 0.12, scrollTrigger: { trigger: '[data-statement-foot]', start: 'top 90%' } });
        }
        return () => split.revert();
      });
      return () => mm.revert();
    },
    { scope: rootRef, dependencies: [fontsReady] },
  );

  return (
    <section ref={rootRef} className={`section theme-light ${s.statement}`} aria-labelledby="statement-heading">
      <div className="container">
        <SectionLabel index={1} tone="light" as="h2" id="statement-heading">
          The studio
        </SectionLabel>
        <p ref={textRef} className={s.text} data-split="">
          {site.statement}
        </p>
        <div className={s.foot} data-statement-foot="">
          <RevealText as="p" className={s.aside}>
            Material-first · Craft-led · Quietly luxurious — designed and built in Rajkot since {site.foundedYear}.
          </RevealText>
          <MagneticButton to="/about" variant="outlineDark">
            About the studio
          </MagneticButton>
        </div>
      </div>
    </section>
  );
}
