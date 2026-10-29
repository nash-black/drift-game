/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Vehicle, Particle, Pickup, FloatingText, RoadsideObject, SkidMark, TimeOfDay, CarSkin } from './types';

export const CAR_SKINS: CarSkin[] = [
  {
    id: 'crimson_fury',
    name: 'Crimson GT',
    primary: '#e11d48',
    secondary: '#881337',
    accent: '#fbbf24',
    glass: '#1e293b',
    glow: 'rgba(225, 29, 72, 0.4)',
  },
  {
    id: 'cyber_volt',
    name: 'Cyber Volt',
    primary: '#06b6d4',
    secondary: '#0e7490',
    accent: '#a5f3fc',
    glass: '#0f172a',
    glow: 'rgba(6, 182, 212, 0.4)',
  },
  {
    id: 'midnight_shadow',
    name: 'Shadow R',
    primary: '#334155',
    secondary: '#0f172a',
    accent: '#ef4444',
    glass: '#020617',
    glow: 'rgba(239, 68, 68, 0.4)',
  },
  {
    id: 'hyper_gold',
    name: 'Aero Gold',
    primary: '#f59e0b',
    secondary: '#78350f',
    accent: '#fef08a',
    glass: '#18181b',
    glow: 'rgba(245, 158, 11, 0.4)',
  },
  {
    id: 'emerald_apex',
    name: 'Apex Green',
    primary: '#10b981',
    secondary: '#064e3b',
    accent: '#6ee7b7',
    glass: '#0f172a',
    glow: 'rgba(16, 185, 129, 0.4)',
  },
];

