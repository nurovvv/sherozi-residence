// The curved shopping centre (floors 1–3) with its roof terrace, plus the 4th-floor strip.
import * as THREE from 'three';
import { PODIUM } from './config.js';
import { ribbon, slabGeometry } from './geometry.js';

const RAD = Math.PI / 180;

// Closed outline of the curve + straight wing, grown outward by d (meters)
function outline({ rOut, rIn, arcEnd, top, d = 0 }) {
  const Ro = rOut + d, Ri = rIn - d, T = top - d;
  const pts = [[Ro, T]];
  const n = Math.ceil(arcEnd / 2);
  for (let i = 0; i <= n; i++) {
    const a = ((arcEnd * i) / n) * RAD;
    pts.push([Ro * Math.cos(a), Ro * Math.sin(a)]);
  }
  for (let i = n; i >= 0; i--) {
    const a = ((arcEnd * i) / n) * RAD;
    pts.push([Ri * Math.cos(a), Ri * Math.sin(a)]);
  }
  pts.push([Ri, T]);
  return pts;
}

// Segments of a closed outline, split into the street side (outer) and the rest
function facadeSegs(pts, outerCount) {
  const segs = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    segs.push({ a, b, outer: i < outerCount, curved: i > 0 && i < outerCount });
  }
  return segs;
}

/** Footprint of the shopping centre, grown by d meters (used to keep walkers out). */
export function podiumOutline(d = 0) {
  return outline({ rOut: PODIUM.rOut, rIn: PODIUM.rIn, arcEnd: PODIUM.arcEndDeg, top: PODIUM.wingTopZ, d });
}

export function buildPodium(M) {
  const root = new THREE.Group();
  const P = PODIUM;
  const main = { rOut: P.rOut, rIn: P.rIn, arcEnd: P.arcEndDeg, top: P.wingTopZ };
  const pts = outline(main);
  const nArc = Math.ceil(P.arcEndDeg / 2);
  const segs = facadeSegs(pts, nArc + 1);
  const outer = segs.filter((s) => s.outer), inner = segs.filter((s) => !s.outer);

  const add = (geo, mat, y, h = 1, cast = true) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.y = y;
    m.scale.y = h;
    m.castShadow = cast;
    m.receiveShadow = true;
    m.userData.podium = true;
    root.add(m);
    return m;
  };

  const [l0, l1, l2, l3] = P.levels;
  add(ribbon(outer, { tile: 3, closedPts: pts }), M.store, l0, l1 - l0);
  add(ribbon(inner, { tile: 3, closedPts: pts }), M.store, l0, l1 - l0);
  add(ribbon(outer, { tile: 1.5, closedPts: pts }), M.glassLight, l1, l2 - l1);
  add(ribbon(inner, { tile: 1.5, closedPts: pts }), M.glassLight, l1, l2 - l1);
  add(ribbon(outer, { tile: 4, closedPts: pts }), M.copper, l2, l3 - l2);
  add(ribbon(inner, { tile: 1.5, closedPts: pts }), M.glassLight, l2, l3 - l2);

  // white floor bands that stick out of the facade, and the roof terrace
  const band = slabGeometry(outline({ ...main, d: 0.45 }), 1);
  add(band, M.white, l1 - 0.25, 0.5);
  add(band, M.white, l2 - 0.25, 0.5);
  const roof = slabGeometry(outline({ ...main, d: 0.45 }), 0.6);
  add(roof, [M.terrace, M.white], l3 - 0.6);
  const parapet = outline({ ...main, d: 0.3 });
  add(ribbon(facadeSegs(parapet, 0), { closedPts: parapet }), M.rail, l3, 1.1, false);

  // 4th floor: glass strip along the outer facade from block Б to block В
  const up = { rOut: P.rOut - 0.8, rIn: P.upper.rIn, arcEnd: P.upper.arcEndDeg, top: P.wingTopZ + 0.8 };
  const upPts = outline(up);
  add(ribbon(facadeSegs(upPts, 0), { tile: 1.5, closedPts: upPts }), M.glassLight, l3, P.upper.top - l3);
  add(slabGeometry(outline({ ...up, d: 0.4 }), 0.45), M.white, P.upper.top - 0.5);

  root.add(terrace(M));
  return root;
}

// Roof terrace on the curve: pool with deck between the hotel and block Б, playground between Б and В
function terrace(M) {
  const g = new THREE.Group();
  const y = PODIUM.levels[3];
  const box = (w, h, d, mat, x, yy, z, ry = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, yy, z);
    m.rotation.y = ry;
    m.castShadow = m.receiveShadow = true;
    g.add(m);
    return m;
  };
  const at = (r, deg) => [r * Math.cos(deg * RAD), r * Math.sin(deg * RAD)];
  const tangent = (deg) => -(deg + 90) * RAD;

  // pool
  const [px, pz] = at(45, 72);
  const ry = tangent(72);
  box(24, 0.16, 13, M.deck, px, y + 0.08, pz, ry);
  box(15, 0.2, 7, M.white, px, y + 0.12, pz, ry);
  box(14, 0.08, 6, M.water, px, y + 0.2, pz, ry);
  for (const s of [-1, 1]) {
    const [ox, oz] = [Math.cos(ry) * s * 9, -Math.sin(ry) * s * 9];
    for (const k of [-1, 0, 1]) {
      const [lx, lz] = [Math.sin(ry) * k * 2.2, Math.cos(ry) * k * 2.2];
      box(1.8, 0.3, 0.7, M.white, px + ox + lx, y + 0.3, pz + oz + lz, ry);
    }
  }
  // pergolas and planters
  for (const [r, deg] of [[38, 88], [52, 58], [36, 60]]) {
    const [x, z] = at(r, deg);
    for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) box(0.2, 3, 0.2, M.wood, x + dx, y + 1.5, z + dz);
    box(4.6, 0.2, 4.6, M.wood, x, y + 3.05, z);
  }
  const trees = [[34, 80], [55, 86], [57, 70], [33, 68], [48, 52], [56, 48], [58, 78], [50, 64]];
  for (const [r, deg] of trees) {
    const [x, z] = at(r, deg);
    box(2.4, 0.6, 2.4, M.stone, x, y + 0.3, z);
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1.9, 1), M.leaf);
    crown.position.set(x, y + 3.2, z);
    crown.castShadow = true;
    g.add(crown);
    box(0.25, 2.2, 0.25, M.wood, x, y + 1.6, z);
  }

  // playground between Б and В
  const [gx, gz] = [41, -9];
  box(15, 0.08, 10, M.playBlue, gx, y + 0.04, gz);
  box(6, 0.09, 4, M.playOrange, gx - 3, y + 0.05, gz + 2);
  box(3, 2.4, 3, M.playRed, gx + 3, y + 1.2, gz - 2);
  box(1.2, 0.2, 4, M.playYellow, gx + 3, y + 1.6, gz + 1.5);
  for (const dx of [-5, -2]) box(0.15, 2.6, 0.15, M.dark, gx + dx, y + 1.3, gz - 3);
  box(3.3, 0.15, 0.15, M.dark, gx - 3.5, y + 2.6, gz - 3);
  return g;
}
