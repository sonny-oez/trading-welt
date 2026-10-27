export interface Look {
  bg: string;
  ambient: string;
  ambientIntensity: number;
  key: string;
  keyIntensity: number;
  fill: string;
  fillIntensity: number;
  window: string;
  windowIntensity: number;
  hemiSky: string;
  hemiGround: string;
  exposure: number;
  cssBg: string;
}

export interface Atmosphere {
  hour: number;
  label: string;
  look: Look;
}

const night: Look = {
  bg: '#070912',
  ambient: '#8ea0c4',
  ambientIntensity: 0.34,
  key: '#9bb6ff',
  keyIntensity: 0.7,
  fill: '#243056',
  fillIntensity: 0.35,
  window: '#1d4c86',
  windowIntensity: 1.15,
  hemiSky: '#24345c',
  hemiGround: '#140e0c',
  exposure: 1.08,
  cssBg: 'radial-gradient(90% 60% at 50% 0%, #1a2744 0%, #070912 62%)',
};

const dawn: Look = {
  bg: '#2a1c24',
  ambient: '#f0c2ae',
  ambientIntensity: 0.5,
  key: '#ffb087',
  keyIntensity: 1.45,
  fill: '#ff86aa',
  fillIntensity: 0.4,
  window: '#ff8b64',
  windowIntensity: 1.5,
  hemiSky: '#ffc2a8',
  hemiGround: '#2a1a22',
  exposure: 1.12,
  cssBg: 'radial-gradient(90% 70% at 70% 0%, #ffb089 0%, #2a1c24 58%)',
};

const day: Look = {
  bg: '#1a2433',
  ambient: '#d7e4f4',
  ambientIntensity: 0.7,
  key: '#fff6e4',
  keyIntensity: 2.05,
  fill: '#b9d4ff',
  fillIntensity: 0.5,
  window: '#d7ecff',
  windowIntensity: 1.25,
  hemiSky: '#e7f1ff',
  hemiGround: '#2c261c',
  exposure: 1.14,
  cssBg: 'radial-gradient(90% 70% at 50% 0%, #8eb4d6 0%, #1a2433 60%)',
};

const dusk: Look = {
  bg: '#241426',
  ambient: '#f0b0c4',
  ambientIntensity: 0.46,
  key: '#ff8a55',
  keyIntensity: 1.35,
  fill: '#7d62ff',
  fillIntensity: 0.42,
  window: '#ff6d4a',
  windowIntensity: 1.55,
  hemiSky: '#ffb199',
  hemiGround: '#1a1028',
  exposure: 1.1,
  cssBg: 'radial-gradient(90% 70% at 30% 0%, #ff8a62 0%, #241426 58%)',
};

const STOPS: { t: number; look: Look }[] = [
  { t: 0, look: night },
  { t: 5, look: night },
  { t: 6.6, look: dawn },
  { t: 8.4, look: day },
  { t: 16.4, look: day },
  { t: 18.3, look: dusk },
  { t: 20.6, look: night },
  { t: 24, look: night },
];

function hexToRgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function lerpHex(a: string, b: string, t: number): string {
  const from = hexToRgb(a);
  const to = hexToRgb(b);
  const mixed = from.map((channel, index) => Math.round(channel + (to[index] - channel) * t));
  return `#${mixed.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

function lerpLook(a: Look, b: Look, t: number): Look {
  const n = (from: number, to: number) => from + (to - from) * t;
  return {
    bg: lerpHex(a.bg, b.bg, t),
    ambient: lerpHex(a.ambient, b.ambient, t),
    ambientIntensity: n(a.ambientIntensity, b.ambientIntensity),
    key: lerpHex(a.key, b.key, t),
    keyIntensity: n(a.keyIntensity, b.keyIntensity),
    fill: lerpHex(a.fill, b.fill, t),
    fillIntensity: n(a.fillIntensity, b.fillIntensity),
    window: lerpHex(a.window, b.window, t),
    windowIntensity: n(a.windowIntensity, b.windowIntensity),
    hemiSky: lerpHex(a.hemiSky, b.hemiSky, t),
    hemiGround: lerpHex(a.hemiGround, b.hemiGround, t),
    exposure: n(a.exposure, b.exposure),
    cssBg: t < 0.5 ? a.cssBg : b.cssBg,
  };
}

export function phaseLabel(hour: number): string {
  if (hour >= 5 && hour < 8) return 'Morgen';
  if (hour >= 8 && hour < 17) return 'Tag';
  if (hour >= 17 && hour < 21) return 'Abend';
  return 'Nacht';
}

export function lookAtHour(hour: number): Look {
  const t = ((hour % 24) + 24) % 24;
  for (let i = 0; i < STOPS.length - 1; i += 1) {
    const a = STOPS[i];
    const b = STOPS[i + 1];
    if (t >= a.t && t <= b.t) {
      const span = b.t - a.t || 1;
      return lerpLook(a.look, b.look, (t - a.t) / span);
    }
  }
  return night;
}

export function berlinHour(date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? '0');
  return hour + minute / 60;
}

export function berlinAtmosphere(date = new Date()): Atmosphere {
  const hour = berlinHour(date);
  return { hour, label: phaseLabel(hour), look: lookAtHour(hour) };
}
