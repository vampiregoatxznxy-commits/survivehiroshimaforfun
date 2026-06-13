// ── Constants ──
const GRAVITY = -25;
const PLAYER_HEIGHT = 1.7;
const CROUCH_HEIGHT = 0.9;
const WALK_SPEED = 5;
const SPRINT_SPEED = 9;
const CROUCH_SPEED = 2.5;
const JUMP_FORCE = 8;
const STAMINA_MAX = 100;
const STAMINA_DRAIN = 25;
const STAMINA_REGEN = 15;

const BOMB_TIME = 75; // seconds after start (8:15 AM, start at 7:00 AM)
const GAME_DURATION = 1440; // 24 real minutes = 48 in-game hours (1s = 2min)

// ── Characters ──
const characters = [
  {
    id: 'hiroshi', name: 'Hiroshi', desc: 'civilian', loc: 'residential district',
    start: [900, 0, 500], color: '#8a7a6a',
    info: 'Lived in a wooden house 1km from hypocenter. Most civilians in this area perished instantly or within days.'
  },
  {
    id: 'kenji', name: 'Kenji', desc: 'soldier', loc: 'military barracks',
    start: [-1500, 0, 1000], color: '#5a6a4a',
    info: 'Stationed at military barracks 1.8km from hypocenter. Soldiers had a higher survival rate due to training and location.'
  },
  {
    id: 'yuki', name: 'Yuki', desc: 'child', loc: 'school',
    start: [500, 0, 1200], color: '#7a6a8a',
    info: 'At school 1.3km from hypocenter. Many schoolchildren were evacuated to the countryside, but some areas were hit hard.'
  },
  {
    id: 'tanaka', name: 'Dr. Tanaka', desc: 'doctor', loc: 'hospital',
    start: [-700, 0, -100], color: '#9a8a7a',
    info: 'Working at the hospital 700m from hypocenter. The reinforced concrete building provided some protection.'
  }
];

let selectedCharacter = characters[0];
let gameState = 'menu';
let playerHealth = 100;
let radiation = 0;
let thirst = 100;
let stamina = 100;
let gameTime = 0;
let isSprinting = false;
let isCrouching = false;
let playerVelocity = new THREE.Vector3();
let isOnGround = false;
let bombDetonated = false;
let blastWavePassed = false;
let isBlinded = false;
let blindnessDuration = 0;
let flashExposure = false;
let nearBlast = false;
let gotBlastDamage = false;
let effects = [];
let gameEnded = false;
let npcs = [];
let buildings = [];
let fireParticles = [];
let notificationTimer = 0;
let notificationText = '';
let gameCanvas = null;
let clock = new THREE.Clock();
let gameStartTime = 0;

// Three.js objects
let scene, camera, renderer, controls;
let raycaster = new THREE.Raycaster();
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let ground, bombFlashMesh, bombGlow, mushroomCloud;

// ── DOM refs ──
const $ = id => document.getElementById(id);
const homeScreen = $('homeScreen');
const customizationScreen = $('customizationScreen');
const gameOverlay = $('gameOverlay');
const flashOverlay = $('flashOverlay');
const deathScreen = $('deathScreen');
const winScreen = $('winScreen');
const deathTitle = $('deathTitle');
const deathCause = $('deathCause');
const deathDesc = $('deathDesc');
const effectsList = $('effectsList');
const notification = $('notification');
const healthFill = $('healthFill');
const radFill = $('radFill');
const thirstFill = $('thirstFill');
const staminaFill = $('staminaFill');
const healthText = $('healthText');
const radText = $('radText');
const thirstText = $('thirstText');
const hudTime = $('hudTime');
const hudDay = $('hudDay');
const hudLoc = $('hudLoc');
const hudEffects = $('hudEffects');
const charGrid = $('charGrid');

// ── Background visuals (ashes/embers from original) ──
const video = $('bgVideo');
const bgCanvas = $('bgCanvas');
const ctx = bgCanvas.getContext('2d');
let W, H;

video.src = 'https://archive.org/download/TaleofTw1946/TaleofTw1946_512kb.mp4';
video.playbackRate = 0.35;
video.addEventListener('canplay', () => { video.play().catch(() => {}); });

function resizeBg() {
  W = bgCanvas.width = window.innerWidth;
  H = bgCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeBg);
resizeBg();

const ashes = [];
for (let i = 0; i < 150; i++) {
  ashes.push({
    x: Math.random() * W, y: -Math.random() * H,
    s: Math.random() * 3 + 1.5, sy: Math.random() * 0.3 + 0.05,
    sx: (Math.random() - 0.5) * 0.15, op: Math.random() * 0.4 + 0.2, d: Math.random() * 10
  });
}
const embers = [];
for (let i = 0; i < 10; i++) {
  embers.push({
    x: Math.random() * W, y: H + 5, s: Math.random() * 3 + 1.5,
    sy: Math.random() * 0.35 + 0.1, life: Math.random() * 500 + 200, ml: 0
  });
  embers[i].ml = embers[i].life;
}

