import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router';
import { gsap, refreshScrollTriggers, useGSAP } from '../../lib/gsap';
import { formatINR, pad2 } from '../../lib/content';
import { submitBooking, whatsappBookingUrl, formatDate, bookingProvider } from '../../lib/submitBooking';
import { site } from '../../data/site';
import { bookingSchema, DEFAULT_VALUES, STEPS } from './schema';
import DatePicker from './DatePicker';
import MagneticButton from '../ui/MagneticButton';
import s from './BookingForm.module.css';

const CITIES = ['Rajkot', 'Ahmedabad', 'Surat', 'Vadodara', 'Jamnagar', 'Bhavnagar', 'Junagadh', 'Gandhinagar', 'Morbi', 'Gondal'];

const TYPE_ICONS = {
  Residential: 'M6 22 L20 10 L34 22 M10 19 V34 H30 V19 M17 34 V25 H23 V34',
  Commercial: 'M8 34 V8 H24 V34 M24 16 H32 V34 M4 34 H36 M12 13 H14 M18 13 H20 M12 19 H14 M18 19 H20 M12 25 H14 M18 25 H20',
  Hospitality: 'M6 26 H34 M8 26 V20 A12 12 0 0 1 32 20 V26 M20 8 V11 M4 30 H36',
  Other: 'M20 6 L23 16 L34 16 L25 22 L28 33 L20 26 L12 33 L15 22 L6 16 L17 16 Z',
};

function Field({ id, label, error, hint, children, className }) {
  return (
    <div className={[s.field, className].filter(Boolean).join(' ')} data-field="" data-invalid={error ? '' : undefined}>
      <label htmlFor={id} className={s.label}>
        {label}
      </label>
      {children}
      {hint && !error ? (
        <p id={`${id}-hint`} className={s.hint}>
          {hint}
        </p>
      ) : null}
      <p id={`${id}-error`} className={s.error} role={error ? 'alert' : undefined}>
        {error?.message || ''}
      </p>
    </div>
  );
}

function ChoiceGroup({ name, legend, options, register, error, variant = 'chip', icons }) {
  const id = useId();
  return (
    <fieldset className={s.fieldset} data-field="" data-invalid={error ? '' : undefined} aria-describedby={`${id}-error`}>
      <legend className={s.label}>{legend}</legend>
      <div className={variant === 'card' ? s.cards : s.chips}>
        {options.map((option) => (
          <label key={option} className={variant === 'card' ? s.card : s.chip}>
            <input type="radio" value={option} className={s.radio} {...register(name)} />
            <span className={s.choiceFace}>
              {icons?.[option] ? (
                <svg className={s.cardIcon} viewBox="0 0 40 40" aria-hidden="true">
                  <path d={icons[option]} />
                </svg>
              ) : null}
              <span className={s.choiceText}>{option}</span>
              {variant === 'card' ? <span className={s.cardCheck} aria-hidden="true" /> : null}
            </span>
          </label>
        ))}
      </div>
      <p id={`${id}-error`} className={s.error} role={error ? 'alert' : undefined}>
        {error?.message || ''}
      </p>
    </fieldset>
  );
}

function SuccessMark() {
  return (
    <svg className={s.check} viewBox="0 0 120 120" aria-hidden="true">
      <path data-check="" d="M60 8 C 30 6, 8 28, 9 58 C 10 90, 34 112, 62 111 C 92 110, 113 86, 111 57 C 110 30, 88 9, 57 9" />
      <path data-check="" d="M36 62 L 52 78 L 86 42" />
      <path data-check="" d="M28 100 C 50 106, 80 106, 98 96" />
    </svg>
  );
}

