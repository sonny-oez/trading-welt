import { Component, Suspense, lazy, useEffect, useState, type ReactNode } from 'react';
import { useBerlinAtmosphere } from '../hooks';
import { FallbackFloor } from './FallbackFloor';

const TradingFloor = lazy(() => import('./TradingFloor'));

export function detectWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: false }) ||
      canvas.getContext('webgl', { failIfMajorPerformanceCaveat: false });
    return Boolean(gl);
  } catch {
    return false;
  }
}

class SceneBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

export function SceneGate() {
  const atmo = useBerlinAtmosphere();
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [lost, setLost] = useState(false);

  useEffect(() => {
    setWebgl(detectWebGL());
  }, []);

  const flat = <FallbackFloor look={atmo.look} />;

  return (
    <div className="stage" data-phase={atmo.label}>
      <div className="stage-wash" style={{ background: atmo.look.cssBg }} />
      {webgl === null ? (
        <p className="stage-loading">Szene wird geladen…</p>
      ) : !webgl || lost ? (
        flat
      ) : (
        <SceneBoundary fallback={flat}>
          <Suspense fallback={<p className="stage-loading">Szene wird geladen…</p>}>
            <TradingFloor look={atmo.look} onContextLost={() => setLost(true)} />
          </Suspense>
        </SceneBoundary>
      )}
    </div>
  );
}
