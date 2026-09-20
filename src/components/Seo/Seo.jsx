import { Helmet } from 'react-helmet-async';
import { site } from '../../data/site';
import { isPlaceholder } from '../../lib/content';

const clean = (value) => (value && !isPlaceholder(value) ? value : undefined);

/** JSON-LD for the studio (placeholders are omitted until they are replaced). */
export function studioJsonLd() {
  const { contact } = site;
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    '@id': `${site.url}/#studio`,
    name: site.name,
    description: site.description,
    url: site.url,
    image: `${site.url}${site.ogImage}`,
    logo: `${site.url}/favicon.svg`,
    telephone: clean(contact.phone),
    email: clean(contact.email),
    priceRange: '₹₹₹₹',
    foundingDate: clean(site.foundedYear),
    founder: clean(site.founder.name) ? { '@type': 'Person', name: site.founder.name } : undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: contact.address,
      addressLocality: site.city,
      addressRegion: site.region,
      postalCode: contact.postalCode,
      addressCountry: 'IN',
    },
    geo: { '@type': 'GeoCoordinates', ...contact.geo },
    areaServed: [
      { '@type': 'State', name: 'Gujarat' },
      { '@type': 'Country', name: 'India' },
    ],
    openingHours: site.hoursSchema,
    knowsAbout: site.services.map((s) => s.title),
    sameAs: site.social.map((s) => s.href).filter((href) => !/\[[^\]]+\]/.test(href)),
  };
}

/**
 * Per-page title, description, canonical, Open Graph and Twitter tags.
 */
export default function Seo({ title, description = site.description, path = '/', image = site.ogImage, type = 'website', jsonLd, noindex = false }) {
  const fullTitle = title ? `${title} — ${site.name}` : `${site.name} — Luxury Interior Design, Rajkot`;
  const url = `${site.url}${path}`;
  const imageUrl = image.startsWith('http') ? image : `${site.url}${image}`;

  return (
    <Helmet prioritizeSeoTags>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noindex ? <meta name="robots" content="noindex, follow" /> : <meta name="robots" content="index, follow" />}

      <meta property="og:site_name" content={site.name} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:locale" content="en_IN" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />

      {jsonLd ? <script type="application/ld+json">{JSON.stringify(jsonLd)}</script> : null}
    </Helmet>
  );
}
