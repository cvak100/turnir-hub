import { useMemo } from "react";

export type ChartSeries = {
  key: string;
  label: string;
  color: string;
};

export type MultiPoint = {
  id: string | number;
  label: string;
  values: Record<string, number>;
};

function ChartEmpty({ message }: { message: string }) {
  return <p className="muted stats-chart__empty">{message}</p>;
}

function ChartLegend({ series }: { series: ChartSeries[] }) {
  return (
    <div className="stats-chart__legend">
      {series.map((s) => (
        <span key={s.key} className="stats-chart__legend-item">
          <span
            className="stats-chart__swatch"
            style={{ background: s.color }}
            aria-hidden
          />
          {s.label}
        </span>
      ))}
    </div>
  );
}

function shortLabel(label: string, max = 10): string {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}

/** Grouped vertical bars — compare related metrics per person/team. */
export function GroupedBarsChart({
  points,
  series,
  empty = "Ni podatkov za graf.",
  maxItems = 6,
}: {
  points: MultiPoint[];
  series: ChartSeries[];
  empty?: string;
  maxItems?: number;
}) {
  const rows = useMemo(() => {
    return points
      .filter((p) => series.some((s) => (p.values[s.key] ?? 0) > 0))
      .slice(0, maxItems);
  }, [points, series, maxItems]);

  if (rows.length === 0) return <ChartEmpty message={empty} />;

  const padL = 36;
  const padR = 12;
  const padT = 14;
  const padB = 42;
  const w = 420;
  const h = 220;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const maxY = Math.max(
    1,
    ...rows.flatMap((p) => series.map((s) => p.values[s.key] ?? 0)),
  );
  const groupW = innerW / rows.length;
  const barW = Math.min(14, (groupW * 0.72) / series.length);
  const gap = 2;

  function yScale(v: number) {
    return padT + innerH - (v / maxY) * innerH;
  }

  const ticks = [0, Math.ceil(maxY / 2), maxY];

  return (
    <div className="stats-chart">
      <ChartLegend series={series} />
      <svg
        className="stats-chart__svg"
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label="Združeni stolpci"
      >
        {ticks.map((t) => {
          const y = yScale(t);
          return (
            <g key={t}>
              <line
                x1={padL}
                x2={w - padR}
                y1={y}
                y2={y}
                className="stats-chart__grid"
              />
              <text
                x={padL - 6}
                y={y + 4}
                textAnchor="end"
                className="stats-chart__tick"
              >
                {t}
              </text>
            </g>
          );
        })}
        {rows.map((p, i) => {
          const cx = padL + groupW * i + groupW / 2;
          const blockW = series.length * barW + (series.length - 1) * gap;
          const startX = cx - blockW / 2;
          return (
            <g key={p.id}>
              {series.map((s, si) => {
                const val = p.values[s.key] ?? 0;
                const bh = (val / maxY) * innerH;
                return (
                  <rect
                    key={s.key}
                    x={startX + si * (barW + gap)}
                    y={padT + innerH - bh}
                    width={barW}
                    height={Math.max(bh, val > 0 ? 2 : 0)}
                    fill={s.color}
                    opacity={0.9}
                    rx={1.5}
                  >
                    <title>
                      {p.label}: {s.label} {val}
                    </title>
                  </rect>
                );
              })}
              <text
                x={cx}
                y={h - 14}
                textAnchor="middle"
                className="stats-chart__tick"
              >
                {shortLabel(p.label)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Stacked horizontal bars — composition of two related values. */
export function StackedBarsChart({
  points,
  series,
  empty = "Ni podatkov za graf.",
  maxItems = 7,
}: {
  points: MultiPoint[];
  series: [ChartSeries, ChartSeries];
  empty?: string;
  maxItems?: number;
}) {
  const [a, b] = series;
  const rows = useMemo(
    () =>
      points
        .filter((p) => (p.values[a.key] ?? 0) + (p.values[b.key] ?? 0) > 0)
        .slice(0, maxItems),
    [points, a.key, b.key, maxItems],
  );

  if (rows.length === 0) return <ChartEmpty message={empty} />;

  const max = Math.max(
    1,
    ...rows.map((p) => (p.values[a.key] ?? 0) + (p.values[b.key] ?? 0)),
  );
  const rowH = 28;
  const padL = 4;
  const padR = 40;
  const padT = 4;
  const labelW = 100;
  const barArea = 200;
  const w = padL + labelW + barArea + padR;
  const h = padT + 4 + rows.length * rowH;

  return (
    <div className="stats-chart">
      <ChartLegend series={series} />
      <svg
        className="stats-chart__svg"
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label="Skladani stolpci"
      >
        {rows.map((p, i) => {
          const y = padT + i * rowH;
          const va = p.values[a.key] ?? 0;
          const vb = p.values[b.key] ?? 0;
          const wa = (va / max) * barArea;
          const wb = (vb / max) * barArea;
          return (
            <g key={p.id}>
              <text
                x={padL + labelW - 6}
                y={y + rowH / 2 + 4}
                textAnchor="end"
                className="stats-chart__label"
              >
                <title>{p.label}</title>
                {shortLabel(p.label, 12)}
              </text>
              <rect
                x={padL + labelW}
                y={y + 7}
                width={Math.max(wa, va > 0 ? 2 : 0)}
                height={rowH - 14}
                fill={a.color}
                opacity={0.92}
              >
                <title>
                  {p.label}: {a.label} {va}
                </title>
              </rect>
              <rect
                x={padL + labelW + wa}
                y={y + 7}
                width={Math.max(wb, vb > 0 ? 2 : 0)}
                height={rowH - 14}
                fill={b.color}
                opacity={0.92}
              >
                <title>
                  {p.label}: {b.label} {vb}
                </title>
              </rect>
              <text
                x={padL + labelW + wa + wb + 5}
                y={y + rowH / 2 + 4}
                className="stats-chart__value"
              >
                {va + vb}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Scatter — relation between two metrics (e.g. goals vs assists). */
export function ScatterChart({
  points,
  xKey,
  yKey,
  xLabel,
  yLabel,
  color = "var(--blue)",
  empty = "Ni podatkov za graf.",
  maxItems = 20,
}: {
  points: MultiPoint[];
  xKey: string;
  yKey: string;
  xLabel: string;
  yLabel: string;
  color?: string;
  empty?: string;
  maxItems?: number;
}) {
  const rows = useMemo(
    () =>
      points
        .filter((p) => (p.values[xKey] ?? 0) + (p.values[yKey] ?? 0) > 0)
        .slice(0, maxItems),
    [points, xKey, yKey, maxItems],
  );

  if (rows.length === 0) return <ChartEmpty message={empty} />;

  const padL = 40;
  const padR = 14;
  const padT = 14;
  const padB = 36;
  const w = 420;
  const h = 220;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const maxX = Math.max(1, ...rows.map((p) => p.values[xKey] ?? 0));
  const maxY = Math.max(1, ...rows.map((p) => p.values[yKey] ?? 0));

  function xScale(v: number) {
    return padL + (v / maxX) * innerW;
  }
  function yScale(v: number) {
    return padT + innerH - (v / maxY) * innerH;
  }

  return (
    <div className="stats-chart">
      <div className="stats-chart__legend">
        <span className="stats-chart__legend-item">
          {xLabel} × {yLabel}
        </span>
      </div>
      <svg
        className="stats-chart__svg"
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label="Razpršeni graf"
      >
        <line
          x1={padL}
          x2={w - padR}
          y1={padT + innerH}
          y2={padT + innerH}
          className="stats-chart__axis"
        />
        <line
          x1={padL}
          x2={padL}
          y1={padT}
          y2={padT + innerH}
          className="stats-chart__axis"
        />
        <text
          x={padL + innerW / 2}
          y={h - 8}
          textAnchor="middle"
          className="stats-chart__tick"
        >
          {xLabel}
        </text>
        <text
          x={12}
          y={padT + innerH / 2}
          textAnchor="middle"
          className="stats-chart__tick"
          transform={`rotate(-90 12 ${padT + innerH / 2})`}
        >
          {yLabel}
        </text>
        {rows.map((p) => {
          const xv = p.values[xKey] ?? 0;
          const yv = p.values[yKey] ?? 0;
          const cx = xScale(xv);
          const cy = yScale(yv);
          return (
            <g key={p.id}>
              <circle cx={cx} cy={cy} r={6} fill={color} opacity={0.78}>
                <title>
                  {p.label}: {xLabel} {xv}, {yLabel} {yv}
                </title>
              </circle>
            </g>
          );
        })}
        <text x={w - padR} y={padT + innerH + 14} textAnchor="end" className="stats-chart__tick">
          {maxX}
        </text>
        <text x={padL - 6} y={padT + 4} textAnchor="end" className="stats-chart__tick">
          {maxY}
        </text>
      </svg>
    </div>
  );
}

/** Dual line over categories (e.g. editions by year). */
export function DualLineChart({
  points,
  series,
  empty = "Ni podatkov za graf.",
}: {
  points: MultiPoint[];
  series: [ChartSeries, ChartSeries];
  empty?: string;
}) {
  const rows = useMemo(() => {
    return [...points].sort((a, b) => {
      const ya = a.values.year ?? 0;
      const yb = b.values.year ?? 0;
      if (ya !== yb) return ya - yb;
      return String(a.label).localeCompare(String(b.label));
    });
  }, [points]);

  if (rows.length === 0) return <ChartEmpty message={empty} />;

  const [s0, s1] = series;
  const padL = 36;
  const padR = 14;
  const padT = 16;
  const padB = 40;
  const w = 420;
  const h = 220;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const maxY = Math.max(
    1,
    ...rows.flatMap((p) => [p.values[s0.key] ?? 0, p.values[s1.key] ?? 0]),
  );

  function xAt(i: number) {
    if (rows.length === 1) return padL + innerW / 2;
    return padL + (i / (rows.length - 1)) * innerW;
  }
  function yAt(v: number) {
    return padT + innerH - (v / maxY) * innerH;
  }

  function pathFor(key: string) {
    return rows
      .map((p, i) => {
        const x = xAt(i);
        const y = yAt(p.values[key] ?? 0);
        return `${i === 0 ? "M" : "L"}${x},${y}`;
      })
      .join(" ");
  }

  return (
    <div className="stats-chart">
      <ChartLegend series={series} />
      <svg
        className="stats-chart__svg"
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label="Črtni graf"
      >
        {[0, Math.ceil(maxY / 2), maxY].map((t) => {
          const y = yAt(t);
          return (
            <g key={t}>
              <line
                x1={padL}
                x2={w - padR}
                y1={y}
                y2={y}
                className="stats-chart__grid"
              />
              <text
                x={padL - 6}
                y={y + 4}
                textAnchor="end"
                className="stats-chart__tick"
              >
                {t}
              </text>
            </g>
          );
        })}
        <path d={pathFor(s0.key)} fill="none" stroke={s0.color} strokeWidth={2.2} />
        <path d={pathFor(s1.key)} fill="none" stroke={s1.color} strokeWidth={2.2} />
        {rows.map((p, i) => {
          const x = xAt(i);
          return (
            <g key={p.id}>
              <circle
                cx={x}
                cy={yAt(p.values[s0.key] ?? 0)}
                r={3.5}
                fill={s0.color}
              >
                <title>
                  {p.label}: {s0.label} {p.values[s0.key] ?? 0}
                </title>
              </circle>
              <circle
                cx={x}
                cy={yAt(p.values[s1.key] ?? 0)}
                r={3.5}
                fill={s1.color}
              >
                <title>
                  {p.label}: {s1.label} {p.values[s1.key] ?? 0}
                </title>
              </circle>
              <text
                x={x}
                y={h - 12}
                textAnchor="middle"
                className="stats-chart__tick"
              >
                {p.values.year
                  ? String(p.values.year)
                  : shortLabel(p.label, 8)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function polar(cx: number, cy: number, r: number, angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

const DONUT_COLORS = [
  "var(--blue)",
  "#2a6f4e",
  "#c45c26",
  "#c9a227",
  "#5b4b8a",
  "var(--red)",
  "#3d5a80",
  "#8b5e3c",
];

function pieSlice(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
): string {
  const sweep = endAngle - startAngle;
  if (sweep >= 359.9) {
    // Full circle as two semicircles
    const a = polar(cx, cy, r, 0);
    const b = polar(cx, cy, r, 180);
    return [
      `M ${a.x} ${a.y}`,
      `A ${r} ${r} 0 1 1 ${b.x} ${b.y}`,
      `A ${r} ${r} 0 1 1 ${a.x} ${a.y}`,
      "Z",
    ].join(" ");
  }
  const start = polar(cx, cy, r, startAngle);
  const end = polar(cx, cy, r, endAngle);
  const large = sweep > 180 ? 1 : 0;
  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`,
    "Z",
  ].join(" ");
}

/** Donut — share of a total among items. */
export function DonutChart({
  items,
  empty = "Ni podatkov za graf.",
  maxItems = 6,
}: {
  items: { id: string | number; label: string; value: number }[];
  empty?: string;
  maxItems?: number;
}) {
  const rows = useMemo(() => {
    const sorted = [...items]
      .filter((i) => i.value > 0)
      .sort((a, b) => b.value - a.value);
    const top = sorted.slice(0, maxItems);
    const rest = sorted.slice(maxItems).reduce((s, i) => s + i.value, 0);
    if (rest > 0) top.push({ id: "other", label: "Ostali", value: rest });
    return top;
  }, [items, maxItems]);

  const total = rows.reduce((s, r) => s + r.value, 0);
  if (total <= 0) return <ChartEmpty message={empty} />;

  const cx = 110;
  const cy = 100;
  const r = 74;
  let angle = 0;
  const slices = rows.map((row, i) => {
    const sweep = (row.value / total) * 360;
    const start = angle;
    const end = angle + sweep;
    angle = end;
    return {
      ...row,
      start,
      end,
      color: DONUT_COLORS[i % DONUT_COLORS.length],
    };
  });

  return (
    <div className="stats-chart stats-chart--donut">
      <svg
        className="stats-chart__svg"
        viewBox="0 0 320 200"
        role="img"
        aria-label="Donut graf"
      >
        {slices.map((s) => (
          <path
            key={s.id}
            d={pieSlice(cx, cy, r, s.start, s.end)}
            fill={s.color}
            opacity={0.9}
          >
            <title>
              {s.label}: {s.value} ({Math.round((s.value / total) * 100)}%)
            </title>
          </path>
        ))}
        <circle cx={cx} cy={cy} r={42} className="stats-chart__donut-hole" />
        <text
          x={cx}
          y={cy - 2}
          textAnchor="middle"
          className="stats-chart__donut-total"
        >
          {total}
        </text>
        <text
          x={cx}
          y={cy + 14}
          textAnchor="middle"
          className="stats-chart__tick"
        >
          skupaj
        </text>
        {slices.map((s, i) => (
          <g key={`leg-${s.id}`}>
            <rect
              x={210}
              y={28 + i * 22}
              width={10}
              height={10}
              fill={s.color}
              rx={1}
            />
            <text x={226} y={37 + i * 22} className="stats-chart__label">
              {shortLabel(s.label, 14)} ({s.value})
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
