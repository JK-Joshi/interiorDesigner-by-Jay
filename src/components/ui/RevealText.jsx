import { useRef } from 'react';
import { useSplitReveal } from '../../hooks/useSplitReveal';

/**
 * Text that rises line-by-line (or word / char) out of a mask.
 *   <RevealText as="h2" className="display">Spaces that <em>breathe</em></RevealText>
 *
 * `immediate` plays without a ScrollTrigger (use `play` to gate it).
 */
export default function RevealText({
  as: Tag = 'p',
  children,
  className,
  type = 'lines',
  delay = 0,
  stagger,
  duration,
  start,
  scroller,
  trigger,
  immediate = false,
  play = true,
  ...rest
}) {
  const ref = useRef(null);
  useSplitReveal(ref, {
    type,
    delay,
    stagger,
    duration,
    start,
    scroller,
    trigger: immediate ? false : trigger,
    play,
  });
  return (
    <Tag ref={ref} className={className} data-split="" {...rest}>
      {children}
    </Tag>
  );
}
