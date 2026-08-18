# e-Mood Kiosk Backend

Layanan (Python + FastAPI + DeepFace) yang menganalisa ekspresi wajah dari kamera.

> ⚠️ **Keputusan arsitektur PRD (D-3 / NFR-3.3) aslinya mewajibkan ini jalan
> lokal di PC kiosk — frame wajah tidak boleh keluar perangkat.** Repo ini juga
> mendukung deploy ke cloud (lihat bagian "Deploy ke cloud" di bawah) atas
> permintaan eksplisit, tapi itu berarti frame wajah **dikirim lewat internet**
> ke server, dan secara sadar melanggar D-3/NFR-3.3. Sebelum dipakai untuk
> member sungguhan (bukan testing), ini butuh **persetujuan ulang HR/Safety**
> (NFR-3.8) dan tinjauan kepatuhan UU PDP (R6) — bukan cuma keputusan teknis.

## Setup (Windows, PowerShell)

Butuh Python 3.10–3.12 (Python 3.13 bisa bermasalah dengan sebagian dependency
DeepFace/TensorFlow saat ini — kalau sudah ada Python lain, pakai itu).

```powershell
cd kiosk-backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Instalasi pertama kali akan lumayan besar (~1–2 GB, terutama TensorFlow yang
jadi dependency DeepFace) dan makan waktu beberapa menit tergantung koneksi.

## Menjalankan

```powershell
.\.venv\Scripts\Activate.ps1
uvicorn main:app --port 8000
```

Saat pertama kali jalan, DeepFace akan otomatis download model deteksi emosi
(~beberapa MB, sekali saja, disimpan di `~/.deepface`). Tunggu sampai muncul
log `[e-mood-kiosk] model ready.` — setelah itu request akan cepat (NFR-1.2/1.3).

Cek service hidup: buka `http://localhost:8000/health` di browser, harus muncul
`{"ok":true}`.

## Menjalankan kiosk lengkap

Perlu dua proses jalan bersamaan di laptop yang sama:

1. Backend ini: `uvicorn main:app --port 8000` (folder `kiosk-backend/`)
2. App Next.js: `npm run dev` (folder root project), lalu buka
   `http://localhost:3000/kiosk` di browser — izinkan akses kamera saat diminta.

Kalau backend jalan di port lain, set `NEXT_PUBLIC_KIOSK_ANALYZE_URL` di
`.env.local` root project (mis. `http://localhost:8000/analyze`).

## Deploy ke cloud

`Dockerfile` di folder ini sudah siap dipakai di host mana pun yang menerima
Docker (Railway, Render, Fly.io, dst.). Rekomendasi: **Railway** atau
**Render** — keduanya jalankan container sebagai proses persisten (bukan
serverless function), penting karena model DeepFace di-warm-load sekali saat
start (NFR-1.3); kalau host-nya serverless/cold-start tiap request, tiap
request kena penalti load model 5–10 detik.

Perhatikan ukuran resource: TensorFlow + DeepFace butuh RAM lebih dari tier
gratis termurah kebanyakan platform (biasanya 512 MB) — kalau container
langsung mati/restart terus, itu tandanya kena OOM, naikkan tier RAM-nya
(1–2 GB biasanya cukup).

**Langkah umum (Railway, via GitHub):**

1. Push repo ini ke GitHub (sudah dilakukan).
2. Di Railway: New Project → Deploy from GitHub repo → pilih repo, set
   **Root Directory** ke `kiosk-backend` (Railway otomatis pakai `Dockerfile`
   di situ).
3. Setelah deploy sukses, Railway kasih URL publik HTTPS, mis.
   `https://xxxxx.up.railway.app`.
4. Set `NEXT_PUBLIC_KIOSK_ANALYZE_URL=https://xxxxx.up.railway.app/analyze`
   di environment variable app Next.js (baik `.env.local` untuk dev, maupun
   di platform hosting Next.js-nya untuk production), lalu redeploy/restart
   app Next.js supaya env var baru terbaca (`NEXT_PUBLIC_*` di-bake saat
   build, bukan dibaca ulang saat runtime).
5. Cek `https://xxxxx.up.railway.app/health` → harus `{"ok":true}`.

Render/Fly.io caranya mirip: sama-sama connect ke repo GitHub, arahkan ke
`kiosk-backend/Dockerfile`, lalu pakai URL publik yang diberikan.

## Catatan

- Deteksi wajah pakai detector `opencv` (bawaan `opencv-python`, tidak perlu
  download tambahan, cukup cepat di CPU) — sesuai rekomendasi PRD 8.2.
- `enforce_detection=True` per-frame: frame tanpa wajah cukup dilewati, bukan
  bikin seluruh request gagal (FR-3.8).
- Tidak ada endpoint yang menulis file ke disk. Kalau butuh cek manual, jangan
  tambahkan logging yang menyimpan frame — itu melanggar D-3/NFR-3.2 di PRD.
