/**
 * Local State Store for The Fourth Dimension Website.
 * Manages timers, scroll progression, real-world time variables, 
 * persistent localStorage memory layers, and simulation values.
 */

class TimeStore {
  constructor() {
    this.elapsedTime = 0; // session time in seconds
    this.totalAccumulatedTime = 0; // past visits accumulated seconds
    this.visitCount = 1;
    this.scrollProgress = 0; // 0 to 1
    
    // Environment
    this.timeOfDay = 'morning'; // morning, sunset, night
    this.season = 'summer'; // summer, winter
    this.weather = 'sunny'; // sunny, rain
    
    // Memory layers
    this.isDormant = false; // wakes up on arrival
    this.isStarted = false;
    
    // Callbacks for UI and WebGL rendering updates
    this.subscribers = [];
  }

  /**
   * Loads persistence states from localStorage
   */
  init() {
    // 1. Visit Count calculation
    const rawVisits = localStorage.getItem('visit_count');
    this.visitCount = rawVisits ? parseInt(rawVisits, 10) + 1 : 1;
    localStorage.setItem('visit_count', this.visitCount);

    // 2. Accumulated Time
    const rawAccumTime = localStorage.getItem('accumulated_time');
    this.totalAccumulatedTime = rawAccumTime ? parseFloat(rawAccumTime) : 0;

    // 3. Auto Season calculation (Northern Hemisphere style)
    const currentMonth = new Date().getMonth(); // 0-indexed (0 is Jan, 6 is July)
    if (currentMonth >= 10 || currentMonth <= 2) {
      this.season = 'winter';
    } else {
      this.season = 'summer';
    }

    // 4. Auto Time of Day calculation
    const currentHour = new Date().getHours();
    if (currentHour >= 6 && currentHour < 17) {
      this.timeOfDay = 'morning';
    } else if (currentHour >= 17 && currentHour < 20) {
      this.timeOfDay = 'sunset';
    } else {
      this.timeOfDay = 'night';
    }

    // 5. Memory Layer Dormancy Check
    // If the visitor was away for more than 15 seconds (simulated), they wake the site up!
    const lastVisit = localStorage.getItem('last_visit_time');
    if (lastVisit) {
      const timeAway = (Date.now() - parseInt(lastVisit, 10)) / 1000;
      if (timeAway > 15) { // 15s check for easy demonstration of dormancy wake-up
        this.triggerDormancy(true);
        // Automatically start waking up after 1.5 seconds
        setTimeout(() => {
          this.triggerDormancy(false);
        }, 1500);
      }
    } else {
      // First visit ever: start dormant
      this.triggerDormancy(true);
      setTimeout(() => {
        this.triggerDormancy(false);
      }, 2000);
    }
  }

  /**
   * Starts the time session tracking
   */
  startTimer() {
    this.isStarted = true;
    
    // Save state tick loop (once per second)
    this.timerId = setInterval(() => {
      // Unlocked visits speed up time! (2nd visit makes acts open 1.5x faster)
      const speedMult = this.visitCount >= 2 ? 1.5 : 1.0;
      this.elapsedTime += 1 * speedMult;
      
      // Save current timestamp and incremental total time to local storage
      localStorage.setItem('last_visit_time', Date.now().toString());
      localStorage.setItem('accumulated_time', (this.totalAccumulatedTime + this.elapsedTime).toString());
      
      this.notifySubscribers();
    }, 1000);
  }

  fastForward(seconds) {
    this.elapsedTime += seconds;
    this.notifySubscribers();
  }

  resetSessionTime() {
    this.elapsedTime = 0;
    this.notifySubscribers();
  }

  setScrollProgress(progress) {
    this.scrollProgress = Math.min(1.0, Math.max(0.0, progress));
    this.notifySubscribers();
  }

  setTimeOfDay(value) {
    this.timeOfDay = value;
    this.notifySubscribers();
  }

  setSeason(value) {
    this.season = value;
    this.notifySubscribers();
  }

  setWeather(value) {
    this.weather = value;
    this.notifySubscribers();
  }

  setVisitCount(value) {
    this.visitCount = value;
    localStorage.setItem('visit_count', this.visitCount);
    this.notifySubscribers();
  }

  triggerDormancy(active) {
    this.isDormant = active;
    this.notifySubscribers();
  }

  /**
   * Subscriber Pattern (Updates both ui.js and app.js/scene.js render loop)
   */
  subscribe(callback) {
    this.subscribers.push(callback);
    // Initial call
    callback(this.getStateSnapshot());
  }

  getStateSnapshot() {
    return {
      elapsedTime: this.elapsedTime,
      totalAccumulatedTime: this.totalAccumulatedTime,
      visitCount: this.visitCount,
      scrollProgress: this.scrollProgress,
      timeOfDay: this.timeOfDay,
      season: this.season,
      weather: this.weather,
      isDormant: this.isDormant
    };
  }

  notifySubscribers() {
    const snapshot = this.getStateSnapshot();
    this.subscribers.forEach(cb => cb(snapshot));
  }

  destroy() {
    if (this.timerId) clearInterval(this.timerId);
  }
}

export const store = new TimeStore();
