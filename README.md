# Rust Design Studio — portfolio website

A fully animated portfolio for **Rust Design Studio**, a luxury interior design practice in Rajkot, Gujarat.

The site tells one story: *from a pencil sketch to a finished space.*

1. A 3D designer sketches a floor plan as you scroll.
2. The plan extrudes into a small 3D model.
3. The hero lifts like a curtain and reveals an infinite, draggable canvas with every project image.
4. Any image opens a project overlay with a horizontal walkthrough.

| | |
| --- | --- |
| **Framework** | React 19 + Vite 7 (JavaScript), React Router 7 (library mode) |
| **Motion** | GSAP 3.15 (ScrollTrigger, Draggable, InertiaPlugin, SplitText, Flip, DrawSVG, CustomEase) + `@gsap/react` |
| **Scrolling** | Lenis, driven by the GSAP ticker |
| **3D** | three.js 0.182, @react-three/fiber 9, @react-three/drei 10 |
| **Forms** | react-hook-form + zod |
| **SEO** | react-helmet-async, JSON-LD, generated sitemap |
| **Styling** | CSS Modules + one tokens file. No Tailwind or UI kits. |
| **Fonts** | Self-hosted through Fontsource: Playfair Display (variable weight), Cormorant Garamond and Manrope |

---

## 1. Quick start

Requirements: **Node 20.19+** (or 22.12+) and npm 10+.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
npm run preview    # serve dist/ on http://localhost:4173
```

Optional: download placeholder photography (see [§4](#4-images)).

```bash
cp .env.example .env    # add UNSPLASH_ACCESS_KEY or PEXELS_API_KEY
npm run fetch:images
```

The site works **without any photos**. Every missing image renders a designed placeholder: a palette gradient, a line motif and the project initials.

---

## 2. Project structure

```
src/
  main.jsx               entry: styles, GSAP registration, Lenis, router
  App.jsx                global chrome: skip link, top bar, routes, floating nav, cursor, grain, preloader
  routes.jsx             page transitions + background-location project overlay
  data/
    site.js              ← ALL studio content (contact, stats, services, team…)
    projects.js          ← ALL projects and their images
  lib/
    gsap.js              registers every plugin once, custom eases, shared motion constants
    lenis.js             page Lenis + scoped Lenis (overlay), scroll lock helpers
    submitBooking.js     Formspree / EmailJS / WhatsApp submission
    appState.js          tiny global store (preloader, overlay, transitions)
    flipStore.js         hands a GSAP Flip state from a canvas tile to the overlay
    navigation.js        "Projects" scrolling helper
    content.js           placeholder-safe link helpers, formatting
    kerning.jsx          kerning fix for "W" + lowercase in Cormorant Garamond Italic
    figures.jsx          fixed-width digits / count-up slots for changing numbers
  styles/                tokens.css (design tokens), global.css, fonts.css
  hooks/                 useSplitReveal, useImageReveal, useMagnetic, useLenis, useMediaQuery,
                         usePrefersReducedMotion, useFontsReady, useRefreshOnDecode
  three/                 the 3D hero (see §7)
  components/
    HeroStage/           pinned stage: 3D hero + gallery layer + master timeline, SVG fallback
    InfiniteCanvas/      masonry layout, wrap renderer, drag/inertia, explore mode
    ProjectOverlay/      overlay shell, preview hero, horizontal walkthrough, next project
    sections/            Statement, Numbers, Services, Process, Marquee, Testimonials, CTA, Footer
    BookingForm/         multi-step form, schema, custom date picker
    FloatingNav/ Cursor/ Grain/ PageTransition/ Preloader/ Seo/
    ui/                  RevealText, RevealImage, MagneticButton, SectionLabel, ImageWithFallback, Monogram
  pages/                 Home, About, Book, ProjectPage (standalone), NotFound
public/                  favicon set, og-image.jpg, robots.txt, sitemap.xml, _redirects, images/
scripts/
  fetch-placeholders.mjs downloads placeholder photography
  curated-photos.js      the hand-picked Unsplash photo for each image slot
  designer/              builds the hero's 3D designer (src/three/models/designer.glb), see §7:
                         build.mjs (recipe), makehuman.mjs (sources, formats), geometry.mjs
