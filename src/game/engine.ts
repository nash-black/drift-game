/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { sound } from './audio';
import { GameRenderer, CAR_SKINS } from './renderer';
import {
  CarSkin,
  FloatingText,
  GameState,
  GameStats,
  InputState,
  Particle,
  Pickup,
  PickupType,
  RoadsideObject,
  SkidMark,
  TimeOfDay,
  Vehicle,
  VehicleType,
} from './types';

export class RacingGameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private renderer: GameRenderer;
  private animFrameId: number | null = null;
  private lastTime: number = 0;

  // Game state
  public state: GameState = 'TITLE';
  public selectedSkin: CarSkin = CAR_SKINS[0];

  // Callback listeners
  private onStatsChange?: (stats: GameStats) => void;
  private onStateChange?: (state: GameState) => void;

  // Road & Dimensions
  private width: number = 800;
  private height: number = 900;
  private roadOffset: number = 0;
  private timeOfDay: TimeOfDay = 'day';
  private dayTimer: number = 0;

  // Player
  private player: Vehicle = {
    id: 0,
    x: 400,
    y: 720,
    width: 44,
    height: 82,
    speed: 0,
    maxSpeed: 140,
    acceleration: 24,
    handling: 540,
    type: 'player',
    color: CAR_SKINS[0].primary,
    secondaryColor: CAR_SKINS[0].secondary,
    angle: 0,
    targetAngle: 0,
    lane: 2,
    targetLane: 2,
    blinker: null,
    blinkerTimer: 0,
    sirenTimer: 0,
    passedPlayer: true,
    nearMissAwarded: true,
  };

  // Vehicles, Pickups, Particles, Texts
  private enemies: Vehicle[] = [];
  private enemyIdCounter: number = 1;
  private pickups: Pickup[] = [];
  private pickupIdCounter: number = 1;
  private particles: Particle[] = [];
  private floatingTexts: FloatingText[] = [];
  private textIdCounter: number = 1;
  private skidMarks: SkidMark[] = [];
  private roadsideObjects: RoadsideObject[] = [];

  // Spawning timers
  private enemySpawnTimer: number = 0;
  private pickupSpawnTimer: number = 0;

  // Input states
  private inputs: InputState = {
    left: false,
    right: false,
    up: false,
    down: false,
    nitro: false,
    brake: false,
  };

  // Hitstop & screen shake
  private hitstopTimer: number = 0;
  private screenShake: number = 0;
  private isCrashing: boolean = false;
  private crashTimer: number = 0;

  // Stats
  private stats: GameStats = {
    score: 0,
    highScore: 0,
    distance: 0,
    coins: 0,
    speedMph: 0,
    topSpeedMph: 0,
    health: 100,
    nitro: 100,
    combo: 1,
    comboTimer: 0,
    closeCalls: 0,
    speedBoostActive: false,
    speedBoostTimer: 0,
    shieldActive: false,
    shieldTimer: 0,
  };

  constructor(
    canvas: HTMLCanvasElement,
    callbacks?: {
      onStatsChange?: (stats: GameStats) => void;
      onStateChange?: (state: GameState) => void;
    }
  ) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context from canvas');
    this.ctx = ctx;
    this.renderer = new GameRenderer(ctx);
    this.onStatsChange = callbacks?.onStatsChange;
    this.onStateChange = callbacks?.onStateChange;

    const savedHigh = localStorage.getItem('turbo_horizon_high_score');
    if (savedHigh) {
      this.stats.highScore = parseInt(savedHigh, 10) || 0;
    }

    this.bindEvents();
    this.resize();
    this.initRoadsideScenery();
  }

  public setSkin(skin: CarSkin) {
    this.selectedSkin = skin;
    this.player.color = skin.primary;
    this.player.secondaryColor = skin.secondary;
  }

  public resize() {
    const parent = this.canvas.parentElement;
    const rect = parent ? parent.getBoundingClientRect() : { width: window.innerWidth, height: window.innerHeight };
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.width = Math.max(rect.width, 360);
    this.height = Math.max(rect.height, 500);

    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    this.ctx.resetTransform?.();
    this.ctx.scale(dpr, dpr);

    const roadW = Math.min(460, this.width * 0.88);
    this.renderer.setDimensions(this.width, this.height, roadW);

    if (this.state === 'TITLE') {
      const bounds = this.renderer.getRoadBounds();
      this.player.x = bounds.x + bounds.width / 2;
      this.player.y = this.height * 0.76;
    }
  }

  private initRoadsideScenery() {
    this.roadsideObjects = [];
    const bounds = this.renderer.getRoadBounds();
    const spacing = 160;

    for (let y = -spacing; y <= this.height + spacing; y += spacing) {
      this.roadsideObjects.push({
        id: Math.random(),
        side: 'left',
        x: bounds.x - 36,
        y: y,
        type: Math.random() > 0.5 ? 'lamp' : 'palm',
      });
      this.roadsideObjects.push({
        id: Math.random(),
        side: 'right',
        x: bounds.x + bounds.width + 36,
        y: y + spacing / 2,
        type: Math.random() > 0.5 ? 'lamp' : 'palm',
      });
    }
  }

  private bindEvents() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    window.addEventListener('resize', () => this.resize());
  }

  private handleBlur = () => {
    this.inputs = {
      left: false,
      right: false,
      up: false,
      down: false,
      nitro: false,
      brake: false,
    };
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (this.state === 'TITLE') {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        this.startGame();
      }
      return;
    }

    if (this.state === 'GAMEOVER') {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        this.restartGame();
      }
      return;
    }

    if (this.state === 'PLAYING') {
      if (e.code === 'KeyP' || e.code === 'Escape') {
        e.preventDefault();
        this.togglePause();
        return;
      }
    } else if (this.state === 'PAUSED') {
      if (e.code === 'KeyP' || e.code === 'Escape') {
        e.preventDefault();
        this.togglePause();
        return;
      }
    }

    switch (e.code) {
      case 'ArrowLeft':
      case 'KeyA':
        e.preventDefault();
        this.inputs.left = true;
        break;
      case 'ArrowRight':
      case 'KeyD':
        e.preventDefault();
        this.inputs.right = true;
        break;
      case 'ArrowUp':
      case 'KeyW':
        e.preventDefault();
        this.inputs.up = true;
        break;
      case 'ArrowDown':
      case 'KeyS':
        e.preventDefault();
        this.inputs.down = true;
        this.inputs.brake = true;
        break;
      case 'Space':
        e.preventDefault();
        this.inputs.nitro = true;
        break;
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    switch (e.code) {
      case 'ArrowLeft':
      case 'KeyA':
        this.inputs.left = false;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.inputs.right = false;
        break;
      case 'ArrowUp':
      case 'KeyW':
        this.inputs.up = false;
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.inputs.down = false;
        this.inputs.brake = false;
        break;
      case 'Space':
        this.inputs.nitro = false;
        break;
    }
  };

  public setVirtualInput(control: keyof InputState, active: boolean) {
    this.inputs[control] = active;
    if (control === 'down') {
      this.inputs.brake = active;
    }
  }

  public startGame() {
    this.state = 'PLAYING';
    this.onStateChange?.(this.state);
    sound.startEngine();
    sound.startBgm();
    this.resetGameplayState();
  }

  public togglePause() {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
      sound.stopEngine();
      sound.stopBgm();
    } else if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      sound.startEngine();
      sound.startBgm();
      this.lastTime = performance.now();
    }
    this.onStateChange?.(this.state);
  }

  public restartGame() {
    this.resetGameplayState();
    this.state = 'PLAYING';
    this.onStateChange?.(this.state);
    sound.startEngine();
    sound.startBgm();
  }

  private resetGameplayState() {
    const bounds = this.renderer.getRoadBounds();
    this.player.x = bounds.x + bounds.width / 2;
    this.player.y = this.height * 0.76;
    this.player.speed = 65;
    this.player.angle = 0;
    this.player.targetAngle = 0;

    this.enemies = [];
    this.pickups = [];
    this.particles = [];
    this.floatingTexts = [];
    this.skidMarks = [];
    this.isCrashing = false;
    this.crashTimer = 0;
    this.hitstopTimer = 0;
    this.screenShake = 0;
    this.enemySpawnTimer = 0.5;
    this.pickupSpawnTimer = 1.8;

    this.stats = {
      score: 0,
      highScore: this.stats.highScore,
      distance: 0,
      coins: 0,
      speedMph: 65,
      topSpeedMph: 65,
      health: 100,
      nitro: 100,
      combo: 1,
      comboTimer: 0,
      closeCalls: 0,
      speedBoostActive: false,
      speedBoostTimer: 0,
      shieldActive: false,
      shieldTimer: 0,
    };
    this.onStatsChange?.(this.stats);
  }

  public startLoop() {
    this.lastTime = performance.now();
    const tick = (now: number) => {
      const rawDt = (now - this.lastTime) / 1000;
      this.lastTime = now;
      const dt = Math.min(rawDt, 0.05);

      this.update(dt);
      this.render();

      this.animFrameId = requestAnimationFrame(tick);
    };
    this.animFrameId = requestAnimationFrame(tick);
  }

  public stopLoop() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    sound.stopEngine();
    sound.stopBgm();
  }

  private update(dt: number) {
    if (this.state !== 'PLAYING' && this.state !== 'TITLE') return;

    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      return;
    }

    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 25);
    }

    this.dayTimer += dt;
    if (this.dayTimer > 45) {
      this.dayTimer = 0;
      this.timeOfDay = this.timeOfDay === 'day' ? 'sunset' : this.timeOfDay === 'sunset' ? 'night' : 'day';
    }

    if (this.state === 'PLAYING') {
      this.updatePlayingState(dt);
    } else if (this.state === 'TITLE') {
      this.updateTitleState(dt);
    }

    this.updateParticles(dt);
    this.updateFloatingTexts(dt);
  }

  private updateTitleState(dt: number) {
    const idleSpeed = 50;
    this.roadOffset += idleSpeed * dt * 20;
    this.updateRoadsideScenery(idleSpeed * dt * 20);

    const bounds = this.renderer.getRoadBounds();
    this.player.x = bounds.x + bounds.width / 2 + Math.sin(performance.now() * 0.002) * 20;
    this.player.y = this.height * 0.76;
    this.player.angle = Math.sin(performance.now() * 0.002) * 0.04;
  }

  private updatePlayingState(dt: number) {
    const bounds = this.renderer.getRoadBounds();

    if (this.isCrashing) {
      this.crashTimer += dt;
      this.player.angle += dt * 8;
      this.player.y += dt * 40;
      this.player.speed = Math.max(0, this.player.speed - dt * 70);

      if (Math.random() < 0.6) {
        this.addCrashSparks(this.player.x, this.player.y);
      }

      if (this.crashTimer > 1.2) {
        this.triggerGameOver();
      }
      return;
    }

    // 1. Power-up timers countdown
    if (this.stats.speedBoostActive) {
      this.stats.speedBoostTimer -= dt;
      if (this.stats.speedBoostTimer <= 0) {
        this.stats.speedBoostActive = false;
        this.stats.speedBoostTimer = 0;
      }
    }

    if (this.stats.shieldActive) {
      this.stats.shieldTimer -= dt;
      if (this.stats.shieldTimer <= 0) {
        this.stats.shieldActive = false;
        this.stats.shieldTimer = 0;
      }
    }

    // 2. Throttle / Speed Control
    let isBoosting = false;
    let isBraking = this.inputs.down || this.inputs.brake;

    if (this.stats.speedBoostActive) {
      isBoosting = true;
    } else if (this.inputs.nitro && this.stats.nitro > 0) {
      isBoosting = true;
      this.stats.nitro = Math.max(0, this.stats.nitro - dt * 28);
      if (Math.random() < 0.3) {
        sound.playNitro();
      }
    } else if (!this.inputs.up) {
      this.stats.nitro = Math.min(100, this.stats.nitro + dt * 4);
    }

    let targetSpeed = 85;
    if (this.stats.speedBoostActive) {
      targetSpeed = 185; // Hyper speed boost!
    } else if (isBoosting) {
      targetSpeed = 160;
    } else if (this.inputs.up) {
      targetSpeed = 125;
    } else if (isBraking) {
      targetSpeed = 40;
    }

    const distanceBonus = Math.min(25, this.stats.distance * 0.005);
    targetSpeed += distanceBonus;

    const accelRate = this.stats.speedBoostActive ? 90 : isBoosting ? 65 : isBraking ? 95 : 35;
    if (this.player.speed < targetSpeed) {
      this.player.speed = Math.min(targetSpeed, this.player.speed + accelRate * dt);
    } else {
      this.player.speed = Math.max(targetSpeed, this.player.speed - accelRate * dt);
    }

    this.stats.speedMph = Math.round(this.player.speed);
    if (this.stats.speedMph > this.stats.topSpeedMph) {
      this.stats.topSpeedMph = this.stats.speedMph;
    }

    const speedRatio = this.player.speed / 100;
    sound.updateEngine(speedRatio, isBoosting);

    // 3. Lateral Movement / Steering
    const steerSpeed = (this.player.handling + (isBoosting ? 70 : 0)) * (this.player.speed / 100);

    if (this.inputs.left) {
      this.player.x -= steerSpeed * dt;
      this.player.targetAngle = -0.12;
    }
    if (this.inputs.right) {
      this.player.x += steerSpeed * dt;
      this.player.targetAngle = 0.12;
    }
    if (!this.inputs.left && !this.inputs.right) {
      this.player.targetAngle = 0;
    }

    this.player.angle += (this.player.targetAngle - this.player.angle) * dt * 14;

    const minX = bounds.x + this.player.width / 2 + 8;
    const maxX = bounds.x + bounds.width - this.player.width / 2 - 8;

    if (this.player.x < minX) {
      this.player.x = minX;
      this.player.speed = Math.max(40, this.player.speed - dt * 50);
      sound.playScreech();
      this.addSmoke(this.player.x, this.player.y + 30);
    } else if (this.player.x > maxX) {
      this.player.x = maxX;
      this.player.speed = Math.max(40, this.player.speed - dt * 50);
      sound.playScreech();
      this.addSmoke(this.player.x, this.player.y + 30);
    }

    if (isBraking || (Math.abs(this.player.angle) > 0.08 && this.player.speed > 80)) {
      if (Math.random() < 0.4) {
        sound.playScreech();
        this.addSkidMark(this.player.x - 14, this.player.y + 36);
        this.addSkidMark(this.player.x + 14, this.player.y + 36);
        this.addSmoke(this.player.x - 14, this.player.y + 36);
        this.addSmoke(this.player.x + 14, this.player.y + 36);
      }
    }

    // 4. Road & Scenery Scrolling
    const roadScrollSpeed = this.player.speed * 8 * dt;
    this.roadOffset += roadScrollSpeed;
    this.updateRoadsideScenery(roadScrollSpeed);
    this.updateSkidMarks(roadScrollSpeed);

    const distanceDelta = this.player.speed * dt * 0.447 * 2.2;
    this.stats.distance += Math.round(distanceDelta);

    const scoreMultiplier = this.stats.speedBoostActive ? this.stats.combo * 2 : this.stats.combo;
    const scoreDelta = Math.round((this.player.speed / 10) * dt * 12 * scoreMultiplier);
    this.stats.score += scoreDelta;

    if (this.stats.combo > 1) {
      this.stats.comboTimer -= dt;
      if (this.stats.comboTimer <= 0) {
        this.stats.combo = 1;
      }
    }

    // 5. Enemy Vehicles Spawning & AI
    this.updateEnemies(dt, roadScrollSpeed);

    // 6. Pickups Spawning & Collection
    this.updatePickups(dt, roadScrollSpeed);

    // 7. Collision & Near-Miss Detection
    this.checkCollisionsAndNearMisses();

    this.onStatsChange?.(this.stats);
  }

  private updateRoadsideScenery(scrollDelta: number) {
    const bounds = this.renderer.getRoadBounds();

    for (const obj of this.roadsideObjects) {
      obj.y += scrollDelta;
      if (obj.y > this.height + 140) {
        obj.y = -100;
        obj.type = Math.random() > 0.5 ? 'lamp' : 'palm';
        if (Math.random() < 0.15) {
          obj.type = 'sign';
          obj.label = ['NEXT EXIT 2M', 'SPEED 65', 'COASTLINE', 'NORTH 101'][Math.floor(Math.random() * 4)];
        }
        obj.x = obj.side === 'left' ? bounds.x - 36 : bounds.x + bounds.width + 36;
      }
    }
  }

  private updateSkidMarks(scrollDelta: number) {
    for (let i = this.skidMarks.length - 1; i >= 0; i--) {
      const sm = this.skidMarks[i];
      sm.y += scrollDelta;
      sm.alpha -= 0.005;
      if (sm.y > this.height + 50 || sm.alpha <= 0) {
        this.skidMarks.splice(i, 1);
      }
    }
  }

  private updateEnemies(dt: number, roadScrollDelta: number) {
    const bounds = this.renderer.getRoadBounds();

    this.enemySpawnTimer -= dt;
    const spawnInterval = Math.max(1.1, 2.4 - Math.min(1.2, this.stats.distance * 0.0003));

    if (this.enemySpawnTimer <= 0) {
      this.enemySpawnTimer = spawnInterval + Math.random() * 0.8;
      this.spawnEnemy();
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];

      // Blasted enemy physics
      if (e.isBlasted) {
        e.x += (e.blastVx || 0) * dt;
        e.y += (e.blastVy || 0) * dt;
        e.blastRot = (e.blastRot || 0) + dt * 12;
        if (Math.random() < 0.3) {
          this.addSmoke(e.x, e.y);
        }
        if (e.y > this.height + 250 || e.y < -350 || e.x < -150 || e.x > this.width + 150) {
          this.enemies.splice(i, 1);
        }
        continue;
      }

      const relSpeed = (this.player.speed - e.speed) * 8 * dt;
      e.y += relSpeed;

      if (e.type === 'police') {
        e.sirenTimer += dt;
      }

      if (e.blinker) {
        e.blinkerTimer += dt;
      }

      if (e.type === 'coupe' && Math.random() < 0.01 && !e.blinker) {
        const laneShift = Math.random() > 0.5 ? 1 : -1;
        const newLane = Math.max(0, Math.min(3, e.lane + laneShift));
        if (newLane !== e.lane) {
          e.targetLane = newLane;
          e.blinker = laneShift > 0 ? 'right' : 'left';
          e.blinkerTimer = 0;
        }
      }

      if (e.targetLane !== e.lane) {
        const targetX = bounds.x + (e.targetLane + 0.5) * bounds.laneWidth;
        const dx = targetX - e.x;
        e.x += Math.sign(dx) * Math.min(Math.abs(dx), dt * 140);
        e.angle = Math.sign(dx) * 0.08;
        if (Math.abs(dx) < 4) {
          e.x = targetX;
          e.lane = e.targetLane;
          e.blinker = null;
          e.angle = 0;
        }
      }

      if (e.y > this.height + 200 || e.y < -350) {
        this.enemies.splice(i, 1);
      }
    }
  }

  private spawnEnemy() {
    const bounds = this.renderer.getRoadBounds();
    const lane = Math.floor(Math.random() * 4);
    const laneCenterX = bounds.x + (lane + 0.5) * bounds.laneWidth;

    const isOccupied = this.enemies.some((e) => Math.abs(e.y - -120) < 160 && e.lane === lane);
    if (isOccupied) return;

    const occupiedLanes = new Set(this.enemies.filter((e) => e.y < 50 && e.y > -250).map((e) => e.lane));
    if (occupiedLanes.size >= 3 && !occupiedLanes.has(lane)) {
      return;
    }

    const typeRoll = Math.random();
    let type: VehicleType = 'sedan';
    let width = 42;
    let height = 78;
    let speed = 45 + Math.random() * 25;
    let color = '#2563eb';
    let secondaryColor = '#1d4ed8';

    if (typeRoll < 0.2) {
      type = 'truck';
      width = 46;
      height = 135;
      speed = 35 + Math.random() * 15;
      color = '#e2e8f0';
      secondaryColor = '#64748b';
    } else if (typeRoll < 0.45) {
      type = 'coupe';
      width = 42;
      height = 80;
      speed = 65 + Math.random() * 20;
      color = '#f59e0b';
      secondaryColor = '#78350f';
    } else if (typeRoll < 0.6) {
      type = 'police';
      width = 42;
      height = 80;
      speed = 70 + Math.random() * 25;
      color = '#0f172a';
      secondaryColor = '#f8fafc';
    } else if (typeRoll < 0.75) {
      type = 'taxi';
      width = 42;
      height = 78;
      speed = 50 + Math.random() * 15;
      color = '#facc15';
      secondaryColor = '#18181b';
    } else {
      type = 'sedan';
      const sedanColors = [
        { c: '#dc2626', sc: '#991b1b' },
        { c: '#0284c7', sc: '#0369a1' },
        { c: '#9333ea', sc: '#6b21a8' },
        { c: '#475569', sc: '#1e293b' },
      ];
      const pick = sedanColors[Math.floor(Math.random() * sedanColors.length)];
      color = pick.c;
      secondaryColor = pick.sc;
    }

    this.enemies.push({
      id: this.enemyIdCounter++,
      x: laneCenterX,
      y: -120,
      width,
      height,
      speed,
      maxSpeed: speed,
      acceleration: 0,
      handling: 0,
      type,
      color,
      secondaryColor,
      angle: 0,
      targetAngle: 0,
      lane,
      targetLane: lane,
      blinker: null,
      blinkerTimer: 0,
      sirenTimer: 0,
      passedPlayer: false,
      nearMissAwarded: false,
    });
  }

  private updatePickups(dt: number, roadScrollDelta: number) {
    const bounds = this.renderer.getRoadBounds();

    this.pickupSpawnTimer -= dt;
    if (this.pickupSpawnTimer <= 0) {
      this.pickupSpawnTimer = 3.0 + Math.random() * 2.0;

      const lane = Math.floor(Math.random() * 4);
      const px = bounds.x + (lane + 0.5) * bounds.laneWidth;
      const roll = Math.random();

      // Distribution: Coins 40%, Speed Boost 22%, Shield 20%, Repair 10%, Nitro 8%
      let type: PickupType = 'coin';
      if (roll < 0.4) {
        type = 'coin';
      } else if (roll < 0.62) {
        type = 'speed_boost';
      } else if (roll < 0.82) {
        type = 'shield';
      } else if (roll < 0.92) {
        type = 'repair';
      } else {
        type = 'nitro';
      }

      this.pickups.push({
        id: this.pickupIdCounter++,
        x: px,
        y: -50,
        width: 28,
        height: 28,
        type,
        bobTimer: Math.random() * 10,
        collected: false,
      });
    }

    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.y += roadScrollDelta;
      p.bobTimer += dt;

      const dx = Math.abs(p.x - this.player.x);
      const dy = Math.abs(p.y - this.player.y);

      if (dx < 34 && dy < 48 && !p.collected) {
        p.collected = true;
        this.collectPickup(p);
        this.pickups.splice(i, 1);
        continue;
      }

      if (p.y > this.height + 60) {
        this.pickups.splice(i, 1);
      }
    }
  }

  private collectPickup(p: Pickup) {
    if (p.type === 'speed_boost') {
      sound.playSpeedBoost();
      this.stats.speedBoostActive = true;
      this.stats.speedBoostTimer = 6.0; // 6 seconds of hyper boost!
      this.stats.score += 500;
      this.addFloatingText('⚡ SPEED BOOST! 185 MPH', p.x, p.y, '#f59e0b', 22, true);
      this.addSparkles(p.x, p.y, '#f59e0b');
    } else if (p.type === 'shield') {
      sound.playShieldUp();
      this.stats.shieldActive = true;
      this.stats.shieldTimer = 7.0; // 7 seconds of invincibility!
      this.stats.score += 500;
      this.addFloatingText('🛡️ SHIELD INVINCIBILITY!', p.x, p.y, '#06b6d4', 22, true);
      this.addSparkles(p.x, p.y, '#06b6d4');
    } else if (p.type === 'coin') {
      sound.playCoin();
      this.stats.coins += 1;
      const coinScore = 150 * this.stats.combo;
      this.stats.score += coinScore;
      this.addFloatingText(`+${coinScore}`, p.x, p.y, '#fbbf24', 18);
      this.addSparkles(p.x, p.y, '#fbbf24');
    } else if (p.type === 'nitro') {
      sound.playNitro();
      this.stats.nitro = Math.min(100, this.stats.nitro + 35);
      this.stats.score += 200;
      this.addFloatingText('NITRO BOOST!', p.x, p.y, '#38bdf8', 20);
      this.addSparkles(p.x, p.y, '#38bdf8');
    } else if (p.type === 'repair') {
      sound.playRepair();
      this.stats.health = Math.min(100, this.stats.health + 30);
      this.addFloatingText('REPAIRED +30%', p.x, p.y, '#34d399', 20);
      this.addSparkles(p.x, p.y, '#34d399');
    }
  }

  private checkCollisionsAndNearMisses() {
    const pw = this.player.width * 0.78;
    const ph = this.player.height * 0.82;
    const px = this.player.x;
    const py = this.player.y;

    for (const e of this.enemies) {
      if (e.isBlasted) continue;

      const ew = e.width * 0.8;
      const eh = e.height * 0.85;
      const ex = e.x;
      const ey = e.y;

      const overlapX = Math.abs(px - ex) < (pw + ew) / 2;
      const overlapY = Math.abs(py - ey) < (ph + eh) / 2;

      // 1. Collision Check
      if (overlapX && overlapY) {
        if (this.stats.shieldActive) {
          // Invincible! Blast enemy away
          this.handleShieldSmash(e);
        } else {
          this.handleCrash(e);
        }
        break;
      }

      // 2. Near-Miss (Close Call) Detection
      const lateralDist = Math.abs(px - ex);
      const verticalOverlap = Math.abs(py - ey) < (ph + eh) / 2 + 10;
      const isClose = lateralDist > (pw + ew) / 2 && lateralDist < (pw + ew) / 2 + 22;

      if (verticalOverlap && isClose && !e.nearMissAwarded && this.player.speed > 70) {
        e.nearMissAwarded = true;
        this.stats.closeCalls += 1;
        this.stats.combo = Math.min(5, this.stats.combo + 1);
        this.stats.comboTimer = 3.5;
        this.stats.nitro = Math.min(100, this.stats.nitro + 12);

        const bonus = 250 * this.stats.combo;
        this.stats.score += bonus;
        sound.playWhoosh();
        this.screenShake = 3.5;

        this.addFloatingText(`CLOSE CALL! +${bonus}`, px, py - 40, '#f43f5e', 22, true);
        if (this.stats.combo > 1) {
          this.addFloatingText(`${this.stats.combo}X COMBO!`, px, py - 70, '#fbbf24', 24, true);
        }
      }
    }
  }

  private handleShieldSmash(enemy: Vehicle) {
    sound.playShieldHit();
    this.screenShake = 7;
    enemy.isBlasted = true;
    const blastDir = enemy.x < this.player.x ? -1 : 1;
    enemy.blastVx = blastDir * (280 + Math.random() * 120);
    enemy.blastVy = -180;
    enemy.blastRot = 0;

    const bonus = 400 * this.stats.combo;
    this.stats.score += bonus;
    this.addFloatingText(`SHIELD SMASH! +${bonus}`, enemy.x, enemy.y - 20, '#06b6d4', 24, true);

    // Shockwave ring
    this.particles.push({
      x: (this.player.x + enemy.x) / 2,
      y: (this.player.y + enemy.y) / 2,
      vx: 0,
      vy: 0,
      life: 0.35,
      maxLife: 0.35,
      size: 40,
      color: '#38bdf8',
      alpha: 1,
      type: 'shield_shockwave',
    });

    this.addCrashSparks(enemy.x, enemy.y);
  }

  private handleCrash(enemy: Vehicle) {
    if (this.isCrashing) return;

    sound.playCrash();
    this.screenShake = 16;
    this.hitstopTimer = 0.07;

    const impactSpeed = Math.abs(this.player.speed - enemy.speed);
    const damage = Math.max(35, Math.round(impactSpeed * 0.8));
    this.stats.health = Math.max(0, this.stats.health - damage);

    this.addCrashSparks((this.player.x + enemy.x) / 2, (this.player.y + enemy.y) / 2);
    this.addFloatingText(`CRASH -${damage}%`, this.player.x, this.player.y - 30, '#ef4444', 24, true);

    if (this.stats.health <= 0) {
      this.isCrashing = true;
      this.crashTimer = 0;
      this.player.speed = 40;
    } else {
      const bounceDir = this.player.x < enemy.x ? -1 : 1;
      this.player.x += bounceDir * 35;
      this.player.speed = Math.max(35, this.player.speed - 30);
      sound.playScreech();
    }
  }

  private triggerGameOver() {
    this.state = 'GAMEOVER';
    sound.stopEngine();
    sound.stopBgm();

    if (this.stats.score > this.stats.highScore) {
      this.stats.highScore = this.stats.score;
      localStorage.setItem('turbo_horizon_high_score', String(this.stats.highScore));
    }

    this.onStateChange?.(this.state);
    this.onStatsChange?.(this.stats);
  }

  private addSmoke(x: number, y: number) {
    this.particles.push({
      x: x + (Math.random() * 8 - 4),
      y: y + (Math.random() * 8 - 4),
      vx: (Math.random() - 0.5) * 20,
      vy: 40 + Math.random() * 30,
      life: 0.4,
      maxLife: 0.4,
      size: 6 + Math.random() * 8,
      color: 'rgba(203, 213, 225, 0.4)',
      alpha: 0.5,
      type: 'smoke',
    });
  }

  private addCrashSparks(x: number, y: number) {
    for (let i = 0; i < 24; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 160;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5 + Math.random() * 0.4,
        maxLife: 0.8,
        size: 3 + Math.random() * 3,
        color: Math.random() > 0.4 ? '#f59e0b' : '#ef4444',
        alpha: 1,
        type: 'spark',
      });
    }

    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 100;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.7 + Math.random() * 0.4,
        maxLife: 1.1,
        size: 5 + Math.random() * 6,
        color: '#475569',
        alpha: 1,
        type: 'debris',
        rotation: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 8,
      });
    }
  }

  private addSparkles(x: number, y: number, color: string) {
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const speed = 40 + Math.random() * 50;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4,
        maxLife: 0.4,
        size: 3 + Math.random() * 2,
        color,
        alpha: 1,
        type: 'spark',
      });
    }
  }

  private addSkidMark(x: number, y: number) {
    this.skidMarks.push({
      x,
      y,
      width: 5,
      length: 12,
      alpha: 1.0,
    });
    if (this.skidMarks.length > 80) {
      this.skidMarks.shift();
    }
  }

  private addFloatingText(
    text: string,
    x: number,
    y: number,
    color: string,
    size: number,
    isCritical: boolean = false
  ) {
    this.floatingTexts.push({
      id: this.textIdCounter++,
      text,
      x,
      y,
      vy: -60,
      life: 1.0,
      maxLife: 1.0,
      color,
      size,
      scale: isCritical ? 1.3 : 1.0,
    });
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.alpha = Math.max(0, p.life / p.maxLife);
      if (p.type === 'shield_shockwave') {
        p.size += dt * 180;
      }
      if (p.rotation !== undefined && p.vRot) {
        p.rotation += p.vRot * dt;
      }
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private updateFloatingTexts(dt: number) {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const t = this.floatingTexts[i];
      t.y += t.vy * dt;
      t.life -= dt;
      if (t.scale > 1.0) {
        t.scale = Math.max(1.0, t.scale - dt * 0.8);
      }
      if (t.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  private render() {
    this.renderer.clear();

    if (this.screenShake > 0) {
      const ox = (Math.random() - 0.5) * this.screenShake;
      const oy = (Math.random() - 0.5) * this.screenShake;
      this.ctx.save();
      this.ctx.translate(ox, oy);
    }

    const speedRatio = this.player.speed / 100;
    this.renderer.renderEnvironment(
      this.roadOffset,
      this.timeOfDay,
      this.roadsideObjects,
      this.skidMarks,
      speedRatio
    );

    this.renderer.renderPickups(this.pickups);

    for (const enemy of this.enemies) {
      this.renderer.renderEnemyCar(enemy, this.timeOfDay);
    }

    const isBoosting = (this.inputs.nitro && this.stats.nitro > 0) || this.stats.speedBoostActive;
    const isBraking = this.inputs.down || this.inputs.brake;
    this.renderer.renderPlayerCar(
      this.player,
      this.selectedSkin,
      isBoosting,
      isBraking,
      this.timeOfDay,
      this.stats.shieldActive,
      this.stats.speedBoostActive
    );

    this.renderer.renderParticles(this.particles);
    this.renderer.renderFloatingTexts(this.floatingTexts);

    if (this.screenShake > 0) {
      this.ctx.restore();
    }
  }

  public destroy() {
    this.stopLoop();
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
  }
}
