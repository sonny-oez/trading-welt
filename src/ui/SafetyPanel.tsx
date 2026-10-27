import { DEMO_COPY } from '../data/demo';
import { useDesk } from '../data/store';
import type { SafetyFlags } from '../data/types';

function rows(safety: SafetyFlags) {
  return [
    {
      label: safety.tradingEnabled ? 'Echter Handel an' : 'Kein echter Handel',
      tone: safety.tradingEnabled ? 'bad' : 'ok',
    },
    {
      label: safety.riskLimitsSet ? 'Risikolimits gesetzt' : 'Risikolimits fehlen',
      tone: safety.riskLimitsSet ? 'ok' : 'warn',
    },
    {
      label: safety.apiWalletConnected ? 'Echtes Wallet verbunden' : 'Kein echtes Wallet verbunden',
      tone: safety.apiWalletConnected ? 'bad' : 'ok',
    },
    {
      label: safety.openOrders ? 'Echte Orders vorhanden' : 'Keine echten Orders',
      tone: safety.openOrders ? 'bad' : 'ok',
    },
  ];
}

export function SafetyPanel() {
  const desk = useDesk();
  const safety = desk.safety;
  const danger = safety.tradingEnabled || safety.openOrders || safety.apiWalletConnected;
  const warn = !safety.riskLimitsSet;
  const safe = !safety.tradingEnabled && !safety.openOrders && !safety.apiWalletConnected;

  return (
    <div className="safety">
      <p className="pane-kicker">Sicherheit · Modus {desk.mode}</p>
      <div className="traffic" aria-hidden>
        <span className={danger ? 'lamp red on' : 'lamp red'} />
        <span className={warn ? 'lamp amber on' : 'lamp amber'} />
        <span className={safe ? 'lamp green on' : 'lamp green'} />
      </div>
      <p className="virtual-banner">{DEMO_COPY.virtual}</p>
      <h2>Demo-Modus</h2>
      <p className="safety-lead">{desk.headline}</p>
      <ul>
        {rows(safety).map((row) => (
          <li key={row.label} className={row.tone}>
            <i />
            {row.label}
          </li>
        ))}
      </ul>
      <p className="fine">
        Öffentliche Marktdaten und eine virtuelle Demo. Keine Schlüssel, keine echten Orders.
      </p>
    </div>
  );
}
