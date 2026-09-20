import { useEffect, useRef } from 'react';
import { getLenis } from '../lib/lenis';

/**
 * Returns the page Lenis instance and (optionally) subscribes to its scroll event.
 * The callback receives the Lenis instance ({ scroll, velocity, direction, progress }).
 */
export function useLenis(callback) {
  const cbRef = useRef(callback);
  useEffect(() => {
    cbRef.current = callback;
  });

  useEffect(() => {
    const lenis = getLenis();
    if (!lenis || !cbRef.current) return undefined;
    const handler = (instance) => cbRef.current?.(instance);
    lenis.on('scroll', handler);
    return () => lenis.off('scroll', handler);
  }, []);

  return getLenis();
}
