// Helpers that turn plan outlines (lines + arcs) into 3D geometry.
import * as THREE from 'three';

const RAD = Math.PI / 180;

/** Expand a path {start, ops} into segments [{a, b, type}] with arcs sampled every `step` degrees. */
export function tracePath(path, step = 4) {
  const segs = [];
  let p = path.start;
  for (const op of path.ops) {
    if (op.line) {
      if (Math.hypot(op.line[0] - p[0], op.line[1] - p[1]) > 1e-6) segs.push({ a: p, b: op.line, type: op.type });
      p = op.line;
    } else {
      const [cx, cy, r, a0, a1] = op.arc;
      const n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / step));
      for (let i = 1; i <= n; i++) {
        const a = (a0 + ((a1 - a0) * i) / n) * RAD;
        const q = [cx + r * Math.cos(a), cy + r * Math.sin(a)];
        segs.push({ a: p, b: q, type: op.type, curved: true });
        p = q;
      }
    }
  }
  return segs;
}

export function arcPoints(cx, cy, r, a0, a1, step = 4) {
  const n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / step));
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = (a0 + ((a1 - a0) * i) / n) * RAD;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}

export const segmentsToPoints = (segs) => [segs[0].a, ...segs.map((s) => s.b)];

const signedArea = (pts) => {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x0, z0] = pts[i], [x1, z1] = pts[(i + 1) % pts.length];
    s += x0 * z1 - x1 * z0;
  }
  return s / 2;
};

/**
 * Vertical strip along world-space segments, from y = 0 to y = 1 (scale it per floor).
 * `outward` is +1/-1 depending on the polygon winding so normals face out.
 * u is measured in tiles of `tile` meters.
 */
export function ribbon(segs, { tile = 1.5, closedPts = null, flip = false } = {}) {
  const pts = closedPts ?? segmentsToPoints(segs);
  let sign = signedArea(pts) > 0 ? 1 : -1;
  if (flip) sign = -sign;
  const pos = [], nor = [], uv = [];
  let dist = 0;
  const normals = segs.map((s) => {
    const dx = s.b[0] - s.a[0], dz = s.b[1] - s.a[1];
    const l = Math.hypot(dx, dz) || 1;
    return [(sign * dz) / l, (-sign * dx) / l];
  });
  segs.forEach((s, i) => {
    const len = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]);
    // smooth normals across consecutive curved segments
    const n0 = s.curved && i > 0 && segs[i - 1].curved ? avg(normals[i - 1], normals[i]) : normals[i];
    const n1 = s.curved && i < segs.length - 1 && segs[i + 1].curved ? avg(normals[i], normals[i + 1]) : normals[i];
    const u0 = dist / tile, u1 = (dist + len) / tile;
    const A0 = [s.a[0], 0, s.a[1]], B0 = [s.b[0], 0, s.b[1]], A1 = [s.a[0], 1, s.a[1]], B1 = [s.b[0], 1, s.b[1]];
    // winding: (A0, A1, B0) faces +sign side
    const tri = sign > 0
      ? [[A0, n0, u0, 0], [A1, n0, u0, 1], [B0, n1, u1, 0], [B0, n1, u1, 0], [A1, n0, u0, 1], [B1, n1, u1, 1]]
      : [[A0, n0, u0, 0], [B0, n1, u1, 0], [A1, n0, u0, 1], [B0, n1, u1, 0], [B1, n1, u1, 1], [A1, n0, u0, 1]];
    for (const [p, n, u, v] of tri) {
      pos.push(...p);
      nor.push(n[0], 0, n[1]);
      uv.push(u, v);
    }
    dist += len;
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return g;
}
const avg = (a, b) => {
  const x = a[0] + b[0], z = a[1] + b[1], l = Math.hypot(x, z) || 1;
  return [x / l, z / l];
};

/** Flat slab from a closed world-space outline, from y = 0 to y = depth. */
export function slabGeometry(pts, depth) {
  const shape = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, z)));
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 1 });
  g.rotateX(Math.PI / 2);
  g.translate(0, depth, 0);
  return g;
}

/** Flat polygon at y = 0 with UVs mapped by `uvOf(x, z)`. */
export function flatGeometry(pts, uvOf) {
  const shape = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, z)));
  const g = new THREE.ShapeGeometry(shape);
  const p = g.attributes.position;
  const uv = g.attributes.uv;
  const out = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getY(i);
    out[i * 3] = x;
    out[i * 3 + 1] = 0;
    out[i * 3 + 2] = z;
    if (uvOf) {
      const [u, v] = uvOf(x, z);
      uv.setXY(i, u, v);
    }
  }
  g.setAttribute('position', new THREE.BufferAttribute(out, 3));
  // shape is in x/z now: make sure the face points up
  const idx = g.index.array;
  const ax = out[idx[0] * 3], az = out[idx[0] * 3 + 2];
  const bx = out[idx[1] * 3], bz = out[idx[1] * 3 + 2];
  const cx = out[idx[2] * 3], cz = out[idx[2] * 3 + 2];
  const ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);
  if (ny < 0) {
    for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
  }
  g.computeVertexNormals();
  return g;
}
