import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { formatPct, formatPx } from '../data/format';
import { useMarket } from '../data/store';
import { COINS } from '../data/types';

function draw(
  canvas: HTMLCanvasElement,
  assets: Partial<Record<(typeof COINS)[number], { mid: number; mark: number; changePct: number | null }>>,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#07131f');
  bg.addColorStop(1, '#102033');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(122, 231, 255, 0.35)';
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, w - 16, h - 16);

  const time = new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).format(new Date());

  ctx.fillStyle = '#9adfff';
  ctx.font = '600 28px Outfit, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('TRADING-WELT', 36, 58);
  ctx.fillStyle = 'rgba(232, 238, 255, 0.72)';
  ctx.font = '500 22px Outfit, sans-serif';
  ctx.fillText('Öffentlicher Markt', 36, 92);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#f4f7ff';
  ctx.font = '500 24px "IBM Plex Mono", monospace';
  ctx.fillText(`Berlin ${time}`, w - 36, 70);

  const col = (w - 80) / COINS.length;
  COINS.forEach((coin, index) => {
    const asset = assets[coin];
    const x = 40 + col * index;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#d7dee8';
    ctx.font = '600 26px Outfit, sans-serif';
    ctx.fillText(coin, x, 170);
    if (!asset) {
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.font = '500 22px Outfit, sans-serif';
      ctx.fillText('…', x, 230);
      return;
    }
    const up = (asset.changePct ?? 0) >= 0;
    ctx.fillStyle = '#f7fbff';
    ctx.font = '600 40px "IBM Plex Mono", monospace';
    ctx.fillText(formatPx(asset.mid), x, 230);
    ctx.fillStyle = up ? '#3ee0a2' : '#ff6d86';
    ctx.font = '600 24px "IBM Plex Mono", monospace';
    ctx.fillText(asset.changePct == null ? '—' : formatPct(asset.changePct), x, 272);
    ctx.fillStyle = 'rgba(214, 224, 240, 0.7)';
    ctx.font = '500 18px Outfit, sans-serif';
    ctx.fillText(`Mark ${formatPx(asset.mark)}`, x, 308);
  });

  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(180, 210, 230, 0.55)';
  ctx.font = '500 18px Outfit, sans-serif';
  ctx.fillText('Nur Recherche  ·  kein Handel', 36, h - 36);
}

export function WallScreen() {
  const assets = useMarket((state) => state.assets);
  const assetsRef = useRef(assets);
  assetsRef.current = assets;
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 640;
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    return { canvas, map };
  }, []);

  useEffect(() => {
    let stop = false;
    const redraw = () => {
      if (stop) return;
      draw(texture.canvas, assetsRef.current);
      texture.map.needsUpdate = true;
    };
    redraw();
    void document.fonts.ready.then(redraw);
    const id = window.setInterval(redraw, 1000);
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, [texture]);

  useEffect(() => {
    draw(texture.canvas, assets);
    texture.map.needsUpdate = true;
  }, [assets, texture]);

  useEffect(() => () => texture.map.dispose(), [texture]);

  return (
    <group position={[0, 2.3, -4.2]}>
      <mesh position={[0, 0, -0.05]}>
        <boxGeometry args={[5.5, 2.5, 0.08]} />
        <meshStandardMaterial color="#101820" emissive="#143044" emissiveIntensity={0.45} metalness={0.55} roughness={0.28} />
      </mesh>
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[5.15, 2.15]} />
        <meshBasicMaterial map={texture.map} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, -0.12]}>
        <planeGeometry args={[5.9, 2.85]} />
        <meshBasicMaterial color="#39c8ff" transparent opacity={0.12} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}
