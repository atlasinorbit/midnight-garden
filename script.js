const canvas = document.getElementById('garden');
const ctx = canvas.getContext('2d');
const saveButton = document.getElementById('saveButton');

const DPR = Math.min(window.devicePixelRatio || 1, 2);
const blooms = [];
const motes = [];
const stars = [];
let width = 0;
let height = 0;
let isPointerDown = false;
let lastPointer = null;
let hueBase = 180 + Math.random() * 90;

function resize() {
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.floor(width * DPR);
  canvas.height = Math.floor(height * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  seedStars();
  paintBackground();
}

function seedStars() {
  stars.length = 0;
  const count = Math.max(80, Math.floor((width * height) / 14000));
  for (let i = 0; i < count; i += 1) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.6 + 0.2,
      a: Math.random() * 0.5 + 0.15,
    });
  }
}

function paintBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#07101a');
  sky.addColorStop(0.55, '#091625');
  sky.addColorStop(1, '#03050a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  const moonGlow = ctx.createRadialGradient(width * 0.72, height * 0.18, 0, width * 0.72, height * 0.18, width * 0.25);
  moonGlow.addColorStop(0, 'rgba(145, 197, 255, 0.16)');
  moonGlow.addColorStop(1, 'rgba(145, 197, 255, 0)');
  ctx.fillStyle = moonGlow;
  ctx.fillRect(0, 0, width, height);

  for (const star of stars) {
    ctx.fillStyle = `rgba(220,235,255,${star.a})`;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  }

  const ground = ctx.createLinearGradient(0, height * 0.68, 0, height);
  ground.addColorStop(0, 'rgba(16, 30, 24, 0)');
  ground.addColorStop(1, 'rgba(8, 20, 13, 0.82)');
  ctx.fillStyle = ground;
  ctx.fillRect(0, height * 0.58, width, height * 0.42);
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function addBloom(x, y, burst = false) {
  const petals = Math.floor(randomRange(6, 10));
  const radius = burst ? randomRange(18, 42) : randomRange(10, 24);
  const hue = (hueBase + randomRange(-24, 24) + (burst ? randomRange(10, 35) : 0) + 360) % 360;

  blooms.push({
    x,
    y,
    petals,
    radius,
    life: 1,
    glow: randomRange(8, 18),
    hue,
    tilt: Math.random() * Math.PI,
  });

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
    if (Math.random() < 0.55) addBloom(px, py, false);
  }
}

function drawBloom(bloom) {
  ctx.save();
  ctx.translate(bloom.x, bloom.y);
  ctx.rotate(bloom.tilt + (1 - bloom.life) * 0.7);
  ctx.globalAlpha = bloom.life;
  ctx.shadowBlur = bloom.glow;
  ctx.shadowColor = `hsla(${bloom.hue}, 100%, 70%, 0.35)`;

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

function drawMote(mote) {
  ctx.save();
  ctx.globalAlpha = mote.life;
  ctx.fillStyle = `hsla(${mote.hue}, 100%, 75%, 0.95)`;
  ctx.shadowBlur = 12;
  ctx.shadowColor = `hsla(${mote.hue}, 100%, 75%, 0.45)`;
  ctx.beginPath();
  ctx.arc(mote.x, mote.y, mote.size, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function animate() {
  paintBackground();

  for (let i = blooms.length - 1; i >= 0; i -= 1) {
    const bloom = blooms[i];
    bloom.life -= 0.0035;
    bloom.radius += 0.012;
    drawBloom(bloom);
    if (bloom.life <= 0) blooms.splice(i, 1);
  }

  for (let i = motes.length - 1; i >= 0; i -= 1) {
    const mote = motes[i];
    mote.x += mote.vx;
    mote.y += mote.vy;
    mote.vy += 0.003;
    mote.life -= 0.012;
    drawMote(mote);
    if (mote.life <= 0) motes.splice(i, 1);
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

canvas.addEventListener('pointerdown', (event) => {
  isPointerDown = true;
  canvas.setPointerCapture(event.pointerId);
  lastPointer = pointerPosition(event);
  addBloom(lastPointer.x, lastPointer.y, true);
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
  const point = pointerPosition(event);
  addBloom(point.x, point.y, true);
});

function clearGarden() {
  blooms.length = 0;
  motes.length = 0;
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
});

saveButton.addEventListener('click', saveImage);
window.addEventListener('resize', resize);

resize();
paintBackground();
animate();
