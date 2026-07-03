# The Fourth Dimension — A Time-Based Immersive Space

A cinematic, interactive 3D digital sculpture where **time** is the primary dimension of interaction, and **scrolling** is secondary. 

Instead of traditional page navigation, this website functions like a film or a theater performance, rewarding curiosity and patience. Visitors who leave early see only the surface; those who stay discover a slowly unfolding architectural world.

---

## 🕰️ The Timeline of Acts

The environment evolves gradually based on the visitor's session duration:
*   **0–15 seconds — Act I: Arrival**: A dark room filled with heavy volumetric mist. A single glass monolith floats in silence. Minimalist, ambient drone audio.
*   **15–30 seconds — Act II: Awakening**: A soft spotlight strikes the monolith, activating its inner golden core. Typographic letters emerge from the concrete walls via a moving light beam.
*   **30–60 seconds — Act III: Discovery**: The pavilion's concrete walls slide outward, the ceiling opens to the sky, a pedestal rises from the floor, and an abstract golden knot product materializes within a swirling particle aura.
*   **1–2 minutes — Act IV: Transformation**: The environment transitions into sunset/moonlight. Concrete elements dissolve into polished glass, water floods the floor with real-time organic wave reflections, and strings filter into the soundscape.
*   **2–5 minutes — Act V: Secret World**: A hidden exhibition room is unlocked in the distance for users with cumulative visit histories. Scrolling forward allows the visitor to step through the wall into the chamber.
*   **5+ minutes — Act VI: Living Website**: The site enters a generative loop. Shadow positions creep with the virtual sun, dust particles float, and the audio synthesizer achieves its full ambient composition.

---

## 🛠️ Technical Stack & Architecture

Built with native **Vanilla HTML5 + JavaScript ES Modules** to load instantly, bypassing complex Node compilation or bundler dependencies. It is completely ready for static hosting engines like **GitHub Pages**.

1.  **3D Rendering**: [Three.js](https://threejs.org/) (imported as an ES Module via jsDelivr CDN).
2.  **Cinematic Post-Processing**: `EffectComposer` with `UnrealBloomPass` (for glowing light shafts and refractions) and `FilmPass` (for scanline noise and film grain).
3.  **Animation & Transitions**: [GSAP (GreenSock)](https://greensock.com/gsap/) to drive typographic reveals and material fades.
4.  **Custom Inertial Scroll Engine**: A lightweight, math-based scroll tracker in `app.js` that maps mouse wheel and touch swipe gestures to camera coordinates with smooth interpolation (`lerp`).
5.  **Procedural Audio Synthesis**: Built on the native browser **Web Audio API** (`audio.js`). Synthesizes deep drones, sweeping pads, sub-bass beats, irregular piano notes, and wind/crickets/birds ambient noises.
6.  **Interactive Parallax**: Camera pans and tilts dynamically in response to normalized mouse or touch-swipe coordinates, adding physical depth.

---
