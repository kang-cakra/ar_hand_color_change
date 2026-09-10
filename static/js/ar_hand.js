/**
 * AR Hand Detection & Interactive Floating Text
 * Menggunakan Google MediaPipe Hands & HTML5 Canvas WebGL
 */

// Palet warna neon AR
const NEON_PALETTE = [
    '#EF4444', // Red Neon
    '#3B82F6', // Blue Neon
    '#10B981', // Emerald Green
    '#F59E0B', // Amber Yellow
    '#8B5CF6', // Purple Glow
    '#EC4899', // Pink Neon
    '#06B6D4', // Cyan Laser
    '#84CC16', // Lime Green
    '#F97316', // Bright Orange
    '#38BDF8', // Sky Blue
    '#FFFFFF'  // Pure White
];

// State Aplikasi
let videoElement;
let canvasElement;
let canvasCtx;
let camera = null;
let hands = null;

let isCameraRunning = false;
let showSkeleton = true;
let showParticles = true;
let soundEnabled = true;
let dragModeEnabled = true;

// Daftar Objek Teks AR Mengambang
let arTextObjects = [
    {
        id: 1,
        text: '🖐️ Sentuh Saya!',
        x: 0.5, // Rasio 0.0 - 1.0
        y: 0.3,
        color: '#EC4899',
        colorIndex: 5,
        width: 180,
        height: 50,
        isTouched: false,
        touchCooldown: 0,
        pulseScale: 1.0
    },
    {
        id: 2,
        text: '🤏🏻 Cubit Saya! ',
        x: 0.25,
        y: 0.65,
        color: '#06B6D4',
        colorIndex: 6,
        width: 210,
        height: 50,
        isTouched: false,
        touchCooldown: 0,
        pulseScale: 1.0
    },
    {
        id: 3,
        text: '🤖 Belajar Augmented Reality',
        x: 0.75,
        y: 0.65,
        color: '#F59E0B',
        colorIndex: 3,
        width: 230,
        height: 50,
        isTouched: false,
        touchCooldown: 0,
        pulseScale: 1.0
    }
];

// Sistem Partikel
let particles = [];
let draggingObj = null;

// Web Audio API Synth untuk Efek Suara Sentuhan
let audioCtx = null;
function playTouchSound(freq = 520) {
    if (!soundEnabled) return;
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.18);
    } catch (e) {
        // Audio error ignore
    }
}

// Inisialisasi Halaman
window.addEventListener('DOMContentLoaded', () => {
    videoElement = document.getElementById('webcam');
    canvasElement = document.getElementById('arCanvas');
    canvasCtx = canvasElement.getContext('2d');

    renderTextItemsList();
    setupEventListeners();
});

// Setup Tombol & Kontrol UI
function setupEventListeners() {
    document.getElementById('btnStartCamera').addEventListener('click', startARCamera);

    document.getElementById('btnToggleSkeleton').addEventListener('click', function () {
        showSkeleton = !showSkeleton;
        this.classList.toggle('active', showSkeleton);
    });

    document.getElementById('btnToggleSound').addEventListener('click', function () {
        soundEnabled = !soundEnabled;
        this.classList.toggle('active', soundEnabled);
        this.innerHTML = soundEnabled ? '<i class="fa-solid fa-volume-high"></i> Suara ON' : '<i class="fa-solid fa-volume-xmark"></i> Suara OFF';
    });

    document.getElementById('btnSnapshot').addEventListener('click', captureSnapshot);

    document.getElementById('btnResetTexts').addEventListener('click', () => {
        arTextObjects.forEach((obj, idx) => {
            obj.x = [0.5, 0.25, 0.75][idx % 3];
            obj.y = [0.3, 0.65, 0.65][idx % 3];
            obj.colorIndex = idx * 2;
            obj.color = NEON_PALETTE[obj.colorIndex % NEON_PALETTE.length];
        });
        addLogEntry("Posisi teks AR di-reset ke awal.");
        renderTextItemsList();
    });

    document.getElementById('formAddText').addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('inputNewText');
        const textVal = input.value.trim();
        if (textVal) {
            const nextIdx = arTextObjects.length % NEON_PALETTE.length;
            arTextObjects.push({
                id: Date.now(),
                text: textVal,
                x: 0.3 + (Math.random() * 0.4),
                y: 0.3 + (Math.random() * 0.4),
                color: NEON_PALETTE[nextIdx],
                colorIndex: nextIdx,
                width: Math.max(160, textVal.length * 15),
                height: 50,
                isTouched: false,
                touchCooldown: 0,
                pulseScale: 1.0
            });
            input.value = '';
            addLogEntry(`Teks baru ditambahkan: "${textVal}"`);
            renderTextItemsList();
        }
    });
}

