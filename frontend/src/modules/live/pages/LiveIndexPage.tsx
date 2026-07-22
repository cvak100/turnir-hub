import { Link } from "react-router-dom";
import { useMemo } from "react";
import { PageHeader, StateMessage } from "@/shared/components";
import { useAsyncData } from "@/shared/hooks/useAsyncData";
import { isLiveMatchStatus } from "../matchStatuses";
import { publicApi } from "@/modules/public/services/publicApi";

export function LiveIndexPage() {
  const list = useAsyncData(async () => {
    const page = await publicApi.listMatches({ page_size: 100 });
    const live = page.results.filter((m) => isLiveMatchStatus(m.status?.code));
    return live;
  }, []);

  const eventsByMatch = useAsyncData(async () => {
    if (!list.data?.length) return new Map<number, string[]>();
    const map = new Map<number, string[]>();
    await Promise.all(
      list.data.map(async (m) => {
        const ev = await publicApi.listEvents({ match: m.id, page_size: 20 });
        const lines = [...ev.results]
          .sort((a, b) => {
            if (a.minute !== b.minute) return b.minute - a.minute;
            return (b.extra_minute ?? 0) - (a.extra_minute ?? 0);
          })
          .slice(0, 5)
          .map((e) => {
            const min =
              e.extra_minute != null
                ? `${e.minute}+${e.extra_minute}'`
                : `${e.minute}'`;
            const who =
              e.player_name ||
              (e.is_temporary_player ? e.temporary_player_label : "—");
            return `${min} ${e.event_type?.name ?? e.event_type?.code} · ${who}`;
          });
        map.set(m.id, lines);
      }),
    );
    return map;
  }, [list.data]);

  const rows = useMemo(() => list.data ?? [], [list.data]);

  return (
    <div className="page">
      <PageHeader title="Live" subtitle="Trenutno aktivne tekme." />
      {list.loading ? <StateMessage variant="loading" /> : null}
      {list.error ? (
        <StateMessage variant="error" message={list.error.message} />
      ) : null}
      {!list.loading && rows.length === 0 ? (
        <StateMessage
          variant="empty"
          title="Ni live tekem"
          message="Ko se tekma začne, se prikaže tukaj."
        />
      ) : null}

      <div className="public-live-stack">
        {rows.map((match) => (
          <article key={match.id} className="border-frame border-frame--md">
            <header className="public-edition-block__head">
              <h3>
                <Link to={`/matches/${match.id}`}>
                  {match.home_team_name ?? "Home"} vs{" "}
                  {match.away_team_name ?? "Away"}
                </Link>
              </h3>
              <span className="public-live-pill">LIVE</span>
            </header>
            <p className="public-match-score__line">
              <strong>
                {match.home_score ?? 0}:{match.away_score ?? 0}
              </strong>
              {match.edition_name ? (
                <span className="muted"> · {match.edition_name}</span>
              ) : null}
            </p>
            <ul className="plain-list">
              {(eventsByMatch.data?.get(match.id) ?? []).map((line, idx) => (
                <li key={`${match.id}-${idx}`} className="muted">
                  {line}
                </li>
              ))}
            </ul>
            <p>
              <Link to={`/matches/${match.id}`}>Podrobnosti tekme</Link>
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
