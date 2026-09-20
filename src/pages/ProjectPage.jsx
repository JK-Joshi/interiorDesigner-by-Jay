import { useParams, useNavigate } from 'react-router';
import { getProject, projects } from '../data/projects';
import { useAppState } from '../lib/appState';
import Seo from '../components/Seo/Seo';
import ProjectContent from '../components/ProjectOverlay/ProjectContent';
import Footer from '../components/sections/Footer/Footer';
import NotFound from './NotFound';
import { site } from '../data/site';

/**
 * Standalone project page (direct visits to /project/:slug).
 * Uses the page scroller (window + Lenis); "Next project" goes through the page transition.
 */
export default function ProjectPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const introReady = useAppState((st) => st.introReady);
  const project = getProject(slug);

  if (!project) return <NotFound />;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: project.title,
    headline: project.subtitle,
    about: `${project.type} interior design`,
    abstract: project.summary,
    locationCreated: { '@type': 'Place', name: project.location },
    dateCreated: String(project.year),
    image: project.images.map((img) => `${site.url}${img.src}`),
    creator: { '@type': 'Organization', name: site.name, url: site.url },
    position: projects.indexOf(project) + 1,
  };

  return (
    <>
      <main id="main" tabIndex={-1} className="page theme-dark">
        <Seo
          title={project.title}
          description={`${project.subtitle}. ${project.summary}`}
          path={`/project/${project.slug}`}
          image={project.cover}
          type="article"
          jsonLd={jsonLd}
        />
        <ProjectContent
          key={project.slug}
          project={project}
          imageIndex={0}
          standalone
          play={introReady}
          onNext={(next) => navigate(`/project/${next.slug}`)}
        />
      </main>
      <Footer />
    </>
  );
}
