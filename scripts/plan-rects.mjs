// Prints the drawing-sheet rectangle (in points) around each block's floor plate,
// used to cut the floor-plan images out of sheet АР-7.
import { BLOCKS, blockToWorld, worldToPt } from '../src/config.js';
import { tracePath, segmentsToPoints } from '../src/geometry.js';

const W = 1683, H = 2384, M = 25;
const out = {};
for (const b of Object.values(BLOCKS)) {
  const pts = segmentsToPoints(tracePath(b.slab)).map((p) => worldToPt(...blockToWorld(b, ...p)));
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const r = [Math.min(...xs) - M, Math.min(...ys) - M, Math.max(...xs) + M, Math.max(...ys) + M].map((v) => Math.round(v));
  out[b.key] = r;
  console.error(b.key, r.join(' '), 'fractions', (r[0] / W).toFixed(5), (r[1] / H).toFixed(5), (r[2] / W).toFixed(5), (r[3] / H).toFixed(5));
}
console.log(JSON.stringify(out));