// Mulai Kamera & MediaPipe
async function startARCamera() {
    document.getElementById('cameraPrompt').style.display = 'none';
    videoElement.style.display = 'block';

    // Inisialisasi MediaPipe Hands
    hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6
    });

    hands.onResults(onHandResults);

    // Inisialisasi Kamera WebRTC
    camera = new Camera(videoElement, {
        onFrame: async () => {
            await hands.send({ image: videoElement });
        },
        width: 1280,
        height: 960
    });

    try {
        await camera.start();
        isCameraRunning = true;
        document.getElementById('statusDot').classList.add('active');
        document.getElementById('statusText').innerText = 'Kamera Aktif';
        addLogEntry('Kamera & AI Hand Tracker berhasil diaktifkan.');
    } catch (err) {
        alert('Gagal mengakses webcam: ' + err.message);
        document.getElementById('cameraPrompt').style.display = 'flex';
    }
}

// Handler Frame Deteksi Tangan
function onHandResults(results) {
    // Sesuaikan resolusi canvas dengan video
    if (canvasElement.width !== videoElement.videoWidth && videoElement.videoWidth > 0) {
        canvasElement.width = videoElement.videoWidth;
        canvasElement.height = videoElement.videoHeight;
    }

    const w = canvasElement.width;
    const h = canvasElement.height;

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, w, h);

    // 1. Gambar Feed Video (Mirrored untuk interaksi natural)
    canvasCtx.translate(w, 0);
    canvasCtx.scale(-1, 1);
    canvasCtx.drawImage(results.image, 0, 0, w, h);
    canvasCtx.restore();

    // Simpan koordinat ujung jari telunjuk & jempol
    const fingerPoints = [];

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        document.getElementById('handCountBadge').innerText = `${results.multiHandLandmarks.length} Tangan Terdeteksi`;

        for (const landmarks of results.multiHandLandmarks) {
            // Karena video di-mirror, koordinat X dinormalisasi mirror: (1 - x)
            const indexTip = {
                x: (1 - landmarks[8].x) * w,
                y: landmarks[8].y * h
            };
            const thumbTip = {
                x: (1 - landmarks[4].x) * w,
                y: landmarks[4].y * h
            };

            fingerPoints.push({ indexTip, thumbTip });

            // 2. Gambar Rangka & Sendi Tangan (Skeleton) jika aktif
            if (showSkeleton) {
                drawNeonHandSkeleton(landmarks, w, h);
            }

            // Indikator Titik Jari Telunjuk Laser
            drawFingertipLaser(indexTip.x, indexTip.y);
        }
    } else {
        document.getElementById('handCountBadge').innerText = 'Menunggu Tangan...';
    }

    // 3. Update & Gambar Objek Teks AR Mengambang
    updateAndDrawARTexts(fingerPoints, w, h);

    // 4. Update Partikel Efek
    updateAndDrawParticles();
}

// Gambar Laser Sendi Tangan Neon
function drawNeonHandSkeleton(landmarks, w, h) {
    const CONNECTIONS = [
        [0, 1], [1, 2], [2, 3], [3, 4],       // Jempol
        [0, 5], [5, 6], [6, 7], [7, 8],       // Telunjuk
        [0, 9], [9, 10], [10, 11], [11, 12],  // Tengah
        [0, 13], [13, 14], [14, 15], [15, 16],// Manis
        [0, 17], [17, 18], [18, 19], [19, 20],// Kelingking
        [5, 9], [9, 13], [13, 17]             // Telapak
    ];

    canvasCtx.save();
    canvasCtx.strokeStyle = 'rgba(6, 182, 212, 0.7)';
    canvasCtx.lineWidth = 3;
    canvasCtx.shadowColor = '#06B6D4';
    canvasCtx.shadowBlur = 10;

    // Gambar Garis Sambungan
    for (const [start, end] of CONNECTIONS) {
        const p1 = { x: (1 - landmarks[start].x) * w, y: landmarks[start].y * h };
        const p2 = { x: (1 - landmarks[end].x) * w, y: landmarks[end].y * h };

        canvasCtx.beginPath();
        canvasCtx.moveTo(p1.x, p1.y);
        canvasCtx.lineTo(p2.x, p2.y);
        canvasCtx.stroke();
    }

    // Gambar Titik Landmark
    for (let i = 0; i < landmarks.length; i++) {
        const pt = { x: (1 - landmarks[i].x) * w, y: landmarks[i].y * h };
        canvasCtx.fillStyle = (i === 8 || i === 4) ? '#F43F5E' : '#A5B4FC';
        canvasCtx.beginPath();
        canvasCtx.arc(pt.x, pt.y, (i === 8 || i === 4) ? 7 : 4, 0, 2 * Math.PI);
        canvasCtx.fill();
    }
    canvasCtx.restore();
}

