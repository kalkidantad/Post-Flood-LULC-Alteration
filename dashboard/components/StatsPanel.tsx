import type { ChangeStats } from "@/lib/types";

interface StatsPanelProps {
  stats: ChangeStats;
  limeAccuracy?: number;
}

export default function StatsPanel({ stats, limeAccuracy }: StatsPanelProps) {
  const { summary, classes } = stats;
  const changeClasses = classes.filter((c) => c.id !== 0);

  return (
    <div className="flex flex-col gap-4">
      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-gray-400">
          Overview
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Study area" value={`${summary.study_area_km2} km²`} />
          <StatCard
            label="Changed area"
            value={`${summary.changed_area_km2} km²`}
            highlight
          />
          <StatCard
            label="Persistent change"
            value={`${summary.persistent_change_km2} km²`}
          />
          <StatCard
            label="Model accuracy"
            value={`${(summary.model_accuracy * 100).toFixed(0)}%`}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-gray-400">
          Change by class
        </h2>
        <ul className="space-y-2">
          {changeClasses.map((cls) => (
            <li
              key={cls.id}
              className="flex items-center justify-between rounded-lg border border-surface-border bg-surface px-3 py-2"
            >
              <span className="flex items-center gap-2 text-sm">
                <span
                  className="inline-block h-3 w-3 rounded-sm"
                  style={{ backgroundColor: cls.color }}
                />
                {cls.name}
              </span>
              <span className="text-sm text-gray-300">
                {cls.area_km2} km²{" "}
                <span className="text-gray-500">({cls.pct}%)</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-gray-400">
          Model confidence
        </h2>
        <div className="rounded-lg border border-surface-border bg-surface px-3 py-3 text-sm">
          <div className="flex justify-between py-1">
            <span className="text-gray-400">Kappa</span>
            <span>{summary.kappa.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-gray-400">OOB error</span>
            <span>{(summary.oob_error * 100).toFixed(1)}%</span>
          </div>
          {limeAccuracy !== undefined && (
            <div className="flex justify-between py-1">
              <span className="text-gray-400">LIME model acc.</span>
              <span>{(limeAccuracy * 100).toFixed(1)}%</span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-3 ${
        highlight
          ? "border-accent/40 bg-accent/10"
          : "border-surface-border bg-surface"
      }`}
    >
      <p className="text-xs text-gray-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}
