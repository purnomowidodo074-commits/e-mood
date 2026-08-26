"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resetMoodRecordsAction } from "@/lib/actions";
import { IconAlertTriangle, IconRotateCcw } from "@/components/icons";

// Admin-only, destructive: wipes every mood record so dashboard counts
// restart at zero. Gated twice — the button only renders for role "admin"
// (app/dashboard/page.tsx), and the server action re-checks the role itself
// (lib/actions.ts) since a client-side gate alone is not enforcement.
export function ResetDataButton() {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    cancelRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending) close();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, pending]);

  function close() {
    setOpen(false);
    setError("");
    setDone(null);
  }

  function handleConfirm() {
    setError("");
    startTransition(async () => {
      try {
        const { deleted } = await resetMoodRecordsAction();
        setDone(deleted);
        router.refresh();
      } catch {
        setError("Gagal mereset data. Coba lagi.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-destructive/40 px-4 py-2 text-sm font-medium text-destructive transition-colors duration-[var(--dur-fast)] hover:bg-destructive/10"
      >
        <IconRotateCcw className="h-4 w-4" />
        Reset Data
      </button>

      {open && (
        <div
          className="anim-fade fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget && !pending) close();
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="reset-data-title"
            className="anim-scale-in glass-panel w-full max-w-sm rounded-2xl border p-6"
          >
            {done === null ? (
              <>
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive">
                    <IconAlertTriangle className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 id="reset-data-title" className="text-base font-semibold text-foreground">
                      Reset semua data absen?
                    </h2>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      Seluruh riwayat absen mood (semua tanggal &amp; shift) akan dihapus permanen dan
                      tidak bisa dikembalikan. Data member dan akun pengguna tidak terpengaruh.
                    </p>
                  </div>
                </div>

                {error && (
                  <p role="alert" className="anim-fade mt-3 text-sm text-destructive">
                    {error}
                  </p>
                )}

                <div className="mt-6 flex justify-end gap-2.5">
                  <button
                    ref={cancelRef}
                    type="button"
                    onClick={close}
                    disabled={pending}
                    className="cursor-pointer rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors duration-[var(--dur-fast)] hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={pending}
                    className="cursor-pointer rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-white transition-all duration-[var(--dur-fast)] hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {pending ? "Menghapus..." : "Ya, Reset Semua Data"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-happy-bg text-happy">
                    <IconRotateCcw className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-base font-semibold text-foreground">Data berhasil direset</h2>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      {done} data absen telah dihapus. Dashboard sekarang mulai dari nol.
                    </p>
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={close}
                    className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-transform duration-[var(--dur-fast)] hover:brightness-110 active:scale-95"
                  >
                    Tutup
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
