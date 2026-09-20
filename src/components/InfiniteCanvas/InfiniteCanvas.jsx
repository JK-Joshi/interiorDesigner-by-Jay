import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { gsap, Draggable, useGSAP } from '../../lib/gsap';
import { appStore } from '../../lib/appState';
import { flipStore } from '../../lib/flipStore';
import { getAllImages } from '../../data/projects';
import { canvasState, heroState } from '../../three/heroState';
import { useIsTouch } from '../../hooks/useMediaQuery';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { buildLayout } from './layout';
import CanvasTile from './CanvasTile';
import s from './InfiniteCanvas.module.css';

const CLICK_DISTANCE = 16;
const CLICK_TIME = 450;
const LERP = 0.1;
const DRIFT = { x: -14, y: -22 }; // px / second
const DRIFT_RESUME = 2; // seconds

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/**
 * Infinite, draggable masonry canvas with every image of every project.
 *
 * mode="stage"   lives behind the 3D hero; input is enabled by the hero timeline.
 * mode="explore" fullscreen touch-first explorer (always interactive).
 */
/** Behind the hero the gallery is invisible until the curtain lifts — start loading shortly before. */
const LOAD_IMAGES_AT = 0.3;

export default function InfiniteCanvas({ mode = 'stage', className, onExplore, label = 'Project gallery' }) {
  const isStage = mode === 'stage';
  // 60 photos would otherwise download while the hero still covers them.
  const [holdImages, setHoldImages] = useState(() => isStage && heroState.progress < LOAD_IMAGES_AT);
  useEffect(() => {
    if (!holdImages) return undefined;
    const tick = () => {
      if (heroState.progress >= LOAD_IMAGES_AT) setHoldImages(false);
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [holdImages]);

  const rootRef = useRef(null);
  const planeRef = useRef(null);
  const proxyRef = useRef(null);
  const tileRefs = useRef([]);
  const entriesRef = useRef([]);
  const engine = useRef({
    target: { x: 0, y: 0 },
    current: { x: 0, y: 0 },
    clickArmed: false,
    dragEnabled: false,
  });

  const navigate = useNavigate();
  const location = useLocation();
  const locationRef = useRef(location);
  locationRef.current = location;

  const isTouch = useIsTouch();
  const reduced = usePrefersReducedMotion();
  const dragAllowed = !isStage || !isTouch;

  const images = useMemo(() => getAllImages(), []);
  const [layout, setLayout] = useState(null);

  // ── Layout (rebuilt on width change or when the height exceeds the safe range)
  useLayoutEffect(() => {
    const root = rootRef.current;
    let current = null;
    let timer = 0;
    const measure = () => {
      const vw = root.clientWidth || window.innerWidth;
      const vh = root.clientHeight || window.innerHeight;
      if (current && Math.abs(vw - current.vw) < 2 && vh <= current.safeHeight && Math.abs(vh - current.vh) < 160) {
        return;
      }
      current = buildLayout(images, vw, vh);
      setLayout(current);
    };
    measure();
    const ro = new ResizeObserver(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(measure, 180);
    });
    ro.observe(root);
    return () => {
      window.clearTimeout(timer);
      ro.disconnect();
    };
  }, [images]);

  // ── Open a project (Flip source is captured before navigating)
  const openEntry = useCallback(
    (index) => {
      const entry = entriesRef.current[index];
      if (!entry) return;
      if (isStage && !canvasState.interactive) return;
      if (appStore.get().overlayOpen) return;
      const { image } = entry.item;
      const media = entry.el.querySelector('[data-tile-media]');
      flipStore.capture({ slug: image.projectSlug, imageIndex: image.imageIndex, mediaEl: media, tileEl: entry.el });
      const from = locationRef.current;
      navigate(`/project/${image.projectSlug}`, {
        state: {
          backgroundLocation: { pathname: from.pathname, search: from.search, hash: from.hash, key: from.key, state: null },
          imageIndex: image.imageIndex,
          fromCanvas: true,
        },
      });
    },
    [isStage, navigate],
  );

  // Anchor click: keyboard (Enter → detail 0) or taps when dragging is off.
  const handleActivate = useCallback(
    (index, event) => {
      if (event.detail === 0 || !engine.current.dragEnabled) {
        openEntry(index);
      }
    },
    [openEntry],
  );

  // ── Engine: ticker, drag + inertia, hover, keyboard
  useGSAP(
    () => {
      if (!layout) return undefined;
      const root = rootRef.current;
      const plane = planeRef.current;
      const eng = engine.current;
      const { W, H, g, mx, my } = layout;
      let vw = layout.vw;
      let vh = layout.vh;

      const entries = layout.items.map((item, i) => {
        const el = tileRefs.current[i];
        const par = el.querySelector('[data-tile-parallax]');
        return {
          item,
          el,
          wrapX: gsap.utils.wrap(-item.w - g, W - item.w - g),
          wrapY: gsap.utils.wrap(-item.h - g, H - item.h - g),
          setX: gsap.quickSetter(el, 'x', 'px'),
          setY: gsap.quickSetter(el, 'y', 'px'),
          setPX: gsap.quickSetter(par, 'x', 'px'),
          setPY: gsap.quickSetter(par, 'y', 'px'),
          x: Infinity,
          y: Infinity,
          visible: null,
        };
      });
      entriesRef.current = entries;
      gsap.set(entries.map((e) => e.el), { force3D: true });

      const setSkewX = gsap.quickSetter(plane, 'skewX', 'deg');
      const setSkewY = gsap.quickSetter(plane, 'skewY', 'deg');
      const setScale = gsap.quickSetter(plane, 'scale');

      let dragging = false;
      let hovering = false;
      let focused = false;
      let lastInteraction = -Infinity;
      let interactive = !isStage;
      let positioned = false;
      const vel = { x: 0, y: 0 };
      const fx = { skx: 0, sky: 0, scale: 1 };
      const press = { x: 0, y: 0, t: 0, baseX: 0, baseY: 0, startX: 0, startY: 0 };

      const touch = () => {
        lastInteraction = gsap.ticker.time;
      };

      // Draggable on an invisible proxy; the canvas root is the trigger.
      let draggable = null;
      if (dragAllowed) {
        [draggable] = Draggable.create(proxyRef.current, {
          type: 'x,y',
          trigger: root,
          inertia: true,
          dragClickables: true,
          allowContextMenu: true,
          zIndexBoost: false,
          minimumMovement: 2,
          cursor: 'grab',
          activeCursor: 'grabbing',
          onPress() {
            gsap.killTweensOf(eng.target);
            press.x = this.pointerX;
            press.y = this.pointerY;
            press.t = performance.now();
            press.startX = this.x;
            press.startY = this.y;
            press.baseX = eng.target.x;
            press.baseY = eng.target.y;
            touch();
          },
          onDragStart() {
            dragging = true;
            plane.classList.add(s.isDragging);
          },
          onDrag() {
            eng.target.x = press.baseX + (this.x - press.startX);
            eng.target.y = press.baseY + (this.y - press.startY);
            touch();
          },
          onThrowUpdate() {
            eng.target.x = press.baseX + (this.x - press.startX);
            eng.target.y = press.baseY + (this.y - press.startY);
            touch();
          },
          onRelease(event) {
            const moved = Math.hypot(this.pointerX - press.x, this.pointerY - press.y);
            const elapsed = performance.now() - press.t;
            const target = (event && event.target) || this.pointerEvent?.target;
            if (moved < CLICK_DISTANCE && elapsed < CLICK_TIME && target instanceof Element) {
              const tile = target.closest('[data-tile]');
              if (tile && root.contains(tile)) openEntry(Number(tile.dataset.tile));
            }
            if (!this.tween || !this.tween.isActive()) {
              dragging = false;
              plane.classList.remove(s.isDragging);
            }
            touch();
          },
          onThrowComplete() {
            dragging = false;
            plane.classList.remove(s.isDragging);
            touch();
          },
        });
        if (isStage) draggable.disable();
      }
      eng.dragEnabled = Boolean(draggable && draggable.enabled());

      const syncInteractive = (next) => {
        if (next === interactive) return;
        interactive = next;
        if (draggable) {
          if (next) draggable.enable();
          else draggable.disable();
        }
        eng.dragEnabled = Boolean(draggable && draggable.enabled());
        entries.forEach((e) => {
          e.el.tabIndex = next && e.visible ? 0 : -1;
        });
        root.tabIndex = next ? 0 : -1;
      };
      root.tabIndex = interactive ? 0 : -1;

      const tick = (time, deltaMs) => {
        const app = appStore.get();
        const frozen = app.overlayOpen || (isStage && (app.exploreOpen || !canvasState.visible));
        if (isStage) syncInteractive(canvasState.interactive && !app.overlayOpen);
        if (frozen && positioned) return;

        const dt = clamp(deltaMs / 1000, 1 / 240, 1 / 15);
        const idle = !dragging && !hovering && !focused && time - lastInteraction > DRIFT_RESUME;
        if (!reduced && idle && !frozen) {
          eng.target.x += DRIFT.x * dt;
          eng.target.y += DRIFT.y * dt;
        }

        const tx = eng.target.x + (isStage ? canvasState.scrollX : 0);
        const ty = eng.target.y + (isStage ? canvasState.scrollY : 0);
        const k = 1 - Math.pow(1 - LERP, dt * 60);
        const px = eng.current.x;
        const py = eng.current.y;
        eng.current.x += (tx - px) * k;
        eng.current.y += (ty - py) * k;
        if (!positioned) {
          eng.current.x = tx;
          eng.current.y = ty;
        }

        // Velocity → skew / scale on the plane.
        vel.x += ((eng.current.x - px) / dt - vel.x) * 0.2;
        vel.y += ((eng.current.y - py) / dt - vel.y) * 0.2;
        if (!reduced) {
          const speed = Math.hypot(vel.x, vel.y);
          const tSkx = clamp(vel.x * -0.0016, -4, 4);
          const tSky = clamp(vel.y * -0.0012, -4, 4);
          const tScale = 1 - Math.min(speed / 3200, 1) * 0.03;
          fx.skx += (tSkx - fx.skx) * 0.12;
          fx.sky += (tSky - fx.sky) * 0.12;
          fx.scale += (tScale - fx.scale) * 0.12;
          setSkewX(fx.skx);
          setSkewY(fx.sky);
          setScale(fx.scale);
        }

        const cx = eng.current.x;
        const cy = eng.current.y;
        for (let i = 0; i < entries.length; i += 1) {
          const e = entries[i];
          const x = e.wrapX(e.item.baseX + cx);
          const y = e.wrapY(e.item.baseY + cy);
          if (Math.abs(x - e.x) > 0.01 || Math.abs(y - e.y) > 0.01) {
            e.setX(x);
            e.setY(y);
            e.x = x;
            e.y = y;
          }
          const visible = x + e.item.w > mx && x < mx + vw && y + e.item.h > my && y < my + vh;
          if (visible !== e.visible) {
            e.visible = visible;
            e.el.tabIndex = visible && interactive ? 0 : -1;
          }
          if (visible && !reduced) {
            e.setPX(((x + e.item.w / 2 - mx) / vw - 0.5) * -26);
            e.setPY(((y + e.item.h / 2 - my) / vh - 0.5) * -26);
          }
        }
        positioned = true;
      };
      gsap.ticker.add(tick);
      tick(gsap.ticker.time, 16);

      // Hover: pause drift, dim siblings.
      const onEnter = () => {
        hovering = true;
      };
      const onLeave = () => {
        hovering = false;
        touch();
        plane.classList.remove(s.isDim);
      };
      const onOver = (e) => {
        const tile = e.target instanceof Element ? e.target.closest('[data-tile]') : null;
        plane.classList.toggle(s.isDim, Boolean(tile) && interactive);
      };

      // Keyboard panning.
      const onKey = (e) => {
        if (!interactive) return;
        const step = e.shiftKey ? 640 : 300;
        const moves = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
        const move = moves[e.key];
        if (!move) return;
        e.preventDefault();
        touch();
        gsap.to(eng.target, {
          x: eng.target.x + move[0],
          y: eng.target.y + move[1],
          duration: 0.9,
          ease: 'rust.out',
          overwrite: true,
        });
      };

      // Keep a keyboard-focused tile fully in view.
      const onFocusIn = (e) => {
        const tile = e.target instanceof Element ? e.target.closest('[data-tile]') : null;
        if (!tile) return;
        focused = true;
        const entry = entries[Number(tile.dataset.tile)];
        if (!entry) return;
        const pad = 32;
        const x = entry.x - mx;
        const y = entry.y - my;
        let dx = 0;
        let dy = 0;
        if (x < pad) dx = pad - x;
        else if (x + entry.item.w > vw - pad) dx = vw - pad - (x + entry.item.w);
        if (y < pad) dy = pad - y;
        else if (y + entry.item.h > vh - pad) dy = vh - pad - (y + entry.item.h);
        if (dx || dy) {
          gsap.to(eng.target, { x: eng.target.x + dx, y: eng.target.y + dy, duration: 0.8, ease: 'rust.out', overwrite: true });
        }
      };
      const onFocusOut = (e) => {
        if (!root.contains(e.relatedTarget)) {
          focused = false;
          touch();
        }
      };

      const onResize = () => {
        vw = root.clientWidth || vw;
        vh = root.clientHeight || vh;
      };

      root.addEventListener('pointerenter', onEnter);
      root.addEventListener('pointerleave', onLeave);
      root.addEventListener('pointerover', onOver);
      root.addEventListener('keydown', onKey);
      root.addEventListener('focusin', onFocusIn);
      root.addEventListener('focusout', onFocusOut);
      window.addEventListener('resize', onResize);

      return () => {
        gsap.ticker.remove(tick);
        draggable?.kill();
        root.removeEventListener('pointerenter', onEnter);
        root.removeEventListener('pointerleave', onLeave);
        root.removeEventListener('pointerover', onOver);
        root.removeEventListener('keydown', onKey);
        root.removeEventListener('focusin', onFocusIn);
        root.removeEventListener('focusout', onFocusOut);
        window.removeEventListener('resize', onResize);
      };
    },
    { scope: rootRef, dependencies: [layout, dragAllowed, reduced, isStage, openEntry], revertOnUpdate: true },
  );

  const setTileRef = useCallback(
    (i) => (el) => {
      tileRefs.current[i] = el;
    },
    [],
  );

  const tileRefCallbacks = useMemo(() => {
    if (!layout) return [];
    return layout.items.map((_, i) => setTileRef(i));
  }, [layout, setTileRef]);

  return (
    <div
      ref={rootRef}
      className={[s.root, isStage ? s.stage : s.explore, dragAllowed ? s.draggable : s.touchScroll, className]
        .filter(Boolean)
        .join(' ')}
      data-cursor={dragAllowed ? 'Drag' : undefined}
      role="region"
      aria-roledescription="infinite gallery"
      aria-label={`${label}. Drag or use the arrow keys to pan, Tab to move between projects, Enter to open.`}
    >
      <div ref={proxyRef} className={s.proxy} aria-hidden="true" />
      {layout ? (
        <div
          ref={planeRef}
          className={s.plane}
          style={{ left: -layout.mx, top: -layout.my, width: layout.areaW, height: layout.areaH }}
        >
          {layout.items.map((item, i) => (
            <CanvasTile
              key={item.key}
              item={item}
              index={i}
              tileRef={tileRefCallbacks[i]}
              onActivate={handleActivate}
              tabbable={false}
              hold={holdImages}
            />
          ))}
        </div>
      ) : null}
      {isStage && isTouch && onExplore ? (
        <button type="button" className={s.exploreButton} onClick={onExplore}>
          <span className={s.exploreDot} aria-hidden="true" />
          Explore full screen
        </button>
      ) : null}
    </div>
  );
}
