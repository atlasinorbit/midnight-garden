const canvas = document.getElementById('garden');
const ctx = canvas.getContext('2d');
const saveButton = document.getElementById('saveButton');
const forgetButton = document.getElementById('forgetButton');
const statusLine = document.getElementById('statusLine');

const DPR = Math.min(window.devicePixelRatio || 1, 2);
const blooms = [];
const motes = [];
const stars = [];
const fireflies = [];
const memoryBlooms = [];
const STORAGE_KEY = 'midnight-garden-ritual';
const MAX_MEMORY_BLOOMS = 12;
const ritualSteps = [
  'the garden is listening',
  'first seed planted',
  'the roots are learning your hands',
  'the night keeps a small memory of this',
  'it feels more like a place now',
  'the garden would like you to linger',
];

let width = 0;
let height = 0;
let isPointerDown = false;
let lastPointer = null;
let hueBase = 180 + Math.random() * 90;
let suppressClickUntil = 0;
let sessionPlantings = 0;
let totalPlantings = 0;
let visits = 0;
let nightDepth = 0;
let recentAwakeningUntil = 0;

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function loadRitualState() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null');
    if (!saved) {
      visits = 1;
      persistRitualState();
      return;
    }

    totalPlantings = Number(saved.totalPlantings) || 0;
    visits = (Number(saved.visits) || 0) + 1;

    if (Array.isArray(saved.memoryBlooms)) {
      memoryBlooms.length = 0;
      for (const bloom of saved.memoryBlooms.slice(-MAX_MEMORY_BLOOMS)) {
        if (typeof bloom?.x !== 'number' || typeof bloom?.y !== 'number') continue;
        memoryBlooms.push({
          x: bloom.x,
          y: bloom.y,
          hue: typeof bloom.hue === 'number' ? bloom.hue : 220,
          radius: typeof bloom.radius === 'number' ? bloom.radius : 18,
        });
      }
    }

    persistRitualState();
  } catch {
    visits = 1;
  }
}

function persistRitualState() {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        totalPlantings,
        visits,
        memoryBlooms,
      }),
    );
  } catch {
    // ignore storage failures
  }
}

function updateRitualState() {
  const progress = Math.min(1, sessionPlantings / 24);
  const memoryWeight = Math.min(0.35, totalPlantings / 160);
  nightDepth = Math.min(1, progress * 0.85 + memoryWeight);

  let ritualIndex = 0;
  if (sessionPlantings >= 1) ritualIndex = 1;
  if (sessionPlantings >= 4) ritualIndex = 2;
  if (sessionPlantings >= 9) ritualIndex = 3;
  if (sessionPlantings >= 16) ritualIndex = 4;
  if (sessionPlantings >= 24) ritualIndex = 5;

  if (performance.now() < recentAwakeningUntil) {
    statusLine.textContent = 'an old bloom answered back';
    return;
  }

  if (sessionPlantings === 0 && totalPlantings > 0) {
    statusLine.textContent = `the garden remembers ${totalPlantings} prior bloom${totalPlantings === 1 ? '' : 's'}`;
    return;
  }

  let message = ritualSteps[ritualIndex];
  if (sessionPlantings > 0) {
    message += ` · ${sessionPlantings} planted tonight`;
  }
  if (memoryBlooms.length > 0 && sessionPlantings >= 4) {
    message += ` · ${memoryBlooms.length} traces remain`;
  } else if (visits > 1 && sessionPlantings < 4) {
    message += ` · visit ${visits}`;
  }
  statusLine.textContent = message;
}

function rememberBloom(bloom) {
  if (!width || !height || !bloom) return;
  memoryBlooms.push({
    x: bloom.x / width,
    y: bloom.y / height,
    hue: bloom.hue,
    radius: bloom.radius,
  });
  while (memoryBlooms.length > MAX_MEMORY_BLOOMS) {
    memoryBlooms.shift();
  }
}

function awakenNearbyMemory(x, y) {
  if (!width || !height || memoryBlooms.length === 0) return false;

  const threshold = 52;
  let awakened = false;
  for (const memoryBloom of memoryBlooms) {
    const mx = memoryBloom.x * width;
    const my = memoryBloom.y * height;
    const distance = Math.hypot(mx - x, my - y);
    if (distance > threshold) continue;

    addBloom(mx, my, { burst: true, hueShift: 28, radiusBoost: 8 });
    awakened = true;
  }

  if (awakened) {
    recentAwakeningUntil = performance.now() + 1600;
  }
  return awakened;
}

function recordPlanting(bloom, x, y) {
  sessionPlantings += 1;
  totalPlantings += 1;
  rememberBloom(bloom);
  awakenNearbyMemory(x, y);
  updateRitualState();
  persistRitualState();
}