function drawBg() {
  if (gameState !== 'menu' && gameState !== 'customization') return;
  ctx.clearRect(0, 0, W, H);
  for (const a of ashes) {
    a.y += a.sy; a.x += a.sx + Math.sin(a.y * 0.005 + a.d) * 0.25;
    if (a.y > H + 5) { a.x = Math.random() * W; a.y = -Math.random() * H; }
    if (a.x < -10) a.x = W + 10; if (a.x > W + 10) a.x = -10;
    ctx.fillStyle = `rgba(180,160,140,${a.op})`;
    ctx.fillRect(a.x, a.y, a.s, a.s * 0.6);
  }
  for (const e of embers) {
    e.y -= e.sy; e.x += (Math.random() - 0.5) * 0.3; e.life--;
    if (e.life <= 0 || e.y < -10) {
      e.x = Math.random() * W; e.y = H + 5;
      e.life = Math.random() * 500 + 200; e.ml = e.life;
    }
    const r = e.life / e.ml;
    let op = 0.7;
    if (r < 0.3) op = (r / 0.3) * 0.7;
    if (r > 0.7) op = ((1 - r) / 0.3) * 0.7;
    ctx.save();
    ctx.shadowColor = '#ff8844'; ctx.shadowBlur = 15;
    ctx.fillStyle = `rgba(255,130,50,${op})`;
    ctx.beginPath(); ctx.arc(e.x, e.y, e.s, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  requestAnimationFrame(drawBg);
}
drawBg();

// ── Navigation ──
function showHome() {
  customizationScreen.classList.add('hidden');
  homeScreen.classList.remove('hidden');
  gameOverlay.classList.add('hidden');
  if (gameCanvas) { gameCanvas.style.display = 'none'; }
  gameState = 'menu';
}
function showCustomization() {
  homeScreen.classList.add('hidden');
  customizationScreen.classList.remove('hidden');
  buildCharGrid();
  gameState = 'customization';
}
function hideAllScreens() {
  homeScreen.classList.add('hidden');
  customizationScreen.classList.add('hidden');
  deathScreen.classList.add('hidden');
  winScreen.classList.add('hidden');
}

$('customizeBtn').addEventListener('click', showCustomization);
$('backBtn').addEventListener('click', showHome);
$('selectBtn').addEventListener('click', startGame);
$('playBtn').addEventListener('click', startGame);
$('deathRetryBtn').addEventListener('click', () => { showHome(); });
$('winRetryBtn').addEventListener('click', () => { showHome(); });

// ── Character Grid ──
let gridBuilt = false;

function drawPortrait(canvas, charId) {
  const c = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  c.clearRect(0, 0, w, h);
  const cx = w / 2;
  const bodyColor = characters.find(ch => ch.id === charId)?.color || '#8a7a6a';

  switch (charId) {
    case 'hiroshi':
      c.fillStyle = '#b8a090'; c.beginPath(); c.arc(cx, 14, 11, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#3a2e24'; c.beginPath(); c.arc(cx, 14, 11, Math.PI, 0); c.fill();
      c.fillStyle = bodyColor; c.fillRect(cx - 13, 24, 26, 27);
      c.fillStyle = '#3a3028'; c.fillRect(cx - 8, 51, 7, 39); c.fillRect(cx + 1, 51, 7, 39);
      c.fillStyle = '#5a4a3a'; c.fillRect(0, 24, 15, 25); c.fillRect(55, 24, 15, 25);
      break;
    case 'kenji':
      c.fillStyle = '#b8a090'; c.beginPath(); c.arc(cx, 14, 11, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#4a5a3a'; c.beginPath(); c.arc(cx, 14, 12, Math.PI, 0); c.fill();
      c.fillRect(cx - 6, 12, 12, 5);
      c.fillStyle = bodyColor; c.fillRect(cx - 15, 24, 30, 26);
      c.fillRect(0, 24, 15, 23); c.fillRect(55, 24, 15, 23);
      c.fillStyle = '#3a3a2a'; c.fillRect(cx - 8, 50, 7, 40); c.fillRect(cx + 1, 50, 7, 40);
      break;
    case 'yuki':
      c.fillStyle = '#b8a090'; c.beginPath(); c.arc(cx, 13, 10, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#3a2e24'; c.beginPath(); c.arc(cx - 4, 11, 3, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(cx + 4, 11, 3, 0, Math.PI * 2); c.fill();
      c.fillStyle = bodyColor; c.fillRect(cx - 11, 22, 22, 19);
      c.fillStyle = '#4a3a2e'; c.fillRect(cx - 7, 41, 6, 30); c.fillRect(cx + 1, 41, 6, 30);
      c.fillStyle = '#5a4a3a'; c.fillRect(2, 22, 12, 18); c.fillRect(56, 22, 12, 18);
      break;
    case 'tanaka':
      c.fillStyle = '#b8a090'; c.beginPath(); c.arc(cx, 14, 11, 0, Math.PI * 2); c.fill();
      c.fillStyle = bodyColor; c.fillRect(cx - 13, 24, 26, 28);
      c.fillStyle = 'rgba(140,130,120,0.35)'; c.fillRect(4, 24, 62, 28);
      c.fillStyle = '#3a3632'; c.fillRect(cx - 8, 52, 7, 38); c.fillRect(cx + 1, 52, 7, 38);
      c.fillRect(0, 24, 15, 25); c.fillRect(55, 24, 15, 25);
      c.fillStyle = '#9a3020'; c.fillRect(cx - 3, 32, 6, 12); c.fillRect(cx - 7, 36, 14, 4);
      break;
  }
}

function buildCharGrid() {
  if (!charGrid || gridBuilt) return;
  gridBuilt = true;
  for (const ch of characters) {
    const card = document.createElement('div');
    card.className = 'char-card';
    card.dataset.charId = ch.id;
    const port = document.createElement('canvas');
    port.className = 'char-portrait';
    port.width = 70; port.height = 90;
    drawPortrait(port, ch.id);
    const name = document.createElement('div');
    name.className = 'char-name'; name.textContent = ch.name;
    const desc = document.createElement('div');
    desc.className = 'char-desc'; desc.textContent = ch.desc;
    const loc = document.createElement('div');
    loc.className = 'char-loc'; loc.textContent = '📍 ' + ch.loc;
    card.appendChild(port); card.appendChild(name);
    card.appendChild(desc); card.appendChild(loc);
    card.addEventListener('click', () => {
      document.querySelectorAll('.char-card').forEach(e => e.classList.remove('selected'));
      card.classList.add('selected');
      selectedCharacter = ch;
    });
    if (ch.id === selectedCharacter.id) card.classList.add('selected');
    charGrid.appendChild(card);
  }
}

// ── THREE.JS GAME ──
function initGame() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87CEEB);
  scene.fog = new THREE.Fog(0x87CEEB, 800, 2500);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 3000);
  const start = selectedCharacter.start;
  camera.position.set(start[0], start[1] + PLAYER_HEIGHT, start[2]);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ReinhardToneMapping;
  renderer.toneMappingExposure = 1.2;

  gameCanvas = renderer.domElement;
  gameCanvas.id = 'gameCanvas';
  gameCanvas.style.display = 'block';
  document.body.appendChild(gameCanvas);

  // Face towards city center from starting position
  const startPos = new THREE.Vector3(start[0], 0, start[2]);
  const centerDir = new THREE.Vector3().subVectors(new THREE.Vector3(0, 0, 0), startPos).normalize();
  camera.lookAt(new THREE.Vector3(start[0] + centerDir.x * 50, 0, start[2] + centerDir.z * 50));

  controls = new THREE.PointerLockControls(camera, document.body);

  // Click to start hint
  const hint = document.createElement('div');
  hint.className = 'controls-hint';
  hint.textContent = 'click to look around  •  WASD move  •  SPACE jump  •  SHIFT crouch  •  CTRL sprint';
  document.body.appendChild(hint);
  setTimeout(() => { if (hint.parentNode) hint.parentNode.removeChild(hint); }, 8000);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0x404060, 0.4);
  scene.add(ambientLight);

  const sunLight = new THREE.DirectionalLight(0xffeedd, 1.8);
  sunLight.position.set(200, 500, 300);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 1;
  sunLight.shadow.camera.far = 1000;
  sunLight.shadow.camera.left = -400;
  sunLight.shadow.camera.right = 400;
  sunLight.shadow.camera.top = 400;
  sunLight.shadow.camera.bottom = -400;
  scene.add(sunLight);

  const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x3a4a3a, 0.3);
  scene.add(hemiLight);

  // Ground
  createGround();

  // City
  createCity();

  // NPCs
  createNPCs();

  // Bomb marker (invisible, at detonation point)
  bombFlashMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  bombFlashMesh.position.set(0, 600, 0);
  scene.add(bombFlashMesh);

  // Bomb glow (initially invisible)
  bombGlow = new THREE.Mesh(
    new THREE.SphereGeometry(5, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 })
  );
  bombGlow.position.set(0, 600, 0);
  scene.add(bombGlow);

  // Mushroom cloud (initially invisible)
  const cloudGroup = new THREE.Group();
  const stemGeo = new THREE.CylinderGeometry(10, 40, 200, 12);
  const stemMat = new THREE.MeshStandardMaterial({
    color: 0x8a7a6a, transparent: true, opacity: 0
  });
  const stem = new THREE.Mesh(stemGeo, stemMat);
  stem.position.y = -100;
  cloudGroup.add(stem);

  const capGeo = new THREE.SphereGeometry(60, 16, 16);
  const capMat = new THREE.MeshStandardMaterial({
    color: 0xccc8c0, transparent: true, opacity: 0
  });
  const cap = new THREE.Mesh(capGeo, capMat);
  cap.position.y = 20;
  cap.scale.set(1, 0.6, 1);
  cloudGroup.add(cap);

  cloudGroup.position.set(0, 650, 0);
  mushroomCloud = cloudGroup;
  scene.add(cloudGroup);

  window.addEventListener('resize', onResize);
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);

  // Click to lock pointer
  gameCanvas.addEventListener('click', () => {
    if (gameState === 'playing' && !controls.isLocked) {
      controls.lock();
    }
  });

  controls.addEventListener('lock', () => {
    const h = document.querySelector('.controls-hint');
    if (h) h.remove();
  });

  controls.addEventListener('unlock', () => {
    if (gameState === 'playing' && !gameEnded) {
      // Keep game running
    }
  });

  // Distant explosion sound (simple oscillator)
  setupAudio();

  gameOverlay.classList.remove('hidden');
  gameState = 'playing';
  gameStartTime = Date.now();
  gameTime = 0;
  bombDetonated = false;
  blastWavePassed = false;
  isBlinded = false;
  blindnessDuration = 0;
  flashExposure = false;
  nearBlast = false;
  gotBlastDamage = false;
  effects = [];
  gameEnded = false;
  playerHealth = 100;
  radiation = 0;
  thirst = 100;
  stamina = 100;
  clock.start();
  animate();
}

