import { listEmotionMapping, getConfidenceThreshold, listShiftConfig, type Category } from "@/lib/queries";
import { updateEmotionMappingAction, updateThresholdAction, updateShiftConfigAction } from "@/lib/actions";
import { CATEGORY_LABEL } from "@/lib/colors";

const CATEGORIES: Category[] = ["HAPPY", "NETRAL", "BADMOOD"];

export default async function ConfigPage() {
  const [mapping, threshold, shifts] = await Promise.all([
    listEmotionMapping(),
    getConfidenceThreshold(),
    listShiftConfig(),
  ]);

  return (
    <div className="anim-stagger flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Konfigurasi</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Mapping emosi, threshold confidence, dan jam shift — bisa diubah tanpa deploy ulang (FR-6.7, FR-6.6).
        </p>
      </header>

      <section className="anim-fade-up rounded-2xl border border-border bg-surface p-6">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Mapping Emosi → Kategori</h2>
        <table className="w-full max-w-md text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-2 font-medium">Emosi (DeepFace)</th>
              <th className="py-2 font-medium">Kategori</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {mapping.map((m) => (
              <tr key={m.emotion} className="border-b border-border/60">
                <td className="py-2.5 capitalize text-foreground/90">{m.emotion}</td>
                <td className="py-2.5">
                  <form action={updateEmotionMappingAction} className="flex items-center gap-2">
                    <input type="hidden" name="emotion" value={m.emotion} />
                    <select
                      name="category"
                      defaultValue={m.category}
                      className="rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-primary"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {CATEGORY_LABEL[c]}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="cursor-pointer rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                    >
                      Simpan
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="anim-fade-up rounded-2xl border border-border bg-surface p-6">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Threshold Confidence</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Hasil di bawah nilai ini ditandai &quot;kurang yakin&quot; (FR-3.7).
        </p>
        <form action={updateThresholdAction} className="flex items-end gap-2.5">
          <label className="text-xs font-medium text-muted-foreground">
            <span className="mb-1 block">Threshold (%)</span>
            <input
              type="number"
              name="threshold"
              min={0}
              max={100}
              defaultValue={threshold}
              className="block w-28 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
          </label>
          <button
            type="submit"
            className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-transform duration-[var(--dur-fast)] hover:brightness-110 active:scale-95"
          >
            Simpan
          </button>
        </form>
      </section>

      <section className="anim-fade-up rounded-2xl border border-border bg-surface p-6">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Jam Shift</h2>
        <div className="flex flex-col gap-3">
          {shifts.map((s) => (
            <form key={s.shift} action={updateShiftConfigAction} className="flex items-end gap-3">
              <input type="hidden" name="shift" value={s.shift} />
              <span className="w-16 text-sm font-medium text-foreground/90">Shift {s.shift}</span>
              <label className="text-xs font-medium text-muted-foreground">
                <span className="mb-1 block">Mulai</span>
                <input
                  type="time"
                  name="start_time"
                  defaultValue={s.start_time.slice(0, 5)}
                  className="block rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-primary"
                />
              </label>
              <label className="text-xs font-medium text-muted-foreground">
                <span className="mb-1 block">Selesai</span>
                <input
                  type="time"
                  name="end_time"
                  defaultValue={s.end_time.slice(0, 5)}
                  className="block rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-primary"
                />
              </label>
              <button
                type="submit"
                className="cursor-pointer rounded-lg border border-border px-3.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                Simpan
              </button>
            </form>
          ))}
        </div>
      </section>
    </div>
  );
}
