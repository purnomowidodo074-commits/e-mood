"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { generateMockDataAction, deleteMockDataAction, type MockGenResult } from "@/lib/actions";

const field =
  "block w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-primary";
const labelCls = "text-xs font-medium text-muted-foreground";

export function MockDataForm({
  defaultStart,
  defaultEnd,
  threshold,
  mockCount,
}: {
  defaultStart: string;
  defaultEnd: string;
  threshold: number;
  mockCount: number;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<MockGenResult, FormData>(
    (_prev, fd) => generateMockDataAction(_prev, fd),
    {},
  );
  const [dist, setDist] = useState({ h: 55, n: 30, b: 15 });
  const distSum = dist.h + dist.n + dist.b;

  const [deleting, startDelete] = useTransition();
  const [armed, setArmed] = useState(false);
  const [deleted, setDeleted] = useState<number | null>(null);

  function runDelete() {
    startDelete(async () => {
      const r = await deleteMockDataAction();
      setDeleted(r.deleted);
      setArmed(false);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        action={(fd) => {
          setDeleted(null);
          return formAction(fd);
        }}
        className="anim-fade-up flex flex-col gap-5 rounded-2xl border border-border bg-surface p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className={labelCls}>
            <span className="mb-1 block">Tanggal mulai</span>
            <input type="date" name="startDate" defaultValue={defaultStart} required className={field} />
          </label>
          <label className={labelCls}>
            <span className="mb-1 block">Tanggal selesai</span>
            <input type="date" name="endDate" defaultValue={defaultEnd} required className={field} />
          </label>
          <label className={labelCls}>
            <span className="mb-1 block">Target kehadiran (% member aktif)</span>
            <input type="number" name="targetPct" defaultValue={85} min={0} max={100} required className={field} />
          </label>

          <label className={labelCls}>
            <span className="mb-1 block">Jam absen Day — dari</span>
            <input type="time" name="dayFrom" defaultValue="06:00" required className={field} />
          </label>
          <label className={labelCls}>
            <span className="mb-1 block">Jam absen Day — sampai</span>
            <input type="time" name="dayTo" defaultValue="09:00" required className={field} />
          </label>
          <span className="hidden lg:block" />

          <label className={labelCls}>
            <span className="mb-1 block">Jam absen Night — dari</span>
            <input type="time" name="nightFrom" defaultValue="18:00" required className={field} />
          </label>
          <label className={labelCls}>
            <span className="mb-1 block">Jam absen Night — sampai</span>
            <input type="time" name="nightTo" defaultValue="21:00" required className={field} />
          </label>
          <span className="hidden lg:block" />
        </div>

        <fieldset className="rounded-xl border border-border p-4">
          <legend className="px-1 text-xs font-semibold text-foreground">
            Distribusi mood{" "}
            <span className={distSum === 100 ? "text-muted-foreground" : "text-destructive"}>
              (jumlah {distSum} / 100)
            </span>
          </legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className={labelCls}>
              <span className="mb-1 block">Happy %</span>
              <input
                type="number"
                name="distHappy"
                value={dist.h}
                min={0}
                max={100}
                onChange={(e) => setDist((d) => ({ ...d, h: Number(e.target.value) }))}
                className={field}
              />
            </label>
            <label className={labelCls}>
              <span className="mb-1 block">Netral %</span>
              <input
                type="number"
                name="distNetral"
                value={dist.n}
                min={0}
                max={100}
                onChange={(e) => setDist((d) => ({ ...d, n: Number(e.target.value) }))}
                className={field}
              />
            </label>
            <label className={labelCls}>
              <span className="mb-1 block">Badmood %</span>
              <input
                type="number"
                name="distBadmood"
                value={dist.b}
                min={0}
                max={100}
                onChange={(e) => setDist((d) => ({ ...d, b: Number(e.target.value) }))}
                className={field}
              />
            </label>
          </div>
        </fieldset>

        <fieldset className="rounded-xl border border-border p-4">
          <legend className="px-1 text-xs font-semibold text-foreground">
            Confidence — threshold saat ini {threshold}% (di bawah = &quot;kurang yakin&quot;)
          </legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className={labelCls}>
              <span className="mb-1 block">Min %</span>
              <input type="number" name="confMin" defaultValue={72} min={0} max={100} required className={field} />
            </label>
            <label className={labelCls}>
              <span className="mb-1 block">Max %</span>
              <input type="number" name="confMax" defaultValue={99} min={0} max={100} required className={field} />
            </label>
            <label className={labelCls}>
              <span className="mb-1 block">% kurang yakin</span>
              <input type="number" name="lowConfPct" defaultValue={12} min={0} max={100} required className={field} />
            </label>
          </div>
        </fieldset>

        {state.error && (
          <p role="alert" className="anim-fade text-sm text-destructive">
            {state.error}
          </p>
        )}
        {state.inserted != null && !state.error && (
          <p className="anim-fade rounded-lg bg-happy-bg px-3 py-2 text-sm text-happy">
            {state.inserted} record dibuat ({state.days} hari × 2 shift, target {state.perShift}/shift).{" "}
            {state.existing ? `${state.existing} record sudah ada sebelumnya, dilewati.` : ""}
          </p>
        )}

        <button
          type="submit"
          disabled={pending || distSum !== 100}
          className="cursor-pointer self-start rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-transform duration-[var(--dur-fast)] hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Membuat data..." : "Generate Mock Data"}
        </button>
      </form>

      <div className="anim-fade-up flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface p-6">
        <div className="mr-auto">
          <h2 className="text-sm font-semibold text-foreground">Hapus semua data mock</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {mockCount} record mock saat ini. Data absen asli dari kamera tidak terpengaruh.
          </p>
          {deleted != null && (
            <p className="anim-fade mt-1 text-xs text-happy">{deleted} record mock dihapus.</p>
          )}
        </div>
        {!armed ? (
          <button
            type="button"
            onClick={() => setArmed(true)}
            disabled={mockCount === 0}
            className="cursor-pointer rounded-lg border border-destructive/40 px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Hapus data mock
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Yakin?</span>
            <button
              type="button"
              onClick={runDelete}
              disabled={deleting}
              className="cursor-pointer rounded-lg bg-destructive px-3 py-2 text-sm font-medium text-white transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
            >
              {deleting ? "Menghapus..." : "Ya, hapus"}
            </button>
            <button
              type="button"
              onClick={() => setArmed(false)}
              disabled={deleting}
              className="cursor-pointer rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-2 disabled:opacity-50"
            >
              Batal
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
