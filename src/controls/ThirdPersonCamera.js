// ============================================================
// THIRD-PERSON CAMERA — Orbit behind the player, never under ground
// ============================================================
import * as THREE from 'three';
import { clamp } from '../utils/Random.js';

export class ThirdPersonCamera {
  /**
   * @param {THREE.PerspectiveCamera} camera
   * @param {InputManager} input
   * @param {(x:number, z:number) => number} heightAt
   */
  constructor(camera, input, heightAt) {
    this.camera = camera;
    this.input = input;
    this.heightAt = heightAt;
    this.yaw = 0;        // 0 → camera south of player, looking north
    this.pitch = 0.32;   // radians above horizontal
    this.distance = 6.5;
    this.minDistance = 2.5;
    this.maxDistance = 14;
    this.lookSpeed = 0.0024;
    this.focusHeight = 1.45;
    this.focus = new THREE.Vector3();
    this._desired = new THREE.Vector3();
    this._first = true;
  }

  /** Horizontal forward / right vectors for movement relative to the view. */
  basis() {
    return {
      forward: { x: -Math.sin(this.yaw), z: -Math.cos(this.yaw) },
      right: { x: Math.cos(this.yaw), z: -Math.sin(this.yaw) },
    };
  }

  reset(yaw = 0) {
    this.yaw = yaw;
    this.pitch = 0.32;
    this._first = true;
  }

  update(delta, target) {
    const { dx, dy } = this.input.consumeMouse();
    this.yaw -= dx * this.lookSpeed;
    this.pitch = clamp(this.pitch + dy * this.lookSpeed, -0.35, 1.25);
    this.distance = clamp(this.distance + this.input.consumeWheel() * 0.01, this.minDistance, this.maxDistance);

    this.focus.set(target.x, target.y + this.focusHeight, target.z);
    const horiz = Math.cos(this.pitch) * this.distance;
    this._desired.set(
      this.focus.x + Math.sin(this.yaw) * horiz,
      this.focus.y + Math.sin(this.pitch) * this.distance,
      this.focus.z + Math.cos(this.yaw) * horiz,
    );
    const ground = this.heightAt(this._desired.x, this._desired.z) + 0.4;
    if (this._desired.y < ground) this._desired.y = ground;

    if (this._first) {
      this.camera.position.copy(this._desired);
      this._first = false;
    } else {
      this.camera.position.lerp(this._desired, 1 - Math.exp(-18 * Math.min(delta, 0.1)));
    }
    // Interpolation can cross a ridge even when both endpoints are above ground.
    this.camera.position.y = Math.max(this.camera.position.y,
      this.heightAt(this.camera.position.x, this.camera.position.z) + 0.4);
    this.camera.lookAt(this.focus);
  }
}
