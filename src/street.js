// Street-level walking around the complex: drag to look, WASD / arrows / on-screen joystick to move.
import * as THREE from 'three';

const EYE = 1.7;

export class StreetControls {
  constructor(camera, dom, isBlocked) {
    this.camera = camera;
    this.dom = dom;
    this.isBlocked = isBlocked;
    this.enabled = false;
    this.pos = new THREE.Vector2();
    this.yaw = 0;
    this.pitch = 0.12;
    this.keys = new Set();
    this.joy = { x: 0, y: 0 };
    this.bob = 0;
    dom.addEventListener('pointerdown', (e) => {
      if (!this.enabled) return;
      this.drag = { x: e.clientX, y: e.clientY };
      dom.setPointerCapture(e.pointerId);
    });
    dom.addEventListener('pointermove', (e) => {
      if (!this.enabled || !this.drag) return;
      const k = e.pointerType === 'touch' ? 0.006 : 0.004;
      this.yaw += (e.clientX - this.drag.x) * k;
      this.pitch = THREE.MathUtils.clamp(this.pitch + (e.clientY - this.drag.y) * k, -0.9, 1.3);
      this.drag = { x: e.clientX, y: e.clientY };
    });
    dom.addEventListener('pointerup', () => (this.drag = null));
    addEventListener('keydown', (e) => this.enabled && this.keys.add(e.code));
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
  }

  start(x, z, yaw, pitch = 0.12) {
    this.enabled = true;
    this.pos.set(x, z);
    this.yaw = yaw;
    this.pitch = pitch;
    this.apply();
  }

  stop() {
    this.enabled = false;
    this.keys.clear();
    this.drag = null;
  }

  update(dt) {
    if (!this.enabled) return;
    const k = this.keys;
    let fwd = 0, side = 0, turn = 0;
    if (k.has('KeyW') || k.has('ArrowUp')) fwd += 1;
    if (k.has('KeyS') || k.has('ArrowDown')) fwd -= 1;
    if (k.has('KeyA')) side -= 1;
    if (k.has('KeyD')) side += 1;
    if (k.has('ArrowLeft') || k.has('KeyQ')) turn += 1;
    if (k.has('ArrowRight') || k.has('KeyE')) turn -= 1;
    fwd -= this.joy.y;
    side += this.joy.x;
    this.yaw += turn * 1.4 * dt;
    if (fwd || side) {
      const speed = k.has('ShiftLeft') || k.has('ShiftRight') ? 22 : 7;
      const len = Math.min(1, Math.hypot(fwd, side));
      const a = Math.atan2(side, fwd);
      const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
      const rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
      const dx = (fx * Math.cos(a) + rx * Math.sin(a)) * speed * len * dt;
      const dz = (fz * Math.cos(a) + rz * Math.sin(a)) * speed * len * dt;
      // slide along walls: try the full step, then each axis on its own
      const { x, y: z } = this.pos;
      if (!this.isBlocked(x + dx, z + dz)) this.pos.set(x + dx, z + dz);
      else if (!this.isBlocked(x + dx, z)) this.pos.set(x + dx, z);
      else if (!this.isBlocked(x, z + dz)) this.pos.set(x, z + dz);
      this.bob += Math.hypot(dx, dz) * 1.6;
    }
    this.apply();
  }

  apply() {
    this.camera.position.set(this.pos.x, EYE + Math.sin(this.bob) * 0.03, this.pos.y);
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }
}

export function pointInPolygon(x, z, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, zi] = pts[i], [xj, zj] = pts[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
