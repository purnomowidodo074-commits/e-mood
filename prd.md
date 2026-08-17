# PRD — Aplikasi Absen Emosi Member ("e-Mood")

|                |                                                               |
| -------------- | ------------------------------------------------------------- |
| **Dokumen ID** | PRD-TMMIN-EMOA-001                                            |
| **Nama Kerja** | e-Mood — Emotion Attendance Monitoring                        |
| **Versi**      | 0.2 (DRAFT — 3 keputusan kunci sudah ditetapkan)              |
| **Tanggal**    | 16 Agustus 2026                                               |
| **Divisi**     | Casting Division — Melting, Pouring & Analysis, EPSD Sunter 2 |
| **Status**     | Planning / belum development                                  |

### Riwayat Revisi

| Versi | Tanggal     | Perubahan                                                                                                                           |
| ----- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 0.1   | 16 Ags 2026 | Draft awal                                                                                                                          |
| 0.2   | 16 Ags 2026 | Kategori **SAKIT dibatalkan** → diganti **NETRAL**; arsitektur dikunci ke **1 kiosk lokal**; **frame wajah tidak disimpan** (final) |

---

## 0. Keputusan yang Sudah Ditetapkan

| #       | Keputusan                                                                                                                                        | Konsekuensi                                                                                                                         |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| **D-1** | **Kategori final = 3: HAPPY, NETRAL, BADMOOD.** Kategori "sakit" dibatalkan (DeepFace tidak dapat mendeteksi kondisi sakit dari ekspresi wajah). | Tidak ada tombol deklarasi mandiri; seluruh hasil murni dari analisa wajah. Sistem menjadi lebih sederhana dan jujur secara teknis. |
| **D-2** | **Satu unit PC kiosk** di satu titik untuk seluruh 180 member.                                                                                   | Arsitektur Pola A (backend Python lokal di kiosk). Perlu perhatian pada kapasitas antrean — lihat NFR-1.5.                          |
| **D-3** | **Frame wajah tidak disimpan sama sekali.** Diproses di memori, langsung dibuang.                                                                | Yang tersimpan hanya: identitas, waktu, kategori, dan skor 7 emosi. Risiko privasi turun drastis.                                   |

---

## 1. Problem Statement

### 1.1 Kondisi saat ini

Kondisi psikologis member di awal shift sangat berpengaruh pada keselamatan kerja dan kualitas proses di area Casting — area dengan risiko tinggi (logam cair, ladle, furnace, alat berat). Saat ini kondisi member hanya diketahui lewat:

- Pengamatan visual leader/foreman saat briefing pagi (subjektif, tidak tercatat)
- Member yang secara sukarela melapor kalau sedang tidak enak (sering tidak dilaporkan karena sungkan)
- Absensi kehadiran biasa yang hanya mencatat **hadir/tidak hadir**, bukan **kondisi**

### 1.2 Masalah

1. **Tidak ada data kondisi member.** Leader tidak punya catatan objektif dan historis, sehingga tidak bisa melihat tren (misal: hari Senin mood cenderung turun, atau shift malam konsisten lebih rendah).
2. **Deteksi terlambat.** Member yang sedang badmood baru ketahuan setelah terjadi insiden, near-miss, atau defect.
3. **Proses manual & tidak konsisten.** Kalau pun ada pencatatan mood manual, hasilnya tidak seragam antar leader dan tidak bisa direkap cepat.
4. **Tidak ada dasar data untuk tindakan.** Keputusan rotasi kerja atau penempatan di pos berisiko tinggi masih berbasis feeling, bukan data.

### 1.3 Kenapa perlu diselesaikan sekarang

Sejalan dengan program digitalisasi Casting Division (Portal Hub, e-Henkaten, Thermoholder Check Sheet, Furnace Tracker), pencatatan kondisi member adalah data yang hilang di antara data mesin dan data proses:

> kondisi mesin ✔ · kondisi proses ✔ · **kondisi manusia ✘ → menjadi ✔**

---

## 2. Goal & Success Metrics

### 2.1 Goal utama

Menyediakan **pencatatan kondisi (mood) member secara otomatis, cepat, dan objektif** saat absen masuk shift, serta menampilkannya dalam dashboard agar leader dapat mengambil tindakan preventif sebelum shift dimulai.

### 2.2 Goal turunan

| #   | Goal                                       | Penjelasan                                                   |
| --- | ------------------------------------------ | ------------------------------------------------------------ |
| G1  | Absen + cek mood dalam satu proses singkat | Tidak menambah beban waktu member di awal shift              |
| G2  | Data mood tercatat digital & historis      | Bisa direkap harian/mingguan/bulanan                         |
| G3  | Visibility untuk leader                    | Dashboard real-time: siapa yang perlu diperhatikan hari ini  |
| G4  | Dasar tindakan preventif                   | Member badmood bisa di-follow up sebelum masuk area berisiko |
| G5  | Kaizen berbasis data                       | Data mood jadi bahan analisa 4M (Man) untuk Kaizen report    |

### 2.3 Success Metrics (KPI)

