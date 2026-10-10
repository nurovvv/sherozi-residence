# Sherozi Residence – interactive 3D model

3D model of the Sherozi Residence complex (Шаҳрофар, S. Sherozi Ave., Dushanbe): hotel А-16, residential blocks Б-20 and В-24, and the curved shopping centre with its roof terrace. Pick a floor on the model or in the list to see that floor's plan.

Built with [Three.js](https://threejs.org) and [Vite](https://vitejs.dev). Block positions and floor levels come from the architectural drawings; see `src/config.js`.

## Run locally

```bash
npm install
npm run dev
```

## Publish

Every push to `main` is built and published to GitHub Pages by `.github/workflows/deploy.yml`.
