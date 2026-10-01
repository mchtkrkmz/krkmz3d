import * as THREE from 'three';
import { Card, RoomPlayer, Suit } from '../types';
import { getCardBackTexture, getCardFrontTexture, SUIT_NAMES_TR, SUIT_SYMBOLS } from '../game/cards';
import { soundEngine } from '../audio/soundManager';

export interface CardMeshUserData {
  card: Card;
  isPlayerCard: boolean;
  seatIndex: number;
  originalPos: THREE.Vector3;
  originalRot: THREE.Euler;
  isDragging?: boolean;
}

export class CardTableScene {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  private container: HTMLElement;

  // Scene elements
  private tableMesh!: THREE.Mesh;
  private cardMeshes: Map<string, THREE.Mesh> = new Map();
  private avatarGroups: Map<number, THREE.Group> = new Map();
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  // Hand tracking meshes
  private leftHandMeshGroup = new THREE.Group();
  private rightHandMeshGroup = new THREE.Group();

  // Selection & drag state
  private hoveredCard: THREE.Mesh | null = null;
  private draggedCard: THREE.Mesh | null = null;
  private dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.78);
  private dragIntersection = new THREE.Vector3();

  // Callbacks
  public onCardPlayRequested?: (card: Card) => void;

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0f1d);

    const width = container.clientWidth > 0 ? container.clientWidth : (window.innerWidth || 800);
    const height = container.clientHeight > 0 ? container.clientHeight : (window.innerHeight || 600);
    const aspect = width / height;
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.05, 50);
    // Position camera seated at South seat (seat 0)
    this.camera.position.set(0, 1.25, 0.88);
    this.camera.lookAt(0, 0.76, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.setupLighting();
    this.setupEnvironment();
    this.setupTable();
    this.setupTeaGlasses();
    this.setupHandVisualizers();
    this.setupEvents();
  }

  private setupLighting() {
    // Ambient warm tone
    const ambientLight = new THREE.AmbientLight(0xffecd2, 0.65);
    this.scene.add(ambientLight);

    // Warm overhead lamp directly over the center of the card table
    const tableSpot = new THREE.SpotLight(0xfff3e0, 2.2);
    tableSpot.position.set(0, 2.4, 0);
    tableSpot.target.position.set(0, 0.75, 0);
    tableSpot.angle = Math.PI / 3;
    tableSpot.penumbra = 0.5;
    tableSpot.castShadow = true;
    tableSpot.shadow.mapSize.width = 1024;
    tableSpot.shadow.mapSize.height = 1024;
    tableSpot.shadow.bias = -0.0005;
    this.scene.add(tableSpot);
    this.scene.add(tableSpot.target);

    // Soft rim backlight
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.45);
    rimLight.position.set(0, 3, -3);
    this.scene.add(rimLight);
  }

  private setupEnvironment() {
    // Floor: Dark wood parquet
    const floorGeo = new THREE.PlaneGeometry(12, 12);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x18120c,
      roughness: 0.85,
      metalness: 0.1,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Overhead hanging lamp shade fixture
    const shadeGeo = new THREE.ConeGeometry(0.35, 0.22, 24, 1, true);
    const shadeMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.6,
      roughness: 0.3,
      side: THREE.DoubleSide,
    });
    const lampShade = new THREE.Mesh(shadeGeo, shadeMat);
    lampShade.position.set(0, 2.3, 0);
    this.scene.add(lampShade);

    // Hanging cord
    const cordGeo = new THREE.CylinderGeometry(0.005, 0.005, 1.2, 8);
    const cordMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const cord = new THREE.Mesh(cordGeo, cordMat);
    cord.position.set(0, 2.9, 0);
    this.scene.add(cord);
  }

  private setupTable() {
    // Octagonal / Round Luxury Turkish Kahvehane Card Table
    const tableRadius = 0.82;
    const tableHeight = 0.74;

    // Green Baize / Felt Playing Surface
    const feltGeo = new THREE.CylinderGeometry(tableRadius, tableRadius, 0.04, 32);
    const feltMat = new THREE.MeshStandardMaterial({
      color: 0x064e3b, // Rich Turkish card felt green
      roughness: 0.9,
      metalness: 0.05,
    });
    this.tableMesh = new THREE.Mesh(feltGeo, feltMat);
    this.tableMesh.position.set(0, tableHeight, 0);
    this.tableMesh.receiveShadow = true;
    this.scene.add(this.tableMesh);

    // Mahogany Wood Outer Rim & Armrest
    const rimGeo = new THREE.TorusGeometry(tableRadius + 0.04, 0.065, 16, 48);
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x451a03, // Mahogany
      roughness: 0.4,
      metalness: 0.2,
    });
    const rimMesh = new THREE.Mesh(rimGeo, woodMat);
    rimMesh.rotation.x = Math.PI / 2;
    rimMesh.position.set(0, tableHeight + 0.015, 0);
    rimMesh.castShadow = true;
    rimMesh.receiveShadow = true;
    this.scene.add(rimMesh);

    // Brass Inlay Accent Ring
    const brassGeo = new THREE.TorusGeometry(tableRadius - 0.02, 0.008, 12, 48);
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.85,
      roughness: 0.2,
    });
    const brassRing = new THREE.Mesh(brassGeo, brassMat);
    brassRing.rotation.x = Math.PI / 2;
    brassRing.position.set(0, tableHeight + 0.021, 0);
    this.scene.add(brassRing);

    // Heavy Table Pedestal Base
    const baseGeo = new THREE.CylinderGeometry(0.12, 0.28, tableHeight, 24);
    const baseMesh = new THREE.Mesh(baseGeo, woodMat);
    baseMesh.position.set(0, tableHeight / 2, 0);
    baseMesh.castShadow = true;
    this.scene.add(baseMesh);
  }

  private setupTeaGlasses() {
    // Turkish Kahvehane signature "İnce Belli Çay Bardağı" for players
    const positions = [
      new THREE.Vector3(0.48, 0.77, 0.52), // South-East
      new THREE.Vector3(-0.52, 0.77, 0.45), // South-West
      new THREE.Vector3(0.52, 0.77, -0.45), // North-East
      new THREE.Vector3(-0.48, 0.77, -0.52), // North-West
    ];

    positions.forEach((pos) => {
      const teaGroup = new THREE.Group();
      teaGroup.position.copy(pos);

      // Red & White porcelain saucer (Çay tabağı)
      const saucerGeo = new THREE.CylinderGeometry(0.065, 0.045, 0.01, 20);
      const saucerMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
      const saucer = new THREE.Mesh(saucerGeo, saucerMat);
      saucer.receiveShadow = true;
      teaGroup.add(saucer);

      // Slim waist glass (İnce belli cam)
      const glassGeo = new THREE.CylinderGeometry(0.028, 0.02, 0.075, 16);
      const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        transmission: 0.9,
        opacity: 1,
        transparent: true,
        roughness: 0.05,
        ior: 1.5,
      });
      const glass = new THREE.Mesh(glassGeo, glassMat);
      glass.position.y = 0.04;
      teaGroup.add(glass);

      // Glowing Amber Tea liquid inside
      const teaGeo = new THREE.CylinderGeometry(0.025, 0.018, 0.055, 16);
      const teaMat = new THREE.MeshStandardMaterial({
        color: 0xb45309,
        emissive: 0x92400e,
        emissiveIntensity: 0.3,
        roughness: 0.2,
      });
      const tea = new THREE.Mesh(teaGeo, teaMat);
      tea.position.y = 0.033;
      teaGroup.add(tea);

      // Golden tea spoon
      const spoonGeo = new THREE.CylinderGeometry(0.002, 0.002, 0.09, 8);
      const spoonMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9, roughness: 0.2 });
      const spoon = new THREE.Mesh(spoonGeo, spoonMat);
      spoon.position.set(0.01, 0.05, 0);
      spoon.rotation.z = 0.25;
      teaGroup.add(spoon);

      this.scene.add(teaGroup);
    });
  }

  private setupHandVisualizers() {
    // Glowing XR joint indicators for Meta Quest 3 Hand Tracking
    const jointGeo = new THREE.SphereGeometry(0.012, 12, 12);
    const jointMatLeft = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x0891b2,
      emissiveIntensity: 0.8,
      roughness: 0.2,
    });
    const jointMatRight = new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      emissive: 0x9333ea,
      emissiveIntensity: 0.8,
      roughness: 0.2,
    });

    for (let i = 0; i < 5; i++) {
      const tipL = new THREE.Mesh(jointGeo, jointMatLeft);
      this.leftHandMeshGroup.add(tipL);
      const tipR = new THREE.Mesh(jointGeo, jointMatRight);
      this.rightHandMeshGroup.add(tipR);
    }

    this.leftHandMeshGroup.visible = false;
    this.rightHandMeshGroup.visible = false;
    this.scene.add(this.leftHandMeshGroup);
    this.scene.add(this.rightHandMeshGroup);
  }

  // Update XR hand poses from Quest 3
  public updateXRHandPoses(
    leftWrist?: [number, number, number],
    leftIndexTip?: [number, number, number],
    rightWrist?: [number, number, number],
    rightIndexTip?: [number, number, number]
  ) {
    if (leftWrist && leftIndexTip) {
      this.leftHandMeshGroup.visible = true;
      this.leftHandMeshGroup.children[0].position.set(leftWrist[0], leftWrist[1], leftWrist[2]);
      this.leftHandMeshGroup.children[1].position.set(leftIndexTip[0], leftIndexTip[1], leftIndexTip[2]);
    } else {
      this.leftHandMeshGroup.visible = false;
    }

    if (rightWrist && rightIndexTip) {
      this.rightHandMeshGroup.visible = true;
      this.rightHandMeshGroup.children[0].position.set(rightWrist[0], rightWrist[1], rightWrist[2]);
      this.rightHandMeshGroup.children[1].position.set(rightIndexTip[0], rightIndexTip[1], rightIndexTip[2]);
    } else {
      this.rightHandMeshGroup.visible = false;
    }
  }

  // Sync / create 3D avatars seated around the table
  public updateAvatars(players: RoomPlayer[], currentTurnSeat: number, trumpSuit?: Suit | 'none') {
    // 4 Seat positions around table:
    // 0: South (Z: +1.0)
    // 1: West (X: -1.0)
    // 2: North (Z: -1.0)
    // 3: East (X: +1.0)
    const seatConfigs = [
      { pos: new THREE.Vector3(0, 0.7, 1.05), rot: 0 },
      { pos: new THREE.Vector3(-1.05, 0.7, 0), rot: Math.PI / 2 },
      { pos: new THREE.Vector3(0, 0.7, -1.05), rot: Math.PI },
      { pos: new THREE.Vector3(1.05, 0.7, 0), rot: -Math.PI / 2 },
    ];

    players.forEach((player) => {
      const seat = player.seatIndex;
      const config = seatConfigs[seat];
      if (!config) return;

      let group = this.avatarGroups.get(seat);
      if (!group) {
        group = this.createAvatarMesh(player, config.pos, config.rot);
        this.avatarGroups.set(seat, group);
        this.scene.add(group);
      }

      // Update avatar head orientation & turn highlight
      const isTurn = seat === currentTurnSeat;
      const head = group.getObjectByName('head') as THREE.Mesh;
      const turnRing = group.getObjectByName('turnRing') as THREE.Mesh;
      const speakingHalo = group.getObjectByName('speakingHalo') as THREE.Mesh;
      const nameTag = group.getObjectByName('nameTag') as THREE.Mesh;

      if (turnRing) {
        turnRing.visible = isTurn;
        (turnRing.material as THREE.MeshBasicMaterial).color.setHex(isTurn ? 0xf59e0b : 0x334155);
      }

      if (speakingHalo) {
        speakingHalo.visible = !!player.isSpeaking;
      }

      if (nameTag) {
        // Redraw name canvas with score & batak bid
        this.updateNameTagTexture(nameTag, player, isTurn, trumpSuit);
      }

      // Remote player head pose synchronization from VR
      if (player.headPose && seat !== 0 && head) {
        head.rotation.set(player.headPose.rx * 0.5, player.headPose.ry * 0.5 + config.rot, player.headPose.rz * 0.5);
      }
    });

    // Clean up seats that left
    this.avatarGroups.forEach((group, seat) => {
      if (!players.some((p) => p.seatIndex === seat)) {
        this.scene.remove(group);
        this.avatarGroups.delete(seat);
      }
    });
  }

  private createAvatarMesh(player: RoomPlayer, pos: THREE.Vector3, rotY: number): THREE.Group {
    const group = new THREE.Group();
    group.position.copy(pos);
    group.rotation.y = rotY;

    // Chair
    const chairBackGeo = new THREE.BoxGeometry(0.44, 0.55, 0.05);
    const chairMat = new THREE.MeshStandardMaterial({ color: 0x312e81, roughness: 0.6 });
    const chairBack = new THREE.Mesh(chairBackGeo, chairMat);
    chairBack.position.set(0, 0.55, 0.25);
    chairBack.castShadow = true;
    group.add(chairBack);

    // Torso / Body
    const torsoGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.5, 16);
    const torsoMat = new THREE.MeshStandardMaterial({
      color: player.avatarColor || (player.seatIndex === 0 ? 0x2563eb : 0x059669),
      roughness: 0.5,
    });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.set(0, 0.38, 0.05);
    torso.castShadow = true;
    group.add(torso);

    // Head
    const headGeo = new THREE.SphereGeometry(0.13, 20, 20);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.6 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.name = 'head';
    head.position.set(0, 0.72, 0.02);
    head.castShadow = true;
    group.add(head);

    // Traditional Turkish Fez (Fes) / Stylish Hat
    if (player.avatarType === 'fez_pasha' || player.seatIndex % 2 === 0) {
      const fezGeo = new THREE.CylinderGeometry(0.08, 0.095, 0.12, 16);
      const fezMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.7 });
      const fez = new THREE.Mesh(fezGeo, fezMat);
      fez.position.set(0, 0.82, 0);

      // Tassel (Püskül)
      const tasselGeo = new THREE.CylinderGeometry(0.004, 0.008, 0.09, 8);
      const tasselMat = new THREE.MeshBasicMaterial({ color: 0x111827 });
      const tassel = new THREE.Mesh(tasselGeo, tasselMat);
      tassel.position.set(0.06, 0.79, 0.04);
      tassel.rotation.z = -0.5;
      group.add(fez);
      group.add(tassel);
    } else {
      // Modern gamer headset
      const bandGeo = new THREE.TorusGeometry(0.14, 0.015, 8, 24, Math.PI);
      const bandMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 });
      const band = new THREE.Mesh(bandGeo, bandMat);
      band.position.set(0, 0.72, 0.02);
      band.rotation.x = -Math.PI / 2;
      group.add(band);
    }

    // Turn indicator ring on the ground / chair
    const ringGeo = new THREE.RingGeometry(0.3, 0.34, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide });
    const turnRing = new THREE.Mesh(ringGeo, ringMat);
    turnRing.name = 'turnRing';
    turnRing.rotation.x = -Math.PI / 2;
    turnRing.position.set(0, 0.01, 0);
    turnRing.visible = false;
    group.add(turnRing);

    // Speaking audio halo
    const haloGeo = new THREE.RingGeometry(0.17, 0.19, 24);
    const haloMat = new THREE.MeshBasicMaterial({ color: 0x22c55e, side: THREE.DoubleSide, transparent: true, opacity: 0.7 });
    const speakingHalo = new THREE.Mesh(haloGeo, haloMat);
    speakingHalo.name = 'speakingHalo';
    speakingHalo.rotation.x = -Math.PI / 2;
    speakingHalo.position.set(0, 0.94, 0.02);
    speakingHalo.visible = false;
    group.add(speakingHalo);

    // Floating 3D Nameplate
    const namePlate = this.createNameTagMesh(player);
    namePlate.name = 'nameTag';
    namePlate.position.set(0, 1.05, 0);
    group.add(namePlate);

    return group;
  }

  private createNameTagMesh(player: RoomPlayer): THREE.Mesh {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 160;
    const texture = new THREE.CanvasTexture(canvas);

    const geo = new THREE.PlaneGeometry(0.38, 0.12);
    const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);

    this.renderNameTagCanvas(canvas, player, false);
    texture.needsUpdate = true;
    return mesh;
  }

  private updateNameTagTexture(mesh: THREE.Mesh, player: RoomPlayer, isTurn: boolean, trumpSuit?: Suit | 'none') {
    const mat = mesh.material as THREE.MeshBasicMaterial;
    if (mat.map && mat.map.image) {
      const canvas = mat.map.image as HTMLCanvasElement;
      this.renderNameTagCanvas(canvas, player, isTurn, trumpSuit);
      mat.map.needsUpdate = true;
    }
  }

  private renderNameTagCanvas(canvas: HTMLCanvasElement, player: RoomPlayer, isTurn: boolean, trumpSuit?: Suit | 'none') {
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Badge container with rounded corners
    ctx.fillStyle = isTurn ? 'rgba(15, 23, 42, 0.92)' : 'rgba(15, 23, 42, 0.78)';
    ctx.strokeStyle = isTurn ? '#f59e0b' : '#334155';
    ctx.lineWidth = isTurn ? 6 : 2;

    const r = 16;
    const w = canvas.width;
    const h = canvas.height;
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(w - r, 0);
    ctx.quadraticCurveTo(w, 0, w, r);
    ctx.lineTo(w, h - r);
    ctx.quadraticCurveTo(w, h, w - r, h);
    ctx.lineTo(r, h);
    ctx.quadraticCurveTo(0, h, 0, h - r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Player Name & Turn indicator
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    const tag = player.isBot ? '🤖 ' : '👤 ';
    ctx.fillText(`${tag}${player.name}`, w / 2, 48);

    // Score & Game Stats (Batak Bid or Pişti count)
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 26px sans-serif';
    let subtext = `Puan: ${player.score}`;
    if (player.hasBid) {
      subtext += player.bid > 0 ? ` | İhale: ${player.bid}` : ` | PAS`;
    }
    if (player.tricksWon > 0) {
      subtext += ` | El: ${player.tricksWon}`;
    }
    if (player.pistiCount > 0) {
      subtext += ` | Pişti: ${player.pistiCount}`;
    }
    if (trumpSuit && trumpSuit !== 'none' && player.hasBid && player.bid > 0) {
      subtext += ` (Koz: ${SUIT_SYMBOLS[trumpSuit]} ${SUIT_NAMES_TR[trumpSuit]})`;
    }
    ctx.fillText(subtext, w / 2, 95);

    // Action alert on turn
    if (isTurn) {
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText('• SIRA BU OYUNCUDA •', w / 2, 135);
    }
  }

  // Synchronize 3D Cards on the table and in player's hands
  public updateCards(
    playerHand: Card[],
    middleCards: Card[],
    otherPlayers: RoomPlayer[],
    localSeat: number = 0
  ) {
    const activeCardIds = new Set<string>();

    // 1. Local Player's Hand (Fan arrangement in front of camera)
    const handRadius = 0.44;
    const handCount = playerHand.length;
    const startAngle = -Math.PI / 16 * (handCount - 1);
    const stepAngle = handCount > 1 ? (Math.PI / 8) / (handCount - 1) : 0;

    playerHand.forEach((card, index) => {
      activeCardIds.add(card.id);
      const angle = startAngle + index * stepAngle;

      const targetX = Math.sin(angle) * handRadius;
      const targetZ = 0.54 - Math.cos(angle) * 0.06;
      const targetY = 0.86 + index * 0.0015; // slight stack bias
      const rotZ = -angle * 0.7;
      const rotX = -0.22; // Comfortable tilt facing player's eyes

      let mesh = this.cardMeshes.get(card.id);
      if (!mesh) {
        mesh = this.create3DCardMesh(card, true, localSeat);
        this.cardMeshes.set(card.id, mesh);
        this.scene.add(mesh);
        soundEngine.playCardDeal();
      }

      const ud = mesh.userData as CardMeshUserData;
      ud.isPlayerCard = true;
      ud.seatIndex = localSeat;
      ud.originalPos = new THREE.Vector3(targetX, targetY, targetZ);
      ud.originalRot = new THREE.Euler(rotX, 0, rotZ);

      if (!ud.isDragging) {
        mesh.position.lerp(ud.originalPos, 0.2);
        mesh.rotation.x = THREE.MathUtils.lerp(mesh.rotation.x, rotX, 0.2);
        mesh.rotation.y = THREE.MathUtils.lerp(mesh.rotation.y, 0, 0.2);
        mesh.rotation.z = THREE.MathUtils.lerp(mesh.rotation.z, rotZ, 0.2);
      }
    });

    // 2. Middle Pile Cards on the Table
    middleCards.forEach((card, index) => {
      activeCardIds.add(card.id);
      const targetY = 0.762 + index * 0.002;

      // Realistic slight random jitter per card for authentic kahvehane feel
      const seed = (card.rank * 17 + index * 31) % 100;
      const jitterX = ((seed % 10) - 5) * 0.006;
      const jitterZ = (((seed / 10) | 0) - 5) * 0.006;
      const jitterRotY = ((seed % 20) - 10) * 0.04;

      let mesh = this.cardMeshes.get(card.id);
      if (!mesh) {
        mesh = this.create3DCardMesh(card, false, -1);
        this.cardMeshes.set(card.id, mesh);
        this.scene.add(mesh);
        mesh.position.set(0, 1.1, 0); // deal drop-in
      }

      const ud = mesh.userData as CardMeshUserData;
      ud.isPlayerCard = false;

      const targetPos = new THREE.Vector3(jitterX, targetY, jitterZ);
      mesh.position.lerp(targetPos, 0.2);

      // -Math.PI / 2 on X ensures Front Face (+Z) points directly UP into view
      mesh.rotation.set(-Math.PI / 2, 0, jitterRotY);
    });

    // 3. Opponent Seated Players Card Backs (Facing other players)
    otherPlayers.forEach((opp) => {
      if (opp.seatIndex === localSeat) return;
      const oppHandCount = opp.handCount || 0;
      for (let i = 0; i < oppHandCount; i++) {
        const dummyId = `opp_${opp.seatIndex}_${i}`;
        activeCardIds.add(dummyId);

        let mesh = this.cardMeshes.get(dummyId);
        if (!mesh) {
          const dummyCard: Card = { id: dummyId, suit: 'spades', value: '2', rank: 2 };
          mesh = this.create3DCardMesh(dummyCard, false, opp.seatIndex);
          this.cardMeshes.set(dummyId, mesh);
          this.scene.add(mesh);
        }

        // Position hand fan according to seat
        const seat = opp.seatIndex;
        let basePos = new THREE.Vector3(0, 0.85, -0.6);
        let baseRotY = Math.PI;

        if (seat === 1) { // West
          basePos = new THREE.Vector3(-0.6, 0.85, 0);
          baseRotY = Math.PI / 2;
        } else if (seat === 3) { // East
          basePos = new THREE.Vector3(0.6, 0.85, 0);
          baseRotY = -Math.PI / 2;
        }

        const fanOffset = (i - (oppHandCount - 1) / 2) * 0.02;
        mesh.position.set(
          basePos.x + Math.sin(baseRotY + Math.PI / 2) * fanOffset,
          basePos.y + i * 0.001,
          basePos.z + Math.cos(baseRotY + Math.PI / 2) * fanOffset
        );
        mesh.rotation.set(-Math.PI / 5, baseRotY, 0);
      }
    });

    // Remove inactive cards
    this.cardMeshes.forEach((mesh, cardId) => {
      if (!activeCardIds.has(cardId)) {
        this.scene.remove(mesh);
        this.cardMeshes.delete(cardId);
      }
    });
  }

  // Create thin realistic 3D Box card mesh with crisp front & back textures
  private create3DCardMesh(card: Card, isPlayerCard: boolean, seatIndex: number): THREE.Mesh {
    const cardWidth = 0.072; // 7.2 cm standard playing card width
    const cardHeight = 0.106; // 10.6 cm standard playing card height
    const cardThickness = 0.0012; // 1.2 mm cardstock thickness

    // Box Geometry: X = Width, Y = Height, Z = Thickness
    const geo = new THREE.BoxGeometry(cardWidth, cardHeight, cardThickness);

    const edgeMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.8,
    });
    const frontTex = getCardFrontTexture(card);
    const backTex = getCardBackTexture();

    const frontMat = new THREE.MeshStandardMaterial({
      map: frontTex,
      roughness: 0.3,
      metalness: 0.02,
    });

    const backMat = new THREE.MeshStandardMaterial({
      map: backTex,
      roughness: 0.3,
      metalness: 0.02,
    });

    // In Three.js BoxGeometry:
    // materials: [right (+X), left (-X), top (+Y), bottom (-Y), front (+Z), back (-Z)]
    // Face +Z is Front (Front Face with number/suit)
    // Face -Z is Back (Medallion Pattern)
    const materials = [edgeMat, edgeMat, edgeMat, edgeMat, frontMat, backMat];

    const mesh = new THREE.Mesh(geo, materials);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    mesh.userData = {
      card,
      isPlayerCard,
      seatIndex,
      originalPos: new THREE.Vector3(),
      originalRot: new THREE.Euler(),
    } as CardMeshUserData;

    return mesh;
  }

  // WebXR Hand Pinch Grab Handler for Quest 3
  public handleXRPinch(hand: 'left' | 'right', pinchPoint: THREE.Vector3, isPinching: boolean) {
    if (isPinching) {
      if (!this.draggedCard) {
        // Find closest player card within pinch threshold (8cm)
        let closestMesh: THREE.Mesh | null = null;
        let minDist = 0.12;

        for (const mesh of this.cardMeshes.values()) {
          const ud = mesh.userData as CardMeshUserData;
          if (ud.isPlayerCard) {
            const dist = mesh.position.distanceTo(pinchPoint);
            if (dist < minDist) {
              minDist = dist;
              closestMesh = mesh;
            }
          }
        }

        if (closestMesh) {
          this.draggedCard = closestMesh;
          (closestMesh.userData as CardMeshUserData).isDragging = true;
          soundEngine.playCardSnap();
        }
      } else {
        // Move dragged card with pinch point
        this.draggedCard.position.copy(pinchPoint);
      }
    } else if (this.draggedCard) {
      // Released card: check if dropped over table center
      const ud = this.draggedCard.userData as CardMeshUserData;
      ud.isDragging = false;

      // Table play threshold (table center is around y=0.76, radius=0.6)
      const distToCenter = new THREE.Vector2(this.draggedCard.position.x, this.draggedCard.position.z).length();
      if (distToCenter < 0.45 && this.draggedCard.position.y > 0.72) {
        // Play the card!
        soundEngine.playCardSnap();
        if (this.onCardPlayRequested) {
          this.onCardPlayRequested(ud.card);
        }
      } else {
        // Return to hand
        this.draggedCard.position.copy(ud.originalPos);
      }
      this.draggedCard = null;
    }
  }

  // Setup Mouse / Touch fallback events for Desktop & Mobile browsers
  private setupEvents() {
    const dom = this.renderer.domElement;

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const rect = dom.getBoundingClientRect();
      this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);

      if (this.draggedCard) {
        if (this.raycaster.ray.intersectPlane(this.dragPlane, this.dragIntersection)) {
          this.draggedCard.position.x = this.dragIntersection.x;
          this.draggedCard.position.z = this.dragIntersection.z;
          this.draggedCard.position.y = 0.88;
        }
        return;
      }

      // Hover elevation on hand cards
      const playerMeshes: THREE.Mesh[] = [];
      this.cardMeshes.forEach((mesh) => {
        if ((mesh.userData as CardMeshUserData).isPlayerCard) {
          playerMeshes.push(mesh);
        }
      });

      const intersects = this.raycaster.intersectObjects(playerMeshes);
      if (intersects.length > 0) {
        const topMesh = intersects[0].object as THREE.Mesh;
        if (this.hoveredCard !== topMesh) {
          if (this.hoveredCard) {
            const oldUd = this.hoveredCard.userData as CardMeshUserData;
            this.hoveredCard.position.copy(oldUd.originalPos);
          }
          this.hoveredCard = topMesh;
          const ud = topMesh.userData as CardMeshUserData;
          topMesh.position.y = ud.originalPos.y + 0.04;
          topMesh.position.z = ud.originalPos.z - 0.02;
          dom.style.cursor = 'pointer';
        }
      } else if (this.hoveredCard) {
        const oldUd = this.hoveredCard.userData as CardMeshUserData;
        this.hoveredCard.position.copy(oldUd.originalPos);
        this.hoveredCard = null;
        dom.style.cursor = 'default';
      }
    };

    const onPointerDown = () => {
      if (this.hoveredCard) {
        this.draggedCard = this.hoveredCard;
        (this.draggedCard.userData as CardMeshUserData).isDragging = true;
        soundEngine.playCardSnap();
      }
    };

    const onPointerUp = () => {
      if (this.draggedCard) {
        const ud = this.draggedCard.userData as CardMeshUserData;
        ud.isDragging = false;

        const distToCenter = new THREE.Vector2(this.draggedCard.position.x, this.draggedCard.position.z).length();
        if (distToCenter < 0.45 || this.draggedCard.position.z < 0.35) {
          soundEngine.playCardSnap();
          if (this.onCardPlayRequested) {
            this.onCardPlayRequested(ud.card);
          }
        } else {
          this.draggedCard.position.copy(ud.originalPos);
        }
        this.draggedCard = null;
      }
    };

    dom.addEventListener('mousemove', onPointerMove);
    dom.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mouseup', onPointerUp);

    dom.addEventListener('touchmove', onPointerMove, { passive: true });
    dom.addEventListener('touchstart', onPointerDown, { passive: true });
    window.addEventListener('touchend', onPointerUp);
  }

  public render() {
    this.renderer.render(this.scene, this.camera);
  }

  public resize(width: number, height: number) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public cleanup() {
    if (this.container && this.renderer.domElement) {
      this.container.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}
