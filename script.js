const video = document.getElementById('bgVideo');
const canvas = document.getElementById('bgCanvas');
const ctx = canvas.getContext('2d');
let W, H;
let audioCtx = null;

// ── video background ──
video.src = 'https://archive.org/download/TaleofTw1946/TaleofTw1946_512kb.mp4';
video.playbackRate = 0.35;

video.addEventListener('canplay', () => {
    video.play().catch(() => {});
});

// ── canvas particles overlay ──
function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

const ashes = [];
for (let i = 0; i < 150; i++) {
    ashes.push({
        x: Math.random() * W, y: -Math.random() * H,
        s: Math.random() * 3 + 1.5,
        sy: Math.random() * 0.3 + 0.05,
        sx: (Math.random() - 0.5) * 0.15,
        op: Math.random() * 0.4 + 0.2,
        d: Math.random() * 10
    });
}

const embers = [];
for (let i = 0; i < 10; i++) {
    embers.push({
        x: Math.random() * W, y: H + 5,
        s: Math.random() * 3 + 1.5,
        sy: Math.random() * 0.35 + 0.1,
        life: Math.random() * 500 + 200,
        ml: 0
    });
    embers[i].ml = embers[i].life;
}

function draw() {
    ctx.clearRect(0, 0, W, H);

    for (const a of ashes) {
        a.y += a.sy;
        a.x += a.sx + Math.sin(a.y * 0.005 + a.d) * 0.25;
        if (a.y > H + 5) { a.x = Math.random() * W; a.y = -Math.random() * H; }
        if (a.x < -10) a.x = W + 10;
        if (a.x > W + 10) a.x = -10;
        ctx.fillStyle = `rgba(180,160,140,${a.op})`;
        ctx.fillRect(a.x, a.y, a.s, a.s * 0.6);
    }

    for (const e of embers) {
        e.y -= e.sy;
        e.x += (Math.random() - 0.5) * 0.3;
        e.life--;
        if (e.life <= 0 || e.y < -10) {
            e.x = Math.random() * W; e.y = H + 5;
            e.life = Math.random() * 500 + 200; e.ml = e.life;
        }
        const r = e.life / e.ml;
        let op = 0.7;
        if (r < 0.3) op = (r / 0.3) * 0.7;
        if (r > 0.7) op = ((1 - r) / 0.3) * 0.7;
        ctx.save();
        ctx.shadowColor = '#ff8844';
        ctx.shadowBlur = 15;
        ctx.fillStyle = `rgba(255,130,50,${op})`;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.s, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    requestAnimationFrame(draw);
}
draw();

// audio
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
