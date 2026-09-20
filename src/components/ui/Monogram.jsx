/**
 * The studio's "R" monogram (Didone-inspired, high contrast).
 * `variant="outline"` renders stroke-only paths so DrawSVG can sketch it.
 */
export const MONOGRAM_PATHS = [
  'M18 14h7v36h-7z',
  'M13.5 14h16v1.6h-16zM13.5 48.4h16V50h-16z',
  'M25 14h8c8.5 0 13 4 13 9.5S41.5 33 33 33h-8v-1.4h7c5.5 0 7.6-3.1 7.6-8.1s-2.1-8.1-7.6-8.1h-7z',
  'M29.5 32.2h6.3l9.7 16.2h3V50h-8.3z',
];

export default function Monogram({ className, title, variant = 'solid', pathProps, ...rest }) {
  const outline = variant === 'outline';
  return (
    <svg
      className={className}
      viewBox="10 10 42 44"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : 'true'}
      focusable="false"
      {...rest}
    >
      {MONOGRAM_PATHS.map((d) => (
        <path
          key={d}
          d={d}
          fill={outline ? 'none' : 'currentColor'}
          stroke={outline ? 'currentColor' : 'none'}
          strokeWidth={outline ? 0.6 : 0}
          strokeLinejoin="round"
          {...pathProps}
        />
      ))}
    </svg>
  );
}
