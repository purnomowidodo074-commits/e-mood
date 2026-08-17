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
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-lg font-semibold text-foreground">Konfigurasi</h1>
        <p className="text-sm text-slate-500">
          Mapping emosi, threshold confidence, dan jam shift — bisa diubah tanpa deploy ulang (FR-6.7, FR-6.6).
        </p>
      </header>

      <section className="rounded-lg border border-border bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Mapping Emosi → Kategori</h2>
        <table className="w-full max-w-md text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="py-2">Emosi (DeepFace)</th>
              <th className="py-2">Kategori</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {mapping.map((m) => (
              <tr key={m.emotion} className="border-b border-border/60">
                <td className="py-2 capitalize text-slate-700">{m.emotion}</td>
                <td className="py-2">
                  <form
                    action={updateEmotionMappingAction}
                    className="flex items-center gap-2"
                  >
                    <input type="hidden" name="emotion" value={m.emotion} />
                    <select
                      name="category"
                      defaultValue={m.category}
                      className="rounded-md border border-border px-2 py-1 text-sm"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {CATEGORY_LABEL[c]}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="cursor-pointer rounded-md border border-border px-2 py-1 text-xs font-medium text-slate-600 hover:bg-muted"
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

      <section className="rounded-lg border border-border bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Threshold Confidence</h2>
        <p className="mb-3 text-sm text-slate-500">
          Hasil di bawah nilai ini ditandai &quot;kurang yakin&quot; (FR-3.7).
        </p>
        <form action={updateThresholdAction} className="flex items-end gap-2">
          <label className="text-sm text-slate-600">
            Threshold (%)
            <input
              type="number"
              name="threshold"
              min={0}
              max={100}
              defaultValue={threshold}
              className="mt-1 block w-28 rounded-md border border-border px-2 py-1.5 text-sm"
            />
          </label>
          <button
            type="submit"
            className="cursor-pointer rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Simpan
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-border bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Jam Shift</h2>
        <div className="flex flex-col gap-3">
          {shifts.map((s) => (
            <form key={s.shift} action={updateShiftConfigAction} className="flex items-end gap-3">
              <input type="hidden" name="shift" value={s.shift} />
              <span className="w-16 text-sm font-medium text-slate-700">Shift {s.shift}</span>
              <label className="text-sm text-slate-600">
                Mulai
                <input
                  type="time"
                  name="start_time"
                  defaultValue={s.start_time.slice(0, 5)}
                  className="mt-1 block rounded-md border border-border px-2 py-1.5 text-sm"
                />
              </label>
              <label className="text-sm text-slate-600">
                Selesai
                <input
                  type="time"
                  name="end_time"
                  defaultValue={s.end_time.slice(0, 5)}
                  className="mt-1 block rounded-md border border-border px-2 py-1.5 text-sm"
                />
              </label>
              <button
                type="submit"
                className="cursor-pointer rounded-md border border-border px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-muted"
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
