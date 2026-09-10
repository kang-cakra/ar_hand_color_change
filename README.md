# 🖐️ AR Hand Interactive Touch Color Changer

Aplikasi web interaktif Augmented Reality (AR) berbasis AI yang mendeteksi pergerakan tangan dan jari secara real-time untuk mengubah warna dan memanipulasi teks virtual mengambang (hologram).

---

## 📸 Preview / Screenshot

![App Screenshot](image.png)

---

## ✨ Fitur Utama
- **Real-Time Hand Tracking:** Menggunakan Google MediaPipe Hands langsung di browser via WebGL & Canvas.
- **Interaksi Sentuh (Touch Interaction):** Sentuh kotak teks virtual dengan jari telunjuk untuk mengubah warnanya secara dinamis.
- **Pinch to Drag:** Gerakan mencubit (jempol + telunjuk) untuk memindahkan letak teks di layar.
- **Kustomisasi Teks:** Menambahkan teks atau emoji kustom secara langsung ke layar AR.
- **Snapshot Foto AR:** Mengambil gambar layar AR dan menyimpannya secara lokal.
- **Audio Feedback:** Efek suara synth saat objek disentuh menggunakan Web Audio API.

---

## 🛠️ Menjalankan dengan Python (Lokal)

1. **Clone repositori ini:**
   ```bash
   git clone https://github.com/kang-cakra/ar_hand_color_change.git
   cd ar_hand_color_change
   ```

2. **Buat virtual environment (opsional tapi disarankan):**
   ```bash
   python -m venv venv
   # Windows:
   venv\Scripts\activate
   # Linux / macOS:
   source venv/bin/activate
   ```

3. **Install dependensi:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Jalankan server Flask:**
   ```bash
   python app.py
   ```

5. **Akses aplikasi di browser:**
   ```
   http://127.0.0.1:5000
   ```

---

## 🐳 Menjalankan dengan Docker

### Opsi 1: Menggunakan Docker Compose (Direkomendasikan)
```bash
# Build dan jalankan container
docker compose up --build -d

# Untuk menghentikan container
docker compose down
```

### Opsi 2: Menggunakan Docker CLI Standar
```bash
# 1. Build Docker image
docker build -t ar-hand-app .

# 2. Jalankan container dengan port forwarding dan volume snapshot
docker run -d \
  -p 5000:5000 \
  -v ${PWD}/static/snapshots:/app/static/snapshots \
  --name ar_hand_app \
  ar-hand-app
```

Buka browser dan akses **`http://localhost:5000`** atau **`http://127.0.0.1:5000`**.

> **Catatan:** Izinkan akses webcam pada browser saat diminta.

---

## 📁 Struktur Direktori

```
ar_hand_color_change/
├── static/
│   ├── css/
│   │   └── style.css          # Styling UI & Glassmorphism
│   ├── js/
│   │   └── ar_hand.js         # MediaPipe tracking & AR Canvas logic
│   └── snapshots/             # Penyimpanan lokal hasil tangkapan AR
├── templates/
│   └── index.html             # Antarmuka utama aplikasi
├── .dockerignore              # Pengecualian file saat build Docker
├── .gitignore                 # Pengecualian git
├── app.py                     # Backend server Flask
├── docker-compose.yml         # Konfigurasi Docker Compose
├── Dockerfile                 # Blueprint Docker Image
├── image.png                  # Screenshot demo aplikasi
├── pyrightconfig.json         # Konfigurasi linter
├── requirements.txt           # Dependensi Python
└── README.md
```

---

## 🔒 Keamanan & Privasi
- Aplikasi ini memproses deteksi tangan secara **lokal di sisi klien (browser pengguna)** menggunakan WebGL & WebAssembly.
- Tidak ada data video, stream kamera, atau data biometrik yang dikirimkan ke server eksternal.
