import { store } from './store.js';
import { scene } from './scene.js';
import { ui } from './ui.js';
import { audio } from './audio.js';

class App {
  constructor() {
    this.targetProgress = 0;
    this.currentProgress = 0;
    this.touchStartY = 0;
    this.scrollVelocity = 0;
  }

  /**
   * Initializes all systems on document ready
   */
  init() {
    // 1. Initialize State Store
    store.init();

    // 2. Initialize Three.js Scene
    const container = document.getElementById('canvas-container');
    scene.init(container);

    // 3. Initialize HUD UI
    ui.init(store);

    // 4. Initialize Custom Scroll Listeners
    this.setupScroll();

    // 5. Subscribe rendering components to state changes
    store.subscribe((state) => {
      ui.render(state);
      audio.update(state);
    });

    // 6. Start the main animation frame loop
    this.animate();
  }

  /**
   * Configures math-based scroll listeners (wheel, touch)
   */
  setupScroll() {
    // A. Desktop Mouse Wheel
    window.addEventListener('wheel', (e) => {
      // Small increment based on deltaY
      this.targetProgress += e.deltaY * 0.00045;
      this.targetProgress = Math.max(0.0, Math.min(1.0, this.targetProgress));
      
      // Update visual scroll hint opacity
      this.updateScrollHint();
    }, { passive: true });

    // B. Mobile Touch Swipes
    window.addEventListener('touchstart', (e) => {
      this.touchStartY = e.touches[0].clientY;
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        const deltaY = this.touchStartY - e.touches[0].clientY;
        this.touchStartY = e.touches[0].clientY;
        
        this.targetProgress += deltaY * 0.0018;
        this.targetProgress = Math.max(0.0, Math.min(1.0, this.targetProgress));
        
        this.updateScrollHint();
      }
    }, { passive: true });
  }

  updateScrollHint() {
    const scrollHint = document.getElementById('scroll-hint');
    if (scrollHint) {
      if (this.targetProgress > 0.02) {
        scrollHint.style.opacity = '0';
      } else {
        scrollHint.style.opacity = '1';
      }
    }
  }

  /**
   * WebGL Render Loop
   */
  animate() {
    const loop = () => {
      // 1. Smoothly interpolate (lerp) scroll progress for high-fidelity deceleration
      const prevProgress = this.currentProgress;
      this.currentProgress = this.lerp(this.currentProgress, this.targetProgress, 0.06);
      
      // Calculate scroll velocity (speed of change)
      this.scrollVelocity = this.currentProgress - prevProgress;

      // Update progress in global store
      store.setScrollProgress(this.currentProgress);

      // 2. Get current state snapshot
      const state = store.getStateSnapshot();
      
      // 3. Update Three.js animations, lights, camera and render
      scene.update(state);

      // 4. Update interactive audio parameters based on parallax and scroll velocity
      audio.updateInteraction(scene.mouse, this.scrollVelocity * 40.0);
      
      requestAnimationFrame(loop);
    };
    loop();
  }

  // Simple linear interpolation helper
  lerp(start, end, amt) {
    return (1 - amt) * start + amt * end;
  }
}

// Instantiate and start app on page load
window.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
