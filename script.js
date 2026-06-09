const canvas = document.getElementById('bgCanvas');
const ctx = canvas.getContext('2d');
let W, H;

function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    initRuins();
}
window.addEventListener('resize', resize);
resize();

// ── ruined skyline silhouette ──
let ruinsY = [];
function initRuins() {
    ruinsY = [];
    const count = Math.max(60, Math.floor(W / 7));
    for (let i = 0; i <= count; i++) {
        const x = (i / count) * W;
        const n1 = Math.sin(i * 0.3) * 25;
        const n2 = Math.sin(i * 0.12) * 18;
        const n3 = Math.sin(i * 0.05) * 30;
        const h = n1 + n2 + n3;
        ruinsY.push({ x, y: H - h - 20 - Math.random() * 10 });
    }
}

// ── smoke clouds (slow-moving background) ──
class Cloud {
    constructor() {
        this.x = Math.random() * W * 1.5 - W * 0.25;
        this.y = Math.random() * H * 0.4 + H * 0.05;
        this.r = Math.random() * 180 + 80;
        this.speed = Math.random() * 0.15 + 0.05;
        this.op = Math.random() * 0.06 + 0.02;
    }
    update() {
        this.x += this.speed;
        if (this.x > W + this.r + 100) {
            this.x = -this.r - 100;
            this.y = Math.random() * H * 0.4 + H * 0.05;
        }
    }
    draw() {
        const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r);
        g.addColorStop(0, `rgba(55,42,35,${this.op})`);
        g.addColorStop(0.4, `rgba(40,32,27,${this.op*0.6})`);
        g.addColorStop(1, `rgba(30,24,20,0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ── falling ash particles ──
class Ash {
    constructor() { this.reset(); }
    reset() {
        this.x = Math.random() * W;
        this.y = Math.random() * H - H;
        this.s = Math.random() * 2.5 + 0.5;
        this.sy = Math.random() * 0.2 + 0.03;
        this.sx = (Math.random() - 0.5) * 0.12;
        this.op = Math.random() * 0.25 + 0.08;
        this.d = Math.random() * 10;
    }
    update() {
        this.y += this.sy;
        this.x += this.sx + Math.sin(this.y * 0.005 + this.d) * 0.2;
        if (this.y > H + 5) this.reset();
        if (this.x < -10) this.x = W + 10;
        if (this.x > W + 10) this.x = -10;
    }
    draw() {
        ctx.fillStyle = `rgba(80,68,58,${this.op})`;
        ctx.fillRect(this.x, this.y, this.s, this.s * 0.6);
    }
}

// ── embers floating upward ──
class Ember {
    constructor() { this.reset(); }
    reset() {
        this.x = Math.random() * W;
        this.y = H + 5;
        this.s = Math.random() * 2 + 1;
        this.sy = Math.random() * 0.25 + 0.08;
        this.life = Math.random() * 500 + 200;
        this.ml = this.life;
    }
    update() {
        this.y -= this.sy;
        this.x += (Math.random() - 0.5) * 0.25;
        this.life--;
        if (this.life <= 0 || this.y < -10) this.reset();
    }
    get op() {
        const r = this.life / this.ml;
        if (r < 0.3) return (r / 0.3) * 0.5;
        if (r > 0.7) return ((1 - r) / 0.3) * 0.5;
        return 0.5;
    }
    draw() {
        ctx.save();
        ctx.shadowColor = '#ff7733';
        ctx.shadowBlur = 10;
        ctx.fillStyle = `rgba(255,110,40,${this.op})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.s, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// ── init particles ──
const clouds = Array.from({length: 6}, () => new Cloud());
const ashes = Array.from({length: 180}, () => new Ash());
const embers = Array.from({length: 10}, () => new Ember());
let time = 0;

// ── draw functions ──
function drawBg() {
    time += 0.002;
    const p = Math.sin(time) * 0.02 + 0.98;

    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, `rgb(${20*p|0},${16*p|0},${14*p|0})`);
    g.addColorStop(0.4, `rgb(12,10,8)`);
    g.addColorStop(1, `rgb(6,4,3)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    const gg = ctx.createRadialGradient(W*0.5, H*0.5, 0, W*0.5, H*0.5, W*0.4);
    gg.addColorStop(0, `rgba(80,35,15,${0.04*p})`);
    gg.addColorStop(0.5, `rgba(50,22,10,${0.02})`);
    gg.addColorStop(1, `rgba(20,10,5,0)`);
    ctx.fillStyle = gg;
    ctx.fillRect(0, 0, W, H);
}

function drawRuins() {
    ctx.fillStyle = 'rgba(8,6,5,0.65)';
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (const p of ruinsY) ctx.lineTo(p.x, p.y);
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(5,4,3,0.4)';
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let i = 0; i < ruinsY.length; i += 2) {
        ctx.lineTo(ruinsY[i].x, ruinsY[i].y + 15);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
}

function animate() {
    drawBg();
    for (const c of clouds) { c.update(); c.draw(); }
    drawRuins();
    for (const a of ashes) { a.update(); a.draw(); }
    for (const e of embers) { e.update(); e.draw(); }
    requestAnimationFrame(animate);
}
animate();

// ── audio: depressing ambient drone ──
let audioCtx = null;

function initAudio() {
    if (audioCtx) return;
    try {
        const ac = new (window.AudioContext || window.webkitAudioContext)();
        audioCtx = ac;

        const o1 = ac.createOscillator();
        o1.type = 'sawtooth'; o1.frequency.value = 55;
        const f1 = ac.createBiquadFilter();
        f1.type = 'lowpass'; f1.frequency.value = 150; f1.Q.value = 2;
        const g1 = ac.createGain(); g1.gain.value = 0.035;
        o1.connect(f1); f1.connect(g1); g1.connect(ac.destination);
        o1.start();

        const o2 = ac.createOscillator();
        o2.type = 'sawtooth'; o2.frequency.value = 55.4;
        const f2 = ac.createBiquadFilter();
        f2.type = 'lowpass'; f2.frequency.value = 150; f2.Q.value = 2;
        const g2 = ac.createGain(); g2.gain.value = 0.035;
        o2.connect(f2); f2.connect(g2); g2.connect(ac.destination);
        o2.start();

        const o3 = ac.createOscillator();
        o3.type = 'sine'; o3.frequency.value = 27.5;
        const g3 = ac.createGain(); g3.gain.value = 0.05;
        o3.connect(g3); g3.connect(ac.destination);
        o3.start();

        const buf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        const ns = ac.createBufferSource();
        ns.buffer = buf; ns.loop = true;
        const nf = ac.createBiquadFilter();
        nf.type = 'lowpass'; nf.frequency.value = 300;
        const ng = ac.createGain(); ng.gain.value = 0.015;
        ns.connect(nf); nf.connect(ng); ng.connect(ac.destination);
        ns.start();

        const lfo = ac.createOscillator();
        lfo.type = 'sine'; lfo.frequency.value = 0.04;
        const lg = ac.createGain(); lg.gain.value = 40;
        lfo.connect(lg); lg.connect(f1.frequency); lg.connect(f2.frequency);
        lfo.start();
    } catch (_) {}
}

// ── navigation ──
function showBlack() {
    if (!audioCtx) initAudio();
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    document.getElementById('homeScreen').classList.add('hidden');
    document.getElementById('blackScreen').classList.remove('hidden');
}

document.getElementById('blackScreen').addEventListener('click', function () {
    this.classList.add('hidden');
    document.getElementById('homeScreen').classList.remove('hidden');
});

document.addEventListener('click', function firstClick() {
    if (!audioCtx) initAudio();
    document.removeEventListener('click', firstClick);
}, { once: true });
