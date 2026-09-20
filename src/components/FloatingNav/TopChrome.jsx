import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { gsap, useGSAP } from '../../lib/gsap';
import { useAppState } from '../../lib/appState';
import { site } from '../../data/site';
import s from './TopChrome.module.css';

/**
 * Fixed top-left wordmark and top-right live local time (IST).
 * Uses mix-blend-mode: difference so it stays legible on dark and light sections.
 */
export default function TopChrome() {
  const rootRef = useRef(null);
  const hoursRef = useRef(null);
  const minutesRef = useRef(null);
  const introReady = useAppState((st) => st.introReady);
  const overlayOpen = useAppState((st) => st.overlayOpen);
  const exploreOpen = useAppState((st) => st.exploreOpen);

  useEffect(() => {
    const fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: site.timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const update = () => {
      const parts = fmt.formatToParts(new Date());
      const h = parts.find((p) => p.type === 'hour')?.value ?? '00';
      const m = parts.find((p) => p.type === 'minute')?.value ?? '00';
      if (hoursRef.current) hoursRef.current.textContent = h;
      if (minutesRef.current) minutesRef.current.textContent = m;
    };
    update();
    const id = window.setInterval(update, 10000);
    return () => window.clearInterval(id);
  }, []);

  // Pick a legible colour for whatever section is currently under the bar.
  useEffect(() => {
    const root = rootRef.current;
    let raf = 0;
    let current = '';
    const luminance = (rgb) => {
      const [r, g, b] = rgb.map((v) => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const themeAt = (x, y) => {
      const stack = document.elementsFromPoint(x, y);
      for (const start of stack) {
        if (root.contains(start)) continue;
        let el = start;
        while (el && el !== document.documentElement) {
          const bg = getComputedStyle(el).backgroundColor;
          const m = bg.match(/rgba?\(([^)]+)\)/);
          if (m) {
            const parts = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
            const alpha = parts.length > 3 ? parts[3] : 1;
            if (alpha > 0.5) return luminance(parts.slice(0, 3)) > 0.45 ? 'light' : 'dark';
          }
          el = el.parentElement;
        }
        return 'dark';
      }
      return 'dark';
    };
    const check = () => {
      raf = 0;
      const theme = themeAt(window.innerWidth * 0.5, 44);
      if (theme !== current) {
        current = theme;
        root.dataset.theme = theme;
      }
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    const id = window.setInterval(schedule, 700);
    check();
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(id);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, []);

  useGSAP(
    () => {
      if (!introReady) return;
      const mm = gsap.matchMedia();
      mm.add({ motion: '(prefers-reduced-motion: no-preference)' }, (ctx) => {
        if (!ctx.conditions.motion) {
          gsap.set('[data-chrome]', { autoAlpha: 1 });
          return;
        }
        gsap.fromTo(
          '[data-chrome-inner]',
          { yPercent: -120 },
          { yPercent: 0, duration: 1.2, delay: 0.35, stagger: 0.1, ease: 'rust.out' },
        );
        gsap.set('[data-chrome]', { autoAlpha: 1 });
      });
      return () => mm.revert();
    },
    { scope: rootRef, dependencies: [introReady] },
  );

  useGSAP(
    () => {
      gsap.to(rootRef.current, {
        autoAlpha: overlayOpen || exploreOpen ? 0 : 1,
        duration: 0.5,
        ease: 'none',
        overwrite: 'auto',
      });
    },
    { scope: rootRef, dependencies: [overlayOpen, exploreOpen] },
  );

  return (
    <div ref={rootRef} className={s.chrome} data-theme="dark">
      <div className={s.mask} data-chrome="">
        <Link to="/" className={s.wordmark} data-chrome-inner="">
          <span className={s.brand}>{site.name}</span>
          <span className={s.dash} aria-hidden="true">
            —
          </span>
          <span className={s.city}>{site.city}</span>
        </Link>
      </div>
      <div className={s.mask} data-chrome="">
        <p className={s.time} data-chrome-inner="">
          <span className={s.city}>{site.city}, IST</span>{' '}
          <span className="visually-hidden">Local time </span>
          <time className={s.clock}>
            <span ref={hoursRef}>00</span>
            <span className={s.colon} aria-hidden="true">
              :
            </span>
            <span ref={minutesRef}>00</span>
          </time>
        </p>
      </div>
    </div>
  );
}
