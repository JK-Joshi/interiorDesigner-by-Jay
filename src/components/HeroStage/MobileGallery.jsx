import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { projects } from '../../data/projects';
import { flipStore } from '../../lib/flipStore';
import { pad2 } from '../../lib/content';
import { appStore } from '../../lib/appState';
import s from './MobileGallery.module.css';

export default function MobileGallery({ onExplore }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const trackRef = useRef(null);
  const cardRefs = useRef([]);
  const dragRef = useRef({
    isDown: false,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    startTime: 0,
    hasMoved: false,
    pointerId: null,
  });

  const navigate = useNavigate();
  const location = useLocation();
  const locationRef = useRef(location);
  locationRef.current = location;

  // Track active slide based on nearest to center
  const updateActiveIndex = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;

    const trackRect = track.getBoundingClientRect();
    const trackCenter = trackRect.left + trackRect.width / 2;
    let closestIdx = 0;
    let minDiff = Infinity;

    cardRefs.current.forEach((card, i) => {
      if (!card) return;
      const r = card.getBoundingClientRect();
      const cardCenter = r.left + r.width / 2;
      const diff = Math.abs(trackCenter - cardCenter);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    });

    setActiveIndex(closestIdx);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;

    let rafId = 0;
    const handleScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateActiveIndex);
    };

    track.addEventListener('scroll', handleScroll, { passive: true });
    updateActiveIndex();

    return () => {
      track.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(rafId);
    };
  }, [updateActiveIndex]);

  // Handle horizontal trackpad / shift-wheel
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;

    const onWheel = (e) => {
      const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0;
      if (Math.abs(dx) > 1.5) {
        e.preventDefault();
        track.scrollLeft += dx;
      }
    };

    track.addEventListener('wheel', onWheel, { passive: false });
    return () => track.removeEventListener('wheel', onWheel);
  }, []);

  const scrollToCard = useCallback((index) => {
    const track = trackRef.current;
    const card = cardRefs.current[index];
    if (!track || !card) return;
    const cardRect = card.getBoundingClientRect();
    const trackRect = track.getBoundingClientRect();
    const offset = cardRect.left - trackRect.left - (trackRect.width - cardRect.width) / 2;
    track.scrollBy({ left: offset, behavior: 'smooth' });
    setActiveIndex(index);
  }, []);

  const snapToNearest = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const trackRect = track.getBoundingClientRect();
    const trackCenter = trackRect.left + trackRect.width / 2;
    let closest = 0;
    let minDiff = Infinity;
    cardRefs.current.forEach((card, i) => {
      if (!card) return;
      const r = card.getBoundingClientRect();
      const center = r.left + r.width / 2;
      const diff = Math.abs(trackCenter - center);
      if (diff < minDiff) {
        minDiff = diff;
        closest = i;
      }
    });
    scrollToCard(closest);
  }, [scrollToCard]);

  // Pointer drag events for full mouse + touch dragging support
  const handlePointerDown = (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const track = trackRef.current;
    if (!track) return;

    dragRef.current = {
      isDown: true,
      startX: e.clientX,
      startY: e.clientY,
      scrollLeft: track.scrollLeft,
      startTime: performance.now(),
      hasMoved: false,
      pointerId: e.pointerId,
    };
  };

  const handlePointerMove = (e) => {
    if (!dragRef.current.isDown) return;
    const track = trackRef.current;
    if (!track) return;

    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;

    // Start drag after 6px horizontal movement
    if (!dragRef.current.hasMoved && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) {
      dragRef.current.hasMoved = true;
      setIsDragging(true);
      try {
        track.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }

    if (dragRef.current.hasMoved) {
      e.preventDefault();
      track.scrollLeft = dragRef.current.scrollLeft - dx;
    }
  };

  const handlePointerUp = (e) => {
    if (!dragRef.current.isDown) return;
    const track = trackRef.current;
    const hasMoved = dragRef.current.hasMoved;
    const startX = dragRef.current.startX;
    const startTime = dragRef.current.startTime;
    const pointerId = dragRef.current.pointerId;

    dragRef.current.isDown = false;
    setIsDragging(false);

    if (pointerId != null && track?.hasPointerCapture?.(pointerId)) {
      try {
        track.releasePointerCapture(pointerId);
      } catch {
        // ignore
      }
    }

    if (hasMoved && track) {
      const dx = e.clientX - startX;
      const dt = performance.now() - startTime;
      const velocity = dx / Math.max(1, dt);

      // Flick left → next card; Flick right → previous card
      if (dx < -35 || velocity < -0.3) {
        scrollToCard(Math.min(projects.length - 1, activeIndex + 1));
      } else if (dx > 35 || velocity > 0.3) {
        scrollToCard(Math.max(0, activeIndex - 1));
      } else {
        snapToNearest();
      }
    }
  };

  const openProject = useCallback(
    (project) => {
      if (appStore.get().overlayOpen) return;
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

  const handleCardClick = (project, i) => {
    // If the user was dragging to slide, ignore the click
    if (dragRef.current.hasMoved) return;
    openProject(project);
  };

  const handlePrev = (e) => {
    e.stopPropagation();
    scrollToCard(Math.max(0, activeIndex - 1));
  };

  const handleNext = (e) => {
    e.stopPropagation();
    scrollToCard(Math.min(projects.length - 1, activeIndex + 1));
  };

  return (
    <div className={s.root} role="region" aria-label="Selected works carousel" data-own-scroll="">
      {/* Header with Title, Counter, and Navigation Buttons */}
      <div className={s.header}>
        <div className={s.headerText}>
          <span className={s.eyebrow}>(Selected Works)</span>
          <h2 className={s.title}>
            Curated <em>Spaces</em>
          </h2>
        </div>
        <div className={s.headerControls}>
          <span className={s.counter}>
            {pad2(activeIndex + 1)} / {pad2(projects.length)}
          </span>
          <div className={s.headerNav}>
            <button
              type="button"
              className={s.navBtn}
              onClick={handlePrev}
              disabled={activeIndex === 0}
              aria-label="Previous project"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              className={s.navBtn}
              onClick={handleNext}
              disabled={activeIndex === projects.length - 1}
              aria-label="Next project"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Track Area with Mouse/Touch Drag & Floating Arrows */}
      <div className={s.trackWrapper}>
        {activeIndex > 0 && (
          <button
            type="button"
            className={`${s.floatArrow} ${s.floatArrowLeft}`}
            onClick={handlePrev}
            aria-label="Previous project"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        <div
          ref={trackRef}
          className={`${s.track} ${isDragging ? s.isDragging : ''}`}
          tabIndex={0}
          aria-label="Drag or swipe horizontally to view projects"
          data-own-scroll=""
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
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
                onClick={() => handleCardClick(project, i)}
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

        {activeIndex < projects.length - 1 && (
          <button
            type="button"
            className={`${s.floatArrow} ${s.floatArrowRight}`}
            onClick={handleNext}
            aria-label="Next project"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {/* Bottom Indicators & Explore Button */}
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
