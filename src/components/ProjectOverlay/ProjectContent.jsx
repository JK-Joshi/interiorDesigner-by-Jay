import { useCallback, useRef } from 'react';
import PreviewHero from './PreviewHero';
import HorizontalWalkthrough from './HorizontalWalkthrough';
import NextProject from './NextProject';
import WalkthroughHUD from './WalkthroughHUD';

/**
 * Shared project view (overlay + standalone page):
 * preview → horizontal walkthrough → outro / next project.
 */
export default function ProjectContent({ project, imageIndex = 0, flip, scroller, lenis, onNext, standalone, play = true, hudClassName }) {
  const hudRef = useRef(null);
  const image = project.images[imageIndex] || project.images[0];
  const handleProgress = useCallback((data) => hudRef.current?.update(data), []);

  return (
    <>
      <PreviewHero project={project} image={image} flip={flip} scroller={scroller} play={play} standalone={standalone} />
      <HorizontalWalkthrough
        project={project}
        startIndex={project.images.indexOf(image)}
        scroller={scroller}
        lenis={lenis}
        onProgress={handleProgress}
      />
      <NextProject project={project} scroller={scroller} onNext={onNext} />
      <WalkthroughHUD ref={hudRef} className={hudClassName} />
    </>
  );
}