```

---

## 3. Editing content

All business content lives in **two files**. You don't need to touch any component.

### `src/data/site.js`

This file holds the studio name, tagline, founding year, founder, contact details, hours, social links, stats, statement, services, process steps, marquee words, testimonials, philosophy, story, timeline, team, press and booking options.

Values written as `[SQUARE_BRACKETS]` are **placeholders**. They render as plain text, never as broken links, until you replace them:

| Placeholder | Where |
| --- | --- |
| `[STUDIO_PHONE]` | `contact.phone`, e.g. `+91 98765 43210` |
| `[STUDIO_WHATSAPP]` | `contact.whatsapp`, digits with country code, e.g. `919876543210` |
| `[STUDIO_EMAIL]` | `contact.email` |
| `[STUDIO_ADDRESS]`, `[POSTAL_CODE]` | `contact.address`, `contact.addressLines`, `contact.postalCode` |
| `[FOUNDER_NAME]` | `founder.name`, first team member |
| `[YEAR]` | `foundedYear` and the first timeline entry |
| `[STUDIO_INSTAGRAM]`, `[STUDIO_PINTEREST]`, `[STUDIO_LINKEDIN]` | `social[].href` |
| `[CLIENT_NAME_n]` | `testimonials[].name` (the quotes are sample copy) |
| `[TEAM_MEMBER_n]` | `team[].name` |
| `[PUBLICATION_n]`, `[AWARD_n]` | `press` |

The stats (`12+ years`, `250+ projects`, …) and working hours are also placeholders. Confirm them with the studio.

Once a real phone, email or WhatsApp number is set, it automatically becomes a `tel:`, `mailto:` or `wa.me` link, and it is added to the JSON-LD structured data.

### `src/data/projects.js`

Eight placeholder projects, each in this shape:

```js
{
  slug: 'linen-penthouse',          // URL: /project/linen-penthouse
  title: 'Linen Penthouse',
  subtitle: 'Sky-high calm in shades of oat, ivory and smoke',
  category: 'Residential',          // Residential | Commercial | Hospitality
  type: 'Penthouse',
  location: 'Ahmedabad, Gujarat',
  year: 2023,
  area: 6200,                       // sq ft (number)
  duration: '11 months',
  accent: '#A89A8A',                // tints the image placeholders
  summary: '…',
  cover: '/images/projects/linen-penthouse/01.jpg',
  images: [
    { src: '/images/projects/linen-penthouse/01.jpg', width: 1600, height: 900,
      title: 'Above the City’s Noise',
      description: 'Floor-to-ceiling glass veiled in sheer linen…' },
    // 6–10 images
  ],
}
```

- **Add a project:** append an object and create `public/images/projects/<slug>/`. The infinite canvas, the overlay, the walkthrough, "Next project", the sitemap and the portfolio counters all update automatically.
- **Reorder projects:** change the array order. The overlay's `(03 / 08)` index follows it.
- `width` / `height` must match the real pixel size of each photo. They reserve space, which prevents layout shift, and they drive the masonry layout.

---

## 4. Images

```
public/images/
  projects/<slug>/01.jpg … 10.jpg     project photography
  studio/hero.jpg                     About hero (1200×1600)
  studio/founder.jpg                  principal designer portrait (1200×1600)
  studio/story-01..03.jpg             About → story (1200×1500)
  studio/gallery-01..09.jpg           About → studio gallery (1400×1000)
  team/01..06.jpg + 01..06-alt.jpg    team grid + hover swap (900×1125)
