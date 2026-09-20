import { useEffect } from 'react';
import { refreshScrollTriggers } from '../lib/gsap';

const withTimeout = (promise, ms) => Promise.race([promise, new Promise((resolve) => setTimeout(resolve, ms))]);

/**
 * Pinned sections measure their content once. When the images inside finish
 * decoding we refresh ScrollTrigger so pin distances stay exact.
 */
export function useRefreshOnDecode(ref, dependencies = []) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return undefined;
    let cancelled = false;
    const images = Array.from(root.querySelectorAll('img'));
    if (!images.length) return undefined;
    Promise.allSettled(
      images.map((img) =>
        img.complete ? Promise.resolve() : withTimeout(img.decode?.() ?? Promise.resolve(), 4000),
      ),
    ).then(() => {
      if (!cancelled) refreshScrollTriggers(120);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
}
