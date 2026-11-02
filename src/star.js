// A ten-pointed star with rounded tips, used as the Friendship Centre marker.
const POINTS = 10;
const INNER = 0.78; // inner radius as a fraction of the outer one; closer to 1 = rounder

function path(cx, cy, r) {
  const steps = POINTS * 2;
  let d = '';
  for (let i = 0; i < steps; i++) {
    const rad = i % 2 === 0 ? r : r * INNER;
    const a = (Math.PI * 2 * i) / steps - Math.PI / 2;
    d += `${i ? 'L' : 'M'}${(cx + rad * Math.cos(a)).toFixed(2)} ${(cy + rad * Math.sin(a)).toFixed(2)}`;
  }
  return `${d}Z`;
}

// Raster for MapLibre's addImage (drawn at 2x for sharp edges).
export function starImage(fill, outline, size = 26) {
  const px = size * 2;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = px;
  const ctx = canvas.getContext('2d');
  const p = new Path2D(path(px / 2, px / 2, px / 2 - 5));
  ctx.lineJoin = 'round';
  ctx.lineWidth = 7;
  ctx.strokeStyle = outline;
  ctx.stroke(p);
  ctx.fillStyle = fill;
  ctx.fill(p);
  ctx.lineWidth = 3;
  ctx.strokeStyle = fill;
  ctx.stroke(p);
  return ctx.getImageData(0, 0, px, px);
}

// The same star as inline SVG for the panel legend.
export function starSvg(fill, outline, size = 20) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 20 20" aria-hidden="true"><path d="${path(10, 10, 8.6)}" fill="${fill}" stroke="${outline}" stroke-width="1.2" stroke-linejoin="round"/></svg>`;
}
