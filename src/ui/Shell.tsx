import { useEffect, useState } from 'react';
import { SceneGate } from '../scene/SceneGate';
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

export function Shell() {
  return (
    <div className="app">
      <SceneGate />
      <div className="overlay">
        <TopBar />
        <OrbitHint />
        <PanelDeck />
      </div>
    </div>
  );
}