function resize() {
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.floor(width * DPR);
  canvas.height = Math.floor(height * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  seedStars();
  seedFireflies();
  paintBackground();
}

function seedStars() {
  stars.length = 0;
  const count = Math.max(80, Math.floor((width * height) / 14000));
  const extra = Math.floor(nightDepth * 40);
  for (let i = 0; i < count + extra; i += 1) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.6 + 0.2,
      a: Math.random() * 0.5 + 0.15 + nightDepth * 0.08,
    });
  }
}

function seedFireflies() {
  fireflies.length = 0;
  const count = Math.max(10, Math.floor((width * height) / 90000)) + Math.floor(nightDepth * 8);
  for (let i = 0; i < count; i += 1) {
    fireflies.push({
      x: Math.random() * width,
      baseY: randomRange(height * 0.22, height * 0.82),
      size: randomRange(1.2, 2.8),
      phase: Math.random() * Math.PI * 2,
      speed: randomRange(0.003, 0.009),
      drift: randomRange(8, 30),
      hue: randomRange(58, 88),
      alpha: randomRange(0.16, 0.42) + nightDepth * 0.06,
    });
  }
}

function paintBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#07101a');
  sky.addColorStop(0.55, nightDepth > 0.45 ? '#0a1828' : '#091625');
  sky.addColorStop(1, '#03050a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  const moonX = width * 0.72;
  const moonY = height * 0.18;
  const moonGlow = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, width * (0.25 + nightDepth * 0.04));
  moonGlow.addColorStop(0, `rgba(145, 197, 255, ${0.16 + nightDepth * 0.06})`);
  moonGlow.addColorStop(1, 'rgba(145, 197, 255, 0)');
  ctx.fillStyle = moonGlow;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = `rgba(228, 240, 255, ${0.11 + nightDepth * 0.05})`;
  ctx.beginPath();
  ctx.arc(moonX, moonY, Math.min(width, height) * 0.055, 0, Math.PI * 2);
  ctx.fill();

  for (const star of stars) {
    ctx.fillStyle = `rgba(220,235,255,${Math.min(0.9, star.a)})`;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  }

  const haze = ctx.createLinearGradient(0, height * 0.45, 0, height * 0.82);
  haze.addColorStop(0, 'rgba(90, 130, 170, 0)');
  haze.addColorStop(1, `rgba(18, 34, 48, ${0.24 + nightDepth * 0.08})`);
  ctx.fillStyle = haze;
  ctx.fillRect(0, height * 0.36, width, height * 0.46);

  const hillBack = ctx.createLinearGradient(0, height * 0.62, 0, height);
  hillBack.addColorStop(0, 'rgba(14, 28, 29, 0.12)');
  hillBack.addColorStop(1, `rgba(8, 18, 17, ${0.88 + nightDepth * 0.06})`);
  ctx.fillStyle = hillBack;
  ctx.beginPath();
  ctx.moveTo(0, height);
  ctx.lineTo(0, height * 0.72);
  ctx.quadraticCurveTo(width * 0.18, height * 0.62, width * 0.38, height * 0.72);
  ctx.quadraticCurveTo(width * 0.6, height * 0.8, width * 0.82, height * 0.7);
  ctx.quadraticCurveTo(width * 0.92, height * 0.66, width, height * 0.74);
  ctx.lineTo(width, height);
  ctx.closePath();
  ctx.fill();

  const ground = ctx.createLinearGradient(0, height * 0.68, 0, height);
  ground.addColorStop(0, 'rgba(16, 30, 24, 0)');
  ground.addColorStop(1, `rgba(8, 20, 13, ${0.82 + nightDepth * 0.08})`);
  ctx.fillStyle = ground;
  ctx.fillRect(0, height * 0.58, width, height * 0.42);

  const vignette = ctx.createRadialGradient(
    width * 0.5,
    height * 0.48,
    height * 0.12,
    width * 0.5,
    height * 0.5,
    Math.max(width, height) * 0.7,
  );
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, `rgba(0, 0, 0, ${0.34 + nightDepth * 0.06})`);
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
}