| Metric                                   | Target                                    | Cara ukur                               |
| ---------------------------------------- | ----------------------------------------- | --------------------------------------- |
| Waktu satu siklus absen (scan → selesai) | ≤ 10 detik                                | Timestamp mulai–selesai di log aplikasi |
| Throughput kiosk                         | ≥ 6 member/menit                          | Rata-rata pada 15 menit tersibuk        |
| Tingkat keberhasilan deteksi wajah       | ≥ 90% percobaan pertama                   | Jumlah sesi sukses / total sesi         |
| Adopsi harian                            | ≥ 90% member yang hadir melakukan absen   | Jumlah record / jumlah member hadir     |
| Dashboard dibuka oleh leader             | Minimal 1× per shift                      | Log akses dashboard                     |
| Follow-up tercatat                       | 100% member kategori BADMOOD di-follow up | Kolom tindak lanjut di dashboard        |

---

## 3. Target Users

| Persona                              | Peran                                           | Kebutuhan utama                                                      | Frekuensi pakai  |
| ------------------------------------ | ----------------------------------------------- | -------------------------------------------------------------------- | ---------------- |
| **Member Produksi (MP)** — 180 orang | Melakukan absen emosi                           | Cepat, tidak ribet, jelas kapan selesai                              | 1× per shift     |
| **Leader / Foreman**                 | Memonitor kondisi tim, follow up                | Ringkasan cepat: berapa happy/netral/badmood, siapa saja, jam berapa | 1–3× per shift   |
| **Section Head / Manager**           | Melihat tren mingguan/bulanan                   | Grafik tren, export data, perbandingan antar shift                   | 1× per minggu    |
| **Admin Aplikasi (El)**              | Kelola master member, koreksi data, maintenance | CRUD member, import Excel, log error, koreksi record                 | Sesuai kebutuhan |
| **Safety / P2K3** _(opsional)_       | Korelasi mood ↔ near-miss/insiden               | Export data periode tertentu                                         | Bulanan          |

---

## 4. User Stories

### 4.1 Member Produksi (MP)

| ID    | User Story                                                                                                                                    | Acceptance Criteria                                                       |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| US-01 | Sebagai MP, saya ingin absen cukup dengan **scan barcode Noreg**, supaya tidak perlu mengetik                                                 | Scanner membaca Noreg → dicocokkan ke master → lanjut otomatis tanpa klik |
| US-02 | Sebagai MP, saya ingin melihat **"Selamat datang, [Nama]"** setelah scan, supaya yakin ID saya benar                                          | Nama tampil ≤ 1 detik setelah scan, terbaca dari jarak 1 meter            |
| US-03 | Sebagai MP, saya ingin **kamera terbuka otomatis** setelah nama muncul, supaya tidak perlu menekan tombol (tangan sering pakai sarung tangan) | Kamera aktif otomatis + panduan posisi wajah (frame oval)                 |
| US-04 | Sebagai MP, saya ingin tahu **berapa lama** harus menghadap kamera                                                                            | Countdown visual 3-2-1 selama proses 3 detik                              |
| US-05 | Sebagai MP, saya ingin **konfirmasi jelas kalau absen berhasil**, supaya bisa langsung lanjut kerja                                           | Layar hasil + beep, auto-reset ke layar scan dalam 3 detik                |
| US-06 | Sebagai MP, saya ingin bisa **mengulang** kalau wajah gagal terdeteksi                                                                        | Pesan + tombol "Coba Lagi", maksimal 3× lalu fallback manual              |
| US-07 | Sebagai MP, saya ingin yakin **foto saya tidak disimpan**                                                                                     | Teks informasi privasi permanen di layar kiosk                            |
| US-08 | Sebagai MP, saya tidak ingin **antre lama** di awal shift                                                                                     | Satu siklus ≤ 10 detik; window absen dibuka lebih awal                    |

### 4.2 Leader / Foreman

| ID    | User Story                                                                                            | Acceptance Criteria                                             |
| ----- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| US-09 | Sebagai Leader, saya ingin melihat **jumlah member per kategori hari ini** (happy / netral / badmood) | Kartu angka besar di atas dashboard, update otomatis            |
| US-10 | Sebagai Leader, saya ingin melihat **grafik distribusi mood** yang mudah dibaca                       | Donut chart berwarna dengan persentase                          |
| US-11 | Sebagai Leader, saya ingin melihat **daftar nama + jam absen + hasil mood**                           | Tabel: Nama, Noreg, Jam, Kategori, Confidence, Status follow-up |
| US-12 | Sebagai Leader, saya ingin **memfilter** per shift, per tanggal, per group                            | Filter dropdown, default = shift & tanggal berjalan             |
| US-13 | Sebagai Leader, saya ingin melihat **siapa yang belum absen** hari ini                                | Panel "Belum absen" = master member − yang sudah absen          |
| US-14 | Sebagai Leader, saya ingin **menandai sudah follow-up** member tertentu                               | Checkbox "Sudah ditindaklanjuti" + kolom catatan                |

### 4.3 Section Head / Manager

| ID    | User Story                                                           | Acceptance Criteria                        |
| ----- | -------------------------------------------------------------------- | ------------------------------------------ |
| US-15 | Sebagai SH, saya ingin melihat **tren mood harian/mingguan/bulanan** | Line chart, bisa pilih rentang tanggal     |
| US-16 | Sebagai SH, saya ingin **membandingkan antar shift/group**           | Grouped bar chart                          |
| US-17 | Sebagai SH, saya ingin **export data ke Excel**                      | Tombol Export CSV/XLSX sesuai filter aktif |

