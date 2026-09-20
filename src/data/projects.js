/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  RUST DESIGN STUDIO — PROJECTS
 *  8 placeholder projects. Replace titles, copy and photography with real work.
 *
 *  Images live in /public/images/projects/<slug>/NN.jpg
 *  - Always keep `width` and `height` equal to the real pixel size of the photo
 *    (they reserve space and prevent layout shift).
 *  - Optional responsive variants: NN-800.jpg (800px wide) and NN-lqip.jpg
 *    (~32px wide blur placeholder). `npm run fetch:images` creates all three.
 *    Set `responsiveVariants: false` below if you only drop in NN.jpg files.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const imageConfig = {
  responsiveVariants: true,
  smallWidth: 800,
};

/** Common frame sizes used by the placeholder photography. */
const LANDSCAPE = { width: 1600, height: 1067 };
const PORTRAIT = { width: 1200, height: 1600 };
const SQUARE = { width: 1400, height: 1400 };
const TALL = { width: 1067, height: 1600 };
const WIDE = { width: 1600, height: 900 };

export const projects = [
  {
    slug: 'the-terracotta-house',
    title: 'The Terracotta House',
    subtitle: 'A family home warmed by earth and afternoon light',
    category: 'Residential',
    type: 'Private Residence',
    location: 'Rajkot, Gujarat',
    year: 2024,
    area: 4800,
    duration: '14 months',
    accent: '#B7472A',
    summary:
      'A four-bedroom home organised around a shaded courtyard. Lime plaster, handmade terracotta and oiled teak keep the rooms cool, calm and quietly generous.',
    cover: '/images/projects/the-terracotta-house/01.jpg',
    images: [
      { src: '/images/projects/the-terracotta-house/01.jpg', ...LANDSCAPE, title: 'Where Light Rests', description: 'Late sun pools across hand-troweled lime plaster, turning the living room the colour of baked clay.' },
      { src: '/images/projects/the-terracotta-house/02.jpg', ...LANDSCAPE, title: 'The Long Table', description: 'A twelve-seater in solid teak, its edges softened by hand, beneath a cluster of hand-blown amber pendants.' },
      { src: '/images/projects/the-terracotta-house/03.jpg', ...PORTRAIT, title: 'Clay & Quiet', description: 'Terracotta jaalis filter the courtyard glare into a slow pattern that drifts across the floor through the day.' },
      { src: '/images/projects/the-terracotta-house/04.jpg', ...TALL, title: 'A Stair Like a Sentence', description: 'Cantilevered sandstone treads rise past a double-height wall of brick laid in Flemish bond.' },
      { src: '/images/projects/the-terracotta-house/05.jpg', ...SQUARE, title: 'The Morning Nook', description: 'A window seat upholstered in undyed khadi, framed in fluted oak and sized for exactly one cup of chai.' },
      { src: '/images/projects/the-terracotta-house/06.jpg', ...LANDSCAPE, title: 'Master Suite, Unhurried', description: 'Limewashed walls, a caned headboard and linen drapes that lift with the evening breeze.' },
      { src: '/images/projects/the-terracotta-house/07.jpg', ...PORTRAIT, title: 'Bath in Rust & Stone', description: 'Rust-veined Kota stone meets brushed brass in a bath designed around a single skylight.' },
      { src: '/images/projects/the-terracotta-house/08.jpg', ...WIDE, title: 'Threshold', description: 'A front door carved by artisans in Jamnagar opens onto a courtyard of terracotta and river pebble.' },
    ],
  },
  {
    slug: 'linen-penthouse',
    title: 'Linen Penthouse',
    subtitle: 'Sky-high calm in shades of oat, ivory and smoke',
    category: 'Residential',
    type: 'Penthouse',
    location: 'Ahmedabad, Gujarat',
    year: 2023,
    area: 6200,
    duration: '11 months',
    accent: '#A89A8A',
    summary:
      'A duplex penthouse softened from glass-box to sanctuary. Layers of linen, bouclé and bleached oak let texture, not colour, carry the design.',
    cover: '/images/projects/linen-penthouse/01.jpg',
    images: [
      { src: '/images/projects/linen-penthouse/01.jpg', ...WIDE, title: 'Above the City’s Noise', description: 'Floor-to-ceiling glass veiled in sheer linen, so the skyline arrives softened, like a memory.' },
      { src: '/images/projects/linen-penthouse/02.jpg', ...LANDSCAPE, title: 'The Oat Lounge', description: 'Bouclé, raw silk and bleached oak layered in near-identical tones, so texture does all the talking.' },
      { src: '/images/projects/linen-penthouse/03.jpg', ...SQUARE, title: 'Quiet Geometry', description: 'A travertine coffee table carved from a single block, resting on a hand-knotted wool rug from Bhadohi.' },
      { src: '/images/projects/linen-penthouse/04.jpg', ...LANDSCAPE, title: 'Dining in Soft Focus', description: 'Ivory lacquer, a smoked-glass pendant and pale leather chairs catch the very last of the light.' },
      { src: '/images/projects/linen-penthouse/05.jpg', ...PORTRAIT, title: 'The Library Wall', description: 'White-oak shelving rises to the ceiling, with a brass rolling ladder and concealed reading lights.' },
      { src: '/images/projects/linen-penthouse/06.jpg', ...LANDSCAPE, title: 'Sleep, Considered', description: 'An upholstered wall absorbs every sound; the bed faces east so mornings begin without an alarm.' },
      { src: '/images/projects/linen-penthouse/07.jpg', ...TALL, title: 'Vanity in Ivory', description: 'Honed Arabescato marble, a fluted basin and a mirror edged in unlacquered brass that will age with grace.' },
    ],
  },
  {
    slug: 'stone-and-teak-villa',
    title: 'Stone & Teak Villa',
    subtitle: 'A weekend house built from what the land already knew',
    category: 'Residential',
    type: 'Luxury Villa',
    location: 'Near Rajkot, Gujarat',
    year: 2024,
    area: 9500,
    duration: '18 months',
    accent: '#6B6F5A',
    summary:
      'A long, low villa of dry-stacked basalt and reclaimed teak that follows the contour of its site and opens entirely to the garden.',
    cover: '/images/projects/stone-and-teak-villa/01.jpg',
    images: [
      { src: '/images/projects/stone-and-teak-villa/01.jpg', ...WIDE, title: 'Built Low, Built Long', description: 'Dry-stacked local basalt and reclaimed teak stretch the villa along the gentle contour of the land.' },
      { src: '/images/projects/stone-and-teak-villa/02.jpg', ...LANDSCAPE, title: 'The Great Room', description: 'A seven-metre teak ceiling, exposed and oiled, floats above a sunken lounge in charcoal wool.' },
      { src: '/images/projects/stone-and-teak-villa/03.jpg', ...PORTRAIT, title: 'Stone That Holds Heat', description: 'Thick basalt walls keep the rooms cool by day and release their stored warmth into the evening.' },
      { src: '/images/projects/stone-and-teak-villa/04.jpg', ...LANDSCAPE, title: 'Courtyard Pool', description: 'A black-plaster pool mirrors the sky, framed by teak decking that stays cool underfoot at noon.' },
      { src: '/images/projects/stone-and-teak-villa/05.jpg', ...LANDSCAPE, title: 'Kitchen for Long Lunches', description: 'A monolithic island in leathered granite, with open teak shelving for everyday stoneware.' },
      { src: '/images/projects/stone-and-teak-villa/06.jpg', ...SQUARE, title: 'The Reading Loft', description: 'Tucked under the roof pitch, a teak-lined loft with one round window framing the old neem tree.' },
      { src: '/images/projects/stone-and-teak-villa/07.jpg', ...TALL, title: 'Open-Air Shower', description: 'Rough stone, a brass rain head and a single frangipani — the villa’s most requested room.' },
      { src: '/images/projects/stone-and-teak-villa/08.jpg', ...PORTRAIT, title: 'Gallery of Niches', description: 'A guest-wing corridor of carved niches, each holding a piece of pottery collected in Kutch.' },
      { src: '/images/projects/stone-and-teak-villa/09.jpg', ...LANDSCAPE, title: 'Dusk on the Verandah', description: 'Perforated brass lanterns throw lace-like patterns across the stone as the sun goes down.' },
    ],
  },
  {
    slug: 'brass-courtyard-residence',
    title: 'Brass Courtyard Residence',
    subtitle: 'A haveli reimagined around one glowing courtyard',
    category: 'Residential',
    type: 'Heritage Renovation',
    location: 'Jamnagar, Gujarat',
    year: 2022,
    area: 7100,
    duration: '20 months',
    accent: '#B8955A',
    summary:
      'A century-old haveli restored for three generations of one family. Original teak and stone were repaired by hand; brass, light and water were added with restraint.',
    cover: '/images/projects/brass-courtyard-residence/01.jpg',
    images: [
      { src: '/images/projects/brass-courtyard-residence/01.jpg', ...PORTRAIT, title: 'The Glowing Heart', description: 'An open courtyard ringed with brass-clad columns that catch and scatter the morning sun.' },
      { src: '/images/projects/brass-courtyard-residence/02.jpg', ...LANDSCAPE, title: 'Restored, Not Replaced', description: 'Original teak brackets were repaired and re-oiled by the same family of carpenters who first carved them.' },
      { src: '/images/projects/brass-courtyard-residence/03.jpg', ...SQUARE, title: 'Jharokha Light', description: 'Restored carved windows cast lace-like shadows across a daybed upholstered in rust velvet.' },
      { src: '/images/projects/brass-courtyard-residence/04.jpg', ...LANDSCAPE, title: 'The Brass Kitchen', description: 'Hammered brass cabinetry, a marble counter and a copper hood that glows warm in lamplight.' },
      { src: '/images/projects/brass-courtyard-residence/05.jpg', ...TALL, title: 'The Prayer Room', description: 'White marble inlay lit by a single oil lamp and a high clerestory window.' },
      { src: '/images/projects/brass-courtyard-residence/06.jpg', ...WIDE, title: 'Dining Under Arches', description: 'Three restored arches frame a long table of reclaimed sheesham and hand-woven cane chairs.' },
      { src: '/images/projects/brass-courtyard-residence/07.jpg', ...LANDSCAPE, title: 'The Grandmother’s Suite', description: 'Lime plaster, block-printed textiles and a teak swing — every detail chosen by the family’s eldest.' },
      { src: '/images/projects/brass-courtyard-residence/08.jpg', ...PORTRAIT, title: 'Stair of Stories', description: 'A stone staircase lined with family photographs in slim, hand-finished brass frames.' },
    ],
  },
  {
    slug: 'monsoon-retreat',
    title: 'Monsoon Retreat',
    subtitle: 'A house designed to be loved most when it rains',
    category: 'Residential',
    type: 'Holiday Home',
    location: 'Saputara, Gujarat',
    year: 2023,
    area: 3900,
    duration: '12 months',
    accent: '#6B6F5A',
    summary:
      'A hill retreat of slate, cedar and sage-green joinery, with deep eaves and pivoting glass walls that turn every monsoon shower into a view.',
    cover: '/images/projects/monsoon-retreat/01.jpg',
    images: [
      { src: '/images/projects/monsoon-retreat/01.jpg', ...WIDE, title: 'Rain on Glass', description: 'A pivoting glass wall turns the living room into a verandah the moment the first monsoon arrives.' },
      { src: '/images/projects/monsoon-retreat/02.jpg', ...LANDSCAPE, title: 'Moss & Slate', description: 'Slate floors, sage-green joinery and a planted wall that thrives in the mountain humidity.' },
      { src: '/images/projects/monsoon-retreat/03.jpg', ...SQUARE, title: 'The Fireside', description: 'A blackened-steel fireplace anchors a reading corner wrapped in heavy wool throws.' },
      { src: '/images/projects/monsoon-retreat/04.jpg', ...LANDSCAPE, title: 'Kitchen with a View', description: 'Fluted sage cabinetry and one long window that frames the valley like a painting.' },
      { src: '/images/projects/monsoon-retreat/05.jpg', ...PORTRAIT, title: 'Sleeping in the Clouds', description: 'A cedar-lined bedroom whose scent rises with the damp, as mist drifts slowly past the glass.' },
      { src: '/images/projects/monsoon-retreat/06.jpg', ...LANDSCAPE, title: 'The Covered Deck', description: 'Deep eaves and teak slats make a place to sit outside through the heaviest downpour.' },
      { src: '/images/projects/monsoon-retreat/07.jpg', ...TALL, title: 'Stone Bath', description: 'A carved stone tub faces a private garden, where rain chains guide the water past the window.' },
    ],
  },
  {
    slug: 'the-atelier-office',
    title: 'The Atelier Office',
    subtitle: 'The calm of a studio, the precision of a workshop',
    category: 'Commercial',
    type: 'Corporate Office',
    location: 'Rajkot, Gujarat',
    year: 2024,
    area: 12000,
    duration: '9 months',
    accent: '#3B3835',
    summary:
      'A headquarters for a design-led manufacturer: daylight at every desk, acoustic calm throughout and a materials library at its heart.',
    cover: '/images/projects/the-atelier-office/01.jpg',
    images: [
      { src: '/images/projects/the-atelier-office/01.jpg', ...WIDE, title: 'Reception in Oak & Rust', description: 'A monolithic desk in rust-toned microcement, set against a wall of vertical oak slats.' },
      { src: '/images/projects/the-atelier-office/02.jpg', ...LANDSCAPE, title: 'The Long Studio', description: 'Open workstations beneath acoustic felt baffles, with daylight reaching every single desk.' },
      { src: '/images/projects/the-atelier-office/03.jpg', ...LANDSCAPE, title: 'Boardroom, Softened', description: 'A walnut table for sixteen, deep leather chairs and a wall of sound-absorbing linen.' },
      { src: '/images/projects/the-atelier-office/04.jpg', ...PORTRAIT, title: 'Focus Rooms', description: 'Glass-fronted rooms in slim brass frames, with sage curtains for moments that need privacy.' },
      { src: '/images/projects/the-atelier-office/05.jpg', ...SQUARE, title: 'The Materials Library', description: 'Floor-to-ceiling drawers of stone, fabric and veneer samples, ordered like an old apothecary.' },
      { src: '/images/projects/the-atelier-office/06.jpg', ...LANDSCAPE, title: 'Pantry & Pause', description: 'Terrazzo counters, a long communal table and low pendants that invite people to linger.' },
    ],
  },
  {
    slug: 'ivory-suite-hotel',
    title: 'Ivory Suite Hotel',
    subtitle: 'A boutique hotel where every suite feels like a private home',
    category: 'Hospitality',
    type: 'Boutique Hotel',
    location: 'Vadodara, Gujarat',
    year: 2023,
    area: 38000,
    duration: '24 months',
    accent: '#EFE7DC',
    summary:
      'Twenty-four suites, a lobby lounge, a rooftop bar and a spa, all in a palette of ivory stucco, bleached oak and brass made in Moradabad.',
    cover: '/images/projects/ivory-suite-hotel/01.jpg',
    images: [
      { src: '/images/projects/ivory-suite-hotel/01.jpg', ...PORTRAIT, title: 'Arrival', description: 'A double-height lobby in ivory stucco, lit by a sculptural brass chandelier made in Moradabad.' },
      { src: '/images/projects/ivory-suite-hotel/02.jpg', ...WIDE, title: 'The Lobby Lounge', description: 'Low, deep seating in cream bouclé gathered around a travertine hearth.' },
      { src: '/images/projects/ivory-suite-hotel/03.jpg', ...LANDSCAPE, title: 'Suite Four-Oh-One', description: 'Ivory lacquered panelling, a bleached-oak four-poster and a writing desk set by the window.' },
      { src: '/images/projects/ivory-suite-hotel/04.jpg', ...TALL, title: 'Bath as Sanctuary', description: 'A freestanding stone bath on a raised plinth, glimpsed through a hand-carved screen.' },
      { src: '/images/projects/ivory-suite-hotel/05.jpg', ...LANDSCAPE, title: 'All-Day Dining', description: 'Rust leather banquettes, marble tabletops and arched mirrors that double the evening light.' },
      { src: '/images/projects/ivory-suite-hotel/06.jpg', ...PORTRAIT, title: 'The Hushed Corridor', description: 'Deep carpet, bronze sconces and oak-lined door frames give every suite its own threshold.' },
      { src: '/images/projects/ivory-suite-hotel/07.jpg', ...LANDSCAPE, title: 'Rooftop Bar', description: 'A brass-topped bar facing the sunset, with planters of jasmine along the parapet.' },
      { src: '/images/projects/ivory-suite-hotel/08.jpg', ...SQUARE, title: 'Spa Treatment Room', description: 'Warm limestone, low light and the scent of sandalwood — everything designed to slow the pulse.' },
    ],
  },
  {
    slug: 'sandalwood-cafe',
    title: 'Sandalwood Café',
    subtitle: 'A neighbourhood café that smells of coffee, wood and warm stone',
    category: 'Hospitality',
    type: 'Café',
    location: 'Rajkot, Gujarat',
    year: 2025,
    area: 2400,
    duration: '5 months',
    accent: '#D9784F',
    summary:
      'A forty-cover café and roastery with a curved sandalwood-toned bar, cane lighting and a corner that has become the city’s favourite photograph.',
    cover: '/images/projects/sandalwood-cafe/01.jpg',
    images: [
      { src: '/images/projects/sandalwood-cafe/01.jpg', ...LANDSCAPE, title: 'The Counter', description: 'A curved bar in fluted, sandalwood-toned veneer, topped with rust-red terrazzo.' },
      { src: '/images/projects/sandalwood-cafe/02.jpg', ...WIDE, title: 'Window Seats', description: 'Built-in benches along the street façade, cushioned in ochre and framed in slim blackened steel.' },
      { src: '/images/projects/sandalwood-cafe/03.jpg', ...SQUARE, title: 'Light Through Cane', description: 'Woven cane pendants cast soft, dappled light across the long communal table.' },
      { src: '/images/projects/sandalwood-cafe/04.jpg', ...PORTRAIT, title: 'The Roastery Wall', description: 'Open shelves of glass jars and brass canisters turn the coffee ritual into part of the décor.' },
      { src: '/images/projects/sandalwood-cafe/05.jpg', ...TALL, title: 'A Corner for Two', description: 'A round marble table, two cane chairs and a painted arch — the café’s most photographed spot.' },
      { src: '/images/projects/sandalwood-cafe/06.jpg', ...LANDSCAPE, title: 'Evening Glow', description: 'Dimmed, warm lighting turns the café into a quiet small-plates room after dark.' },
      { src: '/images/projects/sandalwood-cafe/07.jpg', ...PORTRAIT, title: 'Details in Brass', description: 'Brass footrails, menu holders and door pulls, polished by hand daily and ageing beautifully.' },
    ],
  },
];

