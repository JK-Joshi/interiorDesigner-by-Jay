import { memo } from 'react';
import ImageWithFallback from '../ui/ImageWithFallback';
import s from './InfiniteCanvas.module.css';

/**
 * One positioned tile of the infinite canvas. Position is written directly to the
 * element's transform by the canvas engine (never through React state).
 */
function CanvasTile({ item, index, tileRef, onActivate, tabbable, hold = false }) {
  const { image } = item;
  const handleClick = (e) => {
    e.preventDefault();
    onActivate(index, e);
  };
  return (
    <a
      ref={tileRef}
      href={`/project/${item.projectSlug}`}
      className={s.tile}
      data-tile={index}
      data-cursor="View"
      tabIndex={tabbable ? 0 : -1}
      draggable={false}
      style={{ width: item.w, height: item.h, '--d': item.delay }}
      onClick={handleClick}
      aria-label={`${image.title} — ${image.projectTitle} (${image.category}). Open project`}
    >
      <div className={s.media} data-tile-media="">
        <div className={s.parallax} data-tile-parallax="">
          <ImageWithFallback
            src={image.src}
            alt={image.title}
            width={image.width}
            height={image.height}
            sizes={`${Math.round(item.w)}px`}
            label={image.projectTitle}
            accent={image.accent}
            className={s.imageRoot}
            hold={hold}
          />
        </div>
      </div>
      <span className={s.caption} aria-hidden="true">
        <span className={s.captionTitle}>{image.projectTitle}</span>
        <span className={s.captionMeta}>{image.category}</span>
      </span>
    </a>
  );
}

export default memo(CanvasTile);
