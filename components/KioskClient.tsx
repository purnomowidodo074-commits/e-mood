"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { IconArrowLeft, IconBackspace, IconFaceHappy, IconFaceNeutral, IconFaceSad, IconCamera } from "@/components/icons";

const ANALYZE_URL = process.env.NEXT_PUBLIC_KIOSK_ANALYZE_URL ?? "http://localhost:8000/analyze";
const CAPTURE_DURATION_MS = 3000;
const CAPTURE_FRAME_COUNT = 8;
const MAX_RETRIES = 3;

type Category = "HAPPY" | "NETRAL" | "BADMOOD";

type Stage = "scan" | "welcome" | "camera" | "analyzing" | "result" | "manual" | "message";

type Member = { id: string; noreg: string; nama: string };
type ResultData = { nama: string; category: Category; confidence: number; lowConfidence: boolean };

const CATEGORY_META: Record<Category, { label: string; icon: typeof IconFaceHappy; message: string; color: string }> = {
  HAPPY: { label: "HAPPY", icon: IconFaceHappy, message: "Semangat terus ya!", color: "#34d399" },
  NETRAL: { label: "NETRAL", icon: IconFaceNeutral, message: "Semoga harimu lancar.", color: "#fbbf24" },
  BADMOOD: { label: "BADMOOD", icon: IconFaceSad, message: "Semangat ya, hati-hati di area kerja.", color: "#fb923c" },
};

// Beep via Web Audio (no asset file needed) — FR-4.2, Should priority.
function beep(freq: number, durationMs: number) {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);
    osc.onended = () => ctx.close();
  } catch {
    // audio not available — non-critical, ignore (NFR-2.3 style: never block the flow)
  }
}

const CAMERA_STORAGE_KEY = "kiosk-camera-device-id";

