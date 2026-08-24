// Hand-rolled, dependency-free chart primitives (donut/bar/line/scatter).
// skipped: charting library (Recharts) — these are simple enough not to need one.

type ScatterPoint = { x: number; y: number; color: string; label: string };

/**
 * Jam absen × nilai confidence (y, 0–100), tiap titik diwarnai per kategori mood.
 * Absen berlangsung sekitar 2 jam, jadi sumbu-x auto-zoom ke rentang waktu data
 * (dibulatkan ke kelipatan 15 menit) alih-alih membentang penuh 00:00–24:00.
 */
export function ScatterChart({
  points,
  legend,
}: {
  points: ScatterPoint[];
  legend: { label: string; color: string }[];
}) {
  const width = 640;
  const height = 240;
  const pad = { top: 10, right: 12, bottom: 26, left: 32 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const yTicks = [0, 25, 50, 75, 100];

  const STEP = 0.25; // 15 menit, dalam satuan jam
  const xs = points.map((p) => p.x);
  const rawMin = xs.length ? Math.min(...xs) : 7;
  const rawMax = xs.length ? Math.max(...xs) : 8;
  // beri jarak satu tick di tiap sisi, dibulatkan ke grid 15 menit
  const xMin = Math.max(0, Math.floor(rawMin / STEP) * STEP - STEP);
  const xMax = Math.min(24, Math.ceil(rawMax / STEP) * STEP + STEP);
  const xRange = Math.max(xMax - xMin, STEP);

  const xTicks: number[] = [];
  for (let t = xMin; t <= xMax + 1e-9; t += STEP) xTicks.push(Math.round(t * 100) / 100);
  // kalau rentangnya kebetulan lebar, jangan sampai label 15-menitan berdesakan
  const xLabelTicks = xTicks.length > 13 ? xTicks.filter((_, i) => i % Math.ceil(xTicks.length / 13) === 0) : xTicks;

  const sx = (x: number) => pad.left + ((x - xMin) / xRange) * plotW;
  const sy = (y: number) => pad.top + plotH - (y / 100) * plotH;

  function formatTick(h: number) {
    const hh = Math.floor(h);
    const mm = Math.round((h - hh) * 60);
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-4 text-sm">
        {legend.map((l) => (
          <span key={l.label} className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: l.color }} />
            {l.label}
          </span>
        ))}
      </div>
      <div className="anim-fade overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ minWidth: 320 }}>
          {yTicks.map((v) => (
            <g key={v}>
              <line x1={pad.left} x2={width - pad.right} y1={sy(v)} y2={sy(v)} stroke="var(--border)" strokeWidth={1} />
              <text x={pad.left - 6} y={sy(v) + 3} fontSize={9} textAnchor="end" fill="var(--muted-foreground)">
                {v}
              </text>
            </g>
          ))}
          {xTicks.map((h) => (
            <line key={h} x1={sx(h)} x2={sx(h)} y1={pad.top} y2={pad.top + plotH} stroke="var(--border)" strokeWidth={1} opacity={0.4} />
          ))}
          {xLabelTicks.map((h) => (
            <text key={h} x={sx(h)} y={height - 8} fontSize={9} textAnchor="middle" fill="var(--muted-foreground)">
              {formatTick(h)}
            </text>
          ))}
          {points.map((p, i) => (
            <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={4.5} fill={p.color} fillOpacity={0.75} stroke={p.color} strokeWidth={1.25}>
              <title>{p.label}</title>
            </circle>
          ))}
        </svg>
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Jam absen</span>
        <span>Confidence (%) ↑</span>
      </div>
    </div>
  );
}

type Segment = { label: string; value: number; color: string };

