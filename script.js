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

function drawPortrait(canvas, charId) {
    const c = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    c.clearRect(0, 0, w, h);

    const cx = w / 2;
    const skin = '#b8a090';
    const dark = '#3a2e24';
    const mid = '#5a4838';

    function head(y) {
        c.fillStyle = skin;
        c.beginPath();
        c.arc(cx, y, w * 0.16, 0, Math.PI * 2);
        c.fill();
    }

    function body(y, bw, bh, color) {
        c.fillStyle = color;
        c.fillRect(cx - bw / 2, y, bw, bh);
    }

    function legs(y, color) {
        c.fillStyle = color;
        c.fillRect(cx - w * 0.12, y, w * 0.1, h - y);
        c.fillRect(cx + w * 0.02, y, w * 0.1, h - y);
    }

    function arms(y, len, color) {
        c.fillStyle = color;
        c.fillRect(0, y, w * 0.22, len);
        c.fillRect(w - w * 0.22, y, w * 0.22, len);
    }

    switch (charId) {
        case 'hiroshi': {
            head(14);
            c.fillStyle = dark;
            c.beginPath();
            c.arc(cx, 14, w * 0.16, Math.PI, 0);
            c.fill();
            body(24, w * 0.36, h * 0.3, '#5a4a3a');
            legs(51, '#3a3028');
            arms(24, h * 0.28, '#4a3a2e');
            break;
        }
        case 'kenji': {
            head(14);
            c.fillStyle = '#4a5a3a';
            c.beginPath();
            c.arc(cx, 14, w * 0.17, Math.PI, 0);
            c.fill();
            c.fillStyle = '#4a5a3a';
            c.fillRect(cx - w * 0.08, 12, w * 0.16, 5);
            body(24, w * 0.42, h * 0.28, '#5a6a4a');
            arms(24, h * 0.26, '#5a6a4a');
            legs(50, '#3a3a2a');
            break;
        }
        case 'yuki': {
            head(13);
            c.fillStyle = dark;
            c.beginPath();
            c.arc(cx - w * 0.06, 11, w * 0.05, 0, Math.PI * 2);
            c.arc(cx + w * 0.06, 11, w * 0.05, 0, Math.PI * 2);
            c.fill();
            body(22, w * 0.32, h * 0.22, '#6a5a4a');
            legs(41, '#4a3a2e');
            arms(22, h * 0.2, '#5a4a3a');
            break;
        }
        case 'tanaka': {
            head(14);
            body(24, w * 0.36, h * 0.28, '#7a7a72');
            c.fillStyle = 'rgba(140,130,120,0.3)';
            c.fillRect(cx - w * 0.22, 24, w * 0.44, h * 0.28);
            legs(50, '#3a3632');
            arms(24, h * 0.28, '#7a7a72');
            c.fillStyle = '#9a3020';
            c.fillRect(cx - 3, 32, 6, 12);
            c.fillRect(cx - 7, 36, 14, 4);
            break;
        }
    }
}

function buildCharGrid() {
    const grid = document.getElementById('charGrid');
    for (const ch of characters) {
        const card = document.createElement('div');
        card.className = 'char-card' + (ch.id === selectedCharacter ? ' selected' : '');
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
            document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedCharacter = ch.id;
        });

        grid.appendChild(card);
    }
}
buildCharGrid();

// ── navigation ──
function showCustomization() {
    if (!audioCtx) initAudio();
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    document.getElementById('homeScreen').classList.add('hidden');
    document.getElementById('customizationScreen').classList.remove('hidden');
}

function showHome() {
    document.getElementById('customizationScreen').classList.add('hidden');
    document.getElementById('blackScreen').classList.add('hidden');
    document.getElementById('homeScreen').classList.remove('hidden');
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
