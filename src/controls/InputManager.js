// ============================================================
// INPUT MANAGER — Keyboard, mouse look (pointer lock / drag), wheel
// ============================================================

const GAME_KEYS = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'ShiftLeft', 'ShiftRight', 'Space', 'KeyR', 'KeyT',
]);

export class InputManager {
  constructor(domElement) {
    this.dom = domElement;
    this.keys = new Set();
    this.pressed = new Set(); // one-shot presses, cleared by endFrame()
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.wheel = 0;
    this.enabled = false;
    this.dragging = false;
    this._bind();
  }

  isDown(...codes) { return codes.some((c) => this.keys.has(c)); }
  wasPressed(code) { return this.pressed.has(code); }

  consumeMouse() {
    const d = { dx: this.mouseDX, dy: this.mouseDY };
    this.mouseDX = this.mouseDY = 0;
    return d;
  }

  consumeWheel() {
    const w = this.wheel;
    this.wheel = 0;
    return w;
  }

  endFrame() { this.pressed.clear(); }

  clear() {
    this.wheel = 0;
    this.keys.clear();
    this.pressed.clear();
    this.dragging = false;
    this.mouseDX = this.mouseDY = 0;
  }

  get locked() {
    return typeof document !== 'undefined' && document.pointerLockElement === this.dom;
  }

  _bind() {
    const dom = this.dom;
    if (dom.style) {
      dom.style.cursor = 'crosshair';
      dom.style.touchAction = 'none';
    }
    dom.addEventListener('click', () => {
      if (!this.enabled || this.locked) return;
      try {
        dom.requestPointerLock?.()?.catch?.(() => { /* drag-to-look still works */ });
      } catch { /* embedded browsers may block pointer lock */ }
    });
    document.addEventListener('pointerlockchange', () => this.clear());
    dom.addEventListener('pointerdown', (e) => {
      if (!this.enabled || e.button !== 0) return;
      this.dragging = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    });
    window.addEventListener('pointerup', () => { this.dragging = false; });
    window.addEventListener('pointercancel', () => { this.dragging = false; });
    window.addEventListener('pointermove', (e) => {
      if (!this.enabled) return;
      const locked = this.locked;
      if (!locked && !this.dragging) return;
      this.mouseDX += locked ? e.movementX : e.clientX - this.lastX;
      this.mouseDY += locked ? e.movementY : e.clientY - this.lastY;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    });
    dom.addEventListener('wheel', (e) => {
      if (!this.enabled) return;
      e.preventDefault?.();
      this.wheel += e.deltaY;
    }, { passive: false });

    window.addEventListener('keydown', (e) => {
      if (!this.enabled || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      if (t?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t?.tagName)) return;
      if (e.code === 'Escape') this.clear();
      if (!GAME_KEYS.has(e.code)) return;
      e.preventDefault?.();
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.clear());
    document.addEventListener('visibilitychange', () => this.clear());
  }
}
