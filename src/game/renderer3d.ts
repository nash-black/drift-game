import * as THREE from 'three';
import { CAR_SKINS } from './renderer';
import {
  CarSkin,
  FloatingText,
  Particle,
  Pickup,
  RoadsideObject,
  SkidMark,
  TimeOfDay,
  Vehicle,
} from './types';

const ROAD_WIDTH = 12;
const PIXEL_TO_WORLD = 0.12;
export const JUNCTION_SPACING = 560;
const TRACK_SAMPLES = 120;
const TRACK_LENGTH = 240;

interface RouteTurn {
  distance: number;
  direction: -1 | 0 | 1;
}

export class GameRenderer {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(54, 1, 0.1, 500);
  private readonly roadBounds = { x: 0, width: 420, laneWidth: 105, leftKerb: 0, rightKerb: 420 };
  private readonly world = new THREE.Group();
  private readonly vehicles = new Map<number, THREE.Group>();
  private readonly pickups = new Map<number, THREE.Group>();
  private readonly scenery = new Map<number, THREE.Group>();
  private readonly pickupLabels = new Map<number, THREE.Sprite>();
  private readonly floatingLabels = new Map<number, THREE.Sprite>();
  private readonly activeVehicleIds = new Set<number>();
  private readonly routeTurns: RouteTurn[] = [];
  private readonly laneMarkers: THREE.Mesh[] = [];
  private readonly kerbs: THREE.Mesh[] = [];
  private readonly particles: THREE.Mesh[] = [];
  private readonly skidMeshes: THREE.Mesh[] = [];
  private readonly roadGeometry = this.createRibbonGeometry(TRACK_SAMPLES);
  private readonly shoulderGeometries = [
    this.createRibbonGeometry(TRACK_SAMPLES),
    this.createRibbonGeometry(TRACK_SAMPLES),
  ];
  private readonly forkGeometries = [
    this.createRibbonGeometry(50),
    this.createRibbonGeometry(50),
  ];
  private readonly road = new THREE.Mesh(this.roadGeometry, this.material('#263244', 0.15, 0.82));
  private readonly shoulders = this.shoulderGeometries.map(
    (geometry) => new THREE.Mesh(geometry, this.material('#6b7280', 0.18, 0.8))
  );
  private readonly forks = this.forkGeometries.map(
    (geometry) => new THREE.Mesh(geometry, this.material('#343c4b', 0.08, 0.9))
  );
  private readonly carShadowMaterial = new THREE.MeshBasicMaterial({
    color: '#020617',
    transparent: true,
    opacity: 0.45,
  });
  private readonly particleMaterial = new THREE.MeshBasicMaterial({
    color: '#fbbf24',
    transparent: true,
    opacity: 0.8,
  });
  private readonly pixelRatio = Math.min(window.devicePixelRatio || 1, 1.75);
  private width = 800;
  private height = 900;
  private roadX = 0;
  private roadWidth = 420;
  private currentProgress = 0;
  private currentPlayerX = 0;
  private playerY = 720;
  private timeOfDay: TimeOfDay = 'day';
  private cameraShake = 0;
  private reducedMotion = false;
  private junctionDistance = 0;
  private readonly ground: THREE.Mesh;
  private readonly skyLight: THREE.HemisphereLight;
  private readonly sunLight: THREE.DirectionalLight;
  private readonly playerModel: THREE.Group;
  private readonly playerShadow: THREE.Mesh;
  private readonly shield: THREE.Mesh;
  private readonly exhaust: THREE.Mesh;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.shadowMap.enabled = false;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.scene.add(this.world);

    this.ground = new THREE.Mesh(
      new THREE.PlaneGeometry(600, 600),
      this.material('#164a36', 0, 1)
    );
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = -0.22;
    this.ground.receiveShadow = true;
    this.world.add(this.ground);

