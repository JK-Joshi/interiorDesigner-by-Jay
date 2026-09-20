import { useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ScrollTrigger } from '../lib/gsap';
import { scrollToProjects } from '../lib/navigation';
import Seo, { studioJsonLd } from '../components/Seo/Seo';
import HeroStage from '../components/HeroStage/HeroStage';
import ExploreMode from '../components/InfiniteCanvas/ExploreMode';
import Statement from '../components/sections/Statement/Statement';
import Numbers from '../components/sections/Numbers/Numbers';
import Services from '../components/sections/Services/Services';
import Process from '../components/sections/Process/Process';
import Marquee from '../components/sections/Marquee/Marquee';
import Testimonials from '../components/sections/Testimonials/Testimonials';
import CTA from '../components/sections/CTA/CTA';
import Footer from '../components/sections/Footer/Footer';

const JSON_LD = studioJsonLd();

export default function Home() {
  const location = useLocation();
  const navigate = useNavigate();
  const mountedAt = useRef(performance.now());
  const handledKey = useRef(null);
  const exploreOpen = location.hash === '#explore';

  // "Projects" from another page (or the footer): bring the gallery into view.
  useEffect(() => {
    if (location.state?.scrollTo !== 'projects' || handledKey.current === location.key) return undefined;
    const freshMount = performance.now() - mountedAt.current < 1500;
    const id = requestAnimationFrame(() => {
      handledKey.current = location.key;
      if (freshMount) ScrollTrigger.refresh();
      scrollToProjects({ immediate: freshMount });
    });
    return () => cancelAnimationFrame(id);
  }, [location]);

  const openExplore = useCallback(() => {
    navigate({ pathname: location.pathname, search: location.search, hash: '#explore' });
  }, [navigate, location.pathname, location.search]);

  const closeExplore = useCallback(() => {
    if ((window.history.state?.idx ?? 0) > 0) navigate(-1);
    else navigate({ pathname: location.pathname, search: location.search, hash: '' }, { replace: true });
  }, [navigate, location.pathname, location.search]);

  return (
    <>
      <main id="main" tabIndex={-1} className="page">
        <Seo path="/" jsonLd={JSON_LD} />
        <HeroStage onExplore={openExplore} />
        <Statement />
        <Numbers />
        <Services />
        <Process />
        <Marquee />
        <Testimonials />
        <CTA />
        {exploreOpen ? <ExploreMode onClose={closeExplore} /> : null}
      </main>
      <Footer />
    </>
  );
}
