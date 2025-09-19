import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { RoundedBoxGeometry } from 'https://unpkg.com/three@0.160.0/examples/jsm/geometries/RoundedBoxGeometry.js';

// DOM elements
const container = document.getElementById('canvas-container');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('high-score');
const centerMsg = document.getElementById('center-message');
const centerMsgTitle = document.getElementById('message-title');
const restartBtn = document.getElementById('restart-btn');

// Game constants
const GRID_CELLS = 24; // 24x24
const CELL_SIZE = 1;
const HALF = GRID_CELLS / 2;
const START_LENGTH = 4;
const BASE_SPEED = 6; // moves per second
const MAX_SPEED = 14;

// Three.js core
let scene, camera, renderer;
let gridHelper, ground;
let ambientLight, hemiLight, dirLight;

// Game entities (3D)
let snakeMeshes = [];
let foodMesh = null;
let snakeGeometry, headMaterial, bodyMaterial;

// Game state
let snake = [];
let direction = { x: 1, y: 0 };
let inputQueue = [];
let food = null;
let isPaused = false;
let isGameOver = false;
let score = 0;
let highScore = Number(localStorage.getItem('snakeHighScore3D') || '0');
let movesPerSecond = BASE_SPEED;

// Time
let lastTime = 0;
let accumulator = 0;

// Utilities
function setHighScore(value) {
  highScore = Math.max(highScore, value);
  localStorage.setItem('snakeHighScore3D', String(highScore));
}

function updateHud() {
  scoreEl.textContent = String(score);
  highScoreEl.textContent = String(highScore);
}

function showCenterMessage(text) {
  centerMsgTitle.textContent = text;
  centerMsg.classList.remove('hidden');
}

function hideCenterMessage() {
  centerMsg.classList.add('hidden');
}

function cellToWorld(x, y) {
  // Center grid at origin, y is up
  return new THREE.Vector3(
    (x - HALF + 0.5) * CELL_SIZE,
    0.5,
    (y - HALF + 0.5) * CELL_SIZE
  );
}

function pickBlueByIndex(index, total) {
  // Gradient in blue tones head -> tail
  const t = total <= 1 ? 0 : index / (total - 1);
  const hue = 210 + 10 * (1 - t); // 210..220
  const sat = 0.65 - 0.15 * t;    // 0.65..0.5
  const lig = 0.56 - 0.18 * t;    // 0.56..0.38
  const color = new THREE.Color().setHSL(hue / 360, sat, lig);
  return color;
}

function createScene() {
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a1222, 0.035);

  const aspect = container.clientWidth / container.clientHeight;
  camera = new THREE.PerspectiveCamera(55, aspect, 0.1, 1000);
  const camDist = GRID_CELLS * 0.9;
  camera.position.set(0, camDist, camDist);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // Lights
  ambientLight = new THREE.AmbientLight(0x6b9cff, 0.25);
  scene.add(ambientLight);

  hemiLight = new THREE.HemisphereLight(0x6ba6ff, 0x0a1222, 0.6);
  hemiLight.position.set(0, 1, 0);
  scene.add(hemiLight);

  dirLight = new THREE.DirectionalLight(0xb8d3ff, 0.75);
  dirLight.position.set(8, 16, 10);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(1024, 1024);
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 80;
  scene.add(dirLight);

  // Ground plane
  const groundSize = GRID_CELLS * CELL_SIZE;
  const groundGeo = new THREE.PlaneGeometry(groundSize, groundSize);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x102a43, roughness: 0.95, metalness: 0.05 });
  ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Grid helper (subtle lines)
  gridHelper = new THREE.GridHelper(groundSize, GRID_CELLS, 0x2b6cb0, 0x1b3a66);
  gridHelper.material.opacity = 0.35;
  gridHelper.material.transparent = true;
  scene.add(gridHelper);

  // Geometries and materials
  snakeGeometry = new RoundedBoxGeometry(0.9, 0.9, 0.9, 4, 0.14);
  headMaterial = new THREE.MeshStandardMaterial({ color: 0x4aa3ff, emissive: 0x134d9a, emissiveIntensity: 0.25, roughness: 0.5, metalness: 0.2 });
  bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x1b3a66, emissive: 0x0a2344, emissiveIntensity: 0.2, roughness: 0.65, metalness: 0.15 });

  // Food
  const foodGeo = new THREE.SphereGeometry(0.45, 24, 24);
  const foodMat = new THREE.MeshStandardMaterial({ color: 0x4fd1c5, emissive: 0x1f9fa0, emissiveIntensity: 0.35, roughness: 0.35, metalness: 0.35 });
  foodMesh = new THREE.Mesh(foodGeo, foodMat);
  foodMesh.castShadow = true;
  foodMesh.receiveShadow = false;
  scene.add(foodMesh);
}

