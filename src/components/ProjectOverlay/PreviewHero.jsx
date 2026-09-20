import { useRef } from 'react';
import { gsap, Flip, SplitText, splitAria, useGSAP, MQ } from '../../lib/gsap';
import { flipStore } from '../../lib/flipStore';
import { formatINR, pad2 } from '../../lib/content';
import { CountUp } from '../../lib/figures';
import { projects } from '../../data/projects';
import { useFontsReady } from '../../hooks/useFontsReady';
import ImageWithFallback from '../ui/ImageWithFallback';
import s from './ProjectOverlay.module.css';

/**
 * 100vh preview: the clicked image full-bleed (Flip from the tile), Ken Burns,
 * a char-by-char title, italic subtitle, meta row and summary.
 */
export default function PreviewHero({ project, image, flip, scroller, play = true, standalone = false }) {
  const TitleTag = standalone ? 'h1' : 'h2';
  const rootRef = useRef(null);
  const mediaRef = useRef(null);
  const kenRef = useRef(null);
  const titleRef = useRef(null);
  const fontsReady = useFontsReady();
  const index = projects.findIndex((p) => p.slug === project.slug);

  const meta = [
    { label: 'Location', value: project.location },
    { label: 'Area', value: project.area, suffix: ' sq ft', count: true },
    { label: 'Year', value: project.year, count: true, raw: true },
    { label: 'Type', value: project.type },
    { label: 'Duration', value: project.duration },
  ];

  useGSAP(
    () => {
      if (!play || !fontsReady) return undefined;
      const media = mediaRef.current;
      const scrollerEl = scroller?.current || undefined;
      const mm = gsap.matchMedia();

      mm.add({ motion: MQ.motion, reduce: MQ.reduce }, (ctx) => {
        const title = titleRef.current;
        if (ctx.conditions.reduce) {
          title.classList.add('is-split');
          gsap.fromTo('[data-hero-fade]', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, stagger: 0.05, ease: 'none' });
          if (flip) flipStore.hideSource();
          return undefined;
        }

        const tl = gsap.timeline();

        // 1 — the image
        if (flip) {
          media.setAttribute('data-flip-id', flip.flipId);
          flipStore.hideSource();
          tl.add(
            Flip.from(flip.state, {
              targets: media,
              duration: 1.25,
              ease: 'rust.inOut',
              scale: false,
              absolute: true,
              props: 'borderRadius',
            }),
            0,
          );
          tl.fromTo('[data-hero-scrim]', { autoAlpha: 0 }, { autoAlpha: 1, duration: 1, ease: 'none' }, 0.6);
        } else {
          tl.fromTo(
            media,
            { clipPath: 'inset(100% 0% 0% 0%)' },
            { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5, ease: 'rust.inOut' },
            0,
          ).fromTo('[data-hero-scrim]', { autoAlpha: 0 }, { autoAlpha: 1, duration: 1, ease: 'none' }, 0.4);
        }
        tl.fromTo(
          kenRef.current,
          { scale: flip ? 1 : 1.3, filter: 'brightness(0.7)' },
          { scale: 1.04, filter: 'brightness(1)', duration: 2, ease: 'rust.out', clearProps: 'filter' },
          0,
        );
        // Ken Burns — slow continuous zoom.
        tl.to(kenRef.current, { scale: 1.16, xPercent: -2, duration: 18, ease: 'none', repeat: -1, yoyo: true }, 2);

        // 2 — the title, char by char with rotateX
        const split = SplitText.create(title, {
          aria: splitAria(title),
          type: 'chars,words',
          mask: 'words',
          charsClass: 'split-char',
          onSplit(self) {
            title.classList.add('is-split');
            return gsap.from(self.chars, {
              yPercent: 120,
              rotateX: -80,
              transformOrigin: '50% 100% -20px',
              duration: 1.2,
              stagger: 0.028,
              ease: 'rust.out',
              delay: flip ? 0.75 : 0.55,
            });
          },
          autoSplit: true,
        });

        // 3 — supporting copy
        tl.from('[data-hero-line]', { yPercent: 110, duration: 1, stagger: 0.08, ease: 'rust.out' }, flip ? 1.05 : 0.85)
          .fromTo('[data-hero-rule]', { '--rule': 0 }, { '--rule': 1, duration: 1.1, stagger: 0.06, ease: 'rust.inOut' }, '<0.1')
          .fromTo('[data-hero-fade]', { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.06, ease: 'rust.out' }, '<0.1');

        // Counting meta values.
        gsap.utils.toArray('[data-count]', rootRef.current).forEach((el) => {
          const end = Number(el.dataset.count);
          const raw = el.dataset.raw === '1';
          const counter = { v: raw ? end - 24 : 0 };
          tl.to(
            counter,
            {
              v: end,
              duration: 1.6,
              ease: 'rust.out',
              snap: { v: 1 },
              onUpdate: () => {
                el.textContent = raw ? String(counter.v) : formatINR(counter.v);
              },
            },
            flip ? 1.1 : 0.9,
          );
        });

        // Parallax out as the walkthrough approaches.
        gsap.to('[data-hero-content]', {
          yPercent: -18,
          autoAlpha: 0.2,
          ease: 'none',
          scrollTrigger: { trigger: rootRef.current, scroller: scrollerEl, start: 'top top', end: 'bottom top', scrub: true },
        });

        return () => split.revert();
      });
      return () => mm.revert();
    },
    { scope: rootRef, dependencies: [play, fontsReady] },
  );

  return (
    <section ref={rootRef} className={s.hero} aria-labelledby={`title-${project.slug}`}>
      <div ref={mediaRef} className={s.heroMedia} data-hero-media="">
        <div ref={kenRef} className={s.heroKen}>
          <ImageWithFallback
            src={image.src}
            alt={image.title}
            width={image.width}
            height={image.height}
            sizes="100vw"
            priority
            label={project.title}
            accent={project.accent}
            fallbackVariant="minimal"
          />
        </div>
        <div className={s.heroScrim} data-hero-scrim="" aria-hidden="true" />
      </div>

      <div className={s.heroContent} data-hero-content="" data-overlay-content="">
        {standalone ? (
          <p className={s.heroIndex} data-hero-fade="">
            ({pad2(index + 1)} / {pad2(projects.length)}) · {project.category}
          </p>
        ) : null}
        <TitleTag id={`title-${project.slug}`} ref={titleRef} className={s.heroTitle} data-split="">
          {project.title}
        </TitleTag>
        <p className={s.lineMask}>
          <span className={s.heroSubtitle} data-hero-line="">
            {project.subtitle}
          </span>
        </p>

        <dl className={s.meta}>
          {meta.map((m, i) => (
            <div key={m.label} className={s.metaItem} data-hero-rule={i > 0 ? '' : undefined}>
              <dt className={s.lineMask}>
                <span className={s.metaLabel} data-hero-line="">
                  {m.label}
                </span>
              </dt>
              <dd className={s.lineMask}>
                <span className={s.metaValue} data-hero-line="">
                  {m.count ? (
                    <>
                      <CountUp final={m.raw ? m.value : formatINR(m.value)} data-count={m.value} data-raw={m.raw ? '1' : '0'} />
                      {m.suffix || ''}
                    </>
                  ) : (
                    m.value
                  )}
                </span>
              </dd>
            </div>
          ))}
        </dl>

        <div className={s.heroFoot}>
          <p className={s.summary} data-hero-fade="">
            {project.summary}
          </p>
          <p className={s.cue} data-hero-fade="">
            <span>Scroll to walk through</span>
            <span className={s.cueArrow} aria-hidden="true">
              →
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