function addBloom(x, y, { burst = false, hueShift = 0, radiusBoost = 0 } = {}) {
  const petals = Math.floor(randomRange(6, 10));
  const radius = (burst ? randomRange(18, 42) : randomRange(10, 24)) + radiusBoost;
  const hue = (hueBase + randomRange(-24, 24) + hueShift + (burst ? randomRange(10, 35) : 0) + 360) % 360;

  const bloom = {
    x,
    y,
    petals,
    radius,
    life: 1,
    glow: randomRange(8, 18),
    hue,
    tilt: Math.random() * Math.PI,
  };

  blooms.push(bloom);

  const moteCount = burst ? 18 : 10;
  for (let i = 0; i < moteCount; i += 1) {
    const angle = (Math.PI * 2 * i) / moteCount + randomRange(-0.25, 0.25);
    const speed = randomRange(0.35, burst ? 1.6 : 1.0);
    motes.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - randomRange(0.15, 0.45),
      life: 1,
      hue,
      size: randomRange(1.2, 3.4),
    });
  }

  return bloom;
}

function drawStem(fromX, fromY, toX, toY) {
  const midX = (fromX + toX) / 2 + randomRange(-12, 12);
  const midY = (fromY + toY) / 2 - randomRange(8, 32);

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineWidth = randomRange(0.8, 2.8);
  ctx.strokeStyle = `hsla(${(hueBase + randomRange(-10, 10) + 360) % 360}, 72%, 70%, 0.28)`;
  ctx.shadowBlur = 16;
  ctx.shadowColor = 'rgba(120,255,190,0.18)';
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.quadraticCurveTo(midX, midY, toX, toY);
  ctx.stroke();
  ctx.restore();

  if (Math.random() < 0.28) {
    addLeaf(midX, midY, Math.atan2(toY - fromY, toX - fromX) + randomRange(-1.1, 1.1));
  }
}

function addLeaf(x, y, angle) {
  const size = randomRange(8, 20);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const leaf = ctx.createLinearGradient(-size, 0, size, 0);
  leaf.addColorStop(0, 'rgba(108, 215, 160, 0.02)');
  leaf.addColorStop(0.5, 'rgba(142, 255, 200, 0.28)');
  leaf.addColorStop(1, 'rgba(108, 215, 160, 0.02)');
  ctx.fillStyle = leaf;
  ctx.beginPath();
  ctx.moveTo(-size, 0);
  ctx.quadraticCurveTo(0, -size * 0.55, size, 0);
  ctx.quadraticCurveTo(0, size * 0.55, -size, 0);
  ctx.fill();
  ctx.restore();
}

function scatterFromPointer(x, y, dx, dy) {
  const distance = Math.hypot(dx, dy);
  if (distance < 4) return;

  const steps = Math.max(1, Math.floor(distance / 14));
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    const px = x - dx + dx * t;
    const py = y - dy + dy * t;
    const rootY = height - randomRange(10, 50);
    const rootX = px + randomRange(-40, 40);
    drawStem(rootX, rootY, px, py);
    if (Math.random() < 0.55) addBloom(px, py);
  }
}

