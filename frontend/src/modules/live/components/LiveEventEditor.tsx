import { type FormEvent, useEffect, useState } from "react";
import { ErrorBanner } from "@/shared/components";
import {
  matchEventService,
  type MatchEventInput,
  type MatchEventListItem,
} from "@/modules/matches/services/matchService";

type Props = {
  matchId: number;
  homeParticipationId: number | null;
  awayParticipationId: number | null;
  canAdd: boolean;
  canEdit: boolean;
  events: MatchEventListItem[];
  onChanged: () => void;
};

const emptyForm = {
  event_type: "",
  team_participation: "",
  minute: "",
  extra_minute: "",
  half: "1",
  player: "",
  related_player: "",
  is_temporary_player: false,
  temporary_player_label: "",
  is_own_goal: false,
  notes: "",
};

export function LiveEventEditor({
  matchId,
  homeParticipationId,
  awayParticipationId,
  canAdd,
  canEdit,
  events,
  onChanged,
}: Props) {
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (editingId == null) return;
    const event = events.find((item) => item.id === editingId);
    if (!event) return;
    setForm({
      event_type: String(event.event_type.id || ""),
      team_participation: String(event.team_participation),
      minute: String(event.minute),
      extra_minute:
        event.extra_minute == null ? "" : String(event.extra_minute),
      half: event.half || "1",
      player: event.player == null ? "" : String(event.player),
      related_player: "",
      is_temporary_player: event.is_temporary_player,
      temporary_player_label: event.temporary_player_label ?? "",
      is_own_goal: event.is_own_goal,
      notes: "",
    });
  }, [editingId, events]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canAdd && editingId == null) return;
    if (!canEdit && editingId != null) return;

    setSubmitting(true);
    setError(null);
    try {
      const payload: MatchEventInput = {
        match: matchId,
        event_type: Number(form.event_type),
        team_participation: Number(form.team_participation),
        minute: Number(form.minute),
        half: form.half,
        extra_minute:
          form.extra_minute.trim() === "" ? null : Number(form.extra_minute),
        player: form.player.trim() === "" ? null : Number(form.player),
        related_player:
          form.related_player.trim() === ""
            ? null
            : Number(form.related_player),
        is_temporary_player: form.is_temporary_player,
        temporary_player_label: form.temporary_player_label,
        is_own_goal: form.is_own_goal,
        notes: form.notes,
      };

      if (editingId != null) {
        await matchEventService.update(editingId, payload);
      } else {
        await matchEventService.create(payload);
      }
      setForm(emptyForm);
      setEditingId(null);
      onChanged();
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  }

  if (!canAdd && !canEdit) return null;

  return (
    <section className="border-frame border-frame--md">
      <h2>{editingId != null ? "Edit event" : "Add event"}</h2>
      <p className="muted">
        Event type is a numeric id (no event-types list endpoint in this phase).
        Common codes map to backend EventType rows.
      </p>
      <ErrorBanner error={error} />
      <form className="stack-form border-frame border-frame--md" onSubmit={onSubmit}>
        <label>
          Event type id
          <input
            type="number"
            value={form.event_type}
            onChange={(e) => setForm({ ...form, event_type: e.target.value })}
            required
          />
        </label>
        <label>
          Team participation
          <select
            value={form.team_participation}
            onChange={(e) =>
              setForm({ ...form, team_participation: e.target.value })
            }
            required
          >
            <option value="">Select…</option>
            {homeParticipationId != null ? (
              <option value={homeParticipationId}>
                Home ({homeParticipationId})
              </option>
            ) : null}
            {awayParticipationId != null ? (
              <option value={awayParticipationId}>
                Away ({awayParticipationId})
              </option>
            ) : null}
          </select>
        </label>
        <label>
          Minute
          <input
            type="number"
            value={form.minute}
            onChange={(e) => setForm({ ...form, minute: e.target.value })}
            required
          />
        </label>
        <label>
          Extra minute
          <input
            type="number"
            value={form.extra_minute}
            onChange={(e) => setForm({ ...form, extra_minute: e.target.value })}
          />
        </label>
        <label>
          Half
          <input
            value={form.half}
            onChange={(e) => setForm({ ...form, half: e.target.value })}
          />
        </label>
        <label>
          Player id (optional)
          <input
            type="number"
            value={form.player}
            onChange={(e) => setForm({ ...form, player: e.target.value })}
            disabled={form.is_temporary_player}
          />
        </label>
        <label>
          Related player id
          <input
            type="number"
            value={form.related_player}
            onChange={(e) =>
              setForm({ ...form, related_player: e.target.value })
            }
          />
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={form.is_temporary_player}
            onChange={(e) =>
              setForm({
                ...form,
                is_temporary_player: e.target.checked,
                player: e.target.checked ? "" : form.player,
              })
            }
          />
          Temporary player
        </label>
        {form.is_temporary_player ? (
          <label>
            Temporary player label
            <input
              value={form.temporary_player_label}
              onChange={(e) =>
                setForm({ ...form, temporary_player_label: e.target.value })
              }
              placeholder="e.g. Unknown #9"
              required
            />
          </label>
        ) : null}
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={form.is_own_goal}
            onChange={(e) =>
              setForm({ ...form, is_own_goal: e.target.checked })
            }
          />
          Own goal
        </label>
        <label>
          Notes / description
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
          />
        </label>
        <div className="row-actions">
          <button type="submit" className="border-frame border-frame--sm" disabled={submitting}>
            {submitting
              ? "Saving…"
              : editingId != null
                ? "Save correction"
                : "Add event"}
          </button>
          {editingId != null ? (
            <button
              type="button"
              className="button-secondary border-frame border-frame--sm"
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm);
              }}
            >
              Cancel edit
            </button>
          ) : null}
        </div>
      </form>

      {canEdit ? (
        <div className="edit-event-picker">
          <h3>Correct temporary / existing event</h3>
          <ul className="plain-list">
            {events.map((item) => (
              <li key={item.id}>
                #{item.id} {item.minute}&apos; {item.event_type.code}
                {item.is_temporary_player
                  ? ` · temp: ${item.temporary_player_label}`
                  : ""}{" "}
                <button
                  type="button"
                  className="linkish"
                  onClick={() => setEditingId(item.id)}
                >
                  Edit
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
