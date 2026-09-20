import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { projects } from '../../data/projects';
import { flipStore } from '../../lib/flipStore';
import { pad2 } from '../../lib/content';
import { appStore } from '../../lib/appState';
import s from './MobileGallery.module.css';

const CLICK_TOLERANCE = 16;
const CLICK_MAX_TIME = 450;

export default function MobileGallery({ onExplore }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const trackRef = useRef(null);
  const cardRefs = useRef([]);
  const pressRef = useRef({ x: 0, y: 0, t: 0 });
  const navigate = useNavigate();
  const location = useLocation();
  const locationRef = useRef(location);
  locationRef.current = location;

  // Track active slide as user scrolls horizontally
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;

    let rafId = 0;
    const updateActive = () => {
      const center = track.scrollLeft + track.clientWidth / 2;
      let closestIdx = 0;
      let minDiff = Infinity;

      cardRefs.current.forEach((card, i) => {
        if (!card) return;
        const cardCenter = card.offsetLeft + card.clientWidth / 2;
        const diff = Math.abs(center - cardCenter);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = i;
        }
      });

      setActiveIndex(closestIdx);
    };

    const handleScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateActive);
    };

    track.addEventListener('scroll', handleScroll, { passive: true });
    updateActive();

    return () => {
      track.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(rafId);
    };
  }, []);

  const handlePointerDown = (e) => {
    pressRef.current = {
      x: e.clientX ?? e.touches?.[0]?.clientX ?? 0,
      y: e.clientY ?? e.touches?.[0]?.clientY ?? 0,
      t: performance.now(),
    };
  };

  const openProject = useCallback(
    (project, cardEl) => {
      if (appStore.get().overlayOpen) return;
      const media = cardEl?.querySelector('[data-tile-media]') || cardEl;
      if (media) {
        flipStore.capture({
          slug: project.slug,
          imageIndex: 0,
          mediaEl: media,
          tileEl: cardEl,
        });
      }
      const from = locationRef.current;
      navigate(`/project/${project.slug}`, {
        state: {
          backgroundLocation: {
            pathname: from.pathname,
            search: from.search,
            hash: from.hash,
            key: from.key,
            state: null,
          },
          imageIndex: 0,
          fromCanvas: true,
        },
      });
    },
    [navigate],
  );

  const handleCardClick = (project, i, e) => {
    const endX = e.clientX ?? 0;
    const endY = e.clientY ?? 0;
    const moved = Math.hypot(endX - pressRef.current.x, endY - pressRef.current.y);
    const elapsed = performance.now() - pressRef.current.t;

    // Discard swipes so horizontal browsing doesn't accidentally trigger navigation
    if (moved > CLICK_TOLERANCE || elapsed > CLICK_MAX_TIME) {
      return;
    }

    const cardEl = cardRefs.current[i];
    openProject(project, cardEl);
  };

  const scrollToCard = (index) => {
    const track = trackRef.current;
    const card = cardRefs.current[index];
    if (!track || !card) return;
    const target = card.offsetLeft - (track.clientWidth - card.clientWidth) / 2;
    track.scrollTo({ left: target, behavior: 'smooth' });
  };

  return (
    <div className={s.root} role="region" aria-label="Selected works carousel">
      <div className={s.header}>
        <div className={s.headerText}>
          <span className={s.eyebrow}>(Selected Works)</span>
          <h2 className={s.title}>
            Curated <em>Spaces</em>
          </h2>
        </div>
        <span className={s.counter}>
          {pad2(activeIndex + 1)} / {pad2(projects.length)}
        </span>
      </div>

      <div className={s.trackWrapper}>
        <div ref={trackRef} className={s.track} tabIndex={0} aria-label="Swipe horizontally to view projects">
          {projects.map((project, i) => {
            const isActive = i === activeIndex;
            const coverImage = project.cover || project.images[0]?.src;
            return (
              <div
                key={project.slug}
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                className={`${s.card} ${isActive ? s.isActive : ''}`}
                onPointerDown={handlePointerDown}
                onClick={(e) => handleCardClick(project, i, e)}
                role="button"
                tabIndex={0}
                aria-label={`View project: ${project.title}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openProject(project, cardRefs.current[i]);
                  }
                }}
              >
                <div className={s.media} data-tile-media="">
                  <img
                    src={coverImage}
                    alt={project.title}
                    className={s.image}
                    loading={i < 2 ? 'eager' : 'lazy'}
                    draggable={false}
                  />
                </div>
                <div className={s.overlay} aria-hidden="true" />
                <div className={s.cardContent}>
                  <div className={s.cardTop}>
                    <span className={s.cardCategory}>{project.category}</span>
                    <span className={s.cardIndex}>{pad2(i + 1)}</span>
                  </div>
                  <div className={s.cardBottom}>
                    <h3 className={s.cardTitle}>{project.title}</h3>
                    <p className={s.cardLocation}>
                      {project.location} · {project.year}
                    </p>
                    <div className={s.cardMetaRow}>
                      <span className={s.roomCount}>{project.images.length} Rooms</span>
                      <span className={s.viewAction}>
                        View Project
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className={s.bottomBar}>
        <div className={s.dots} role="tablist" aria-label="Project slide navigation">
          {projects.map((p, i) => (
            <button
              key={p.slug}
              type="button"
              className={`${s.dot} ${i === activeIndex ? s.dotActive : ''}`}
              onClick={() => scrollToCard(i)}
              aria-label={`Go to project ${i + 1}: ${p.title}`}
              aria-selected={i === activeIndex}
            />
          ))}
        </div>

        {onExplore ? (
          <button type="button" className={s.exploreButton} onClick={onExplore}>
            <span className={s.exploreDot} aria-hidden="true" />
            Explore 360° Canvas
          </button>
        ) : null}
      </div>
    </div>
  );
}
