import { z } from 'zod';
import { site } from '../../data/site';

// Indian mobile numbers: optional +91 / 91 / 0 prefix, then 10 digits starting 6–9.
export const INDIAN_PHONE = /^(?:(?:\+|00)?91[\s-]?|0)?[6-9]\d{4}[\s-]?\d{5}$/;

export function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseISODate(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function isBookableDate(iso) {
  const date = parseISODate(iso);
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const max = new Date(today);
  max.setDate(max.getDate() + 120);
  return date > today && date <= max && !site.booking.closedWeekdays.includes(date.getDay());
}

const areaSchema = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? undefined : Number(String(v).replace(/,/g, ''))),
  z
    .number({ message: 'Enter the approximate area' })
    .int('Use a whole number')
    .min(100, 'Minimum 100 sq ft')
    .max(1000000, 'That seems too large — please check'),
);

export const bookingSchema = z.object({
  name: z.string().trim().min(2, 'Please tell us your name').max(80, 'That name is a little long'),
  phone: z.string().trim().regex(INDIAN_PHONE, 'Enter a valid Indian mobile number, e.g. 98765 43210'),
  email: z.string().trim().email('Enter a valid email address'),
  projectType: z.enum(site.booking.projectTypes, { message: 'Choose a project type' }),
  propertyType: z.string().min(1, 'Choose a property type'),
  area: areaSchema,
  city: z.string().trim().min(2, 'Where is the project?'),
  budget: z.enum(site.booking.budgets, { message: 'Choose a budget range' }),
  timeline: z.enum(site.booking.timelines, { message: 'Choose a timeline' }),
  date: z.string().min(1, 'Pick a preferred date').refine(isBookableDate, 'Choose an upcoming working day (Mon–Sat)'),
  timeSlot: z.enum(site.booking.timeSlots, { message: 'Pick a time slot' }),
  message: z.string().max(1200, 'Please keep it under 1200 characters').optional(),
  company: z.string().optional(),
});

export const STEPS = [
  { key: 'contact', title: 'About you', fields: ['name', 'phone', 'email'] },
  { key: 'project', title: 'The project', fields: ['projectType', 'propertyType', 'area', 'city'] },
  { key: 'plan', title: 'Budget & visit', fields: ['budget', 'timeline', 'date', 'timeSlot'] },
  { key: 'review', title: 'Review', fields: ['message'] },
];

export const DEFAULT_VALUES = {
  name: '',
  phone: '',
  email: '',
  projectType: undefined,
  propertyType: '',
  area: '',
  city: 'Rajkot',
  budget: undefined,
  timeline: undefined,
  date: '',
  timeSlot: undefined,
  message: '',
  company: '',
};