export const getProject = (slug) => projects.find((p) => p.slug === slug) || null;

export const getProjectIndex = (slug) => projects.findIndex((p) => p.slug === slug);

export function getNextProject(slug) {
  const i = getProjectIndex(slug);
  return projects[(i + 1) % projects.length];
}

/** Every image of every project, interleaved so neighbouring tiles differ. */
export function getAllImages() {
  const out = [];
  const max = Math.max(...projects.map((p) => p.images.length));
  for (let i = 0; i < max; i += 1) {
    projects.forEach((project, pIndex) => {
      const image = project.images[i];
      if (!image) return;
      out.push({
        ...image,
        imageIndex: i,
        projectSlug: project.slug,
        projectTitle: project.title,
        projectIndex: pIndex,
        category: project.category,
        accent: project.accent,
      });
    });
  }
  return out;
}

/** Derived responsive sources for a project image path. */
export function imageVariants(src) {
  const match = /^(.*)\.(jpe?g|png|webp|avif)$/i.exec(src || '');
  if (!match) return { src, small: null, lqip: null };
  const [, base, ext] = match;
  return {
    src,
    small: imageConfig.responsiveVariants ? `${base}-${imageConfig.smallWidth}.${ext}` : null,
    lqip: imageConfig.responsiveVariants ? `${base}-lqip.${ext}` : null,
  };
}
