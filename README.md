# Sherozi Residence – interactive 3D model

3D model of the Sherozi Residence complex (Шаҳрофар, S. Sherozi Ave., Dushanbe): hotel А-16, residential blocks Б-20 and В-24, and the curved shopping centre with its roof terrace. Pick a floor on the model or in the list to see that floor's plan, jump to the viewpoints of the client's renders, or walk the streets around it.

The client's renders are projected onto the 3D buildings from the cameras they were rendered with (`src/projection.js`). The cameras are found by `node scripts/calibrate.mjs`, which fits the model to tower outlines measured on each render (`src/photos.js`) and writes `src/cameras.json`. Add `?debug` to the URL to get `__sim.lookThrough('v4')` for checking alignment.

Built with [Three.js](https://threejs.org) and [Vite](https://vitejs.dev). Block positions and floor levels come from the architectural drawings; see `src/config.js`.

## Run locally

```bash
npm install
npm run dev
```

## Publish

Every push to `main` is built and published to GitHub Pages by `.github/workflows/deploy.yml`.