function onResize() {
  if (camera) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }
  if (renderer) {
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

function createGround() {
  // Main ground
  const groundGeo = new THREE.PlaneGeometry(3000, 3000, 60, 60);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x5a6a4a, roughness: 0.9, metalness: 0
  });
  ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.1;
  ground.receiveShadow = true;
  scene.add(ground);

  // Roads
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x7a7a72, roughness: 0.95 });
  for (let x = -1400; x <= 1400; x += 120) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(8, 3000), roadMat);
    r.rotation.x = -Math.PI / 2;
    r.position.set(x, 0.01, 0);
    r.receiveShadow = true;
    scene.add(r);
  }
  for (let z = -1400; z <= 1400; z += 120) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(3000, 8), roadMat);
    r.rotation.x = -Math.PI / 2;
    r.position.set(0, 0.01, z);
    r.receiveShadow = true;
    scene.add(r);
  }
}

function createCity() {
  const buildingColors = [0x8a7a6a, 0x9a8a7a, 0x7a6a5a, 0xaaa090, 0x6a5a4a, 0xbab0a0];
  const roofColors = [0x5a4a3a, 0x6a5a4a, 0x4a3a2a, 0x7a6a5a];
  buildings = [];

  // Generate buildings in city blocks
  for (let blockX = -1320; blockX <= 1320; blockX += 120) {
    for (let blockZ = -1320; blockZ <= 1320; blockZ += 120) {
      // Skip random blocks for parks
      if (Math.random() < 0.15) continue;
      // Fewer buildings farther from center
      const dist = Math.sqrt(blockX * blockX + blockZ * blockZ);
      if (dist > 1200 && Math.random() < 0.4) continue;

      const numBuildings = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < numBuildings; i++) {
        const w = 12 + Math.random() * 18;
        const d = 12 + Math.random() * 18;
        const h = 6 + Math.random() * 18;

        const color = buildingColors[Math.floor(Math.random() * buildingColors.length)];
        const bMat = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0 });
        const bGeo = new THREE.BoxGeometry(w, h, d);
        const bMesh = new THREE.Mesh(bGeo, bMat);
        bMesh.castShadow = true;
        bMesh.receiveShadow = true;

        const ox = (Math.random() - 0.5) * 30;
        const oz = (Math.random() - 0.5) * 30;
        bMesh.position.set(blockX + ox, h / 2, blockZ + oz);
        scene.add(bMesh);
        buildings.push(bMesh);

        // Roof (slightly darker)
        const roofMat = new THREE.MeshStandardMaterial({
          color: roofColors[Math.floor(Math.random() * roofColors.length)],
          roughness: 0.9
        });
        const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.3, d + 0.5), roofMat);
        roof.position.set(blockX + ox, h + 0.15, blockZ + oz);
        roof.receiveShadow = true;
        scene.add(roof);
        buildings.push(roof);
        roof.userData.isRoof = true;
        roof.userData.buildingHeight = h;

        // Store building data
        bMesh.userData = { height: h, width: w, depth: d, originalColor: color, isBuilding: true, onFire: false };
        roof.userData = { onFire: false, isRoof: true };
      }
    }
  }

  // Trees
  for (let i = 0; i < 80; i++) {
    const x = (Math.random() - 0.5) * 2600;
    const z = (Math.random() - 0.5) * 2600;
    const dist = Math.sqrt(x * x + z * z);
    if (dist < 100) continue; // Clear near hypocenter
    if (dist > 1400) continue;
    // Check not on road or in building
    const onRoad = Math.abs(x % 120) < 6 || Math.abs(z % 120) < 6;
    if (onRoad) continue;

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.5, 2 + Math.random() * 2, 6),
      new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: 0.9 })
    );
    trunk.position.set(x, 1 + Math.random(), z);
    trunk.castShadow = true;
    scene.add(trunk);

    const crown = new THREE.Mesh(
      new THREE.SphereGeometry(1.5 + Math.random() * 2, 6, 6),
      new THREE.MeshStandardMaterial({ color: 0x4a7a3a, roughness: 0.8 })
    );
    crown.position.set(x, 3 + Math.random() * 2, z);
    crown.castShadow = true;
    scene.add(crown);
  }
}

