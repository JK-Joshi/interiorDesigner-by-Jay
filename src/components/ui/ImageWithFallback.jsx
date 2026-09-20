import { forwardRef, useCallback, useLayoutEffect, useRef, useState } from 'react';
import { imageVariants } from '../../data/projects';
import { hashString, initials as toInitials } from '../../lib/content';
import s from './ImageWithFallback.module.css';

const PALETTE = ['#B7472A', '#B8955A', '#6B6F5A', '#A89A8A', '#D9784F', '#3B3835'];

/** Four quiet architectural motifs for the placeholder art. */
function Motif({ variant }) {
  switch (variant) {
    case 0:
      return (
        <svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <path d="M40 200V95a60 60 0 0 1 120 0v105" />
          <path d="M62 200V100a38 38 0 0 1 76 0v100" />
          <path d="M20 200h160" />
        </svg>
      );
    case 1:
      return (
        <svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <rect x="30" y="30" width="140" height="140" />
          <path d="M30 100h70v70M100 30v40h70M100 100a40 40 0 0 1 40-40" />
          <circle cx="65" cy="65" r="14" />
        </svg>
      );
    case 2:
      return (
        <svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <path d="M0 150h200M0 162h200M24 150V60h40v90M136 150V40h40v110" />
          <path d="M84 150v-50a16 16 0 0 1 32 0v50" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <circle cx="100" cy="100" r="62" />
          <circle cx="100" cy="100" r="40" />
          <path d="M38 100h124M100 38v124" />
        </svg>
      );
  }
}

/**
 * Lazy image with a blurred LQIP layer, a cross-fade on load, responsive srcset
 * (with automatic retry without srcset) and a designed placeholder on failure.
 *
 * `hold` keeps the image out of the DOM (only the tiny LQIP shows), which is how the
 * gallery behind the hero avoids downloading 60 photos before anyone can see them.
 */
const ImageWithFallback = forwardRef(function ImageWithFallback(
  {
    src,
    alt = '',
    width,
    height,
    sizes = '(max-width: 767px) 80vw, 40vw',
    priority = false,
    className,
    imgClassName,
    label,
    accent,
    innerProps,
    onLoad,
    style,
    draggable = false,
    fit = 'cover',
    fallbackVariant = 'full', // 'full' | 'minimal' (motif only — for full-bleed heroes)
    hold = false, // keep only the LQIP: nothing is downloaded until this turns false
  },
  ref,
) {
  const variants = imageVariants(src);
  const [useSrcSet, setUseSrcSet] = useState(Boolean(variants.small));
  const [status, setStatus] = useState('loading');
  const imgRef = useRef(null);

  const hash = hashString(src || label || alt);
  const colorA = accent || PALETTE[hash % PALETTE.length];
  const colorB = PALETTE[(hash >> 3) % PALETTE.length];

  const setImg = useCallback(
    (node) => {
      imgRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  // Cached images may already be complete before React attaches onLoad.
  useLayoutEffect(() => {
    const img = imgRef.current;
    if (!img || !img.complete) return;
    if (img.naturalWidth > 0) setStatus('loaded');
  }, [src, useSrcSet]);

  const handleError = () => {
    if (useSrcSet) {
      setUseSrcSet(false);
      return;
    }
    setStatus('error');
  };

  const handleLoad = (e) => {
    setStatus('loaded');
    onLoad?.(e);
  };

  const srcSet = useSrcSet && variants.small ? `${variants.small} 800w, ${src} ${width || 1600}w` : undefined;

  return (
    <div
      className={[s.root, className].filter(Boolean).join(' ')}
      data-status={status}
      style={{ '--ph-a': colorA, '--ph-b': colorB, '--fit': fit, ...style }}
    >
      <div
        className={s.lqip}
        aria-hidden="true"
        style={variants.lqip && status !== 'error' ? { backgroundImage: `url("${variants.lqip}")` } : undefined}
      />
      {hold && status !== 'error' ? null : status === 'error' ? (
        <div
          className={[s.fallback, imgClassName].filter(Boolean).join(' ')}
          {...(alt ? { role: 'img', 'aria-label': alt } : { 'aria-hidden': 'true' })}
          {...innerProps}
        >
          <div className={s.motif}>
            <Motif variant={hash % 4} />
          </div>
          {fallbackVariant === 'full' ? (
            <span className={s.initials} aria-hidden="true">
              {toInitials(label || alt) || 'R'}
            </span>
          ) : null}
          {label && fallbackVariant === 'full' ? (
            <span className={s.caption} aria-hidden="true">
              {label}
            </span>
          ) : null}
        </div>
      ) : (
        <img
          key={useSrcSet ? 'set' : 'plain'}
          ref={setImg}
          className={[s.img, imgClassName].filter(Boolean).join(' ')}
          src={src}
          srcSet={srcSet}
          sizes={srcSet ? sizes : undefined}
          width={width}
          height={height}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : undefined}
          decoding="async"
          draggable={draggable}
          onLoad={handleLoad}
          onError={handleError}
          {...innerProps}
        />
      )}
    </div>
  );
});

export default ImageWithFallback;
