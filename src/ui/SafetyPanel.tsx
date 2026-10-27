import { useDesk } from '../data/store';
import type { SafetyFlags } from '../data/types';

function rows(safety: SafetyFlags) {
  return [
    {
      label: safety.tradingEnabled ? 'Handel an' : 'Handel aus',
      tone: safety.tradingEnabled ? 'bad' : 'ok',
    },
    {
      label: safety.riskLimitsSet ? 'Risikolimits gesetzt' : 'Risikolimits fehlen',
      tone: safety.riskLimitsSet ? 'ok' : 'warn',
    },
    {
      label: safety.apiWalletConnected ? 'API-Wallet verbunden' : 'Kein API-Wallet',
      tone: safety.apiWalletConnected ? 'bad' : 'ok',
    },
    {
      label: safety.openOrders ? 'Orders vorhanden' : 'Keine Orders',
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
      <h2>Kein Handel</h2>
      <p className="safety-lead">
        Dieses Desk beobachtet nur. Es gibt kein Konto in dieser App, und es wird nichts gesendet.
      </p>
      <ul>
        {rows(safety).map((row) => (
          <li key={row.label} className={row.tone}>
            <i />
            {row.label}
          </li>
        ))}
      </ul>
      <p className="fine">Es werden nur öffentliche Marktdaten gelesen. Keine Schlüssel, kein Wallet, keine Orders.</p>
    </div>
  );
}