```

For every `NN.jpg` the site can use two optional companions:

| File | Purpose |
| --- | --- |
| `NN-800.jpg` | 800 px wide version, used in `srcset` on small screens |
| `NN-lqip.jpg` | ~32 px wide version, shown blurred while the full image loads |

### Replacing images with the studio's photography

1. Export JPGs (sRGB, about 1600 px on the long side, quality 75–82).
2. Save them over the files above, keeping the same names. Alternatively, change the `src` values in `projects.js`.
3. Update `width` / `height` in `projects.js` to the real dimensions.
4. Either create the `-800` and `-lqip` versions, or set `imageConfig.responsiveVariants = false` at the top of `projects.js`. Missing variants are handled gracefully either way: the component retries without `srcset`.
5. Delete `public/images/CREDITS.md` once no stock photos remain.

### Placeholder photography: `npm run fetch:images`

`scripts/fetch-placeholders.mjs` fills every path above with free interior photography, cropped to the exact size the layout declares, and writes the `-800` and `-lqip` variants plus `public/images/CREDITS.md`.

```bash
npm run fetch:images                           # only missing files
npm run fetch:images -- --force                # re-download everything
npm run fetch:images -- --only=linen-penthouse # a project slug, "studio" or "team"
npm run fetch:images -- --dry-run              # list what would be fetched
npm run fetch:images -- --provider=unsplash    # fresh photos from the API (needs a key)
```

| Provider | Key needed | What you get |
| --- | --- | --- |
| `curated` (default) | no | One hand-picked Unsplash photo per slot, listed in `scripts/curated-photos.js` — chosen to match each caption, and the same set on every machine. |
| `unsplash` | `UNSPLASH_ACCESS_KEY` | Fresh search results per project. Photos differ on every run. |
| `pexels` | `PEXELS_API_KEY` | Same, from Pexels. |

Keys live in `.env`, are read only by this Node script and never reach the browser.

**Swapping a curated photo:** open the picture on unsplash.com, copy its image address, take the id out of it (`https://images.unsplash.com/photo-<id>`), paste that into `scripts/curated-photos.js`, delete the file you are replacing and run `npm run fetch:images`.