function createNPCs() {
  npcs = [];
  const npcMat = new THREE.MeshStandardMaterial({ color: 0xb8a090, roughness: 0.7 });

  for (let i = 0; i < 40; i++) {
    const x = (Math.random() - 0.5) * 2400;
    const z = (Math.random() - 0.5) * 2400;
    const dist = Math.sqrt(x * x + z * z);
    if (dist > 1400) continue;
    if (dist < 50) continue;

    const group = new THREE.Group();

    // Body
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.35, 0.8, 6),
      new THREE.MeshStandardMaterial({
        color: ['#8a7a6a', '#9a8a7a', '#7a6a5a', '#bab0a0', '#6a5a4a', '#aaa090'][Math.floor(Math.random() * 6)],
        roughness: 0.8
      })
    );
    body.position.y = 0.4;
    group.add(body);

    // Head
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 8, 8),
      npcMat
    );
    head.position.y = 0.9;
    group.add(head);

    // Leg
    const legMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.8 });
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.5, 4), legMat);
    leg.position.set(-0.1, 0.25, 0);
    group.add(leg);
    const leg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.5, 4), legMat);
    leg2.position.set(0.1, 0.25, 0);
    group.add(leg2);

    group.position.set(x, 0, z);
    const angle = Math.random() * Math.PI * 2;
    group.rotation.y = angle;

    // Random walking direction
    const npcData = {
      group,
      walkAngle: angle,
      walkSpeed: 0.5 + Math.random() * 1.5,
      walkTimer: Math.random() * 10,
      alive: true,
      disappearTimer: 0,
      head,
      body,
      leg, leg2,
      legSwing: 0
    };

    scene.add(group);
    npcs.push(npcData);
  }
}

// ── Audio ──
let audioCtx = null;
let explosionOsc = null;

function setupAudio() {
  if (audioCtx) return;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  } catch (_) {}
}

function playExplosionSound() {
  if (!audioCtx) return;
  try {
    // Low rumble
    const osc = audioCtx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(30, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(10, audioCtx.currentTime + 6);
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 6);
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(100, audioCtx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 6);
    osc.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + 6);

    // Crackle
    const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 3, audioCtx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const ns = audioCtx.createBufferSource();
    ns.buffer = buf;
    const ng = audioCtx.createGain();
    ng.gain.setValueAtTime(0.15, audioCtx.currentTime);
    ng.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 3);
    const nf = audioCtx.createBiquadFilter();
    nf.type = 'highpass'; nf.frequency.value = 200;
    ns.connect(nf); nf.connect(ng); ng.connect(audioCtx.destination);
    ns.start();

    // Distant drone
    if (!explosionOsc) {
      const o = audioCtx.createOscillator();
      o.type = 'sine'; o.frequency.value = 55;
      const og = audioCtx.createGain();
      og.gain.value = 0.02;
      o.connect(og); og.connect(audioCtx.destination);
      o.start();
      explosionOsc = { osc: o, gain: og };
    }
  } catch (_) {}
}

// ── Keyboard ──
function onKeyDown(e) {
  if (gameState !== 'playing') return;
  switch (e.code) {
    case 'KeyW': moveForward = true; break;
    case 'KeyS': moveBackward = true; break;
    case 'KeyA': moveLeft = true; break;
    case 'KeyD': moveRight = true; break;
    case 'ControlLeft': case 'ControlRight': isSprinting = true; e.preventDefault(); break;
    case 'ShiftLeft': case 'ShiftRight': isCrouching = true; e.preventDefault(); break;
    case 'Space': if (isOnGround) { playerVelocity.y = JUMP_FORCE; isOnGround = false; } e.preventDefault(); break;
    case 'KeyE': interact(); break;
  }
}
function onKeyUp(e) {
  switch (e.code) {
    case 'KeyW': moveForward = false; break;
    case 'KeyS': moveBackward = false; break;
    case 'KeyA': moveLeft = false; break;
    case 'KeyD': moveRight = false; break;
    case 'ControlLeft': case 'ControlRight': isSprinting = false; break;
    case 'ShiftLeft': case 'ShiftRight': isCrouching = false; break;
  }
}

function interact() {
  if (!controls.isLocked) return;
  // Placeholder for interaction (find water, etc.)
}

// ── Game Logic ──
function getGameHour() {
  return 7 + gameTime / 60;
}
function getGameMinute() {
  return Math.floor((gameTime % 60) * 2);
}
function getFormattedTime() {
  const totalMinutes = 7 * 60 + gameTime * 2;
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = Math.floor(totalMinutes % 60);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}
function getGameDay() {
  return gameTime < 720 ? 1 : 2;
}

