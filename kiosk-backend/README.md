# e-Mood Kiosk Backend

Layanan lokal (Python + FastAPI + DeepFace) yang menganalisa ekspresi wajah dari
kamera. Jalan **hanya di laptop/PC kiosk itu sendiri** — tidak pernah mengirim
gambar wajah ke internet atau ke Neon (lihat `main.py` untuk detail privasi).

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

## Catatan

- Deteksi wajah pakai detector `opencv` (bawaan `opencv-python`, tidak perlu
  download tambahan, cukup cepat di CPU) — sesuai rekomendasi PRD 8.2.
- `enforce_detection=True` per-frame: frame tanpa wajah cukup dilewati, bukan
  bikin seluruh request gagal (FR-3.8).
- Tidak ada endpoint yang menulis file ke disk. Kalau butuh cek manual, jangan
  tambahkan logging yang menyimpan frame — itu melanggar D-3/NFR-3.2 di PRD.
