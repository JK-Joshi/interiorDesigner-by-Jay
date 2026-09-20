import { useRef } from 'react';
import { gsap, useGSAP, MQ } from '../lib/gsap';
import { pad2 } from '../lib/content';
import { Figures, setFigures } from '../lib/figures';
import { useAppState } from '../lib/appState';
import { site } from '../data/site';
import { useRefreshOnDecode } from '../hooks/useRefreshOnDecode';
import Seo from '../components/Seo/Seo';
import RevealText from '../components/ui/RevealText';
import RevealImage from '../components/ui/RevealImage';
import SectionLabel from '../components/ui/SectionLabel';
import ImageWithFallback from '../components/ui/ImageWithFallback';
import { MarqueeRow } from '../components/sections/Marquee/Marquee';
import CTA from '../components/sections/CTA/CTA';
import Footer from '../components/sections/Footer/Footer';
import s from './About.module.css';

/* ── Hero ───────────────────────────────────────────────────────────────── */
function AboutHero() {
  const ref = useRef(null);
  const introReady = useAppState((st) => st.introReady);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MQ.motion, () => {
        if (!introReady) {
          gsap.set('[data-hero-meta] > *', { autoAlpha: 0 });
          return;
        }
        gsap.fromTo('[data-hero-meta] > *', { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.1, stagger: 0.1, delay: 0.6 });
        gsap.to('[data-hero-img]', {
          yPercent: -12,
          ease: 'none',
          scrollTrigger: { trigger: ref.current, start: 'top top', end: 'bottom top', scrub: true },
        });
      });
      return () => mm.revert();
    },
    { scope: ref, dependencies: [introReady], revertOnUpdate: true },
  );
  return (
    <section ref={ref} className={`theme-dark ${s.hero}`} aria-labelledby="about-title">
      <div className={`container ${s.heroGrid}`}>
        <div className={s.heroText}>
          <RevealText as="p" className="eyebrow" immediate play={introReady} delay={0.2}>
            Est. {site.foundedYear} · {site.city}, {site.region}
          </RevealText>
          <RevealText as="h1" id="about-title" className={`display ${s.heroTitle}`} immediate play={introReady} delay={0.3}>
            A decade of designing <em className="accent">with intent</em>
          </RevealText>
          <div className={s.heroMeta} data-hero-meta="">
            <p className="lead">
              We are architects, interior designers and makers who believe a room should feel inevitable.
            </p>
            <p className={s.heroBody}>
              For {site.experience} Rust Design Studio has designed homes, workplaces, cafés and hotels across Gujarat —
              always starting with a conversation and a pencil.
            </p>
          </div>
        </div>
        <div className={s.heroImageWrap} data-hero-img="">
          <RevealImage
            src={site.about.heroImage}
            alt="The Rust Design Studio drafting room in Rajkot"
            width={1200}
            height={1600}
            ratio="3 / 4"
            priority
            trigger={false}
            play={introReady}
            delay={0.35}
            label="The Studio"
            className={s.heroImage}
            sizes="(max-width: 767px) 90vw, 40vw"
          />
        </div>
      </div>
    </section>
  );
}

