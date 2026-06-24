// Epic 6: dependency-free chart primitives. These are plain Server Components
// rendered with divs + Tailwind — no charting library is used.

import { barScale } from "@/app/lib/analytics";

export type BarDatum = {
  label: string;
  value: number;
  hint?: string;
};

export function BarChart({
  data,
  emptyText = "No data for this range.",
}: {
  data: BarDatum[];
  emptyText?: string;
}) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  }

  const max = data.reduce((acc, item) => Math.max(acc, item.value), 0);

  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.label} className="grid grid-cols-[10rem_1fr_3rem] items-center gap-3">
          <span className="truncate text-sm capitalize" title={item.label}>
            {item.label}
          </span>
          <div
            className="h-3 rounded-full bg-muted"
            role="img"
            aria-label={`${item.label}: ${item.value}`}
          >
            <div
              className="h-3 rounded-full bg-primary"
              style={{ width: `${Math.max(barScale(item.value, max), item.value > 0 ? 4 : 0)}%` }}
            />
          </div>
          <span className="text-right text-sm font-semibold tabular-nums">
            {item.hint ?? item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ReportSection({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="-mx-5 mt-8 border-y bg-background px-5 py-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl font-semibold uppercase tracking-wider">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
