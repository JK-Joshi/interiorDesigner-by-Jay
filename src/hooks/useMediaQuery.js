import { useCallback, useSyncExternalStore } from 'react';

/** Subscribes to a CSS media query without extra renders. */
export function useMediaQuery(query, serverFallback = false) {
  const subscribe = useCallback(
    (callback) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', callback);
      return () => mql.removeEventListener('change', callback);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => serverFallback,
  );
}

export const useIsMobile = () => useMediaQuery('(max-width: 767px)');
export const useIsTouch = () => useMediaQuery('(hover: none), (pointer: coarse)');
export const useFinePointer = () => useMediaQuery('(hover: hover) and (pointer: fine)');
