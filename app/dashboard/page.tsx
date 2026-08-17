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
import { DonutChart, BarChart, LineChart } from "@/components/Charts";
import { followUpAction } from "@/lib/actions";

const CATEGORIES: Category[] = ["HAPPY", "NETRAL", "BADMOOD"];
const SHIFTS = ["1", "2", "3"];

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

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>
          <p className="text-sm text-slate-500">{formatDateID(date)}</p>
        </div>
        <form className="flex items-end gap-3" method="get">
          <label className="text-sm text-slate-600">
            Tanggal
            <input
              type="date"
              name="date"
              defaultValue={date}
              className="mt-1 block rounded-md border border-border bg-white px-2 py-1.5 text-sm"
            />
          </label>
          <label className="text-sm text-slate-600">
            Shift
            <select
              name="shift"
              defaultValue={shift ?? ""}
              className="mt-1 block rounded-md border border-border bg-white px-2 py-1.5 text-sm"
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
            className="cursor-pointer rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Terapkan
          </button>
        </form>
      </header>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryCard label="Sudah Absen" value={`${summary.total} / ${summary.totalActiveMembers}`} />
        {CATEGORIES.map((c) => (
          <SummaryCard
            key={c}
            label={CATEGORY_LABEL[c]}
            value={summary[c.toLowerCase() as "happy" | "netral" | "badmood"]}
            color={CATEGORY_COLOR[c]}
            bg={CATEGORY_BG[c]}
          />
        ))}
      </div>

      <section className="rounded-lg border border-border bg-surface p-5">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Distribusi Mood</h2>
        <DonutChart segments={segments} />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="rounded-lg border border-border bg-surface p-5 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Detail Absen ({records.length})</h2>
          <RecordsTable records={records} />
        </section>

        <section className="rounded-lg border border-border bg-surface p-5">
          <h2 className="mb-4 text-sm font-semibold text-foreground">
            Belum Absen ({unrecorded.length})
          </h2>
          {unrecorded.length === 0 ? (
            <p className="text-sm text-slate-500">Semua member aktif sudah absen.</p>
          ) : (
            <ul className="max-h-96 space-y-1 overflow-y-auto text-sm">
              {unrecorded.map((m) => (
                <li key={m.noreg} className="flex justify-between border-b border-border/60 py-1">
                  <span className="text-slate-700">{m.nama}</span>
                  <span className="font-mono text-slate-400">{m.noreg}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function RecordsTable({ records }: { records: MoodRecordRow[] }) {
  if (records.length === 0) {
    return <p className="text-sm text-slate-500">Belum ada data absen untuk filter ini.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-slate-400">
            <th className="py-2 pr-3">Nama</th>
            <th className="py-2 pr-3">Noreg</th>
            <th className="py-2 pr-3">Jam</th>
            <th className="py-2 pr-3">Kategori</th>
            <th className="py-2 pr-3">Confidence</th>
            <th className="py-2 pr-3">Sumber</th>
            <th className="py-2 pr-3">Follow-up</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.id} className="border-b border-border/60 align-top">
              <td className="py-2 pr-3 text-slate-800">{r.nama}</td>
              <td className="py-2 pr-3 font-mono text-slate-500">{r.noreg}</td>
              <td className="py-2 pr-3 font-mono text-slate-500">{formatTimeID(r.recorded_at)}</td>
              <td className="py-2 pr-3">
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-medium"
                  style={{ background: CATEGORY_BG[r.category], color: CATEGORY_COLOR[r.category] }}
                >
                  {CATEGORY_LABEL[r.category]}
                </span>
              </td>
              <td className="py-2 pr-3 font-mono text-slate-500">
                {r.confidence}%{r.low_confidence && <span className="ml-1 text-accent">kurang yakin</span>}
              </td>
              <td className="py-2 pr-3 text-slate-500">{r.source === "auto" ? "Otomatis" : "Manual"}</td>
              <td className="py-2 pr-3">
                {r.category === "BADMOOD" ? (
                  <FollowUpForm record={r} />
                ) : (
                  <span className="text-slate-300">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FollowUpForm({ record }: { record: MoodRecordRow }) {
  return (
    <form action={followUpAction} className="flex min-w-48 flex-col gap-1.5">
      <input type="hidden" name="recordId" value={record.id} />
      <label className="flex items-center gap-1.5 text-xs text-slate-600">
        <input type="checkbox" name="followed_up" defaultChecked={record.followed_up} />
        Sudah ditindaklanjuti
      </label>
      <textarea
        name="note"
        defaultValue={record.followup_note ?? ""}
        placeholder="Catatan..."
        rows={2}
        className="w-full rounded-md border border-border px-2 py-1 text-xs"
      />
      <button
        type="submit"
        className="cursor-pointer self-start rounded-md border border-border px-2 py-1 text-xs font-medium text-slate-600 hover:bg-muted"
      >
        Simpan
      </button>
    </form>
  );
}

function SummaryCard({
  label,
  value,
  color,
  bg,
}: {
  label: string;
  value: string | number;
  color?: string;
  bg?: string;
}) {
  return (
    <div
      className="rounded-lg border border-border p-4"
      style={{ background: bg ?? "var(--surface)" }}
    >
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 font-mono text-2xl font-semibold" style={{ color: color ?? "var(--foreground)" }}>
        {value}
      </p>
    </div>
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

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Dashboard — Tren Agregat</h1>
          <p className="text-sm text-slate-500">
            {formatDateID(startDate)} – {formatDateID(endDate)}
          </p>
        </div>
        <form className="flex items-end gap-3" method="get">
          <label className="text-sm text-slate-600">
            Rentang
            <select
              name="range"
              defaultValue={range}
              className="mt-1 block rounded-md border border-border bg-white px-2 py-1.5 text-sm"
            >
              <option value="week">7 hari terakhir</option>
              <option value="month">30 hari terakhir</option>
            </select>
          </label>
          <button
            type="submit"
            className="cursor-pointer rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Terapkan
          </button>
        </form>
      </header>

      <section className="rounded-lg border border-border bg-surface p-5">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Tren Harian per Kategori</h2>
        <LineChart labels={dayList.map(formatDayLabel)} series={trendSeries} />
      </section>

      <section className="rounded-lg border border-border bg-surface p-5">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Perbandingan Antar Shift</h2>
        <BarChart groups={shiftGroups} />
      </section>
    </div>
  );
}
