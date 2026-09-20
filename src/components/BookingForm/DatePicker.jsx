import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { gsap, useGSAP } from '../../lib/gsap';
import { isBookableDate, parseISODate, toISODate } from './schema';
import s from './BookingForm.module.css';

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const monthLabel = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' });
const dayLabel = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function firstBookable() {
  let d = addDays(new Date(), 1);
  for (let i = 0; i < 10 && !isBookableDate(toISODate(d)); i += 1) d = addDays(d, 1);
  return d;
}

/**
 * Lightweight, accessible calendar (no library).
 * Arrow keys move by day/week, PageUp/PageDown by month, Home/End to week edges,
 * Enter/Space selects. Past dates, Sundays and dates beyond 120 days are disabled.
 */
export default function DatePicker({ value, onChange, onBlur, invalid, describedBy, labelledBy }) {
  const selected = parseISODate(value);
  const [view, setView] = useState(() => startOfMonth(selected || firstBookable()));
  const [focusDate, setFocusDate] = useState(() => selected || firstBookable());
  const gridRef = useRef(null);
  const shouldFocus = useRef(false);
  const direction = useRef(0);
  const headingId = useId();

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);
  const minMonth = startOfMonth(today);
  const maxMonth = startOfMonth(addDays(today, 120));

  const weeks = useMemo(() => {
    const first = startOfMonth(view);
    const offset = (first.getDay() + 6) % 7; // Monday first
    const start = addDays(first, -offset);
    return Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)));
  }, [view]);

  useGSAP(
    () => {
      if (!direction.current) return;
      gsap.fromTo(
        gridRef.current,
        { xPercent: direction.current * 8, autoAlpha: 0 },
        { xPercent: 0, autoAlpha: 1, duration: 0.5, ease: 'rust.out' },
      );
    },
    { dependencies: [view.getTime()], scope: gridRef },
  );

  useEffect(() => {
    if (!shouldFocus.current) return;
    shouldFocus.current = false;
    const iso = toISODate(focusDate);
    gridRef.current?.querySelector(`[data-date="${iso}"]`)?.focus();
  }, [focusDate, view]);

  const changeMonth = (delta) => {
    const next = new Date(view.getFullYear(), view.getMonth() + delta, 1);
    if (next < minMonth || next > maxMonth) return;
    direction.current = delta;
    setView(next);
  };

  const moveFocus = (date) => {
    shouldFocus.current = true;
    setFocusDate(date);
    if (date.getMonth() !== view.getMonth() || date.getFullYear() !== view.getFullYear()) {
      direction.current = date > view ? 1 : -1;
      setView(startOfMonth(date));
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      const iso = e.target?.dataset?.date;
      if (iso) {
        e.preventDefault();
        pick(parseISODate(iso));
      }
      return;
    }
    const map = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };
    if (map[e.key] !== undefined) {
      e.preventDefault();
      moveFocus(addDays(focusDate, map[e.key]));
    } else if (e.key === 'PageUp' || e.key === 'PageDown') {
      e.preventDefault();
      const d = new Date(focusDate);
      d.setMonth(d.getMonth() + (e.key === 'PageUp' ? -1 : 1));
      moveFocus(d);
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      const dow = (focusDate.getDay() + 6) % 7;
      moveFocus(addDays(focusDate, e.key === 'Home' ? -dow : 6 - dow));
    }
  };

  const pick = (date) => {
    const iso = toISODate(date);
    if (!isBookableDate(iso)) return;
    setFocusDate(date);
    onChange(iso);
  };

  const focusIso = toISODate(focusDate);
  const inView = focusDate.getMonth() === view.getMonth() && focusDate.getFullYear() === view.getFullYear();
  const tabbableIso =
    inView && isBookableDate(focusIso)
      ? focusIso
      : toISODate(
          weeks.flat().find((d) => d.getMonth() === view.getMonth() && isBookableDate(toISODate(d))) || focusDate,
        );

  return (
    <div className={s.calendar} data-invalid={invalid || undefined} onBlur={onBlur}>
      <div className={s.calHead}>
        <button
          type="button"
          className={s.calNav}
          onClick={() => changeMonth(-1)}
          disabled={view <= minMonth}
          aria-label="Previous month"
        >
          ←
        </button>
        <p id={headingId} className={s.calTitle} aria-live="polite">
          {monthLabel.format(view)}
        </p>
        <button
          type="button"
          className={s.calNav}
          onClick={() => changeMonth(1)}
          disabled={view >= maxMonth}
          aria-label="Next month"
        >
          →
        </button>
      </div>
      <div
        ref={gridRef}
        className={s.calGrid}
        role="grid"
        aria-labelledby={`${labelledBy || ''} ${headingId}`.trim()}
        aria-describedby={describedBy}
        onKeyDown={onKeyDown}
      >
        <div role="row" className={s.calRow}>
          {WEEKDAYS.map((d) => (
            <span key={d} role="columnheader" className={s.calWeekday} aria-label={d}>
              {d}
            </span>
          ))}
        </div>
        {weeks.map((week) => (
          <div role="row" key={toISODate(week[0])} className={s.calRow}>
            {week.map((date) => {
              const iso = toISODate(date);
              const outside = date.getMonth() !== view.getMonth();
              const bookable = isBookableDate(iso);
              const isSelected = value === iso;
              const isToday = date.getTime() === today.getTime();
              return (
                <span role="gridcell" key={iso} aria-selected={isSelected}>
                  <button
                    type="button"
                    data-date={iso}
                    className={s.calDay}
                    data-outside={outside || undefined}
                    data-selected={isSelected || undefined}
                    data-today={isToday || undefined}
                    aria-disabled={!bookable || undefined}
                    tabIndex={iso === tabbableIso ? 0 : -1}
                    aria-label={`${dayLabel.format(date)}${bookable ? '' : ' (unavailable)'}`}
                    onClick={() => pick(date)}
                    onFocus={() => setFocusDate(date)}
                  >
                    {date.getDate()}
                  </button>
                </span>
              );
            })}
          </div>
        ))}
      </div>
      <p className={s.calNote}>Sundays by appointment only · earliest visit tomorrow</p>
    </div>
  );
}
