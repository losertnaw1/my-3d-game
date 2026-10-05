// ============================================================
// LOADING MANAGER — Progress bar & screen transition
// ============================================================
export class LoadingManager {
  constructor() {
    this.screen = document.getElementById('loading-screen');
    this.bar    = document.getElementById('loading-bar');
    this.text   = document.getElementById('loading-text');
  }

  update(percent, message) {
    if (this.bar)  this.bar.style.width  = `${percent}%`;
    if (this.text) this.text.textContent = message;
  }

  hide() {
    if (this.screen) {
      this.screen.classList.add('hidden');
      setTimeout(() => {
        this.screen.style.display = 'none';
      }, 1300);
    }
  }
}
