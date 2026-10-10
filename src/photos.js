// Photo view: the client's renders with clickable floors drawn over each tower.
// Coordinates are pixels in the cropped renders (1915 x 1340). For each tower we mark
// the left/right edges and the bottom of the 5th floor / top of the last floor; floors
// in between are placed by their real elevations.
import { BLOCKS } from './config.js';

export const W = 1915, H = 1340;

export const VIEWS = [
  {
    id: 'v4', src: './renders/v4.jpg',
    towers: {
      A: { x0: [250, 740], x1: [275, 715], y0: 945, y1: 390 },
      B: { x0: [915, 1430], x1: [935, 1430], y0: 930, y1: 225 },
      V: { x0: [1430, 1585], x1: [1430, 1585], y0: 905, y1: 250 },
    },
  },
  {
    id: 'v2', src: './renders/v2.jpg',
    towers: {
      A: { x0: [410, 830], x1: [430, 810], y0: 925, y1: 500 },
      B: { x0: [965, 1415], x1: [975, 1415], y0: 905, y1: 215 },
      V: { x0: [1415, 1665], x1: [1420, 1660], y0: 880, y1: 255 },
    },
  },
  {
    id: 'v11', src: './renders/v11.jpg',
    towers: {
      A: { x0: [540, 915], x1: [555, 895], y0: 1055, y1: 640 },
      B: { x0: [1015, 1420], x1: [1030, 1420], y0: 1030, y1: 380 },
      V: { x0: [1420, 1745], x1: [1420, 1740], y0: 1015, y1: 360 },
    },
  },
  {
    id: 'v10', src: './renders/v10.jpg',
    towers: {
      A: { x0: [485, 800], x1: [500, 775], y0: 1000, y1: 655 },
      B: { x0: [852, 1147], x1: [852, 1147], y0: 990, y1: 450 },
      V: { x0: [1210, 1537], x1: [1215, 1535], y0: 965, y1: 390 },
    },
  },
];

const FIRST = 5;
const lerp = (a, b, t) => a + (b - a) * t;

// Polygon for one floor of one tower in one view
function floorPolygon(t, block, floor) {
  const e0 = block.elevation(FIRST), e1 = block.elevation(block.floors + 1);
  const a = (block.elevation(floor) - e0) / (e1 - e0);
  const b = (block.elevation(floor + 1) - e0) / (e1 - e0);
  const yA = lerp(t.y0, t.y1, a), yB = lerp(t.y0, t.y1, b);
  const L = (k) => lerp(t.x0[0], t.x1[0], k), R = (k) => lerp(t.x0[1], t.x1[1], k);
  return `${L(a)},${yA} ${R(a)},${yA} ${R(b)},${yB} ${L(b)},${yB}`;
}

export function buildPhotoView(root, { onHover, onPick }) {
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.id = 'photo-svg';
  root.appendChild(svg);
  let current = null;
  const polys = [];

  function show(viewId) {
    const v = VIEWS.find((x) => x.id === viewId) ?? VIEWS[0];
    current = v;
    svg.innerHTML = '';
    polys.length = 0;
    const img = document.createElementNS(svgNS, 'image');
    img.setAttribute('href', v.src);
    img.setAttribute('width', W);
    img.setAttribute('height', H);
    svg.appendChild(img);
    for (const [key, t] of Object.entries(v.towers)) {
      const block = BLOCKS[key];
      for (let f = FIRST; f <= block.floors; f++) {
        const p = document.createElementNS(svgNS, 'polygon');
        p.setAttribute('points', floorPolygon(t, block, f));
        p.setAttribute('class', 'floor-poly');
        p.dataset.block = key;
        p.dataset.floor = f;
        p.addEventListener('pointerenter', (e) => onHover({ block: key, floor: f }, e));
        p.addEventListener('pointermove', (e) => onHover({ block: key, floor: f }, e));
        p.addEventListener('pointerleave', () => onHover(null));
        p.addEventListener('click', () => onPick({ block: key, floor: f }));
        svg.appendChild(p);
        polys.push(p);
      }
    }
    fit();
  }

  // Fill the screen on wide displays; show the whole image on tall phone screens
  function fit() {
    svg.setAttribute('preserveAspectRatio', innerWidth / innerHeight > 1 ? 'xMidYMid slice' : 'xMidYMid meet');
  }
  addEventListener('resize', fit);

  return {
    show,
    get view() {
      return current?.id;
    },
    highlight(h) {
      for (const p of polys) {
        p.classList.toggle('on', !!h && p.dataset.block === h.block && +p.dataset.floor === h.floor);
      }
    },
  };
}
