import type { KeyboardEvent, ReactNode } from "react";
import { useNavigate } from "react-router-dom";

export type StatTableRow = {
  href?: string;
  cells: ReactNode[];
};

type Props = {
  title: string;
  note?: string;
  headers: string[];
  rows: StatTableRow[];
  chart: ReactNode;
  empty: string;
};

export function StatSection({
  title,
  note,
  headers,
  rows,
  chart,
  empty,
}: Props) {
  const navigate = useNavigate();

  function activate(href: string | undefined) {
    if (href) navigate(href);
  }

  function onKey(
    e: KeyboardEvent<HTMLTableRowElement>,
    href: string | undefined,
  ) {
    if (!href) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      navigate(href);
    }
  }

  return (
    <section className="border-frame border-frame--md stats-section">
      <div className="stats-section__head">
        <h2 className="stats-section__title">{title}</h2>
        {note ? <p className="muted stats-section__note">{note}</p> : null}
      </div>
      <div className="stats-section__body">
        <div className="stats-section__table-wrap">
          {rows.length === 0 ? (
            <p className="muted">{empty}</p>
          ) : (
            <table className="data-table public-table stats-section__table">
              <thead>
                <tr>
                  <th>#</th>
                  {headers.map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={i}
                    className={row.href ? "public-table__row" : undefined}
                    tabIndex={row.href ? 0 : undefined}
                    role={row.href ? "link" : undefined}
                    onClick={() => activate(row.href)}
                    onKeyDown={(e) => onKey(e, row.href)}
                  >
                    <td>{i + 1}</td>
                    {row.cells.map((c, j) => (
                      <td key={j}>{c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="stats-section__chart-wrap">{chart}</div>
      </div>
    </section>
  );
}
