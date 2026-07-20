import { useId, useState, type ReactNode } from "react";
import type { StatusRef } from "@/shared/types";

/** Tournament edition statuses */
export const EDITION_STATUS_HELP: Record<string, string> = {
  draft: "še se pripravlja, tipično brez prijav",
  registration: "odprta prijava / urejanje ekip",
  ongoing: "tekme potekajo",
  finished: "turnir je zaključen",
  cancelled: "edicija ne velja več",
};

/** Team participation statuses on an edition */
export const TEAM_PARTICIPATION_STATUS_HELP: Record<string, string> = {
  pending: "prijava čaka na potrditev",
  active: "ekipa je aktivna na turnirju",
  approved: "prijava je odobrena",
  withdrawn: "ekipa se je umaknila / ni več v turnirju",
};

type Props = {
  statuses: StatusRef[];
  selectedId?: string;
  label?: string;
  helpByCode?: Record<string, string>;
  fallbackHelp?: string;
  children: ReactNode;
};

export function StatusHelpHint({
  statuses,
  selectedId,
  label = "Status *",
  helpByCode = EDITION_STATUS_HELP,
  fallbackHelp = "status",
  children,
}: Props) {
  const [open, setOpen] = useState(false);
  const tipId = useId();
  const selected = statuses.find((s) => String(s.id) === selectedId);

  return (
    <div className="status-field">
      <div className="field-label-row">
        <span>{label}</span>
        <button
          type="button"
          className="linkish field-help__toggle"
          aria-expanded={open}
          aria-controls={tipId}
          aria-label={open ? "Skrij razlago statusov" : "Kaj pomenijo statusi?"}
          title="Kaj pomenijo statusi?"
          onClick={() => setOpen((v) => !v)}
        >
          ?
        </button>
      </div>
      {open ? (
        <div id={tipId} className="field-help__panel" role="note">
          <dl className="field-help__defs">
            {statuses.map((s) => (
              <div
                key={s.id}
                className={
                  selected?.id === s.id
                    ? "field-help__row field-help__row--active"
                    : "field-help__row"
                }
              >
                <dt>{s.name}</dt>
                <dd>{helpByCode[s.code] ?? fallbackHelp}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
      {children}
    </div>
  );
}
