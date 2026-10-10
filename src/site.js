// Surroundings, modelled after the client's renders: avenue and Dushanbinka river on the
// shopping-centre side, a bridge to the south, park and neighbouring blocks behind the courtyard.
import * as THREE from 'three';
import { pavingTexture, waterTexture } from './textures.js';
import { PODIUM } from './config.js';

export function buildSite(scene) {
  // sky
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(3000, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: { top: { value: new THREE.Color(0x4f8ccc) }, bottom: { value: new THREE.Color(0xe6eef4) } },
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 top; uniform vec3 bottom; varying vec3 vDir;
        void main(){ float h = pow(clamp(vDir.y,0.0,1.0),0.5); gl_FragColor = vec4(mix(bottom, top, h),1.0);
        #include <colorspace_fragment>
        }`,
    }),
  );
  scene.add(sky);
  scene.fog = new THREE.Fog(0xdde7ef, 450, 1600);

  scene.add(new THREE.HemisphereLight(0xe4f0ff, 0x7d725f, 0.85));
  const sun = new THREE.DirectionalLight(0xfff0dc, 2.6);
  sun.position.set(-120, 210, 160);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  Object.assign(sun.shadow.camera, { left: -150, right: 150, top: 150, bottom: -150, near: 50, far: 600 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.05;
  sun.target.position.set(10, 0, 0);
  scene.add(sun, sun.target);

  const std = (color, roughness = 0.95, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, ...extra });
  const add = (mesh, receive = true, cast = false) => {
    mesh.receiveShadow = receive;
    mesh.castShadow = cast;
    scene.add(mesh);
    return mesh;
  };
  const flat = (w, d, x, z, y, mat, rotY = 0) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
    m.rotation.set(-Math.PI / 2, 0, rotY);
    m.position.set(x, y, z);
    return add(m);
  };

  // ground
  flat(5000, 5000, 0, 0, -0.08, std(0x86ad62, 1));

  // paved plaza around the shopping centre
  const paveTex = pavingTexture();
  paveTex.repeat.set(30, 30);
  const pave = std(0xffffff, 0.9, { map: paveTex });
  const plaza = new THREE.Shape();
  plaza.moveTo(PODIUM.rOut + 20, PODIUM.wingTopZ - 22);
  plaza.lineTo(PODIUM.rOut + 20, 0);
  plaza.absarc(0, 0, PODIUM.rOut + 20, 0, (112 * Math.PI) / 180, false);
  plaza.lineTo(-75, 40);
  plaza.lineTo(-60, -10);
  plaza.lineTo(5, PODIUM.wingTopZ - 22);
  const pg = new THREE.ShapeGeometry(plaza);
  pg.rotateX(Math.PI / 2);
  const pm = new THREE.Mesh(pg, pave);
  pm.position.y = -0.03;
  // ShapeGeometry is built in x/y; after rotating, faces point down, so flip them
  pm.scale.y = -1;
  add(pm);

  // lawns with curved paths in front of the curve (as in the aerial renders)
  const LAWNS = [[56, 78, 13], [12, 84, 12], [-28, 80, 13]];
  const lawnMat = std(0x7fae57, 1);
  for (const [x, z, r] of LAWNS) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(r, 48), lawnMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, -0.01, z);
    add(m);
  }

  // Sherozi avenue, parallel to the straight wing
  const asphalt = std(0x55585e, 0.9);
  const AX = 98; // avenue centre line
  flat(34, 2200, AX, -200, -0.02, asphalt);
  flat(3, 2200, AX, -200, -0.01, std(0x6f9c54, 1)); // median
  const dash = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.18, 3), std(0xf3f3ea), 400);
  const m4 = new THREE.Matrix4(), rot = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
  let k = 0;
  for (const lane of [-11, -5.5, 5.5, 11]) {
    for (let i = 0; i < 100; i++) dash.setMatrixAt(k++, new THREE.Matrix4().makeTranslation(AX + lane, -0.005, -1200 + i * 22).multiply(rot));
  }
  add(dash);
  // southern street to the bridge
  flat(1200, 22, -300, 112, -0.02, asphalt);
  flat(80, 22, 155, 112, -0.02, asphalt);

  // river with stone embankments
  const RX = 165;
  const water = waterTexture();
  water.repeat.set(4, 60);
  flat(56, 2200, RX, -200, -1.6, std(0xffffff, 0.25, { map: water, metalness: 0.1 }));
  for (const side of [-1, 1]) {
    const bank = new THREE.Mesh(new THREE.BoxGeometry(8, 1.8, 2200), std(0xb9b2a5, 1));
    bank.position.set(RX + side * 31, -0.9, -200);
    bank.rotation.z = side * 0.35;
    add(bank);
  }
  flat(60, 2200, RX + 62, -200, -0.03, std(0x8db567, 1));

  // bridge over the river
  const deck = new THREE.Mesh(new THREE.BoxGeometry(90, 1.2, 24), std(0x9ea2a6, 0.8));
  deck.position.set(RX, 0.3, 112);
  add(deck, true, true);
  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(90, 1.1, 0.3), std(0xd9d9d4, 0.6));
    rail.position.set(RX, 1.45, 112 + side * 11.8);
    add(rail, true, true);
  }

  // parked cars on the avenue and service road
  const carColors = [0xe8e8e6, 0x1f2328, 0x8a9198, 0x9c2b2b, 0x2c4a6e, 0xd6d2c8];
  const body = new THREE.BoxGeometry(4.4, 0.8, 1.9), cab = new THREE.BoxGeometry(2.3, 0.6, 1.7);
  const cabMat = std(0x262b31, 0.2, { metalness: 0.5 });
  let seed = 3;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 46; i++) {
    const g = new THREE.Group();
    const b = new THREE.Mesh(body, std(carColors[i % carColors.length], 0.35, { metalness: 0.4 }));
    b.position.y = 0.6;
    const c = new THREE.Mesh(cab, cabMat);
    c.position.set(-0.2, 1.25, 0);
    b.castShadow = c.castShadow = true;
    g.add(b, c);
    const lane = [-13.5, -8.2, 8.2, 13.5][i % 4];
    g.position.set(AX + lane, 0, -420 + rnd() * 760);
    g.rotation.y = Math.PI / 2 + (lane > 0 ? Math.PI : 0);
    scene.add(g);
  }

  // trees: avenue rows, park behind the courtyard, lawns in front
  const spots = [];
  for (let z = -380; z < 380; z += 11) spots.push([AX - 20, z], [AX + 20, z]);
  for (let x = -140; x < 60; x += 12) spots.push([x, 126], [x + 6, 98]);
  while (spots.length < 420) {
    const x = -260 + rnd() * 300, z = -320 + rnd() * 330;
    if (x > -78 && z > PODIUM.wingTopZ - 30) continue; // keep the courtyard and complex clear
    if (Math.hypot(x, z) < 85) continue;
    spots.push([x, z]);
  }
  for (const [lx, lz, lr] of LAWNS) {
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      spots.push([lx + Math.cos(a) * (lr - 2), lz + Math.sin(a) * (lr - 2)]);
    }
  }
  for (const [x, z] of [[-30, -48], [-40, -20], [-38, 10], [-22, 22], [6, -52], [-4, -60], [-46, -40]]) spots.push([x, z]);
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.18, 0.26, 1, 6), std(0x6b4f3a), spots.length);
  const crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), std(0xffffff, 0.9), spots.length);
  trunks.castShadow = crowns.castShadow = true;
  const q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), col = new THREE.Color();
  spots.forEach(([x, z], i) => {
    const h = 2.5 + rnd() * 2.5, r = 2 + rnd() * 1.8;
    trunks.setMatrixAt(i, m4.compose(p.set(x, h / 2, z), q.identity(), s.set(1, h, 1)));
    crowns.setMatrixAt(i, m4.compose(p.set(x, h + r * 0.7, z), q.identity(), s.set(r, r * 1.2, r)));
    crowns.setColorAt(i, col.setHSL(0.24 + rnd() * 0.07, 0.42, 0.3 + rnd() * 0.12));
  });
  scene.add(trunks, crowns);

  // courtyard: parking, driveway and a ground-level playground
  flat(46, 24, -14, -30, -0.015, asphalt, 0.3);
  const bayLine = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.15, 5), std(0xf0f0ea), 14);
  for (let i = 0; i < 14; i++) {
    const x = -32 + i * 2.8;
    bayLine.setMatrixAt(i, new THREE.Matrix4().makeRotationY(0.3).multiply(new THREE.Matrix4().makeTranslation(x, -0.005, -24)).multiply(rot));
  }
  add(bayLine);
  const play = new THREE.Mesh(new THREE.CircleGeometry(9, 40), std(0x3b8fd1, 0.9));
  play.rotation.x = -Math.PI / 2;
  play.position.set(-6, -0.005, 4);
  add(play);
  const playOrange = new THREE.Mesh(new THREE.CircleGeometry(6, 40), std(0xf0913a, 0.9));
  playOrange.rotation.x = -Math.PI / 2;
  playOrange.position.set(-14, -0.004, 12);
  add(playOrange);

  // neighbouring buildings: translucent white massing, as on the renders
  const ghost = new THREE.MeshStandardMaterial({ color: 0xf4f6f8, roughness: 0.6, transparent: true, opacity: 0.55 });
  for (const [w, h, d, x, z, ry] of [
    [26, 52, 22, -120, -110, 0.1], [22, 64, 22, -84, -150, 0.1], [70, 14, 22, -120, -60, 0.1],
    [24, 46, 20, 60, -150, 0], [20, 58, 20, 36, -205, 0], [40, 12, 30, -150, 30, 0],
    [30, 9, 18, -70, 165, 0.2], [26, 70, 26, 230, -40, 0], [18, 40, 18, 250, 40, 0],
  ]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), ghost);
    b.position.set(x, h / 2, z);
    b.rotation.y = ry;
    b.castShadow = true;
    scene.add(b);
  }

  return { sun };
}
