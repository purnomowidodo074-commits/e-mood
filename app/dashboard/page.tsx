import { requireUser } from "@/lib/auth";
import { ResetDataButton } from "@/components/ResetDataButton";
import {
  getMoodSummary,
  getMoodRecords,
  getDailyTrend,
  getHourlyTrend,
  getShiftComparison,
  getLineComparison,
  type Category,
  type MoodRecordRow,
} from "@/lib/queries";
import { todayISO, isoDaysAgo, formatDateID, formatTimeID, formatDayLabel, isoDateMinusDays, daysRange } from "@/lib/date";
import { CATEGORY_COLOR, CATEGORY_BG, CATEGORY_LABEL } from "@/lib/colors";
import { DonutChart, BarChart, LineChart, ScatterChart, type HorizontalStackGroup } from "@/components/Charts";
import { followUpAction, resetMoodRecordsPublicAction } from "@/lib/actions";
import { IconFaceHappy, IconFaceNeutral, IconFaceSad } from "@/components/icons";
import Link from "next/link";

const CATEGORIES: Category[] = ["HAPPY", "NETRAL", "BADMOOD"];
const SHIFTS = ["Day", "Night"];
const CATEGORY_ICON = { HAPPY: IconFaceHappy, NETRAL: IconFaceNeutral, BADMOOD: IconFaceSad };

/** Filter tren 1D → sumbu-x = jam absensi (HH:00) alih-alih tanggal. */
function hourlyTrendChart(hourly: { hour: number; category: Category; count: number }[]) {
  const hs = hourly.map((r) => r.hour);
  let lo = hs.length ? Math.min(...hs) : 6;
  let hi = hs.length ? Math.max(...hs) : 9;
  // data sedikit → lebarkan rentang jam sampai minimal 4 titik (0–23)
  while (hi - lo + 1 < 4) {
    if (hi < 23) hi++;
    else if (lo > 0) lo--;
    else break;
  }
  const hourList = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
  return {
    labels: hourList.map((h) => `${String(h).padStart(2, "0")}:00`),
    series: CATEGORIES.map((c) => ({
      label: CATEGORY_LABEL[c],
      color: CATEGORY_COLOR[c],
      points: hourList.map((h) => hourly.find((r) => r.hour === h && r.category === c)?.count ?? 0),
    })),
  };
}

export default async function DashboardPage(props: PageProps<"/dashboard">) {
  const user = await requireUser();
  const searchParams = await props.searchParams;

  if (user.role === "section_head") {
    return <SectionHeadView searchParams={searchParams} />;
  }
  return <LeaderView searchParams={searchParams} showReset={user.role === "admin"} />;
}

// ---------------------------------------------------------------------------
// Leader / Admin: per-individual view
// ---------------------------------------------------------------------------

