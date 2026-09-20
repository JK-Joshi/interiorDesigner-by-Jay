/**
 * Pluggable booking submission.
 *   1. Formspree  — when VITE_FORMSPREE_ID is set
 *   2. EmailJS    — when VITE_EMAILJS_SERVICE_ID, _TEMPLATE_ID and _PUBLIC_KEY are set
 *   3. Otherwise  — { ok: false, reason: 'not-configured' } (the UI offers WhatsApp)
 * A WhatsApp deep link with a formatted message is always available.
 */
import { site } from '../data/site';
import { formatINR, whatsappHref } from './content';

export class BookingError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'BookingError';
    this.cause = cause;
  }
}

export function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

export function formatBookingMessage(data = {}) {
  const lines = [
    `Hello ${site.name}! I'd like to book a design consultation.`,
    '',
    `*Name:* ${data.name || '—'}`,
    `*Phone:* ${data.phone || '—'}`,
    `*Email:* ${data.email || '—'}`,
    '',
    `*Project:* ${[data.projectType, data.propertyType].filter(Boolean).join(' — ') || '—'}`,
    `*Area:* ${data.area ? `${formatINR(Number(data.area))} sq ft` : '—'}`,
    `*Location:* ${data.city || '—'}`,
    `*Budget:* ${data.budget || '—'}`,
    `*Timeline:* ${data.timeline || '—'}`,
    `*Preferred slot:* ${data.date ? `${formatDate(data.date)}${data.timeSlot ? ` at ${data.timeSlot}` : ''}` : '—'}`,
  ];
  if (data.message) lines.push('', `*Notes:* ${data.message}`);
  return lines.join('\n');
}

export function whatsappBookingUrl(data) {
  return whatsappHref(site.contact.whatsapp, formatBookingMessage(data));
}

export function bookingProvider() {
  const env = import.meta.env;
  if (env.VITE_FORMSPREE_ID) return 'formspree';
  if (env.VITE_EMAILJS_SERVICE_ID && env.VITE_EMAILJS_TEMPLATE_ID && env.VITE_EMAILJS_PUBLIC_KEY) return 'emailjs';
  return null;
}

async function postJSON(url, body, headers = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    return await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    throw new BookingError(
      error.name === 'AbortError' ? 'The request timed out. Please try again or use WhatsApp.' : 'Network error. Please check your connection.',
      error,
    );
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @param {object} data validated booking form values
 * @returns {Promise<{ok: true, provider: string} | {ok: false, reason: 'not-configured'}>}
 */
export async function submitBooking(data) {
  // Honeypot: bots fill hidden fields — pretend success and drop the request.
  if (data.company) return { ok: true, provider: 'honeypot' };

  const env = import.meta.env;
  const { company: _company, ...clean } = data;
  const payload = {
    ...clean,
    preferredDate: formatDate(clean.date),
    summary: formatBookingMessage(clean),
    submittedAt: new Date().toISOString(),
    source: typeof window !== 'undefined' ? window.location.href : 'website',
  };

  const provider = bookingProvider();

  if (provider === 'formspree') {
    const res = await postJSON(`https://formspree.io/f/${env.VITE_FORMSPREE_ID}`, {
      ...payload,
      _subject: `New consultation request — ${clean.name}`,
      _replyto: clean.email,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new BookingError(body?.errors?.[0]?.message || `Formspree error (${res.status}).`);
    }
    return { ok: true, provider };
  }

  if (provider === 'emailjs') {
    const res = await postJSON('https://api.emailjs.com/api/v1.0/email/send', {
      service_id: env.VITE_EMAILJS_SERVICE_ID,
      template_id: env.VITE_EMAILJS_TEMPLATE_ID,
      user_id: env.VITE_EMAILJS_PUBLIC_KEY,
      template_params: payload,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new BookingError(text || `EmailJS error (${res.status}).`);
    }
    return { ok: true, provider };
  }

  return { ok: false, reason: 'not-configured' };
}