function onResize() {
  const width = container.clientWidth;
  const height = container.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function resetGame() {
  // Clear snake meshes from scene
  for (const m of snakeMeshes) scene.remove(m);
  snakeMeshes = [];

  // Centered start
  const startX = Math.floor(GRID_CELLS / 2) - Math.floor(START_LENGTH / 2);
  const startY = Math.floor(GRID_CELLS / 2);
  snake = [];
  for (let i = 0; i < START_LENGTH; i++) {
    snake.push({ x: startX + i, y: startY });
  }
  direction = { x: 1, y: 0 };
  inputQueue = [];
  isPaused = false;
  isGameOver = false;
  score = 0;
  movesPerSecond = BASE_SPEED;
  placeFood();
  updateHud();
  hideCenterMessage();
  syncMeshesToSnake();
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function placeFood() {
  let x = 0, y = 0, tries = 0;
  do {
    x = randomInt(0, GRID_CELLS - 1);
    y = randomInt(0, GRID_CELLS - 1);
    tries++;
  } while (snake.some(s => s.x === x && s.y === y) && tries < 10000);
  food = { x, y };
  const wp = cellToWorld(food.x, food.y);
  foodMesh.position.copy(wp);
}

function willReverse(curr, next) {
  return curr.x + next.x === 0 && curr.y + next.y === 0;
}

function enqueueDirectionFromKey(code) {
  let next = null;
  if (code === 'ArrowUp' || code === 'KeyW') next = { x: 0, y: -1 };
  else if (code === 'ArrowDown' || code === 'KeyS') next = { x: 0, y: 1 };
  else if (code === 'ArrowLeft' || code === 'KeyA') next = { x: -1, y: 0 };
  else if (code === 'ArrowRight' || code === 'KeyD') next = { x: 1, y: 0 };
  if (!next) return;
  // Limit to one input per tick for precision
  if (inputQueue.length === 0 && !willReverse(direction, next)) {
    inputQueue.push(next);
  }
}

function tick() {
  if (isPaused || isGameOver) return;

  // Process one queued input per tick
  if (inputQueue.length > 0) {
    direction = inputQueue.shift();
  }

  const head = snake[snake.length - 1];
  const newHead = { x: head.x + direction.x, y: head.y + direction.y };

  // Wall collision
  if (newHead.x < 0 || newHead.x >= GRID_CELLS || newHead.y < 0 || newHead.y >= GRID_CELLS) {
    gameOver();
    return;
  }

  // Self collision
  if (snake.some(seg => seg.x === newHead.x && seg.y === newHead.y)) {
    gameOver();
    return;
  }

  // Move
  snake.push(newHead);
  let ate = false;
  if (newHead.x === food.x && newHead.y === food.y) {
    ate = true;
    score += 1;
    setHighScore(score);
    // Speed up slightly every few points
    movesPerSecond = Math.min(MAX_SPEED, BASE_SPEED + Math.floor(score / 4));
    placeFood();
  }
  if (!ate) {
    snake.shift(); // remove tail
  }

  // Win condition
  if (snake.length >= GRID_CELLS * GRID_CELLS) {
    showCenterMessage('Du vant!');
    isGameOver = true;
  }

  syncMeshesToSnake();
  updateHud();
}

function syncMeshesToSnake() {
  // Ensure enough meshes
  while (snakeMeshes.length < snake.length) {
    const m = new THREE.Mesh(snakeGeometry, bodyMaterial.clone());
    m.castShadow = true;
    m.receiveShadow = false;
    scene.add(m);
    snakeMeshes.push(m);
  }
  // Position meshes and color gradient
  for (let i = 0; i < snakeMeshes.length; i++) {
    const mesh = snakeMeshes[i];
    if (i < snake.length) {
      const seg = snake[i];
      const wp = cellToWorld(seg.x, seg.y);
      mesh.visible = true;
      mesh.position.copy(wp);
      const color = pickBlueByIndex(i, snake.length);
      mesh.material.color.copy(color);
      mesh.material.emissive.copy(color.clone().multiplyScalar(0.35));

      // Scale head slightly larger for depth emphasis
      const isHead = i === snake.length - 1;
      mesh.scale.setScalar(isHead ? 1.06 : 1.0);
      if (isHead) {
        mesh.material.roughness = 0.45;
        mesh.material.metalness = 0.25;
      } else {
        mesh.material.roughness = 0.6;
        mesh.material.metalness = 0.18;
      }
    } else {
      mesh.visible = false;
    }
  }
}

function gameOver() {
  isGameOver = true;
  showCenterMessage('Spillet er over');
}

function togglePause() {
  if (isGameOver) return;
  isPaused = !isPaused;
  if (isPaused) showCenterMessage('Pause');
  else hideCenterMessage();
}

function animate(ts) {
  const dt = Math.min(0.1, (ts - lastTime) / 1000 || 0);
  lastTime = ts;

  // Food idle animation
  const bob = Math.sin(ts * 0.004) * 0.05;
  foodMesh.position.y = 0.5 + bob;

  const stepInterval = 1.0 / movesPerSecond;
  accumulator += dt;
  while (accumulator >= stepInterval) {
    accumulator -= stepInterval;
    tick();
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

// Input
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'KeyP') {
    e.preventDefault();
    togglePause();
    return;
  }
  if (e.code === 'KeyR') {
    e.preventDefault();
    resetGame();
    return;
  }
  enqueueDirectionFromKey(e.code);
});

restartBtn.addEventListener('click', () => {
  resetGame();
});

window.addEventListener('resize', onResize);

// Bootstrap
createScene();
onResize();
resetGame();
updateHud();
requestAnimationFrame(animate);

