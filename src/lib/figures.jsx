/**
 * Playfair Display has no tabular figures ("1" is much narrower than "0"), so numbers
 * that change on screen would change width and nudge their neighbours (layout shift).
 *
 * - <Figures> / setFigures(): fixed-width digit cells for indicators like "02 / 08".
 * - <CountUp>: reserves the final value's width while a counter animates towards it,
 *   so the finished number keeps the font's natural spacing.
 */
const DIGIT = /\d/;

/** Renders `children` (a string or number) with one fixed-width cell per digit. */
export function Figures({ children, className, ref, ...rest }) {
  const text = String(children ?? '');
  return (
    <span ref={ref} className={className} {...rest}>
      {Array.from(text, (char, i) => (
        <span key={i} className={DIGIT.test(char) ? 'fig' : undefined}>
          {char}
        </span>
      ))}
    </span>
  );
}

/** Imperative counterpart for GSAP-driven counters (same markup as <Figures>). */
export function setFigures(el, value) {
  if (!el) return;
  const text = String(value);
  const chars = Array.from(text);
  const cells = el.children;
  if (cells.length !== chars.length) {
    el.replaceChildren(
      ...chars.map((char) => {
        const cell = document.createElement('span');
        if (DIGIT.test(char)) cell.className = 'fig';
        cell.textContent = char;
        return cell;
      }),
    );
    return;
  }
  chars.forEach((char, i) => {
    const cell = cells[i];
    if (cell.textContent !== char) cell.textContent = char;
    const cls = DIGIT.test(char) ? 'fig' : '';
    if (cell.className !== cls) cell.className = cls;
  });
}

/**
 * A counter slot: an invisible copy of `final` (a CSS pseudo-element, so it stays out of
 * the text content) holds the width, and the live value sits on top of it. Extra props
 * (e.g. data-count) go to the live element that GSAP updates.
 */
export function CountUp({ final, ...rest }) {
  return (
    <span className="count-box" data-final={final}>
      <span {...rest}>{final}</span>
    </span>
  );
}