### 4.4 Admin

| ID    | User Story                                                                         | Acceptance Criteria                                         |
| ----- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| US-18 | Sebagai Admin, saya ingin **import master member dari Excel** (Nama, Noreg)        | Upload .xlsx → preview → konfirmasi; duplikat Noreg ditolak |
| US-19 | Sebagai Admin, saya ingin **CRUD member**                                          | Form sederhana, soft delete (aktif/non-aktif)               |
| US-20 | Sebagai Admin, saya ingin **generate & cetak kartu barcode** Noreg                 | Halaman cetak label Code128 berisi Noreg + Nama             |
| US-21 | Sebagai Admin, saya ingin **mengoreksi/menghapus record salah**                    | Edit record + alasan koreksi, tercatat di audit log         |
| US-22 | Sebagai Admin, saya ingin **mengubah mapping emosi → kategori** tanpa deploy ulang | Halaman konfigurasi mapping + threshold                     |

---

## 5. Functional Requirements

### FR-1 — Identifikasi Member (Scan Barcode)

| ID     | Requirement                                                                                                                             | Prioritas |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| FR-1.1 | Menerima input Noreg dari barcode scanner tipe **keyboard-wedge** (scanner mengetik angka lalu Enter) — input field auto-focus permanen | Must      |
| FR-1.2 | Noreg dicocokkan ke master member (180 record: Nama + Noreg)                                                                            | Must      |
| FR-1.3 | Noreg **disimpan sebagai teks**, bukan angka, agar leading zero tidak hilang (data existing panjangnya 5, 6, dan 7 digit)               | Must      |
| FR-1.4 | Jika Noreg tidak ditemukan → "Noreg tidak terdaftar", kembali ke layar scan                                                             | Must      |
| FR-1.5 | Jika Noreg sudah absen di shift yang sama → "Anda sudah absen jam HH:MM", tolak duplikat                                                | Must      |
| FR-1.6 | Tersedia input manual Noreg (keypad on-screen) sebagai fallback saat barcode rusak/kotor                                                | Should    |

### FR-2 — Sambutan (Welcome Screen)

| ID     | Requirement                                                                            | Prioritas |
| ------ | -------------------------------------------------------------------------------------- | --------- |
| FR-2.1 | Menampilkan "Selamat Datang, [NAMA MEMBER]" dengan tipografi besar (terbaca dari ±1 m) | Must      |
| FR-2.2 | Menampilkan tanggal, jam, dan shift yang terdeteksi otomatis                           | Must      |
| FR-2.3 | Transisi otomatis ke layar kamera setelah 1,5 detik (tanpa klik)                       | Must      |
| FR-2.4 | Menampilkan foto member (bila tersedia) untuk verifikasi kartu tidak tertukar          | Could     |

### FR-3 — Deteksi Emosi (DeepFace)

| ID      | Requirement                                                                                                                                                    | Prioritas |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| FR-3.1  | Kamera aktif otomatis dengan preview live + panduan posisi wajah (oval guide)                                                                                  | Must      |
| FR-3.2  | Countdown visual 3 detik (3-2-1) selama perekaman                                                                                                              | Must      |
| FR-3.3  | Sistem mengambil **multi-frame** selama 3 detik (6–9 frame @2–3 fps), bukan 1 frame, lalu **merata-ratakan skor** tiap emosi → kategori final = skor tertinggi | Must      |
| FR-3.4  | Analisa menggunakan DeepFace `analyze(actions=['emotion'])` yang menghasilkan 7 kelas: angry, disgust, fear, happy, sad, surprise, neutral                     | Must      |
| FR-3.5  | **Mapping final (D-1):** <br>• **HAPPY** ← `happy` <br>• **NETRAL** ← `neutral`, `surprise` <br>• **BADMOOD** ← `angry`, `sad`, `disgust`, `fear`              | Must      |
| FR-3.6  | Sistem menyimpan **skor mentah 7 emosi**, bukan hanya kategori final, supaya mapping dapat dikalibrasi ulang tanpa kehilangan data historis                    | Must      |
| FR-3.7  | Threshold confidence: bila skor kategori tertinggi < 50%, record ditandai `low_confidence = true` dan ditampilkan berbeda di dashboard                         | Must      |
| FR-3.8  | Jika wajah tidak terdeteksi dalam 3 detik → "Wajah tidak terdeteksi, coba lagi" + retry (maks 3×)                                                              | Must      |
| FR-3.9  | Setelah 3× gagal → member memilih mood sendiri lewat 3 tombol emoji; record ditandai `source = manual`                                                         | Must      |
| FR-3.10 | **Frame gambar tidak disimpan sama sekali (D-3)** — diproses di memori lalu dibuang; tidak ditulis ke disk, tidak dikirim ke luar perangkat                    | Must      |
| FR-3.11 | Mapping emosi → kategori dan nilai threshold disimpan sebagai **konfigurasi di database**, bukan hard-code                                                     | Must      |

### FR-4 — Hasil & Konfirmasi

