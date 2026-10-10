import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { BLOCKS, FIRST_APARTMENT_FLOOR, AREA_PER_FLOOR } from './config.js';
import { buildSite } from './site.js';
import { buildPodium } from './podium.js';
import { buildBlock } from './tower.js';
import * as T from './textures.js';
import { STR, LANGS } from './i18n.js';
import planRects from './plan-rects.json';

const $ = (s) => document.querySelector(s);

// ---------- renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
$('#stage').appendChild(renderer.domElement);
const canvas = renderer.domElement;

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;

const camera = new THREE.PerspectiveCamera(36, innerWidth / innerHeight, 0.5, 5000);
const HOME = { pos: new THREE.Vector3(205, 92, 160), target: new THREE.Vector3(12, 30, 2) };
camera.position.copy(HOME.pos);
const controls = new OrbitControls(camera, canvas);
controls.target.copy(HOME.target);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 15;
controls.maxDistance = 600;
controls.maxPolarAngle = Math.PI * 0.49;
controls.autoRotateSpeed = 0.3;

// ---------- materials ----------
const std = (o) => new THREE.MeshStandardMaterial(o);
const paving = T.pavingTexture();
paving.repeat.set(0.25, 0.25);
const store = T.storefrontTexture();
const M = {
  brick: std({ map: T.brickWindowTexture(), roughness: 0.8 }),
  glass: std({ map: T.glassTexture(), roughness: 0.12, metalness: 0.45, envMapIntensity: 1.3 }),
  glassLight: std({ map: T.glassTexture({ light: true }), roughness: 0.12, metalness: 0.35, envMapIntensity: 1.2 }),
  store: std({ map: store, emissive: 0xffffff, emissiveMap: store, emissiveIntensity: 0.18, roughness: 0.2, metalness: 0.2 }),
  copper: std({ map: T.copperTexture(), roughness: 0.45, metalness: 0.35 }),
  white: std({ color: 0xf3f1ec, roughness: 0.55 }),
  rail: new THREE.MeshPhysicalMaterial({ color: 0xcfe2ee, roughness: 0.05, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false }),
  fins: std({ map: T.finTexture(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.5 }),
  roof: std({ color: 0xc0675d, roughness: 0.9 }),
  dark: std({ color: 0x2d3238, roughness: 0.7 }),
  solar: std({ color: 0x1d2a44, roughness: 0.25, metalness: 0.6 }),
  stone: std({ color: 0x9c968f, roughness: 0.8 }),
  terrace: std({ map: paving, roughness: 0.9 }),
  deck: std({ color: 0xa77b52, roughness: 0.7 }),
  water: std({ color: 0x2fa6dc, roughness: 0.05, metalness: 0.1, emissive: 0x0b4f73, emissiveIntensity: 0.4 }),
  wood: std({ color: 0x8a6342, roughness: 0.7 }),
  leaf: std({ color: 0x5d8f45, roughness: 0.9 }),
  playBlue: std({ color: 0x2f86d0, roughness: 0.9 }),
  playOrange: std({ color: 0xef8a2f, roughness: 0.9 }),
  playRed: std({ color: 0xd8443b, roughness: 0.7 }),
  playYellow: std({ color: 0xf3c63d, roughness: 0.7 }),
};

// ---------- scene ----------
buildSite(scene);
const podium = buildPodium(M);
scene.add(podium);

const loader = new THREE.TextureLoader();
const blocks = {};
for (const b of Object.values(BLOCKS)) {
  const texture = loader.load(`./plans/${b.key}.png`);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  const built = buildBlock(b, M, { rect: planRects[b.key], texture });
  scene.add(built.root);
  blocks[b.key] = built;
}
const pickables = Object.values(blocks).flatMap((b) => b.pickables);

// ---------- state ----------
let lang = 'ru';
try {
  const saved = localStorage.getItem('simsim-lang');
  if (LANGS.includes(saved)) lang = saved;
} catch {}
const S = () => STR[lang];
const state = { mode: 'overview', block: 'V', floor: null, hover: null };
let lastInteraction = performance.now();

// ---------- camera ----------
let tween = null;
function flyTo(pos, target, dur = 1.2) {
  tween = { p0: camera.position.clone(), t0: controls.target.clone(), p1: pos.clone(), t1: target.clone(), t: 0, dur };
  controls.enabled = false;
}
function floorView(key, floor) {
  const b = blocks[key];
  const target = b.center.clone().setY(b.floors.get(floor).e);
  const out = new THREE.Vector3(b.center.x - 5, 0, b.center.z - 5).normalize();
  if (key === 'A') out.set(-0.2, 0, 1).normalize();
  return { pos: target.clone().add(out.multiplyScalar(46)).add(new THREE.Vector3(0, 68, 0)), target };
}

// ---------- highlight ----------
function updateHighlight() {
  for (const b of Object.values(blocks)) {
    for (const [f, fl] of b.floors) {
      const m = fl.overlay;
      const hovered = state.hover && state.hover.block === b.block.key && state.hover.floor === f;
      const selected = state.mode === 'floor' && state.block === b.block.key && state.floor === f;
      m.visible = hovered && !selected;
      m.material.color.setHex(0xffffff);
      m.material.opacity = 0.45;
    }
  }
  document.querySelectorAll('.floor-btn').forEach((el) => {
    el.classList.toggle('hover', !!state.hover && state.hover.block === state.block && +el.dataset.floor === state.hover.floor);
  });
}

// ---------- UI ----------
function floorsOf(key) {
  const b = BLOCKS[key];
  const first = key === 'A' ? 5 : FIRST_APARTMENT_FLOOR;
  const list = [];
  for (let f = b.floors; f >= first; f--) list.push(f);
  return list;
}

function renderLang() {
  $('#lang').innerHTML = LANGS.map((l) => `<button data-lang="${l}" class="${l === lang ? 'on' : ''}">${STR[l].langName}</button>`).join('');
  $('#brand-sub').textContent = S().brandSub;
}

function renderFloors() {
  const s = S();
  const tabs = ['V', 'B', 'A']
    .map((k) => `<button class="tab ${state.block === k ? 'on' : ''}" data-block="${k}">${s.blockShort[k]}</button>`)
    .join('');
  const list = floorsOf(state.block)
    .map((f) => `<button class="floor-btn ${state.mode === 'floor' && state.floor === f ? 'active' : ''}" data-floor="${f}">
        <span class="num">${f}</span><span class="meta">${s.floor(f)}</span></button>`)
    .join('');
  $('#floors').innerHTML = `
    <button class="overview-btn" data-act="overview">${s.complex}</button>
    <div class="tabs">${tabs}</div>
    <div class="label">${s.blocks[state.block]}</div>
    <div class="floor-list">${list}</div>`;
}

function renderSide() {
  const s = S();
  const side = $('#side');
  if (state.mode === 'overview') {
    side.innerHTML = `
      <h2>${s.title}</h2>
      <p class="sub">${s.sub}</p>
      <dl class="facts">${s.facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
      <p class="note">${s.pickHint}</p>`;
  } else {
    const b = blocks[state.block];
    const fl = b.floors.get(state.floor);
    const isHotel = state.block === 'A';
    side.innerHTML = `
      <button class="back" data-act="overview">${s.back}</button>
      <div class="eyebrow">${s.blocks[state.block]}</div>
      <h2>${s.floor(state.floor)}</h2>
      <div class="specs">
        <div><span>${s.heightLabel}</span><b>+${fl.e.toFixed(3).replace('.', lang === 'en' ? '.' : ',')}</b></div>
        ${isHotel ? `<div><span>${s.hotel}</span><b>${s.floorsCount(16)}</b></div>` : `<div><span>${s.areaLabel}</span><b>${AREA_PER_FLOOR.toLocaleString(lang === 'en' ? 'en-US' : 'ru-RU')} м²</b></div>`}
      </div>
      <p class="note">${isHotel ? s.hotelNote : s.planNote}</p>`;
  }
  $('#hint').textContent = state.mode === 'overview' ? s.hintOverview : s.hintFloor;
}

function refresh() {
  renderLang();
  renderFloors();
  renderSide();
  updateHighlight();
}

$('#lang').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  lang = b.dataset.lang;
  try {
    localStorage.setItem('simsim-lang', lang);
  } catch {}
  document.documentElement.lang = lang === 'tg' ? 'tg' : lang;
  refresh();
});
$('#floors').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.act === 'overview') goOverview();
  else if (b.dataset.block) {
    state.block = b.dataset.block;
    renderFloors();
  } else if (b.dataset.floor) selectFloor(state.block, +b.dataset.floor);
});
$('#floors').addEventListener('pointerover', (e) => {
  const b = e.target.closest('.floor-btn');
  state.hover = b ? { block: state.block, floor: +b.dataset.floor } : null;
  updateHighlight();
});
$('#floors').addEventListener('pointerleave', () => {
  state.hover = null;
  updateHighlight();
});
$('#side').addEventListener('click', (e) => {
  if (e.target.closest('[data-act="overview"]')) goOverview();
});
addEventListener('keydown', (e) => {
  if (e.code === 'Escape' && state.mode === 'floor') goOverview();
});