function updateGame(delta) {
  if (gameEnded) return;
  gameTime += delta;
  if (gameTime >= GAME_DURATION) {
    winGame();
    return;
  }

  // Player movement
  updateMovement(delta);

  // Check for bomb event
  if (!bombDetonated && gameTime >= BOMB_TIME) {
    detonateBomb();
  }

  // Post-blast effects
  if (bombDetonated) {
    updatePostBlast(delta);
  }

  // Thirst decreases over time
  thirst -= 0.003 * delta;
  if (thirst < 0) thirst = 0;
  if (thirst <= 0) {
    playerHealth -= 0.5 * delta;
    if (!effects.includes('dehydration')) {
      effects.push('dehydration');
      showNotification('Severe dehydration — you need water');
    }
  }

  // Radiation damage
  if (radiation > 0) {
    const radDamage = radiation * 0.003 * delta;
    playerHealth -= radDamage;
    if (radiation > 50 && !effects.includes('radiation_sickness')) {
      effects.push('radiation_sickness');
      showNotification('Radiation sickness is setting in...');
    }
  }

  // Check death
  if (playerHealth <= 0) {
    die();
    return;
  }

  // Update HUD
  updateHUD();
}

function updateMovement(delta) {
  if (!controls.isLocked) return;

  const targetHeight = isCrouching ? CROUCH_HEIGHT : PLAYER_HEIGHT;

  let speed = WALK_SPEED;
  if (isSprinting && stamina > 0 && !isCrouching) {
    speed = SPRINT_SPEED;
    stamina -= STAMINA_DRAIN * delta;
    if (stamina < 0) stamina = 0;
  } else {
    stamina += STAMINA_REGEN * delta;
    if (stamina > STAMINA_MAX) stamina = STAMINA_MAX;
  }
  if (isCrouching) speed = CROUCH_SPEED;

  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  forward.y = 0;
  forward.normalize();
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  right.y = 0;
  right.normalize();

  const moveVec = new THREE.Vector3();
  if (moveForward) moveVec.add(forward);
  if (moveBackward) moveVec.sub(forward);
  if (moveRight) moveVec.add(right);
  if (moveLeft) moveVec.sub(right);
  if (moveVec.length() > 0) {
    moveVec.normalize().multiplyScalar(speed * delta);
    camera.position.x += moveVec.x;
    camera.position.z += moveVec.z;
  }

  if (bombDetonated && !blastWavePassed) {
    const blastDist = 600;
    const distToBlast = Math.sqrt(camera.position.x ** 2 + camera.position.z ** 2);
    if (distToBlast < blastDist) {
      const dir = new THREE.Vector3(camera.position.x, 0, camera.position.z).normalize();
      const pushForce = (1 - distToBlast / blastDist) * 40 * delta;
      camera.position.x += dir.x * pushForce;
      camera.position.z += dir.z * pushForce;
      playerVelocity.y = Math.max(playerVelocity.y, (1 - distToBlast / blastDist) * 5);
    }
  }

  const mapSize = 1400;
  camera.position.x = Math.max(-mapSize, Math.min(mapSize, camera.position.x));
  camera.position.z = Math.max(-mapSize, Math.min(mapSize, camera.position.z));

  // Simple building collision (check if inside any non-destroyed building)
  const pPos = camera.position.clone();
  for (const b of buildings) {
    if (!b.visible || b.userData.destroyed) continue;
    if (!b.userData.isBuilding) continue;
    const halfW = (b.userData.width || 10) / 2 + 0.3;
    const halfD = (b.userData.depth || 10) / 2 + 0.3;
    const bx = b.position.x, bz = b.position.z;
    if (pPos.x > bx - halfW && pPos.x < bx + halfW && pPos.z > bz - halfD && pPos.z < bz + halfD) {
      // Push out along shortest axis
      const dx1 = pPos.x - (bx - halfW), dx2 = (bx + halfW) - pPos.x;
      const dz1 = pPos.z - (bz - halfD), dz2 = (bz + halfD) - pPos.z;
      const minDx = Math.min(dx1, dx2), minDz = Math.min(dz1, dz2);
      if (minDx < minDz) {
        camera.position.x += (dx1 < dx2 ? -1 : 1) * 0.3;
      } else {
        camera.position.z += (dz1 < dz2 ? -1 : 1) * 0.3;
      }
    }
  }

  // Gravity + ground
  playerVelocity.y += GRAVITY * delta;
  const newY = camera.position.y + playerVelocity.y * delta;

  if (newY - 0.1 <= targetHeight) {
    camera.position.y = targetHeight;
    playerVelocity.y = 0;
    isOnGround = true;
  } else {
    camera.position.y = newY;
    isOnGround = false;
  }

  for (const npc of npcs) {
    if (!npc.alive) continue;
    const dx = camera.position.x - npc.group.position.x;
    const dz = camera.position.z - npc.group.position.z;
    if (dx * dx + dz * dz < 25) {
      npc.walkAngle = Math.atan2(dz, dx);
      npc.walkSpeed = 2;
    }
  }
}

function getGroundHeight(x, z) {
  // Simple ground height (could add terrain later)
  return 0;
}

