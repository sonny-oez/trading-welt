import { useEffect, useRef, useState } from 'react';
import { BotCards } from './BotCards';
import { ChartPanel } from './ChartPanel';
import { MarketCards } from './MarketCards';
import { OrderBook } from './OrderBook';
import { DemoPanel } from './DemoPanel';
import { SafetyPanel } from './SafetyPanel';

const TABS = [
  { id: 'markt', label: 'Markt' },
  { id: 'chart', label: 'Chart' },
  { id: 'buch', label: 'Buch' },
  { id: 'demo', label: 'Demo' },
  { id: 'team', label: 'Team' },
  { id: 'schutz', label: 'Schutz' },
] as const;

export function PanelDeck() {
  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const onScroll = () => {
      const width = el.clientWidth || 1;
      const index = Math.round(el.scrollLeft / width);
      setActive(Math.max(0, Math.min(TABS.length - 1, index)));
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const go = (index: number) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: 'smooth' });
    setActive(index);
  };

  return (
    <section className="deck" aria-label="Datenblätter">
      <div className="handle" aria-hidden />
      <div className="snap" ref={scroller}>
        <div className="pane" id="panel-markt">
          <MarketCards />
        </div>
        <div className="pane" id="panel-chart">
          <ChartPanel />
        </div>
        <div className="pane" id="panel-buch">
          <OrderBook />
        </div>
        <div className="pane" id="panel-demo">
          <DemoPanel />
        </div>
        <div className="pane" id="panel-team">
          <BotCards />
        </div>
        <div className="pane" id="panel-schutz">
          <SafetyPanel />
        </div>
      </div>
      <div className="dots" aria-hidden>
        {TABS.map((tab, index) => (
          <span key={tab.id} className={index === active ? 'on' : ''} />
        ))}
      </div>
      <nav className="pager">
        {TABS.map((tab, index) => (
          <button
            key={tab.id}
            type="button"
            className={index === active ? 'on' : ''}
            aria-current={index === active ? 'page' : undefined}
            onClick={() => go(index)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </section>
  );
}