/* ── Story with a sticky, swapping image stack ─────────────────────────── */
function Story() {
  const ref = useRef(null);
  useGSAP(
    () => {
      const images = gsap.utils.toArray('[data-story-img]');
      const blocks = gsap.utils.toArray('[data-story-block]');
      const counter = ref.current.querySelector('[data-story-count]');
      const mm = gsap.matchMedia();
      mm.add({ motion: MQ.motion, reduce: MQ.reduce }, (ctx) => {
        gsap.set(images, { clipPath: (i) => (i === 0 ? 'inset(0% 0% 0% 0%)' : 'inset(100% 0% 0% 0%)'), zIndex: (i) => i + 1 });
        let active = 0;
        const activate = (i) => {
          if (i === active) return;
          const forward = i > active;
          active = i;
          setFigures(counter, pad2(i + 1));
          images.forEach((img, k) => {
            if (k <= i) {
              gsap.to(img, {
                clipPath: 'inset(0% 0% 0% 0%)',
                duration: ctx.conditions.reduce ? 0 : 1.1,
                ease: 'rust.inOut',
                overwrite: true,
              });
              if (k === i && forward && !ctx.conditions.reduce) {
                gsap.fromTo(img.querySelector('img, [role="img"]'), { scale: 1.25 }, { scale: 1, duration: 1.4, ease: 'rust.out' });
              }
            } else {
              gsap.to(img, {
                clipPath: 'inset(100% 0% 0% 0%)',
                duration: ctx.conditions.reduce ? 0 : 0.9,
                ease: 'rust.inOut',
                overwrite: true,
              });
            }
          });
        };
        blocks.forEach((block, i) => {
          gsap.fromTo(block.querySelectorAll('[data-rise]'), { y: 40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: ctx.conditions.reduce ? 0.3 : 1.1, stagger: 0.08, scrollTrigger: { trigger: block, start: 'top 75%' } });
          gsap.timeline({
            scrollTrigger: {
              trigger: block,
              start: 'top 55%',
              end: 'bottom 55%',
              onToggle: (self) => self.isActive && activate(i),
            },
          });
        });
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <section ref={ref} className={`section theme-light ${s.story}`} aria-labelledby="story-title">
      <div className={`container ${s.storyGrid}`}>
        <div className={s.stickyCol}>
          <div className={s.sticky}>
            <div className={s.stack}>
              {site.story.map((item) => (
                <div key={item.image} className={s.stackItem} data-story-img="">
                  <ImageWithFallback src={item.image} alt={item.title} width={1200} height={1500} label={item.eyebrow} sizes="(max-width: 900px) 90vw, 40vw" />
                </div>
              ))}
            </div>
            <p className={s.stackCount} aria-hidden="true">
              <Figures data-story-count="">01</Figures> / <Figures>{pad2(site.story.length)}</Figures>
            </p>
          </div>
        </div>
        <div className={s.storyText}>
          <SectionLabel index={1} tone="light">
            Our story
          </SectionLabel>
          <h2 id="story-title" className="visually-hidden">
            Our story
          </h2>
          {site.story.map((item, i) => (
            <article key={item.title} className={s.storyBlock} data-story-block="">
              <p className={s.storyEyebrow} data-rise="">
                ({pad2(i + 1)}) {item.eyebrow}
              </p>
              <h3 className={s.storyTitle} data-rise="">
                {item.title}
              </h3>
              <p className={s.storyBody} data-rise="">
                {item.text}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Philosophy: three pillars with line-drawn icons ───────────────────── */
const ICONS = {
  material: (
    <>
      <path d="M12 44 L40 30 L68 44 L40 58 Z" />
      <path d="M12 44 V52 L40 66 L68 52 V44" />
      <path d="M12 32 L40 18 L68 32 L40 46 Z" />
      <path d="M22 36 L40 27 M30 40 L50 30 M40 46 L58 37" />
    </>
  ),
  light: (
    <>
      <path d="M16 66 V30 A24 24 0 0 1 64 30 V66 Z" />
      <path d="M40 6 V66 M16 34 H64" />
      <path d="M4 74 L28 50 M20 74 L44 50 M36 74 L60 50" />
    </>
  ),
  proportion: (
    <>
      <rect x="8" y="16" width="64" height="40" />
      <path d="M48 16 V56 M48 40 H72" />
      <path d="M48 56 A40 40 0 0 1 8 16 M72 40 A24 24 0 0 0 48 16" />
    </>
  ),
};

function Philosophy() {
  const ref = useRef(null);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add({ motion: MQ.motion, reduce: MQ.reduce }, (ctx) => {
        gsap.utils.toArray('[data-pillar]').forEach((pillar, i) => {
          const paths = pillar.querySelectorAll('path, rect');
          if (ctx.conditions.reduce) {
            gsap.set(paths, { drawSVG: '100%' });
            return;
          }
          const tl = gsap.timeline({ scrollTrigger: { trigger: pillar, start: 'top 80%' }, delay: i * 0.12 });
          tl.fromTo(paths, { drawSVG: '0%' }, { drawSVG: '100%', duration: 1.4, stagger: 0.15, ease: 'rust.inOut' })
            .from(pillar.querySelector('[data-pillar-rule]'), { scaleX: 0, duration: 1.2, ease: 'rust.inOut' }, 0.2)
            .fromTo(pillar.querySelectorAll('[data-rise]'), { yPercent: 60, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 1, stagger: 0.08 }, 0.35);
        });
      });
      return () => mm.revert();
    },
    { scope: ref },
  );
  return (
    <section ref={ref} className={`section theme-dark ${s.philosophy}`} aria-labelledby="philosophy-title">
      <div className="container">
        <SectionLabel index={2}>Philosophy</SectionLabel>
        <RevealText as="h2" id="philosophy-title" className={`display ${s.sectionTitle}`}>
          Three things we <em className="accent">never compromise</em>
        </RevealText>
        <div className={s.pillars}>
          {site.philosophy.map((p, i) => (
            <article key={p.key} className={s.pillar} data-pillar="">
              <svg className={s.icon} viewBox="0 0 80 80" aria-hidden="true">
                {ICONS[p.key]}
              </svg>
              <span className={s.pillarRule} data-pillar-rule="" aria-hidden="true" />
              <p className={s.pillarNum} data-rise="">
                ({pad2(i + 1)})
              </p>
              <h3 className={s.pillarTitle} data-rise="">
                {p.title}
              </h3>
              <p className={s.pillarText} data-rise="">
                {p.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Principal designer ───────────────────────────────────────────────── */
function Principal() {
  const ref = useRef(null);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MQ.motion, () => {
        gsap.fromTo(
          '[data-quote-block]',
          { yPercent: 18 },
          { yPercent: -18, ease: 'none', scrollTrigger: { trigger: ref.current, start: 'top bottom', end: 'bottom top', scrub: true } },
        );
      });
      return () => mm.revert();
    },
    { scope: ref },
  );
  return (
    <section ref={ref} className={`section theme-bone ${s.principal}`} aria-labelledby="principal-title">
      <div className={`container ${s.principalGrid}`}>
        <RevealImage
          src={site.founder.portrait}
          alt={`Portrait of ${site.founder.name}`}
          width={1200}
          height={1600}
          ratio="4 / 5"
          label={site.founder.name}
          className={s.portrait}
          sizes="(max-width: 900px) 90vw, 45vw"
          parallaxAmount={10}
        />
        <div className={s.principalText}>
          <SectionLabel index={3} tone="light">
            Principal designer
          </SectionLabel>
          <div className={s.quoteBlock} data-quote-block="">
            <span className={s.quoteMark} aria-hidden="true">
              “
            </span>
            <RevealText as="blockquote" className={s.quote}>
              {site.founder.quote}
            </RevealText>
          </div>
          <RevealText as="h2" id="principal-title" className={s.founderName}>
            {site.founder.name}
          </RevealText>
          <RevealText as="p" className={s.founderRole} delay={0.1}>
            {site.founder.title}
          </RevealText>
          {site.founder.bio.map((para, i) => (
            <RevealText key={para} as="p" className={s.bio} delay={0.15 + i * 0.05}>
              {para}
            </RevealText>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Journey: pinned horizontal timeline ───────────────────────────────── */
function Journey() {
  const ref = useRef(null);
  const trackRef = useRef(null);
  useRefreshOnDecode(ref);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(
        { desktop: `(min-width: 900px) and ${MQ.motion}`, other: `(max-width: 899px), ${MQ.reduce}` },
        (ctx) => {
          const cards = gsap.utils.toArray('[data-milestone]');
          if (!ctx.conditions.desktop) {
            const reduce = window.matchMedia(MQ.reduce).matches;
            cards.forEach((card) => {
              gsap.fromTo(card, { y: reduce ? 0 : 40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: reduce ? 0.5 : 1, scrollTrigger: { trigger: card, start: 'top 85%' } });
            });
            return;
          }
          const track = trackRef.current;
          const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
          const tween = gsap.to(track, {
            x: () => -distance(),
            ease: 'none',
            scrollTrigger: {
              trigger: '[data-journey-pin]',
              start: 'top top',
              end: () => `+=${distance()}`,
              pin: true,
              scrub: 1,
              invalidateOnRefresh: true,
            },
          });
          gsap.fromTo('[data-journey-line]', { scaleX: 0 }, {
            scaleX: 1,
            ease: 'none',
            scrollTrigger: { trigger: '[data-journey-pin]', start: 'top top', end: () => `+=${distance()}`, scrub: 1 },
          });
          cards.forEach((card) => {
            gsap.fromTo(card.querySelectorAll('[data-rise]'), { yPercent: 80, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 1, stagger: 0.08, scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left 85%' } });
            gsap.from(card.querySelector('[data-node]'), {
              scale: 0,
              duration: 0.8,
              ease: 'back.out(3)',
              scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left 80%' },
            });
          });
        },
      );
      return () => mm.revert();
    },
    { scope: ref },
  );
  return (
    <section ref={ref} className={`theme-dark ${s.journey}`} aria-labelledby="journey-title">
      <div className={s.journeyPin} data-journey-pin="">
        <div className={`container ${s.journeyHead}`}>
          <SectionLabel index={4}>Journey</SectionLabel>
          <RevealText as="h2" id="journey-title" className={`display ${s.sectionTitle}`}>
            From one table <em className="accent">to a studio</em>
          </RevealText>
        </div>
        <div className={s.journeyViewport}>
          <div ref={trackRef} className={s.journeyTrack}>
            <span className={s.journeyLine} data-journey-line="" aria-hidden="true" />
            <ol className={s.milestones}>
              {site.timeline.map((m) => (
                <li key={m.year} className={s.milestone} data-milestone="">
                  <span className={s.node} data-node="" aria-hidden="true" />
                  <p className={s.year} data-rise="">
                    {m.year}
                  </p>
                  <h3 className={s.milestoneTitle} data-rise="">
                    {m.title}
                  </h3>
                  <p className={s.milestoneText} data-rise="">
                    {m.text}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Team with hover image swap ───────────────────────────────────────── */
function Team() {
  const ref = useRef(null);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MQ.motion, () => {
        gsap.fromTo('[data-member]', { y: 60, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.1, stagger: { each: 0.08, grid: 'auto' }, scrollTrigger: { trigger: '[data-team-grid]', start: 'top 80%' } });
      });
      return () => mm.revert();
    },
    { scope: ref },
  );
  return (
    <section ref={ref} className={`section theme-light ${s.team}`} aria-labelledby="team-title">
      <div className="container">
        <SectionLabel index={5} tone="light">
          The team
        </SectionLabel>
        <RevealText as="h2" id="team-title" className={`display ${s.sectionTitle}`}>
          The people <em className="accent">behind the pencil</em>
        </RevealText>
        <ul className={s.teamGrid} data-team-grid="">
          {site.team.map((member) => (
            <li key={member.name + member.role} className={s.member} data-member="">
              <div className={s.memberMedia}>
                <div className={s.memberImg}>
                  <ImageWithFallback src={member.image} alt={`${member.name}, ${member.role}`} width={900} height={1125} label={member.role} sizes="(max-width: 767px) 45vw, 22vw" />
                </div>
                <div className={`${s.memberImg} ${s.memberAlt}`} aria-hidden="true">
                  <ImageWithFallback src={member.imageAlt} alt="" width={900} height={1125} label={member.name} sizes="(max-width: 767px) 45vw, 22vw" />
                </div>
              </div>
              <h3 className={s.memberName}>{member.name}</h3>
              <p className={s.memberRole}>{member.role}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ── Recognition strip ────────────────────────────────────────────────── */
function Press() {
  return (
    <section className={`theme-bone ${s.press}`} aria-label="Recognition and press">
      <div className="container">
        <p className={`eyebrow ${s.pressLabel}`}>Recognition & press</p>
      </div>
      <MarqueeRow items={site.press} speed={40} separator="✦" className={s.pressRow} />
    </section>
  );
}

/* ── Studio gallery: three rows at different speeds ───────────────────── */
function StudioGallery() {
  const ref = useRef(null);
  const rows = [site.about.gallery.slice(0, 3), site.about.gallery.slice(3, 6), site.about.gallery.slice(6, 9)];
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MQ.motion, () => {
        gsap.utils.toArray('[data-gallery-row]').forEach((row, i) => {
          const amount = [-14, 10, -22][i];
          gsap.fromTo(
            row,
            { xPercent: -amount / 2 },
            {
              xPercent: amount / 2,
              ease: 'none',
              scrollTrigger: { trigger: ref.current, start: 'top bottom', end: 'bottom top', scrub: true },
            },
          );
        });
        gsap.from('[data-gallery-item]', {
          clipPath: 'inset(100% 0% 0% 0%)',
          duration: 1.3,
          stagger: 0.06,
          ease: 'rust.inOut',
          scrollTrigger: { trigger: ref.current, start: 'top 75%' },
        });
      });
      return () => mm.revert();
    },
    { scope: ref },
  );
  return (
    <section ref={ref} className={`section theme-dark ${s.gallery}`} aria-labelledby="gallery-title">
      <div className="container">
        <SectionLabel index={6}>Inside the studio</SectionLabel>
        <RevealText as="h2" id="gallery-title" className={`display ${s.sectionTitle}`}>
          Where the <em className="accent">sketches live</em>
        </RevealText>
      </div>
      <div className={s.galleryRows}>
        {rows.map((row, r) => (
          <div key={r} className={s.galleryRow} data-gallery-row="">
            {[...row, ...row].map((src, i) => (
              <div key={`${src}-${i}`} className={`${s.galleryItem} ${s[`w${(i + r) % 3}`]}`} data-gallery-item="">
                <ImageWithFallback src={src} alt={i < row.length ? `Studio detail ${r * 3 + i + 1}` : ''} width={1400} height={1000} label="Studio" sizes="(max-width: 767px) 70vw, 30vw" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

export default function About() {
  return (
    <>
      <main id="main" tabIndex={-1} className="page">
        <Seo
          title="About Us"
          description="Meet Rust Design Studio — a Rajkot interior design practice with 12+ years of material-first residential, commercial and hospitality work."
          path="/about"
        />
        <AboutHero />
        <Story />
        <Philosophy />
        <Principal />
        <Journey />
        <Team />
        <Press />
        <StudioGallery />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