// ── Bomb Event ──
function detonateBomb() {
  bombDetonated = true;
  playExplosionSound();

  // Flash
  const distToBlast = Math.sqrt(camera.position.x ** 2 + camera.position.z ** 2);
  const distToBlastY = 600; // bomb height

  // Check if player is looking at the blast
  const blastDir = new THREE.Vector3(0, 600, 0).sub(camera.position).normalize();
  const lookDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
  const angleToBlast = Math.acos(Math.min(1, Math.max(-1, blastDir.dot(lookDir))));

  // Flash intensity based on distance and angle
  const flashIntensity = Math.max(0, 1 - distToBlast / 3000);
  let blindSeverity = 0;

  if (angleToBlast < 0.8) { // Looking towards blast
    blindSeverity = Math.min(1, (1 - distToBlast / 2000) * (1 - angleToBlast / 0.8));
    if (blindSeverity > 0.3) {
      isBlinded = true;
      blindnessDuration = 15 + blindSeverity * 30; // seconds
      flashExposure = true;
      if (!effects.includes('flash_blindness')) {
        effects.push('flash_blindness');
        showNotification('The flash has blinded you!');
      }
    }
  }

  // Flash overlay
  flashOverlay.style.background = 'rgba(255,255,255,1)';
  flashOverlay.classList.remove('hidden');
  setTimeout(() => {
    flashOverlay.style.background = 'rgba(255,255,255,0.8)';
    setTimeout(() => {
      flashOverlay.style.background = 'rgba(255,255,255,0.3)';
      if (!isBlinded) {
        setTimeout(() => {
          flashOverlay.style.background = 'rgba(255,255,255,0)';
          flashOverlay.classList.add('hidden');
        }, 100);
      } else {
        // Keep slightly white for blindness
        flashOverlay.style.background = 'rgba(255,255,255,0.15)';
      }
    }, 200);
  }, 100);

  // Visible flash sphere
  bombGlow.material.opacity = 1;
  bombGlow.scale.set(1, 1, 1);

  // Animate flash growth
  let flashTime = 0;
  const growFlash = () => {
    flashTime += 0.016;
    if (flashTime < 2) {
      const s = 1 + flashTime * 15;
      bombGlow.scale.set(s, s, s);
      bombGlow.material.opacity = Math.max(0, 1 - flashTime * 0.5);
      requestAnimationFrame(growFlash);
    } else {
      bombGlow.scale.set(1, 1, 1);
      bombGlow.material.opacity = 0;
    }
  };
  growFlash();

  // Blast wave (arrives ~2-3 seconds after flash)
  setTimeout(() => {
    blastWavePassed = true;
    const blastRadius = 1600;
    const distToHypocenter = Math.sqrt(camera.position.x ** 2 + camera.position.z ** 2);

    if (distToHypocenter < blastRadius) {
      const blastDamage = Math.max(0, 60 * (1 - distToHypocenter / blastRadius));
      playerHealth -= blastDamage;
      nearBlast = true;
      gotBlastDamage = true;

      // Camera shake
      shakeCamera(distToHypocenter);

      if (distToHypocenter < 200) {
        // Instant death zone
        playerHealth = 0;
        deathTitle.textContent = 'VAPORIZED';
        deathCause.textContent = 'You were at ground zero';
        deathDesc.textContent = 'Within 200m of the hypocenter, the temperature reached 3000-4000°C. You were instantly vaporized.';
        die();
        return;
      }

      if (distToHypocenter < 500) {
        showNotification('The blast wave throws you violently!');
        if (!effects.includes('severe_burns')) {
          effects.push('severe_burns');
        }
      } else if (distToHypocenter < 1000) {
        showNotification('The shockwave slams into you!');
        if (!effects.includes('blast_injuries')) {
          effects.push('blast_injuries');
        }
      } else {
        showNotification('A powerful shockwave rattles everything');
      }
    } else {
      showNotification('A distant rumble shakes the ground');
    }

    // NPCs disappear near blast
    for (const npc of npcs) {
      if (!npc.alive) continue;
      const nd = Math.sqrt(
        npc.group.position.x ** 2 + npc.group.position.z ** 2
      );
      if (nd < blastRadius * 0.8) {
        npc.alive = false;
      }
    }

    // Destroy buildings near blast
    for (const b of buildings) {
      if (b.userData.isBuilding && !b.userData.destroyed) {
        const bd = Math.sqrt(b.position.x ** 2 + b.position.z ** 2);
        if (bd < 400) {
          // Destroy building
          b.visible = false;
          b.userData.destroyed = true;
          // Add debris particles
          addDebris(b.position.x, b.position.z, b.userData.height || 10);
        } else if (bd < 800 && Math.random() < 0.5) {
          b.visible = false;
          b.userData.destroyed = true;
        }
      }
    }

    // Start fires
    startFires();
  }, 2500);

  // Mushroom cloud formation
  setTimeout(() => {
    animateMushroomCloud();
  }, 1000);

  // Sky darkens
  setTimeout(() => {
    scene.background.setHex(0x8a7a6a);
    scene.fog.color.setHex(0x8a7a6a);
  }, 3000);
}

function shakeCamera(intensity) {
  const originalPos = camera.position.clone();
  let shakeTime = 0;
  const shakeDuration = 2;
  const shakeIntensity = Math.min(3, intensity > 0 ? 3 / intensity : 3);

  const doShake = () => {
    shakeTime += 0.016;
    if (shakeTime < shakeDuration) {
      const decay = 1 - shakeTime / shakeDuration;
      camera.position.x += (Math.random() - 0.5) * shakeIntensity * decay;
      camera.position.y += (Math.random() - 0.5) * shakeIntensity * decay * 0.5;
      camera.position.z += (Math.random() - 0.5) * shakeIntensity * decay;
      requestAnimationFrame(doShake);
    }
  };
  doShake();
}

function animateMushroomCloud() {
  const parts = mushroomCloud.children;
  for (const p of parts) {
    p.material.opacity = 0.7;
  }
  mushroomCloud.scale.set(1, 1, 1);

  let growTime = 0;
  const growCloud = () => {
    growTime += 0.016;
    if (growTime < 8) {
      const s = 1 + growTime * 3;
      mushroomCloud.scale.set(s, s * 1.5, s);
      mushroomCloud.position.y = 600 + growTime * 30;
      requestAnimationFrame(growCloud);
    }
  };
  growCloud();
}

function startFires() {
  // Add fire on damaged buildings
  for (const b of buildings) {
    if (b.userData.destroyed && Math.random() < 0.6) {
      createFire(b.position.x, b.position.z);
    }
  }
  // Random fires
  for (let i = 0; i < 15; i++) {
    const x = (Math.random() - 0.5) * 2000;
    const z = (Math.random() - 0.5) * 2000;
    createFire(x, z);
  }
}