| ID     | Requirement                                                                                                 | Prioritas |
| ------ | ----------------------------------------------------------------------------------------------------------- | --------- |
| FR-4.1 | Layar hasil: ikon kategori + nama + jam absen + pesan singkat (mis. "Semangat ya, hati-hati di area kerja") | Must      |
| FR-4.2 | Feedback suara singkat (beep sukses / beep berbeda untuk gagal)                                             | Should    |
| FR-4.3 | Auto-reset ke layar scan setelah 3 detik → siap untuk member berikutnya                                     | Must      |
| FR-4.4 | Jika hasil BADMOOD → sistem memunculkan flag ke dashboard leader                                            | Should    |
| FR-4.5 | Layar hasil **tidak menghakimi** — tidak ada kata "buruk"/"jelek"; gunakan bahasa netral dan suportif       | Must      |

### FR-5 — Dashboard

| ID      | Requirement                                                                                                | Prioritas |
| ------- | ---------------------------------------------------------------------------------------------------------- | --------- |
| FR-5.1  | **Kartu ringkasan**: jumlah & persentase Happy / Netral / Badmood + total sudah absen dari total member    | Must      |
| FR-5.2  | **Donut chart** distribusi kategori hari ini                                                               | Must      |
| FR-5.3  | **Bar chart** distribusi per jam absen atau per shift                                                      | Should    |
| FR-5.4  | **Line chart** tren harian/mingguan/bulanan                                                                | Should    |
| FR-5.5  | **Tabel detail**: Nama, Noreg, Jam Absen, Kategori, Confidence (%), Sumber (auto/manual), Status follow-up | Must      |
| FR-5.6  | Filter: tanggal / rentang tanggal, shift, kategori, group                                                  | Must      |
| FR-5.7  | Panel "Belum Absen" berisi daftar member yang belum absen                                                  | Should    |
| FR-5.8  | Update real-time (atau auto-refresh ≤ 30 detik)                                                            | Should    |
| FR-5.9  | Export CSV/XLSX sesuai filter aktif                                                                        | Should    |
| FR-5.10 | Responsif — bisa dibuka di HP leader maupun monitor besar                                                  | Must      |
| FR-5.11 | Mode "TV/Andon" — tampilan agregat untuk monitor area, **tanpa nama individu**                             | Could     |

### FR-6 — Master Data & Admin

| ID     | Requirement                                                                                   | Prioritas |
| ------ | --------------------------------------------------------------------------------------------- | --------- |
| FR-6.1 | Import master member dari .xlsx (Nama, Noreg) dengan validasi duplikat                        | Must      |
| FR-6.2 | CRUD member + status aktif/non-aktif (soft delete)                                            | Must      |
| FR-6.3 | Field tambahan member: Group/Line, Shift, Jabatan _(belum ada di file existing — lihat OQ-1)_ | Should    |
| FR-6.4 | Generate & cetak label barcode Code128 berisi Noreg + Nama                                    | Should    |
| FR-6.5 | Koreksi/hapus record absen dengan alasan + audit log                                          | Should    |
| FR-6.6 | Konfigurasi jam shift (batas shift 1/2/3) agar penentuan shift otomatis akurat                | Must      |
| FR-6.7 | Halaman konfigurasi mapping emosi & threshold confidence                                      | Must      |

### FR-7 — Autentikasi & Hak Akses

| ID     | Requirement                                                                 | Prioritas |
| ------ | --------------------------------------------------------------------------- | --------- |
| FR-7.1 | Layar kiosk absen **tidak perlu login** (identifikasi = barcode Noreg)      | Must      |
| FR-7.2 | Dashboard & Admin **wajib login** (Leader = read + follow-up; Admin = full) | Must      |
| FR-7.3 | Member tidak bisa melihat data mood member lain                             | Must      |

---

## 6. Non-Functional Requirements

### NFR-1 — Performance & Kapasitas ⚠️ (kritikal karena hanya 1 kiosk)

| ID      | Requirement                                                                                                                                                                                                                                        |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NFR-1.1 | Total siklus absen (scan → layar hasil) ≤ 10 detik, termasuk 3 detik perekaman                                                                                                                                                                     |
| NFR-1.2 | Waktu inferensi DeepFace per frame ≤ 400 ms di CPU perangkat kiosk                                                                                                                                                                                 |
| NFR-1.3 | Model DeepFace di-load sekali saat startup (warm start), **bukan** per request — cold start bisa memakan 5–10 detik                                                                                                                                |
| NFR-1.4 | Dashboard load awal ≤ 3 detik untuk data 1 bulan                                                                                                                                                                                                   |
| NFR-1.5 | **Kapasitas dengan 1 kiosk:** pada siklus 10 detik → maks ±6 member/menit. Artinya 60 member ≈ 10 menit, 90 member ≈ 15 menit antre. Window absen **wajib dibuka minimal 30 menit sebelum jam shift**, dan waktu antre harus diukur pada uji coba. |
| NFR-1.6 | Bila hasil uji coba menunjukkan antrean > 15 menit, sistem harus siap ditambah kiosk kedua tanpa perubahan arsitektur besar                                                                                                                        |

### NFR-2 — Reliability & Availability