    this.skyLight = new THREE.HemisphereLight('#dbeafe', '#31503c', 2.05);
    this.world.add(this.skyLight);
    this.sunLight = new THREE.DirectionalLight('#fff1cf', 3.1);
    this.sunLight.position.set(-18, 30, 8);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(1024, 1024);
    this.sunLight.shadow.camera.left = -30;
    this.sunLight.shadow.camera.right = 30;
    this.sunLight.shadow.camera.top = 60;
    this.sunLight.shadow.camera.bottom = -20;
    this.sunLight.shadow.bias = -0.0002;
    this.world.add(this.sunLight);

    this.road.receiveShadow = true;
    this.shoulders.forEach((shoulder) => {
      shoulder.receiveShadow = true;
    });
    this.world.add(this.road, ...this.shoulders, ...this.forks);

    this.createRoadDetails();
    this.playerModel = this.createCarModel(CAR_SKINS[0].primary, CAR_SKINS[0].secondary, CAR_SKINS[0].accent, 1, 1);
    this.playerModel.traverse((node) => {
      if (node instanceof THREE.Mesh) node.castShadow = true;
    });
    this.playerShadow = this.createShadow(2.5, 4.3);
    this.playerShadow.position.y = -0.12;
    this.playerModel.add(this.playerShadow);

    this.shield = new THREE.Mesh(
      new THREE.SphereGeometry(2.55, 24, 16),
      new THREE.MeshStandardMaterial({
        color: '#38bdf8',
        emissive: '#0284c7',
        emissiveIntensity: 0.35,
        transparent: true,
        opacity: 0.18,
        roughness: 0.15,
        metalness: 0.25,
      })
    );
    this.shield.position.y = 1.3;
    this.shield.visible = false;
    this.playerModel.add(this.shield);

    this.exhaust = new THREE.Mesh(
      new THREE.ConeGeometry(0.28, 1.9, 8),
      new THREE.MeshBasicMaterial({ color: '#22d3ee', transparent: true, opacity: 0.8 })
    );
    this.exhaust.rotation.x = Math.PI / 2;
    this.exhaust.position.set(0, 0.3, 2.7);
    this.exhaust.visible = false;
    this.playerModel.add(this.exhaust);
    this.world.add(this.playerModel);

