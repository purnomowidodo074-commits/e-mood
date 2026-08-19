import { requireUser } from "@/lib/auth";
import {
  getMoodSummary,
  getMoodRecords,
  getUnrecordedMembers,
  getDailyTrend,
  getShiftComparison,
  type Category,
  type MoodRecordRow,
} from "@/lib/queries";
import { todayISO, isoDaysAgo, formatDateID, formatTimeID, formatDayLabel } from "@/lib/date";
import { CATEGORY_COLOR, CATEGORY_BG, CATEGORY_LABEL } from "@/lib/colors";
import { DonutChart, BarChart, LineChart, ScatterChart } from "@/components/Charts";
import { followUpAction } from "@/lib/actions";
import { IconFaceHappy, IconFaceNeutral, IconFaceSad, IconUsers } from "@/components/icons";

const CATEGORIES: Category[] = ["HAPPY", "NETRAL", "BADMOOD"];
const SHIFTS = ["1", "2", "3"];
const CATEGORY_ICON = { HAPPY: IconFaceHappy, NETRAL: IconFaceNeutral, BADMOOD: IconFaceSad };

export default async function DashboardPage(props: PageProps<"/dashboard">) {
  const user = await requireUser();
  const searchParams = await props.searchParams;

  if (user.role === "section_head") {
    return <SectionHeadView searchParams={searchParams} />;
  }
  return <LeaderView searchParams={searchParams} />;
}

// ---------------------------------------------------------------------------
// Leader / Admin: per-individual view
// ---------------------------------------------------------------------------