| ID      | Requirement                                                                                                                  |
| ------- | ---------------------------------------------------------------------------------------------------------------------------- |
| NFR-2.1 | Uptime ≥ 99% pada jam pergantian shift                                                                                       |
| NFR-2.2 | Jika koneksi ke database putus, record disimpan lokal (queue) lalu sinkron otomatis saat online                              |
| NFR-2.3 | Kegagalan kamera/model tidak boleh memblokir absen — selalu ada jalur fallback manual                                        |
| NFR-2.4 | Auto-restart aplikasi kiosk jika crash (service dengan watchdog)                                                             |
| NFR-2.5 | **Single point of failure:** karena hanya ada 1 kiosk, wajib ada SOP cadangan (absen manual di kertas) bila kiosk mati total |

### NFR-3 — Privasi & Kepatuhan Data ⚠️ (kritikal)

| ID      | Requirement                                                                                                                                                                                     |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NFR-3.1 | Data biometrik (wajah) termasuk **data pribadi bersifat spesifik** menurut UU No. 27/2022 tentang Pelindungan Data Pribadi → wajib **persetujuan eksplisit** dari member sebelum sistem dipakai |
| NFR-3.2 | **Frame wajah tidak disimpan sama sekali (D-3)**; hanya hasil klasifikasi + skor emosi yang disimpan                                                                                            |
| NFR-3.3 | Pemrosesan dilakukan **on-premise di perangkat kiosk**, tidak dikirim ke layanan pihak ketiga di luar perusahaan                                                                                |
| NFR-3.4 | Tujuan penggunaan dibatasi ke **safety & wellbeing**, dinyatakan tertulis: **tidak digunakan untuk penilaian kinerja, sanksi, atau dasar promosi/demosi**                                       |
| NFR-3.5 | Retensi data mood dibatasi (usulan: detail 6–12 bulan, setelah itu hanya agregat)                                                                                                               |
| NFR-3.6 | Member berhak melihat data mood dirinya sendiri dan mengajukan koreksi                                                                                                                          |
| NFR-3.7 | Notifikasi transparansi ditempel di kiosk: apa yang direkam, untuk apa, disimpan berapa lama, dan bahwa foto tidak disimpan                                                                     |
| NFR-3.8 | Perlu review & persetujuan HR / Safety sebelum implementasi                                                                                                                                     |

### NFR-4 — Usability

| ID      | Requirement                                                                                           |
| ------- | ----------------------------------------------------------------------------------------------------- |
| NFR-4.1 | Zero-training: cukup ikuti instruksi di layar                                                         |
| NFR-4.2 | Bisa dioperasikan **tanpa menyentuh layar** (sarung tangan, tangan kotor) — hanya scan + hadap kamera |
| NFR-4.3 | Font besar & kontras tinggi, terbaca di pencahayaan area produksi                                     |
| NFR-4.4 | Bahasa Indonesia sepenuhnya                                                                           |
| NFR-4.5 | Tinggi kamera dapat disetel; toleran terhadap variasi tinggi badan member                             |

### NFR-5 — Akurasi & Batasan Model ⚠️

| ID      | Requirement                                                                                                                          |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| NFR-5.1 | Sistem **wajib menyimpan & menampilkan confidence score**; hasil < 50% ditandai "kurang yakin"                                       |
| NFR-5.2 | Hasil deteksi diperlakukan sebagai **indikator awal, bukan diagnosis** — keputusan akhir tetap oleh leader lewat komunikasi langsung |
| NFR-5.3 | Uji akurasi awal (min. 30 member) membandingkan hasil model vs. laporan mandiri member, sebelum rollout penuh                        |
| NFR-5.4 | Pengaruh kacamata safety, masker, helm, dan backlight terhadap deteksi harus diuji di lokasi kiosk sebenarnya                        |

### NFR-6 — Security

| ID      | Requirement                                                                |
| ------- | -------------------------------------------------------------------------- |
| NFR-6.1 | Semua komunikasi via HTTPS                                                 |
| NFR-6.2 | Role-based access control di level database (RLS)                          |
| NFR-6.3 | Audit log untuk semua perubahan data absen & master member                 |
| NFR-6.4 | Perangkat kiosk dikunci dalam kiosk mode (tidak bisa dibuka aplikasi lain) |

### NFR-7 — Maintainability & Scalability

| ID      | Requirement                                                            |
| ------- | ---------------------------------------------------------------------- |
| NFR-7.1 | Mapping emosi → kategori & threshold disimpan sebagai konfigurasi      |
| NFR-7.2 | Arsitektur sanggup berkembang ke 500+ member dan kiosk tambahan        |
| NFR-7.3 | Konsisten dengan stack tools Casting yang sudah ada agar mudah dirawat |
| NFR-7.4 | Dokumentasi teknis + SOP operasional & troubleshooting disertakan      |

---

## 7. Scope

### 7.1 In Scope (MVP — Fase 1)

- ✅ Kiosk absen: scan barcode Noreg → welcome → kamera 3 detik → hasil
- ✅ Deteksi emosi via DeepFace dengan multi-frame averaging
- ✅ Klasifikasi 3 kategori: **HAPPY / NETRAL / BADMOOD**
- ✅ Fallback manual (3 tombol emoji) bila deteksi gagal 3×
- ✅ Penyimpanan record: noreg, nama, timestamp, shift, kategori, confidence, skor 7 emosi, sumber
- ✅ Dashboard: kartu ringkasan, donut chart, tabel detail, filter tanggal & shift
- ✅ Admin: import Excel, CRUD member, cetak barcode, konfigurasi mapping & shift
- ✅ Login untuk dashboard & admin
- ✅ Halaman informasi privasi & consent

