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
  publicApi,
  type PublicPerson,
} from "@/modules/public/services/publicApi";

type FilterKey =
  | "all"
  | "player"
  | "coach"
  | "referee"
  | "staff"
  | "official"
  | "contact"
  | "delegate";

type SortKey = "first" | "last" | "nickname" | "type" | "club" | "matches";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Vsi" },
  { key: "player", label: "Igralci" },
  { key: "coach", label: "Trenerji" },
  { key: "referee", label: "Sodniki" },
  { key: "staff", label: "Osebje" },
  { key: "official", label: "Uradne osebe" },
  { key: "contact", label: "Kontakti" },
  { key: "delegate", label: "Delegati" },
];

const ROLE_LABELS: Record<string, string> = {
  player: "Igralec",
  coach: "Trener",
  referee: "Sodnik",
  staff: "Osebje",
  official: "Uradna oseba",
  contact: "Kontakt",
  delegate: "Delegat",
  other: "Drugo",
};

const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 20;

function hasRole(p: PublicPerson, code: string): boolean {
  if ((p.roles ?? []).some((r) => r.code === code)) return true;
  // Fallback for older payloads / players without role rows yet.
  if (code === "player" && p.player_id != null) return true;
  return false;
}

function rolesLabel(p: PublicPerson): string {
  const roles = p.roles ?? [];
  if (roles.length === 0) {
    return p.player_id != null ? ROLE_LABELS.player : "";
  }
  return roles
    .map((r) => ROLE_LABELS[r.code] || r.name || r.code)
    .join(", ");
}

export function PersonsPublicPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] =
    useState<(typeof PAGE_SIZE_OPTIONS)[number]>(DEFAULT_PAGE_SIZE);
  const [sortKey, setSortKey] = useState<SortKey>("last");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const list = useAsyncData(
    () => publicApi.listPersons({ page_size: 200, ordering: "last_name" }),
    [],
  );

  function onSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "matches" ? "desc" : "asc");
    }
    setPage(1);
  }

  const rows = useMemo(() => {
    const all = list.data?.results ?? [];
    const filtered =
      filter === "all" ? all : all.filter((p) => hasRole(p, filter));
    const mul = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      let c = 0;
      switch (sortKey) {
        case "first":
          c = cmpStr(a.first_name || "", b.first_name || "");
          break;
        case "last":
          c = cmpStr(a.last_name || "", b.last_name || "");
          if (c === 0) c = cmpStr(a.first_name || "", b.first_name || "");
          break;
        case "nickname":
          c = cmpStr(a.nickname || "", b.nickname || "");
          break;
        case "type":
          c = cmpStr(rolesLabel(a), rolesLabel(b));
          break;
        case "club":
          c = cmpStr(a.last_club || "", b.last_club || "");
          break;
        case "matches":
          c = cmpNum(a.matches_played ?? 0, b.matches_played ?? 0);
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

  function openPerson(p: PublicPerson) {
    if (p.player_id != null) navigate(`/players/${p.player_id}`);
  }

  return (
    <div className="page">
      <PageHeader title="Osebe" />
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
        <StateMessage
          variant="empty"
          message="Ni javnih oseb za ta filter."
        />
      ) : null}

      {rows.length > 0 ? (
        <section className="border-frame border-frame--md">
          <div className="table-scroll">
            <table className="data-table public-table">
              <thead>
                <tr>
                  <PublicSortTh
                    label="Ime"
                    sortKey="first"
                    active={sortKey}
                    dir={sortDir}
                    onSort={onSort}
                  />
                  <PublicSortTh
                    label="Priimek"
                    sortKey="last"
                    active={sortKey}
                    dir={sortDir}
                    onSort={onSort}
                  />
                  <PublicSortTh
                    label="Vzdevek"
                    sortKey="nickname"
                    active={sortKey}
                    dir={sortDir}
                    onSort={onSort}
                  />
                  <PublicSortTh
                    label="Tip"
                    sortKey="type"
                    active={sortKey}
                    dir={sortDir}
                    onSort={onSort}
                  />
                  <PublicSortTh
                    label="Zadnji klub"
                    sortKey="club"
                    active={sortKey}
                    dir={sortDir}
                    onSort={onSort}
                  />
                  <PublicSortTh
                    label="Tekme"
                    sortKey="matches"
                    active={sortKey}
                    dir={sortDir}
                    onSort={onSort}
                  />
                </tr>
              </thead>
              <tbody>
                {pageRows.map((p) => {
                  const clickable = p.player_id != null;
                  return (
                    <tr
                      key={p.id}
                      className={clickable ? "public-table__row" : undefined}
                      tabIndex={clickable ? 0 : undefined}
                      role={clickable ? "link" : undefined}
                      onClick={clickable ? () => openPerson(p) : undefined}
                      onKeyDown={
                        clickable
                          ? (e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                openPerson(p);
                              }
                            }
                          : undefined
                      }
                    >
                      <td>
                        <span className="public-table__row-label">
                          {p.first_name || "—"}
                        </span>
                      </td>
                      <td>
                        <span className="public-table__row-label">
                          {p.last_name || "—"}
                        </span>
                      </td>
                      <td className="muted">{p.nickname || "—"}</td>
                      <td className="muted">{rolesLabel(p) || "—"}</td>
                      <td className="muted">{p.last_club || "—"}</td>
                      <td>{p.matches_played ?? 0}</td>
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
