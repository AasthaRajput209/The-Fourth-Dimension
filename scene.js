import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { FilmPass } from 'three/addons/postprocessing/FilmPass.js';

class PavilionScene {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.composer = null;
    this.mouse = { x: 0, y: 0 };
    this.container = null;

    // Lighting & Volumetric Effect
    this.ambientLight = null;
    this.spotLight = null;
    this.sunLight = null;
    this.pointLights = [];
    this.lightCone = null; // Volumetric beam

    // Scene Elements
    this.monolith = null;
    this.monolithCore = null; // Inner glowing heart
    this.pedestal = null;
    this.product = null;
    this.productAura = null; // Swirling product particles
    this.waterPlane = null;
    this.walls = [];
    this.ceiling = null;
    this.plants = [];
    
    // Secret Exhibition Room
    this.secretRoom = null;
    this.secretProduct = null;
    
    // Particles
    this.dustParticles = null;
    this.rainParticles = null;
    this.dustCount = 350;
    this.rainCount = 500;
    
    // Animation tracking
    this.clock = new THREE.Clock();
  }

  /**
   * Builds the procedural 3D scene, registers post-processing passes, and starts renderer
   */
  init(container) {
    this.container = container;
    
    // Scene setup with dark atmospheric fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x040405);
    this.scene.fog = new THREE.FogExp2(0x040405, 0.045);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 2.5, 12);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.container.appendChild(this.renderer.domElement);

    // Parallax input tracking (subtle looking around)
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    window.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        this.mouse.x = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
      }
    });

    // Build Environment
    this.setupLights();
    this.setupVolumetricLightBeam();
    this.setupFloor();
    this.setupArchitecture();
    this.setupMonolith();
    this.setupPedestalAndProduct();
    this.setupPlants();
    this.setupDustParticles();
    this.setupRainParticles();
    this.setupSecretExhibitionRoom();

    // Post-Processing Stack (Bloom + Scanlines + Film Grain)
    this.setupPostProcessing();

    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  /**
   * Sets up lighting system for seasonal and act updates
   */
  setupLights() {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.02);
    this.scene.add(this.ambientLight);

    // Main Spotlight pointing to monolith
    this.spotLight = new THREE.SpotLight(0xffffff, 0, 25, Math.PI / 5, 0.6, 1);
    this.spotLight.position.set(0, 8, 0);
    this.spotLight.castShadow = true;
    this.spotLight.shadow.mapSize.width = 1024;
    this.spotLight.shadow.mapSize.height = 1024;
    this.spotLight.shadow.bias = -0.001;
    this.scene.add(this.spotLight);

    // Directional Sun/Moon Light
    this.sunLight = new THREE.DirectionalLight(0xffffff, 0.1);
    this.sunLight.position.set(10, 8, 10);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.scene.add(this.sunLight);

    // Colored refractions points
    const colors = [0x3a9eff, 0xff7e2b, 0xd4af37];
    colors.forEach((col, idx) => {
      const pLight = new THREE.PointLight(col, 0, 12);
      const angle = (idx / colors.length) * Math.PI * 2;
      pLight.position.set(Math.cos(angle) * 4, 1.5, Math.sin(angle) * 4);
      this.scene.add(pLight);
      this.pointLights.push(pLight);
    });
  }

  /**
   * Volumetric Spotlight Cone representing light rays hitting mist
   */
  setupVolumetricLightBeam() {
    const coneGeo = new THREE.CylinderGeometry(0.1, 3.2, 8.5, 32, 1, true);
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0xd4af37,
      transparent: true,
      opacity: 0, // wakes up in Act II
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.lightCone = new THREE.Mesh(coneGeo, coneMat);
    this.lightCone.position.set(0, 4.25, 0);
    this.scene.add(this.lightCone);
  }

  /**
   * Reflective concrete floor + grid-segmented water plane
   */
  setupFloor() {
    const floorGeo = new THREE.PlaneGeometry(30, 30);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0c0c0c,
      roughness: 0.2,
      metalness: 0.9,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // High-resolution water plane to support 3D ripples displacement
    const waterGeo = new THREE.PlaneGeometry(30, 30, 64, 64);
    const waterMat = new THREE.MeshPhysicalMaterial({
      color: 0x071e2c,
      transparent: true,
      opacity: 0, // Act IV
      roughness: 0.02,
      metalness: 0.15,
      transmission: 0.75,
      thickness: 1.5,
      ior: 1.333,
    });
    this.waterPlane = new THREE.Mesh(waterGeo, waterMat);
    this.waterPlane.rotation.x = -Math.PI / 2;
    this.waterPlane.position.y = 0.02;
    this.scene.add(this.waterPlane);
  }

  /**
   * Procedural Concrete Pavilion Architecture
   */
  setupArchitecture() {
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x1d1d1f,
      roughness: 0.85,
      metalness: 0.05,
    });

    const wallThickness = 0.55;
    const wallHeight = 6.2;
    const wallWidth = 10.5;

    // Left Wall
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, wallWidth), wallMat);
    leftWall.position.set(-5.2, wallHeight / 2, 0);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    leftWall.userData = { initialX: -5.2, targetX: -12.5 };
    this.scene.add(leftWall);
    this.walls.push(leftWall);

    // Right Wall
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, wallWidth), wallMat);
    rightWall.position.set(5.2, wallHeight / 2, 0);
    rightWall.castShadow = true;
    rightWall.receiveShadow = true;
    rightWall.userData = { initialX: 5.2, targetX: 12.5 };
    this.scene.add(rightWall);
    this.walls.push(rightWall);

    // Back Wall L
    const backWallL = new THREE.Mesh(new THREE.BoxGeometry(4.7, wallHeight, wallThickness), wallMat);
    backWallL.position.set(-2.9, wallHeight / 2, -5.2);
    backWallL.castShadow = true;
    backWallL.receiveShadow = true;
    backWallL.userData = { initialX: -2.9, targetX: -7.0 };
    this.scene.add(backWallL);
    this.walls.push(backWallL);

    // Back Wall R
    const backWallR = new THREE.Mesh(new THREE.BoxGeometry(4.7, wallHeight, wallThickness), wallMat);
    backWallR.position.set(2.9, wallHeight / 2, -5.2);
    backWallR.castShadow = true;
    backWallR.receiveShadow = true;
    backWallR.userData = { initialX: 2.9, targetX: 7.0 };
    this.scene.add(backWallR);
    this.walls.push(backWallR);

    // Ceiling Block
    const ceilGeo = new THREE.BoxGeometry(10.5 + wallThickness, wallThickness, wallWidth + wallThickness);
    this.ceiling = new THREE.Mesh(ceilGeo, wallMat);
    this.ceiling.position.set(0, wallHeight + wallThickness / 2, 0);
    this.ceiling.castShadow = true;
    this.ceiling.userData = { initialY: wallHeight + wallThickness / 2, targetY: 10.5 };
    this.scene.add(this.ceiling);
  }

  /**
   * Dual-layer Crystalline Monolith with inner glowing core
   */
  setupMonolith() {
    // Outer Glass Shell
    const geom = new THREE.OctahedronGeometry(1.25, 2);
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.05,
      metalness: 0.1,
      transmission: 0.95, // high refractive look
      thickness: 1.8,
      ior: 1.6,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      emissive: 0xd4af37,
      emissiveIntensity: 0.08,
    });
    this.monolith = new THREE.Mesh(geom, mat);
    this.monolith.position.set(0, 2.6, 0);
    this.monolith.castShadow = true;
    this.monolith.receiveShadow = true;
    this.scene.add(this.monolith);

    // Inner Glowing Core (Heart of the monolith)
    const coreGeo = new THREE.IcosahedronGeometry(0.35, 1);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xd4af37,
    });
    this.monolithCore = new THREE.Mesh(coreGeo, coreMat);
    this.monolith.add(this.monolithCore);

    // Volumetric glow ring around the monolith
    const ringGeo = new THREE.RingGeometry(1.7, 1.76, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xd4af37,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
    });
    const glowRing = new THREE.Mesh(ringGeo, ringMat);
    glowRing.rotation.x = Math.PI / 2;
    this.monolith.add(glowRing);
    this.monolith.userData = { glowRing };
  }

  /**
   * Rising pedestal + Product Knot + orbiting Swirling Aura particles
   */
  setupPedestalAndProduct() {
    const pedGeo = new THREE.CylinderGeometry(0.75, 0.85, 1.5, 32);
    const pedMat = new THREE.MeshStandardMaterial({
      color: 0x18181a,
      roughness: 0.5,
      metalness: 0.4,
    });
    this.pedestal = new THREE.Mesh(pedGeo, pedMat);
    this.pedestal.position.set(0, -1.0, -2.5);
    this.pedestal.castShadow = true;
    this.pedestal.receiveShadow = true;
    this.scene.add(this.pedestal);

    // Product setup
    const productGeo = new THREE.TorusKnotGeometry(0.36, 0.11, 140, 16);
    const productMat = new THREE.MeshPhysicalMaterial({
      color: 0xd4af37,
      metalness: 1.0,
      roughness: 0.1,
      clearcoat: 1.0,
      emissive: 0x5a3d0f,
      emissiveIntensity: 0.1,
    });
    
    this.product = new THREE.Group();
    const coreMesh = new THREE.Mesh(productGeo, productMat);
    coreMesh.castShadow = true;
    this.product.add(coreMesh);

    // Orbiting nested wire rings
    const ringMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.95, roughness: 0.05 });
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.012, 8, 64), ringMat);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.008, 8, 64), ringMat);
    ring1.rotation.x = Math.PI / 3;
    ring2.rotation.y = Math.PI / 4;
    this.product.add(ring1);
    this.product.add(ring2);

    this.product.position.set(0, 1.25, -2.5);
    this.product.scale.set(0.001, 0.001, 0.001);
    this.scene.add(this.product);

    // Swirling Aura Particles around the product
    const auraCount = 100;
    const auraGeo = new THREE.BufferGeometry();
    const auraPositions = new Float32Array(auraCount * 3);
    const auraAngles = new Float32Array(auraCount);
    const auraSpeeds = new Float32Array(auraCount);

    for(let i=0; i<auraCount; i++) {
      auraAngles[i] = Math.random() * Math.PI * 2;
      auraSpeeds[i] = 0.5 + Math.random() * 1.5;
      
      const r = 0.6 + Math.random() * 0.4;
      auraPositions[i*3] = Math.cos(auraAngles[i]) * r;
      auraPositions[i*3+1] = (Math.random() - 0.5) * 1.2;
      auraPositions[i*3+2] = Math.sin(auraAngles[i]) * r;
    }

    auraGeo.setAttribute('position', new THREE.BufferAttribute(auraPositions, 3));
    const auraMat = new THREE.PointsMaterial({
      color: 0xd4af37,
      size: 0.05,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending
    });

    this.productAura = new THREE.Points(auraGeo, auraMat);
    this.productAura.position.set(0, 1.25, -2.5);
    this.productAura.userData = { auraAngles, auraSpeeds };
    this.scene.add(this.productAura);
  }

  /**
   * Corner Sprouting Plants
   */
  setupPlants() {
    const leafMat = new THREE.MeshStandardMaterial({
      color: 0x0d3320,
      roughness: 0.65,
      metalness: 0.15,
    });
    
    const positions = [
      [-4.3, 0, -4.3],
      [4.3, 0, -4.3],
      [-4.3, 0, 4.3],
      [4.3, 0, 4.3],
    ];

    positions.forEach((pos) => {
      const plant = new THREE.Group();
      
      // Stem
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.07, 1.9), leafMat);
      stem.position.y = 0.95;
      plant.add(stem);

      // Sprouting leaves
      for (let i = 0; i < 5; i++) {
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.28 + i * 0.06, 8, 8), leafMat);
        leaf.scale.set(1.6, 0.6, 0.9);
        leaf.position.y = 0.45 + i * 0.38;
        leaf.rotation.y = (i * Math.PI) / 3;
        leaf.rotation.x = 0.2;
        plant.add(leaf);
      }

      plant.position.set(pos[0], 0, pos[2]);
      plant.scale.set(0.001, 0.001, 0.001);
      this.scene.add(plant);
      this.plants.push(plant);
    });
  }

  /**
   * Floating Dust Motes
   */
  setupDustParticles() {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.dustCount * 3);
    const speeds = new Float32Array(this.dustCount);

    for (let i = 0; i < this.dustCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 16;
      positions[i * 3 + 1] = Math.random() * 8;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 16;
      speeds[i] = 0.08 + Math.random() * 0.35;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.035,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
    });

    this.dustParticles = new THREE.Points(geo, mat);
    this.dustParticles.userData = { speeds };
    this.scene.add(this.dustParticles);
  }

  /**
   * Rain Particles System
   */
  setupRainParticles() {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.rainCount * 3);
    
    for (let i = 0; i < this.rainCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = Math.random() * 15;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0x88ccff,
      size: 0.06,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending
    });

    this.rainParticles = new THREE.Points(geo, mat);
    this.scene.add(this.rainParticles);
  }

  /**
   * Secret Exhibition chamber
   */
  setupSecretExhibitionRoom() {
    this.secretRoom = new THREE.Group();
    this.secretRoom.position.set(0, 0, -15);
    
    const chamberGeo = new THREE.BoxGeometry(6, 4, 6);
    const chamberMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.08,
      transmission: 0.85,
      ior: 1.5,
      thickness: 0.6,
      roughness: 0.02,
      metalness: 0.1,
      side: THREE.BackSide,
    });
    
    const chamber = new THREE.Mesh(chamberGeo, chamberMat);
    chamber.position.y = 2.0;
    this.secretRoom.add(chamber);

    const edges = new THREE.EdgesGeometry(chamberGeo);
    const lineMat = new THREE.LineBasicMaterial({ color: 0xd4af37, transparent: true, opacity: 0.25 });
    const wireframe = new THREE.LineSegments(edges, lineMat);
    wireframe.position.y = 2.0;
    this.secretRoom.add(wireframe);

    // Crystalline floating gemstone
    const detailGeo = new THREE.IcosahedronGeometry(0.85, 2);
    const detailMat = new THREE.MeshPhysicalMaterial({
      color: 0xd4af37,
      metalness: 0.95,
      roughness: 0.08,
      clearcoat: 1.0,
      emissive: 0x472800,
    });
    this.secretProduct = new THREE.Mesh(detailGeo, detailMat);
    this.secretProduct.position.y = 2.5;
    this.secretRoom.add(this.secretProduct);

    const spotlight = new THREE.PointLight(0xd4af37, 2.5, 9);
    spotlight.position.set(0, 3.5, 0);
    this.secretRoom.add(spotlight);

    this.scene.add(this.secretRoom);
    this.secretRoom.visible = false;
  }

  /**
   * Sets up Post Processing Composer
   */
  setupPostProcessing() {
    this.composer = new EffectComposer(this.renderer);
    
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    // Soft, realistic bloom to glow core light, spotlights, and refractions
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.15, // strength
      0.45, // radius
      0.82  // threshold
    );
    this.composer.addPass(bloomPass);

    // Film Grain / Vignette scanlines
    const filmPass = new FilmPass(
      0.13,  // noise intensity (film grain)
      0.015, // scanline intensity
      648,   // scanline count
      false  // grayscale
    );
    this.composer.addPass(filmPass);
  }

  /**
   * Main Render Tick
   */
  update(state) {
    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    // 1. Monolith nested layers animation
    if (this.monolith) {
      const floatOffset = Math.sin(time * 0.7) * 0.12;
      this.monolith.position.y = 2.6 + floatOffset;
      this.monolith.rotation.y += delta * 0.12;
      this.monolith.rotation.x = Math.sin(time * 0.15) * 0.08;

      // Inner core glows and rotates counter-clockwise
      if (this.monolithCore) {
        this.monolithCore.rotation.y -= delta * 0.35;
        this.monolithCore.rotation.z += delta * 0.2;
        
        // Heartbeat pulsing light scale
        const coreScale = 1.0 + Math.sin(time * 3.5) * 0.15;
        this.monolithCore.scale.setScalar(coreScale);
      }

      // Glow Ring
      if (this.monolith.userData.glowRing) {
        this.monolith.userData.glowRing.rotation.z += delta * 0.28;
        if (state.elapsedTime > 15) {
          const ringOp = Math.min(0.55, (state.elapsedTime - 15) / 15 * 0.55);
          this.monolith.userData.glowRing.material.opacity = ringOp + Math.sin(time * 1.8) * 0.06;
        } else {
          this.monolith.userData.glowRing.material.opacity = 0;
        }
      }
    }

    // 2. Act Transitions (Evolution)
    this.animateActs(state, delta);

    // 3. Water ripples (3D wave displacement in Act IV)
    if (this.waterPlane && state.elapsedTime > 60) {
      const posAttr = this.waterPlane.geometry.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        const u = posAttr.getX(i);
        const v = posAttr.getY(i);
        // Organic overlapping ripples
        const wave = Math.sin(u * 0.7 + time * 1.6) * 0.035 + Math.cos(v * 0.9 + time * 1.4) * 0.035;
        posAttr.setZ(i, wave);
      }
      posAttr.needsUpdate = true;
      this.waterPlane.geometry.computeVertexNormals();
    }

    // 4. Ambient Dust Animation
    if (this.dustParticles) {
      const posAttr = this.dustParticles.geometry.attributes.position;
      const speeds = this.dustParticles.userData.speeds;
      const wakeMult = state.isDormant ? 0.12 : Math.min(1.0, 0.3 + (state.elapsedTime / 60));

      for (let i = 0; i < this.dustCount; i++) {
        let y = posAttr.getY(i);
        y += delta * speeds[i] * 0.22 * wakeMult;
        
        if (y > 8.0) {
          y = 0.0;
          posAttr.setX(i, (Math.random() - 0.5) * 16);
          posAttr.setZ(i, (Math.random() - 0.5) * 16);
        }
        posAttr.setY(i, y);
      }
      posAttr.needsUpdate = true;
      this.dustParticles.rotation.y += delta * 0.012 * wakeMult;
    }

    // 5. Rain Particles Animation
    if (this.rainParticles) {
      const isRainy = state.weather === 'rain';
      const rMat = this.rainParticles.material;
      rMat.opacity = THREE.MathUtils.lerp(rMat.opacity, isRainy ? 0.32 : 0, delta * 2.2);

      if (rMat.opacity > 0.01) {
        const posAttr = this.rainParticles.geometry.attributes.position;
        for (let i = 0; i < this.rainCount; i++) {
          let y = posAttr.getY(i);
          y -= delta * 14.5;
          if (y < 0) {
            y = 15;
            posAttr.setX(i, (Math.random() - 0.5) * 20);
            posAttr.setZ(i, (Math.random() - 0.5) * 20);
          }
          posAttr.setY(i, y);
        }
        posAttr.needsUpdate = true;
      }
    }

    // 6. Camera walking via scroll progress
    const scrollZ = 12 - (state.scrollProgress * 26.5);
    const scrollY = 2.5 - (state.scrollProgress * 0.1);
    
    this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, scrollZ, delta * 3.0);
    this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, scrollY, delta * 3.0);

    // Apply parallax rotation (subtle look around cursor)
    const targetRotationX = this.mouse.y * 0.07;
    const targetRotationY = -this.mouse.x * 0.11;
    this.camera.rotation.x = THREE.MathUtils.lerp(this.camera.rotation.x, targetRotationX, delta * 2.3);
    this.camera.rotation.y = THREE.MathUtils.lerp(this.camera.rotation.y, targetRotationY, delta * 2.3);

    // 7. Light color states
    this.updateLightsAndFog(state, delta);

    // 8. Render using the post-processing EffectComposer
    this.composer.render();
  }

  /**
   * Animates visual acts transitions, sprouts plants, pedestal rising, and product aura swirling.
   */
  animateActs(state, delta) {
    const elapsed = state.elapsedTime;
    const time = this.clock.getElapsedTime();
    
    // --- ACT II: AWAKENING (15-30s) ---
    // Spotlight and Volumetric cone fade in
    const spotTarget = elapsed > 15 ? Math.min(1.4, (elapsed - 15) / 10 * 1.4) : 0;
    this.spotLight.intensity = THREE.MathUtils.lerp(this.spotLight.intensity, spotTarget, delta * 1.5);
    this.lightCone.material.opacity = THREE.MathUtils.lerp(this.lightCone.material.opacity, spotTarget * 0.07, delta * 1.5);

    // --- ACT III: DISCOVERY (30-60s) ---
    if (elapsed > 30) {
      const pedTargetY = 0.5;
      this.pedestal.position.y = THREE.MathUtils.lerp(this.pedestal.position.y, pedTargetY, delta * 1.5);
      
      const prodScale = Math.min(1.0, (elapsed - 30) / 20);
      this.product.scale.setScalar(THREE.MathUtils.lerp(this.product.scale.x, prodScale, delta * 2.0));
      this.product.position.y = this.pedestal.position.y + 0.95;
      
      this.product.rotation.y += delta * 0.25;
      this.product.rotation.x += delta * 0.1;

      // Sprout product aura particles
      const auraOpTarget = Math.min(0.45, (elapsed - 30) / 20 * 0.45);
      this.productAura.material.opacity = THREE.MathUtils.lerp(this.productAura.material.opacity, auraOpTarget, delta * 2.0);
      
      if (this.productAura.material.opacity > 0.01) {
        // Swirl aura positions
        const posAttr = this.productAura.geometry.attributes.position;
        const angles = this.productAura.userData.auraAngles;
        const speeds = this.productAura.userData.auraSpeeds;
        
        this.productAura.position.y = this.product.position.y;
        
        for (let i = 0; i < angles.length; i++) {
          angles[i] += delta * speeds[i] * 0.35;
          const r = 0.65 + Math.sin(time + i) * 0.1;
          posAttr.setX(i, Math.cos(angles[i]) * r);
          posAttr.setZ(i, Math.sin(angles[i]) * r);
        }
        posAttr.needsUpdate = true;
      }

      // Concrete walls separate
      const wallSlideProgress = Math.min(1.0, (elapsed - 30) / 30);
      this.walls.forEach((wall) => {
        const targetX = THREE.MathUtils.lerp(wall.userData.initialX, wall.userData.targetX, wallSlideProgress);
        wall.position.x = THREE.MathUtils.lerp(wall.position.x, targetX, delta * 1.5);
      });
      
      const ceilTargetY = THREE.MathUtils.lerp(this.ceiling.userData.initialY, this.ceiling.userData.targetY, wallSlideProgress);
      this.ceiling.position.y = THREE.MathUtils.lerp(this.ceiling.position.y, ceilTargetY, delta * 1.5);
    } else {
      this.pedestal.position.y = THREE.MathUtils.lerp(this.pedestal.position.y, -1.0, delta * 3);
      this.product.scale.setScalar(THREE.MathUtils.lerp(this.product.scale.x, 0.001, delta * 3));
      this.productAura.material.opacity = THREE.MathUtils.lerp(this.productAura.material.opacity, 0, delta * 3);
      this.walls.forEach((wall) => {
        wall.position.x = THREE.MathUtils.lerp(wall.position.x, wall.userData.initialX, delta * 3);
      });
      this.ceiling.position.y = THREE.MathUtils.lerp(this.ceiling.position.y, this.ceiling.userData.initialY, delta * 3);
    }

    // --- ACT IV: TRANSFORMATION (1-2m) ---
    if (elapsed > 60) {
      const waterOpTarget = Math.min(0.85, (elapsed - 60) / 60 * 0.85);
      this.waterPlane.material.opacity = THREE.MathUtils.lerp(this.waterPlane.material.opacity, waterOpTarget, delta * 2);

      // Corner plants sprout and sway in wind
      const plantProgress = Math.min(1.0, (elapsed - 60) / 45);
      this.plants.forEach((plant) => {
        plant.scale.setScalar(THREE.MathUtils.lerp(plant.scale.x, plantProgress, delta * 1.5));
        plant.children.forEach((part, idx) => {
          if (idx > 0) { // leaves sway
            part.rotation.z = Math.sin(time * 1.2 + idx) * 0.06;
          }
        });
      });
      
      // Point light reflections glow up
      this.pointLights.forEach((pl, idx) => {
        const plTarget = 0.55 + Math.sin(time * 1.5 + idx) * 0.2;
        pl.intensity = THREE.MathUtils.lerp(pl.intensity, plTarget, delta * 1.5);
      });
    } else {
      this.waterPlane.material.opacity = THREE.MathUtils.lerp(this.waterPlane.material.opacity, 0, delta * 3);
      this.plants.forEach((plant) => {
        plant.scale.setScalar(THREE.MathUtils.lerp(plant.scale.x, 0.001, delta * 3));
      });
      this.pointLights.forEach((pl) => {
        pl.intensity = THREE.MathUtils.lerp(pl.intensity, 0, delta * 3);
      });
    }

    // --- ACT V: SECRET WORLD (2-5m) ---
    // Product morphs/scales dynamically
    if (elapsed > 120) {
      const unfoldProgress = Math.min(1.0, (elapsed - 120) / 120);
      const innerMesh = this.product.children[0];
      const pulseScale = 1.0 + Math.sin(time * 0.55) * 0.18 * unfoldProgress;
      innerMesh.scale.setScalar(pulseScale);
    }

    // --- ACT VI: LIVING WEBSITE (5m+) ---
    if (elapsed > 300) {
      this.sunLight.position.x = 10 * Math.cos(time * 0.015);
      this.sunLight.position.z = 10 * Math.sin(time * 0.015);
    }

    // 8. UNLOCK SECRET EXHIBITION ROOM (10th Visit)
    if (state.visitCount >= 10) {
      this.secretRoom.visible = true;
      this.secretProduct.rotation.y += delta * 0.35;
      this.secretProduct.rotation.z += delta * 0.12;
      
      if (state.scrollProgress > 0.6) {
        const leftTarget = -9.2;
        const rightTarget = 9.2;
        this.walls[2].position.x = THREE.MathUtils.lerp(this.walls[2].position.x, leftTarget, delta * 2.0);
        this.walls[3].position.x = THREE.MathUtils.lerp(this.walls[3].position.x, rightTarget, delta * 2.0);
      }
    } else {
      this.secretRoom.visible = false;
    }
  }

  /**
   * Updates lighting colors and fog based on Real-World Time of Day and Season
   */
  updateLightsAndFog(state, delta) {
    let targetFogCol = new THREE.Color(0x040405);
    let targetSunCol = new THREE.Color(0xffffff);
    let sunIntensity = 0.1;
    let ambIntensity = 0.02;

    if (state.season === 'winter') {
      this.sunLight.position.set(12, 2.5, 12);
      ambIntensity = 0.01;
    } else {
      this.sunLight.position.set(8, 9, 8);
      ambIntensity = 0.025;
    }

    if (state.timeOfDay === 'morning') {
      targetFogCol.setHex(0x0a0a0f);
      targetSunCol.setHex(0xffeabf); // Warm peach morning
      sunIntensity = 0.35;
      ambIntensity = 0.06;
    } else if (state.timeOfDay === 'sunset') {
      targetFogCol.setHex(0x0c0608);
      targetSunCol.setHex(0xff4a11); // Vibrant sunset orange
      sunIntensity = 0.3;
      ambIntensity = 0.045;
    } else if (state.timeOfDay === 'night') {
      targetFogCol.setHex(0x010103);
      targetSunCol.setHex(0x2b52ff); // Deep moonlight blue
      sunIntensity = 0.07;
      ambIntensity = 0.005;
    }

    const isRain = state.weather === 'rain';
    const targetFogDensity = isRain ? 0.07 : 0.045;
    
    if (state.isDormant) {
      sunIntensity *= 0.05;
      ambIntensity *= 0.05;
      targetFogCol.setHex(0x000002);
    }

    this.scene.fog.color.lerp(targetFogCol, delta * 1.5);
    this.scene.fog.density = THREE.MathUtils.lerp(this.scene.fog.density, targetFogDensity, delta * 1.0);
    this.renderer.setClearColor(this.scene.fog.color);

    this.sunLight.color.lerp(targetSunCol, delta * 1.5);
    this.sunLight.intensity = THREE.MathUtils.lerp(this.sunLight.intensity, sunIntensity, delta * 1.5);
    this.ambientLight.intensity = THREE.MathUtils.lerp(this.ambientLight.intensity, ambIntensity, delta * 1.5);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }

  destroy() {
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    if (this.renderer) {
      this.renderer.dispose();
      this.container.removeChild(this.renderer.domElement);
    }
  }
}

export const scene = new PavilionScene();