export async function LeaderView({
  searchParams,
  readOnly = false,
  showReset = false,
  resetIsPublic = false,
}: {
  searchParams: Record<string, string | string[] | undefined>;
  readOnly?: boolean;
  /** Show the destructive Reset Data button in the header. */
  showReset?: boolean;
  /** When true, the button calls resetMoodRecordsPublicAction (no auth) —
   * only ever passed true from the public /kiosk/dashboard mirror. */
  resetIsPublic?: boolean;
}) {
  const date = typeof searchParams.date === "string" ? searchParams.date : todayISO();
  const shift = typeof searchParams.shift === "string" && searchParams.shift ? searchParams.shift : undefined;
  const trendParam = typeof searchParams.trend === "string" ? searchParams.trend : "7";
  const trendDays: 1 | 7 | 14 = trendParam === "1" ? 1 : trendParam === "14" ? 14 : 7;
  const trendEndDate = date;
  const trendStartDate = isoDateMinusDays(trendEndDate, trendDays - 1);
  const trendDayList = daysRange(trendEndDate, trendDays);

  const [summary, records, trend, lineComparison, hourly] = await Promise.all([
    getMoodSummary(date, shift),
    getMoodRecords(date, shift),
    getDailyTrend(trendStartDate, trendEndDate, shift),
    getLineComparison(trendStartDate, trendEndDate, shift),
    trendDays === 1 ? getHourlyTrend(date, shift) : Promise.resolve([]),
  ]);

  const segments = CATEGORIES.map((c) => ({
    label: CATEGORY_LABEL[c],
    value: summary[c.toLowerCase() as "happy" | "netral" | "badmood"],
    color: CATEGORY_COLOR[c],
  }));
  const pct = summary.totalActiveMembers > 0 ? Math.round((summary.total / summary.totalActiveMembers) * 100) : 0;
  const pctHappy = summary.total > 0 ? Math.round((summary.happy / summary.total) * 100) : 0;
  const pctNetral = summary.total > 0 ? Math.round((summary.netral / summary.total) * 100) : 0;
  const pctBadmood = summary.total > 0 ? Math.round((summary.badmood / summary.total) * 100) : 0;

  const trendSeries = CATEGORIES.map((c) => ({
    label: CATEGORY_LABEL[c],
    color: CATEGORY_COLOR[c],
    points: trendDayList.map((day) => {
      const found = trend.find(
        (t) =>
          ((t.day as unknown) instanceof Date
            ? (t.day as unknown as Date).toISOString().slice(0, 10)
            : String(t.day).slice(0, 10)) === day && t.category === c,
      );
      return found?.count ?? 0;
    }),
  }));

  // Horizontal stacked per line (Y = nama line, X = quantity, stack Happy/Netral/Badmood)
  const lineNames = [...new Set(lineComparison.map((r) => r.line))].sort();
  const horizontalGroups: HorizontalStackGroup[] = lineNames.map((line) => {
    const values = CATEGORIES.map((c) => ({
      label: CATEGORY_LABEL[c],
      color: CATEGORY_COLOR[c],
      value: lineComparison.find((r) => r.line === line && r.category === c)?.count ?? 0,
    }));
    const total = values.reduce((s, v) => s + v.value, 0);
    return { line, values, total };
  });
  // tampilkan yang paling banyak di atas
  horizontalGroups.sort((a, b) => b.total - a.total);

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
          <h1 className="heading-editorial text-3xl font-semibold text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">{formatDateID(date)}</p>
        </div>
        <div className="flex flex-wrap items-end gap-2.5">
          <FilterForm date={date} shift={shift} trend={trendDays} />
          {showReset && <ResetDataButton action={resetIsPublic ? resetMoodRecordsPublicAction : undefined} />}
        </div>
      </header>

      {/* KPI cards — 4 metrics with percentage below, same editorial-card treatment */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Total Absen"
          value={summary.total}
          subValue={` / ${summary.totalActiveMembers}`}
          pct={pct}
          pctLabel={`${pct}% dari member aktif`}
          accent="var(--primary)"
          barBg="var(--surface-2)"
        />
        <KpiCard
          label="Happy"
          value={summary.happy}
          pct={pctHappy}
          pctLabel={`${pctHappy}% dari absen`}
          accent={CATEGORY_COLOR.HAPPY}
          barBg={CATEGORY_BG.HAPPY}
          icon={IconFaceHappy}
        />
        <KpiCard
          label="Netral"
          value={summary.netral}
          pct={pctNetral}
          pctLabel={`${pctNetral}% dari absen`}
          accent={CATEGORY_COLOR.NETRAL}
          barBg={CATEGORY_BG.NETRAL}
          icon={IconFaceNeutral}
        />
        <KpiCard
          label="Badmood"
          value={summary.badmood}
          pct={pctBadmood}
          pctLabel={`${pctBadmood}% dari absen`}
          accent={CATEGORY_COLOR.BADMOOD}
          barBg={CATEGORY_BG.BADMOOD}
          icon={IconFaceSad}
        />
      </div>

      <div className="bento-leader">
        <div className="area-stat editorial-card anim-fade-up flex flex-col gap-3 p-6">
          <h2 className="text-sm font-semibold text-foreground">Absen Hari Ini</h2>
          <div className="flex flex-1 flex-col justify-center gap-3">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-5xl font-semibold tabular-nums text-foreground">{summary.total}</span>
              <span className="font-mono text-xl text-muted-foreground">/ {summary.totalActiveMembers}</span>
            </div>
            <p className="text-sm font-medium text-muted-foreground">member sudah absen hari ini</p>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-700 ease-[var(--ease-out-expo)]"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="font-mono text-xs text-muted-foreground">{pct}%</span>
          </div>
        </div>

        <div className="area-scatter editorial-card anim-fade-up flex flex-col p-6">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Distribusi Mood</h2>
          <div className="flex flex-1 items-center justify-center">
            <DonutChart segments={segments} />
          </div>
        </div>

        {/* Tren harian — kiri (3 kolom) */}
        <section className="area-trend editorial-card anim-fade-up flex flex-col p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-foreground">Tren Harian</h2>
            <TrendTabs date={date} shift={shift} active={trendDays} />
          </div>
          {trendDays === 1 ? (
            <LineChart {...hourlyTrendChart(hourly)} />
          ) : (
            <LineChart labels={trendDayList.map(formatDayLabel)} series={trendSeries} />
          )}
          <p className="mt-3 font-mono text-xs text-muted-foreground">
            {trendDays === 1
              ? formatDateID(trendEndDate)
              : `${formatDateID(trendStartDate)} – ${formatDateID(trendEndDate)}`}
            <span className="mx-1.5 opacity-40">·</span>
            {shift ? `Shift ${shift}` : "Semua shift"}
            <span className="mx-1.5 opacity-40">·</span>
            {trend.reduce((s, r) => s + r.count, 0)} absen
          </p>
        </section>

        {/* Summary Per Line — kanan tren, ringkasan per line */}
        <section className="area-line editorial-card anim-fade-up flex flex-col p-6">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Summary Per Line</h2>
          <LineSummary groups={horizontalGroups} />
          <p className="mt-3 font-mono text-xs text-muted-foreground">
            {trendDays === 1
              ? formatDateID(trendEndDate)
              : `${formatDateID(trendStartDate)} – ${formatDateID(trendEndDate)}`}
            <span className="mx-1.5 opacity-40">·</span>
            {horizontalGroups.length} line
          </p>
        </section>

        <section className="area-table editorial-card anim-fade-up p-6">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Detail Absen ({records.length})</h2>
          <RecordsTable records={records} readOnly={readOnly} />
        </section>

        <section className="area-donut editorial-card anim-fade-up p-6">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Waktu × Mood × Confidence</h2>
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
    </div>
  );
}