// Indikator Laser Ujung Jari
function drawFingertipLaser(x, y) {
    canvasCtx.save();
    canvasCtx.fillStyle = '#F43F5E';
    canvasCtx.shadowColor = '#F43F5E';
    canvasCtx.shadowBlur = 16;
    canvasCtx.beginPath();
    canvasCtx.arc(x, y, 9, 0, 2 * Math.PI);
    canvasCtx.fill();

    // Cincin Luar Berdenyut
    canvasCtx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    canvasCtx.lineWidth = 2;
    canvasCtx.beginPath();
    canvasCtx.arc(x, y, 15, 0, 2 * Math.PI);
    canvasCtx.stroke();
    canvasCtx.restore();
}

// Update & Render Teks AR Mengambang
function updateAndDrawARTexts(fingerPoints, canvasW, canvasH) {
    const fontSize = Math.max(18, Math.floor(canvasW * 0.024));

    arTextObjects.forEach(obj => {
        // Hitung posisi piksel di layar
        const px = obj.x * canvasW;
        const py = obj.y * canvasH;

        // Ukur dimensi teks jika belum presisi
        canvasCtx.font = `bold ${fontSize}px 'Plus Jakarta Sans', sans-serif`;
        const metrics = canvasCtx.measureText(obj.text);
        const textW = metrics.width + 36;
        const textH = fontSize + 24;
        obj.width = textW;
        obj.height = textH;

        // Bounding Box Kotak Teks
        const boxLeft = px - (textW / 2);
        const boxTop = py - (textH / 2);
        const boxRight = px + (textW / 2);
        const boxBottom = py + (textH / 2);

        // Pengecekan Tabrakan (Collision Detection) dengan Ujung Jari Telunjuk
        let isTouchingNow = false;

        for (const { indexTip, thumbTip } of fingerPoints) {
            // Cek jika jari telunjuk menyentuh area bounding box
            if (indexTip.x >= boxLeft && indexTip.x <= boxRight &&
                indexTip.y >= boxTop && indexTip.y <= boxBottom) {
                isTouchingNow = true;

                // Cek gesture pinch (Jempol + Telunjuk dekat) untuk Drag & Drop
                const distPinch = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y);
                if (distPinch < 45 && dragModeEnabled) {
                    obj.x = indexTip.x / canvasW;
                    obj.y = indexTip.y / canvasH;
                }
                break;
            }
        }

        // Penanganan Saat Terjadi Sentuhan (Touch Trigger)
        if (isTouchingNow) {
            if (!obj.isTouched && obj.touchCooldown <= 0) {
                // 🎨 GANTI WARNA TEKS KE WARNA NEON BERIKUTNYA
                obj.colorIndex = (obj.colorIndex + 1) % NEON_PALETTE.length;
                const newColor = NEON_PALETTE[obj.colorIndex];
                obj.color = newColor;

                // Animasi Denyut
                obj.pulseScale = 1.35;
                obj.touchCooldown = 15; // Cooldown frame agar tidak berganti terlalu cepat

                // Efek Suara
                playTouchSound(480 + (obj.colorIndex * 40));

                // Pancarkan Partikel Sparkle
                spawnSparkleParticles(px, py, newColor);

                // Tambahkan Riwayat ke Log
                addLogEntry(`🖐️ Sentuh: "${obj.text}" ➔ Warna berubah ke ${newColor}`);
                renderTextItemsList();
            }
            obj.isTouched = true;
        } else {
            obj.isTouched = false;
        }

        if (obj.touchCooldown > 0) obj.touchCooldown--;

        // Animasi Pulse kembali ke ukuran normal
        obj.pulseScale += (1.0 - obj.pulseScale) * 0.15;

        // 🎨 GAMBAR ELEMEN HOLOGRAFIS TEKS AR
        drawHologramCard(px, py, textW, textH, obj.text, obj.color, obj.pulseScale, obj.isTouched, fontSize);
    });
}

