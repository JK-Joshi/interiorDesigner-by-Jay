import { Children, Fragment } from 'react';

/**
 * Cormorant Garamond Italic leaves a visible gap after "W" at display sizes ("W orks").
 * This wraps such W's in a span that tightens the pair. Only plain string children are
 * processed; nested elements are left untouched. (Playfair Display kerns these pairs
 * itself — don't use this on display-font text.)
 */
export function kernW(children, className = 'kern-w-serif') {
  return Children.map(children, (child, index) => {
    if (typeof child !== 'string' || !/W(?=[a-z])/.test(child)) return child;
    const parts = child.split(/(W(?=[a-z]))/);
    return (
      <Fragment key={index}>
        {parts.map((part, i) =>
          part === 'W' ? (
            <span key={i} className={className}>
              W
            </span>
          ) : (
            part
          ),
        )}
      </Fragment>
    );
  });
}