async function LeaderView({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const date = typeof searchParams.date === "string" ? searchParams.date : todayISO();
  const shift = typeof searchParams.shift === "string" && searchParams.shift ? searchParams.shift : undefined;

  const [summary, records, unrecorded] = await Promise.all([
    getMoodSummary(date, shift),
    getMoodRecords(date, shift),
    getUnrecordedMembers(date),
  ]);

  const segments = CATEGORIES.map((c) => ({
    label: CATEGORY_LABEL[c],
    value: summary[c.toLowerCase() as "happy" | "netral" | "badmood"],
    color: CATEGORY_COLOR[c],
  }));
  const pct = summary.totalActiveMembers > 0 ? Math.round((summary.total / summary.totalActiveMembers) * 100) : 0;

  const scatterPoints = records.map((r) => {
    const [hh, mm] = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Jakarta",
    })
      .format(new Date(r.recorded_at))
      .split(":")
      .map(Number);
    return {
      x: hh + mm / 60,
      y: r.confidence,
      color: CATEGORY_COLOR[r.category],
      label: `${r.nama} · ${formatTimeID(r.recorded_at)} · ${CATEGORY_LABEL[r.category]} · ${r.confidence}%`,
    };
  });

  return (
    <div className="anim-stagger flex flex-col gap-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">{formatDateID(date)}</p>
        </div>
        <FilterForm date={date} shift={shift} />
      </header>

      <section className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border bg-border lg:grid-cols-[minmax(0,1fr)_1.4fr]">
        <div className="flex flex-col justify-center gap-3 glass-panel p-6">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-5xl font-semibold tabular-nums text-foreground">{summary.total}</span>
            <span className="font-mono text-xl text-muted-foreground">/ {summary.totalActiveMembers}</span>
          </div>
          <p className="text-sm font-medium text-muted-foreground">member sudah absen hari ini</p>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-[width] duration-700 ease-[var(--ease-out-expo)]"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="font-mono text-xs text-muted-foreground">{pct}%</span>
        </div>
        <div className="glass-panel p-6">
          <DonutChart segments={segments} />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="anim-fade-up rounded-2xl border border-border glass-panel p-6 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Detail Absen ({records.length})</h2>
          <RecordsTable records={records} />
        </section>

        <section className="anim-fade-up rounded-2xl border border-border glass-panel p-6">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
            <IconUsers className="h-4 w-4 text-muted-foreground" />
            Belum Absen ({unrecorded.length})
          </h2>
          {unrecorded.length === 0 ? (
            <p className="text-sm text-muted-foreground">Semua member aktif sudah absen.</p>
          ) : (
            <ul className="max-h-96 space-y-0.5 overflow-y-auto text-sm">
              {unrecorded.map((m) => (
                <li
                  key={m.noreg}
                  className="flex justify-between rounded-lg px-2 py-1.5 transition-colors duration-[var(--dur-fast)] hover:bg-surface-2"
                >
                  <span className="text-foreground/90">{m.nama}</span>
                  <span className="font-mono text-muted-foreground">{m.noreg}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="anim-fade-up rounded-2xl border border-border glass-panel p-6">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Sebaran Jam Absen × Mood × Confidence</h2>
        {scatterPoints.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada data absen untuk filter ini.</p>
        ) : (
          <ScatterChart
            points={scatterPoints}
            legend={CATEGORIES.map((c) => ({ label: CATEGORY_LABEL[c], color: CATEGORY_COLOR[c] }))}
          />
        )}
      </section>
    </div>
  );
}

function FilterForm({ date, shift }: { date: string; shift?: string }) {
  return (
    <form className="flex flex-wrap items-end gap-2.5" method="get">
      <label className="text-xs font-medium text-muted-foreground">
        <span className="mb-1 block">Tanggal</span>
        <input
          type="date"
          name="date"
          defaultValue={date}
          className="block rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
        />
      </label>
      <label className="text-xs font-medium text-muted-foreground">
        <span className="mb-1 block">Shift</span>
        <select
          name="shift"
          defaultValue={shift ?? ""}
          className="block rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
        >
          <option value="">Semua</option>
          {SHIFTS.map((s) => (
            <option key={s} value={s}>
              Shift {s}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-transform duration-[var(--dur-fast)] hover:brightness-110 active:scale-95"
      >
        Terapkan
      </button>
    </form>
  );
}

function RecordsTable({ records }: { records: MoodRecordRow[] }) {
  if (records.length === 0) {
    return <p className="text-sm text-muted-foreground">Belum ada data absen untuk filter ini.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="py-2 pr-3 font-medium">Nama</th>
            <th className="py-2 pr-3 font-medium">Noreg</th>
            <th className="py-2 pr-3 font-medium">Jam</th>
            <th className="py-2 pr-3 font-medium">Kategori</th>
            <th className="py-2 pr-3 font-medium">Confidence</th>
            <th className="py-2 pr-3 font-medium">Sumber</th>
            <th className="py-2 pr-3 font-medium">Follow-up</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => {
            const CatIcon = CATEGORY_ICON[r.category];
            return (
              <tr
                key={r.id}
                className="border-b border-border/60 align-top transition-colors duration-[var(--dur-fast)] hover:bg-surface-2/60"
              >
                <td className="py-2.5 pr-3 text-foreground/90">{r.nama}</td>
                <td className="py-2.5 pr-3 font-mono text-muted-foreground">{r.noreg}</td>
                <td className="py-2.5 pr-3 font-mono text-muted-foreground">{formatTimeID(r.recorded_at)}</td>
                <td className="py-2.5 pr-3">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                    style={{ background: CATEGORY_BG[r.category], color: CATEGORY_COLOR[r.category] }}
                  >
                    <CatIcon className="h-3.5 w-3.5" />
                    {CATEGORY_LABEL[r.category]}
                  </span>
                </td>
                <td className="py-2.5 pr-3 font-mono text-muted-foreground">
                  {r.confidence}%
                  {r.low_confidence && <span className="ml-1.5 text-accent">kurang yakin</span>}
                </td>
                <td className="py-2.5 pr-3 text-muted-foreground">{r.source === "auto" ? "Otomatis" : "Manual"}</td>
                <td className="py-2.5 pr-3">
                  {r.category === "BADMOOD" ? (
                    <FollowUpForm record={r} />
                  ) : (
                    <span className="text-muted-foreground/40">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FollowUpForm({ record }: { record: MoodRecordRow }) {
  return (
    <form action={followUpAction} className="flex min-w-48 flex-col gap-1.5">
      <input type="hidden" name="recordId" value={record.id} />
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <input type="checkbox" name="followed_up" defaultChecked={record.followed_up} className="accent-primary" />
        Sudah ditindaklanjuti
      </label>
      <textarea
        name="note"
        defaultValue={record.followup_note ?? ""}
        placeholder="Catatan..."
        rows={2}
        className="w-full rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-xs text-foreground outline-none transition-colors focus:border-primary"
      />
      <button
        type="submit"
        className="cursor-pointer self-start rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors duration-[var(--dur-fast)] hover:border-primary/40 hover:text-primary"
      >
        Simpan
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Section Head: aggregate-only view (no individual names — OQ-3)
// ---------------------------------------------------------------------------

async function SectionHeadView({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const range = searchParams.range === "month" ? "month" : "week";
  const days = range === "month" ? 30 : 7;
  const startDate = isoDaysAgo(days - 1);
  const endDate = todayISO();

  const [trend, shiftComparison] = await Promise.all([
    getDailyTrend(startDate, endDate),
    getShiftComparison(startDate, endDate),
  ]);

  const dayList: string[] = [];
  for (let i = days - 1; i >= 0; i--) dayList.push(isoDaysAgo(i));

  const trendSeries = CATEGORIES.map((c) => ({
    label: CATEGORY_LABEL[c],
    color: CATEGORY_COLOR[c],
    points: dayList.map((day) => {
      const found = trend.find((t) => t.day.slice(0, 10) === day && t.category === c);
      return found?.count ?? 0;
    }),
  }));

  const shiftGroups = ["1", "2", "3"].map((s) => ({
    label: s,
    values: CATEGORIES.map((c) => ({
      label: CATEGORY_LABEL[c],
      color: CATEGORY_COLOR[c],
      value: shiftComparison.find((r) => r.shift === s && r.category === c)?.count ?? 0,
    })),
  }));

  const totalInRange = trend.reduce((s, r) => s + r.count, 0);

  return (
    <div className="anim-stagger flex flex-col gap-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Tren Agregat</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDateID(startDate)} – {formatDateID(endDate)}
          </p>
        </div>
        <form className="flex items-end gap-2.5" method="get">
          <label className="text-xs font-medium text-muted-foreground">
            <span className="mb-1 block">Rentang</span>
            <select
              name="range"
              defaultValue={range}
              className="block rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
            >
              <option value="week">7 hari terakhir</option>
              <option value="month">30 hari terakhir</option>
            </select>
          </label>
          <button
            type="submit"
            className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-transform duration-[var(--dur-fast)] hover:brightness-110 active:scale-95"
          >
            Terapkan
          </button>
        </form>
      </header>

      <p className="anim-fade-up text-sm text-muted-foreground">
        <span className="font-mono font-semibold text-foreground">{totalInRange}</span> absen tercatat sepanjang
        periode ini, seluruhnya agregat — tanpa nama individu.
      </p>

      <section className="anim-fade-up rounded-2xl border border-border glass-panel p-6">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Tren Harian per Kategori</h2>
        <LineChart labels={dayList.map(formatDayLabel)} series={trendSeries} />
      </section>

      <section className="anim-fade-up rounded-2xl border border-border glass-panel p-6">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Perbandingan Antar Shift</h2>
        <BarChart groups={shiftGroups} />
      </section>
    </div>
  );
}
