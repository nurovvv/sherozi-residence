// One block (hotel А-16 or residential Б-20 / В-24), built floor by floor so floors can be
// highlighted and the floors above hidden for the cut-away plan view.
import * as THREE from 'three';
import { blockToWorld, FIRST_TOWER_FLOOR, FIRST_APARTMENT_FLOOR, worldToPt } from './config.js';
import { tracePath, segmentsToPoints, ribbon, slabGeometry, flatGeometry, arcPoints } from './geometry.js';

const SLAB_T = 0.35;

export function buildBlock(block, M, plan) {
  const root = new THREE.Group();
  root.name = block.name;
  const toW = (p) => blockToWorld(block, p[0], p[1]);
  const mapSegs = (segs) => segs.map((s) => ({ ...s, a: toW(s.a), b: toW(s.b) }));

  const slabSegs = mapSegs(tracePath(block.slab));
  const slabPts = segmentsToPoints(slabSegs).slice(0, -1);
  const wallSegs = mapSegs(tracePath(block.wall));
  const wallPts = segmentsToPoints(wallSegs).slice(0, -1);

  const geo = {
    brick: ribbon(wallSegs.filter((s) => s.type === 'brick'), { tile: 1.65, closedPts: wallPts }),
    glass: ribbon(wallSegs.filter((s) => s.type === 'glass'), { tile: 1.5, closedPts: wallPts }),
    allGlass: ribbon(wallSegs, { tile: 1.5, closedPts: wallPts }),
    store: ribbon(wallSegs, { tile: 3, closedPts: wallPts }),
    slab: slabGeometry(slabPts, SLAB_T),
    wallSlab: slabGeometry(wallPts, 0.3),
    overlay: slabGeometry(slabPts, 1),
    rails: mergeRails(block.rails.map(([cx, cy, r, a0, a1]) => arcPoints(cx, cy, r, a0, a1, 4).map(toW))),
    crown: ribbon(slabSegs, { tile: 0.9, closedPts: slabPts }),
    roof: flatGeometry(wallPts, (x, z) => [x / 4, z / 4]),
  };
  if (plan) {
    const [x0, y0, x1, y1] = plan.rect;
    geo.plan = flatGeometry(slabPts, (x, z) => {
      const [px, py] = worldToPt(x, z);
      return [(px - x0) / (x1 - x0), 1 - (py - y0) / (y1 - y0)];
    });
  }

  const mesh = (g, mat, y, h = 1, { cast = true } = {}) => {
    const m = new THREE.Mesh(g, mat);
    m.position.y = y;
    m.scale.y = h;
    m.castShadow = cast;
    m.receiveShadow = true;
    return m;
  };

  // podium floors 1–3 under the block (mostly hidden inside the shopping centre)
  const base = new THREE.Group();
  for (let f = 1; f < FIRST_TOWER_FLOOR; f++) {
    const e = block.elevation(f), h = block.elevation(f + 1) - e;
    base.add(mesh(geo.store, f === 1 ? M.store : M.glassLight, e, h));
    base.add(mesh(geo.wallSlab, M.white, e + h - 0.3));
  }
  root.add(base);

  const floors = new Map();
  for (let f = FIRST_TOWER_FLOOR; f <= block.floors; f++) {
    const e = block.elevation(f), h = block.elevation(f + 1) - e;
    const g = new THREE.Group();
    const walls = new THREE.Group();
    if (f < FIRST_APARTMENT_FLOOR) {
      walls.add(mesh(geo.allGlass, M.glassLight, e, h));
    } else {
      g.add(mesh(geo.slab, M.white, e - SLAB_T));
      walls.add(mesh(geo.brick, M.brick, e - SLAB_T, h));
      walls.add(mesh(geo.glass, M.glass, e, h - SLAB_T));
      walls.add(mesh(geo.rails, M.rail, e, 1.1, { cast: false }));
    }
    g.add(walls);
    const overlay = new THREE.Mesh(geo.overlay, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    overlay.position.y = e + 0.02;
    overlay.scale.y = h - 0.05;
    overlay.visible = false;
    overlay.renderOrder = 10;
    overlay.userData = { block: block.key, floor: f };
    g.add(overlay);
    root.add(g);
    floors.set(f, { group: g, walls, overlay, e, h });
  }

  // roof, crown with white fins, plant rooms, solar panels
  const roofY = block.elevation(block.floors + 1);
  const crownH = block.kind === 'hotel' ? 3.6 : 3.3;
  const crown = new THREE.Group();
  crown.add(mesh(geo.slab, M.white, roofY - SLAB_T));
  crown.add(mesh(geo.roof, M.roof, roofY + 0.01, 1, { cast: false }));
  crown.add(mesh(geo.crown, M.fins, roofY, crownH - 0.4));
  crown.add(mesh(geo.crown, M.white, roofY + crownH - 0.4, 0.4));
  const [cx, cz] = toW(block.center);
  const rotY = -((block.angleDeg * Math.PI) / 180);
  const plant = new THREE.Mesh(new THREE.BoxGeometry(9, 3.2, 5.5), M.dark);
  plant.position.set(cx, roofY + 1.6, cz);
  plant.rotation.y = rotY;
  plant.castShadow = true;
  crown.add(plant);
  const panels = new THREE.InstancedMesh(new THREE.BoxGeometry(2.0, 0.06, 1.1), M.solar, 24);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.35, rotY, 0, 'YXZ'));
  let i = 0;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 6; c++) {
      const [px, pz] = toW([block.center[0] - 9 + c * 3.4, block.center[1] + (r < 2 ? -8 - r * 2.4 : 6 + (r - 2) * 2.4)]);
      panels.setMatrixAt(i++, m4.compose(new THREE.Vector3(px, roofY + 0.7, pz), q, new THREE.Vector3(1, 1, 1)));
    }
  }
  crown.add(panels);
  root.add(crown);

  const extras = new THREE.Group(); // facade features hidden in the cut-away view
  root.add(extras);
  if (block.kind === 'hotel') {
    // vertical HOTEL sign on the facade facing the avenue
    const signTex = verticalSign('HOTEL');
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 26), new THREE.MeshStandardMaterial({ map: signTex, emissive: 0xffffff, emissiveMap: signTex, emissiveIntensity: 0.6, roughness: 0.5 }));
    const [sx, sz] = toW([26.4, 0.9]);
    sign.position.set(sx, 42, sz);
    sign.rotation.y = rotY;
    extras.add(sign);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(3.2, roofY - 16, 0.6), M.stone);
    strip.position.set(...toWW(toW([26.4, 1.25]), (roofY + 16) / 2));
    strip.rotation.y = rotY;
    strip.castShadow = true;
    extras.add(strip);
  }

  let planMesh = null;
  if (geo.plan) {
    planMesh = new THREE.Mesh(geo.plan, new THREE.MeshBasicMaterial({ map: plan.texture, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    planMesh.visible = false;
    root.add(planMesh);
  }

  return {
    block,
    root,
    floors,
    crown,
    center: new THREE.Vector3(cx, 0, cz),
    roofY,
    pickables: [...floors.values()].map((f) => f.overlay),
    // Hide everything above `floor` and lay the drawing on that floor.
    cutaway(floor) {
      for (const [f, fl] of floors) {
        fl.group.visible = floor == null || f <= floor;
        fl.walls.visible = floor == null || f < floor;
      }
      crown.visible = floor == null;
      extras.visible = floor == null;
      if (planMesh) {
        planMesh.visible = floor != null;
        if (floor != null) planMesh.position.y = floors.get(floor).e + 0.03;
      }
    },
  };
}

const toWW = ([x, z], y) => [x, y, z];

function mergeRails(lines) {
  // one open ribbon per balcony arc, merged into a single geometry
  const geos = lines.map((pts) => {
    const segs = [];
    for (let i = 1; i < pts.length; i++) segs.push({ a: pts[i - 1], b: pts[i], curved: true });
    return ribbon(segs, { tile: 1.5, closedPts: pts });
  });
  const merged = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'uv']) {
    const arrays = geos.map((g) => g.attributes[name].array);
    const total = arrays.reduce((n, a) => n + a.length, 0);
    const out = new Float32Array(total);
    let o = 0;
    for (const a of arrays) {
      out.set(a, o);
      o += a.length;
    }
    merged.setAttribute(name, new THREE.BufferAttribute(out, name === 'uv' ? 2 : 3));
  }
  return merged;
}

function verticalSign(text) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 1280;
  const g = c.getContext('2d');
  g.fillStyle = '#8f8b86';
  g.fillRect(0, 0, 128, 1280);
  g.fillStyle = '#ffffff';
  g.font = 'bold 150px Georgia, serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  [...text].forEach((ch, i) => g.fillText(ch, 64, 140 + i * 250));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

