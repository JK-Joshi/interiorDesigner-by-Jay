import { useRef } from 'react';
import { gsap, useGSAP, MQ } from '../lib/gsap';
import { useAppState } from '../lib/appState';
import { isPlaceholder, mailHref, pad2, telHref, whatsappHref } from '../lib/content';
import { site } from '../data/site';
import Seo from '../components/Seo/Seo';
import RevealText from '../components/ui/RevealText';
import BookingForm from '../components/BookingForm/BookingForm';
import Footer from '../components/sections/Footer/Footer';
import s from './Book.module.css';

function ContactLine({ label, value, href, external }) {
  return (
    <div className={s.contactRow}>
      <dt>{label}</dt>
      <dd>
        {href ? (
          <a href={href} className={s.contactLink} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
            {value}
          </a>
        ) : (
          <span className={isPlaceholder(value) ? s.placeholder : undefined}>{value}</span>
        )}
      </dd>
    </div>
  );
}

export default function Book() {
  const rootRef = useRef(null);
  const introReady = useAppState((st) => st.introReady);
  const { contact } = site;

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add({ motion: MQ.motion, reduce: MQ.reduce }, (ctx) => {
        if (!introReady) {
          gsap.set('[data-book-fade], [data-form-card]', { autoAlpha: 0 });
          return;
        }
        const reduce = ctx.conditions.reduce;
        gsap.fromTo(
          '[data-book-fade]',
          { y: reduce ? 0 : 30, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: reduce ? 0.4 : 1.1, stagger: 0.08, delay: 0.5, ease: 'rust.out' },
        );
        gsap.fromTo(
          '[data-form-card]',
          { y: reduce ? 0 : 60, autoAlpha: 0, clipPath: reduce ? 'inset(0% 0% 0% 0%)' : 'inset(12% 0% 0% 0% round 24px)' },
          { y: 0, autoAlpha: 1, clipPath: 'inset(0% 0% 0% 0% round 24px)', duration: reduce ? 0.4 : 1.4, delay: 0.35, ease: 'rust.out', clearProps: 'clipPath,transform' },
        );
        if (!reduce) {
          gsap.fromTo('[data-expect-list]', { '--line': 0 }, { '--line': 1, duration: 1.4, delay: 0.8, ease: 'rust.inOut' });
        }
      });
      return () => mm.revert();
    },
    { scope: rootRef, dependencies: [introReady], revertOnUpdate: true },
  );

  return (
    <>
      <main id="main" tabIndex={-1} ref={rootRef} className={`page theme-bone ${s.page}`}>
        <Seo
          title="Book an Appointment"
          description="Book a design consultation with Rust Design Studio, Rajkot. A call, a site visit and a concept presentation — for homes, workplaces and hospitality spaces."
          path="/book"
        />
        <div className={`container ${s.grid}`}>
          <aside className={s.aside}>
            <div className={s.sticky}>
              <div className={s.info}>
                <RevealText as="p" className={`eyebrow ${s.eyebrow}`} immediate play={introReady} delay={0.2}>
                  Appointments · {site.city}
                </RevealText>
                <RevealText as="h1" className={`display ${s.title}`} immediate play={introReady} delay={0.3}>
                  Book a design <em>consultation</em>
                </RevealText>
                <p className={s.lead} data-book-fade="">
                  Tell us a little about your space. We’ll call you back within one working day to plan the next step.
                </p>

                <div className={s.expect} data-book-fade="">
                  <h2 className={s.subhead}>What to expect</h2>
                  <ol className={s.expectList} data-expect-list="">
                    {site.booking.expect.map((item, i) => (
                      <li key={item.title} className={s.expectItem}>
                        <span className={s.expectNum} aria-hidden="true">
                          {pad2(i + 1)}
                        </span>
                        <div>
                          <h3 className={s.expectTitle}>{item.title}</h3>
                          <p className={s.expectText}>{item.text}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className={s.details} data-book-fade="">
                  <h2 className={s.subhead}>Studio</h2>
                  <dl className={s.contact}>
                    <ContactLine label="Phone" value={contact.phone} href={telHref(contact.phone)} />
                    <ContactLine label="Email" value={contact.email} href={mailHref(contact.email)} />
                    <ContactLine
                      label="WhatsApp"
                      value={isPlaceholder(contact.whatsapp) ? contact.whatsapp : 'Message us'}
                      href={isPlaceholder(contact.whatsapp) ? null : whatsappHref(contact.whatsapp)}
                      external
                    />
                    <ContactLine label="Address" value={contact.address} />
                    {site.hours.map((h) => (
                      <ContactLine key={h.days} label={h.days} value={h.time} />
                    ))}
                  </dl>
                </div>

                <div className={s.map} data-book-fade="">
                  <iframe
                    title={`Map of ${contact.mapQuery}`}
                    src={`https://www.google.com/maps?q=${encodeURIComponent(contact.mapQuery)}&output=embed`}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>
            </div>
          </aside>

          <section className={s.formCol} aria-label="Consultation request form">
            <div className={s.formCard} data-form-card="">
              <BookingForm />
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
