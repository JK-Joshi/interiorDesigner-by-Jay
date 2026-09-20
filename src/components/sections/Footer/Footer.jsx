import { useRef } from 'react';
import { Link } from 'react-router';
import { gsap, SplitText, useGSAP, MQ } from '../../../lib/gsap';
import { scrollToY } from '../../../lib/lenis';
import { isPlaceholder, mailHref, socialHref, telHref, whatsappHref } from '../../../lib/content';
import { useFontsReady } from '../../../hooks/useFontsReady';
import { site } from '../../../data/site';
import s from './Footer.module.css';

function MaybeLink({ href, children, external }) {
  if (!href) return <span className={s.placeholder}>{children}</span>;
  return (
    <a href={href} className={s.link} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
      <span className={s.linkText} data-text={typeof children === 'string' ? children : undefined}>
        {children}
      </span>
    </a>
  );
}

/**
 * Ink footer with an oversized wordmark revealed letter by letter.
 */
export default function Footer() {
  const rootRef = useRef(null);
  const markRef = useRef(null);
  const fontsReady = useFontsReady();
  const year = new Date().getFullYear();
  const { contact } = site;

  useGSAP(
    () => {
      if (!fontsReady) return undefined;
      const mark = markRef.current;
      const mm = gsap.matchMedia();
      mm.add({ motion: MQ.motion, reduce: MQ.reduce }, (ctx) => {
        if (ctx.conditions.reduce) {
          mark.classList.add('is-split');
          return undefined;
        }
        const split = SplitText.create(mark, { type: 'chars,words', mask: 'chars', aria: 'none' });
        mark.classList.add('is-split');
        gsap.from(split.chars, {
          yPercent: 105,
          duration: 1.2,
          stagger: { each: 0.035, from: 'start' },
          ease: 'rust.out',
          scrollTrigger: { trigger: mark, start: 'top 95%' },
        });
        gsap.fromTo('[data-footer-col]', { y: 40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.1, stagger: 0.08, ease: 'rust.out', scrollTrigger: { trigger: '[data-footer-grid]', start: 'top 88%' } });
        gsap.from('[data-footer-rule]', {
          scaleX: 0,
          duration: 1.4,
          ease: 'rust.inOut',
          scrollTrigger: { trigger: '[data-footer-rule]', start: 'top 95%' },
        });
        return () => split.revert();
      });
      return () => mm.revert();
    },
    { scope: rootRef, dependencies: [fontsReady] },
  );

  const toTop = () => {
    scrollToY(0, { duration: 2.2 });
    document.getElementById('main')?.focus({ preventScroll: true });
  };

  return (
    <footer ref={rootRef} className={`theme-dark ${s.footer}`}>
      <div className="container">
        <div className={s.grid} data-footer-grid="">
          <div className={s.col} data-footer-col="">
            <p className={s.lead}>
              Interiors with a quiet, <em>material-first</em> kind of luxury.
            </p>
            <Link to="/book" className={s.bigLink}>
              Book a consultation <span aria-hidden="true">→</span>
            </Link>
          </div>

          <div className={s.col} data-footer-col="">
            <h2 className={s.heading}>Studio</h2>
            <address className={s.address}>
              {contact.addressLines.map((line) => (
                <span key={line} className={isPlaceholder(line) ? s.placeholder : undefined}>
                  {line}
                </span>
              ))}
            </address>
          </div>

          <div className={s.col} data-footer-col="">
            <h2 className={s.heading}>Contact</h2>
            <ul className={s.list}>
              <li>
                <MaybeLink href={telHref(contact.phone)}>{contact.phone}</MaybeLink>
              </li>
              <li>
                <MaybeLink href={mailHref(contact.email)}>{contact.email}</MaybeLink>
              </li>
              <li>
                <MaybeLink href={whatsappHref(contact.whatsapp, 'Hello Rust Design Studio')} external>
                  WhatsApp
                </MaybeLink>
              </li>
              {site.social.map((item) => (
                <li key={item.label}>
                  <MaybeLink href={socialHref(item.href)} external>
                    {item.label}
                  </MaybeLink>
                </li>
              ))}
            </ul>
          </div>

          <div className={s.col} data-footer-col="">
            <h2 className={s.heading}>Hours</h2>
            <ul className={s.list}>
              {site.hours.map((h) => (
                <li key={h.days} className={s.hours}>
                  <span>{h.days}</span>
                  <span className={s.muted}>{h.time}</span>
                </li>
              ))}
            </ul>
            <h2 className={`${s.heading} ${s.spaced}`}>Explore</h2>
            <ul className={s.list}>
              <li>
                <Link to="/" state={{ scrollTo: 'projects' }} className={s.link}>
                  <span className={s.linkText}>Projects</span>
                </Link>
              </li>
              <li>
                <Link to="/about" className={s.link}>
                  <span className={s.linkText}>About Us</span>
                </Link>
              </li>
              <li>
                <Link to="/book" className={s.link}>
                  <span className={s.linkText}>Book an Appointment</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <span className={s.rule} data-footer-rule="" aria-hidden="true" />

        <div className={s.markWrap}>
          <p ref={markRef} className={s.wordmark} data-split="" aria-hidden="true">
            RUST DESIGN STUDIO
          </p>
        </div>

        <div className={s.bottom}>
          <p>
            © {year} {site.name}. All rights reserved.
          </p>
          <p className={s.muted}>
            Designed with intent in {site.city}, {site.region}.
          </p>
          <button type="button" className={s.top} onClick={toTop}>
            Back to top <span aria-hidden="true">↑</span>
          </button>
        </div>
      </div>
    </footer>
  );
}
