type SortDir = "asc" | "desc";

export function PublicSortTh<K extends string>({
  label,
  sortKey,
  active,
  dir,
  onSort,
  title,
}: {
  label: string;
  sortKey: K;
  active: K;
  dir: SortDir;
  onSort: (key: K) => void;
  title?: string;
}) {
  const marker = active === sortKey ? (dir === "asc" ? " ▲" : " ▼") : "";
  return (
    <th title={title}>
      <button
        type="button"
        className="edition-sort-th"
        onClick={(e) => {
          e.stopPropagation();
          onSort(sortKey);
        }}
      >
        {label}
        {marker}
      </button>
    </th>
  );
}

export function cmpStr(a: string, b: string): number {
  return a.localeCompare(b, "sl", { sensitivity: "base" });
}

export function cmpNum(a: number, b: number): number {
  return a - b;
}

export type { SortDir };
