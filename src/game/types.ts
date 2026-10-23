/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type GameState = 'TITLE' | 'PLAYING' | 'PAUSED' | 'GAMEOVER';

export type TimeOfDay = 'day' | 'sunset' | 'night';

export type VehicleType = 'player' | 'sedan' | 'coupe' | 'truck' | 'police' | 'taxi';

export interface CarSkin {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  glass: string;
  glow: string;
}

export interface Vehicle {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  maxSpeed: number;
  acceleration: number;
  handling: number;
  type: VehicleType;
  color: string;
  secondaryColor: string;
  angle: number; // in radians, for steering tilt
  targetAngle: number;
  lane: number;
  targetLane: number;
  blinker: 'left' | 'right' | null;
  blinkerTimer: number;
  sirenTimer: number;
  passedPlayer: boolean;
  nearMissAwarded: boolean;
  isBlasted?: boolean;
  blastVx?: number;
  blastVy?: number;
  blastRot?: number;
}

export type ParticleType = 'smoke' | 'spark' | 'flame' | 'debris' | 'tire_track' | 'speed_line' | 'shield_shockwave';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
  type: ParticleType;
  rotation?: number;
  vRot?: number;
}

export type PickupType = 'coin' | 'nitro' | 'repair' | 'speed_boost' | 'shield';

export interface Pickup {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: PickupType;
  bobTimer: number;
  collected: boolean;
}

export interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  scale: number;
}

export interface RoadsideObject {
  id: number;
  side: 'left' | 'right';
  x: number;
  y: number;
  type: 'lamp' | 'palm' | 'sign' | 'speed_camera';
  label?: string;
}

export interface SkidMark {
  x: number;
  y: number;
  width: number;
  length: number;
  alpha: number;
}

export interface GameStats {
  score: number;
  highScore: number;
  distance: number; // in meters
  coins: number;
  speedMph: number;
  topSpeedMph: number;
  health: number; // 0 - 100
  nitro: number; // 0 - 100
  combo: number;
  comboTimer: number;
  closeCalls: number;
  // Active power-up states
  speedBoostActive: boolean;
  speedBoostTimer: number;
  shieldActive: boolean;
  shieldTimer: number;
}

export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  nitro: boolean;
  brake: boolean;
}
