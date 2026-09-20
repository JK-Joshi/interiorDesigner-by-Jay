/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  RUST DESIGN STUDIO — SITE CONTENT
 *  Edit everything here. Values in [SQUARE_BRACKETS] are placeholders: they are
 *  rendered as plain text (never as links) until you replace them.
 *  Numbers marked "placeholder" should be confirmed by the studio.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const site = {
  name: 'Rust Design Studio',
  shortName: 'Rust',
  monogram: 'R',
  tagline: 'From a pencil sketch to a finished space.',
  description:
    'Rust Design Studio is a luxury interior design practice in Rajkot, Gujarat, shaping residential, commercial and hospitality spaces with a quiet, material-first kind of luxury.',
  // Public URL — also set VITE_SITE_URL in .env for canonical / OG tags.
  url: import.meta.env?.VITE_SITE_URL || 'https://www.rustdesignstudio.example',
  foundedYear: '[YEAR]',
  experience: '12+ years',
  city: 'Rajkot',
  region: 'Gujarat',
  country: 'India',
  timezone: 'Asia/Kolkata',
  ogImage: '/og-image.jpg',

  founder: {
    name: '[FOUNDER_NAME]',
    title: 'Founder & Principal Designer',
    portrait: '/images/studio/founder.jpg',
    quote:
      'A room should feel inevitable — as if the light, the stone and the people who live there had always belonged together.',
    bio: [
      'Trained as an architect and shaped by twelve years of site work across Gujarat, [FOUNDER_NAME] founded Rust Design Studio to practise a slower, more deliberate kind of interior design.',
      'Every project begins in the same way: listening, then a pencil sketch. The studio still draws every first idea by hand before a single line is drafted on screen.',
    ],
  },

  contact: {
    phone: '[STUDIO_PHONE]',
    whatsapp: '[STUDIO_WHATSAPP]', // digits with country code, e.g. 91XXXXXXXXXX
    email: '[STUDIO_EMAIL]',
    address: '[STUDIO_ADDRESS]',
    addressLines: ['[STUDIO_ADDRESS]', 'Rajkot, Gujarat', 'India'],
    postalCode: '[POSTAL_CODE]',
    mapQuery: 'Rajkot, Gujarat',
    geo: { latitude: 22.3039, longitude: 70.8022 }, // Rajkot city centre
  },

  hours: [
    { days: 'Monday – Saturday', time: '10:00 – 19:00' }, // placeholder
    { days: 'Sunday', time: 'By appointment' },
  ],
  hoursSchema: 'Mo-Sa 10:00-19:00',

  social: [
    { label: 'Instagram', href: 'https://instagram.com/[STUDIO_INSTAGRAM]' },
    { label: 'Pinterest', href: 'https://pinterest.com/[STUDIO_PINTEREST]' },
    { label: 'LinkedIn', href: 'https://linkedin.com/company/[STUDIO_LINKEDIN]' },
  ],

  // Placeholder statistics — confirm with the studio.
  stats: [
    { value: 12, suffix: '+', label: 'Years of practice' },
    { value: 250, suffix: '+', label: 'Projects delivered' },
    { value: 1.5, decimals: 1, suffix: 'M+', label: 'Sq.ft designed' },
    { value: 40, suffix: '+', label: 'Artisan partners' },
  ],

  statement:
    'For over a decade, Rust Design Studio has shaped homes, workplaces and hospitality spaces across Gujarat with a quiet, material-first kind of luxury.',

  services: [
    {
      title: 'Residential Interiors',
      description: 'Apartments and family homes planned around how you actually live.',
      image: '/images/projects/the-terracotta-house/01.jpg',
    },
    {
      title: 'Luxury Villas & Penthouses',
      description: 'Large-format homes with bespoke joinery, stone and lighting.',
      image: '/images/projects/linen-penthouse/02.jpg',
    },
    {
      title: 'Commercial & Offices',
      description: 'Workplaces with the calm of a studio and the precision of a workshop.',
      image: '/images/projects/the-atelier-office/01.jpg',
    },
    {
      title: 'Hospitality & Cafés',
      description: 'Hotels, restaurants and cafés designed to be remembered.',
      image: '/images/projects/sandalwood-cafe/01.jpg',
    },
    {
      title: 'Turnkey Execution',
      description: 'One team from first sketch to handover — on site, on budget.',
      image: '/images/projects/stone-and-teak-villa/02.jpg',
    },
    {
      title: 'Bespoke Furniture & 3D Visualisation',
      description: 'Made-to-measure pieces and photoreal previews before anything is built.',
      image: '/images/projects/brass-courtyard-residence/04.jpg',
    },
  ],

  process: [
    {
      title: 'Discover',
      description: 'We listen first — to how you live, work and host — and walk the site together.',
      duration: 'Week 1–2',
    },
    {
      title: 'Concept & Sketch',
      description: 'Hand-drawn plans, mood boards and a material palette you can hold in your hands.',
      duration: 'Week 3–5',
    },
    {
      title: 'Design Development',
      description: 'Detailed drawings, 3D visualisation, lighting and joinery, down to every junction.',
      duration: 'Week 6–10',
    },
    {
      title: 'Execution',
      description: 'Our site team and artisan partners build it, with weekly reviews and clear costs.',
      duration: 'Month 3 onward',
    },
    {
      title: 'Handover',
      description: 'Styled, snag-free and documented — a space ready to be lived in from day one.',
      duration: 'Final week',
    },
  ],

  marquee: ['Residential', 'Commercial', 'Hospitality', 'Turnkey'],

  // Placeholder testimonials — replace with real client words and names.
  testimonials: [
    {
      quote:
        'They listened for three weeks before drawing a single line. The house they gave us feels like it was always meant to be ours.',
      name: '[CLIENT_NAME_1]',
      project: 'The Terracotta House · Rajkot',
    },
    {
      quote:
        'Every material has a reason to be there. Guests touch the walls before they say hello — that is the best review we could give.',
      name: '[CLIENT_NAME_2]',
      project: 'Ivory Suite Hotel · Vadodara',
    },
    {
      quote:
        'Calm, precise and completely honest about costs. Our team now actually wants to come to the office.',
      name: '[CLIENT_NAME_3]',
      project: 'The Atelier Office · Rajkot',
    },
    {
      quote:
        'They restored my grandmother’s haveli without losing a single memory. The courtyard glows every morning.',
      name: '[CLIENT_NAME_4]',
      project: 'Brass Courtyard Residence · Jamnagar',
    },
  ],

  philosophy: [
    {
      key: 'material',
      title: 'Material',
      description:
        'We design with what can be touched: lime plaster, local stone, oiled teak, brass that ages. Honest materials make rooms that grow more beautiful with time.',
    },
    {
      key: 'light',
      title: 'Light',
      description:
        'Daylight is the first material we plan for. We follow the sun across the site before deciding where a single wall should stand.',
    },
    {
      key: 'proportion',
      title: 'Proportion',
      description:
        'Calm comes from measure. Ceiling heights, thresholds and furniture are drawn to human scale, so every room feels effortless.',
    },
  ],

  story: [
    {
      eyebrow: 'The beginning',
      title: 'A drawing table in Rajkot',
      text: 'Rust Design Studio began with one drafting table, a roll of tracing paper and a belief that luxury should feel quiet. The first commissions were homes for families who wanted rooms that would still feel right in twenty years.',
      image: '/images/studio/story-01.jpg',
    },
    {
      eyebrow: 'The craft',
      title: 'Built with artisans, not catalogues',
      text: 'Over the years we have built a circle of more than forty artisans — stone carvers, carpenters, brass smiths and weavers from across Gujarat — who turn our drawings into objects that could not be bought anywhere else.',
      image: '/images/studio/story-02.jpg',
    },
    {
      eyebrow: 'The practice',
      title: 'Homes, workplaces, hotels',
      text: 'Today the studio designs residences, penthouses, offices, cafés and boutique hotels, always with the same method: listen, sketch, refine, and then build it properly.',
      image: '/images/studio/story-03.jpg',
    },
  ],

  // Placeholder milestones — replace labels and copy with the studio's real history.
  timeline: [
    { year: 'Est. [YEAR]', title: 'The studio opens', text: 'One room, one drafting table and the first residential commission in Rajkot.' },
    { year: 'Year 03', title: 'First villa', text: 'A weekend villa outside the city defines the studio’s material-first language.' },
    { year: 'Year 05', title: 'Artisan network', text: 'Partnerships with stone, brass and wood craftspeople across Gujarat.' },
    { year: 'Year 08', title: 'Hospitality', text: 'The first boutique hotel and café projects open their doors.' },
    { year: 'Year 10', title: 'Turnkey studio', text: 'An in-house site team is formed to deliver projects end to end.' },
    { year: 'Today', title: '250+ spaces', text: 'Homes, workplaces and hotels across Gujarat — and the drafting table is still in use.' },
  ],

  // Placeholder team — replace names, roles and photos.
  team: [
    { name: '[FOUNDER_NAME]', role: 'Founder & Principal Designer', image: '/images/team/01.jpg', imageAlt: '/images/team/01-alt.jpg' },
    { name: '[TEAM_MEMBER_2]', role: 'Associate Architect', image: '/images/team/02.jpg', imageAlt: '/images/team/02-alt.jpg' },
    { name: '[TEAM_MEMBER_3]', role: 'Senior Interior Designer', image: '/images/team/03.jpg', imageAlt: '/images/team/03-alt.jpg' },
    { name: '[TEAM_MEMBER_4]', role: '3D Visualiser', image: '/images/team/04.jpg', imageAlt: '/images/team/04-alt.jpg' },
    { name: '[TEAM_MEMBER_5]', role: 'Site & Execution Lead', image: '/images/team/05.jpg', imageAlt: '/images/team/05-alt.jpg' },
    { name: '[TEAM_MEMBER_6]', role: 'Materials & Styling', image: '/images/team/06.jpg', imageAlt: '/images/team/06-alt.jpg' },
  ],

  // Placeholder recognition — replace with real publications / awards.
  press: ['[PUBLICATION_1]', '[AWARD_1]', '[PUBLICATION_2]', '[AWARD_2]', '[PUBLICATION_3]', '[AWARD_3]'],

  about: {
    heroImage: '/images/studio/hero.jpg',
    gallery: [
      '/images/studio/gallery-01.jpg',
      '/images/studio/gallery-02.jpg',
      '/images/studio/gallery-03.jpg',
      '/images/studio/gallery-04.jpg',
      '/images/studio/gallery-05.jpg',
      '/images/studio/gallery-06.jpg',
      '/images/studio/gallery-07.jpg',
      '/images/studio/gallery-08.jpg',
      '/images/studio/gallery-09.jpg',
    ],
  },

  booking: {
    projectTypes: ['Residential', 'Commercial', 'Hospitality', 'Other'],
    propertyTypes: [
      'Apartment',
      'Villa / Bungalow',
      'Penthouse',
      'Office',
      'Retail / Showroom',
      'Café / Restaurant',
      'Hotel / Resort',
      'Other',
    ],
    budgets: ['₹10–25L', '₹25–50L', '₹50L–1Cr', '₹1Cr+'],
    timelines: ['As soon as possible', 'Within 3 months', '3–6 months', '6+ months'],
    timeSlots: ['10:00', '11:30', '13:00', '15:00', '16:30', '18:00'],
    closedWeekdays: [0], // Sunday
    expect: [
      { title: 'A short call', text: 'We call within 24 hours to understand your space, needs and timeline.' },
      { title: 'A site visit', text: 'We walk the space with you, take measurements and note the light.' },
      { title: 'A concept presentation', text: 'You receive hand sketches, a material palette and a clear fee proposal.' },
    ],
  },
};

export const navLinks = [
  { key: 'projects', label: 'Projects', short: 'Projects' },
  { key: 'about', label: 'About Us', short: 'About', to: '/about' },
  { key: 'book', label: 'Book an Appointment', short: 'Book', to: '/book' },
];