// Gambar Kartu Teks Holografis AR
function drawHologramCard(cx, cy, w, h, text, color, scale, isTouched, fontSize) {
    canvasCtx.save();
    canvasCtx.translate(cx, cy);
    canvasCtx.scale(scale, scale);

    const halfW = w / 2;
    const halfH = h / 2;
    const radius = 12;

    // 1. Bayangan Glow Luar
    canvasCtx.shadowColor = color;
    canvasCtx.shadowBlur = isTouched ? 30 : 18;

    // 2. Latar Belakang Kartu Glassmorphism Kaca Transparan
    canvasCtx.fillStyle = isTouched ? 'rgba(15, 23, 42, 0.95)' : 'rgba(15, 23, 42, 0.75)';
    drawRoundedRect(canvasCtx, -halfW, -halfH, w, h, radius);
    canvasCtx.fill();

    // 3. Garis Tepi Neon
    canvasCtx.strokeStyle = color;
    canvasCtx.lineWidth = isTouched ? 3.5 : 2;
    canvasCtx.stroke();

    // 4. Aksen Sudut Hologram Cyberpunk
    canvasCtx.fillStyle = color;
    canvasCtx.fillRect(-halfW - 2, -halfH - 2, 8, 3);
    canvasCtx.fillRect(-halfW - 2, -halfH - 2, 3, 8);
    canvasCtx.fillRect(halfW - 6, -halfH - 2, 8, 3);
    canvasCtx.fillRect(halfW - 1, -halfH - 2, 3, 8);

    // 5. Render Teks
    canvasCtx.shadowColor = color;
    canvasCtx.shadowBlur = 12;
    canvasCtx.fillStyle = '#FFFFFF';
    canvasCtx.font = `bold ${fontSize}px 'Plus Jakarta Sans', sans-serif`;
    canvasCtx.textAlign = 'center';
    canvasCtx.textBaseline = 'middle';
    canvasCtx.fillText(text, 0, 1);

    canvasCtx.restore();
}

// Helper Rounded Rectangle
function drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

// Efek Partikel Sparkle saat Disentuh
function spawnSparkleParticles(x, y, color) {
    if (!showParticles) return;
    const count = 22;
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * 2 * Math.PI;
        const speed = 2 + Math.random() * 6;
        particles.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: 2 + Math.random() * 3.5,
            color,
            alpha: 1.0,
            life: 25 + Math.random() * 15
        });
    }
}

function updateAndDrawParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 1.0 / p.life;

        if (p.alpha <= 0) {
            particles.splice(i, 1);
            continue;
        }

        canvasCtx.save();
        canvasCtx.globalAlpha = p.alpha;
        canvasCtx.fillStyle = p.color;
        canvasCtx.shadowColor = p.color;
        canvasCtx.shadowBlur = 8;
        canvasCtx.beginPath();
        canvasCtx.arc(p.x, p.y, p.radius, 0, 2 * Math.PI);
        canvasCtx.fill();
        canvasCtx.restore();
    }
}

// Tangkap Layar Snapshot AR
async function captureSnapshot() {
    if (!isCameraRunning) {
        alert('Kamera belum aktif!');
        return;
    }

    const dataUrl = canvasElement.toDataURL('image/png');
    addLogEntry('📸 Mengambil snapshot AR...');

    try {
        const res = await fetch('/api/save_snapshot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: dataUrl })
        });
        const json = await res.json();
        if (json.success) {
            addLogEntry(`✅ Snapshot berhasil disimpan: ${json.filename}`);

            // Otomatis download ke browser juga
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = json.filename;
            a.click();
        }
    } catch (e) {
        // Fallback langsung download lokal
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `ar_snapshot_${Date.now()}.png`;
        a.click();
    }
}

// Render Daftar Item Teks di Panel Samping
function renderTextItemsList() {
    const list = document.getElementById('textItemsList');
    if (!list) return;
    list.innerHTML = '';

    arTextObjects.forEach((obj, idx) => {
        const item = document.createElement('div');
        item.className = 'text-item-chip';
        item.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span class="color-preview-badge" style="background-color: ${obj.color};"></span>
                <span>${obj.text}</span>
            </div>
            <button class="btn-delete-chip" onclick="deleteTextItem(${obj.id})" title="Hapus"><i class="fa-solid fa-trash"></i></button>
        `;
        list.appendChild(item);
    });
}

function deleteTextItem(id) {
    arTextObjects = arTextObjects.filter(item => item.id !== id);
    renderTextItemsList();
    addLogEntry('Teks AR dihapus.');
}

// Tambah Entri Log
function addLogEntry(text) {
    const feed = document.getElementById('interactionFeed');
    if (!feed) return;
    const time = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `<strong style="color: #38bdf8;">[${time}]</strong> ${text}`;
    feed.insertBefore(entry, feed.firstChild);

    // Batasi log maksimal 15 entri
    while (feed.children.length > 15) {
        feed.removeChild(feed.lastChild);
    }
}
