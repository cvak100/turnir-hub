import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ErrorBanner,
  PageHeader,
  StateMessage,
} from "@/shared/components";
import { useAsyncData } from "@/shared/hooks/useAsyncData";
import type { TeamParticipationPlayerListItem } from "@/modules/players/services/playerService";
import { publicApi } from "@/modules/public/services/publicApi";
import { EditionPublicNav, personLabel } from "../publicEdition.tsx";

const PAGE_SIZE = 20;

type SortKey =
  | "name"
  | "team"
  | "jersey"
  | "position"
  | "matches"
  | "goals"
  | "assists"
  | "yellow"
  | "red";

type SortDir = "asc" | "desc";

function SortTh({
  label,
  sortKey,
  active,
  dir,
  onSort,
  title,
}: {
  label: string;
  sortKey: SortKey;
  active: SortKey;
  dir: SortDir;
  onSort: (key: SortKey) => void;
  title?: string;
}) {
  const marker = active === sortKey ? (dir === "asc" ? " ▲" : " ▼") : "";
  return (
    <th title={title}>
      <button
        type="button"
        className="edition-sort-th"
        onClick={() => onSort(sortKey)}
      >
        {label}
        {marker}
      </button>
    </th>
  );
}

function cmpStr(a: string, b: string): number {
  return a.localeCompare(b, "sl", { sensitivity: "base" });
}

function cmpNum(a: number, b: number): number {
  return a - b;
}

export function EditionPublicPlayersPage() {
  const { id } = useParams();
  const editionId = Number(id);
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState<SortKey>("team");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);

  const edition = useAsyncData(
    () => publicApi.getEdition(editionId),
    [editionId],
  );
  const players = useAsyncData(
    () => publicApi.listEditionPlayers(editionId),
    [editionId],
  );

  function onSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(
        key === "name" || key === "team" || key === "position" ? "asc" : "desc",
      );
    }
    setPage(1);
  }

  const sortedPlayers = useMemo(() => {
    const rows = [...(players.data?.results ?? [])];
    const mul = sortDir === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      let c = 0;
      switch (sortKey) {
        case "name":
          c = cmpStr(personLabel(a), personLabel(b));
          break;
        case "team":
          c = cmpStr(
            a.team_name ?? a.participation_name ?? "",
            b.team_name ?? b.participation_name ?? "",
          );
          if (c === 0) c = cmpStr(personLabel(a), personLabel(b));
          break;
        case "jersey":
          c = cmpNum(a.jersey_number ?? 9999, b.jersey_number ?? 9999);
          break;
        case "position":
          c = cmpStr(a.position || "", b.position || "");
          break;
        case "matches":
          c = cmpNum(a.matches_played ?? 0, b.matches_played ?? 0);
          break;
        case "goals":
          c = cmpNum(a.goals ?? 0, b.goals ?? 0);
          break;
        case "assists":
          c = cmpNum(a.assists ?? 0, b.assists ?? 0);
          break;
        case "yellow":
          c = cmpNum(a.yellow_cards ?? 0, b.yellow_cards ?? 0);
          break;
        case "red":
          c = cmpNum(a.red_cards ?? 0, b.red_cards ?? 0);
          break;
        default:
          c = 0;
      }
      return c * mul;
    });
    return rows;
  }, [players.data, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedPlayers.length / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const playerRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sortedPlayers.slice(start, start + PAGE_SIZE);
  }, [sortedPlayers, page]);

  if (!Number.isFinite(editionId)) {
    return <StateMessage variant="error" message="Neveljaven id edicije." />;
  }

  const loading = edition.loading || players.loading;
  const error = edition.error ?? players.error;

  const th = (label: string, key: SortKey, title?: string) => (
    <SortTh
      label={label}
      sortKey={key}
      active={sortKey}
      dir={sortDir}
      onSort={onSort}
      title={title}
    />
  );

  const from = sortedPlayers.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, sortedPlayers.length);

  return (
    <div className="page">
      <PageHeader
        title="Igralci"
        subtitle={edition.data?.name ?? "Edicija"}
        actions={
          <Link
            className="button-link border-frame border-frame--sm"
            to={`/editions/${editionId}`}
          >
            Dashboard
          </Link>
        }
      />
      <EditionPublicNav editionId={editionId} />
      <ErrorBanner error={error} />
      {loading ? <StateMessage variant="loading" /> : null}

      <section className="border-frame border-frame--md">
        {sortedPlayers.length === 0 && !loading ? (
          <p className="muted">Ni igralcev.</p>
        ) : sortedPlayers.length === 0 ? null : (
          <>
            <div className="table-scroll">
              <table className="data-table edition-public-table">
                <thead>
                  <tr>
                    {th("Igralec", "name")}
                    {th("Ekipa", "team")}
                    {th("Dres", "jersey", "Številka dresa")}
                    {th("Pozicija", "position")}
                    {th("T", "matches", "Tekme")}
                    {th("G", "goals", "Goli")}
                    {th("A", "assists", "Asistence")}
                    {th("🟨", "yellow", "Rumeni kartoni")}
                    {th("🟥", "red", "Rdeči kartoni")}
                  </tr>
                </thead>
                <tbody>
                  {playerRows.map((p: TeamParticipationPlayerListItem) => {
                    const playerId = p.player?.id;
                    const href =
                      playerId != null ? `/players/${playerId}` : undefined;
                    return (
                      <tr
                        key={p.id}
                        className={
                          href ? "edition-public-table__row" : undefined
                        }
                        tabIndex={href ? 0 : undefined}
                        role={href ? "link" : undefined}
                        onClick={
                          href
                            ? () => {
                                navigate(href);
                              }
                            : undefined
                        }
                        onKeyDown={
                          href
                            ? (e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  navigate(href);
                                }
                              }
                            : undefined
                        }
                      >
                        <td>
                          <span className="edition-public-table__row-label">
                            {personLabel(p)}
                          </span>
                        </td>
                        <td className="muted">
                          {p.team_name ?? p.participation_name ?? "—"}
                        </td>
                        <td>{p.jersey_number ?? "—"}</td>
                        <td className="muted">{p.position || "—"}</td>
                        <td>{p.matches_played ?? 0}</td>
                        <td>{p.goals ?? 0}</td>
                        <td>{p.assists ?? 0}</td>
                        <td>{p.yellow_cards ?? 0}</td>
                        <td>{p.red_cards ?? 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {sortedPlayers.length > PAGE_SIZE ? (
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
                  {from}–{to} / {sortedPlayers.length} · stran {page}/
                  {totalPages}
                </span>
                <button
                  type="button"
                  className="button-link border-frame border-frame--sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Naslednja
                </button>
              </div>
            ) : (
              <p className="muted edition-pager__meta">
                {sortedPlayers.length} igralcev
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