function KpiCard({
  label,
  value,
  subValue,
  pct,
  pctLabel,
  accent,
  barBg,
  icon: Icon,
}: {
  label: string;
  value: number;
  subValue?: string;
  pct: number;
  pctLabel: string;
  accent: string;
  barBg: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="editorial-card anim-fade-up flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</h3>
        {Icon ? (
          <span
            className="inline-flex h-7 w-7 items-center justify-center rounded-full"
            style={{ background: barBg, color: accent }}
          >
            <Icon className="h-4 w-4" />
          </span>
        ) : (
          <span className="h-1.5 w-7 rounded-full" style={{ background: accent }} aria-hidden />
        )}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="font-mono text-3xl font-semibold tabular-nums text-foreground">{value}</span>
        {subValue ? <span className="font-mono text-sm text-muted-foreground">{subValue}</span> : null}
      </div>
      <div className="mt-auto flex flex-col gap-1.5">
        <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: barBg === "var(--surface-2)" ? "var(--surface-2)" : barBg }}>
          <div
            className="h-full rounded-full transition-[width] duration-700 ease-[var(--ease-out-expo)]"
            style={{ width: `${pct}%`, background: accent }}
          />
        </div>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">{pctLabel}</span>
      </div>
    </div>
  );
}

function TrendTabs({ date, shift, active }: { date: string; shift?: string; active: 1 | 7 | 14 }) {
  const opts: (1 | 7 | 14)[] = [1, 7, 14];
  const label: Record<1 | 7 | 14, string> = { 1: "1D", 7: "7D", 14: "14D" };
  return (
    <div className="flex rounded-full border border-border bg-surface-2 p-1">
      {opts.map((opt) => {
        const isActive = active === opt;
        const href = `?date=${encodeURIComponent(date)}${shift ? `&shift=${encodeURIComponent(shift)}` : ""}&trend=${opt}`;
        return (
          <Link
            key={opt}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors duration-[var(--dur-fast)] ${
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label[opt]}
          </Link>
        );
      })}
    </div>
  );
}