All curated photos are used under the [Unsplash License](https://unsplash.com/license): free for commercial use, no permission needed. They are still placeholders — replace them with the studio's own photography before launch.

---

## 5. Environment variables

Copy `.env.example` to `.env` (or `.env.local`).

| Variable | Used by | Notes |
| --- | --- | --- |
| `VITE_SITE_URL` | canonical/OG URLs, JSON-LD, `sitemap.xml`, `robots.txt` | e.g. `https://www.rustdesignstudio.in` |
| `VITE_FORMSPREE_ID` | booking form | takes priority when set |
| `VITE_EMAILJS_SERVICE_ID`, `VITE_EMAILJS_TEMPLATE_ID`, `VITE_EMAILJS_PUBLIC_KEY` | booking form | used when Formspree is not set |
| `UNSPLASH_ACCESS_KEY` / `PEXELS_API_KEY` | `npm run fetch:images` only | not exposed to the browser |

Variables prefixed with `VITE_` are embedded at build time. **Rebuild after changing them.**

### Booking form submission (`src/lib/submitBooking.js`)

The form tries each option in this order:

1. **Formspree.** Create a form at formspree.io and set `VITE_FORMSPREE_ID` to the part after `/f/`. The submission includes every field, a formatted `summary`, `_subject` and `_replyto`.
2. **EmailJS.** Create a service and a template. The template can use `{{name}}`, `{{phone}}`, `{{email}}`, `{{projectType}}`, `{{propertyType}}`, `{{area}}`, `{{city}}`, `{{budget}}`, `{{timeline}}`, `{{preferredDate}}`, `{{timeSlot}}`, `{{message}}` and `{{summary}}`.
3. **Neither is configured.** The form doesn't pretend it sent anything. It asks the visitor to send the request on WhatsApp instead.

A **"Send via WhatsApp"** button is always offered. It opens `wa.me/<STUDIO_WHATSAPP>` with a neatly formatted message. If the number is still a placeholder, WhatsApp opens and lets the visitor choose the chat. A hidden honeypot field filters out simple bots.

Validation: Indian mobile numbers (`+91`/`0` prefix optional, 10 digits starting 6–9), email, project details, a budget in INR, a timeline, and a preferred date. Dates must be future working days, Monday to Saturday, within 120 days; closed weekdays are set in `site.booking.closedWeekdays`.

---

## 6. Design system & motion

- **Tokens** live in `src/styles/tokens.css`: palette, type scale, easings, spacing and z-index layers. Text on dark backgrounds uses `--rust-light`, never `--rust`.
- **Typography:**
  - Display: **Playfair Display** (`--font-display`). It is a high-contrast serif whose thin strokes stay visible at every size, on dark and light backgrounds.
  - Accent words (`<em>` inside headings, leads, quotes): **Cormorant Garamond Italic** (`--font-serif`).
  - Interface and body text: **Manrope** (`--font-sans`).
  - Figures are set as lining numerals site-wide (`font-variant-numeric: lining-nums` on `body`), because Playfair and Cormorant default to old-style numerals.
  - Playfair has no tabular figures, so numbers that change on screen use the helpers in `src/lib/figures.jsx`. Otherwise they would change width and push the text beside them.
    - `<Figures>` / `setFigures()`: fixed-width digit cells, for indicators such as "02 / 08" and the preloader counter.
    - `<CountUp>`: reserves the final value's width while a count-up runs.
  - The Playfair and Manrope 400/500 latin files are preloaded on the first page load of each session (see `preloadCriticalFonts` in `vite.config.js`).
  - **To change the display font:**
    1. Install the new font's Fontsource package.
    2. Swap the `@import` in `src/styles/fonts.css`.
    3. Update `--font-display` in `src/styles/tokens.css`.
    4. Update the file-name pattern in `preloadCriticalFonts` (`vite.config.js`).
    5. Update the canvas font string in `src/three/SketchPaper.jsx` and the SVG `fontFamily` in `HeroStage/SketchFallback.jsx`.
    6. Check the footer wordmark still spans its column. It is sized in `cqi` units in `Footer.module.css`, and the factor depends on the font's width.
- **`src/lib/gsap.js`** registers every plugin once. It also defines the `rust.out` (`0.22, 1, 0.36, 1`) and `rust.inOut` (`0.65, 0, 0.35, 1`) eases and exports `MOTION`, `MQ`, `whenFontsReady` and `splitAria`. Always import GSAP from this file.
- **Reusable pieces:**
  - `<RevealText as="h2">`: SplitText lines rising from masks. Uses `autoSplit` + `onSplit`, and waits for fonts.
  - `<RevealImage>`: a clip-path reveal, image scale and brightness, and a parallax layer.
  - `<MagneticButton>`, `<SectionLabel>` and `<MarqueeRow>`.
  - Hooks in `src/hooks/`.
- **Rules followed everywhere:**
  - Every animation lives in `useGSAP` (so it is cleaned up automatically) and uses `gsap.matchMedia()` for desktop, mobile and reduced-motion variants.
  - Per-frame work uses `quickTo`/`quickSetter`. React state is never set inside tickers or `useFrame`.
  - Fade-ins use explicit `fromTo` end values, so refreshes can never "lock in" a hidden state.
  - Initial transforms are set through GSAP, not CSS `transform`, so percentages don't stack.
- **Scroll:** Lenis runs on the GSAP ticker: `lenis.on('scroll', ScrollTrigger.update)`, `gsap.ticker.add(t => lenis.raf(t * 1000))` and `lagSmoothing(0)`. The project overlay has its own Lenis instance, and every ScrollTrigger inside it uses `scroller: overlay`.
- **Route changes:**
  1. The rust panel covers the screen.
  2. The next page's chunk is preloaded, the scroll resets and the pages swap.
  3. `ScrollTrigger.refresh()` runs.
  4. The panel lifts.

---

## 7. The 3D hero

| File | Role |
| --- | --- |
| `three/heroState.js` | mutable state shared by GSAP and R3F (`progress`, damped `sketch`/`build`, pen position), phase constants |
| `components/HeroStage/HeroStage.jsx` | pins the stage (`+=500%` desktop, `+=350%` mobile), builds the master scrubbed timeline, curtain reveal, gallery cascade |
| `lib/webgl.js` | picks the hero mode: cheap device checks, a GPU probe in a worker, the session cache and the `?hero=` override |
| `three/HeroScene.jsx` | `<Canvas frameloop="demand">`, the **Director** (damping, pen sampling, camera path), lights, render gating, time-sliced scene mount, slow-frame watchdog |
| `three/warmup.js` | compiles shader programs and uploads textures in small tasks before the first frame |
| `three/Outline.jsx` | cached inverted-hull outlines (constant screen-space thickness) |
| `three/sketchPaths.js` | the floor plan as ordered pencil strokes (walls → doors → windows → furniture → dimensions → hand-lettered labels → signature), single-stroke lettering font, pen timeline with pen-lifts |
| `three/SketchPaper.jsx` | draws the strokes into a 2048×1448 `CanvasTexture` (incremental forward, full repaint when erasing) |
| `three/Designer.jsx` | the designer: loads `models/designer.glb`, toon materials and outlines, accessories (pencil, glasses, bangle, bun), and the per-frame pose — torso lean, arm and leg IK, pencil grip, head and eye tracking, blinking, breathing, the "pencil to lips" gesture |
| `three/designerRig.js` | pose solver: model-space forward kinematics, two-bone limbs with elbow/knee hinges and forearm twist, hand frames and a finger-reach solver for the pencil grip |
| `three/ik.js` | analytic two-bone IK: the pencil tip always lands on the current drawing point |
| `three/models/designer.glb` | the character: skinned mesh, 81-bone skeleton, 415 KB (meshopt-compressed). Built by `npm run build:designer` |
| `three/PlanModel.jsx` | walls extrude (`scaleY 0 → 1`, staggered), furniture pops with `back.out`, warm light |
| `three/DraftingTable.jsx`, `three/Props.jsx`, `three/parts.jsx`, `three/toonGradient.js`, `three/sceneConfig.js` | vector-toon props, materials, board transform, camera keyframes |

Timeline phases (the fraction of the pinned scroll):

| Range | What happens |
| --- | --- |
| 0.00–0.06 | intro |
| 0.06–0.55 | sketching |
| 0.55–0.72 | the plan is built in 3D |
| 0.72–0.88 | curtain reveal |
| 0.80 | the gallery becomes interactive |
| 0.88–1.00 | the gallery drifts with scroll |

The R3F loop stops rendering once `progress ≥ 0.9`, when the tab is hidden, or when the stage is off-screen.

**How the scene starts without freezing the page:**

1. A worker creates a throwaway WebGL context on an `OffscreenCanvas` and reads the GPU name. The first WebGL context of a page blocks for 150–600 ms while the GPU process starts, so doing it in a worker keeps the main thread free. It also means the scene's own context later takes only a few milliseconds.
2. If the GPU is hardware-accelerated, the three.js chunk is downloaded and the `<Canvas>` mounts in an idle callback.
3. The scene graph mounts inside a React transition, so it is built in small slices.
4. `warmup.js` compiles each shader program and uploads each texture in its own task, using `KHR_parallel_shader_compile` when the browser supports it.
5. Only then does rendering start, and the canvas fades in.

**Editing the drawing:** change `WALLS`, `BLOCKS`, `PLANTS` and the `furniture`/`labels` arrays in `sketchPaths.js`. Coordinates are "paper units" on a 1414 × 1000 sheet. The same data drives the texture, the IK target, the extruded model and the SVG fallback.

**Quality and fallbacks:**

| Device | What renders |
| --- | --- |
| Desktop | 2048 px paper texture, shadows, DPR up to 1.75 |
| Phones and tablets | 1024 px texture, no shadow maps |
| No WebGL, ≤ 2 GB memory, ≤ 2 CPU cores, or Save-Data | the SVG plan (`SketchFallback`), drawn with DrawSVG in sync with scroll; the curtain reveal still runs |
| Software WebGL: SwiftShader, llvmpipe or the "Basic Render Driver" (GPU blocklisted or hardware acceleration switched off) | the SVG plan. Software rendering would run the scene at single-digit frame rates |
| The scene renders too slowly (the median of 60 frames is over 80 ms) | the hero cross-fades to the SVG plan and remembers this for the session |
| The scene fails to load (e.g. the character model can't be fetched) | the SVG plan (an error boundary in `HeroStage`) |
| `prefers-reduced-motion` | no pin; the hero and gallery stack as normal sections with the finished plan shown statically |

The decision is cached in `sessionStorage` (`rust:hero-mode`). To force a mode for testing, open any URL with `?hero=3d` or `?hero=svg`. The override lasts for the tab session; close the tab to clear it.

### The designer character

The designer is a real human model built from **MakeHuman** assets (CC0 — free for commercial use, no attribution required): the MakeHuman base mesh shaped as a young woman, a blouse (`female_elegantsuit01`), trousers (`female_casualsuit01`), loafers (`shoes04`), eyes and eyebrows, with MakeHuman's own skeleton and skin weights. Her hair is a shell grown from the scalp with a clean hairline; the coiled bun, the pencil through it, her glasses, bangle and drawing pencil are added at runtime.

Nothing is keyframed. Every frame, `Designer.jsx` poses her from the scroll state:

- **Drawing hand:** the pencil is held in a tripod grip solved once at load (index pad on top, thumb and middle finger around it). Arm IK puts the pencil tip exactly on the current drawing point; the forearm carries the wrist's twist, and the shoulder girdle reaches when the point is far away.
- **Other hand** rests flat on the scale ruler and slides with the drawing. **Legs** rest on the stool's foot ring.
- **Torso** leans and turns toward the pencil (more when the reach is long) and breathes. **Head and eyes** follow the pencil, with blinks and small idle motion.
- **Build phase:** she sits back, nods at the rising model and brings the pencil's end to her lips.

**Changing her look:**

| What | Where |
| --- | --- |
| Clothing and hair colours, skin tone, shading | `getCharacterMaterials()` in `Designer.jsx` |
| Pose, grip, gestures | the constants at the top of `Designer.jsx` (`GRIP`, `PENCIL_WRITE`, `THINK_*`, poles, feet) |
| Body shape, outfit pieces, hairline | `MORPHS`, `GARMENTS`, `HAIRLINE` in `scripts/designer/build.mjs`, then `npm run build:designer` |

`npm run build:designer` installs the generator's own toolchain (glTF-Transform and meshoptimizer, kept in `scripts/designer/package.json` so the site's dependencies stay lean), fetches the MakeHuman sources it needs (the repository at a pinned commit, plus eight files read from the official CC0 asset pack with HTTP range requests, about 5 MB), caches them in `scripts/designer/.cache/` (git-ignored) and writes `src/three/models/designer.glb`. The output is deterministic. The model is imported with `?url`, so it is hashed into `/assets/` and cached immutably. It loads with the 3D chunk only.

The character renders on its own layer (`CHARACTER_LAYER`), so the contact shadows and the lamp's shadow map skip her: those passes would redraw the skinned meshes every frame for shadows that are not visible at this scale.

---

## 8. Features at a glance

- **Preloader:** shown on the first visit of each session. A 000 → 100 counter, SplitText wordmark and DrawSVG pencil line, then the screen splits apart.
- **Floating navigation:** a glass pill at the bottom centre. A Flip highlight slides between items, items are magnetic, the bar compresses while you scroll down fast, and it respects safe areas. The top bar shows "Rust Design Studio — Rajkot" and live IST time, and switches colour to suit the section beneath it.
- **Custom cursor:** fine pointers only. Contextual labels: *Drag*, *View*, *Scroll*, *Close*.
- **Infinite canvas** (`#projects`):
  - Seamless masonry with columns scaled to exactly the tile height, rendered with wrap-around positioning.
  - Drag with inertia, a velocity skew/scale, per-image counter-parallax, idle drift and scroll drift.
  - Hover dimming with a caption chip.
  - Keyboard: arrow keys pan and Tab moves between visible tiles.
  - Touch: native vertical scrolling, plus an "Explore full screen" mode (`#explore`; Back, Esc and ✕ close it).
- **Project overlay** (`/project/:slug` over Home):
  - Opens with a Flip from the tile.
  - Has its own Lenis instance, a focus trap and Esc/Back/✕ closing (with a reverse Flip when the tile is still visible).
  - Preview: Ken Burns image, title, meta, a pinned horizontal walkthrough (drag, horizontal wheel, arrow keys; a scroll-snap strip on mobile), a progress/counter HUD, a CTA, and a "Next project" curtain wipe.
  - Opening the same URL directly renders it as a standalone page.
- **Pages:**
  - `/about`: story with a sticky image stack, pillars with line icons, the principal designer, a pinned timeline, team hover swap, press marquee, and a three-row parallax gallery.
  - `/book`: sticky info column with a map, and the four-step form.
  - `*`: a 404 page.

---

## 9. Accessibility, performance, SEO

- **Accessibility:**
  - Landmarks and a skip link.
  - Visible `:focus-visible` styles.
  - `aria` labels on icon buttons.
  - Focus traps in the overlay and explore mode.
  - Keyboard control for the canvas, the walkthrough, the testimonials and the calendar grid.
  - `SplitText` only adds `aria-label` where the element's role allows it (`splitAria`).
  - AA contrast tokens.
  - `prefers-reduced-motion` is honoured: GSAP variants, Lenis smoothing off, static sketch, grain frozen.
- **Performance:**
  - Routes and the 3D scene are code-split. three.js is only fetched on capable devices (the ~720 kB `three-core` chunk is expected).
  - Critical fonts are preloaded.
  - Images use `loading="lazy"`, `decoding="async"`, `srcset` and LQIP.
  - The gallery behind the hero holds its 60 photos (blurred LQIP only) until the scroll approaches the curtain reveal — see `LOAD_IMAGES_AT` in `InfiniteCanvas.jsx`. Without it, 7 MB of photography downloads before anything is visible.
  - Tickers pause when their work is off-screen, and the R3F loop runs on demand.
  - The GPU probe runs in a worker. The 3D scene mounts in a transition and warms up its shaders and textures in small tasks (see §7).
  - The designer model is 415 KB (meshopt-compressed) and loads only on the 3D path.
  - Measured with Lighthouse 13 (desktop preset) on the production build. Scores are performance / accessibility / best practices / SEO:
    - Home, 3D path on a hardware GPU: 91 / 100 / 100 / 100 (the character adds ~0–1 point; 92 with the old procedural figure on the same machine).
    - Home, SVG path: 88–89 / 100 / 100 / 100. This is headless Chrome with software rendering, which is how most Lighthouse and PageSpeed runs see the page.
      - Home's LCP is the preloader wordmark, which waits for the display font by design.
    - About and Book: 98 / 100 / 100 / 100. Project pages: 96 / 100 / 100 / 100.
    - The 404 page is `noindex` on purpose, so Lighthouse's "is crawlable" SEO check fails there.
- **SEO:**
  - `<Seo>` sets the title, description, canonical URL, Open Graph and Twitter tags on every page.
  - `ProfessionalService` JSON-LD with the Rajkot address.
  - `CreativeWork` JSON-LD on project pages.
  - `sitemap.xml` and `robots.txt` are generated at build time from `VITE_SITE_URL` (`public/` keeps copies with the placeholder domain).
  - `og-image.jpg` (1200×630), SVG and PNG favicons, and a web manifest.

---

## 10. Deploying

### Vercel

1. Import the repository. The framework preset "Vite" is detected, and `vercel.json` sets the build command, output directory, SPA rewrite and cache headers.
2. Add the environment variables from §5 under *Settings → Environment Variables*.
3. Deploy. Deep links such as `/project/linen-penthouse` work thanks to the rewrite to `index.html`.

### Netlify

1. *Build command:* `npm run build` · *Publish directory:* `dist`
2. `public/_redirects` (`/* /index.html 200`) handles SPA routing.
3. Add the environment variables under *Site configuration → Environment variables* and redeploy.

### Any static host

Upload `dist/` and configure a fallback of all paths to `/index.html`.

---

## 11. Notes & troubleshooting

- **Version pins.**
  - React is pinned to `~19.2`, because `@react-three/fiber` 9.7 declares `react < 19.3`.
  - three.js is pinned to `0.182`: newer releases log a `THREE.Clock` deprecation warning from inside R3F.
  - React Router is kept on v7 (library mode), as specified.
- **The hero shows the SVG sketch instead of 3D:** the browser is probably rendering WebGL in software. Check `chrome://gpu` and enable hardware acceleration. Open the page with `?hero=3d` to force the scene anyway, and `sessionStorage.removeItem('rust:hero-mode')` to probe again.
- **The layout jumps after images load:** make sure `width`/`height` in `projects.js` match the real files.
- **Changed the text or font sizes of a pinned section:** ScrollTrigger refreshes automatically after fonts load, after images in pinned sections decode, on route changes and on resize.
- **Browser support:** current Chrome, Edge, Safari (macOS/iOS 16.4+) and Firefox. The site uses CSS `clamp()`, `color-mix()`, `:focus-visible`, `backdrop-filter` and `svh` units.
- **Licences:**
  - GSAP and all its plugins are free under GSAP's standard "no charge" licence.
  - The fonts are under the SIL Open Font License.
  - Placeholder photos follow the Unsplash or Pexels licence. See `public/images/CREDITS.md`.
  - The designer character is built from MakeHuman assets released under CC0 (see §7).
