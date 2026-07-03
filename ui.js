import { audio } from './audio.js';

class HUDController {
  constructor() {
    this.store = null;
    this.visualizerTimer = null;
    this.lightSweepTween = null;
    this.lastAct = '';
    
    // Quotes list that changes as the acts progress
    this.actQuotes = {
      'ACT I: ARRIVAL': {
        title: 'TIME IS A PLACE',
        sub: 'Nothing is hidden behind clicks. It is hidden behind patience.'
      },
      'ACT II: AWAKENING': {
        title: 'THE STONE SPEAKS',
        sub: 'A beam of light reveals the language carved into the architecture.'
      },
      'ACT III: DISCOVERY': {
        title: 'MATERIALIZING SPACE',
        sub: 'The pavilion opens up to welcome the curious mind.'
      },
      'ACT IV: TRANSFORMATION': {
        title: 'GLASS & REFRACTIONS',
        sub: 'Concrete dissolves. Water flows. The light breaks into colors.'
      },
      'ACT V: SECRET WORLD': {
        title: 'THE DUST SETTLES',
        sub: 'You have invested your time. The world rewards your investment.'
      },
      'ACT VI: LIVING WEBSITE': {
        title: 'THE CHRONOS CHAMBER',
        sub: 'This place is alive, changing with the shadows of the real world.'
      }
    };
  }

  /**
   * Sets up bindings and event listeners
   */
  init(store) {
    this.store = store;

    this.bindDomElements();
    this.setupSimulationPanel();
    this.startRealTimeClock();
    this.triggerLightSweepLoop();
  }

  bindDomElements() {
    const enterGate = document.getElementById('enter-gate');
    const btnEnter = document.getElementById('btn-enter');
    const hud = document.getElementById('hud');
    const btnMute = document.getElementById('btn-mute');
    
    // Enter Gate interaction
    btnEnter.addEventListener('click', async () => {
      try {
        // Initialize Audio context (Browser requirement)
        await audio.init();
      } catch (err) {
        console.warn("Web Audio API failed to initialize:", err);
      }
      
      // Animate Enter Gate Out
      enterGate.classList.add('fade-out');
      hud.classList.remove('hidden');
      
      // Mark store as started
      this.store.startTimer();
      
      // Setup Visualizer
      try {
        document.getElementById('audio-visualizer').classList.add('playing');
        this.startAudioVisualizerLoop();
      } catch (err) {
        console.warn("Visualizer loop failed to start:", err);
      }
    });

    // Mute/Unmute
    btnMute.addEventListener('click', () => {
      const isMuted = audio.toggleMute();
      btnMute.innerText = isMuted ? 'Unmute' : 'Mute';
      const visualizer = document.getElementById('audio-visualizer');
      if (isMuted) {
        visualizer.classList.remove('playing');
      } else {
        visualizer.classList.add('playing');
      }
    });
  }

  /**
   * Continuous animation loop of light-beam reveal
   */
  triggerLightSweepLoop() {
    const element = document.getElementById('emerging-text');
    const subElement = document.getElementById('emerging-sub');
    
    const runSweep = () => {
      // Reset values to offscreen left as numeric values
      gsap.set([element, subElement], {
        '--light-x': -50,
        '--light-radius': 80,
        '--light-blur': 160
      });

      // Sweep from left to right numerically
      this.lightSweepTween = gsap.to([element, subElement], {
        '--light-x': 150,
        duration: 4.5,
        ease: 'power1.inOut',
        onComplete: () => {
          // Pause at the end for 4.5 seconds before repeating
          setTimeout(runSweep, 4500);
        }
      });
    };

    runSweep();
  }

  /**
   * Sets up control HUD panel listeners
   */
  setupSimulationPanel() {
    const debugPanel = document.getElementById('debug-panel');
    const debugToggle = document.getElementById('debug-toggle');
    
    // Toggle expand/collapse of simulation panel
    debugToggle.addEventListener('click', () => {
      debugPanel.classList.toggle('collapsed');
    });

    // Wire fast-forwards
    document.getElementById('btn-ff-15').addEventListener('click', () => this.store.fastForward(15));
    document.getElementById('btn-ff-60').addEventListener('click', () => this.store.fastForward(60));
    document.getElementById('btn-ff-300').addEventListener('click', () => this.store.fastForward(300));
    
    document.getElementById('btn-reset-time').addEventListener('click', () => {
      this.store.resetSessionTime();
    });

    // Wire Time of Day simulations
    const bindTod = (btnId, value) => {
      document.getElementById(btnId).addEventListener('click', (e) => {
        this.store.setTimeOfDay(value);
        this.updateActiveSimBtn(e.target);
      });
    };
    bindTod('btn-tod-morning', 'morning');
    bindTod('btn-tod-sunset', 'sunset');
    bindTod('btn-tod-night', 'night');

    // Wire Seasons simulations
    const bindSeason = (btnId, value) => {
      document.getElementById(btnId).addEventListener('click', (e) => {
        this.store.setSeason(value);
        this.updateActiveSimBtn(e.target);
      });
    };
    bindSeason('btn-seas-summer', 'summer');
    bindSeason('btn-seas-winter', 'winter');

    // Wire Weather simulations
    const bindWeather = (btnId, value) => {
      document.getElementById(btnId).addEventListener('click', (e) => {
        this.store.setWeather(value);
        this.updateActiveSimBtn(e.target);
      });
    };
    bindWeather('btn-weather-sunny', 'sunny');
    bindWeather('btn-weather-rain', 'rain');

    // Wire Memory simulations
    document.getElementById('btn-sim-visit').addEventListener('click', () => {
      this.store.setVisitCount(10);
      document.getElementById('visit-count').innerText = '10TH VISIT';
      this.showSecretToast();
    });

    document.getElementById('btn-sim-dormant').addEventListener('click', () => {
      this.store.triggerDormancy(true);
      setTimeout(() => {
        this.store.triggerDormancy(false);
      }, 8000); // Wakes up slowly after 8 seconds
    });

    document.getElementById('btn-clear-mem').addEventListener('click', () => {
      localStorage.clear();
      location.reload();
    });
  }

