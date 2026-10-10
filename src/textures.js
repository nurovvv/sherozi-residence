// Facade textures drawn on canvas, matched to the client's renders:
// terracotta brick with white-framed windows, blue-grey glass, copper perforated retail band.
import * as THREE from 'three';

function tex(canvas, repeat = true) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

// One tile = one 1.65 m bay of one floor (v spans the whole floor height)
export function brickWindowTexture() {
  const [c, g] = canvas(128, 256);
  g.fillStyle = '#7a3a2b';
  g.fillRect(0, 0, 128, 256);
  // brick courses
  for (let y = 0; y < 256; y += 6) {
    g.fillStyle = `rgba(60, 25, 18, ${0.10 + ((y / 6) % 3) * 0.03})`;
    g.fillRect(0, y, 128, 1);
    const off = (y / 6) % 2 ? 0 : 12;
    for (let x = off; x < 128; x += 24) g.fillRect(x, y, 1, 6);
  }
  // window: 1.0 m wide, sill 0.85 m, head 2.75 m (of 3.3 m)
  const wx = 25, ww = 78, top = 256 * (1 - 2.75 / 3.3), bot = 256 * (1 - 0.85 / 3.3);
  const grad = g.createLinearGradient(0, top, 0, bot);
  grad.addColorStop(0, '#9fb6c6');
  grad.addColorStop(0.5, '#4f6576');
  grad.addColorStop(1, '#33424e');
  g.fillStyle = '#ece8df';
  g.fillRect(wx - 4, top - 4, ww + 8, bot - top + 8);
  g.fillStyle = grad;
  g.fillRect(wx, top, ww, bot - top);
  g.fillStyle = '#ece8df';
  g.fillRect(wx + ww / 2 - 2, top, 4, bot - top);
  g.fillRect(wx, top + (bot - top) * 0.28, ww, 3);
  return tex(c);
}

// Curtain wall: one tile = 1.5 m bay, one floor high
export function glassTexture({ light = false } = {}) {
  const [c, g] = canvas(96, 256);
  const grad = g.createLinearGradient(0, 0, 96, 256);
  grad.addColorStop(0, light ? '#c4d8e4' : '#7f9cb0');
  grad.addColorStop(0.55, light ? '#87a6ba' : '#34495a');
  grad.addColorStop(1, light ? '#a9c2d2' : '#263744');
  g.fillStyle = grad;
  g.fillRect(0, 0, 96, 256);
  g.fillStyle = 'rgba(255,255,255,0.10)';
  g.beginPath();
  g.moveTo(20, 0); g.lineTo(60, 0); g.lineTo(20, 256); g.lineTo(-20, 256);
  g.fill();
  g.fillStyle = '#d9d6cf';
  g.fillRect(0, 0, 3, 256);
  g.fillRect(93, 0, 3, 256);
  g.fillRect(0, 200, 96, 3); // transom
  return tex(c);
}

// Shop fronts: one tile = 3 m wide, 6 m tall (ground floor)
export function storefrontTexture() {
  const [c, g] = canvas(128, 256);
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#5e7586');
  grad.addColorStop(0.35, '#d9e7ec');
  grad.addColorStop(1, '#f3e7cf');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 256);
  // warm interior glow + displays
  g.fillStyle = 'rgba(255, 214, 150, 0.35)';
  g.fillRect(8, 120, 112, 120);
  g.fillStyle = 'rgba(80, 90, 100, 0.25)';
  for (let i = 0; i < 4; i++) g.fillRect(14 + i * 28, 190, 16, 50);
  g.fillStyle = '#2b2f35';
  g.fillRect(0, 0, 5, 256);
  g.fillRect(123, 0, 5, 256);
  g.fillRect(0, 0, 128, 10);
  g.fillRect(0, 84, 128, 4);
  return tex(c);
}

// Retail band with copper perforated panels: one tile = 4 m wide, 4.2 m tall
export function copperTexture() {
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#9a5639';
  g.fillRect(0, 0, 256, 256);
  for (let y = 6; y < 256; y += 9) {
    for (let x = 4 + ((y / 9) % 2) * 4; x < 256; x += 8) {
      const r = 1.2 + Math.sin(x * 0.05 + y * 0.03) * 0.8;
      g.fillStyle = 'rgba(255, 196, 150, 0.45)';
      g.beginPath();
      g.arc(x, y, Math.max(0.4, r), 0, Math.PI * 2);
      g.fill();
    }
  }
  g.fillStyle = '#6f3a25';
  g.fillRect(0, 0, 3, 256);
  g.fillStyle = 'rgba(255, 240, 220, 0.9)';
  g.fillRect(0, 2, 256, 3);
  g.fillRect(0, 251, 256, 3);
  return tex(c);
}

// Rooftop crown: white vertical fins with gaps (used with alphaTest)
export function finTexture() {
  const [c, g] = canvas(64, 128);
  g.clearRect(0, 0, 64, 128);
  g.fillStyle = '#f4f2ee';
  g.fillRect(0, 0, 14, 128);
  g.fillRect(32, 0, 14, 128);
  g.fillRect(0, 0, 64, 10);
  g.fillRect(0, 118, 64, 10);
  return tex(c);
}

export function pavingTexture() {
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#cfc9bf';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const l = 74 + Math.random() * 8;
      g.fillStyle = `hsl(35, 10%, ${l}%)`;
      g.fillRect(i * 32 + 1, j * 32 + 1, 30, 30);
    }
  }
  return tex(c);
}

export function waterTexture() {
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#3f8fb5';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 260; i++) {
    g.fillStyle = `rgba(255,255,255,${0.15 + Math.random() * 0.35})`;
    const x = Math.random() * 256, y = Math.random() * 256;
    g.fillRect(x, y, 4 + Math.random() * 10, 1.5);
  }
  return tex(c);
}

export function textTexture(text, { color = '#ffffff', bg = 'rgba(0,0,0,0)', font = 'bold 120px Georgia, serif', w = 1024, h = 160 } = {}) {
  const [c, g] = canvas(w, h);
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.fillStyle = color;
  g.font = font;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + 4);
  return tex(c, false);
}
