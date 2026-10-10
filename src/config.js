// "Сим-Сим" complex (Шаҳрофар), S. Sherozi ave., Dushanbe.
// All positions come from the architectural drawings (sheet АР-7, typical floor plan).
// World units are meters. X/Z follow the drawing sheet (X → right, Z → down the sheet), Y is up.

export const PT = 0.07415; // meters per drawing point on sheet АР-7
export const ARC_CENTER_PT = [724.8, 1212.6]; // centre of the podium's curved facade on АР-7
export const ptToWorld = (px, py) => [(px - ARC_CENTER_PT[0]) * PT, (py - ARC_CENTER_PT[1]) * PT];
export const worldToPt = (x, z) => [x / PT + ARC_CENTER_PT[0], z / PT + ARC_CENTER_PT[1]];

// Podium (shopping centre): curved band + straight wing under block В
export const PODIUM = {
  rOut: 60.53,
  rIn: 29.33,
  arcEndDeg: 100, // where the curve meets the hotel
  wingTopZ: -56.2, // north end of the straight wing (axis 40)
  levels: [0, 6.0, 10.2, 14.4], // floors 1–3, roof terrace at +14.4
  upper: { top: 18.6, rIn: 50.5, arcEndDeg: 48 }, // 4th floor strip along the outer facade
};

// Residential floor elevations (section 1-1): 1st floor 6.0 m, podium floors 4.2 m,
// 5th floor 3.6 m, 6th 3.6 m, then 3.3 m.
export function residentialElevation(floor) {
  if (floor <= 1) return 0;
  if (floor <= 4) return 6.0 + (floor - 2) * 4.2;
  if (floor === 5) return 18.6;
  if (floor === 6) return 22.2;
  return 25.5 + (floor - 7) * 3.3;
}
// Hotel floors are 3.6 m from the 5th floor up.
export function hotelElevation(floor) {
  if (floor <= 4) return residentialElevation(floor);
  return 18.6 + (floor - 5) * 3.6;
}

// Plan outlines in each block's local grid frame (x along the lettered axes, y along the numbered axes).
// Residential plate, block В frame: И'..Б' = 0..33 m, axes 35..39 = 0..25 m.
const arc = (cx, cy, r, a0, a1, type) => ({ arc: [cx, cy, r, a0, a1], type });
const line = (x, y, type) => ({ line: [x, y], type });

export const RES_SLAB = {
  start: [26.85, -2.3],
  ops: [
    arc(26.85, 6.0, 8.3, -90, 0),
    line(35.15, 12.95),
    arc(20.95, 12.95, 14.2, 0, 90),
    line(6.3, 27.2),
    arc(6.3, 18.8, 8.4, 90, 180),
    line(-2.1, 6.1),
    arc(6.3, 6.1, 8.4, 180, 270),
    line(26.85, -2.3),
  ],
};

// Outer walls: curved glass at the four corners, brick with windows elsewhere.
// Straight brick walls sit just outside the slab edge so they hide it (no white line on flat facades).
export const RES_WALL = {
  start: [6.3, -2.33],
  ops: [
    line(26.85, -2.33, 'brick'),
    line(26.85, -0.35, 'brick'),
    arc(26.85, 6.0, 6.35, -90, 0, 'glass'),
    line(35.18, 6.0, 'brick'),
    line(35.18, 12.95, 'brick'),
    line(33.2, 12.95, 'brick'),
    arc(20.95, 12.95, 12.25, 0, 90, 'glass'),
    line(20.95, 27.23, 'brick'),
    line(6.3, 27.23, 'brick'),
    line(6.3, 25.15, 'brick'),
    arc(6.3, 18.8, 6.35, 90, 180, 'glass'),
    line(-2.13, 18.8, 'brick'),
    line(-2.13, 6.1, 'brick'),
    line(-0.05, 6.1, 'brick'),
    arc(6.3, 6.1, 6.35, 180, 270, 'glass'),
    line(6.3, -2.33, 'brick'),
  ],
};
// Balcony railings follow the slab edge at the corners
export const RES_RAILS = [
  [26.85, 6.0, 8.25, -90, 0],
  [20.95, 12.95, 14.15, 0, 90],
  [6.3, 18.8, 8.35, 90, 180],
  [6.3, 6.1, 8.35, 180, 270],
];

// Hotel plate, block А frame: axis 1 = x 0, axis А = y 0
export const HOTEL_SLAB = {
  start: [22.3, 1.4],
  ops: [
    line(30.5, 1.1),
    arc(30.5, 8.6, 7.5, -90, 0),
    line(38.0, 30.5),
    arc(30.5, 30.5, 7.5, 0, 90),
    line(14.0, 38.0),
    arc(14.0, 32.0, 6.0, 90, 180),
    line(8.5, 15.2),
    arc(22.3, 15.2, 13.8, 180, 270),
  ],
};
export const HOTEL_WALL = {
  start: [22.3, 3.0],
  ops: [
    line(30.5, 2.7, 'brick'),
    arc(30.5, 8.6, 5.9, -90, 0, 'glass'),
    line(36.4, 30.5, 'glass'),
    arc(30.5, 30.5, 5.9, 0, 90, 'glass'),
    line(14.0, 36.4, 'brick'),
    arc(14.0, 32.0, 4.4, 90, 180, 'glass'),
    line(10.1, 15.2, 'glass'),
    arc(22.3, 15.2, 12.2, 180, 270, 'glass'),
  ],
};
export const HOTEL_RAILS = [
  [30.5, 8.6, 7.45, -90, 0],
  [30.5, 30.5, 7.45, 0, 90],
  [14.0, 32.0, 5.95, 90, 180],
  [22.3, 15.2, 13.75, 180, 270],
];

export const BLOCKS = {
  A: {
    key: 'A', name: 'А-16', kind: 'hotel', floors: 16,
    originPt: [163.9, 1939.3], angleDeg: 10.55, mirror: false,
    slab: HOTEL_SLAB, wall: HOTEL_WALL, rails: HOTEL_RAILS, elevation: hotelElevation,
    center: [23, 20],
  },
  B: {
    key: 'B', name: 'Б-20', kind: 'residential', floors: 20,
    originPt: [948.4, 1494.0], angleDeg: 23.97, mirror: true,
    slab: RES_SLAB, wall: RES_WALL, rails: RES_RAILS, elevation: residentialElevation,
    center: [16.5, 12.5],
  },
  V: {
    key: 'V', name: 'В-24', kind: 'residential', floors: 24,
    originPt: [1046.2, 889.2], angleDeg: 0, mirror: false,
    slab: RES_SLAB, wall: RES_WALL, rails: RES_RAILS, elevation: residentialElevation,
    center: [16.5, 12.5],
  },
};

// First floor of each block that belongs to the block itself (floors 1–4 are the podium)
export const FIRST_TOWER_FLOOR = 4;
export const FIRST_APARTMENT_FLOOR = 5;
export const AREA_PER_FLOOR = 753.34; // m², "Масоҳати умумии манзилҳо" on the typical floor

// Local grid frame → world (x, z)
export function blockToWorld(block, lx, ly) {
  const [ox, oz] = ptToWorld(...block.originPt);
  const a = (block.angleDeg * Math.PI) / 180;
  const ux = Math.cos(a), uz = Math.sin(a); // along the lettered axes
  const wx = Math.sin(a), wz = -Math.cos(a); // along the numbered axes
  const y = block.mirror ? 25 - ly : ly;
  return [ox + lx * ux + y * wx, oz + lx * uz + y * wz];
}
