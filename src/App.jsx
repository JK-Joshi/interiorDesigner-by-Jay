import { HelmetProvider } from 'react-helmet-async';
import AppRoutes from './routes';
import TopChrome from './components/FloatingNav/TopChrome';
import FloatingNav from './components/FloatingNav/FloatingNav';
import Cursor from './components/Cursor/Cursor';
import Grain from './components/Grain/Grain';
import Preloader from './components/Preloader/Preloader';

function skipToContent(e) {
  const main = document.getElementById('main');
  if (!main) return;
  e.preventDefault();
  main.focus({ preventScroll: false });
}

export default function App() {
  return (
    <HelmetProvider>
      <a href="#main" className="skip-link" onClick={skipToContent}>
        Skip to content
      </a>
      <TopChrome />
      <AppRoutes />
      <FloatingNav />
      <Cursor />
      <Grain />
      <Preloader />
    </HelmetProvider>
  );
}
