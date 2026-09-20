import { useMemo, useRef } from 'react';
import { gsap, ScrollTrigger, SplitText, Draggable, splitAria, useGSAP } from '../../lib/gsap';
import { getLenis } from '../../lib/lenis';
import { pad2 } from '../../lib/content';
import { useFontsReady } from '../../hooks/useFontsReady';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { useRefreshOnDecode } from '../../hooks/useRefreshOnDecode';
import ImageWithFallback from '../ui/ImageWithFallback';
import s from './HorizontalWalkthrough.module.css';

function splitLines(el, { onSplit, ...vars }) {
  return SplitText.create(el, {
    aria: splitAria(el),
    type: 'lines',
    mask: 'lines',
    linesClass: 'split-line',
    autoSplit: true,
    ...vars,
    onSplit(self) {
      el.classList.add('is-split');
      return onSplit?.(self);
    },
  });
}

/**
 * Pinned horizontal walkthrough of ONE project's images (clicked image first).
 * Desktop: vertical scroll → horizontal track (scrub), containerAnimation reveals,
 * drag-to-scroll, horizontal wheel and arrow keys.
 * Mobile / reduced motion: native scroll-snap strip with the same captions.
 */
export default function HorizontalWalkthrough({ project, startIndex = 0, scroller, lenis, onProgress }) {
  const sectionRef = useRef(null);
  const trackRef = useRef(null);
  const stripRef = useRef(null);
  const proxyRef = useRef(null);
  const fontsReady = useFontsReady();
  const desktop = useMediaQuery('(min-width: 768px)');
  const reduced = usePrefersReducedMotion();
  const pinned = desktop && !reduced;

  const ordered = useMemo(() => {
    const list = project.images.map((image, i) => ({ image, i }));
    const first = list.find((x) => x.i === startIndex) || list[0];
    return [first, ...list.filter((x) => x !== first)];
  }, [project, startIndex]);

  useRefreshOnDecode(sectionRef, [project.slug, pinned]);

  useGSAP(
    () => {
      if (!fontsReady) return undefined;
      const section = sectionRef.current;
      const scrollerEl = scroller?.current || undefined;
      const getScrollLenis = () => (typeof lenis === 'function' ? lenis() : lenis) || getLenis();
      const total = ordered.length;
      const splits = [];

      const report = (progress, index, active) => onProgress?.({ progress, index, total, active });

      // ── Mobile / reduced motion: native strip ───────────────────────────────
      if (!pinned) {
        const strip = stripRef.current;
        const panels = gsap.utils.toArray('[data-panel]', section);
        if (!reduced) {
          panels.forEach((panel) => {
            const st = {
              trigger: panel,
              scroller: strip,
              horizontal: true,
              start: 'left 85%',
              toggleActions: 'play none none none',
            };
            const title = panel.querySelector('[data-panel-title]');
            const desc = panel.querySelector('[data-panel-desc]');
            gsap.fromTo(
              panel.querySelector('[data-panel-media]'),
              { clipPath: 'inset(0% 0% 0% 100%)' },
              { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2, ease: 'rust.inOut', scrollTrigger: st },
            );
            gsap.fromTo(panel.querySelector('[data-panel-index]'), { xPercent: 60, autoAlpha: 0 }, { xPercent: 0, autoAlpha: 1, duration: 1, ease: 'rust.out', scrollTrigger: st });
            [title, desc].forEach((el, k) => {
              if (!el) return;
              splits.push(
                splitLines(el, {
                  onSplit: (self) =>
                    gsap.from(self.lines, {
                      yPercent: 115,
                      duration: 1,
                      delay: 0.15 + k * 0.12,
                      stagger: 0.06,
                      ease: 'rust.out',
                      scrollTrigger: st,
                    }),
                }),
              );
            });
          });
        } else {
          section.querySelectorAll('[data-split]').forEach((el) => el.classList.add('is-split'));
        }

        const onStripScroll = () => {
          const max = strip.scrollWidth - strip.clientWidth;
          const progress = max > 0 ? strip.scrollLeft / max : 0;
          report(progress, Math.round(progress * (total - 1)), true);
        };
        strip.addEventListener('scroll', onStripScroll, { passive: true });
        const vis = ScrollTrigger.create({
          trigger: section,
          scroller: scrollerEl,
          start: 'top 60%',
          end: 'bottom 40%',
          onToggle: (self) => report(strip.scrollLeft / Math.max(1, strip.scrollWidth - strip.clientWidth), 0, self.isActive),
        });
        return () => {
          strip.removeEventListener('scroll', onStripScroll);
          vis.kill();
          splits.forEach((sp) => sp.revert());
        };
      }

      // ── Desktop: pinned horizontal track ────────────────────────────────────
      const track = trackRef.current;
      const panels = gsap.utils.toArray('[data-panel]', track);
      const viewportWidth = () => (scrollerEl ? scrollerEl.clientWidth : window.innerWidth);
      const distance = () => Math.max(0, track.scrollWidth - viewportWidth());
      let centers = [];
      const measureCenters = () => {
        centers = panels.map((p) => p.offsetLeft + p.offsetWidth / 2);
      };
      measureCenters();

      const nearestIndex = (x) => {
        const center = -x + viewportWidth() / 2;
        let best = 0;
        let bestDist = Infinity;
        centers.forEach((c, i) => {
          const d = Math.abs(c - center);
          if (d < bestDist) {
            bestDist = d;
            best = i;
          }
        });
        return best;
      };

      const scrollTween = gsap.to(track, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          scroller: scrollerEl,
          start: 'top top',
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onRefresh: measureCenters,
          onToggle: (self) => report(self.progress, nearestIndex(gsap.getProperty(track, 'x')), self.isActive),
          onUpdate: (self) => report(self.progress, nearestIndex(gsap.getProperty(track, 'x')), self.isActive),
        },
      });
      const st = scrollTween.scrollTrigger;

      // Lead card + first panel reveal as the section arrives.
      const intro = gsap.timeline({
        scrollTrigger: { trigger: section, scroller: scrollerEl, start: 'top 75%', toggleActions: 'play none none none' },
      });
      intro.from('[data-lead-line]', { yPercent: 110, duration: 1, stagger: 0.08, ease: 'rust.out' });

      panels.forEach((panel, i) => {
        const media = panel.querySelector('[data-panel-media]');
        const par = panel.querySelector('[data-panel-parallax]');
        const indexEl = panel.querySelector('[data-panel-index]');
        const title = panel.querySelector('[data-panel-title]');
        const desc = panel.querySelector('[data-panel-desc]');
        const first = i === 0;

        const enterST = first
          ? { trigger: section, scroller: scrollerEl, start: 'top 55%', toggleActions: 'play none none none' }
          : {
              trigger: panel,
              containerAnimation: scrollTween,
              scroller: scrollerEl,
              start: 'left 78%',
              toggleActions: 'play none none none',
            };

        if (first) {
          intro
            .fromTo(media, { clipPath: 'inset(0% 0% 0% 100%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'rust.inOut' }, 0.1)
            .fromTo(indexEl, { xPercent: 50, autoAlpha: 0 }, { xPercent: 0, autoAlpha: 1, duration: 1.2, ease: 'rust.out' }, 0.4);
        } else {
          gsap.fromTo(
            media,
            { clipPath: 'inset(0% 0% 0% 100%)' },
            {
              clipPath: 'inset(0% 0% 0% 0%)',
              ease: 'none',
              scrollTrigger: {
                trigger: panel,
                containerAnimation: scrollTween,
                scroller: scrollerEl,
                start: 'left 95%',
                end: 'left 45%',
                scrub: true,
              },
            },
          );
          gsap.fromTo(
            indexEl,
            { xPercent: 70 },
            {
              xPercent: -20,
              ease: 'none',
              scrollTrigger: {
                trigger: panel,
                containerAnimation: scrollTween,
                scroller: scrollerEl,
                start: 'left right',
                end: 'right left',
                scrub: true,
              },
            },
          );
        }

        // Inner image parallax (horizontal).
        gsap.fromTo(
          par,
          { xPercent: -7 },
          {
            xPercent: 7,
            ease: 'none',
            scrollTrigger: {
              trigger: panel,
              containerAnimation: scrollTween,
              scroller: scrollerEl,
              start: 'left right',
              end: 'right left',
              scrub: true,
            },
          },
        );

        [title, desc].forEach((el, k) => {
          if (!el) return;
          splits.push(
            splitLines(el, {
              onSplit: (self) =>
                gsap.from(self.lines, {
                  yPercent: 115,
                  rotate: 2,
                  transformOrigin: '0% 100%',
                  duration: 1.1,
                  delay: (first ? 0.5 : 0.15) + k * 0.14,
                  stagger: 0.07,
                  ease: 'rust.out',
                  scrollTrigger: enterST,
                }),
            }),
          );
        });
      });

      // Drag-to-scroll on the track (with inertia).
      const scrollNow = () => (scrollerEl ? scrollerEl.scrollTop : window.scrollY);
      const setScroll = (y) => {
        const clamped = Math.min(st.end, Math.max(st.start, y));
        const l = getScrollLenis();
        if (l) l.scrollTo(clamped, { immediate: true, force: true });
        else if (scrollerEl) scrollerEl.scrollTop = clamped;
        else window.scrollTo(0, clamped);
      };
      const drag = { startX: 0, startScroll: 0 };
      const [draggable] = Draggable.create(proxyRef.current, {
        type: 'x',
        trigger: track,
        inertia: true,
        minimumMovement: 4,
        cursor: 'grab',
        activeCursor: 'grabbing',
        allowContextMenu: true,
        onPress() {
          drag.startX = this.x;
          drag.startScroll = scrollNow();
        },
        onDrag() {
          setScroll(drag.startScroll - (this.x - drag.startX));
        },
        onThrowUpdate() {
          setScroll(drag.startScroll - (this.x - drag.startX));
        },
      });

      // Horizontal trackpad / shift-wheel → vertical scroll progress.
      const onWheel = (e) => {
        if (!st.isActive) return;
        const dx = e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX;
        if (Math.abs(dx) <= Math.abs(e.deltaY) && !e.shiftKey) return;
        if (Math.abs(dx) < 1) return;
        e.preventDefault();
        const l = getScrollLenis();
        if (l) l.scrollTo(l.targetScroll + dx, { force: true });
        else setScroll(scrollNow() + dx);
      };
      section.addEventListener('wheel', onWheel, { passive: false });

      // Arrow keys jump panel to panel.
      const goTo = (index) => {
        const i = Math.max(0, Math.min(panels.length - 1, index));
        const target = st.start + (centers[i] - viewportWidth() / 2);
        const y = Math.min(st.end, Math.max(st.start, target));
        const l = getScrollLenis();
        if (l) l.scrollTo(y, { duration: 1.2, force: true });
        else if (scrollerEl) scrollerEl.scrollTo({ top: y, behavior: 'smooth' });
        else window.scrollTo({ top: y, behavior: 'smooth' });
      };
      const onKey = (e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        const current = nearestIndex(gsap.getProperty(track, 'x'));
        goTo(current + (e.key === 'ArrowRight' ? 1 : -1));
      };
      section.addEventListener('keydown', onKey);

      return () => {
        draggable.kill();
        section.removeEventListener('wheel', onWheel);
        section.removeEventListener('keydown', onKey);
        splits.forEach((sp) => sp.revert());
        report(0, 0, false);
      };
    },
    { scope: sectionRef, dependencies: [fontsReady, pinned, project.slug, startIndex], revertOnUpdate: true },
  );

  const panels = ordered.map(({ image, i }, k) => (
    <article
      key={image.src}
      className={s.panel}
      data-panel=""
      data-align={k % 2 === 0 ? 'top' : 'bottom'}
      aria-roledescription="slide"
      aria-label={`${pad2(k + 1)} of ${pad2(ordered.length)}: ${image.title}`}
    >
      <div className={s.frame} style={{ '--ar': image.width / image.height }} data-panel-media="">
        <div className={s.frameInner} data-panel-parallax="">
          <ImageWithFallback
            src={image.src}
            alt={image.title}
            width={image.width}
            height={image.height}
            sizes="(max-width: 767px) 86vw, 60vw"
            label={project.title}
            accent={project.accent}
            priority={k === 0}
          />
        </div>
      </div>
      <div className={s.caption}>
        <span className={s.index} data-panel-index="" aria-hidden="true">
          {pad2(k + 1)}
        </span>
        <h3 className={s.title} data-panel-title="" data-split="">
          {image.title}
        </h3>
        <p className={s.desc} data-panel-desc="" data-split="">
          {image.description}
        </p>
        <span className={s.source} aria-hidden="true">
          Image {pad2(i + 1)}
        </span>
      </div>
    </article>
  ));

  return (
    <section
      ref={sectionRef}
      className={[s.section, pinned ? s.pinned : s.native].join(' ')}
      aria-label={`${project.title} — walkthrough, ${ordered.length} images. Use left and right arrow keys to move.`}
      tabIndex={pinned ? 0 : undefined}
      data-cursor={pinned ? 'Scroll' : undefined}
      data-overlay-content=""
    >
      <h2 className="visually-hidden">{project.title} — walkthrough</h2>
      {pinned ? (
        <>
          <div ref={proxyRef} className={s.proxy} aria-hidden="true" />
          <div ref={trackRef} className={s.track}>
            <div className={s.lead}>
              <p className={s.leadMask}>
                <span className="eyebrow" data-lead-line="">
                  The walkthrough
                </span>
              </p>
              <p className={s.leadMask}>
                <span className={s.leadTitle} data-lead-line="">
                  {ordered.length} rooms,
                </span>
              </p>
              <p className={s.leadMask}>
                <span className={`${s.leadTitle} ${s.leadItalic}`} data-lead-line="">
                  one story.
                </span>
              </p>
              <p className={s.leadMask}>
                <span className={s.leadHint} data-lead-line="">
                  Scroll, drag or use ← → keys
                </span>
              </p>
            </div>
            {panels}
            <div className={s.end} aria-hidden="true">
              <span className={s.endLine} />
              <span className="eyebrow">End of walkthrough</span>
            </div>
          </div>
        </>
      ) : (
        <>
          <header className={s.nativeHead}>
            <span className="eyebrow">The walkthrough</span>
            <span className={s.nativeHint}>Swipe to explore · {ordered.length} images</span>
          </header>
          <div ref={stripRef} className={s.strip} data-own-scroll="" tabIndex={0} aria-label="Project images">
            {panels}
          </div>
        </>
      )}
    </section>
  );
}