### 7.2 Out of Scope (Fase 1)

- ❌ **Kategori "sakit"** — dibatalkan (D-1)
- ❌ **Face recognition untuk identifikasi** — identifikasi tetap pakai barcode
- ❌ **Penyimpanan foto/video wajah** — dibatalkan (D-3)
- ❌ Integrasi ke sistem absensi/payroll resmi perusahaan
- ❌ Penilaian atau ranking individu berdasarkan mood
- ❌ Deteksi kelelahan/drowsiness, deteksi APD, deteksi suhu tubuh
- ❌ Aplikasi mobile native
- ❌ Notifikasi otomatis via WhatsApp/email
- ❌ Analisa korelasi otomatis mood ↔ defect/near-miss (bisa manual dari export)
- ❌ Absen keluar (check-out) — Fase 1 hanya absen masuk
- ❌ Kiosk kedua (disiapkan arsitekturnya, tapi belum diimplementasi)

### 7.3 Asumsi

1. Tersedia 1 unit PC/mini-PC + webcam + barcode scanner + monitor di titik absen
2. Setiap member memiliki kartu/ID dengan barcode Noreg (atau akan dicetak)
3. Tersedia jaringan internal dari kiosk ke Supabase
4. Master data awal = 180 member dari `data-login.xlsx`
5. Pencahayaan titik absen memadai untuk deteksi wajah (perlu dicek/ditambah lampu)
6. Titik absen berada di jalur yang dilewati semua member saat masuk shift

### 7.4 Ketergantungan

- Persetujuan HR / Safety terkait pengumpulan data biometrik & mood
- Pengadaan hardware (PC, webcam, scanner, monitor, dudukan)
- Izin IT untuk instalasi Python & akses jaringan
- Sosialisasi ke member sebelum go-live

---

## 8. Rekomendasi Tech Stack

### 8.1 Arsitektur yang dipilih (D-2)

DeepFace adalah library **Python**, sedangkan tools Casting lain berbasis **React + Supabase + Netlify**. Sistem ini karenanya **tidak bisa 100% serverless** — dibutuhkan satu proses Python yang berjalan.

**Arsitektur terpilih: Kiosk Lokal (Pola A)**

```
┌─────────────────────────── PC KIOSK (1 unit) ───────────────────────────┐
│                                                                          │
│   Barcode Scanner (USB)  ──►  Chrome kiosk mode                          │
│                                    │                                     │
│                              React Kiosk App                             │
│                                    │  (frame base64, HTTP lokal)         │
│                                    ▼                                     │
│                       FastAPI + DeepFace + OpenCV                        │
│                       localhost:8000  ·  model warm-loaded               │
│                                    │                                     │
│   Webcam (USB) ────────────────────┘   frame diproses di RAM, dibuang    │
│                                                                          │
└──────────────────────────────────┬───────────────────────────────────────┘
                                   │  hanya HASIL (JSON) — tanpa gambar
                                   ▼
                        Supabase (PostgreSQL + Auth + Realtime)
                                   │
                                   ▼
                    Dashboard React @ Netlify (leader & manager)
```

**Kenapa pola ini:**

- Wajah tidak pernah keluar dari perangkat → memenuhi D-3 dan NFR-3
- Latensi rendah (tidak ada round-trip jaringan untuk analisa)
- Absen tetap jalan saat internet putus (queue lokal)
- Hanya 1 kiosk → beban instalasi Python hanya di 1 perangkat

### 8.2 Stack

| Layer                 | Teknologi                                                                                          | Alasan                                                               |
| --------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| **Frontend Kiosk**    | React + Vite + Tailwind CSS                                                                        | Konsisten dengan tools Casting lain; UI kiosk besar & simpel         |
| **Akses Kamera**      | `navigator.mediaDevices.getUserMedia()` → capture ke canvas → base64 ke backend lokal              | Tidak perlu library berat; jalan di Chrome kiosk mode                |
| **Backend AI**        | **Python 3.10 + FastAPI + DeepFace + OpenCV**                                                      | DeepFace butuh Python; FastAPI ringan & mudah dijadikan service      |
| **Model & detector**  | `DeepFace.analyze(actions=['emotion'])`, detector `opencv` atau `yunet`, `enforce_detection=False` | Detector ringan = cukup cepat di CPU                                 |
| **Database**          | **Supabase (PostgreSQL)**                                                                          | Sama dengan Portal Hub & tools lain; sudah ada Auth + RLS + Realtime |
| **Auth Dashboard**    | Supabase Auth (email/password) + RLS per role                                                      | Tidak perlu bangun login sendiri                                     |
| **Chart Dashboard**   | React + **Recharts**                                                                               | Ringan, donut/bar/line chart mudah dibuat menarik                    |
| **Realtime**          | Supabase Realtime subscription                                                                     | Dashboard update tanpa refresh                                       |
| **Hosting Dashboard** | Netlify                                                                                            | Sama dengan Portal Hub                                               |
| **Kiosk runtime**     | Chrome kiosk mode + backend Python sebagai Windows Service (NSSM)                                  | Sederhana, tidak perlu Electron                                      |
| **Barcode scanner**   | USB keyboard-wedge (Code128)                                                                       | Paling murah & reliable; tidak perlu kode khusus                     |
| **Cetak barcode**     | `bwip-js` / `jsbarcode` → halaman cetak label                                                      | Cukup di frontend                                                    |
| **Offline queue**     | IndexedDB + sync worker                                                                            | Absen tetap jalan saat jaringan bermasalah                           |

