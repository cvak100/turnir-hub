import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ErrorBanner,
  PageHeader,
  PublicSortTh,
  StateMessage,
  cmpNum,
  cmpStr,
  type SortDir,
} from "@/shared/components";
import { useAsyncData } from "@/shared/hooks/useAsyncData";
import {
  editionBucket,
  publicApi,
  type EditionBucket,
} from "@/modules/public/services/publicApi";

type FilterKey = "all" | EditionBucket;
type SortKey = "edition" | "tournament" | "year" | "date";

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

function dateSortValue(iso: string | null | undefined): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export function TournamentListPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] =
    useState<(typeof PAGE_SIZE_OPTIONS)[number]>(DEFAULT_PAGE_SIZE);
  const [sortKey, setSortKey] = useState<SortKey>("year");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const list = useAsyncData(() => publicApi.listEditions(), []);

  function onSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "year" || key === "date" ? "desc" : "asc");
    }
    setPage(1);
  }

  const rows = useMemo(() => {
    const all = (list.data?.results ?? []).filter(
      (e) => (e.status?.code ?? "").toLowerCase() !== "draft",
    );
    const filtered =
      filter === "all"
        ? all
        : all.filter((e) => editionBucket(e.status?.code) === filter);
    const mul = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      let c = 0;
      switch (sortKey) {
        case "edition":
          c = cmpStr(a.name || "", b.name || "");
          break;
        case "tournament":
          c = cmpStr(a.tournament_name || "", b.tournament_name || "");
          break;
        case "year":
          c = cmpNum(a.year ?? 0, b.year ?? 0);
          break;
        case "date":
          c = cmpNum(
            dateSortValue(a.start_date),
            dateSortValue(b.start_date),
          );
          break;
        default:
          c = 0;
      }
      return c * mul;
    });
  }, [filter, list.data, sortKey, sortDir]);

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
                  <PublicSortTh
                    label="Edicija"
                    sortKey="edition"
                    active={sortKey}
                    dir={sortDir}
                    onSort={onSort}
                  />
                  <PublicSortTh
                    label="Turnir"
                    sortKey="tournament"
                    active={sortKey}
                    dir={sortDir}
                    onSort={onSort}
                  />
                  <PublicSortTh
                    label="Leto"
                    sortKey="year"
                    active={sortKey}
                    dir={sortDir}
                    onSort={onSort}
                  />
                  <PublicSortTh
                    label="Datum"
                    sortKey="date"
                    active={sortKey}
                    dir={sortDir}
                    onSort={onSort}
                  />
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
            <div className="edition-pager__size" role="group" aria-label="Na stran">
              <span className="muted">Na stran</span>
              {PAGE_SIZE_OPTIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={
                    pageSize === n
                      ? "edition-pager__size-btn edition-pager__size-btn--active"
                      : "edition-pager__size-btn"
                  }
                  aria-pressed={pageSize === n}
                  onClick={() => setPageSize(n)}
                >
                  {n}
                </button>
              ))}
            </div>
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
