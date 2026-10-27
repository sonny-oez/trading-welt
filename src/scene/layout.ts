export type Accessory = 'halo' | 'visor' | 'glasses' | 'cone' | 'helm' | 'headset' | 'beret';

export interface StationLayout {
  station: string;
  position: [number, number, number];
  color: string;
  accent: string;
  accessory: Accessory;
  cup?: boolean;
}

export const STATIONS: StationLayout[] = [
  { station: 'leitung', position: [0, 0, -0.7], color: '#e7c48a', accent: '#fff1c9', accessory: 'halo', cup: true },
  { station: 'markt', position: [-2.0, 0, 0.35], color: '#7ae7ff', accent: '#dff8ff', accessory: 'visor' },
  { station: 'forschung', position: [-0.65, 0, 0.75], color: '#c3a6ff', accent: '#f3e9ff', accessory: 'glasses' },
  { station: 'strategie', position: [0.65, 0, 0.75], color: '#ff8f7a', accent: '#ffe4dc', accessory: 'cone' },
  { station: 'risiko', position: [2.0, 0, 0.35], color: '#ffb020', accent: '#fff0cc', accessory: 'helm' },
  { station: 'ausfuehrung', position: [-1.15, 0, 2.05], color: '#3ee0a2', accent: '#d9fff0', accessory: 'headset' },
  { station: 'nachlese', position: [1.15, 0, 2.05], color: '#8eb6ff', accent: '#e7efff', accessory: 'beret' },
];

export const AISLE_Z = 2.85;

export function floorPercent(position: [number, number, number]): { left: string; top: string } {
  const x = (position[0] + 7) / 14;
  const z = (position[2] + 5) / 11;
  return { left: `${(x * 100).toFixed(1)}%`, top: `${(z * 78 + 8).toFixed(1)}%` };
}
