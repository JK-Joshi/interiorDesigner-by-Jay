import { useCallback, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { gsap, Flip, useGSAP } from '../../lib/gsap';
import { getLenis } from '../../lib/lenis';
import { useAppState } from '../../lib/appState';
import { scrollToProjects } from '../../lib/navigation';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { navLinks } from '../../data/site';
import Monogram from '../ui/Monogram';
import s from './FloatingNav.module.css';

function activeKeyFor(pathname) {
  if (pathname === '/' || pathname.startsWith('/project')) return 'projects';
  if (pathname.startsWith('/about')) return 'about';
  if (pathname.startsWith('/book')) return 'book';
  return null;
}

/**
 * Glass pill navigation fixed at the bottom centre of every page.
 * Highlight pill slides between items (GSAP Flip), items are magnetic (quickTo),
 * and the bar compresses slightly while scrolling down fast.
 */
export default function FloatingNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const background = location.state?.backgroundLocation;
  const effectivePath = (background || location).pathname;
  const activeKey = background ? 'projects' : activeKeyFor(location.pathname);
  const introReady = useAppState((st) => st.introReady);
  const compact = useMediaQuery('(max-width: 639px)');

  const wrapRef = useRef(null);
  const barRef = useRef(null);
  const highlightRef = useRef(null);
  const itemRefs = useRef({});
  const highlightKey = useRef(null);
  const activeRef = useRef(activeKey);
  activeRef.current = activeKey;

  const { contextSafe } = useGSAP({ scope: wrapRef });

  const moveHighlight = useCallback(
    (key, instant = false) => {
      const hl = highlightRef.current;
      const target = key ? itemRefs.current[key] : null;
      if (!hl) return;
      if (!target) {
        highlightKey.current = null;
        gsap.to(hl, { autoAlpha: 0, duration: 0.3, ease: 'none', overwrite: 'auto' });
        return;
      }
      const wasHidden = highlightKey.current === null;
      highlightKey.current = key;
      const state = Flip.getState(hl);
      gsap.set(hl, {
        left: target.offsetLeft,
        top: target.offsetTop,
        width: target.offsetWidth,
        height: target.offsetHeight,
      });
      if (instant || wasHidden) {
        gsap.to(hl, { autoAlpha: 1, duration: 0.35, ease: 'none', overwrite: 'auto' });
        return;
      }
      Flip.from(state, { duration: 0.65, ease: 'rust.out', scale: false, simple: true });
    },
    [],
  );
  const safeMove = contextSafe((key, instant) => moveHighlight(key, instant));

  // Entrance after the preloader + magnetic items.
  useGSAP(
    () => {
      if (!introReady) return undefined;
      const mm = gsap.matchMedia();
      mm.add(
        { motion: '(prefers-reduced-motion: no-preference)', fine: '(hover: hover) and (pointer: fine)' },
        (ctx) => {
          const { motion, fine } = ctx.conditions;
          if (motion) {
            gsap.fromTo(
              barRef.current,
              { yPercent: 160, autoAlpha: 0 },
              { yPercent: 0, autoAlpha: 1, duration: 1.3, delay: 0.5, ease: 'rust.out' },
            );
            gsap.fromTo('[data-nav-item]', { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.9, stagger: 0.07, delay: 0.75, ease: 'rust.out' });
          } else {
            gsap.set(barRef.current, { autoAlpha: 1 });
          }

          const cleanups = [];
          if (fine && motion) {
            Object.values(itemRefs.current).forEach((el) => {
              if (!el) return;
              const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.5)' });
              const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.5)' });
              const move = (e) => {
                const r = el.getBoundingClientRect();
                const cx = r.left - gsap.getProperty(el, 'x') + r.width / 2;
                const cy = r.top - gsap.getProperty(el, 'y') + r.height / 2;
                xTo((e.clientX - cx) * 0.22);
                yTo((e.clientY - cy) * 0.3);
              };
              const leave = () => {
                xTo(0);
                yTo(0);
              };
              el.addEventListener('pointermove', move);
              el.addEventListener('pointerleave', leave);
              cleanups.push(() => {
                el.removeEventListener('pointermove', move);
                el.removeEventListener('pointerleave', leave);
              });
            });
          }
          const t = window.setTimeout(() => moveHighlight(activeRef.current, true), 900);
          return () => {
            window.clearTimeout(t);
            cleanups.forEach((fn) => fn());
          };
        },
      );
      return () => mm.revert();
    },
    { scope: wrapRef, dependencies: [introReady, compact], revertOnUpdate: true },
  );

  // Follow the active route.
  useEffect(() => {
    if (!introReady) return;
    safeMove(activeKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey, introReady, compact]);

  // Re-measure on resize.
  useEffect(() => {
    const onResize = () => moveHighlight(highlightKey.current ?? activeRef.current, true);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [moveHighlight]);

  // Compress while scrolling down fast, restore when scrolling up. Never hides.
  useEffect(() => {
    const bar = barRef.current;
    const lenis = getLenis();
    let compressed = false;
    let idleTimer = 0;
    const apply = (next) => {
      if (next === compressed) return;
      compressed = next;
      gsap.to(bar, { scale: next ? 0.9 : 1, y: next ? 6 : 0, duration: 0.6, ease: 'rust.out', overwrite: 'auto' });
    };
    const onScroll = ({ velocity, direction }) => {
      if (direction === 1 && Math.abs(velocity) > 6) apply(true);
      else if (direction === -1) apply(false);
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => apply(false), 1400);
    };
    lenis?.on('scroll', onScroll);
    return () => {
      window.clearTimeout(idleTimer);
      lenis?.off('scroll', onScroll);
    };
  }, []);

  const handleProjects = (e) => {
    e.preventDefault();
    if (background) {
      // Overlay is open above the gallery — closing it returns to the canvas.
      navigate(-1);
      return;
    }
    if (effectivePath === '/') scrollToProjects();
    else navigate('/', { state: { scrollTo: 'projects' } });
  };

  const setItemRef = (key) => (el) => {
    itemRefs.current[key] = el;
  };

  return (
    <div ref={wrapRef} className={s.wrap}>
      <nav ref={barRef} className={s.bar} aria-label="Primary">
        <span ref={highlightRef} className={s.highlight} aria-hidden="true" />
        <Link
          ref={setItemRef('home')}
          to="/"
          className={s.mono}
          aria-label="Rust Design Studio — home"
          data-nav-item=""
          onMouseEnter={() => safeMove('home')}
          onMouseLeave={() => safeMove(activeRef.current)}
          onFocus={() => safeMove('home')}
          onBlur={() => safeMove(activeRef.current)}
        >
          <Monogram className={s.monoSvg} />
        </Link>
        <ul className={s.list}>
          {navLinks.map((link) => {
            const label = compact ? link.short : link.label;
            const isActive = activeKey === link.key;
            const common = {
              ref: setItemRef(link.key),
              'data-nav-item': '',
              'aria-current': isActive ? 'page' : undefined,
              onMouseEnter: () => safeMove(link.key),
              onMouseLeave: () => safeMove(activeRef.current),
              onFocus: () => safeMove(link.key),
              onBlur: () => safeMove(activeRef.current),
            };
            if (link.key === 'projects') {
              return (
                <li key={link.key}>
                  <a href="/#projects" className={s.item} onClick={handleProjects} {...common}>
                    <span className={s.roll} data-text={label}>
                      <span>{label}</span>
                    </span>
                  </a>
                </li>
              );
            }
            const isCta = link.key === 'book';
            return (
              <li key={link.key}>
                <Link to={link.to} className={isCta ? `${s.item} ${s.cta}` : s.item} {...common}>
                  <span className={s.roll} data-text={label}>
                    <span>{label}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
