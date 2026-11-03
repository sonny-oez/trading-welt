import { useEffect, useState } from 'react';
import { hrefForView, readAppView, type AppView } from '../data/view';
import { SceneGate } from '../scene/SceneGate';
import { AgentDashboard } from './AgentDashboard';
import { PanelDeck } from './PanelDeck';
import { TopBar } from './TopBar';

function OrbitHint() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const id = window.setTimeout(() => setVisible(false), 4600);
    return () => window.clearTimeout(id);
  }, []);
  if (!visible) return null;
  return <p className="hint">Ziehen zum Drehen · zwei Finger zum Zoomen</p>;
}

function useAppView(): [AppView, (next: AppView) => void] {
  const [view, setView] = useState<AppView>(() => readAppView(window.location.search));

  useEffect(() => {
    const onPop = () => setView(readAppView(window.location.search));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const go = (next: AppView) => {
    const path = hrefForView(next, window.location.href);
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (current !== path) window.history.pushState(null, '', path);
    setView(next);
  };

  return [view, go];
}

export function Shell() {
  const [view, go] = useAppView();
  const [seenWelt, setSeenWelt] = useState(view === 'welt');

  useEffect(() => {
    if (view === 'welt') setSeenWelt(true);
  }, [view]);

  useEffect(() => {
    document.title = view === 'dashboard' ? 'Trading-Welt · Papier' : 'Trading-Welt';
  }, [view]);

  const dashboard = view === 'dashboard';

  return (
    <div className="app">
      {seenWelt ? (
        <div className="welt-layer" inert={dashboard ? true : undefined} aria-hidden={dashboard || undefined}>
          <SceneGate />
          <div className="overlay">
            <TopBar onOpenDashboard={() => go('dashboard')} />
            <OrbitHint />
            <PanelDeck />
          </div>
        </div>
      ) : null}
      {dashboard ? <AgentDashboard onShowWorld={() => go('welt')} /> : null}
    </div>
  );
}
