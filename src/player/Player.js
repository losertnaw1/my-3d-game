// ============================================================
// PLAYER — Animated GLB character: walk, run, jump, collide
// ============================================================
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CharacterVisual } from './CharacterVisual.js';

const TAU = Math.PI * 2;
const lerpAngle = (a, b, t) => {
  let d = ((b - a) % TAU + TAU + Math.PI) % TAU - Math.PI;
  return a + d * t;
};

export class Player {
  /**
   * @param {THREE.Scene|null} scene
   * @param {object} deps
   *   deps.heightmap  { getHeight(x,z), isUnderwater(x,z,margin) }
   *   deps.colliders  { resolve(pos, radius) }
   *   deps.playRadius number
   */
  constructor(scene, { heightmap, colliders, playRadius = 94 }) {
    this.hm = heightmap;
    this.colliders = colliders;
    this.playRadius = playRadius;
    this.radius = 0.35;
    this.walkSpeed = 2;
    this.runSpeed = 4;
    this.jumpSpeed = 6.5;
    this.gravity = 20;

    this.position = new THREE.Vector3();
    this.velocityY = 0;
    this.grounded = true;
    this.facing = 0;
    this.speed = 0;      // current horizontal speed (for animation)
    this.phase = 0;

    this.object = new THREE.Group();
    this.object.name = 'Player';
    this.visual = null;
    scene?.add(this.object);
  }

  async loadModel() {
    const gltf = await new GLTFLoader().loadAsync(encodeURI('/models/Universal Animation Library/Unreal-Godot/Male.glb'));
    this.visual = new CharacterVisual(gltf);
    this.object.add(this.visual.root);
  }

  spawn(x, z, facing = Math.PI) {
    this.speed = 0;
    this.visual?.reset();
    this.position.set(x, this.hm.getHeight(x, z), z);
    this.velocityY = 0;
    this.grounded = true;
    this.facing = facing;
    this._syncObject();
  }

  /**
   * @param {number} delta
   * @param {{isDown:Function, wasPressed:Function}} input
   * @param {{forward:{x,z}, right:{x,z}}} basis camera-relative directions
   */
  update(delta, input, basis) {
    const dt = Math.min(Math.max(delta, 0), 0.05);
    const f = Number(input.isDown('KeyW', 'ArrowUp')) - Number(input.isDown('KeyS', 'ArrowDown'));
    const s = Number(input.isDown('KeyD', 'ArrowRight')) - Number(input.isDown('KeyA', 'ArrowLeft'));
    let mx = basis.forward.x * f + basis.right.x * s;
    let mz = basis.forward.z * f + basis.right.z * s;
    const len = Math.hypot(mx, mz);
    const running = input.isDown('ShiftLeft', 'ShiftRight');
    const target = len > 0 ? (running ? this.runSpeed : this.walkSpeed) : 0;
    this.speed += (target - this.speed) * (1 - Math.exp(-14 * dt));

    if (len > 0) {
      mx /= len; mz /= len;
      this.facing = lerpAngle(this.facing, Math.atan2(mx, mz), 1 - Math.exp(-12 * dt));
      const step = target * dt;
      this._move(mx * step, mz * step);
    }

    // Vertical: jump, gravity, ground snapping.
    const ground = this.hm.getHeight(this.position.x, this.position.z);
    if (this.grounded && input.wasPressed('Space')) {
      this.velocityY = this.jumpSpeed;
      this.grounded = false;
    }
    if (this.grounded) {
      if (this.position.y - ground < 0.5) this.position.y = ground;
      else this.grounded = false;
    }
    if (!this.grounded) {
      this.velocityY -= this.gravity * dt;
      this.position.y += this.velocityY * dt;
      if (this.position.y <= ground) {
        this.position.y = ground;
        this.velocityY = 0;
        this.grounded = true;
      }
    }

    this._animate(dt);
    this._syncObject();
  }

  _move(dx, dz) {
    const from = { x: this.position.x, z: this.position.z };
    const next = { x: from.x + dx, z: from.z + dz };
    this.colliders.resolve(next, this.radius);

    // Stay inside the playable circle.
    const r = Math.hypot(next.x, next.z);
    if (r > this.playRadius) {
      next.x *= this.playRadius / r;
      next.z *= this.playRadius / r;
    }
    // Cannot walk into the pond: try sliding along each axis.
    if (this.hm.isUnderwater(next.x, next.z, 0.15)) {
      if (!this.hm.isUnderwater(next.x, from.z, 0.15)) next.z = from.z;
      else if (!this.hm.isUnderwater(from.x, next.z, 0.15)) next.x = from.x;
      else { next.x = from.x; next.z = from.z; }
    }
    this.position.x = next.x;
    this.position.z = next.z;
  }

  _animate(dt) {
    this.visual?.update(dt, { grounded: this.grounded, speed: this.speed, running: this.speed > this.walkSpeed * 1.3 });
  }

  _syncObject() {
    this.object.position.copy(this.position);
    this.object.rotation.y = this.facing;
  }
}
