import { useMemo } from "react";

export type CareerYearPoint = {
  year: number;
  matches: number;
  goals: number;
  assists: number;
  yellow: number;
  red: number;
};

const SERIES = [
  { key: "matches" as const, label: "Nastopi", color: "var(--ink)" },
  { key: "goals" as const, label: "Goli", color: "var(--blue)" },
  { key: "assists" as const, label: "Asistence", color: "#2a6f4e" },
  { key: "yellow" as const, label: "Rumene", color: "#c9a227" },
  { key: "red" as const, label: "Rdeče", color: "var(--red)" },
];

type Props = {
  points: CareerYearPoint[];
};

export function PlayerCareerChart({ points }: Props) {
  const sorted = useMemo(
    () => [...points].sort((a, b) => a.year - b.year),
    [points],
  );

  if (sorted.length === 0) {
    return <p className="muted">Ni podatkov za graf.</p>;
  }

  const padL = 36;
  const padR = 12;
  const padT = 16;
  const padB = 36;
  const w = 640;
  const h = 260;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;

  const maxY = Math.max(
    1,
    ...sorted.flatMap((p) => [
      p.matches,
      p.goals,
      p.assists,
      p.yellow,
      p.red,
    ]),
  );

  const n = sorted.length;
  const groupW = innerW / Math.max(n, 1);
  const barW = Math.min(14, (groupW * 0.7) / SERIES.length);
  const gap = 2;

  function yScale(v: number) {
    return padT + innerH - (v / maxY) * innerH;
  }

  const ticks = [0, Math.ceil(maxY / 2), maxY];

  return (
    <div className="player-chart">
      <div className="player-chart__legend">
        {SERIES.map((s) => (
          <span key={s.key} className="player-chart__legend-item">
            <span
              className="player-chart__swatch"
              style={{ background: s.color }}
              aria-hidden
            />
            {s.label}
          </span>
        ))}
      </div>
      <div className="player-chart__frame">
        <svg
          className="player-chart__svg"
          viewBox={`0 0 ${w} ${h}`}
          role="img"
          aria-label="Statistika skozi leta"
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
                  className="player-chart__grid"
                />
                <text
                  x={padL - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="player-chart__tick"
                >
                  {t}
                </text>
              </g>
            );
          })}

          {sorted.map((p, i) => {
            const cx = padL + groupW * i + groupW / 2;
            const totalBars = SERIES.length;
            const blockW = totalBars * barW + (totalBars - 1) * gap;
            const startX = cx - blockW / 2;
            return (
              <g key={p.year}>
                {SERIES.map((s, si) => {
                  const val = p[s.key];
                  const bh = (val / maxY) * innerH;
                  const x = startX + si * (barW + gap);
                  const y = padT + innerH - bh;
                  return (
                    <rect
                      key={s.key}
                      x={x}
                      y={y}
                      width={barW}
                      height={Math.max(bh, val > 0 ? 2 : 0)}
                      fill={s.color}
                      className="player-chart__bar"
                      opacity={0.88}
                    >
                      <title>
                        {p.year}: {s.label} {val}
                      </title>
                    </rect>
                  );
                })}
                <text
                  x={cx}
                  y={h - 12}
                  textAnchor="middle"
                  className="player-chart__tick"
                >
                  {p.year}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
