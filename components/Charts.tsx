// Hand-rolled, dependency-free chart primitives (donut/bar/line).
// skipped: charting library (Recharts) — these are simple enough not to need one.

type Segment = { label: string; value: number; color: string };

export function DonutChart({ segments, size = 160 }: { segments: Segment[]; size?: number }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  let cursor = 0;
  const stops: string[] = [];
  for (const seg of segments) {
    const pct = total > 0 ? (seg.value / total) * 100 : 0;
    stops.push(`${seg.color} ${cursor}% ${cursor + pct}%`);
    cursor += pct;
  }
  const gradient = total > 0 ? `conic-gradient(${stops.join(", ")})` : "#e9eef6";

  return (
    <div className="flex items-center gap-5">
      <div
        role="img"
        aria-label={segments.map((s) => `${s.label}: ${s.value}`).join(", ")}
        className="relative shrink-0 rounded-full"
        style={{ width: size, height: size, background: gradient }}
      >
        <div className="absolute inset-[18%] flex items-center justify-center rounded-full bg-surface">
          <span className="text-lg font-semibold text-foreground">{total}</span>
        </div>
      </div>
      <ul className="flex flex-col gap-1.5 text-sm">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
            <span className="text-slate-600">{s.label}</span>
            <span className="font-mono font-medium text-foreground">{s.value}</span>
            <span className="text-slate-400">
              ({total > 0 ? Math.round((s.value / total) * 100) : 0}%)
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
    <div className="flex items-end gap-8">
      {groups.map((g) => (
        <div key={g.label} className="flex flex-col items-center gap-2">
          <div className="flex h-36 items-end gap-1.5">
            {g.values.map((v) => (
              <div key={v.label} className="flex w-7 flex-col items-center justify-end">
                <span className="mb-1 font-mono text-xs text-slate-500">{v.value || ""}</span>
                <div
                  title={`${v.label}: ${v.value}`}
                  className="w-full rounded-t-sm"
                  style={{
                    height: `${Math.max((v.value / max) * 100, v.value > 0 ? 3 : 0)}%`,
                    background: v.color,
                  }}
                />
              </div>
            ))}
          </div>
          <span className="text-xs font-medium text-slate-500">Shift {g.label}</span>
        </div>
      ))}
    </div>
  );
}

type Series = { label: string; color: string; points: number[] };

export function LineChart({
  labels,
  series,
  height = 180,
}: {
  labels: string[];
  series: Series[];
  height?: number;
}) {
  const width = Math.max(360, labels.length * 44);
  const max = Math.max(1, ...series.flatMap((s) => s.points));
  const stepX = labels.length > 1 ? width / (labels.length - 1) : 0;

  function toPath(points: number[]) {
    return points
      .map((v, i) => `${i === 0 ? "M" : "L"} ${i * stepX} ${height - (v / max) * height}`)
      .join(" ");
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-4 text-sm">
        {series.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5 text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      <div className="overflow-x-auto">
        <svg width={width} height={height + 20} className="min-w-full">
          <line x1={0} y1={height} x2={width} y2={height} stroke="#e2e8f0" strokeWidth={1} />
          {series.map((s) => (
            <path key={s.label} d={toPath(s.points)} fill="none" stroke={s.color} strokeWidth={2} />
          ))}
          {labels.map((l, i) => (
            <text key={l} x={i * stepX} y={height + 14} fontSize={10} textAnchor="middle" fill="#64748b">
              {l}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}
