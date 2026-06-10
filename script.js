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

// ── character customization ──
const characters = [
    { id: 'hiroshi', name: 'Hiroshi', desc: 'civilian' },
    { id: 'kenji', name: 'Kenji', desc: 'soldier' },
    { id: 'yuki', name: 'Yuki', desc: 'child' },
    { id: 'tanaka', name: 'Dr. Tanaka', desc: 'doctor' },
];

let selectedCharacter = 'hiroshi';
let gridBuilt = false;

function drawPortrait(canvas, charId) {
    const c = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    c.clearRect(0, 0, w, h);
    const cx = w / 2;

    switch (charId) {
        case 'hiroshi':
            c.fillStyle = '#b8a090';
            c.beginPath(); c.arc(cx, 14, 11, 0, Math.PI * 2); c.fill();
            c.fillStyle = '#3a2e24';
            c.beginPath(); c.arc(cx, 14, 11, Math.PI, 0); c.fill();
            c.fillStyle = '#5a4a3a';
            c.fillRect(cx - 13, 24, 26, 27);
            c.fillStyle = '#3a3028';
            c.fillRect(cx - 8, 51, 7, 39);
            c.fillRect(cx + 1, 51, 7, 39);
            c.fillStyle = '#4a3a2e';
            c.fillRect(0, 24, 15, 25);
            c.fillRect(55, 24, 15, 25);
            break;
        case 'kenji':
            c.fillStyle = '#b8a090';
            c.beginPath(); c.arc(cx, 14, 11, 0, Math.PI * 2); c.fill();
            c.fillStyle = '#4a5a3a';
            c.beginPath(); c.arc(cx, 14, 12, Math.PI, 0); c.fill();
            c.fillRect(cx - 6, 12, 12, 5);
            c.fillStyle = '#5a6a4a';
            c.fillRect(cx - 15, 24, 30, 26);
            c.fillRect(0, 24, 15, 23);
            c.fillRect(55, 24, 15, 23);
            c.fillStyle = '#3a3a2a';
            c.fillRect(cx - 8, 50, 7, 40);
            c.fillRect(cx + 1, 50, 7, 40);
            break;
        case 'yuki':
            c.fillStyle = '#b8a090';
            c.beginPath(); c.arc(cx, 13, 10, 0, Math.PI * 2); c.fill();
            c.fillStyle = '#3a2e24';
            c.beginPath(); c.arc(cx - 4, 11, 3, 0, Math.PI * 2); c.fill();
            c.beginPath(); c.arc(cx + 4, 11, 3, 0, Math.PI * 2); c.fill();
            c.fillStyle = '#6a5a4a';
            c.fillRect(cx - 11, 22, 22, 19);
            c.fillStyle = '#4a3a2e';
            c.fillRect(cx - 7, 41, 6, 30);
            c.fillRect(cx + 1, 41, 6, 30);
            c.fillStyle = '#5a4a3a';
            c.fillRect(2, 22, 12, 18);
            c.fillRect(56, 22, 12, 18);
            break;
        case 'tanaka':
            c.fillStyle = '#b8a090';
            c.beginPath(); c.arc(cx, 14, 11, 0, Math.PI * 2); c.fill();
            c.fillStyle = '#7a7a72';
            c.fillRect(cx - 13, 24, 26, 28);
            c.fillStyle = 'rgba(140,130,120,0.35)';
            c.fillRect(4, 24, 62, 28);
            c.fillStyle = '#3a3632';
            c.fillRect(cx - 8, 52, 7, 38);
            c.fillRect(cx + 1, 52, 7, 38);
            c.fillRect(0, 24, 15, 25);
            c.fillRect(55, 24, 15, 25);
            c.fillStyle = '#9a3020';
            c.fillRect(cx - 3, 32, 6, 12);
            c.fillRect(cx - 7, 36, 14, 4);
            break;
    }
}

function buildCharGrid() {
    const grid = document.getElementById('charGrid');
    if (!grid || gridBuilt) return;
    gridBuilt = true;
    for (const ch of characters) {
        const card = document.createElement('div');
        card.className = 'char-card';
        card.dataset.charId = ch.id;

        const port = document.createElement('canvas');
        port.className = 'char-portrait';
        port.width = 70;
        port.height = 90;
        drawPortrait(port, ch.id);

        const name = document.createElement('div');
        name.className = 'char-name';
        name.textContent = ch.name;

        const desc = document.createElement('div');
        desc.className = 'char-desc';
        desc.textContent = ch.desc;

        card.appendChild(port);
        card.appendChild(name);
        card.appendChild(desc);

        card.addEventListener('click', () => {
            document.querySelectorAll('.char-card').forEach(e => e.classList.remove('selected'));
            card.classList.add('selected');
            selectedCharacter = ch.id;
        });

        if (ch.id === selectedCharacter) card.classList.add('selected');

        grid.appendChild(card);
    }
}

// ── navigation ──
function showCustomization() {
    try {
        if (!audioCtx) initAudio();
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
        buildCharGrid();
        document.getElementById('homeScreen').classList.add('hidden');
        document.getElementById('customizationScreen').classList.remove('hidden');
    } catch (_) {
        // fallback: go to black screen
        showBlack();
    }
}

function showHome() {
    document.getElementById('customizationScreen').classList.add('hidden');
    document.getElementById('blackScreen').classList.add('hidden');
    document.getElementById('homeScreen').classList.remove('hidden');
}

function showBlack() {
    try {
        if (!audioCtx) initAudio();
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
        document.getElementById('homeScreen').classList.add('hidden');
        document.getElementById('blackScreen').classList.remove('hidden');
    } catch (_) {}
}

document.getElementById('blackScreen').addEventListener('click', function () {
    this.classList.add('hidden');
    document.getElementById('homeScreen').classList.remove('hidden');
});

document.addEventListener('click', function firstClick() {
    if (!audioCtx) initAudio();
    document.removeEventListener('click', firstClick);
}, { once: true });
