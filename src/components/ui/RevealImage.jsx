import { useRef } from 'react';
import { useImageReveal } from '../../hooks/useImageReveal';
import ImageWithFallback from './ImageWithFallback';
import s from './RevealImage.module.css';

/**
 * Clip-path + scale + brightness entrance, with scroll parallax on the inner layer.
 */
export default function RevealImage({
  src,
  alt,
  width,
  height,
  ratio,
  className,
  imgClassName,
  sizes,
  priority,
  label,
  accent,
  parallax = true,
  parallaxAmount,
  delay = 0,
  direction = 'up',
  start,
  scroller,
  trigger,
  play = true,
  as: Tag = 'figure',
  children,
  fallbackVariant,
  ...rest
}) {
  const ref = useRef(null);
  useImageReveal(ref, { parallax, parallaxAmount, delay, direction, start, scroller, trigger, play });
  const aspectRatio = ratio ?? (width && height ? `${width} / ${height}` : undefined);

  return (
    <Tag ref={ref} className={[s.figure, className].filter(Boolean).join(' ')} style={{ aspectRatio }} {...rest}>
      <div className={parallax ? `${s.layer} ${s.oversized}` : s.layer} data-parallax={parallax ? '' : undefined}>
        <ImageWithFallback
          src={src}
          alt={alt}
          width={width}
          height={height}
          sizes={sizes}
          priority={priority}
          label={label}
          accent={accent}
          imgClassName={imgClassName}
          fallbackVariant={fallbackVariant}
          innerProps={{ 'data-reveal-inner': '' }}
        />
      </div>
      {children}
    </Tag>
  );
}
