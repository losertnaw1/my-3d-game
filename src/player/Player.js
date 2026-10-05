// ============================================================
// PLAYER — Stick-figure character: walk, run, jump, collide
// ============================================================
import * as THREE from 'three';

const TAU = Math.PI * 2;
const lerpAngle = (a, b, t) => {
  let d = ((b - a) % TAU + TAU + Math.PI) % TAU - Math.PI;
  return a + d * t;
};

/** Builds the stick figure. Local +Z is "forward". */
export function createStickFigure() {
  const limbMat = new THREE.MeshStandardMaterial({ color: '#2b2d42', roughness: 0.6 });
  const headMat = new THREE.MeshStandardMaterial({ color: '#f4efe6', roughness: 0.5 });
  const scarfMat = new THREE.MeshStandardMaterial({ color: '#e63946', roughness: 0.7 });
  const eyeMat = new THREE.MeshBasicMaterial({ color: '#1b1b1b' });

  const root = new THREE.Group();
  root.name = 'Player';
  const body = new THREE.Group(); // bobbing part
  root.add(body);

  const limb = (length, radius = 0.055) => {
    const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length - radius * 2, 4, 8), limbMat);
    mesh.position.y = -length / 2;
    return mesh;
  };

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.42, 4, 8), limbMat);
  torso.position.y = 1.18;
  body.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 14), headMat);
  head.position.y = 1.62;
  body.add(head);
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), eyeMat);
    eye.position.set(side * 0.06, 1.65, 0.15);
    body.add(eye);
  }
  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.035, 8, 16), scarfMat);
  scarf.rotation.x = Math.PI / 2;
  scarf.position.y = 1.44;
  body.add(scarf);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.03), scarfMat);
  tail.position.set(0.05, 1.32, -0.11);
  tail.rotation.x = 0.35;
  body.add(tail);

  const joints = {};
  for (const [name, side] of [['armL', -1], ['armR', 1]]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.1, 1.4, 0);
    pivot.rotation.z = side * 0.12;
    pivot.add(limb(0.62, 0.045));
    body.add(pivot);
    joints[name] = pivot;
  }
  for (const [name, side] of [['legL', -1], ['legR', 1]]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.08, 0.92, 0);
    pivot.add(limb(0.92));
    body.add(pivot);
    joints[name] = pivot;
  }

  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { root, body, joints, tail };
}

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
    this.walkSpeed = 4.5;
    this.runSpeed = 9;
    this.jumpSpeed = 6.5;
    this.gravity = 20;

    this.position = new THREE.Vector3();
    this.velocityY = 0;
    this.grounded = true;
    this.facing = 0;
    this.speed = 0;      // current horizontal speed (for animation)
    this.phase = 0;

    this.figure = createStickFigure();
    this.object = this.figure.root;
    scene?.add(this.object);
  }

  spawn(x, z, facing = Math.PI) {
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
    const { joints, body, tail } = this.figure;
    const move = Math.min(this.speed / this.walkSpeed, 1.6);
    this.phase += dt * (2 + this.speed * 1.9);
    let swing = Math.sin(this.phase) * 0.55 * Math.min(move, 1.3);
    if (!this.grounded) swing = 0;
    joints.legL.rotation.x = this.grounded ? swing : 0.6;
    joints.legR.rotation.x = this.grounded ? -swing : -0.25;
    joints.armL.rotation.x = this.grounded ? -swing * 0.9 : -2.4;
    joints.armR.rotation.x = this.grounded ? swing * 0.9 : -2.4;
    const idle = Math.sin(this.phase * 0.5) * 0.012 * (1 - Math.min(move, 1));
    body.position.y = Math.abs(Math.sin(this.phase)) * 0.06 * Math.min(move, 1) + idle;
    body.rotation.x = 0.08 * Math.min(move, 1.6) / 1.6;
    tail.rotation.x = 0.35 + Math.min(move, 1.6) * 0.5 + Math.sin(this.phase * 2) * 0.1 * move;
  }

  _syncObject() {
    this.object.position.copy(this.position);
    this.object.rotation.y = this.facing;
  }
}
