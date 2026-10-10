// Finds the virtual camera of each client render by fitting our 3D model to it.
// Model: level camera (architectural renders keep verticals vertical) with lens shift:
//   params = [x, y, z, yaw, f, u0, v0]
// Observations per tower: image x of the left/right silhouette and image y at the
// bottom of floor 5 and at the roof, measured on the cropped renders (1915 x 1340).
import { BLOCKS, blockToWorld } from '../src/config.js';
import { tracePath, segmentsToPoints } from '../src/geometry.js';
import { VIEWS } from '../src/photos.js';
import { writeFileSync } from 'node:fs';

const outlines = {};
for (const b of Object.values(BLOCKS)) {
  outlines[b.key] = segmentsToPoints(tracePath(b.slab, 6)).map((p) => blockToWorld(b, ...p));
}

function project(p, [cx, cy, cz, yaw, f, u0, v0], [X, Y, Z]) {
  const fx = Math.sin(yaw), fz = -Math.cos(yaw); // forward (yaw 0 looks along -Z)
  const rx = -fz, rz = fx; // right
  const dx = X - cx, dy = Y - cy, dz = Z - cz;
  const depth = dx * fx + dz * fz;
  return [u0 + (f * (dx * rx + dz * rz)) / depth, v0 - (f * dy) / depth, depth];
}

function residuals(view, p) {
  const r = [];
  for (const [key, t] of Object.entries(view.towers)) {
    const b = BLOCKS[key];
    const levels = [[b.elevation(5), t.y0, t.x0], [b.elevation(b.floors + 1), t.y1, t.x1]];
    for (const [elev, yMeas, [xl, xr]] of levels) {
      const pts = outlines[key].map(([X, Z]) => project(null, p, [X, elev, Z]));
      const xs = pts.map((q) => q[0]);
      const front = pts.reduce((a, q) => (q[2] < a[2] ? q : a));
      r.push(t.hiddenLeft ? 0 : Math.min(...xs) - xl, Math.max(...xs) - xr, front[1] - yMeas);
    }
  }
  return r;
}

const cost = (v, p) => residuals(v, p).reduce((s, x) => s + x * x, 0);

// Levenberg–Marquardt with a numeric Jacobian
function fit(view, p0) {
  let p = [...p0], lambda = 1e-2, c = cost(view, p);
  const steps = [0.5, 0.5, 0.5, 0.002, 5, 2, 2];
  for (let it = 0; it < 400; it++) {
    const r = residuals(view, p);
    const J = r.map(() => new Array(p.length).fill(0));
    for (let j = 0; j < p.length; j++) {
      const q = [...p];
      q[j] += steps[j];
      const r2 = residuals(view, q);
      for (let i = 0; i < r.length; i++) J[i][j] = (r2[i] - r[i]) / steps[j];
    }
    const n = p.length;
    const A = Array.from({ length: n }, () => new Array(n).fill(0)), g = new Array(n).fill(0);
    for (let i = 0; i < r.length; i++) {
      for (let a = 0; a < n; a++) {
        g[a] += J[i][a] * r[i];
        for (let b = 0; b < n; b++) A[a][b] += J[i][a] * J[i][b];
      }
    }
    for (let a = 0; a < n; a++) A[a][a] *= 1 + lambda;
    const d = solve(A, g.map((x) => -x));
    const q = p.map((x, i) => x + d[i]);
    const cq = cost(view, q);
    if (cq < c) {
      p = q;
      lambda = Math.max(lambda / 3, 1e-7);
      if (c - cq < 1e-6) break;
      c = cq;
    } else lambda *= 4;
  }
  return { p, rms: Math.sqrt(cost(view, p) / residuals(view, p).length) };
}

function solve(A, b) {
  const n = b.length, M = A.map((row, i) => [...row, b[i]]);
  for (let i = 0; i < n; i++) {
    let m = i;
    for (let k = i + 1; k < n; k++) if (Math.abs(M[k][i]) > Math.abs(M[m][i])) m = k;
    [M[i], M[m]] = [M[m], M[i]];
    for (let k = i + 1; k < n; k++) {
      const t = M[k][i] / M[i][i];
      for (let j = i; j <= n; j++) M[k][j] -= t * M[i][j];
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = M[i][n];
    for (let j = i + 1; j < n; j++) s -= M[i][j] * x[j];
    x[i] = s / M[i][i];
  }
  return x;
}

// Starting guesses: street views from the avenue side, the river view from across the river
const starts = {
  v4: [[170, 8, 130, -0.86, 1900, 957, 670], [140, 5, 160, -0.7, 1700, 957, 670]],
  v2: [[180, 8, 140, -0.86, 1900, 957, 670], [150, 5, 170, -0.7, 1700, 957, 670]],
  v11: [[200, 4, 110, -0.95, 1900, 957, 670], [170, 4, 150, -0.8, 1700, 957, 670]],
  v10: [[220, 4, 0, -1.57, 2000, 957, 670], [200, 3, 30, -1.4, 1800, 957, 670]],
};

const out = {};
const SWAP = (process.env.SWAP || '').split(',');
for (const view of VIEWS) {
  if (SWAP.includes(view.id)) [view.towers.B, view.towers.V] = [view.towers.V, view.towers.B];
  let best = null;
  for (const s of starts[view.id]) {
    const r = fit(view, s);
    if (!best || r.rms < best.rms) best = r;
  }
  const [x, y, z, yaw, f, u0, v0] = best.p;
  out[view.id] = { pos: [x, y, z], yaw, f, u0, v0, rms: best.rms };
  if (process.env.DEBUG) console.error(view.id, residuals(view, best.p).map((v) => v.toFixed(0)).join(' '));
  console.error(view.id, 'rms px', best.rms.toFixed(1), 'pos', [x, y, z].map((v) => v.toFixed(1)).join(','), 'yaw°', ((yaw * 180) / Math.PI).toFixed(1), 'f', f.toFixed(0), 'u0,v0', u0.toFixed(0), v0.toFixed(0));
}
writeFileSync(new URL('../src/cameras.json', import.meta.url), JSON.stringify(out, null, 2));