export function KioskClient({ isAdmin }: { isAdmin: boolean }) {
  const [stage, setStage] = useState<Stage>("scan");
  const [noreg, setNoreg] = useState("");
  const [member, setMember] = useState<Member | null>(null);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<ResultData | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [countdown, setCountdown] = useState(3);

  // Kiosk PC bisa punya lebih dari satu "kamera" terdaftar (mis. HP yang ditautkan
  // sebagai webcam) — pilih eksplisit alih-alih pasrah ke default OS/browser.
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [cameraDeviceId, setCameraDeviceId] = useState<string | null>(() =>
    typeof window === "undefined" ? null : localStorage.getItem(CAMERA_STORAGE_KEY)
  );

  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const refreshCameraDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === "videoinput");
      setCameraDevices(videoInputs);
    } catch {
      // enumerateDevices tidak didukung/diizinkan — biarkan browser pakai default.
    }
  }, []);

  useEffect(() => {
    (async () => {
      await refreshCameraDevices();
    })();
    navigator.mediaDevices?.addEventListener?.("devicechange", refreshCameraDevices);
    return () => navigator.mediaDevices?.removeEventListener?.("devicechange", refreshCameraDevices);
  }, [refreshCameraDevices]);

  function handleCameraDeviceChange(id: string) {
    setCameraDeviceId(id);
    localStorage.setItem(CAMERA_STORAGE_KEY, id);
  }

  // FR-1.1: input scanner selalu auto-focus saat di layar scan — tapi jangan
  // rebut fokus dari kontrol interaktif lain (dropdown kamera, keypad, dsb).
  useEffect(() => {
    if (stage !== "scan") return;
    inputRef.current?.focus();
    const refocus = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("select, button, input, label, a")) return;
      inputRef.current?.focus();
    };
    document.addEventListener("click", refocus);
    return () => document.removeEventListener("click", refocus);
  }, [stage]);

  const showMessage = useCallback((text: string, next: Stage, delay = 2500) => {
    setMessage(text);
    setStage("message");
    setTimeout(() => setStage(next), delay);
  }, []);

  const showResult = useCallback((data: ResultData) => {
    setResult(data);
    setStage("result");
    beep(data.category === "BADMOOD" ? 320 : 660, 180);
    setTimeout(() => {
      setResult(null);
      setMember(null);
      setStage("scan");
    }, 3000);
  }, []);

  const analyzeAndSubmit = useCallback(
    async (frames: string[]) => {
      if (!member) return;
      try {
        const analyzeRes = await fetch(ANALYZE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ frames }),
        });
        const analyzed = await analyzeRes.json();

        if (!analyzed.detected) {
          const nextRetry = retryCount + 1;
          setRetryCount(nextRetry);
          if (nextRetry >= MAX_RETRIES) {
            setStage("manual");
          } else {
            showMessage("Wajah tidak terdeteksi, coba lagi", "camera", 1800);
          }
          return;
        }

        const submitRes = await fetch("/api/kiosk/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            noreg: member.noreg,
            mode: "auto",
            rawScores: analyzed.raw_scores,
            framesUsed: analyzed.frames_used,
          }),
        });
        const submitData = await submitRes.json();
        if (!submitRes.ok) {
          showMessage(submitData.error ?? "Gagal menyimpan absen", "scan");
          return;
        }
        showResult(submitData);
      } catch {
        showMessage("Layanan kamera lokal tidak merespons. Pastikan backend kiosk jalan.", "scan", 3000);
      }
    },
    [member, retryCount, showMessage, showResult]
  );

  async function handleScanSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = noreg.trim();
    setNoreg("");
    if (!value) return;

    const res = await fetch("/api/kiosk/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noreg: value }),
    });
    const data = await res.json();

    if (!data.found) {
      showMessage("Noreg tidak terdaftar", "scan");
      return;
    }
    if (data.alreadyRecorded) {
      showMessage(`Anda sudah absen jam ${data.existingTime}`, "scan");
      return;
    }

    setMember(data.member);
    setRetryCount(0);
    setStage("welcome");
    setTimeout(() => setStage("camera"), 1500);
  }

  // ---- Camera capture (FR-3.1–3.3) ----
  useEffect(() => {
    if (stage !== "camera") return;
    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: cameraDeviceId ? { deviceId: { exact: cameraDeviceId } } : { facingMode: "user" },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        refreshCameraDevices(); // labels hanya terisi setelah izin kamera diberikan
      } catch {
        showMessage("Kamera tidak tersedia, coba lagi", "scan");
        return;
      }

      const frames: string[] = [];
      const intervalMs = CAPTURE_DURATION_MS / CAPTURE_FRAME_COUNT;
      setCountdown(3);
      const countdownTimer = setInterval(() => {
        setCountdown((c) => (c > 1 ? c - 1 : c));
      }, 1000);

      for (let i = 0; i < CAPTURE_FRAME_COUNT; i++) {
        await new Promise((r) => setTimeout(r, intervalMs));
        if (cancelled) break;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video && canvas && video.videoWidth > 0) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          canvas.getContext("2d")?.drawImage(video, 0, 0);
          frames.push(canvas.toDataURL("image/jpeg", 0.8));
        }
      }
      clearInterval(countdownTimer);

      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      // frames live only in this closure and are discarded once analyzed — never written to disk (D-3).

      if (cancelled) return;
      setStage("analyzing");
      await analyzeAndSubmit(frames);
    })();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  async function handleManualPick(category: Category) {
    if (!member) return;
    const res = await fetch("/api/kiosk/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noreg: member.noreg, mode: "manual", category }),
    });
    const data = await res.json();
    if (!res.ok) {
      showMessage(data.error ?? "Gagal menyimpan absen", "scan");
      return;
    }
    showResult(data);
  }

  function appendKeypad(digit: string) {
    setNoreg((v) => (v + digit).slice(0, 12));
  }

  return (
    <div className="relative flex min-h-full flex-col items-center justify-center gap-8 overflow-hidden bg-background px-6 py-10 text-center">
      <div
        className="pointer-events-none absolute -top-32 left-1/2 h-80 w-[40rem] -translate-x-1/2 rounded-full opacity-[0.18] blur-3xl"
        style={{ background: "radial-gradient(circle, var(--primary), transparent 70%)" }}
      />

      {isAdmin && (
        <Link
          href="/dashboard"
          className="absolute right-4 top-4 z-10 flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-surface/80 px-3.5 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm transition-colors hover:border-primary/40 hover:text-primary"
        >
          <IconArrowLeft className="h-3.5 w-3.5" />
          Dashboard
        </Link>
      )}

      {stage === "scan" && (
        <div key="scan" className="anim-fade-up relative flex w-full max-w-md flex-col items-center gap-7">
          <div className="flex flex-col items-center gap-2">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary text-lg font-bold text-primary-foreground shadow-[0_0_30px_-6px_var(--primary)]">
              e
            </span>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Scan Kartu Noreg</h1>
          </div>
          <form onSubmit={handleScanSubmit} className="w-full">
            <input
              ref={inputRef}
              value={noreg}
              onChange={(e) => setNoreg(e.target.value)}
              autoFocus
              inputMode="numeric"
              className="w-full rounded-2xl border-2 border-primary/60 bg-surface px-4 py-5 text-center font-mono text-3xl tracking-[0.3em] text-foreground outline-none transition-colors focus:border-primary"
              placeholder="•••••••"
            />
          </form>
          <Keypad
            onDigit={appendKeypad}
            onBackspace={() => setNoreg((v) => v.slice(0, -1))}
            onSubmit={() => handleScanSubmit({ preventDefault() {} } as React.FormEvent)}
          />
          {cameraDevices.length > 1 && (
            <CameraPicker devices={cameraDevices} value={cameraDeviceId} onChange={handleCameraDeviceChange} />
          )}
          <PrivacyNotice />
        </div>
      )}

      {stage === "welcome" && member && (
        <div key="welcome" className="anim-scale-in relative flex flex-col items-center gap-3">
          <p className="text-lg text-muted-foreground">Selamat datang,</p>
          <h1 className="text-5xl font-bold tracking-tight text-foreground">{member.nama}</h1>
        </div>
      )}

      {stage === "camera" && (
        <div key="camera" className="anim-fade-up relative flex flex-col items-center gap-5">
          <p className="flex items-center gap-2 text-lg font-medium text-foreground">
            <IconCamera className="h-5 w-5 text-primary" />
            Hadapkan wajah ke kamera
          </p>
          <div className="relative overflow-hidden rounded-3xl border border-border shadow-2xl">
            <video ref={videoRef} autoPlay muted playsInline className="h-72 w-96 bg-black object-cover" />
            <div className="pointer-events-none absolute inset-6 rounded-full border-4 border-dashed border-white/70" />
            <span className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 font-mono text-lg font-bold text-white backdrop-blur-sm">
              {countdown}
            </span>
          </div>
          <div className="h-1.5 w-80 overflow-hidden rounded-full bg-surface-2">
            <div className="anim-progress h-full rounded-full bg-gradient-to-r from-primary to-secondary" />
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {stage === "analyzing" && (
        <div key="analyzing" className="anim-fade relative flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-surface-2 border-t-primary" />
          <p className="text-lg font-medium text-muted-foreground">Menganalisa...</p>
        </div>
      )}

      {stage === "manual" && (
        <div key="manual" className="anim-fade-up relative flex flex-col items-center gap-6">
          <p className="text-lg font-medium text-foreground">Wajah tidak terdeteksi. Pilih perasaan Anda:</p>
          <div className="anim-stagger flex gap-4">
            {(Object.keys(CATEGORY_META) as Category[]).map((c) => {
              const meta = CATEGORY_META[c];
              const Icon = meta.icon;
              return (
                <button
                  key={c}
                  onClick={() => handleManualPick(c)}
                  className="flex cursor-pointer flex-col items-center gap-2.5 rounded-2xl border border-border bg-surface px-7 py-5 transition-all duration-[var(--dur-fast)] hover:scale-105 hover:border-transparent active:scale-95"
                  style={{ boxShadow: `0 0 0 0 transparent` }}
                  onMouseEnter={(e) => (e.currentTarget.style.boxShadow = `0 0 24px -4px ${meta.color}`)}
                  onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 0 0 0 transparent")}
                >
                  <Icon className="h-10 w-10" style={{ color: meta.color }} />
                  <span className="text-sm font-medium text-muted-foreground">{meta.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {stage === "result" && result && (
        <div key="result" className="anim-scale-in relative flex flex-col items-center gap-3">
          {(() => {
            const Icon = CATEGORY_META[result.category].icon;
            return (
              <div
                className="flex h-24 w-24 items-center justify-center rounded-full"
                style={{ background: `${CATEGORY_META[result.category].color}22` }}
              >
                <Icon className="h-14 w-14" style={{ color: CATEGORY_META[result.category].color }} />
              </div>
            );
          })()}
          <h1 className="text-2xl font-bold text-foreground">{result.nama}</h1>
          <p className="text-muted-foreground">{CATEGORY_META[result.category].message}</p>
          {result.lowConfidence && <p className="text-xs text-accent">(hasil kurang yakin)</p>}
        </div>
      )}

      {stage === "message" && (
        <p key="message" className="anim-scale-in relative max-w-sm text-xl font-medium text-foreground">
          {message}
        </p>
      )}
    </div>
  );
}

function Keypad({
  onDigit,
  onBackspace,
  onSubmit,
}: {
  onDigit: (d: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => onDigit(d)}
          className="cursor-pointer rounded-xl border border-border bg-surface px-7 py-3.5 text-lg font-medium text-foreground/90 transition-colors duration-[var(--dur-fast)] hover:bg-surface-2 active:scale-95"
        >
          {d}
        </button>
      ))}
      <button
        type="button"
        onClick={onBackspace}
        className="flex cursor-pointer items-center justify-center rounded-xl border border-border bg-surface px-7 py-3.5 text-foreground/90 transition-colors duration-[var(--dur-fast)] hover:bg-surface-2 active:scale-95"
      >
        <IconBackspace className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={() => onDigit("0")}
        className="cursor-pointer rounded-xl border border-border bg-surface px-7 py-3.5 text-lg font-medium text-foreground/90 transition-colors duration-[var(--dur-fast)] hover:bg-surface-2 active:scale-95"
      >
        0
      </button>
      <button
        type="button"
        onClick={onSubmit}
        className="cursor-pointer rounded-xl bg-primary px-7 py-3.5 text-lg font-medium text-primary-foreground transition-transform duration-[var(--dur-fast)] hover:brightness-110 active:scale-95"
      >
        OK
      </button>
    </div>
  );
}

function CameraPicker({
  devices,
  value,
  onChange,
}: {
  devices: MediaDeviceInfo[];
  value: string | null;
  onChange: (id: string) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-muted-foreground">
      Kamera:
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary"
      >
        <option value="" disabled>
          Pilih kamera...
        </option>
        {devices.map((d, i) => (
          <option key={d.deviceId} value={d.deviceId}>
            {d.label || `Kamera ${i + 1}`}
          </option>
        ))}
      </select>
    </label>
  );
}

function PrivacyNotice() {
  return (
    <p className="max-w-sm text-xs text-muted-foreground/70">
      Wajah Anda diproses sesaat untuk mendeteksi mood dan tidak disimpan. Hanya kategori mood yang tercatat.
      Data hanya untuk keselamatan &amp; kesejahteraan kerja, bukan penilaian kinerja.
    </p>
  );
}
