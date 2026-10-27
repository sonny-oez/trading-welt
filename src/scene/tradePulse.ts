const PULSE_MS = 2200;
const pulses = new Map<string, number>();

export function pulseStation(station: string, now = performance.now()): void {
  pulses.set(station, now);
}

export function stationPulseAge(station: string, now = performance.now()): number {
  const at = pulses.get(station);
  if (at == null) return -1;
  const age = now - at;
  if (age < 0 || age > PULSE_MS) return -1;
  return age / PULSE_MS;
}

export function pulseExecution(now = performance.now()): void {
  pulseStation('ausfuehrung', now);
}

export function executionPulseAge(now = performance.now()): number {
  return stationPulseAge('ausfuehrung', now);
}
