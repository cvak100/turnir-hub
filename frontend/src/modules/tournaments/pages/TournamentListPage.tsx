import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ErrorBanner,
  PageHeader,
  StateMessage,
} from "@/shared/components";
import { useAsyncData } from "@/shared/hooks/useAsyncData";
import {
  editionBucket,
  publicApi,
  type EditionBucket,
} from "@/modules/public/services/publicApi";

type FilterKey = "all" | EditionBucket;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Vsi" },
  { key: "active", label: "Aktivni" },
  { key: "upcoming", label: "Prihajajoči" },
  { key: "finished", label: "Končani" },
];

const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 20;

function formatDayMonth(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    // YYYY-MM-DD fallback
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
    if (m) return `${m[3]}.${m[2]}.`;
    return iso;
  }
  return d.toLocaleDateString("sl-SI", { day: "2-digit", month: "2-digit" });
}

function formatDateRange(
  start: string | null | undefined,
  end: string | null | undefined,
): string {
  const a = formatDayMonth(start);
  const b = formatDayMonth(end);
  if (!a && !b) return "—";
  if (a && b) return `${a} → ${b}`;
  return a || b;
}

export function TournamentListPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] =
    useState<(typeof PAGE_SIZE_OPTIONS)[number]>(DEFAULT_PAGE_SIZE);
  const list = useAsyncData(() => publicApi.listEditions(), []);

  const rows = useMemo(() => {
    const all = (list.data?.results ?? []).filter(
      (e) => (e.status?.code ?? "").toLowerCase() !== "draft",
    );
    if (filter === "all") return all;
    return all.filter((e) => editionBucket(e.status?.code) === filter);
  }, [filter, list.data]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [filter, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page, pageSize]);

  const from = rows.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, rows.length);

  return (
    <div className="page">
      <PageHeader title="Turnirji" />
      <ErrorBanner error={list.error} />

      <div className="public-filter-row row-actions">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={
              filter === f.key
                ? "border-frame border-frame--sm"
                : "button-secondary border-frame border-frame--sm"
            }
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {list.loading ? <StateMessage variant="loading" /> : null}
      {!list.loading && rows.length === 0 ? (
        <StateMessage variant="empty" message="Ni javnih edicij za ta filter." />
      ) : null}

      {rows.length > 0 ? (
        <section className="border-frame border-frame--md">
          <div className="table-scroll">
            <table className="data-table public-table">
              <thead>
                <tr>
                  <th>Edicija</th>
                  <th>Turnir</th>
                  <th>Leto</th>
                  <th>Datum</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((ed) => {
                  const href = `/editions/${ed.id}`;
                  return (
                    <tr
                      key={ed.id}
                      className="public-table__row"
                      tabIndex={0}
                      role="link"
                      onClick={() => navigate(href)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          navigate(href);
                        }
                      }}
                    >
                      <td>
                        <span className="public-table__row-label">
                          {ed.name}
                        </span>
                      </td>
                      <td className="muted">{ed.tournament_name || "—"}</td>
                      <td>{ed.year}</td>
                      <td className="muted">
                        {formatDateRange(ed.start_date, ed.end_date)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="edition-pager">
            <button
              type="button"
              className="button-link border-frame border-frame--sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prejšnja
            </button>
            <span className="muted edition-pager__meta">
              {from}–{to} / {rows.length}
              {rows.length > pageSize ? ` · stran ${page}/${totalPages}` : ""}
            </span>
            <label className="edition-pager__size muted">
              Na stran
              <select
                value={pageSize}
                onChange={(e) =>
                  setPageSize(
                    Number(e.target.value) as (typeof PAGE_SIZE_OPTIONS)[number],
                  )
                }
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="button-link border-frame border-frame--sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Naslednja
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
