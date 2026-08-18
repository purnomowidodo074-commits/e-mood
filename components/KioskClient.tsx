"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { IconLock, IconBackspace, IconCamera } from "@/components/icons";
import { KioskBackground } from "@/components/KioskBackground";

gsap.registerPlugin(useGSAP);

const CYCLE_EMOJI = ["🙂", "😐", "😕"]; // happy, netral, badmood — the e-Mood mark, alive

const ANALYZE_URL = process.env.NEXT_PUBLIC_KIOSK_ANALYZE_URL ?? "http://localhost:8000/analyze";
const CAPTURE_DURATION_MS = 3000;
const CAPTURE_FRAME_COUNT = 8;
const MAX_RETRIES = 3;

type Category = "HAPPY" | "NETRAL" | "BADMOOD";

type Stage = "scan" | "welcome" | "camera" | "analyzing" | "result" | "manual" | "message";

type Member = { id: string; noreg: string; nama: string };
type ResultData = { nama: string; category: Category; confidence: number; lowConfidence: boolean };

const CATEGORY_META: Record<Category, { label: string; emoji: string; message: string; color: string }> = {
  HAPPY: { label: "HAPPY", emoji: "🙂", message: "Semangat terus ya!", color: "#34d399" },
  NETRAL: { label: "NETRAL", emoji: "😐", message: "Semoga harimu lancar.", color: "#fbbf24" },
  BADMOOD: { label: "BADMOOD", emoji: "😕", message: "Semangat ya, hati-hati di area kerja.", color: "#fb923c" },
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

export function KioskClient({ hasSession }: { hasSession: boolean }) {
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
    <div className="relative flex min-h-full flex-col overflow-hidden bg-background text-center">
      <KioskBackground />

      {/* Navbar */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4">
        <Image src="/logo.png" alt="Toyota" width={140} height={40} className="h-10 w-auto object-contain" priority />
        <Link
          href={hasSession ? "/dashboard" : "/login"}
          aria-label={hasSession ? "Buka dashboard" : "Login admin"}
          title={hasSession ? "Dashboard" : "Login admin"}
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-border bg-surface/80 text-muted-foreground backdrop-blur-sm transition-colors hover:border-primary/40 hover:text-primary"
        >
          <IconLock className="h-4 w-4" />
        </Link>
      </header>
      {/* Safety-yellow hazard stripe — the industrial accent, Casting-Division register */}
      <div
        className="relative z-10 h-1.5 w-full"
        style={{
          backgroundImage:
            "repeating-linear-gradient(-45deg, var(--accent) 0 14px, #0a0a0a 14px 28px)",
        }}
      />

      <div className="relative flex flex-1 flex-col items-center justify-center gap-8 px-6 py-10">

      {stage === "scan" && (
        <div
          key="scan"
          className="anim-fade-up relative grid w-full max-w-5xl grid-cols-1 items-center gap-10 text-center lg:grid-cols-[1.1fr_1fr] lg:text-left"
        >
          {/* Headline — the attention-grabbing description */}
          <div className="flex flex-col items-center gap-5 lg:items-start">
            <EmojiCycleBadge />
            <h1 className="text-5xl font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-6xl">
              Bagaimana perasaan
              <br className="hidden lg:block" /> Anda hari ini?
            </h1>
            <p className="max-w-md text-base text-muted-foreground">
              Scan kartu Noreg Anda — kamera mengecek kondisi Anda selama 3 detik. Cepat, tidak menghakimi, dan
              hasilnya hanya untuk keselamatan &amp; kesejahteraan kerja.
            </p>
          </div>

          {/* Scan card */}
          <div className="flex flex-col items-center gap-6 rounded-3xl border border-border bg-surface/70 p-8 shadow-2xl backdrop-blur-md">
            <form onSubmit={handleScanSubmit} className="mx-auto w-full max-w-[220px]">
              <input
                ref={inputRef}
                value={noreg}
                onChange={(e) => setNoreg(e.target.value)}
                autoFocus
                inputMode="numeric"
                className="w-full rounded-xl border-2 border-primary/60 bg-surface px-3 py-2.5 text-center font-mono text-lg tracking-[0.25em] text-foreground outline-none transition-colors focus:border-primary"
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
              return (
                <button
                  key={c}
                  onClick={() => handleManualPick(c)}
                  className="flex cursor-pointer flex-col items-center gap-2.5 rounded-2xl border border-border bg-surface px-7 py-5 transition-all duration-[var(--dur-fast)] hover:scale-105 hover:border-transparent active:scale-95"
                  style={{ boxShadow: `0 0 0 0 transparent` }}
                  onMouseEnter={(e) => (e.currentTarget.style.boxShadow = `0 0 24px -4px ${meta.color}`)}
                  onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 0 0 0 transparent")}
                >
                  <span className="text-4xl">{meta.emoji}</span>
                  <span className="text-sm font-medium text-muted-foreground">{meta.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {stage === "result" && result && (
        <div key="result" className="relative flex flex-col items-center gap-3">
          <ResultIcon category={result.category} />
          <h1 className="anim-fade-up text-2xl font-bold text-foreground">{result.nama}</h1>
          <p className="anim-fade-up text-muted-foreground">{CATEGORY_META[result.category].message}</p>
          {result.lowConfidence && <p className="anim-fade-up text-xs text-accent">(hasil kurang yakin)</p>}
        </div>
      )}

      {stage === "message" && (
        <p key="message" className="anim-scale-in relative max-w-sm text-xl font-medium text-foreground">
          {message}
        </p>
      )}
      </div>
    </div>
  );
}

// Result reveal: starts fully absent (scale 0) then pops/bounces into view —
// a glossy "3D" sphere badge (layered radial-gradient highlight + shadow,
// not a flat icon) built from our existing SVG face icons, no image assets.
function ResultIcon({ category }: { category: Category }) {
  const scope = useRef<HTMLSpanElement>(null);
  const meta = CATEGORY_META[category];

  useGSAP(
    () => {
      gsap.fromTo(
        scope.current,
        { scale: 0, opacity: 0, rotate: -14 },
        { scale: 1, opacity: 1, rotate: 0, duration: 0.7, ease: "back.out(1.8)" }
      );
    },
    { scope }
  );

  return (
    <div className="flex flex-col items-center gap-2">
      <span
        className="rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-wide"
        style={{ background: `${meta.color}22`, color: meta.color }}
      >
        {meta.label}
      </span>
      <span ref={scope} className="text-[9rem] leading-none drop-shadow-lg">
        {meta.emoji}
      </span>
    </div>
  );
}

// The e-Mood mark, alive: cycles happy → netral → badmood on a loop.
// Plain GSAP timeline (no plugin needed for a 3-item crossfade) — transform +
// opacity only, static on the first frame when prefers-reduced-motion is set.
function EmojiCycleBadge() {
  const emojiRef = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const el = emojiRef.current;
      if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      let i = 0;
      gsap
        .timeline({ repeat: -1, repeatDelay: 1.1 })
        .to(el, { opacity: 0, scale: 0.7, duration: 0.25, ease: "power2.in" })
        .call(() => {
          i = (i + 1) % CYCLE_EMOJI.length;
          el.textContent = CYCLE_EMOJI[i];
        })
        .to(el, { opacity: 1, scale: 1, duration: 0.35, ease: "back.out(1.6)" });
    },
    { scope: emojiRef }
  );

  return (
    <span ref={emojiRef} className="inline-block text-7xl leading-none drop-shadow-lg">
      {CYCLE_EMOJI[0]}
    </span>
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
