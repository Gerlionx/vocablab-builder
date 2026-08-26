export function BrandChipRow({
  label,
  options,
  values,
  onChange,
  emptyMeansAll = false,
}: {
  label: string;
  options: string[];
  values: string[];
  onChange: (next: string[]) => void;
  emptyMeansAll?: boolean;
}) {
  const allOn = emptyMeansAll && values.length === 0;

  function toggle(opt: string) {
    if (values.includes(opt)) onChange(values.filter((v) => v !== opt));
    else onChange([...values, opt]);
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
        {emptyMeansAll ? (
          <span className="ml-2 normal-case tracking-normal text-muted-foreground/80">
            (several · none = all)
          </span>
        ) : (
          <span className="ml-2 normal-case tracking-normal text-muted-foreground/80">
            (several)
          </span>
        )}
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {emptyMeansAll ? (
          <button
            type="button"
            onClick={() => onChange([])}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
              allOn
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground hover:bg-accent"
            }`}
          >
            All
          </button>
        ) : null}
        {options.map((opt) => {
          const on = values.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                on
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground hover:bg-accent"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
