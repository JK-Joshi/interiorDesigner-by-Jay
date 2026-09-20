import { useRef } from 'react';
import { gsap, SplitText, useGSAP, MQ } from '../../lib/gsap';
import { getNextProject } from '../../data/projects';
import { useFontsReady } from '../../hooks/useFontsReady';
import RevealText from '../ui/RevealText';
import RevealImage from '../ui/RevealImage';
import MagneticButton from '../ui/MagneticButton';
import SectionLabel from '../ui/SectionLabel';
import s from './ProjectOverlay.module.css';

/**
 * Outro: "Planning a similar space?" CTA, then a huge "Next Project" link.
 */
export default function NextProject({ project, scroller, onNext }) {
  const rootRef = useRef(null);
  const titleRef = useRef(null);
  const next = getNextProject(project.slug);
  const fontsReady = useFontsReady();

  useGSAP(
    () => {
      if (!fontsReady) return undefined;
      const scrollerEl = scroller?.current || undefined;
      const mm = gsap.matchMedia();
      mm.add({ motion: MQ.motion, reduce: MQ.reduce }, (ctx) => {
        const title = titleRef.current;
        if (ctx.conditions.reduce) {
          title.classList.add('is-split');
          return undefined;
        }
        const split = SplitText.create(title, {
          aria: 'none',
          type: 'chars,words',
          mask: 'words',
          autoSplit: true,
          onSplit(self) {
            title.classList.add('is-split');
            return gsap.from(self.chars, {
              yPercent: 110,
              duration: 1.1,
              stagger: 0.02,
              ease: 'rust.out',
              scrollTrigger: { trigger: title, scroller: scrollerEl, start: 'top 88%', toggleActions: 'play none none none' },
            });
          },
        });
        gsap.from('[data-next-rule]', {
          scaleX: 0,
          duration: 1.4,
          ease: 'rust.inOut',
          scrollTrigger: { trigger: '[data-next-rule]', scroller: scrollerEl, start: 'top 90%' },
        });
        return () => split.revert();
      });
      return () => mm.revert();
    },
    { scope: rootRef, dependencies: [fontsReady, next.slug] },
  );

  const handleNext = (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
    e.preventDefault();
    onNext(next);
  };

  return (
    <section ref={rootRef} className={s.outro} data-overlay-content="">
      <div className={s.outroCta}>
        <SectionLabel tone="dark" scroller={scroller}>
          Your space
        </SectionLabel>
        <RevealText as="h2" className={`display ${s.outroTitle}`} scroller={scroller}>
          Planning a similar <em className="accent">space?</em>
        </RevealText>
        <RevealText as="p" className={s.outroText} scroller={scroller} delay={0.15}>
          Tell us about your home, workplace or hotel. We will call within 24 hours to arrange a site visit.
        </RevealText>
        <MagneticButton to="/book" size="lg">
          Book an Appointment
        </MagneticButton>
      </div>

      <span className={s.nextRule} data-next-rule="" aria-hidden="true" />

      <a href={`/project/${next.slug}`} className={s.next} onClick={handleNext} data-cursor="View">
        <span className={s.nextHead}>
          <span className="eyebrow">Next project</span>
          <span className={s.nextMeta}>
            {next.category} · {next.location}
          </span>
        </span>
        <span className="visually-hidden">{next.title}</span>
        <span ref={titleRef} className={s.nextTitle} data-split="" aria-hidden="true">
          {next.title}
        </span>
        <RevealImage
          as="div"
          className={s.nextImage}
          src={next.cover}
          alt={next.images[0]?.title || next.title}
          width={next.images[0]?.width}
          height={next.images[0]?.height}
          ratio="16 / 7"
          label={next.title}
          accent={next.accent}
          scroller={scroller}
          sizes="100vw"
          fallbackVariant="minimal"
        />
      </a>
    </section>
  );
}
