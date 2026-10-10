// Camera projection mapping: the client's renders are projected back onto the 3D buildings
// from the cameras they were rendered with (fitted by scripts/calibrate.mjs).
// Each building material takes the render whose camera sees that point most head-on
// (with a depth test against that render's own depth map).
// Surfaces no render saw keep their normal material.
import * as THREE from 'three';
import { W, H } from './photos.js';

const NEAR = 1, FAR = 1500;
const DEPTH_W = 2048, DEPTH_H = Math.round((2048 * H) / W);

export function renderCamera(c) {
  const cam = new THREE.PerspectiveCamera();
  cam.position.set(...c.pos);
  cam.rotation.set(0, -c.yaw, 0, 'YXZ');
  cam.updateMatrixWorld(true);
  const cx = (2 * c.u0) / W - 1, cy = 1 - (2 * c.v0) / H;
  cam.projectionMatrix.set(
    (2 * c.f) / W, 0, -cx, 0,
    0, (2 * c.f) / H, -cy, 0,
    0, 0, -(FAR + NEAR) / (FAR - NEAR), (-2 * FAR * NEAR) / (FAR - NEAR),
    0, 0, -1, 0,
  );
  cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
  return cam;
}

export function createProjector(views, cameras) {
  const loader = new THREE.TextureLoader();
  const items = views.map((v) => {
    const cam = renderCamera(cameras[v.id]);
    const map = loader.load(v.src);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 8;
    const depthTexture = new THREE.DepthTexture(DEPTH_W, DEPTH_H);
    const target = new THREE.WebGLRenderTarget(DEPTH_W, DEPTH_H, { depthTexture });
    const vp = new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    return { id: v.id, cam, map, target, vp };
  });
  const N = items.length;

  const uniforms = { photoStrength: { value: 1 } };
  items.forEach((it, i) => {
    uniforms[`photoMap${i}`] = { value: it.map };
    uniforms[`photoDepth${i}`] = { value: it.target.depthTexture };
    uniforms[`photoVP${i}`] = { value: it.vp };
    uniforms[`photoPos${i}`] = { value: it.cam.position.clone() };
  });

  const decl = items
    .map((_, i) => `uniform sampler2D photoMap${i}; uniform sampler2D photoDepth${i}; uniform mat4 photoVP${i}; uniform vec3 photoPos${i};`)
    .join('\n');
  // one block per render (sampler arrays can't be indexed in a loop on all GPUs)
  const sample = items
    .map((_, i) => `photoSample(photoMap${i}, photoDepth${i}, photoVP${i}, photoPos${i}, acc, wsum, best);`)
    .join('\n');

  const fragHead = /* glsl */ `
    varying vec3 vPhotoW;
    varying vec3 vPhotoN;
    uniform float photoStrength;
    ${decl}
    float photoLinear(float d) { float z = d * 2.0 - 1.0; return 2.0 * ${NEAR.toFixed(1)} * ${FAR.toFixed(1)} / (${(FAR + NEAR).toFixed(1)} - z * ${(FAR - NEAR).toFixed(1)}); }
    void photoSample(sampler2D map, sampler2D depth, mat4 vp, vec3 camPos, inout vec3 acc, inout float wsum, inout float best) {
      vec4 c = vp * vec4(vPhotoW, 1.0);
      if (c.w <= 0.0) return;
      vec3 n = c.xyz / c.w;
      if (abs(n.x) > 0.995 || abs(n.y) > 0.995) return;
      vec2 uv = n.xy * 0.5 + 0.5;
      // hidden from this camera?
      float dMap = photoLinear(texture2D(depth, uv).r);
      float dFrag = photoLinear(n.z * 0.5 + 0.5);
      if (dFrag > dMap + 0.6 + dFrag * 0.004) return;
      // close to the building's outline in this render: the render may show sky there
      vec2 px = vec2(14.0 / ${W.toFixed(1)}, 14.0 / ${H.toFixed(1)});
      float far = max(max(texture2D(depth, uv + vec2(px.x, 0.0)).r, texture2D(depth, uv - vec2(px.x, 0.0)).r),
                      max(texture2D(depth, uv + vec2(0.0, px.y)).r, texture2D(depth, uv - vec2(0.0, px.y)).r));
      if (far > 0.99999) return;
      float facing = dot(normalize(vPhotoN), normalize(camPos - vPhotoW));
      if (facing < 0.08) return;
      // keep only the render that sees this spot most head-on (blending misaligned renders blurs them)
      float w = facing / (1.0 + c.w * 0.002);
      if (w > wsum) {
        acc = texture2D(map, uv).rgb;
        wsum = w;
        best = facing;
      }
    }
  `;
  const fragBody = /* glsl */ `
    {
      vec3 acc = vec3(0.0); float wsum = 0.0; float best = 0.0;
      ${sample}
      if (wsum > 0.0) {
        float k = photoStrength * smoothstep(0.08, 0.3, best);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, acc, k);
      }
    }
  `;
  const vertHead = 'varying vec3 vPhotoW;\nvarying vec3 vPhotoN;\n';
  const vertBody = /* glsl */ `
    {
      vec4 pw = vec4(transformed, 1.0);
      vec3 pn = objectNormal;
      #ifdef USE_INSTANCING
        pw = instanceMatrix * pw;
        pn = mat3(instanceMatrix) * pn;
      #endif
      vPhotoW = (modelMatrix * pw).xyz;
      vPhotoN = normalize(mat3(modelMatrix) * pn);
    }
  `;

  return {
    items,
    uniforms,
    /** Make a material show the renders where they are available. */
    patch(material) {
      material.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, uniforms);
        shader.vertexShader = vertHead + shader.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>\n${vertBody}`);
        shader.fragmentShader = fragHead + shader.fragmentShader.replace('#include <tonemapping_fragment>', `#include <tonemapping_fragment>\n${fragBody}`);
      };
      material.customProgramCacheKey = () => `photo${N}`;
      material.needsUpdate = true;
    },
    /** Render each camera's depth map. `hide` lists objects that must not block (ground, trees…). */
    bakeDepth(renderer, scene, hide) {
      const vis = hide.map((o) => o.visible);
      hide.forEach((o) => (o.visible = false));
      const prevOverride = scene.overrideMaterial, prevTarget = renderer.getRenderTarget();
      const shadow = renderer.shadowMap.autoUpdate;
      renderer.shadowMap.autoUpdate = false;
      scene.overrideMaterial = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
      for (const it of items) {
        renderer.setRenderTarget(it.target);
        renderer.clear();
        renderer.render(scene, it.cam);
      }
      scene.overrideMaterial = prevOverride;
      renderer.setRenderTarget(prevTarget);
      renderer.shadowMap.autoUpdate = shadow;
      hide.forEach((o, i) => (o.visible = vis[i]));
    },
  };
}
