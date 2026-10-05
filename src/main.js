// ============================================================
// SCENE SETUP — Three.js core initialization
// ============================================================
import * as THREE from 'three';
import { World } from './world/World.js';
import { WORLD, SPAWN } from './world/WorldConfig.js';
import { SkySystem } from './world/SkySystem.js';
import { LightSystem } from './world/LightSystem.js';
import { DayNightCycle } from './world/DayNightCycle.js';
import { InputManager } from './controls/InputManager.js';
import { ThirdPersonCamera } from './controls/ThirdPersonCamera.js';
import { Player } from './player/Player.js';
import { LoadingManager } from './utils/LoadingManager.js';
import { analyzeModel } from './utils/ModelAnalyzer.js';
import { ModelExtractor } from './utils/ModelExtractor.js';

// 🔧 Dev tools — gọi từ browser DevTools console:
//   analyzeModel('/models/forest_house.glb')          ← phân tích cấu trúc
//   game.cycle.setHour(20)                            ← nhảy tới 20:00
//   game.renderer.info.render                         ← số draw call / tam giác
window.analyzeModel = analyzeModel;
window.ModelExtractor = ModelExtractor;

// ─── Renderer ────────────────────────────────────────────────
const container = document.getElementById('canvas-container');

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

// ─── Scene / Camera ──────────────────────────────────────────
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, 12, 60);
camera.lookAt(0, 0, 0);

// ─── Systems ─────────────────────────────────────────────────
const loading = new LoadingManager();
const cycle = new DayNightCycle({ dayLength: 480, startHour: 9 });
const sky = new SkySystem(scene);
const lights = new LightSystem(scene);
const world = new World(scene);
const input = new InputManager(renderer.domElement);
let player = null;
let follow = null;

const clockEl = document.getElementById('clock');
const timeSpeedEl = document.getElementById('time-speed');
window.game = { scene, renderer, camera, world, cycle, get player() { return player; } };

// ─── Build world ─────────────────────────────────────────────
async function init() {
  loading.update(5, 'Painting the sky...');
  sky.build();
  lights.build();

  loading.update(12, 'Sculpting terrain...');
  await nextFrame();
  world.buildTerrain();

  loading.update(20, 'Gathering seeds...');
  await world.loadModels((p) => loading.update(20 + p * 55, `Gathering seeds... ${Math.round(p * 100)}%`));

  loading.update(80, 'Growing the forest...');
  await nextFrame();
  world.populate();

  player = new Player(scene, { heightmap: world.heightmap, colliders: world.colliders, playRadius: WORLD.playRadius });
  loading.update(88, 'Loading character...');
  await player.loadModel();
  follow = new ThirdPersonCamera(camera, input, (x, z) => world.heightmap.getHeight(x, z));
  respawn();

  loading.update(92, 'Warming up shaders...');
  applyCycle(0, 0);
  await renderer.compileAsync(scene, camera);
  renderer.render(scene, camera);

  loading.update(100, 'Entering Mystic Forest...');
  await new Promise((r) => setTimeout(r, 600));
  loading.hide();
  input.enabled = true;
  animate();
}

function nextFrame() {
  return new Promise((r) => requestAnimationFrame(() => r()));
}

function respawn() {
  player.spawn(SPAWN.x, SPAWN.z, Math.PI + SPAWN.yaw);
  follow.reset(SPAWN.yaw);
  follow.update(0, player.position);
}

function applyCycle(elapsed, delta) {
  const state = cycle.update(delta);
  sky.update(elapsed, delta, state, camera);
  lights.update(state, player ? player.position : camera.position);
  world.update(elapsed, state.night, player ? player.position : SPAWN);
  return state;
}

// ─── Resize handler ──────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── Animate loop ────────────────────────────────────────────
const timer = new THREE.Timer();
const debug = new URLSearchParams(location.search).has('debug') ? document.createElement('pre') : null;
if (debug) {
  debug.style.cssText = 'position:fixed;top:60px;left:16px;background:#122019;color:#fff;padding:12px;z-index:50;pointer-events:none;font:12px monospace';
  document.body.appendChild(debug);
}
let frameCount = 0, frameTime = 0;
let lastClock = '';

function animate() {
  requestAnimationFrame(animate);
  timer.update();
  const delta = Math.min(timer.getDelta(), 0.1);
  const elapsed = timer.getElapsed();

  if (input.wasPressed('KeyR')) respawn();
  if (input.wasPressed('KeyT')) {
    cycle.speed = cycle.speed === 1 ? 30 : 1;
    timeSpeedEl.textContent = cycle.speed === 1 ? '' : '×30';
  }

  player.update(delta, input, follow.basis());
  follow.update(delta, player.position);
  const state = applyCycle(elapsed, delta);
  input.endFrame();

  const clock = cycle.clock;
  if (clock !== lastClock) {
    lastClock = clock;
    clockEl.textContent = `${state.night > 0.5 ? '☾' : '☀'} ${clock}`;
  }

  renderer.render(scene, camera);
  frameCount++; frameTime += timer.getDelta();
  if (debug && frameTime >= 1) {
    debug.textContent = JSON.stringify({ fps: Math.round(frameCount / frameTime), calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, geometries: renderer.info.memory.geometries, ...world.stats }, null, 2);
    frameCount = 0; frameTime = 0;
  }
}

init().catch((error) => {
  console.error('[World] Initialization failed', error);
  loading.update(0, 'Unable to load the world. Please reload to try again.');
});