export class GameRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number = 800;
  private height: number = 900;
  private roadX: number = 0;
  private roadWidth: number = 420;
  private laneWidth: number = 105;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  public setDimensions(w: number, h: number, roadW: number = 420) {
    this.width = w;
    this.height = h;
    this.roadWidth = Math.min(roadW, w * 0.88);
    this.roadX = (w - this.roadWidth) / 2;
    this.laneWidth = this.roadWidth / 4;
  }

  public getRoadBounds() {
    return {
      x: this.roadX,
      width: this.roadWidth,
      laneWidth: this.laneWidth,
      leftKerb: this.roadX,
      rightKerb: this.roadX + this.roadWidth,
    };
  }

  public clear() {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  public renderEnvironment(
    roadOffset: number,
    timeOfDay: TimeOfDay,
    roadsideObjects: RoadsideObject[],
    skidMarks: SkidMark[],
    speedRatio: number
  ) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const rx = this.roadX;
    const rw = this.roadWidth;

    // 1. Off-road landscape background
    const bgGradient = ctx.createLinearGradient(0, 0, w, 0);
    if (timeOfDay === 'sunset') {
      bgGradient.addColorStop(0, '#1c1917');
      bgGradient.addColorStop(0.2, '#292524');
      bgGradient.addColorStop(0.8, '#292524');
      bgGradient.addColorStop(1, '#1c1917');
    } else if (timeOfDay === 'night') {
      bgGradient.addColorStop(0, '#05070a');
      bgGradient.addColorStop(0.2, '#090d16');
      bgGradient.addColorStop(0.8, '#090d16');
      bgGradient.addColorStop(1, '#05070a');
    } else {
      bgGradient.addColorStop(0, '#14532d');
      bgGradient.addColorStop(0.2, '#15803d');
      bgGradient.addColorStop(0.8, '#15803d');
      bgGradient.addColorStop(1, '#14532d');
    }
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, w, h);

    // 2. Road shoulders (Gravel & Emergency strips)
    const shoulderWidth = Math.max(16, (w - rw) * 0.12);
    ctx.fillStyle = timeOfDay === 'night' ? '#181b22' : '#334155';
    // Left shoulder
    ctx.fillRect(rx - shoulderWidth, 0, shoulderWidth, h);
    // Right shoulder
    ctx.fillRect(rx + rw, 0, shoulderWidth, h);

    // 3. Asphalt road surface
    const asphaltGrad = ctx.createLinearGradient(rx, 0, rx + rw, 0);
    if (timeOfDay === 'night') {
      asphaltGrad.addColorStop(0, '#11151c');
      asphaltGrad.addColorStop(0.5, '#161b24');
      asphaltGrad.addColorStop(1, '#11151c');
    } else if (timeOfDay === 'sunset') {
      asphaltGrad.addColorStop(0, '#1e1b24');
      asphaltGrad.addColorStop(0.5, '#26222e');
      asphaltGrad.addColorStop(1, '#1e1b24');
    } else {
      asphaltGrad.addColorStop(0, '#1e293b');
      asphaltGrad.addColorStop(0.5, '#243044');
      asphaltGrad.addColorStop(1, '#1e293b');
    }
    ctx.fillStyle = asphaltGrad;
    ctx.fillRect(rx, 0, rw, h);

    const surfaceGlow = ctx.createLinearGradient(rx, 0, rx + rw, 0);
    surfaceGlow.addColorStop(0, 'rgba(255, 255, 255, 0)');
    surfaceGlow.addColorStop(0.5, timeOfDay === 'night' ? 'rgba(125, 211, 252, 0.045)' : 'rgba(255, 255, 255, 0.055)');
    surfaceGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = surfaceGlow;
    ctx.fillRect(rx, 0, rw, h);

    // Subtle road grain / horizontal texture lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
    ctx.lineWidth = 1;
    const grainSpacing = 40;
    const grainOffset = roadOffset % grainSpacing;
    for (let y = grainOffset; y < h; y += grainSpacing) {
      ctx.beginPath();
      ctx.moveTo(rx, y);
      ctx.lineTo(rx + rw, y);
      ctx.stroke();
    }

    // 4. Rumble strips / Hazard kerbs (Red and White alternating)
    const kerbWidth = 12;
    const kerbBlockHeight = 36;
    const kerbOffset = roadOffset % (kerbBlockHeight * 2);

    for (let y = -kerbBlockHeight * 2; y < h + kerbBlockHeight * 2; y += kerbBlockHeight) {
      const isRed = Math.floor((y - kerbOffset) / kerbBlockHeight) % 2 === 0;
      const kerbColor = isRed ? '#dc2626' : '#f8fafc';

      ctx.fillStyle = kerbColor;
      // Left kerb
      ctx.fillRect(rx, y + kerbOffset, kerbWidth, kerbBlockHeight);
      // Right kerb
      ctx.fillRect(rx + rw - kerbWidth, y + kerbOffset, kerbWidth, kerbBlockHeight);
    }

    // 5. Solid shoulder edge lines
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(rx + kerbWidth + 3, 0);
    ctx.lineTo(rx + kerbWidth + 3, h);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(rx + rw - kerbWidth - 3, 0);
    ctx.lineTo(rx + rw - kerbWidth - 3, h);
    ctx.stroke();

    // 6. Dashed lane divider lines
    const dashLength = 40;
    const dashGap = 35;
    const dashTotal = dashLength + dashGap;
    const dashOffset = roadOffset % dashTotal;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 3;
    ctx.setLineDash([dashLength, dashGap]);
    ctx.lineDashOffset = -dashOffset;

    for (let i = 1; i < 4; i++) {
      const laneX = rx + i * this.laneWidth;
      ctx.beginPath();
      ctx.moveTo(laneX, 0);
      ctx.lineTo(laneX, h);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // 7. Skid marks on road
    for (const sm of skidMarks) {
      ctx.fillStyle = `rgba(15, 23, 42, ${sm.alpha * 0.4})`;
      ctx.beginPath();
      ctx.ellipse(sm.x, sm.y, sm.width, sm.length, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 8. Metal Guard Rails & Roadside Objects
    this.renderGuardRails(rx - shoulderWidth, rx + rw + shoulderWidth);
    this.renderRoadsideObjects(roadsideObjects, timeOfDay);

    // 9. Speed lines overlay on high velocity
    if (speedRatio > 1.1) {
      const lineAlpha = Math.min(0.28, (speedRatio - 1.1) * 0.45);
      ctx.strokeStyle = `rgba(255, 255, 255, ${lineAlpha})`;
      ctx.lineWidth = 1.5;
      const count = 14;
      for (let i = 0; i < count; i++) {
        const lx = rx + 30 + ((i * 137) % (rw - 60));
        const ly = ((i * 91 + roadOffset * 1.5) % (h + 100)) - 50;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx, ly + 45 * speedRatio);
        ctx.stroke();
      }
    }

    const vignette = ctx.createRadialGradient(
      w / 2,
      h * 0.42,
      Math.min(w, h) * 0.2,
      w / 2,
      h * 0.42,
      Math.max(w, h) * 0.72
    );
    vignette.addColorStop(0, 'rgba(2, 6, 23, 0)');
    vignette.addColorStop(1, timeOfDay === 'night' ? 'rgba(2, 6, 23, 0.48)' : 'rgba(2, 6, 23, 0.32)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
  }

  private renderGuardRails(leftX: number, rightX: number) {
    const ctx = this.ctx;
    const h = this.height;

    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(leftX, 0);
    ctx.lineTo(leftX, h);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(rightX, 0);
    ctx.lineTo(rightX, h);
    ctx.stroke();
  }

  private renderRoadsideObjects(objects: RoadsideObject[], timeOfDay: TimeOfDay) {
    const ctx = this.ctx;

    for (const obj of objects) {
      if (obj.y < -100 || obj.y > this.height + 100) continue;

      if (obj.type === 'lamp') {
        ctx.save();
        ctx.translate(obj.x, obj.y);

        ctx.fillStyle = '#475569';
        ctx.fillRect(-3, -20, 6, 20);

        const armDir = obj.side === 'left' ? 1 : -1;
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, -20);
        ctx.quadraticCurveTo(armDir * 15, -28, armDir * 32, -22);
        ctx.stroke();

        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(armDir * 30 - 4, -24, 8, 4);

        if (timeOfDay === 'night' || timeOfDay === 'sunset') {
          const coneGrad = ctx.createRadialGradient(
            armDir * 32,
            0,
            5,
            armDir * 32,
            30,
            120
          );
          coneGrad.addColorStop(0, 'rgba(254, 240, 138, 0.35)');
          coneGrad.addColorStop(0.5, 'rgba(254, 240, 138, 0.12)');
          coneGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');

          ctx.fillStyle = coneGrad;
          ctx.beginPath();
          ctx.ellipse(armDir * 32, 20, 60, 45, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      } else if (obj.type === 'palm') {
        ctx.save();
        ctx.translate(obj.x, obj.y);

        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.moveTo(-4, 15);
        ctx.lineTo(-2, -20);
        ctx.lineTo(2, -20);
        ctx.lineTo(4, 15);
        ctx.fill();

        ctx.fillStyle = timeOfDay === 'night' ? '#064e3b' : '#15803d';
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 3) {
          ctx.save();
          ctx.translate(0, -20);
          ctx.rotate(angle);
          ctx.beginPath();
          ctx.ellipse(0, -18, 7, 20, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        ctx.restore();
      } else if (obj.type === 'sign') {
        ctx.save();
        ctx.translate(obj.x, obj.y);
        ctx.fillStyle = '#065f46';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;

        const sw = 50;
        const sh = 26;
        ctx.beginPath();
        ctx.roundRect(-sw / 2, -sh / 2, sw, sh, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px "Outfit", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(obj.label || 'NORTH 101', 0, 0);

        ctx.restore();
      }
    }
  }

  public renderPlayerCar(
    player: Vehicle,
    skin: CarSkin,
    isBoosting: boolean,
    isBraking: boolean,
    timeOfDay: TimeOfDay,
    shieldActive: boolean = false,
    speedBoostActive: boolean = false
  ) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);

    const w = player.width;
    const h = player.height;
    const hw = w / 2;
    const hh = h / 2;

    // 1. Headlight beam cones
    if (timeOfDay === 'night' || timeOfDay === 'sunset' || isBoosting || speedBoostActive) {
      const beamLength = speedBoostActive ? 320 : 260;
      const beamSpread = speedBoostActive ? 55 : 45;

      const beamGrad = ctx.createLinearGradient(0, -hh, 0, -hh - beamLength);
      beamGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
      beamGrad.addColorStop(0.3, speedBoostActive ? 'rgba(254, 240, 138, 0.35)' : 'rgba(224, 242, 254, 0.25)');
      beamGrad.addColorStop(1, 'rgba(224, 242, 254, 0)');

      ctx.fillStyle = beamGrad;

      // Left light beam
      ctx.beginPath();
      ctx.moveTo(-hw + 8, -hh + 5);
      ctx.lineTo(-hw - beamSpread, -hh - beamLength);
      ctx.lineTo(-hw + 15, -hh - beamLength);
      ctx.closePath();
      ctx.fill();

      // Right light beam
      ctx.beginPath();
      ctx.moveTo(hw - 8, -hh + 5);
      ctx.lineTo(hw - 15, -hh - beamLength);
      ctx.lineTo(hw + beamSpread, -hh - beamLength);
      ctx.closePath();
      ctx.fill();
    }

    // 2. Soft drop shadow under car
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.roundRect(-hw - 3, -hh + 4, w + 6, h + 2, 10);
    ctx.fill();

    // 3. Wheels / Tires
    const wheelW = 8;
    const wheelH = 18;
    const steerAngle = player.angle * 1.5;

    ctx.fillStyle = '#0f172a';
    // Front-left wheel
    ctx.save();
    ctx.translate(-hw - 2, -hh + 14);
    ctx.rotate(steerAngle);
    ctx.fillRect(-wheelW / 2, -wheelH / 2, wheelW, wheelH);
    ctx.restore();

    // Front-right wheel
    ctx.save();
    ctx.translate(hw + 2, -hh + 14);
    ctx.rotate(steerAngle);
    ctx.fillRect(-wheelW / 2, -wheelH / 2, wheelW, wheelH);
    ctx.restore();

    // Rear-left wheel
    ctx.fillRect(-hw - 2 - wheelW / 2, hh - 18 - wheelH / 2, wheelW, wheelH);
    // Rear-right wheel
    ctx.fillRect(hw + 2 - wheelW / 2, hh - 18 - wheelH / 2, wheelW, wheelH);

    // 4. Car chassis
    ctx.fillStyle = skin.primary;
    ctx.beginPath();
    ctx.moveTo(0, -hh);
    ctx.bezierCurveTo(hw * 0.7, -hh, hw, -hh + 10, hw, -hh + 24);
    ctx.lineTo(hw - 2, hh - 18);
    ctx.lineTo(hw, hh - 8);
    ctx.bezierCurveTo(hw, hh, hw * 0.6, hh + 2, 0, hh + 2);
    ctx.bezierCurveTo(-hw * 0.6, hh + 2, -hw, hh, -hw, hh - 8);
    ctx.lineTo(-hw + 2, hh - 18);
    ctx.lineTo(-hw, -hh + 24);
    ctx.bezierCurveTo(-hw, -hh + 10, -hw * 0.7, -hh, 0, -hh);
    ctx.fill();

    // 5. Racing stripe
    ctx.fillStyle = skin.accent;
    ctx.fillRect(-4, -hh + 2, 8, h - 8);

    // 6. Cockpit & Glass
    ctx.fillStyle = skin.glass;
    ctx.beginPath();
    ctx.moveTo(-hw + 8, -hh + 26);
    ctx.lineTo(hw - 8, -hh + 26);
    ctx.lineTo(hw - 6, -hh + 42);
    ctx.lineTo(-hw + 6, -hh + 42);
    ctx.closePath();
    ctx.fill();

    // Glass reflection glare
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.beginPath();
    ctx.moveTo(-hw + 12, -hh + 28);
    ctx.lineTo(-hw + 18, -hh + 28);
    ctx.lineTo(-hw + 12, -hh + 40);
    ctx.lineTo(-hw + 6, -hh + 40);
    ctx.closePath();
    ctx.fill();

    // Roof panel
    ctx.fillStyle = skin.secondary;
    ctx.beginPath();
    ctx.roundRect(-hw + 7, -hh + 42, w - 14, 20, 2);
    ctx.fill();

    // Rear window
    ctx.fillStyle = skin.glass;
    ctx.beginPath();
    ctx.moveTo(-hw + 7, -hh + 62);
    ctx.lineTo(hw - 7, -hh + 62);
    ctx.lineTo(-hw + 9, -hh + 72);
    ctx.lineTo(hw - 9, -hh + 72);
    ctx.closePath();
    ctx.fill();

    // 7. Spoiler
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-hw - 1, hh - 4, w + 2, 5);

    // 8. Front Headlights
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = speedBoostActive ? '#fbbf24' : '#67e8f9';
    ctx.shadowBlur = speedBoostActive ? 16 : 8;
    ctx.fillRect(-hw + 4, -hh + 1, 6, 4);
    ctx.fillRect(hw - 10, -hh + 1, 6, 4);
    ctx.shadowBlur = 0;

    // 9. Rear Taillights
    const tailColor = isBraking ? '#ff0033' : '#ef4444';
    ctx.fillStyle = tailColor;
    ctx.shadowColor = tailColor;
    ctx.shadowBlur = isBraking ? 18 : 6;
    ctx.fillRect(-hw + 4, hh - 1, 8, isBraking ? 5 : 3);
    ctx.fillRect(hw - 12, hh - 1, 8, isBraking ? 5 : 3);
    ctx.shadowBlur = 0;

    // 10. Nitro / Speed Boost exhaust fire
    if (isBoosting || speedBoostActive) {
      const flameLength = speedBoostActive ? 30 + Math.random() * 16 : 16 + Math.random() * 12;
      const flameGrad = ctx.createLinearGradient(0, hh, 0, hh + flameLength);
      if (speedBoostActive) {
        flameGrad.addColorStop(0, '#ffffff');
        flameGrad.addColorStop(0.3, '#f59e0b');
        flameGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
      } else {
        flameGrad.addColorStop(0, '#ffffff');
        flameGrad.addColorStop(0.3, '#38bdf8');
        flameGrad.addColorStop(1, 'rgba(14, 165, 233, 0)');
      }

      ctx.fillStyle = flameGrad;
      // Left flame
      ctx.beginPath();
      ctx.moveTo(-hw + 8, hh + 2);
      ctx.lineTo(-hw + 14, hh + 2);
      ctx.lineTo(-hw + 11, hh + flameLength);
      ctx.closePath();
      ctx.fill();

      // Right flame
      ctx.beginPath();
      ctx.moveTo(hw - 14, hh + 2);
      ctx.lineTo(hw - 8, hh + 2);
      ctx.lineTo(hw - 11, hh + flameLength);
      ctx.closePath();
      ctx.fill();
    }

    // 11. Energy Shield Dome (when shield is active)
    if (shieldActive) {
      const shieldPulse = (Math.sin(performance.now() * 0.01) + 1) * 0.15;
      const radius = Math.max(hw, hh) + 10 + shieldPulse * 8;

      // Outer glow
      ctx.save();
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 20;

      const shieldGrad = ctx.createRadialGradient(0, 0, radius * 0.4, 0, 0, radius);
      shieldGrad.addColorStop(0, 'rgba(6, 182, 212, 0.08)');
      shieldGrad.addColorStop(0.7, 'rgba(14, 165, 233, 0.22)');
      shieldGrad.addColorStop(0.9, 'rgba(56, 189, 248, 0.45)');
      shieldGrad.addColorStop(1, 'rgba(224, 242, 254, 0.85)');

      ctx.fillStyle = shieldGrad;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Revolving energy rings
      ctx.strokeStyle = 'rgba(165, 243, 252, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 0.95, radius * 0.4, performance.now() * 0.003, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }

    ctx.restore();
  }

  public renderEnemyCar(enemy: Vehicle, timeOfDay: TimeOfDay) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(enemy.angle + (enemy.blastRot || 0));

    const w = enemy.width;
    const h = enemy.height;
    const hw = w / 2;
    const hh = h / 2;

    // Drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.roundRect(-hw - 2, -hh + 4, w + 4, h + 2, 8);
    ctx.fill();

    if (enemy.type === 'truck') {
      const cabH = 34;
      const trailerH = h - cabH - 8;

      ctx.fillStyle = enemy.color;
      ctx.beginPath();
      ctx.roundRect(-hw, -hh, w, trailerH, 4);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      for (let y = -hh + 12; y < -hh + trailerH - 6; y += 10) {
        ctx.beginPath();
        ctx.moveTo(-hw + 3, y);
        ctx.lineTo(hw - 3, y);
        ctx.stroke();
      }

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-hw + 10, -hh + trailerH, w - 20, 8);

      ctx.fillStyle = enemy.secondaryColor;
      ctx.beginPath();
      ctx.roundRect(-hw + 2, -hh + trailerH + 8, w - 4, cabH, 6);
      ctx.fill();

      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(-hw + 6, hh - 14, w - 12, 10, 2);
      ctx.fill();

      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-hw + 4, hh - 2, 6, 2);
      ctx.fillRect(hw - 10, hh - 2, 6, 2);

      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-hw + 3, -hh, 6, 3);
      ctx.fillRect(hw - 9, -hh, 6, 3);
    } else if (enemy.type === 'police') {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-hw - 2, -hh + 10, 4, 14);
      ctx.fillRect(hw - 2, -hh + 10, 4, 14);
      ctx.fillRect(-hw - 2, hh - 22, 4, 14);
      ctx.fillRect(hw - 2, hh - 22, 4, 14);

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(-hw, -hh, w, h, 8);
      ctx.fill();

      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-hw + 3, -hh + 16, w - 6, h - 32);

      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-hw + 5, hh - 20, w - 10, 10);
      ctx.fillRect(-hw + 5, -hh + 10, w - 10, 8);

      const strobe = Math.floor(enemy.sirenTimer * 10) % 2 === 0;
      const leftStrobe = strobe ? '#ef4444' : '#38bdf8';
      const rightStrobe = strobe ? '#38bdf8' : '#ef4444';

      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-hw + 8, -4, w - 16, 8);

      ctx.fillStyle = leftStrobe;
      ctx.shadowColor = leftStrobe;
      ctx.shadowBlur = 10;
      ctx.fillRect(-hw + 10, -3, 8, 6);

      ctx.fillStyle = rightStrobe;
      ctx.shadowColor = rightStrobe;
      ctx.shadowBlur = 10;
      ctx.fillRect(hw - 18, -3, 8, 6);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-hw + 4, hh - 2, 6, 3);
      ctx.fillRect(hw - 10, hh - 2, 6, 3);

      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-hw + 4, -hh, 6, 3);
      ctx.fillRect(hw - 10, -hh, 6, 3);
    } else {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-hw - 2, -hh + 10, 4, 14);
      ctx.fillRect(hw - 2, -hh + 10, 4, 14);
      ctx.fillRect(-hw - 2, hh - 22, 4, 14);
      ctx.fillRect(hw - 2, hh - 22, 4, 14);

      ctx.fillStyle = enemy.color;
      ctx.beginPath();
      ctx.roundRect(-hw, -hh, w, h, 7);
      ctx.fill();

      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(-hw + 5, hh - 22, w - 10, 10, 2);
      ctx.fill();

      ctx.fillStyle = enemy.secondaryColor || '#0f172a';
      ctx.beginPath();
      ctx.roundRect(-hw + 6, -hh + 20, w - 12, h - 42, 2);
      ctx.fill();

      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(-hw + 5, -hh + 12, w - 10, 8, 2);
      ctx.fill();

      if (enemy.type === 'taxi') {
        ctx.fillStyle = '#facc15';
        ctx.fillRect(-10, -4, 20, 8);
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 6px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('TAXI', 0, 2);
      }

      if (enemy.blinker && Math.floor(enemy.blinkerTimer * 6) % 2 === 0) {
        ctx.fillStyle = '#f59e0b';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 8;
        if (enemy.blinker === 'left') {
          ctx.fillRect(-hw - 1, hh - 4, 4, 4);
          ctx.fillRect(-hw - 1, -hh, 4, 4);
        } else {
          ctx.fillRect(hw - 3, hh - 4, 4, 4);
          ctx.fillRect(hw - 3, -hh, 4, 4);
        }
        ctx.shadowBlur = 0;
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-hw + 4, hh - 2, 6, 2);
      ctx.fillRect(hw - 10, hh - 2, 6, 2);

      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-hw + 4, -hh, 6, 2);
      ctx.fillRect(hw - 10, -hh, 6, 2);
    }

    ctx.restore();
  }

  public renderPickups(pickups: Pickup[], showLabels: boolean = false) {
    const ctx = this.ctx;

    for (const p of pickups) {
      if (p.collected) continue;
      ctx.save();
      const floatY = p.y + Math.sin(p.bobTimer * 4) * 5;
      ctx.translate(p.x, floatY);

      if (p.type === 'speed_boost') {
        // Golden Speed Boost lightning bolt in energy ring
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 14;

        // Outer pulsing ring
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.stroke();

        // Inner glowing medallion
        ctx.fillStyle = 'rgba(245, 158, 11, 0.35)';
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fill();

        // Lightning icon
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(2, -10);
        ctx.lineTo(-6, 1);
        ctx.lineTo(-1, 1);
        ctx.lineTo(-3, 10);
        ctx.lineTo(6, -2);
        ctx.lineTo(1, -2);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
      } else if (p.type === 'shield') {
        // Iridescent Cyan/Violet Shield Orb
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 16;

        // Outer forcefield sphere
        const orbGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, 16);
        orbGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        orbGrad.addColorStop(0.4, 'rgba(6, 182, 212, 0.7)');
        orbGrad.addColorStop(1, 'rgba(147, 51, 234, 0.4)');

        ctx.fillStyle = orbGrad;
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Shield crest symbol
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.lineTo(7, -7);
        ctx.lineTo(6, 2);
        ctx.quadraticCurveTo(4, 7, 0, 10);
        ctx.quadraticCurveTo(-4, 7, -6, 2);
        ctx.lineTo(-7, -7);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#0e7490';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else if (p.type === 'coin') {
        const scaleX = Math.cos(p.bobTimer * 5);
        ctx.scale(scaleX, 1);

        ctx.fillStyle = '#f59e0b';
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, 0, p.width / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(0, 0, p.width / 2 - 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -5);
        ctx.lineTo(0, 5);
        ctx.moveTo(-5, 0);
        ctx.lineTo(5, 0);
        ctx.stroke();
      } else if (p.type === 'nitro') {
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 12;

        ctx.fillStyle = '#06b6d4';
        ctx.beginPath();
        ctx.roundRect(-8, -12, 16, 24, 4);
        ctx.fill();

        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(-4, -16, 8, 4);

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(1, -7);
        ctx.lineTo(-4, 1);
        ctx.lineTo(-1, 1);
        ctx.lineTo(-2, 7);
        ctx.lineTo(4, -2);
        ctx.lineTo(1, -2);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
      } else if (p.type === 'repair') {
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 12;

        ctx.fillStyle = '#065f46';
        ctx.beginPath();
        ctx.roundRect(-10, -10, 20, 20, 4);
        ctx.fill();

        ctx.fillStyle = '#34d399';
        ctx.fillRect(-7, -2, 14, 4);
        ctx.fillRect(-2, -7, 4, 14);
        ctx.shadowBlur = 0;
      }

      if (showLabels) {
        const label = {
          coin: 'COIN',
          nitro: 'NITRO',
          repair: 'FIX',
          speed_boost: 'BOOST',
          shield: 'SHIELD',
        }[p.type];
        ctx.fillStyle = 'rgba(2, 6, 23, 0.88)';
        ctx.beginPath();
        ctx.roundRect(-20, 19, 40, 13, 4);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, 0, 25.5);
      }

      ctx.restore();
    }
  }

  public renderParticles(particles: Particle[]) {
    const ctx = this.ctx;

    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;

      if (p.type === 'smoke') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'spark' || p.type === 'flame') {
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'shield_shockwave') {
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 12;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.type === 'debris') {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation || 0);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      }
      ctx.restore();
    }
  }

  public renderFloatingTexts(texts: FloatingText[]) {
    const ctx = this.ctx;

    for (const t of texts) {
      const alpha = t.life / t.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(t.x, t.y);
      ctx.scale(t.scale, t.scale);

      ctx.font = `900 ${t.size}px "Archivo", "Outfit", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 4;
      ctx.strokeText(t.text, 0, 0);

      ctx.fillStyle = t.color;
      ctx.fillText(t.text, 0, 0);

      ctx.restore();
    }
  }
}
