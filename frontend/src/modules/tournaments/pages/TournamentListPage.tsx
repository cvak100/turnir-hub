import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
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

export function TournamentListPage() {
  const [filter, setFilter] = useState<FilterKey>("all");
  const list = useAsyncData(() => publicApi.listEditions(), []);

  const rows = useMemo(() => {
    const all = list.data?.results ?? [];
    if (filter === "all") return all;
    return all.filter((e) => editionBucket(e.status?.code) === filter);
  }, [filter, list.data]);

  return (
    <div className="page">
      <PageHeader
        title="Turnirji"
        subtitle="Javne edicije — klik odpre dashboard edicije."
      />
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
        <div className="admin-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Edicija</th>
                <th>Turnir</th>
                <th>Leto</th>
                <th>Status</th>
                <th>Datum</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((ed) => (
                <tr key={ed.id}>
                  <td>
                    <Link to={`/editions/${ed.id}`}>{ed.name}</Link>
                  </td>
                  <td>{ed.tournament_name}</td>
                  <td>{ed.year}</td>
                  <td>{ed.status?.name ?? ed.status?.code ?? "—"}</td>
                  <td>
                    {ed.start_date} → {ed.end_date}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
