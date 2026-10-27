const PULSE_MS = 2200;
let pulseAt = -1e12;

export function pulseExecution(now = performance.now()): void {
  pulseAt = now;
}

export function executionPulseAge(now = performance.now()): number {
  const age = now - pulseAt;
  if (age < 0 || age > PULSE_MS) return -1;
  return age / PULSE_MS;
}
