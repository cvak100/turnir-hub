import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ErrorBanner,
  PageHeader,
  StateMessage,
} from "@/shared/components";
import { useAsyncData } from "@/shared/hooks/useAsyncData";
import { matchService } from "@/modules/matches/services/matchService";
import { isLiveMatchStatus } from "@/modules/live/matchStatuses";

function matchLabel(row: {
  home_team_name: string | null;
  away_team_name: string | null;
  home_score: number | null;
  away_score: number | null;
}): string {
  const home = row.home_team_name ?? "TBD";
  const away = row.away_team_name ?? "TBD";
  if (row.home_score != null && row.away_score != null) {
    return `${home} ${row.home_score}:${row.away_score} ${away}`;
  }
  return `${home} – ${away}`;
}

export function LiveEditAdminPage() {
  const navigate = useNavigate();
  const list = useAsyncData(
    () => matchService.list({ page_size: 100, ordering: "-match_date" }),
    [],
  );

  const rows = useMemo(
    () =>
      (list.data?.results ?? []).filter((m) =>
        isLiveMatchStatus(m.status?.code),
      ),
    [list.data],
  );

  return (
    <div className="page">
      <PageHeader
        title="Live Edit"
        subtitle="Tekme v teku — klik odpre live urejanje."
        actions={
          <Link
            className="button-link border-frame border-frame--sm"
            to="/dashboard_admin/matches"
          >
            Vse tekme
          </Link>
        }
      />
      <ErrorBanner error={list.error} />
      {list.loading ? <StateMessage variant="loading" /> : null}
      {!list.loading && rows.length === 0 ? (
        <StateMessage variant="empty" message="Trenutno ni live tekem." />
      ) : null}

      {rows.length > 0 ? (
        <section className="border-frame border-frame--md">
          <div className="table-scroll">
            <table className="data-table public-table">
              <thead>
                <tr>
                  <th>Tekma</th>
                  <th>Edicija</th>
                  <th>Status</th>
                  <th>Faza</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => {
                  const href = `/dashboard_admin/live/matches/${m.id}`;
                  return (
                    <tr
                      key={m.id}
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
                          {matchLabel(m)}
                        </span>
                      </td>
                      <td className="muted">{m.edition_name || "—"}</td>
                      <td>{m.status?.name || m.status?.code || "—"}</td>
                      <td className="muted">
                        {[m.phase_name, m.group_name]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
