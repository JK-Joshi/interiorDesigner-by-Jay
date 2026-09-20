import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';

import './styles/fonts.css';
import './styles/tokens.css';
import './styles/global.css';

import './lib/gsap';
import { createLenis } from './lib/lenis';
import App from './App';

// We restore scroll ourselves (page transitions reset to the top).
if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';

// React 19 (via react-helmet-async) owns <title> and the description from here on;
// the static copies in index.html only exist for crawlers that don't run JavaScript.
document.querySelectorAll('head > title, head > meta[name="description"]').forEach((el) => el.remove());

createLenis();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
