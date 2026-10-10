// The client's renders used to texture the model (see projection.js).
// For each tower we measured, in pixels of the cropped render (1915 x 1340), its left/right
// edges at the bottom of the 5th floor and at the roof; scripts/calibrate.mjs uses them to
// find each render's camera. `hiddenLeft`: that edge is the tower in front, not this one.
export const W = 1915, H = 1340;

export const VIEWS = [
  {
    id: 'v4', src: './renders/v4.jpg',
    towers: {
      A: { x0: [250, 740], x1: [275, 715], y0: 945, y1: 390 },
      B: { x0: [915, 1430], x1: [935, 1430], y0: 930, y1: 225 },
      V: { x0: [1430, 1585], x1: [1430, 1585], y0: 905, y1: 250, hiddenLeft: true },
    },
  },
  {
    id: 'v2', src: './renders/v2.jpg',
    towers: {
      A: { x0: [410, 830], x1: [430, 810], y0: 925, y1: 500 },
      B: { x0: [965, 1415], x1: [975, 1415], y0: 905, y1: 215 },
      V: { x0: [1415, 1665], x1: [1420, 1660], y0: 880, y1: 255, hiddenLeft: true },
    },
  },
  {
    id: 'v11', src: './renders/v11.jpg',
    towers: {
      A: { x0: [540, 915], x1: [555, 895], y0: 1055, y1: 640 },
      B: { x0: [1015, 1420], x1: [1030, 1420], y0: 1030, y1: 380 },
      V: { x0: [1420, 1745], x1: [1420, 1740], y0: 1015, y1: 360, hiddenLeft: true },
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