### 8.3 Skema Database (Supabase)

```sql
members
  id            uuid PK
  noreg         text UNIQUE NOT NULL     -- TEXT, bukan integer
  nama          text NOT NULL
  group_line    text NULL                -- lihat OQ-1
  shift_default text NULL
  is_active     boolean DEFAULT true
  created_at    timestamptz

mood_records
  id             uuid PK
  member_id      uuid FK -> members.id
  noreg          text            -- denormalisasi untuk kemudahan query
  nama           text
  recorded_at    timestamptz
  shift          text            -- 1 / 2 / 3, dihitung dari jam
  category       text            -- HAPPY | NETRAL | BADMOOD
  confidence     numeric         -- 0-100
  low_confidence boolean         -- true bila < threshold
  raw_scores     jsonb           -- {angry, disgust, fear, happy, sad, surprise, neutral}
  source         text            -- auto | manual
  frames_used    int
  device_id      text
  followed_up    boolean DEFAULT false
  followup_note  text NULL
  followup_by    uuid NULL
  -- CATATAN: TIDAK ADA kolom untuk menyimpan gambar (D-3)

emotion_mapping   -- mapping dapat diubah tanpa deploy ulang
  emotion       text PK         -- happy, sad, angry, disgust, fear, surprise, neutral
  category      text            -- HAPPY | NETRAL | BADMOOD
  updated_at    timestamptz

app_config
  key           text PK         -- mis. 'confidence_threshold', 'capture_fps'
  value         jsonb

shift_config
  shift         text PK
  start_time    time
  end_time      time

audit_log
  id, actor, action, table_name, record_id, before, after, created_at
```

**Seed data `emotion_mapping` (sesuai D-1):**

| emotion  | category |
| -------- | -------- |
| happy    | HAPPY    |
| neutral  | NETRAL   |
| surprise | NETRAL   |
| angry    | BADMOOD  |
| sad      | BADMOOD  |
| disgust  | BADMOOD  |
| fear     | BADMOOD  |

### 8.4 Alur Teknis Satu Siklus Absen

```
[Scan barcode] → Noreg masuk ke input auto-focus + Enter
      ↓
[Cek member] → validasi ke Supabase (cache lokal untuk kecepatan)
      ↓  ketemu
[Welcome Screen] "Selamat Datang, MOH. ELI NURWANTO"   (1,5 detik)
      ↓
[Kamera aktif] countdown 3-2-1
   capture 6-9 frame @2-3 fps ke memori
      ↓
[POST localhost:8000/analyze]  (array base64)
      ↓
DeepFace.analyze(actions=['emotion']) per frame
      ↓
rata-rata skor 7 emosi → argmax → mapping ke HAPPY/NETRAL/BADMOOD
      ↓
buffer frame di-flush dari memori  ◄── D-3
      ↓
[INSERT mood_records] ke Supabase (atau queue lokal bila offline)
      ↓
[Layar hasil] ikon + nama + jam + beep   (3 detik)
      ↓
[Auto-reset] kembali ke layar scan
```

### 8.5 Kebutuhan Hardware

| Item             | Spesifikasi minimum                                          | Catatan                                                       |
| ---------------- | ------------------------------------------------------------ | ------------------------------------------------------------- |
| PC/Mini PC kiosk | Intel i5 gen 8+ / Ryzen 5, RAM 8 GB, SSD 256 GB              | GPU tidak wajib untuk 1 kiosk                                 |
| Webcam           | 1080p, autofocus                                             | Kelas Logitech C920 sudah cukup                               |
| Lampu tambahan   | LED diffuse di depan wajah                                   | Penting — backlight adalah penyebab gagal deteksi paling umum |
| Barcode scanner  | USB keyboard-wedge, Code128/Code39                           | Yang standar sudah cukup                                      |
| Monitor          | 21–24"                                                       | Touch hanya diperlukan untuk fallback manual                  |
| Dudukan/stand    | Tinggi kamera setara mata rata-rata (±160 cm), dapat disetel |                                                               |
| Jaringan         | LAN/WiFi ke jaringan internal                                |                                                               |

---

## 9. Risiko & Mitigasi

