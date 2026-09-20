/**
 * Helpers for rendering editable business content safely.
 * Values written as [PLACEHOLDER] render as plain text (never as broken links).
 */

export const isPlaceholder = (value) => typeof value === 'string' && /^\[[^\]]+\]$/.test(value.trim());

export function telHref(phone) {
  if (!phone || isPlaceholder(phone)) return null;
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

export function mailHref(email) {
  if (!email || isPlaceholder(email)) return null;
  return `mailto:${email}`;
}

export function whatsappHref(number, text = '') {
  const digits = number && !isPlaceholder(number) ? number.replace(/\D/g, '') : '';
  const query = text ? `?text=${encodeURIComponent(text)}` : '';
  // Without a real number wa.me opens WhatsApp and lets the visitor pick a chat.
  return digits ? `https://wa.me/${digits}${query}` : `https://wa.me/${query}`;
}

export function socialHref(url) {
  if (!url || /\[[^\]]+\]/.test(url)) return null;
  return url;
}

export const pad2 = (n) => String(n).padStart(2, '0');

export function formatINR(value) {
  return new Intl.NumberFormat('en-IN').format(value);
}

/** Deterministic hash → used for placeholder gradients, jitter seeds, etc. */
export function hashString(str = '') {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function initials(title = '') {
  return title
    .replace(/^the\s+/i, '')
    .split(/[\s&]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}
