import { useRef } from 'react';
import { gsap, useGSAP, MQ } from '../lib/gsap';
import { useAppState } from '../lib/appState';
import Seo from '../components/Seo/Seo';
import RevealText from '../components/ui/RevealText';
import MagneticButton from '../components/ui/MagneticButton';
import s from './NotFound.module.css';

/**
 * 404 — an empty room, sketched in pencil.
 */
export default function NotFound() {
  const rootRef = useRef(null);
  const introReady = useAppState((st) => st.introReady);

  useGSAP(
    () => {
      if (!introReady) return undefined;
      const mm = gsap.matchMedia();
      mm.add({ motion: MQ.motion, reduce: MQ.reduce }, (ctx) => {
        const paths = gsap.utils.toArray('[data-room] path, [data-room] line, [data-room] rect');
        if (ctx.conditions.reduce) {
          gsap.set(paths, { drawSVG: '100%' });
          return;
        }
        gsap
          .timeline({ delay: 0.3 })
          .fromTo(paths, { drawSVG: '0%' }, { drawSVG: '100%', duration: 1.2, stagger: 0.08, ease: 'rust.inOut' })
          .from('[data-lamp]', { rotate: -18, transformOrigin: '50% 0%', duration: 2.4, ease: 'elastic.out(1, 0.3)' }, 0.8)
          .fromTo('[data-nf-fade]', { y: 20, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1, stagger: 0.1 }, 0.6);
        gsap.to('[data-lamp]', {
          rotate: 3,
          transformOrigin: '50% 0%',
          duration: 2.6,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
          delay: 3.2,
        });
      });
      return () => mm.revert();
    },
    { scope: rootRef, dependencies: [introReady] },
  );

  return (
    <main id="main" tabIndex={-1} ref={rootRef} className={`page theme-dark ${s.page}`}>
      <Seo title="Page not found" description="This room hasn’t been designed yet." path="/404" noindex />
      <div className={`container ${s.inner}`}>
        <svg className={s.room} viewBox="0 0 420 300" aria-hidden="true" data-room="">
          <path d="M40 260 L120 200 L300 200 L380 260" />
          <path d="M120 200 L120 40 L300 40 L300 200" />
          <path d="M40 260 L40 20 L120 40 M380 260 L380 20 L300 40" />
          <rect x="160" y="90" width="70" height="80" />
          <line x1="195" y1="90" x2="195" y2="170" />
          <line x1="160" y1="130" x2="230" y2="130" />
          <path d="M60 240 L100 212" strokeDasharray="4 6" />
          <g data-lamp="">
            <line x1="250" y1="40" x2="250" y2="92" />
            <path d="M232 108 L250 92 L268 108 Z" />
          </g>
        </svg>
        <p className={s.code} data-nf-fade="">
          404
        </p>
        <RevealText as="h1" className={`display ${s.title}`} immediate play={introReady} delay={0.4}>
          This room hasn’t been <em className="accent">designed yet</em>
        </RevealText>
        <p className={s.text} data-nf-fade="">
          The page you were looking for doesn’t exist — but plenty of finished spaces do.
        </p>
        <div className={s.actions} data-nf-fade="">
          <MagneticButton to="/">Back to the studio</MagneticButton>
          <MagneticButton to="/" state={{ scrollTo: 'projects' }} variant="outline">
            See projects
          </MagneticButton>
        </div>
      </div>
    </main>
  );
}