    this.resize();
  }

  public setDimensions(width: number, height: number, roadWidth = 420) {
    this.width = width;
    this.height = height;
    this.roadWidth = Math.min(roadWidth, width * 0.88);
    this.roadX = (width - this.roadWidth) / 2;
    this.roadBounds.x = this.roadX;
    this.roadBounds.width = this.roadWidth;
    this.roadBounds.laneWidth = this.roadWidth / 4;
    this.roadBounds.leftKerb = this.roadX;
    this.roadBounds.rightKerb = this.roadX + this.roadWidth;
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  public getRoadBounds() {
    return this.roadBounds;
  }

  public setReducedMotion(reduced: boolean) {
    this.reducedMotion = reduced;
  }

  public setCameraShake(amount: number) {
    this.cameraShake = amount;
  }

  public addRouteTurn(direction: -1 | 0 | 1, progress: number) {
    if (direction === 0) return;
    this.routeTurns.push({ distance: progress, direction });
    if (this.routeTurns.length > 10) this.routeTurns.shift();
  }

  public resetRoutes() {
    this.routeTurns.length = 0;
  }

  public renderEnvironment(
    roadOffset: number,
    timeOfDay: TimeOfDay,
    roadsideObjects: RoadsideObject[],
    skidMarks: SkidMark[],
    junctionDistance = 0
  ) {
    this.currentProgress = roadOffset * PIXEL_TO_WORLD;
    this.timeOfDay = timeOfDay;
    this.junctionDistance = junctionDistance;
    this.updateLighting(timeOfDay);
    this.updateTrack();
    this.updateJunctionForks();
    this.updateLaneMarkers();
    this.updateKerbs();
    this.updateRoadsideObjects(roadsideObjects);
    this.updateSkidMarks(skidMarks);
  }

  public renderPlayerCar(
    player: Vehicle,
    skin: CarSkin,
    isBoosting: boolean,
    isBraking: boolean,
    _timeOfDay: TimeOfDay,
    shieldActive = false,
    speedBoostActive = false
  ) {
    const position = this.toWorldPosition(player.x, player.y);
    this.currentPlayerX = position.x;
    this.playerY = player.y;
    this.playerModel.position.set(position.x, 0, position.z);
    this.playerModel.rotation.y = -player.angle;
    this.updatePlayerPaint(skin);
    this.shield.visible = shieldActive;
    this.exhaust.visible = isBoosting || speedBoostActive;
    const exhaustMaterial = this.exhaust.material as THREE.MeshBasicMaterial;
    exhaustMaterial.color.set(speedBoostActive ? '#fbbf24' : '#22d3ee');
    exhaustMaterial.opacity = 0.75 + Math.sin(performance.now() * 0.025) * 0.2;
    this.exhaust.scale.setScalar(speedBoostActive ? 1.4 : 1);
    this.playerModel.userData.braking = isBraking;
  }

  public renderEnemyCar(enemy: Vehicle, _timeOfDay: TimeOfDay) {
    this.activeVehicleIds.add(enemy.id);
    let model = this.vehicles.get(enemy.id);
    if (!model) {
      model = this.createCarModel(enemy.color, enemy.secondaryColor, this.getAccent(enemy.type), enemy.width / 44, enemy.height / 82);
      model.traverse((node) => {
        if (node instanceof THREE.Mesh) node.castShadow = true;
      });
      this.world.add(model);
      this.vehicles.set(enemy.id, model);
    }

    const position = this.toWorldPosition(enemy.x, enemy.y);
    model.position.set(position.x, enemy.isBlasted ? 0.45 : 0, position.z);
    model.rotation.y = -enemy.angle;
    model.rotation.z = enemy.blastRot ?? 0;
    model.visible = Math.abs(position.z) < 225;
    model.userData.sirenTimer = enemy.sirenTimer;
    model.userData.vehicleType = enemy.type;
  }

  public renderPickups(pickups: Pickup[], showLabels = false) {
    const activeIds = new Set<number>();
    for (const pickup of pickups) {
      if (pickup.collected) continue;
      activeIds.add(pickup.id);
      let group = this.pickups.get(pickup.id);
      if (!group) {
        group = this.createPickup(pickup.type);
        this.world.add(group);
        this.pickups.set(pickup.id, group);
      }

      const position = this.toWorldPosition(pickup.x, pickup.y);
      group.position.set(position.x, 1.05, position.z);
      group.rotation.y = this.reducedMotion ? 0 : pickup.bobTimer * 1.2;
      group.position.y = 1.05 + (this.reducedMotion ? 0 : Math.sin(pickup.bobTimer * 4) * 0.18);
      group.visible = Math.abs(position.z) < 225;
      this.updatePickupLabel(pickup.id, pickup.type, showLabels, position);
    }
    this.removeInactive(this.pickups, activeIds);
    if (showLabels) {
      this.removeInactive(this.pickupLabels, activeIds);
    } else {
      for (const [id, label] of this.pickupLabels) {
        this.world.remove(label);
        label.material.dispose();
        label.material.map?.dispose();
        this.pickupLabels.delete(id);
      }
    }
  }

  public renderParticles(particles: Particle[]) {
    for (let i = 0; i < this.particles.length; i++) this.particles[i].visible = false;
    particles.slice(0, 90).forEach((particle, index) => {
      let mesh = this.particles[index];
      if (!mesh) {
        mesh = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5), this.particleMaterial);
        this.world.add(mesh);
        this.particles.push(mesh);
      }
      const position = this.toWorldPosition(particle.x, particle.y);
      mesh.position.set(position.x, particle.type === 'debris' ? 0.35 : 0.15, position.z);
      mesh.scale.setScalar(Math.max(0.05, particle.size * 0.025));
      mesh.visible = particle.life > 0 && Math.abs(position.z) < 220;
      if (mesh.material instanceof THREE.MeshBasicMaterial) {
        mesh.material.opacity = Math.max(0.1, particle.alpha);
        mesh.material.color.set(particle.color.startsWith('#') ? particle.color : '#cbd5e1');
      }
    });
  }

  public renderFloatingTexts(texts: FloatingText[]) {
    for (const [index, item] of texts.entries()) {
      let sprite = this.floatingLabels.get(item.id);
      if (!sprite) {
        sprite = this.createTextSprite(item.text, item.color);
        this.world.add(sprite);
        this.floatingLabels.set(item.id, sprite);
      }
      const position = this.toWorldPosition(item.x, item.y);
      sprite.position.set(position.x, 3.5 + index * 0.35, position.z);
      sprite.material.opacity = Math.max(0, item.life / item.maxLife);
      sprite.visible = Math.abs(position.z) < 220;
    }

    const activeTextIds = new Set(texts.map((item) => item.id));
    for (const [id, sprite] of this.floatingLabels) {
      if (!activeTextIds.has(id)) {
        this.world.remove(sprite);
        sprite.material.dispose();
        sprite.material.map?.dispose();
        this.floatingLabels.delete(id);
      }
    }

    this.removeInactive(this.vehicles, this.activeVehicleIds);
    this.activeVehicleIds.clear();
    this.updateCamera();
    this.renderer.render(this.scene, this.camera);
  }

  public dispose() {
    this.scene.traverse((object) => {
      if (object instanceof THREE.Sprite) {
        object.material.map?.dispose();
        object.material.dispose();
      } else if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      }
    });
    this.renderer.dispose();
  }

  private resize() {
    this.setDimensions(this.width, this.height, this.roadWidth);
  }

  private createRoadDetails() {
    const laneMaterial = new THREE.MeshStandardMaterial({
      color: '#d9e3ed',
      emissive: '#64748b',
      emissiveIntensity: 0.18,
      roughness: 0.85,
    });
    for (let i = 0; i < 36; i++) {
      const marker = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.025, 5.5), laneMaterial);
      marker.receiveShadow = true;
      this.world.add(marker);
      this.laneMarkers.push(marker);
    }

    for (let i = 0; i < 28; i++) {
      const kerb = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.09, 8),
        new THREE.MeshStandardMaterial({
          color: i % 2 === 0 ? '#e43b46' : '#f8fafc',
          roughness: 0.8,
        })
      );
      kerb.position.y = 0.045;
      kerb.receiveShadow = true;
      this.world.add(kerb);
      this.kerbs.push(kerb);
    }
  }

  private createRibbonGeometry(segments: number): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array((segments + 1) * 2 * 3);
    const indices: number[] = [];
    for (let i = 0; i < segments; i++) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }

  private updateTrack() {
    const centerNow = this.trackCenterAt(this.currentProgress);
    this.writeTrackRibbon(this.roadGeometry, TRACK_SAMPLES, (index) => {
      const z = 10 - (index / TRACK_SAMPLES) * TRACK_LENGTH;
      const center = this.trackCenterAt(this.currentProgress - z) - centerNow;
      return { center, z };
    }, -ROAD_WIDTH / 2, ROAD_WIDTH / 2, 0);

    const sample = (index: number) => {
      const z = 10 - (index / TRACK_SAMPLES) * TRACK_LENGTH;
      const center = this.trackCenterAt(this.currentProgress - z) - centerNow;
      return { center, z };
    };
    this.writeTrackRibbon(this.shoulderGeometries[0], TRACK_SAMPLES, sample, -ROAD_WIDTH / 2 - 2.8, -ROAD_WIDTH / 2, -0.02);
    this.writeTrackRibbon(this.shoulderGeometries[1], TRACK_SAMPLES, sample, ROAD_WIDTH / 2, ROAD_WIDTH / 2 + 2.8, -0.02);

    const roadColor = this.timeOfDay === 'night' ? '#171c27' : this.timeOfDay === 'sunset' ? '#292633' : '#263244';
    const shoulderColor = this.timeOfDay === 'night' ? '#3d4655' : '#7b8795';
    (this.road.material as THREE.MeshStandardMaterial).color.set(roadColor);
    this.shoulders.forEach((shoulder) => {
      (shoulder.material as THREE.MeshStandardMaterial).color.set(shoulderColor);
    });
  }

  private writeTrackRibbon(
    geometry: THREE.BufferGeometry,
    segments: number,
    sample: (index: number) => { center: number; z: number },
    left: number,
    right: number,
    y: number
  ) {
    const position = geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i <= segments; i++) {
      const { center, z } = sample(i);
      position.setXYZ(i * 2, center + left, y, z);
      position.setXYZ(i * 2 + 1, center + right, y, z);
    }
    position.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  private updateJunctionForks() {
    const centerNow = this.trackCenterAt(this.currentProgress);
    const nextJunction = Math.ceil((this.currentProgress + 4) / JUNCTION_SPACING) * JUNCTION_SPACING;
    const junctionZ = this.currentProgress - nextJunction;
    const visible =
      this.junctionDistance > 8 &&
      this.junctionDistance < TRACK_LENGTH - 10 &&
      junctionZ < -8 &&
      junctionZ > -TRACK_LENGTH + 10;

    this.forks.forEach((mesh, branchIndex) => {
      mesh.visible = visible;
      if (!visible) return;
      const direction = branchIndex === 0 ? -1 : 1;
      const geometry = this.forkGeometries[branchIndex];
      const position = geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i <= 50; i++) {
        const distance = i * 1.6;
        const z = junctionZ - distance;
        const progress = this.currentProgress - z;
        const center = this.trackCenterAt(progress) - centerNow;
        const spread = 2.6 + distance * 0.19;
        const branchCenter = center + direction * spread;
        position.setXYZ(i * 2, branchCenter - 3.5, 0.015, z);
        position.setXYZ(i * 2 + 1, branchCenter + 3.5, 0.015, z);
      }
      position.needsUpdate = true;
      geometry.computeVertexNormals();
    });
  }

  private updateLaneMarkers() {
    let markerIndex = 0;
    const centerNow = this.trackCenterAt(this.currentProgress);
    for (let dash = 0; dash < 12; dash++) {
      const z = -7 - dash * 16;
      const pathOffset = this.trackCenterAt(this.currentProgress - z) - centerNow;
      for (let lane = 1; lane < 4; lane++) {
        const marker = this.laneMarkers[markerIndex++];
        marker.position.set(pathOffset + (lane - 2) * 3, 0.025, z);
        marker.visible = z > -TRACK_LENGTH;
      }
    }
  }

  private updateKerbs() {
    const centerNow = this.trackCenterAt(this.currentProgress);
    for (let i = 0; i < 14; i++) {
      const z = -4 - i * 16;
      const pathOffset = this.trackCenterAt(this.currentProgress - z) - centerNow;
      for (let side = 0; side < 2; side++) {
        const kerb = this.kerbs[i * 2 + side];
        const direction = side === 0 ? -1 : 1;
        kerb.position.x = pathOffset + direction * (ROAD_WIDTH / 2 - 0.22);
        kerb.position.z = z;
      }
    }
  }

  private updateRoadsideObjects(objects: RoadsideObject[]) {
    const active = new Set<number>();
    for (const object of objects) {
      active.add(object.id);
      let group = this.scenery.get(object.id);
      if (!group) {
        group = this.createSceneryObject(object.type);
        this.world.add(group);
        this.scenery.set(object.id, group);
      }
      const z = (object.y - this.playerY) * PIXEL_TO_WORLD;
      const progress = this.currentProgress - z;
      const curveOffset = this.trackCenterAt(progress) - this.trackCenterAt(this.currentProgress);
      const side = object.side === 'left' ? -1 : 1;
      group.position.set(curveOffset + side * (ROAD_WIDTH / 2 + 5.3), 0, z);
      group.visible = Math.abs(z) < TRACK_LENGTH;
    }
    this.removeInactive(this.scenery, active);
  }

  private updateSkidMarks(marks: SkidMark[]) {
    while (this.skidMeshes.length < marks.length) {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(0.42, 2.1),
        new THREE.MeshBasicMaterial({ color: '#111827', transparent: true, opacity: 0.34 })
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = 0.035;
      this.world.add(mesh);
      this.skidMeshes.push(mesh);
    }
    this.skidMeshes.forEach((mesh, index) => {
      const mark = marks[index];
      if (!mark) {
        mesh.visible = false;
        return;
      }
      const position = this.toWorldPosition(mark.x, mark.y);
      mesh.position.set(position.x, 0.035, position.z);
      mesh.visible = Math.abs(position.z) < 100;
      if (mesh.material instanceof THREE.MeshBasicMaterial) mesh.material.opacity = mark.alpha * 0.34;
    });
  }

  private updateLighting(timeOfDay: TimeOfDay) {
    const palettes = {
      day: { sky: '#8ac8ef', fog: '#9dc7d7', hemi: '#dbeafe', ground: '#315b3b', intensity: 3.1 },
      sunset: { sky: '#8d5360', fog: '#8a6671', hemi: '#ffc28f', ground: '#44323b', intensity: 2.1 },
      night: { sky: '#080f20', fog: '#101827', hemi: '#596c9a', ground: '#15271f', intensity: 0.95 },
    };
    const palette = palettes[timeOfDay];
    if (this.scene.background instanceof THREE.Color) this.scene.background.set(palette.sky);
    else this.scene.background = new THREE.Color(palette.sky);
    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.color.set(palette.fog);
      this.scene.fog.near = 55;
      this.scene.fog.far = 235;
    } else {
      this.scene.fog = new THREE.Fog(palette.fog, 55, 235);
    }
    this.skyLight.color.set(palette.hemi);
    this.skyLight.intensity = timeOfDay === 'night' ? 1.0 : 1.7;
    this.skyLight.groundColor.set(palette.ground);
    this.sunLight.intensity = palette.intensity;
    this.sunLight.color.set(timeOfDay === 'night' ? '#9eb6ff' : timeOfDay === 'sunset' ? '#ffae8a' : '#fff1cf');
    (this.ground.material as THREE.MeshStandardMaterial).color.set(timeOfDay === 'night' ? '#101d23' : palette.ground);
  }

  private updateCamera() {
    const curveCenter = this.trackCenterAt(this.currentProgress);
    const focusX = this.currentPlayerX * 0.35 + curveCenter * 0.65;
    const shake = this.reducedMotion ? 0 : this.cameraShake * 0.025;
    this.camera.position.set(focusX + (Math.random() - 0.5) * shake, 7.2 + shake, 13.5);
    this.camera.lookAt(focusX, 0.8, -34);
    this.renderer.render(this.scene, this.camera);
  }

  private toWorldPosition(x: number, y: number) {
    const lateral = ((x - this.roadX) / this.roadWidth - 0.5) * ROAD_WIDTH;
    const z = (y - this.playerY) * PIXEL_TO_WORLD;
    const progress = this.currentProgress - z;
    const pathOffset = this.trackCenterAt(progress) - this.trackCenterAt(this.currentProgress);
    return { x: lateral + pathOffset, z };
  }

  private trackCenterAt(progress: number): number {
    let center = Math.sin(progress / 145) * 10 + Math.sin(progress / 390) * 8;
    for (const turn of this.routeTurns) {
      const progressAfterTurn = progress - turn.distance;
      if (progressAfterTurn > 0) {
        const eased = Math.min(1, progressAfterTurn / 65);
        center += turn.direction * 16 * eased;
      }
    }
    return center;
  }

  private createCarModel(primary: string, secondary: string, accent: string, widthScale: number, lengthScale: number) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 0.68, 3.9),
      this.material(primary, 0.45, 0.32)
    );
    body.position.y = 0.63;
    group.add(body);

    const hood = new THREE.Mesh(
      new THREE.BoxGeometry(1.62, 0.17, 1.28),
      this.material(accent, 0.2, 0.38, 0.09)
    );
    hood.position.set(0, 1.01, -1.05);
    group.add(hood);

    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.35, 0.66, 1.76),
      this.material(secondary, 0.2, 0.28)
    );
    cabin.position.set(0, 1.18, -0.05);
    group.add(cabin);

    const windshield = new THREE.Mesh(
      new THREE.BoxGeometry(1.18, 0.08, 0.48),
      new THREE.MeshStandardMaterial({ color: '#a5dcf4', metalness: 0.2, roughness: 0.16, transparent: true, opacity: 0.75 })
    );
    windshield.position.set(0, 1.54, -0.6);
    group.add(windshield);

    const wheelGeometry = new THREE.CylinderGeometry(0.39, 0.39, 0.25, 12);
    const wheelMaterial = this.material('#111827', 0.03, 0.88);
    for (const x of [-0.98, 0.98]) {
      for (const z of [-1.25, 1.25]) {
        const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, 0.38, z);
        group.add(wheel);
      }
    }

    const headlightMaterial = new THREE.MeshBasicMaterial({ color: '#dff6ff' });
    for (const x of [-0.68, 0.68]) {
      const light = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.07), headlightMaterial);
      light.position.set(x, 0.78, -1.98);
      group.add(light);
      const tail = new THREE.Mesh(
        new THREE.BoxGeometry(0.38, 0.12, 0.08),
        new THREE.MeshBasicMaterial({ color: '#fb344d' })
      );
      tail.position.set(x, 0.75, 1.98);
      group.add(tail);
    }

    const shadow = this.createShadow(2.15, 4.2);
    shadow.position.y = 0.02;
    group.add(shadow);
    group.scale.set(widthScale, 1, lengthScale);
    return group;
  }

  private updatePlayerPaint(skin: CarSkin) {
    const body = this.playerModel.children[0];
    if (body instanceof THREE.Mesh && body.material instanceof THREE.MeshStandardMaterial) {
      body.material.color.set(skin.primary);
      body.material.emissive.set(skin.primary);
    }
    const cabin = this.playerModel.children[2];
    if (cabin instanceof THREE.Mesh && cabin.material instanceof THREE.MeshStandardMaterial) cabin.material.color.set(skin.secondary);
    const hood = this.playerModel.children[1];
    if (hood instanceof THREE.Mesh && hood.material instanceof THREE.MeshStandardMaterial) hood.material.color.set(skin.accent);
  }

  private createPickup(type: Pickup['type']): THREE.Group {
    const group = new THREE.Group();
    const palette = {
      coin: '#fbbf24',
      nitro: '#22d3ee',
      repair: '#34d399',
      speed_boost: '#f59e0b',
      shield: '#38bdf8',
    };
    const color = palette[type];
    if (type === 'coin') {
      const coin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.56, 0.56, 0.14, 24),
        new THREE.MeshStandardMaterial({ color, metalness: 0.85, roughness: 0.22, emissive: '#b7791f', emissiveIntensity: 0.3 })
      );
      coin.rotation.x = Math.PI / 2;
      group.add(coin);
    } else {
      const geometry =
        type === 'shield' ? new THREE.IcosahedronGeometry(0.7, 1) :
        type === 'repair' ? new THREE.BoxGeometry(0.9, 0.9, 0.9) :
        new THREE.OctahedronGeometry(0.72, 0);
      const material = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.45, metalness: 0.55, roughness: 0.25 });
      group.add(new THREE.Mesh(geometry, material));
    }
    const glow = new THREE.Mesh(
      new THREE.TorusGeometry(0.88, 0.055, 8, 24),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.82 })
    );
    group.add(glow);
    return group;
  }

  private createSceneryObject(type: RoadsideObject['type']): THREE.Group {
    const group = new THREE.Group();
    if (type === 'palm') {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.3, 3.4, 8), this.material('#865331', 0, 1));
      trunk.position.y = 1.7;
      group.add(trunk);
      const leaves = new THREE.Mesh(
        new THREE.ConeGeometry(1.8, 1.5, 7),
        this.material(this.timeOfDay === 'night' ? '#0d5944' : '#228447', 0, 1)
      );
      leaves.position.y = 3.35;
      leaves.rotation.y = Math.PI / 4;
      group.add(leaves);
      return group;
    }

    if (type === 'lamp') {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 6, 8), this.material('#607080', 0.45, 0.55));
      pole.position.y = 3;
      group.add(pole);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.08), this.material('#7d8b99', 0.45, 0.55));
      arm.position.set(0.7, 5.7, 0);
      group.add(arm);
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.26, 10, 8),
        new THREE.MeshBasicMaterial({ color: this.timeOfDay === 'night' ? '#fff1a8' : '#dbeafe' })
      );
      bulb.position.set(1.42, 5.65, 0);
      group.add(bulb);
      return group;
    }

    const sign = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.1, 0.15), this.material('#08715b', 0.1, 0.5));
    sign.position.y = 3.1;
    group.add(sign);
    const support = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 3, 8), this.material('#94a3b8', 0.35, 0.6));
    support.position.y = 1.5;
    group.add(support);
    return group;
  }

  private createShadow(width: number, length: number): THREE.Mesh {
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(width, length), this.carShadowMaterial);
    shadow.rotation.x = -Math.PI / 2;
    shadow.renderOrder = 2;
    return shadow;
  }

  private createTextSprite(text: string, color: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Unable to create the 3D text canvas.');
    context.font = '900 44px Arial, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.lineWidth = 10;
    context.strokeStyle = '#020617';
    context.strokeText(text, 256, 64);
    context.fillStyle = color;
    context.fillText(text, 256, 64);
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(12, 3, 1);
    return sprite;
  }

  private updatePickupLabel(id: number, type: Pickup['type'], show: boolean, position: { x: number; z: number }) {
    let sprite = this.pickupLabels.get(id);
    if (!show) {
      if (sprite) {
        this.world.remove(sprite);
        sprite.material.dispose();
        sprite.material.map?.dispose();
        this.pickupLabels.delete(id);
      }
      return;
    }
    if (!sprite) {
      const name = { coin: 'COIN', nitro: 'NITRO', repair: 'REPAIR', speed_boost: 'BOOST', shield: 'SHIELD' }[type];
      sprite = this.createTextSprite(name, '#ffffff');
      sprite.scale.set(4, 0.85, 1);
      this.world.add(sprite);
      this.pickupLabels.set(id, sprite);
    }
    sprite.position.set(position.x, 2.25, position.z);
    sprite.visible = Math.abs(position.z) < TRACK_LENGTH;
  }

  private getAccent(type: Vehicle['type']): string {
    return type === 'police' ? '#f8fafc' : type === 'taxi' ? '#18181b' : '#e2e8f0';
  }

  private material(color: THREE.ColorRepresentation, metalness: number, roughness: number, emissiveIntensity = 0) {
    return new THREE.MeshStandardMaterial({
      color,
      metalness,
      roughness,
      emissive: color,
      emissiveIntensity,
    });
  }

  private removeInactive<T extends THREE.Object3D>(items: Map<number, T>, active: Set<number>) {
    for (const [id, object] of items) {
      if (active.has(id)) continue;
      this.world.remove(object);
      object.traverse((child) => {
        if (child instanceof THREE.Sprite) {
          child.material.map?.dispose();
          child.material.dispose();
        } else if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
          child.geometry.dispose();
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach((material) => material.dispose());
        }
      });
      items.delete(id);
    }
  }
}
