import { useEffect, useState } from 'react';
import { berlinAtmosphere, type Atmosphere } from './scene/lighting';

export function useBerlinAtmosphere(): Atmosphere {
  const [atmo, setAtmo] = useState(() => berlinAtmosphere());
  useEffect(() => {
    const id = window.setInterval(() => setAtmo(berlinAtmosphere()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  return atmo;
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return reduced;
}
