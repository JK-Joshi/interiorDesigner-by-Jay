import { forwardRef, useRef } from 'react';
import { Link } from 'react-router';
import { useMagnetic } from '../../hooks/useMagnetic';
import s from './MagneticButton.module.css';

function Arrow() {
  return (
    <svg className={s.arrow} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 12h15M13 6l6 6-6 6" />
    </svg>
  );
}

/**
 * Magnetic pill button with a rolling label.
 * Renders a router <Link> (to), an <a> (href) or a <button>.
 */
const MagneticButton = forwardRef(function MagneticButton(
  { to, href, children, variant = 'solid', size = 'md', arrow = true, className, strength = 0.3, state, ...rest },
  forwardedRef,
) {
  const localRef = useRef(null);
  const ref = forwardedRef || localRef;
  useMagnetic(ref, { strength });

  const classes = [s.button, s[variant], s[size], className].filter(Boolean).join(' ');
  const content = (
    <span className={s.inner} data-magnetic-inner="">
      <span className={s.labelWrap}>
        <span className={s.label}>{children}</span>
        <span className={s.label} aria-hidden="true">
          {children}
        </span>
      </span>
      {arrow ? (
        <span className={s.iconWrap} aria-hidden="true">
          <Arrow />
          <Arrow />
        </span>
      ) : null}
    </span>
  );

  if (to) {
    return (
      <Link ref={ref} to={to} state={state} className={classes} {...rest}>
        {content}
      </Link>
    );
  }
  if (href) {
    return (
      <a ref={ref} href={href} className={classes} {...rest}>
        {content}
      </a>
    );
  }
  return (
    <button ref={ref} type="button" className={classes} {...rest}>
      {content}
    </button>
  );
});

export default MagneticButton;