function createFire(x, z) {
  const fireGroup = new THREE.Group();
  fireGroup.position.set(x, 0.5, z);
  scene.add(fireGroup);

  // Simple fire particles (small cones)
  for (let i = 0; i < 5; i++) {
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.5 + Math.random() * 1, 1 + Math.random() * 2, 4),
      new THREE.MeshBasicMaterial({
        color: [0xff6600, 0xff4400, 0xff8800, 0xffaa00][Math.floor(Math.random() * 4)],
        transparent: true, opacity: 0.6 + Math.random() * 0.4
      })
    );
    cone.position.set((Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2);
    fireGroup.add(cone);
  }

  // Glow light
  const light = new THREE.PointLight(0xff6600, 1, 20);
  light.position.set(0, 3, 0);
  fireGroup.add(light);

  fireParticles.push({
    group: fireGroup,
    timer: Math.random() * 100,
    light
  });
}

function addDebris(x, z, height) {
  for (let i = 0; i < 8; i++) {
    const debris = new THREE.Mesh(
      new THREE.BoxGeometry(0.2 + Math.random() * 0.5, 0.1, 0.2 + Math.random() * 0.5),
      new THREE.MeshStandardMaterial({ color: 0x7a6a5a, roughness: 0.9 })
    );
    debris.position.set(
      x + (Math.random() - 0.5) * 10,
      0.1 + Math.random() * height * 0.5,
      z + (Math.random() - 0.5) * 10
    );
    debris.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    scene.add(debris);
  }
}

function updatePostBlast(delta) {
  if (!bombDetonated) return;

  // Fire damage if near fire
  for (const fire of fireParticles) {
    const dx = camera.position.x - fire.group.position.x;
    const dz = camera.position.z - fire.group.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < 8) {
      playerHealth -= 3 * delta;
      if (!effects.includes('fire_burns')) {
        effects.push('fire_burns');
        showNotification('You are too close to the fire!');
      }
    }
  }

  // Radiation near hypocenter
  const distToHypocenter = Math.sqrt(camera.position.x ** 2 + camera.position.z ** 2);
  if (distToHypocenter < 500) {
    radiation += 5 * delta;
    if (!effects.includes('high_radiation')) {
      effects.push('high_radiation');
      showNotification('Warning: high radiation levels!');
    }
  } else if (distToHypocenter < 1000) {
    radiation += 1.5 * delta;
  } else if (distToHypocenter < 2000) {
    radiation += 0.3 * delta;
  }
  if (radiation > 100) radiation = 100;

  // Blindness recovery
  if (isBlinded) {
    blindnessDuration -= delta;
    if (blindnessDuration <= 0) {
      isBlinded = false;
      flashOverlay.style.background = 'rgba(255,255,255,0)';
      flashOverlay.classList.add('hidden');
      showNotification('Your vision slowly returns...');
    } else {
      const op = Math.min(0.3, blindnessDuration / 60);
      flashOverlay.style.background = `rgba(255,255,255,${op})`;
    }
  }

  // Radiation effects on health (delayed)
  if (radiation > 20) {
    // Health degradation from radiation
    if (Math.random() < 0.001) {
      playerHealth -= 1;
    }
  }

  // NPCs near fires disappear
  for (const npc of npcs) {
    if (!npc.alive) continue;
    for (const fire of fireParticles) {
      const dx = npc.group.position.x - fire.group.position.x;
      const dz = npc.group.position.z - fire.group.position.z;
      if (dx * dx + dz * dz < 100) {
        npc.alive = false;
        break;
      }
    }
  }
}

// ── NPC Update ──
function updateNPCs(delta) {
  for (const npc of npcs) {
    if (!npc.alive) {
      // Disappear animation
      if (npc.group.visible) {
        npc.group.scale.x -= delta * 2;
        npc.group.scale.y -= delta * 2;
        npc.group.scale.z -= delta * 2;
        if (npc.group.scale.x <= 0) {
          npc.group.visible = false;
          scene.remove(npc.group);
        }
      }
      continue;
    }

    // Random walk
    npc.walkTimer += delta;
    if (npc.walkTimer > 3 + Math.random() * 4) {
      npc.walkTimer = 0;
      npc.walkAngle += (Math.random() - 0.5) * Math.PI;
      npc.walkSpeed = 0.5 + Math.random() * 1.5;
    }

    const moveX = Math.cos(npc.walkAngle) * npc.walkSpeed * delta;
    const moveZ = Math.sin(npc.walkAngle) * npc.walkSpeed * delta;
    npc.group.position.x += moveX;
    npc.group.position.z += moveZ;

    // Keep within bounds
    npc.group.position.x = Math.max(-1300, Math.min(1300, npc.group.position.x));
    npc.group.position.z = Math.max(-1300, Math.min(1300, npc.group.position.z));

    // Rotate in movement direction
    npc.group.rotation.y = npc.walkAngle;

    // Leg swing animation
    npc.legSwing += delta * npc.walkSpeed * 3;
    if (npc.leg) {
      npc.leg.rotation.x = Math.sin(npc.legSwing) * 0.3;
      npc.leg2.rotation.x = -Math.sin(npc.legSwing) * 0.3;
    }

    // Bob
    npc.group.position.y = Math.sin(npc.legSwing * 2) * 0.03;
  }
}

// ── Fire Update ──
function updateFires(delta) {
  for (const fire of fireParticles) {
    fire.timer += delta;
    const children = fire.group.children;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child.type === 'Mesh') {
        const flicker = Math.sin(fire.timer * 3 + i * 2) * 0.3 + 0.7;
        child.material.opacity = (0.5 + Math.random() * 0.5) * flicker;
        child.position.y = (Math.sin(fire.timer * 2 + i) * 0.2 + 0.5) * 2;
        child.scale.x = 1 + Math.sin(fire.timer * 2 + i * 1.5) * 0.2;
        child.scale.z = 1 + Math.sin(fire.timer * 2 + i * 1.5 + 1) * 0.2;
      }
    }
    if (fire.light) {
      fire.light.intensity = 0.5 + Math.sin(fire.timer * 4) * 0.5;
    }
  }
}