function LineSummary({ groups }: { groups: HorizontalStackGroup[] }) {
  if (groups.length === 0) {
    return <p className="text-sm text-muted-foreground">Belum ada data line untuk periode ini. Isi kolom Line di Master Member.</p>;
  }
  return (
    <div className="scrollbar-theme max-h-[248px] overflow-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-surface/95 backdrop-blur">
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="py-2 pr-3 font-medium">Line</th>
            <th className="py-2 pr-3 font-medium">Total</th>
            <th className="py-2 pr-3 font-medium">Happy</th>
            <th className="py-2 pr-3 font-medium">Netral</th>
            <th className="py-2 pr-3 font-medium">Badmood</th>
            <th className="py-2 pr-3 font-medium">Dominan</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => {
            const happy = g.values.find((v) => v.label === CATEGORY_LABEL.HAPPY)?.value ?? 0;
            const netral = g.values.find((v) => v.label === CATEGORY_LABEL.NETRAL)?.value ?? 0;
            const badmood = g.values.find((v) => v.label === CATEGORY_LABEL.BADMOOD)?.value ?? 0;
            const pctHappy = g.total ? Math.round((happy / g.total) * 100) : 0;
            const pctNetral = g.total ? Math.round((netral / g.total) * 100) : 0;
            const pctBadmood = g.total ? Math.round((badmood / g.total) * 100) : 0;
            const maxVal = Math.max(happy, netral, badmood);
            const dominant = maxVal === happy ? "HAPPY" : maxVal === netral ? "NETRAL" : "BADMOOD";
            const DomIcon = CATEGORY_ICON[dominant as Category];
            return (
              <tr key={g.line} className="border-b border-border/60 transition-colors hover:bg-surface-2/60">
                <td className="py-2.5 pr-3 font-medium text-foreground/90">{g.line}</td>
                <td className="py-2.5 pr-3 font-mono font-semibold tabular-nums text-foreground">{g.total}</td>
                <td className="py-2.5 pr-3">
                  <span className="font-mono tabular-nums text-foreground">{happy}</span>
                  <span className="ml-1.5 font-mono text-xs text-muted-foreground">{pctHappy}%</span>
                  <div className="mt-1 h-1 w-16 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full" style={{ width: `${pctHappy}%`, background: CATEGORY_COLOR.HAPPY }} />
                  </div>
                </td>
                <td className="py-2.5 pr-3">
                  <span className="font-mono tabular-nums text-foreground">{netral}</span>
                  <span className="ml-1.5 font-mono text-xs text-muted-foreground">{pctNetral}%</span>
                  <div className="mt-1 h-1 w-16 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full" style={{ width: `${pctNetral}%`, background: CATEGORY_COLOR.NETRAL }} />
                  </div>
                </td>
                <td className="py-2.5 pr-3">
                  <span className="font-mono tabular-nums text-foreground">{badmood}</span>
                  <span className="ml-1.5 font-mono text-xs text-muted-foreground">{pctBadmood}%</span>
                  <div className="mt-1 h-1 w-16 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full" style={{ width: `${pctBadmood}%`, background: CATEGORY_COLOR.BADMOOD }} />
                  </div>
                </td>
                <td className="py-2.5 pr-3">
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium"
                    style={{ background: CATEGORY_BG[dominant as Category], color: CATEGORY_COLOR[dominant as Category] }}
                  >
                    <DomIcon className="h-3 w-3" />
                    {CATEGORY_LABEL[dominant as Category]}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FilterForm({ date, shift, trend }: { date: string; shift?: string; trend?: number }) {
  return (
    <form className="flex flex-wrap items-end gap-2.5" method="get">
      {trend ? <input type="hidden" name="trend" value={String(trend)} /> : null}
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
              {s}
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

function RecordsTable({ records, readOnly = false }: { records: MoodRecordRow[]; readOnly?: boolean }) {
  if (records.length === 0) {
    return <p className="text-sm text-muted-foreground">Belum ada data absen untuk filter ini.</p>;
  }
  return (
    <div className="scrollbar-theme max-h-72 overflow-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-surface/95 backdrop-blur">
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="py-2 pr-3 font-medium">Nama</th>
            <th className="py-2 pr-3 font-medium">Noreg</th>
            <th className="py-2 pr-3 font-medium">Jam</th>
            <th className="py-2 pr-3 font-medium">Kategori</th>
            <th className="py-2 pr-3 font-medium">Confidence</th>
            <th className="py-2 pr-3 font-medium">Line</th>
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
                <td className="py-2.5 pr-3">
                  {r.line ? (
                    <span className="inline-flex rounded-full border border-border bg-surface-2 px-2 py-0.5 font-mono text-xs text-foreground/90">{r.line}</span>
                  ) : (
                    <span className="text-muted-foreground/40">—</span>
                  )}
                </td>
                <td className="py-2.5 pr-3">
                  {r.category === "BADMOOD" ? (
                    readOnly ? (
                      <span className="text-xs text-muted-foreground">
                        {r.followed_up ? "Sudah ditindaklanjuti" : "Belum ditindaklanjuti"}
                      </span>
                    ) : (
                      <FollowUpForm record={r} />
                    )
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
  const trendParam = typeof searchParams.trend === "string" ? searchParams.trend : "7";
  const trendDays: 1 | 7 | 14 = trendParam === "1" ? 1 : trendParam === "14" ? 14 : 7;
  const endDate = todayISO();
  const startDate = isoDateMinusDays(endDate, trendDays - 1);
  const dayList = daysRange(endDate, trendDays);

  const [trend, shiftComparison, hourly] = await Promise.all([
    getDailyTrend(startDate, endDate),
    getShiftComparison(startDate, endDate),
    trendDays === 1 ? getHourlyTrend(endDate) : Promise.resolve([]),
  ]);

  const trendSeries = CATEGORIES.map((c) => ({
    label: CATEGORY_LABEL[c],
    color: CATEGORY_COLOR[c],
    points: dayList.map((day) => {
      const found = trend.find(
        (t) =>
          ((t.day as unknown) instanceof Date
            ? (t.day as unknown as Date).toISOString().slice(0, 10)
            : String(t.day).slice(0, 10)) === day && t.category === c,
      );
      return found?.count ?? 0;
    }),
  }));

  const shiftGroups = (["Day", "Night"] as const).map((s) => ({
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
          <h1 className="heading-editorial text-3xl font-semibold text-foreground">Tren Agregat</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDateID(startDate)} – {formatDateID(endDate)}
          </p>
        </div>
        <div className="flex rounded-full border border-border bg-surface-2 p-1">
          {([1, 7, 14] as const).map((opt) => {
            const isActive = trendDays === opt;
            const label = opt === 1 ? "1D" : opt === 7 ? "7D" : "14D";
            return (
              <Link
                key={opt}
                href={`?trend=${opt}`}
                aria-current={isActive ? "page" : undefined}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors duration-[var(--dur-fast)] ${
                  isActive ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </header>

      <div className="bento-section">
        <p className="area-stat editorial-card anim-fade-up flex items-center p-6 text-sm text-muted-foreground">
          <span className="font-mono font-semibold text-foreground">{totalInRange}</span>&nbsp;absen tercatat
          sepanjang periode ini, seluruhnya agregat — tanpa nama individu.
        </p>

        <section className="area-trend editorial-card anim-fade-up p-6">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Tren Harian per Kategori</h2>
          {trendDays === 1 ? (
            <LineChart {...hourlyTrendChart(hourly)} />
          ) : (
            <LineChart labels={dayList.map(formatDayLabel)} series={trendSeries} />
          )}
        </section>

        <section className="area-shift editorial-card anim-fade-up p-6">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Perbandingan Antar Shift</h2>
          <BarChart groups={shiftGroups} />
        </section>
      </div>
    </div>
  );
}