  updateActiveSimBtn(activeBtn) {
    const row = activeBtn.parentElement;
    row.querySelectorAll('.btn-debug').forEach(btn => btn.classList.remove('active-sim'));
    activeBtn.classList.add('active-sim');
  }

  showSecretToast() {
    const notice = document.getElementById('secret-notice');
    notice.classList.remove('hidden');
    setTimeout(() => {
      notice.classList.add('hidden');
    }, 6000);
  }

  /**
   * Tracks real-world clock time
   */
  startRealTimeClock() {
    const updateTime = () => {
      const now = new Date();
      const hrs = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      document.getElementById('real-time').innerText = `${hrs}:${mins}`;
    };
    updateTime();
    setInterval(updateTime, 30000);
  }

  /**
   * Formats seconds to string (MM:SS)
   */
  formatTime(totalSeconds) {
    const mins = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const secs = String(Math.floor(totalSeconds % 60)).padStart(2, '0');
    return `${mins}:${secs}`;
  }

  /**
   * Triggers raindrops in CSS if weather === rain
   */
  updateRainOverlay(weatherState) {
    const overlay = document.getElementById('rain-overlay');
    if (weatherState === 'rain') {
      if (overlay.children.length === 0) {
        overlay.style.opacity = '1';
        // Spawn 20 dripping raindrops on screen glass
        for (let i = 0; i < 25; i++) {
          const drop = document.createElement('div');
          drop.className = 'rain-drop';
          drop.style.left = `${Math.random() * 100}vw`;
          drop.style.animationDelay = `${Math.random() * 1.5}s`;
          drop.style.animationDuration = `${0.8 + Math.random() * 0.6}s`;
          overlay.appendChild(drop);
        }
      }
    } else {
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.innerHTML = '';
      }, 1000);
    }
  }

  /**
   * Feeds raw analyser volume into styling visualizer
   */
  startAudioVisualizerLoop() {
    const spans = document.getElementById('audio-visualizer').querySelectorAll('span');
    
    const draw = () => {
      this.visualizerTimer = requestAnimationFrame(draw);
      
      const buffer = audio.getAnalyserData();
      if (!buffer) {
        spans.forEach(span => span.style.height = '2px');
        return;
      }

      // Map frequency buffer to span heights
      spans.forEach((span, idx) => {
        const val = buffer[idx * 3] || 0;
        const height = Math.max(2, (val / 255) * 16);
        span.style.height = `${height}px`;
      });
    };
    
    draw();
  }

  /**
   * Reacts to store state updates
   */
  render(state) {
    // 1. Timers
    document.getElementById('session-timer').innerText = this.formatTime(state.elapsedTime);
    document.getElementById('total-time').innerText = this.formatTime(state.totalAccumulatedTime + state.elapsedTime);

    // 2. Visit string
    const visits = state.visitCount;
    let visitStr = '1ST VISIT';
    if (visits === 2) visitStr = '2ND VISIT';
    else if (visits >= 10) visitStr = '10TH VISIT (UNLOCKED)';
    else if (visits > 2) visitStr = `${visits}TH VISIT`;
    document.getElementById('visit-count').innerText = visitStr;

    // 3. Current Season Text
    document.getElementById('real-season').innerText = state.season.toUpperCase();

    // 4. Act Title Fade Trigger
    let currentAct = 'ACT I: ARRIVAL';
    const elapsed = state.elapsedTime;
    
    if (elapsed > 300) currentAct = 'ACT VI: LIVING WEBSITE';
    else if (elapsed > 120) currentAct = 'ACT V: SECRET WORLD';
    else if (elapsed > 60) currentAct = 'ACT IV: TRANSFORMATION';
    else if (elapsed > 30) currentAct = 'ACT III: DISCOVERY';
    else if (elapsed > 15) currentAct = 'ACT II: AWAKENING';

    document.getElementById('active-act').innerText = currentAct;

    // A. Detect Act transition, change texts
    if (currentAct !== this.lastAct) {
      this.lastAct = currentAct;
      const actData = this.actQuotes[currentAct];
      
      // Soft text transition using CSS transitions or GSAP
      gsap.to(['#emerging-text', '#emerging-sub'], {
        opacity: 0,
        duration: 1.0,
        onComplete: () => {
          document.getElementById('emerging-text').innerText = actData.title;
          document.getElementById('emerging-sub').innerText = actData.sub;
          gsap.to(['#emerging-text', '#emerging-sub'], { opacity: 0.85, duration: 1.2 });
        }
      });
    }

    // 5. Rain Overlay
    this.updateRainOverlay(state.weather);
  }

  destroy() {
    if (this.visualizerTimer) cancelAnimationFrame(this.visualizerTimer);
    if (this.lightSweepTween) this.lightSweepTween.kill();
  }
}

export const ui = new HUDController();
