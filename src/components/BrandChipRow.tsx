export function BrandChipRow({
  label,
  options,
  values,
  onChange,
  counts,
  hideCounts = false,
  emptyMeansAll = false,
  dense = false,
  scrollable = false,
}: {
  label: string;
  options: readonly string[];
  values: string[];
  onChange: (next: string[]) => void;
  /** Playable word count per option; 0 = washed out / unavailable. */
  counts?: Record<string, number>;
  /** Keep counts for wash-out logic but don't show the number on the chip. */
  hideCounts?: boolean;
  /** When true, an empty selection matches everything. When false, empty matches nothing. */
  emptyMeansAll?: boolean;
  /** Tighter chips — useful for long topic lists. */
  dense?: boolean;
  /** Put chips in a scroll box (topics). */
  scrollable?: boolean;
}) {
  const available = options.filter((opt) => (counts?.[opt] ?? 1) > 0);
  const allSelected =
    available.length > 0 && available.every((opt) => values.includes(opt));
  const noneSelected = values.length === 0;
  const allOn = emptyMeansAll ? noneSelected : allSelected;
  const allWordCount = available.reduce((sum, opt) => sum + (counts?.[opt] ?? 0), 0);

  function toggle(opt: string) {
    const n = counts?.[opt] ?? 1;
    if (n <= 0) return;
    if (values.includes(opt)) onChange(values.filter((v) => v !== opt));
    else onChange([...values, opt]);
  }

  function toggleAll() {
    if (emptyMeansAll) {
      onChange([]);
      return;
    }
    onChange(allSelected ? [] : [...available]);
  }

  const chipPad = dense ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm";
  const showCounts = Boolean(counts) && !hideCounts;

  const chips = (
    <div className={`flex flex-wrap ${dense ? "gap-1" : "gap-1.5"}`}>
      <button
        type="button"
        onClick={toggleAll}
        disabled={!emptyMeansAll && available.length === 0}
        className={`rounded-full font-semibold transition ${chipPad} ${
          allOn
            ? "bg-primary text-primary-foreground"
            : available.length === 0 && !emptyMeansAll
              ? "cursor-not-allowed bg-muted/40 text-muted-foreground/50"
              : "bg-muted text-foreground hover:bg-accent"
        }`}
      >
        All
        {showCounts && allWordCount > 0 ? (
          <span
            className={`ml-1.5 tabular-nums font-bold ${
              allOn ? "text-sky-200" : "text-sky-600"
            }`}
          >
            {allWordCount}
          </span>
        ) : null}
      </button>
      {options.map((opt) => {
        const n = counts?.[opt];
        const empty = typeof n === "number" && n <= 0;
        const on = values.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            disabled={empty}
            onClick={() => toggle(opt)}
            title={empty ? "No wheel vocabulary for this filter" : undefined}
            className={`rounded-full font-semibold transition ${chipPad} ${
              empty
                ? "cursor-not-allowed bg-muted/30 text-muted-foreground/40"
                : on
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground hover:bg-accent"
            }`}
          >
            <span className={empty ? "opacity-70" : undefined}>{opt}</span>
            {showCounts && !empty && typeof n === "number" ? (
              <span
                className={`ml-1.5 tabular-nums font-bold ${
                  on ? "text-sky-200" : "text-sky-600"
                }`}
              >
                {n}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </p>
        <p className="text-[11px] text-muted-foreground/80">
          {emptyMeansAll ? "several · none = all" : "pick some · All · none"}
        </p>
      </div>
      {scrollable ? (
        <div className="mt-2 max-h-52 overflow-y-auto rounded-xl bg-background/70 p-2.5 ring-1 ring-border/70">
          {chips}
        </div>
      ) : (
        <div className="mt-2">{chips}</div>
      )}
    </div>
  );
}