// ── HUD ──
function updateHUD() {
  healthFill.style.width = Math.max(0, playerHealth) + '%';
  radFill.style.width = radiation + '%';
  thirstFill.style.width = Math.max(0, thirst) + '%';
  staminaFill.style.width = stamina + '%';
  healthText.textContent = Math.round(Math.max(0, playerHealth));
  radText.textContent = Math.round(radiation);
  thirstText.textContent = Math.round(Math.max(0, thirst));

  hudTime.textContent = getFormattedTime();
  hudDay.textContent = `Day ${getGameDay()} — August 6-7, 1945`;

  // Location
  const dist = Math.sqrt(camera.position.x ** 2 + camera.position.z ** 2);
  if (dist < 300) hudLoc.textContent = '▲ Hypocenter zone — extreme danger';
  else if (dist < 500) hudLoc.textContent = '● Central district — heavy damage';
  else if (dist < 1000) hudLoc.textContent = '● Inner city — severe damage';
  else if (dist < 1500) hudLoc.textContent = '○ City outskirts — moderate damage';
  else hudLoc.textContent = '○ Suburbs — light damage';

  // Effects
  let effectText = '';
  if (isBlinded) effectText += '⚠ BLINDED ';
  if (radiation > 30) effectText += '⚠ RADIATION SICKNESS ';
  else if (radiation > 10) effectText += '⚠ RADIATION EXPOSURE ';
  if (thirst <= 20) effectText += '⚠ DEHYDRATION ';
  if (effectText === '') effectText = '● OK';
  hudEffects.textContent = effectText;
}

let notificationTimeout = null;
function showNotification(text) {
  notification.textContent = text;
  notification.classList.remove('hidden');
  notification.style.opacity = '1';
  notification.style.visibility = 'visible';
  if (notificationTimeout) clearTimeout(notificationTimeout);
  notificationTimeout = setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => { notification.style.visibility = 'hidden'; }, 500);
  }, 4000);
}

// ── Death / Win ──
function die() {
  if (gameEnded) return;
  gameEnded = true;
  controls.unlock();

  if (deathTitle.textContent === 'YOU DIED') {
    if (radiation > 50) {
      deathTitle.textContent = 'RADIATION POISONING';
      deathCause.textContent = 'Acute radiation syndrome';
      deathDesc.textContent = 'The initial radiation was lethal within 1km of the hypocenter. Most exposed died within days or weeks from radiation sickness — destruction of bone marrow, internal bleeding, and organ failure.';
    } else if (thirst <= 0) {
      deathTitle.textContent = 'DEHYDRATION';
      deathCause.textContent = 'You died of thirst';
      deathDesc.textContent = 'With the water system destroyed and fires raging, finding clean water was nearly impossible. Many survivors died from dehydration in the days after the bombing.';
    } else if (effects.includes('fire_burns')) {
      deathTitle.textContent = 'BURNED ALIVE';
      deathCause.textContent = 'The firestorm consumed you';
      deathDesc.textContent = 'The bombing ignited a massive firestorm that swept through the city. Thousands who survived the initial blast perished in the flames.';
    } else if (nearBlast) {
      deathTitle.textContent = 'BLAST INJURIES';
      deathCause.textContent = 'The shockwave was too much';
      deathDesc.textContent = 'The blast wave from the atomic bomb caused catastrophic injuries — collapsed lungs, internal hemorrhaging, and crushing trauma. Within 1km, survival was unlikely.';
    } else {
      deathTitle.textContent = 'YOUR BODY GAVE OUT';
      deathCause.textContent = 'Injuries and trauma';
      deathDesc.textContent = 'The combination of blast injuries, burns, radiation, and lack of medical care proved too much. You join the tens of thousands who died in the aftermath.';
    }
  }

  deathScreen.classList.remove('hidden');
}

function winGame() {
  if (gameEnded) return;
  gameEnded = true;
  controls.unlock();
  winScreen.classList.remove('hidden');

  // Calculate lasting effects based on what happened
  const list = effectsList;
  list.innerHTML = '';

  const effs = [];

  if (flashExposure) {
    effs.push('Partial vision loss from looking at the atomic flash — you face years of visual impairment');
  }
  if (radiation > 30) {
    effs.push('Chronic radiation sickness — increased cancer risk, fatigue, and weakened immune system for the rest of your life');
  } else if (radiation > 10) {
    effs.push('Elevated radiation exposure — higher lifetime cancer risk, possible genetic effects');
  }
  if (effects.includes('severe_burns') || effects.includes('fire_burns')) {
    effs.push('Severe burn scarring (keloids) — painful and disfiguring scars that may persist for decades');
  }
  if (effects.includes('blast_injuries')) {
    effs.push('Blast-related injuries — shrapnel wounds, broken bones, and internal injuries that require long recovery');
  }
  if (effects.includes('dehydration')) {
    effs.push('Chronic kidney issues from severe dehydration during the aftermath');
  }
  if (thirst < 30) {
    effs.push('Survived with severe dehydration — lasting weakness and organ stress');
  }
  if (playerHealth < 30) {
    effs.push('Critical injuries — you will carry the physical and psychological scars of August 6 for the rest of your life');
  }
  if (playerHealth > 70) {
    effs.push('Miraculously light injuries — but the psychological trauma of what you witnessed will never fade');
  }

  if (effs.length === 0) {
    effs.push('You survived with minimal immediate physical effects — but the emotional and societal impact of the bombing is immeasurable');
  }

  effs.push('The bombings of Hiroshima and Nagasaki remain the only use of nuclear weapons in war. By the end of 1945, an estimated 140,000 people had died in Hiroshima.');

  for (const e of effs) {
    const li = document.createElement('li');
    li.textContent = e;
    list.appendChild(li);
  }
}

// ── Main Loop ──
function animate() {
  if (gameState !== 'playing') return;
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.05);

  if (!gameEnded) {
    updateGame(delta);
    updateNPCs(delta);
    updateFires(delta);
  }

  renderer.render(scene, camera);
}

// ── Start Game ──
function startGame() {
  hideAllScreens();
  gameOverlay.classList.add('hidden');
  if (gameCanvas) {
    gameCanvas.style.display = 'none';
    document.body.removeChild(gameCanvas);
  }

  // Clean up previous game state
  if (scene) {
    // Dispose of Three.js objects
    scene.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });
  }
  scene = null;
  controls = null;
  npcs = [];
  buildings = [];
  fireParticles = [];

  initGame();
}

// ── Start ──
showHome();