| #   | Risiko                                                                                                                | Dampak                                                     | Mitigasi                                                                                                                           |
| --- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| R1  | **Akurasi model terbatas** — model FER berbasis FER2013 akurasinya ±65–70% di kondisi ideal, lebih rendah di lapangan | Data mood menyesatkan                                      | Multi-frame averaging, simpan & tampilkan confidence, uji 30 member dulu, perlakukan sebagai indikator bukan vonis                 |
| R2  | **Ekspresi netral mendominasi**                                                                                       | Distribusi terlihat "datar", grafik kurang informatif      | Sudah diantisipasi dengan kategori NETRAL (D-1); yang dipantau adalah **pergeseran tren**, bukan angka absolut harian              |
| R3  | **1 kiosk = antrean & single point of failure**                                                                       | Member terlambat masuk kerja; sistem mati = tidak ada data | Buka window absen 30 menit lebih awal, ukur waktu antre di uji coba, siapkan SOP absen manual cadangan, siap tambah kiosk kedua    |
| R4  | **Kondisi area** (kacamata safety, masker, helm, backlight, wajah berkeringat) mengganggu deteksi                     | Banyak kegagalan deteksi                                   | Uji lapangan di titik sebenarnya, tambah pencahayaan, sediakan fallback manual                                                     |
| R5  | **Penolakan / ketidaknyamanan member**                                                                                | Adopsi rendah, "senyum palsu"                              | Sosialisasi jelas, kebijakan tertulis "bukan untuk penilaian kinerja", transparansi bahwa foto tidak disimpan (D-3 memperkuat ini) |
| R6  | **Kepatuhan UU PDP** — data biometrik butuh consent eksplisit                                                         | Risiko hukum & compliance internal                         | Consent tertulis, review HR/Safety, kebijakan retensi, pemrosesan on-premise                                                       |
| R7  | **Maintenance Python di kiosk**                                                                                       | Aplikasi mati tanpa yang bisa perbaiki                     | Jalankan sebagai service dengan auto-restart, SOP troubleshooting sederhana, dokumentasi instalasi                                 |
| R8  | **"Senyum palsu" saat di depan kamera**                                                                               | Data tidak mencerminkan kondisi asli                       | Terima sebagai keterbatasan; gunakan data sebagai pemicu percakapan, bukan kesimpulan                                              |
| R9  | **Tanpa SOP tindak lanjut, aplikasi hanya jadi pengumpul data**                                                       | Effort besar tanpa manfaat nyata                           | Tetapkan SOP: siapa follow up, kapan, tindakan apa — sebelum go-live (OQ-4)                                                        |

---

## 10. Roadmap Bertahap

| Fase                           | Isi                                                                                                                       | Estimasi   |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------- | ---------- |
| **Fase 0 — Persetujuan**       | Consent member, review HR/Safety, keputusan open questions tersisa                                                        | 1–2 minggu |
| **Fase 1 — PoC teknis**        | Uji DeepFace di PC target: kecepatan per frame, akurasi, pengaruh kacamata/masker/pencahayaan. **Belum bangun UI penuh.** | 2–3 hari   |
| **Fase 2 — MVP**               | Kiosk absen + backend + database + dashboard dasar + admin                                                                | 3–4 minggu |
| **Fase 3 — Uji coba terbatas** | ±30 member selama 2 minggu; kalibrasi mapping, threshold, dan **ukur waktu antre**                                        | 2 minggu   |
| **Fase 4 — Rollout**           | 180 member, tambah chart tren & export                                                                                    | 2 minggu   |
| **Fase 5 — Kaizen report**     | Dokumentasi before/after, yokoten ke divisi lain                                                                          | 1 minggu   |

> **Saran kuat:** jangan lewati Fase 1. PoC 2–3 hari akan menjawab apakah target akurasi & kecepatan realistis di kondisi Casting, sebelum investasi waktu ke UI dan pengadaan hardware.

---

## 11. Open Questions Tersisa

| ID       | Pertanyaan                                                                                               | Kenapa penting                                                    |
| -------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **OQ-1** | Master member perlu tambahan kolom **Group/Line** dan **Shift**? File existing hanya berisi Nama + Noreg | Filter dashboard per group/shift tidak bisa dibuat tanpa data ini |
| **OQ-2** | Barcode sudah ada di kartu member existing, atau perlu dicetak baru?                                     | Menentukan apakah fitur cetak label masuk MVP                     |
| **OQ-3** | Data mood boleh dilihat **per individu** oleh leader, atau hanya **agregat**?                            | Menentukan desain dashboard & tingkat sensitivitas kebijakan      |
| **OQ-4** | **Siapa yang menindaklanjuti hasil BADMOOD, dan tindakannya apa?**                                       | Tanpa SOP tindak lanjut, aplikasi hanya jadi pengumpul data (R9)  |
| **OQ-5** | Titik kiosk ditempatkan di mana persisnya? (dekat pintu masuk / ruang briefing / locker)                 | Menentukan pencahayaan, kelistrikan, jaringan, dan alur antrean   |
| **OQ-6** | Absen hanya masuk shift, atau juga pulang?                                                               | Menambah scope signifikan bila keduanya                           |

---

## 12. Lampiran — Catatan Data Master

Dari file `data-login.xlsx`:

- Jumlah baris: **180 member**
- Kolom: `Nama`, `Noreg`
- Noreg: angka, **unik** (tidak ada duplikat), panjang bervariasi **5–7 digit**
- Tidak ada nilai kosong
- ⚠️ Noreg saat ini tersimpan sebagai **angka** di Excel — bila ada Noreg yang aslinya berawalan `0`, angka nol tersebut sudah hilang. Perlu dicek ke data resmi sebelum cetak barcode.
- ⚠️ Belum ada kolom Group/Line, Shift, maupun Jabatan (lihat OQ-1)

---

_Dokumen ini adalah draft perencanaan v0.2. Versi final (v1.0) akan dibuat dalam format DOCX/PDF dengan branding TMMIN setelah open questions di Bagian 11 diputuskan._
