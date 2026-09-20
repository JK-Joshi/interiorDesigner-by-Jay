/**
 * Tiny global store for cross-cutting UI state (no React context re-render storms).
 * Components subscribe to single primitive slices with useAppState(selector).
 */
import { useSyncExternalStore } from 'react';

const PRELOADER_KEY = 'rust:preloaded';

function hasSeenPreloader() {
  try {
    return sessionStorage.getItem(PRELOADER_KEY) === '1';
  } catch {
    return false;
  }
}

let state = {
  /** Preloader has fully exited (or was skipped). */
  introReady: typeof window !== 'undefined' && hasSeenPreloader(),
  /** Whether the preloader should run for this session. */
  showPreloader: typeof window !== 'undefined' && !hasSeenPreloader(),
  /** Project overlay is mounted above the page. */
  overlayOpen: false,
  /** A page transition is covering the screen. */
  transitioning: false,
  /** Home gallery is interactive (hero curtain lifted). */
  galleryActive: false,
  /** Fullscreen explore mode (touch) is open. */
  exploreOpen: false,
};

const listeners = new Set();

export const appStore = {
  get: () => state,
  set(patch) {
    const next = { ...state, ...patch };
    const changed = Object.keys(patch).some((k) => next[k] !== state[k]);
    if (!changed) return;
    state = next;
    listeners.forEach((l) => l());
  },
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function useAppState(selector) {
  return useSyncExternalStore(
    appStore.subscribe,
    () => selector(appStore.get()),
    () => selector(appStore.get()),
  );
}

/** Called mid-exit: page intros may start while the preloader panels part. */
export function markIntroReady() {
  try {
    sessionStorage.setItem(PRELOADER_KEY, '1');
  } catch {
    /* private mode — preloader will simply show again next visit */
  }
  appStore.set({ introReady: true });
}

/** Called when the preloader's exit animation has finished (unmounts it). */
export function finishPreloader() {
  appStore.set({ introReady: true, showPreloader: false });
}

/** Resolves once the preloader has handed off (immediately if it was skipped). */
export function whenIntroReady() {
  if (appStore.get().introReady) return Promise.resolve();
  return new Promise((resolve) => {
    const unsub = appStore.subscribe(() => {
      if (appStore.get().introReady) {
        unsub();
        resolve();
      }
    });
  });
}
