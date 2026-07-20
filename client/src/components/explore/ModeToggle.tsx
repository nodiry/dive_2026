export type ExploreMode = "criteria" | "preference";

interface ModeToggleProps {
  mode: ExploreMode;
  onChange: (mode: ExploreMode) => void;
  criteriaLabel: string;
  preferenceLabel: string;
}

/**
 * A two-state scale, not two independent buttons: pressing one side always
 * turns the other off. `aria-pressed` reflects that mutual exclusivity for
 * screen readers.
 */
export function ModeToggle({ mode, onChange, criteriaLabel, preferenceLabel }: ModeToggleProps) {
  const base = "rounded-full px-4 py-2 text-sm font-medium transition-colors";
  const active = "bg-marine text-mist";
  const inactive = "text-marine/70 hover:bg-marine/10";

  return (
    <div className="flex shrink-0 items-center gap-1 rounded-full bg-mist-dim p-1">
      <button
        type="button"
        aria-pressed={mode === "criteria"}
        onClick={() => onChange("criteria")}
        className={`${base} ${mode === "criteria" ? active : inactive}`}
      >
        {criteriaLabel}
      </button>
      <button
        type="button"
        aria-pressed={mode === "preference"}
        onClick={() => onChange("preference")}
        className={`${base} ${mode === "preference" ? active : inactive}`}
      >
        {preferenceLabel}
      </button>
    </div>
  );
}
