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
import { publicApi } from "@/modules/public/services/publicApi";
import type { TeamListItem } from "@/modules/teams/services/teamService";

type SortKey = "name" | "city" | "players" | "appearances";

const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 20;

export function TeamListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] =
    useState<(typeof PAGE_SIZE_OPTIONS)[number]>(DEFAULT_PAGE_SIZE);
  const [sortKey, setSortKey] = useState<SortKey>("appearances");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const list = useAsyncData(
    () => publicApi.listTeams({ page_size: 200, ordering: "name" }),
    [],
  );

  function onSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(
        key === "players" || key === "appearances" ? "desc" : "asc",
      );
    }
    setPage(1);
  }

  const rows = useMemo(() => {
    const all = [...(list.data?.results ?? [])];
    const mul = sortDir === "asc" ? 1 : -1;
    all.sort((a, b) => {
      let c = 0;
      switch (sortKey) {
        case "name":
          c = cmpStr(a.name || "", b.name || "");
          break;
        case "city":
          c = cmpStr(a.city || "", b.city || "");
          break;
        case "players":
          c = cmpNum(a.players_count ?? 0, b.players_count ?? 0);
          break;
        case "appearances":
          c = cmpNum(a.appearances_count ?? 0, b.appearances_count ?? 0);
          break;
        default:
          c = 0;
      }
      return c * mul;
    });
    return all;
  }, [list.data, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page, pageSize]);

  const from = rows.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, rows.length);

  function openTeam(team: TeamListItem) {
    navigate(`/teams/${team.id}`);
  }

  return (
    <div className="page">
      <PageHeader title="Ekipe" />
      <ErrorBanner error={list.error} />
      {list.loading ? <StateMessage variant="loading" /> : null}
      {!list.loading && rows.length === 0 ? (
        <StateMessage variant="empty" message="Ni javnih ekip." />
      ) : null}

      {rows.length > 0 ? (
        <section className="border-frame border-frame--md">
          <div className="table-scroll">
            <table className="data-table public-table">
              <thead>
                <tr>
                  <PublicSortTh
                    label="Ime"
                    sortKey="name"
                    active={sortKey}
                    dir={sortDir}
                    onSort={onSort}
                  />
                  <PublicSortTh
                    label="Lokacija"
                    sortKey="city"
                    active={sortKey}
                    dir={sortDir}
                    onSort={onSort}
                  />
                  <PublicSortTh
                    label="Igralci"
                    sortKey="players"
                    active={sortKey}
                    dir={sortDir}
                    onSort={onSort}
                    title="Število vseh igralcev, ki so nastopali za ekipo"
                  />
                  <PublicSortTh
                    label="Nastopi"
                    sortKey="appearances"
                    active={sortKey}
                    dir={sortDir}
                    onSort={onSort}
                    title="Število nastopov na turnirjih"
                  />
                </tr>
              </thead>
              <tbody>
                {pageRows.map((team) => (
                  <tr
                    key={team.id}
                    className="public-table__row"
                    tabIndex={0}
                    role="link"
                    onClick={() => openTeam(team)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openTeam(team);
                      }
                    }}
                  >
                    <td>
                      <span className="public-table__row-label">
                        {team.name}
                      </span>
                    </td>
                    <td className="muted">{team.city?.trim() || "—"}</td>
                    <td>{team.players_count ?? 0}</td>
                    <td>{team.appearances_count ?? 0}</td>
                  </tr>
                ))}
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
            <div
              className="edition-pager__size"
              role="group"
              aria-label="Na stran"
            >
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