function Summary({ values }) {
  const rows = [
    ['Name', values.name],
    ['Phone', values.phone],
    ['Email', values.email],
    ['Project', [values.projectType, values.propertyType].filter(Boolean).join(' · ')],
    ['Area', values.area ? `${formatINR(Number(String(values.area).replace(/,/g, '')))} sq ft` : ''],
    ['Location', values.city],
    ['Budget', values.budget],
    ['Timeline', values.timeline],
    ['Visit', values.date ? `${formatDate(values.date)}${values.timeSlot ? ` · ${values.timeSlot}` : ''}` : ''],
  ];
  return (
    <dl className={s.summary}>
      {rows.map(([k, v]) => (
        <div key={k} className={s.summaryRow}>
          <dt>{k}</dt>
          <dd>{v || '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Four-step consultation form (react-hook-form + zod) with GSAP step slides,
 * gentle error shakes, pluggable submission and an always-available WhatsApp path.
 */
export default function BookingForm() {
  const rootRef = useRef(null);
  const stepRef = useRef(null);
  const progressRef = useRef(null);
  const direction = useRef(1);
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState('idle'); // idle | submitting | success | unconfigured | error
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(null);
  const provider = bookingProvider();

  const {
    register,
    control,
    handleSubmit,
    trigger,
    getFieldState,
    setFocus,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(bookingSchema),
    mode: 'onTouched',
    reValidateMode: 'onChange',
    defaultValues: DEFAULT_VALUES,
    shouldFocusError: false,
  });

  const values = useWatch({ control });
  const { contextSafe } = useGSAP({ scope: rootRef });

  // Progress line.
  useGSAP(
    () => {
      gsap.to(progressRef.current, {
        scaleX: step / (STEPS.length - 1),
        duration: 0.9,
        ease: 'rust.inOut',
      });
      gsap.to('[data-step-dot]', {
        scale: (i) => (i <= step ? 1 : 0.6),
        backgroundColor: (i) => (i <= step ? '#b7472a' : 'rgba(26, 23, 20, 0.2)'),
        duration: 0.5,
        stagger: 0.04,
        ease: 'rust.out',
      });
    },
    { scope: rootRef, dependencies: [step] },
  );

  // Slide the new step in.
  useLayoutEffect(() => {
    if (!stepRef.current || status === 'success' || status === 'unconfigured') return undefined;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tween = gsap.fromTo(
      stepRef.current.children,
      { x: reduce ? 0 : 60 * direction.current, autoAlpha: 0 },
      { x: 0, autoAlpha: 1, duration: reduce ? 0.2 : 0.8, stagger: reduce ? 0 : 0.05, ease: 'rust.out', clearProps: 'transform' },
    );
    refreshScrollTriggers(200);
    return () => tween.kill();
  }, [step, status]);

  const shake = contextSafe(() => {
    const invalid = rootRef.current.querySelectorAll('[data-field][data-invalid]');
    if (!invalid.length) return;
    gsap.fromTo(
      invalid,
      { x: 0 },
      { x: 7, duration: 0.07, repeat: 5, yoyo: true, ease: 'sine.inOut', clearProps: 'x' },
    );
  });

  const goTo = contextSafe(async (next) => {
    if (next === step) return;
    if (next > step) {
      const fields = STEPS.slice(step, next).flatMap((st) => st.fields);
      const ok = await trigger(fields, { shouldFocus: false });
      if (!ok) {
        requestAnimationFrame(shake);
        const firstInvalid = fields.find((f) => getFieldState(f).invalid) || fields[0];
        try {
          setFocus(firstInvalid);
        } catch {
          /* custom controls can't always take focus */
        }
        return;
      }
    }
    direction.current = next > step ? 1 : -1;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    gsap.to(stepRef.current.children, {
      x: reduce ? 0 : -50 * direction.current,
      autoAlpha: 0,
      duration: reduce ? 0.15 : 0.45,
      stagger: 0.03,
      ease: 'rust.in',
      onComplete: () => {
        setStep(next);
        rootRef.current?.querySelector('[data-step-heading]')?.focus({ preventScroll: true });
      },
    });
  });

  const onValid = async (data) => {
    setStatus('submitting');
    setSubmitError('');
    try {
      const result = await submitBooking(data);
      setSubmitted(data);
      setStatus(result.ok ? 'success' : 'unconfigured');
    } catch (error) {
      setSubmitError(error.message || 'Something went wrong. Please try again.');
      setStatus('error');
    }
  };

  const onInvalid = (formErrors) => {
    const firstStep = STEPS.findIndex((st) => st.fields.some((f) => formErrors[f]));
    if (firstStep >= 0 && firstStep !== step) {
      direction.current = -1;
      setStep(firstStep);
    }
    requestAnimationFrame(shake);
  };

  // Success sketch.
  useEffect(() => {
    if (status !== 'success' && status !== 'unconfigured') return;
    const ctx = gsap.context(() => {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      gsap.fromTo(
        '[data-result] > *',
        { y: reduce ? 0 : 30, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: reduce ? 0.2 : 1, stagger: 0.08, ease: 'rust.out' },
      );
      gsap.fromTo(
        '[data-check]',
        { drawSVG: reduce ? '100%' : '0%' },
        { drawSVG: '100%', duration: reduce ? 0 : 1.1, stagger: 0.35, ease: 'rust.inOut', delay: 0.2 },
      );
    }, rootRef);
    rootRef.current?.querySelector('[data-result-heading]')?.focus({ preventScroll: true });
    refreshScrollTriggers(200);
    return () => ctx.revert();
  }, [status]);

  const whatsappUrl = whatsappBookingUrl(submitted || values);
  const current = STEPS[step];
  const describe = (name, hint) => [errors[name] ? `${name}-error` : null, hint ? `${name}-hint` : null].filter(Boolean).join(' ') || undefined;

  if (status === 'success' || status === 'unconfigured') {
    const ok = status === 'success';
    return (
      <div ref={rootRef} className={s.result} data-result="" aria-live="polite">
        <SuccessMark />
        <h2 className={s.resultTitle} tabIndex={-1} data-result-heading="">
          {ok ? (
            <>
              Thank you — <em>we’ll call you within 24 hours.</em>
            </>
          ) : (
            <>
              Almost there — <em>send it on WhatsApp.</em>
            </>
          )}
        </h2>
        <p className={s.resultText}>
          {ok
            ? 'Your request has reached the studio. Here is a copy of what you shared:'
            : 'Online booking is not connected yet, so your request has not been sent. Tap the button below to send the same details to the studio on WhatsApp.'}
        </p>
        <Summary values={submitted || values} />
        <div className={s.actions}>
          <MagneticButton href={whatsappUrl} target="_blank" rel="noopener noreferrer" variant={ok ? 'outlineDark' : 'solid'}>
            Send via WhatsApp
          </MagneticButton>
          <MagneticButton to="/" variant="outlineDark" arrow={false}>
            Back to home
          </MagneticButton>
        </div>
      </div>
    );
  }

  return (
    <form ref={rootRef} className={s.form} onSubmit={handleSubmit(onValid, onInvalid)} noValidate aria-describedby="form-intro">
      <p id="form-intro" className="visually-hidden">
        A four-step form. Fields marked with an asterisk are required.
      </p>

      <div className={s.progressWrap}>
        <span className={s.progressTrack} aria-hidden="true">
          <span ref={progressRef} className={s.progressFill} />
        </span>
        <ol className={s.progress} aria-label="Form progress">
          {STEPS.map((st, i) => (
            <li key={st.key} className={s.progressStep} aria-current={i === step ? 'step' : undefined}>
              <button
                type="button"
                className={s.progressButton}
                onClick={() => (i < step ? goTo(i) : undefined)}
                disabled={i >= step}
                aria-label={`Step ${i + 1}: ${st.title}${i < step ? ' (completed — edit)' : ''}`}
              >
                <span className={s.progressDot} data-step-dot="" />
                <span className={s.progressLabel}>
                  <span className={s.progressNum}>{pad2(i + 1)}</span> {st.title}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </div>

      <div className={s.stepHead}>
        <p className={s.stepCount}>
          Step {step + 1} of {STEPS.length}
        </p>
        <h2 className={s.stepTitle} tabIndex={-1} data-step-heading="">
          {current.title}
        </h2>
      </div>

      {/* Honeypot (hidden from people and assistive tech) */}
      <div className={s.honeypot} aria-hidden="true">
        <label htmlFor="company">Company</label>
        <input id="company" type="text" tabIndex={-1} autoComplete="off" {...register('company')} />
      </div>

      <div ref={stepRef} className={s.step} key={current.key}>
        {step === 0 ? (
          <>
            <Field id="name" label="Full name *" error={errors.name}>
              <input
                id="name"
                className={s.input}
                type="text"
                autoComplete="name"
                aria-invalid={Boolean(errors.name)}
                aria-describedby={describe('name')}
                {...register('name')}
              />
            </Field>
            <Field id="phone" label="Mobile number *" error={errors.phone} hint="Indian mobile, e.g. +91 98765 43210">
              <input
                id="phone"
                className={s.input}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                aria-invalid={Boolean(errors.phone)}
                aria-describedby={describe('phone', true)}
                {...register('phone')}
              />
            </Field>
            <Field id="email" label="Email *" error={errors.email}>
              <input
                id="email"
                className={s.input}
                type="email"
                autoComplete="email"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={describe('email')}
                {...register('email')}
              />
            </Field>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <ChoiceGroup
              name="projectType"
              legend="Project type *"
              options={site.booking.projectTypes}
              register={register}
              error={errors.projectType}
              variant="card"
              icons={TYPE_ICONS}
            />
            <div className={s.row}>
              <Field id="propertyType" label="Property type *" error={errors.propertyType}>
                <select
                  id="propertyType"
                  className={`${s.input} ${s.select}`}
                  aria-invalid={Boolean(errors.propertyType)}
                  aria-describedby={describe('propertyType')}
                  {...register('propertyType')}
                >
                  <option value="">Select…</option>
                  {site.booking.propertyTypes.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </Field>
              <Field id="area" label="Approx. area *" error={errors.area}>
                <div className={s.suffixWrap}>
                  <input
                    id="area"
                    className={s.input}
                    type="text"
                    inputMode="numeric"
                    placeholder="2400"
                    aria-invalid={Boolean(errors.area)}
                    aria-describedby={describe('area')}
                    {...register('area')}
                  />
                  <span className={s.suffix} aria-hidden="true">
                    sq ft
                  </span>
                </div>
              </Field>
            </div>
            <Field id="city" label="Location / city *" error={errors.city}>
              <input
                id="city"
                className={s.input}
                type="text"
                list="city-options"
                autoComplete="address-level2"
                aria-invalid={Boolean(errors.city)}
                aria-describedby={describe('city')}
                {...register('city')}
              />
              <datalist id="city-options">
                {CITIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <ChoiceGroup name="budget" legend="Budget range (INR) *" options={site.booking.budgets} register={register} error={errors.budget} />
            <ChoiceGroup name="timeline" legend="When would you like to start? *" options={site.booking.timelines} register={register} error={errors.timeline} />
            <div className={s.field} data-field="" data-invalid={errors.date ? '' : undefined}>
              <p id="date-label" className={s.label}>
                Preferred date for a call or site visit *
              </p>
              <Controller
                control={control}
                name="date"
                render={({ field }) => (
                  <DatePicker
                    value={field.value}
                    onChange={(v) => field.onChange(v)}
                    onBlur={field.onBlur}
                    invalid={Boolean(errors.date)}
                    labelledBy="date-label"
                    describedBy={errors.date ? 'date-error' : undefined}
                  />
                )}
              />
              <p id="date-error" className={s.error} role={errors.date ? 'alert' : undefined}>
                {errors.date?.message || ''}
              </p>
            </div>
            <ChoiceGroup name="timeSlot" legend="Preferred time *" options={site.booking.timeSlots} register={register} error={errors.timeSlot} />
          </>
        ) : null}

        {step === 3 ? (
          <>
            <Field id="message" label="Anything else we should know?" error={errors.message} hint="Rooms, styles you love, references, constraints…">
              <textarea
                id="message"
                className={`${s.input} ${s.textarea}`}
                rows={5}
                aria-invalid={Boolean(errors.message)}
                aria-describedby={describe('message', true)}
                {...register('message')}
              />
            </Field>
            <div className={s.review}>
              <p className={s.reviewTitle}>Your request</p>
              <Summary values={values} />
            </div>
            {status === 'error' ? (
              <p className={s.submitError} role="alert">
                {submitError} You can also send your request on WhatsApp.
              </p>
            ) : null}
            {!provider ? (
              <p className={s.notice}>
                Online submission isn’t configured yet — you can send this request directly on WhatsApp.
              </p>
            ) : null}
          </>
        ) : null}
      </div>

      <div className={s.nav}>
        {step > 0 ? (
          <button type="button" className={s.back} onClick={() => goTo(step - 1)}>
            ← Back
          </button>
        ) : (
          <Link to="/" className={s.back}>
            ← Home
          </Link>
        )}
        <div className={s.navRight}>
          {step === STEPS.length - 1 ? (
            <>
              <a className={s.whatsapp} href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3Zm0 16.3a7.3 7.3 0 0 1-3.7-1l-.3-.2-2.7.7.7-2.6-.2-.3A7.3 7.3 0 1 1 12 19.3Zm4-5.4c-.2-.1-1.3-.7-1.5-.7s-.4-.1-.5.1-.6.7-.7.9-.3.2-.5.1a6 6 0 0 1-3-2.6c-.2-.4.2-.4.6-1.2.1-.1 0-.3 0-.4l-.7-1.6c-.2-.4-.4-.4-.5-.4h-.4a.8.8 0 0 0-.6.3 2.4 2.4 0 0 0-.8 1.8 4.3 4.3 0 0 0 .9 2.2 9.6 9.6 0 0 0 3.7 3.3c1.4.6 1.9.6 2.6.5a2.2 2.2 0 0 0 1.4-1c.2-.5.2-.9.1-1l-.4-.3Z" />
                </svg>
                Send via WhatsApp
              </a>
              <button type="submit" className={s.submit} disabled={status === 'submitting'} aria-busy={status === 'submitting'}>
                <span className={s.submitLabel}>{status === 'submitting' ? 'Sending…' : provider ? 'Request consultation' : 'Submit'}</span>
                {status === 'submitting' ? <span className={s.spinner} aria-hidden="true" /> : <span aria-hidden="true">→</span>}
              </button>
            </>
          ) : (
            <button type="button" className={s.submit} onClick={() => goTo(step + 1)}>
              <span className={s.submitLabel}>Continue</span>
              <span aria-hidden="true">→</span>
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
