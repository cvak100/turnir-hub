type IntegerStepperProps = {
  value: string;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  emptyMeansNull?: boolean;
  "aria-label"?: string;
};

function parseIntOrNull(raw: string): number | null {
  if (raw.trim() === "") return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

export function IntegerStepper({
  value,
  onChange,
  min = 1,
  max = 999,
  emptyMeansNull = true,
  "aria-label": ariaLabel,
}: IntegerStepperProps) {
  const current = parseIntOrNull(value);

  function clamp(n: number) {
    return Math.min(max, Math.max(min, n));
  }

  function setNumber(n: number | null) {
    if (n == null) {
      onChange(emptyMeansNull ? "" : String(min));
      return;
    }
    onChange(String(clamp(n)));
  }

  function onInputChange(raw: string) {
    if (raw === "") {
      onChange("");
      return;
    }
    if (!/^\d+$/.test(raw)) return;
    setNumber(Number.parseInt(raw, 10));
  }

  function bump(delta: number) {
    if (current == null) {
      setNumber(delta > 0 ? min : min);
      return;
    }
    setNumber(current + delta);
  }

  return (
    <div className="integer-stepper">
      <button
        type="button"
        className="integer-stepper__btn border-frame border-frame--sm"
        onClick={() => bump(-1)}
        disabled={current != null && current <= min}
        aria-label="Zmanjšaj"
      >
        −
      </button>
      <input
        className="integer-stepper__input"
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={(e) => onInputChange(e.target.value)}
        aria-label={ariaLabel}
        placeholder="—"
      />
      <button
        type="button"
        className="integer-stepper__btn border-frame border-frame--sm"
        onClick={() => bump(1)}
        disabled={current != null && current >= max}
        aria-label="Povečaj"
      >
        +
      </button>
    </div>
  );
}
