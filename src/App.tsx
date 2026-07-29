import type { ReactElement } from 'react';
import { Footer } from './components/layout/Footer';
import { Header } from './components/layout/Header';
import { executives } from './data/executives';
import { useHashRoute } from './hooks/useHashRoute';
import { About } from './pages/About';
import { Contact } from './pages/Contact';
import { Events } from './pages/Events';
import { ExecutiveProfile } from './pages/ExecutiveProfile';
import { Focus } from './pages/Focus';
import { Home } from './pages/Home';
import { Journey } from './pages/Journey';
import { Leadership } from './pages/Leadership';
import { Membership } from './pages/Membership';
import { Updates } from './pages/Updates';

const pages: Record<string, ReactElement> = {
  '/': <Home />,
  '/about': <About />,
  '/leadership': <Leadership />,
  '/membership': <Membership />,
  '/focus': <Focus />,
  '/events': <Events />,
  '/updates': <Updates />,
  '/journey': <Journey />,
  '/contact': <Contact />,
};

export default function App() {
  const route = useHashRoute();
  const profileMatch = route.match(/^\/leadership\/([^/]+)$/);

  let page: ReactElement;
  if (profileMatch) {
    const executive = executives.find((item) => item.slug === profileMatch[1]);
    page = executive ? <ExecutiveProfile executive={executive} /> : <Leadership />;
  } else {
    page = pages[route] ?? <Home />;
  }

  return (
    <div className="site-shell">
      <Header />
      <main id="top">{page}</main>
      <Footer />
    </div>
  );
}
