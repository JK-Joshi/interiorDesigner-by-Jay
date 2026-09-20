import { useSyncExternalStore } from 'react';
import { whenFontsReady, refreshScrollTriggers } from '../lib/gsap';

let ready = false;
const listeners = new Set();

if (typeof window !== 'undefined') {
  whenFontsReady().then(() => {
    ready = true;
    listeners.forEach((l) => l());
    // Text metrics changed → recalculate every trigger once.
    refreshScrollTriggers(100);
  });
}

/** true once web fonts have loaded (SplitText must wait for this). */
export function useFontsReady() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => ready,
    () => false,
  );
}