export function DonutChart({ segments, size = 168 }: { segments: Segment[]; size?: number }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const gap = 1.2; // % gap between segments so the dividing lines actually show
  let cursor = 0;
  const stops: string[] = [];
  for (const seg of segments) {
    const pct = total > 0 ? (seg.value / total) * 100 : 0;
    const start = cursor;
    const end = cursor + pct;
    stops.push(`var(--surface) ${start}%`, `${seg.color} ${start}%`, `${seg.color} ${end - gap}%`, `var(--surface) ${end - gap}%`);
    cursor = end;
  }
  const gradient = total > 0 ? `conic-gradient(from -90deg, ${stops.join(", ")})` : "var(--surface-2)";

  return (
    <div className="flex flex-wrap items-center gap-7">
      <div
        role="img"
        aria-label={segments.map((s) => `${s.label}: ${s.value}`).join(", ")}
        className="anim-scale-in relative shrink-0 rounded-full p-[3px]"
        style={{ width: size, height: size, background: gradient }}
      >
        <div className="flex h-full w-full items-center justify-center rounded-full bg-surface">
          <div className="flex flex-col items-center">
            <span className="font-mono text-3xl font-semibold tabular-nums text-foreground">{total}</span>
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">absen</span>
          </div>
        </div>
      </div>
      <ul className="anim-stagger flex flex-col gap-2.5 text-sm">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2.5">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: s.color }}
            />
            <span className="w-16 text-muted-foreground">{s.label}</span>
            <span className="font-mono font-semibold tabular-nums text-foreground">{s.value}</span>
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {total > 0 ? Math.round((s.value / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

type BarGroup = { label: string; values: { label: string; value: number; color: string }[] };

export function BarChart({ groups }: { groups: BarGroup[] }) {
  const max = Math.max(1, ...groups.flatMap((g) => g.values.map((v) => v.value)));
  return (
    <div className="anim-stagger flex items-end gap-9">
      {groups.map((g) => (
        <div key={g.label} className="flex flex-col items-center gap-3">
          <div className="flex h-40 items-end gap-2">
            {g.values.map((v) => (
              <div key={v.label} className="flex w-8 flex-col items-center justify-end">
                <span className="mb-1.5 font-mono text-xs tabular-nums text-muted-foreground">{v.value || ""}</span>
                <div
                  title={`${v.label}: ${v.value}`}
                  className="w-full rounded-t-md transition-[height] duration-500 ease-[var(--ease-out-expo)]"
                  style={{
                    height: `${Math.max((v.value / max) * 100, v.value > 0 ? 3 : 0)}%`,
                    background: `linear-gradient(180deg, ${v.color}, ${v.color}99)`,
                    boxShadow: `0 0 16px -6px ${v.color}`,
                  }}
                />
              </div>
            ))}
          </div>
          <span className="text-xs font-medium text-muted-foreground">Shift {g.label}</span>
        </div>
      ))}
    </div>
  );
}

type Series = { label: string; color: string; points: number[] };

export function LineChart({
  labels,
  series,
  height = 200,
}: {
  labels: string[];
  series: Series[];
  height?: number;
}) {
  const width = Math.max(360, labels.length * 44);
  const max = Math.max(1, ...series.flatMap((s) => s.points));
  const stepX = labels.length > 1 ? width / (labels.length - 1) : 0;

  function toPoints(points: number[]) {
    return points.map((v, i) => [i * stepX, height - (v / max) * height] as const);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-4 text-sm">
        {series.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      <div className="anim-fade overflow-x-auto">
        <svg width={width} height={height + 24} className="min-w-full">
          <defs>
            {series.map((s) => (
              <linearGradient key={s.label} id={`area-${s.label}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.28} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <line key={f} x1={0} y1={height * f} x2={width} y2={height * f} stroke="var(--border)" strokeWidth={1} />
          ))}
          {series.map((s) => {
            const pts = toPoints(s.points);
            const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x} ${y}`).join(" ");
            const area = `${line} L ${width} ${height} L 0 ${height} Z`;
            return (
              <g key={s.label}>
                <path d={area} fill={`url(#area-${s.label})`} stroke="none" />
                <path d={line} fill="none" stroke={s.color} strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" />
                {pts.map(([x, y], i) => (
                  <circle key={i} cx={x} cy={y} r={3} fill="var(--surface)" stroke={s.color} strokeWidth={2}>
                    <title>{`${labels[i]} · ${s.label}: ${s.points[i]}`}</title>
                  </circle>
                ))}
              </g>
            );
          })}
          {labels.map((l, i) => (
            <text key={l} x={i * stepX} y={height + 18} fontSize={10} textAnchor="middle" fill="var(--muted-foreground)">
              {l}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}
