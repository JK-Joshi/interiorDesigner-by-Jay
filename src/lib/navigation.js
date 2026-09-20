import { heroState, PHASES } from '../three/heroState';
import { scrollToY } from './lenis';

/** Scroll position (px) at which the gallery is fully revealed and interactive. */
export function projectsScrollY() {
  const st = heroState.trigger;
  if (st) {
    const t = PHASES.curtainEnd + (1 - PHASES.curtainEnd) * 0.4;
    return st.start + (st.end - st.start) * t;
  }
  const el = document.getElementById('projects');
  if (!el) return 0;
  return el.getBoundingClientRect().top + window.scrollY;
}

/**
 * Smoothly (or instantly) brings the infinite canvas into view.
 * With `immediate` the scrubbed hero timeline is also jumped to its end state.
 */
export function scrollToProjects({ immediate = false } = {}) {
  const y = projectsScrollY();
  const distance = Math.abs(window.scrollY - y);
  const duration = Math.min(3.2, Math.max(1.2, distance / 1400));
  scrollToY(y, {
    immediate,
    duration,
    onComplete: () => {
      if (immediate) heroState.trigger?.getTween?.()?.progress(1);
    },
  });
}

export function projectHref(slug) {
  return `/project/${slug}`;
}
