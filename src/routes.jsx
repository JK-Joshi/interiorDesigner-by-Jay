import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { matchPath, Route, Routes, useLocation, useNavigate } from 'react-router';
import { ScrollTrigger } from './lib/gsap';
import { scrollToTop } from './lib/lenis';
import Home from './pages/Home';
import PageTransition from './components/PageTransition/PageTransition';
import ProjectOverlay from './components/ProjectOverlay/ProjectOverlay';

/** React.lazy with a preload() that lets the transition swap pages without a suspense flash. */
function lazyPage(factory) {
  let Loaded = null;
  const load = () =>
    factory().then((mod) => {
      Loaded = mod.default;
      return mod;
    });
  const Lazy = lazy(load);
  function Page(props) {
    const [Component] = useState(() => Loaded || Lazy);
    return <Component {...props} />;
  }
  Page.preload = load;
  return Page;
}

const About = lazyPage(() => import('./pages/About'));
const Book = lazyPage(() => import('./pages/Book'));
const ProjectPage = lazyPage(() => import('./pages/ProjectPage'));
const NotFound = lazyPage(() => import('./pages/NotFound'));

const LABELS = {
  '/': 'The studio',
  '/about': 'About us',
  '/book': 'Book an appointment',
};

function labelFor(pathname) {
  if (pathname.startsWith('/project/')) return 'The project';
  return LABELS[pathname] || 'Rust Design Studio';
}

function preloadFor(pathname) {
  if (pathname === '/') return Promise.resolve();
  if (pathname === '/about') return About.preload();
  if (pathname === '/book') return Book.preload();
  if (matchPath('/project/:slug', pathname)) return ProjectPage.preload();
  return NotFound.preload();
}

function CommitSignal({ token, onCommit }) {
  useLayoutEffect(() => {
    onCommit(token);
  }, [token, onCommit]);
  return null;
}

function PageFallback() {
  return <div style={{ minHeight: '100svh', background: 'var(--ink)' }} aria-hidden="true" />;
}

/**
 * Router shell:
 *  • pages are rendered from a "display" location that only changes once the rust
 *    transition panel covers the screen (scroll reset + ScrollTrigger.refresh after swap);
 *  • /project/:slug opened from the canvas carries `state.backgroundLocation`, so Home keeps
 *    rendering underneath while <ProjectOverlay> is shown above it (and animates out on Back).
 */
export default function AppRoutes() {
  const location = useLocation();
  const navigate = useNavigate();
  const background = location.state?.backgroundLocation || null;
  const effective = background || location;

  const [display, setDisplay] = useState(effective);
  const transitionRef = useRef(null);
  const busy = useRef(false);
  const pending = useRef(null);
  const commitWaiter = useRef(null);
  const displayRef = useRef(display);
  displayRef.current = display;

  const onCommit = useCallback((token) => {
    if (commitWaiter.current && commitWaiter.current.token === token) {
      const { resolve } = commitWaiter.current;
      commitWaiter.current = null;
      resolve();
    }
  }, []);

  const runTransitions = useCallback(async () => {
    busy.current = true;
    while (pending.current) {
      const target = pending.current;
      pending.current = null;
      await Promise.all([
        transitionRef.current?.cover(labelFor(target.pathname)),
        preloadFor(target.pathname).catch(() => undefined),
      ]);
      const latest = pending.current || target;
      pending.current = null;
      scrollToTop(true);
      ScrollTrigger.clearScrollMemory?.();
      if (latest.key !== displayRef.current.key) {
        await new Promise((resolve) => {
          commitWaiter.current = { token: latest.key, resolve };
          setDisplay(latest);
        });
      }
      scrollToTop(true);
      ScrollTrigger.refresh();
      await transitionRef.current?.reveal();
      document.getElementById('main')?.focus({ preventScroll: true });
    }
    busy.current = false;
  }, []);

  useEffect(() => {
    const current = displayRef.current;
    if (effective.pathname === current.pathname) {
      if (!busy.current && (effective.key !== current.key || effective.hash !== current.hash)) {
        setDisplay(effective);
      }
      return;
    }
    pending.current = effective;
    if (!busy.current) runTransitions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effective.key, effective.pathname, effective.hash]);

  // ── Overlay presence (keeps the overlay mounted while it animates out) ─────
  const overlayMatch = background ? matchPath('/project/:slug', location.pathname) : null;
  const [overlay, setOverlay] = useState(() =>
    overlayMatch
      ? {
          id: location.key,
          slug: overlayMatch.params.slug,
          imageIndex: location.state?.imageIndex ?? 0,
          closing: false,
          instant: false,
          bgPath: background.pathname,
        }
      : null,
  );

  useLayoutEffect(() => {
    if (overlayMatch) {
      const slug = overlayMatch.params.slug;
      setOverlay((prev) =>
        prev && !prev.closing
          ? { ...prev, slug }
          : {
              id: location.key,
              slug,
              imageIndex: location.state?.imageIndex ?? 0,
              closing: false,
              instant: false,
              bgPath: background.pathname,
            },
      );
    } else {
      setOverlay((prev) =>
        prev && !prev.closing ? { ...prev, closing: true, instant: location.pathname !== prev.bgPath } : prev,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  const handleOverlayClosed = useCallback((id) => {
    setOverlay((prev) => (prev && prev.id === id ? null : prev));
  }, []);

  const requestOverlayClose = useCallback(() => {
    const idx = window.history.state?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate(overlay?.bgPath || '/', { replace: true });
  }, [navigate, overlay?.bgPath]);

  return (
    <>
      <Suspense fallback={<PageFallback />}>
        <Routes location={display} key={display.pathname}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/book" element={<Book />} />
          <Route path="/project/:slug" element={<ProjectPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <CommitSignal token={display.key} onCommit={onCommit} />
      </Suspense>

      {overlay ? (
        <ProjectOverlay
          key={overlay.id}
          slug={overlay.slug}
          imageIndex={overlay.imageIndex}
          closing={overlay.closing}
          instant={overlay.instant}
          onClosed={() => handleOverlayClosed(overlay.id)}
          onRequestClose={requestOverlayClose}
        />
      ) : null}

      <PageTransition ref={transitionRef} />
    </>
  );
}
