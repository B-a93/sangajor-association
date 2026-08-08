import { useEffect, useState } from 'react';

const readRoute = () => {
  const hashPath = window.location.hash.replace(/^#/, '');
  return hashPath.split('?')[0] || '/';
};

export function useHashRoute() {
  const [route, setRoute] = useState(readRoute);

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(readRoute());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return route;
}
