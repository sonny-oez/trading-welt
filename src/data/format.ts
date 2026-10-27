export function formatPx(value: number): string {
  const abs = Math.abs(value);
  let min = 2;
  let max = 2;
  if (abs >= 10_000) {
    min = 0;
    max = 1;
  } else if (abs >= 100) {
    min = 2;
    max = 2;
  } else if (abs >= 1) {
    min = 2;
    max = 3;
  } else {
    min = 2;
    max = 6;
  }
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  }).format(value);
}

export function formatPct(value: number, digits = 2): string {
  const body = new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    signDisplay: 'exceptZero',
  }).format(value);
  return `${body} %`;
}

export function formatFunding(annPct: number): string {
  const digits = annPct !== 0 && Math.abs(annPct) < 0.1 ? 3 : 2;
  return formatPct(annPct, digits);
}

export function formatMoney(value: number, withUnit = true): string {
  const body = new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return withUnit ? `${body} USD` : body;
}

export function formatSignedMoney(value: number): string {
  const body = new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: 'exceptZero',
  }).format(value);
  return `${body} USD`;
}

export function formatBerlinStamp(iso: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return '—';
  return new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    timeZoneName: 'short',
  }).format(ms);
}

export function formatUsd(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 10_000) {
    return `${new Intl.NumberFormat('de-DE', {
      notation: 'compact',
      maximumFractionDigits: 2,
    }).format(value)} USD`;
  }
  return `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(value)} USD`;
}

export function formatSize(value: number): string {
  const digits = Math.abs(value) >= 100 ? 1 : Math.abs(value) >= 1 ? 2 : 4;
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: digits }).format(value);
}

export function formatBerlin(ts: number): string {
  return new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    timeZoneName: 'short',
  }).format(ts);
}

export function formatBerlinHour(ts: number): string {
  return new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(ts);
}

export function formatBerlinMillis(ms: number): string {
  if (!Number.isFinite(ms)) return '—';
  const parts = new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    fractionalSecondDigits: 3,
  }).formatToParts(ms);
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  const fraction = pick('fractionalSecond').padEnd(3, '0').slice(0, 3);
  return `${pick('hour')}:${pick('minute')}:${pick('second')}.${fraction}`;
}

export function formatBerlinShort(ts: number): string {
  return new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(ts);
}