function drawBloomShape(x, y, bloom, alphaScale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((bloom.tilt ?? 0) + (1 - (bloom.life ?? 1)) * 0.7);
  ctx.globalAlpha = alphaScale;
  ctx.shadowBlur = bloom.glow ?? 14;
  ctx.shadowColor = `hsla(${bloom.hue}, 100%, 70%, 0.3)`;

  for (let i = 0; i < bloom.petals; i += 1) {
    const angle = (Math.PI * 2 * i) / bloom.petals;
    ctx.save();
    ctx.rotate(angle);
    const petal = ctx.createRadialGradient(0, 0, 0, bloom.radius * 0.62, 0, bloom.radius);
    petal.addColorStop(0, `hsla(${(bloom.hue + 30) % 360}, 100%, 82%, 0.95)`);
    petal.addColorStop(0.45, `hsla(${bloom.hue}, 90%, 70%, 0.82)`);
    petal.addColorStop(1, `hsla(${(bloom.hue + 80) % 360}, 100%, 70%, 0)`);
    ctx.fillStyle = petal;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(bloom.radius * 0.85, -bloom.radius * 0.38, bloom.radius, 0);
    ctx.quadraticCurveTo(bloom.radius * 0.85, bloom.radius * 0.38, 0, 0);
    ctx.fill();
    ctx.restore();
  }

  ctx.fillStyle = `hsla(${(bloom.hue + 35) % 360}, 100%, 92%, 0.95)`;
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(2.5, bloom.radius * 0.16), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawMemoryBloom(memoryBloom, index) {
  const x = memoryBloom.x * width;
  const y = memoryBloom.y * height;
  drawBloomShape(
    x,
    y,
    {
      petals: 7,
      radius: memoryBloom.radius * 0.78,
      hue: memoryBloom.hue,
      tilt: index * 0.27,
      glow: 8,
      life: 1,
    },
    0.1 + nightDepth * 0.08 + (index / Math.max(1, memoryBlooms.length)) * 0.025,
  );
}

function drawBloom(bloom) {
  drawBloomShape(bloom.x, bloom.y, bloom, Math.max(0, bloom.life));
}

function drawMote(mote) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, mote.life);
  ctx.fillStyle = `hsla(${mote.hue}, 100%, 75%, 0.95)`;
  ctx.shadowBlur = 12;
  ctx.shadowColor = `hsla(${mote.hue}, 100%, 75%, 0.45)`;
  ctx.beginPath();
  ctx.arc(mote.x, mote.y, mote.size, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawFirefly(firefly, time) {
  const pulse = (Math.sin(time * firefly.speed + firefly.phase) + 1) / 2;
  const x = firefly.x + Math.cos(time * firefly.speed * 0.35 + firefly.phase) * firefly.drift;
  const y = firefly.baseY + Math.sin(time * firefly.speed * 0.65 + firefly.phase) * (firefly.drift * 0.45);

  ctx.save();
  ctx.globalAlpha = firefly.alpha * (0.45 + pulse * 0.9);
  ctx.fillStyle = `hsla(${firefly.hue}, 100%, 72%, 0.95)`;
  ctx.shadowBlur = 18 + pulse * 18;
  ctx.shadowColor = `hsla(${firefly.hue}, 100%, 72%, 0.4)`;
  ctx.beginPath();
  ctx.arc(x, y, firefly.size + pulse * 0.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function animate(time = 0) {
  paintBackground();

  for (const firefly of fireflies) {
    drawFirefly(firefly, time);
  }

  memoryBlooms.forEach((memoryBloom, index) => drawMemoryBloom(memoryBloom, index));

  for (let i = blooms.length - 1; i >= 0; i -= 1) {
    const bloom = blooms[i];
    bloom.life -= 0.0035;
    if (bloom.life <= 0) {
      blooms.splice(i, 1);
      continue;
    }
    bloom.radius += 0.012;
    drawBloom(bloom);
  }

  for (let i = motes.length - 1; i >= 0; i -= 1) {
    const mote = motes[i];
    mote.x += mote.vx;
    mote.y += mote.vy;
    mote.vy += 0.003;
    mote.life -= 0.012;
    if (mote.life <= 0) {
      motes.splice(i, 1);
      continue;
    }
    drawMote(mote);
  }

  if (performance.now() >= recentAwakeningUntil && statusLine.textContent === 'an old bloom answered back') {
    updateRitualState();
  }

  requestAnimationFrame(animate);
}

function pointerPosition(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function plantAtPoint(point) {
  const bloom = addBloom(point.x, point.y, { burst: true });
  recordPlanting(bloom, point.x, point.y);
  seedStars();
  seedFireflies();
}

canvas.addEventListener('pointerdown', (event) => {
  suppressClickUntil = performance.now() + 250;
  isPointerDown = true;
  canvas.setPointerCapture(event.pointerId);
  lastPointer = pointerPosition(event);
  plantAtPoint(lastPointer);
});

canvas.addEventListener('pointermove', (event) => {
  if (!isPointerDown || !lastPointer) return;
  const point = pointerPosition(event);
  scatterFromPointer(point.x, point.y, point.x - lastPointer.x, point.y - lastPointer.y);
  lastPointer = point;
});

canvas.addEventListener('pointerup', () => {
  isPointerDown = false;
  lastPointer = null;
  hueBase = (hueBase + randomRange(18, 45)) % 360;
});

canvas.addEventListener('click', (event) => {
  if (performance.now() < suppressClickUntil) return;
  plantAtPoint(pointerPosition(event));
});

function clearGarden() {
  blooms.length = 0;
  motes.length = 0;
  updateRitualState();
  paintBackground();
}

function forgetGarden() {
  blooms.length = 0;
  motes.length = 0;
  memoryBlooms.length = 0;
  sessionPlantings = 0;
  totalPlantings = 0;
  visits = 1;
  nightDepth = 0;
  recentAwakeningUntil = 0;
  persistRitualState();
  seedStars();
  seedFireflies();
  statusLine.textContent = 'the garden has gone quiet again';
  paintBackground();
}

function saveImage() {
  const link = document.createElement('a');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  link.href = canvas.toDataURL('image/png');
  link.download = `midnight-garden-${stamp}.png`;
  link.click();
}

window.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() === 's') saveImage();
  if (event.key.toLowerCase() === 'c') clearGarden();
  if (event.key.toLowerCase() === 'x') forgetGarden();
});

saveButton.addEventListener('click', saveImage);
forgetButton.addEventListener('click', forgetGarden);
window.addEventListener('resize', resize);

loadRitualState();
updateRitualState();
resize();
animate();
