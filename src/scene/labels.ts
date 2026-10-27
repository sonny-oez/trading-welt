import * as THREE from 'three';

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function makeLabel(text: string, accent: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  if (!ctx) return texture;

  roundRect(ctx, 8, 16, 496, 96, 32);
  ctx.fillStyle = 'rgba(7, 10, 16, 0.8)';
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = accent;
  ctx.stroke();
  ctx.fillStyle = '#f7f8ff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let size = 52;
  ctx.font = `600 ${size}px Outfit, sans-serif`;
  while (ctx.measureText(text).width > 440 && size > 28) {
    size -= 2;
    ctx.font = `600 ${size}px Outfit, sans-serif`;
  }
  ctx.fillText(text, 256, 66);
  texture.needsUpdate = true;
  return texture;
}
