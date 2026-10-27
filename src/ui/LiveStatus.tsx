import { useLiveLatency, useLiveLink } from '../data/liveFeed';

export function LiveMark() {
  const link = useLiveLink();
  const on = link === 'connected';
  return (
    <span className={on ? 'live-mark on' : 'live-mark off'}>
      <i />
      {on ? 'LIVE' : 'Offline – zeige letzten Stand'}
    </span>
  );
}

export function DelayLine() {
  const latency = useLiveLatency();
  const skew =
    latency.skewP50 == null ? '' : ` · ${Math.round(latency.skewP50)} ms inkl. Uhrabweichung`;
  const body =
    latency.oneWayP50 == null || latency.rttP50 == null
      ? 'Verzögerung: —'
      : `Verzögerung: ~${Math.round(latency.oneWayP50)} ms (RTT ${Math.round(latency.rttP50)} ms)`;
  return <p className="demo-delay">{body}{skew}</p>;
}