function selectFloor(key, floor) {
  for (const b of Object.values(blocks)) b.cutaway(b.block.key === key ? floor : null);
  Object.assign(state, { mode: 'floor', block: key, floor });
  const v = floorView(key, floor);
  flyTo(v.pos, v.target);
  refresh();
}

function goOverview() {
  for (const b of Object.values(blocks)) b.cutaway(null);
  Object.assign(state, { mode: 'overview', floor: null });
  flyTo(HOME.pos, HOME.target, 1.4);
  refresh();
}

// ---------- picking ----------
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const tooltip = $('#tooltip');
function pick(e) {
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  // only floors that are currently shown can be picked
  const list = pickables.filter((o) => {
    const { block, floor } = o.userData;
    if (block === 'A' && floor < 5) return false;
    if (block !== 'A' && floor < FIRST_APARTMENT_FLOOR) return false;
    return state.mode === 'overview' || block !== state.block || floor <= state.floor;
  });
  const hit = ray.intersectObjects(list, false)[0];
  return hit ? hit.object.userData : null;
}
let down = null;
canvas.addEventListener('pointerdown', (e) => {
  down = { x: e.clientX, y: e.clientY };
  lastInteraction = performance.now();
});
canvas.addEventListener('pointermove', (e) => {
  if (e.buttons || e.pointerType === 'touch') {
    tooltip.style.opacity = 0;
    return;
  }
  const h = pick(e);
  const same = h && state.hover && h.block === state.hover.block && h.floor === state.hover.floor;
  if (!same) {
    state.hover = h;
    updateHighlight();
  }
  canvas.style.cursor = h ? 'pointer' : '';
  if (h) {
    const s = S();
    tooltip.innerHTML = `<b>${s.blocks[h.block]}</b><br>${s.floor(h.floor)} · ${h.block === 'A' ? s.hotel : s.residential}`;
    tooltip.style.left = `${e.clientX + 16}px`;
    tooltip.style.top = `${e.clientY + 12}px`;
    tooltip.style.opacity = 1;
  } else tooltip.style.opacity = 0;
});
canvas.addEventListener('pointerleave', () => {
  tooltip.style.opacity = 0;
  state.hover = null;
  updateHighlight();
});
canvas.addEventListener('pointerup', (e) => {
  if (!down) return;
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6;
  down = null;
  if (moved) return;
  const h = pick(e);
  if (!h) return;
  tooltip.style.opacity = 0;
  if (state.block !== h.block) state.block = h.block;
  selectFloor(h.block, h.floor);
});
addEventListener('wheel', () => (lastInteraction = performance.now()), { passive: true });

// ---------- loop ----------
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
const clock = new THREE.Clock();
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  if (tween) {
    tween.t += dt;
    const k = ease(Math.min(1, tween.t / tween.dur));
    camera.position.lerpVectors(tween.p0, tween.p1, k);
    controls.target.lerpVectors(tween.t0, tween.t1, k);
    camera.lookAt(controls.target);
    if (k >= 1) {
      tween = null;
      controls.enabled = true;
    }
  } else {
    controls.autoRotate = state.mode === 'overview' && performance.now() - lastInteraction > 25000;
    controls.update();
  }
  renderer.render(scene, camera);
});

refresh();
