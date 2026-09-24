import type { ChangeStats } from "@/lib/types";

interface StatsPanelProps {
  stats: ChangeStats;
  limeAccuracy?: number;
}

export default function StatsPanel({ stats, limeAccuracy }: StatsPanelProps) {
  const { summary, classes } = stats;
  const changeClasses = classes.filter((c) => c.id !== 0);
  const isKmeans = summary.kappa === 0 && summary.oob_error === 0;

  return (
    <div className="flex flex-col gap-4">
      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-white">
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
            label={isKmeans ? "ML agreement" : "Model accuracy"}
            value={
              isKmeans && summary.ml_agreement_pct
                ? `${summary.ml_agreement_pct.toFixed(0)}%`
                : `${(summary.model_accuracy * 100).toFixed(0)}%`
            }
          />
          <StatCard
            label="Change share"
            value={`${summary.changed_pct}%`}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-white">
          Change by class
        </h2>
        <ul className="space-y-2">
          {changeClasses.map((cls) => (
            <li
              key={cls.id}
              className="card-inner flex items-center justify-between px-3 py-2"
            >
              <span className="flex items-center gap-2 text-sm text-white">
                <span
                  className="inline-block h-3 w-3 rounded-sm"
                  style={{ backgroundColor: cls.color }}
                />
                {cls.name}
              </span>
              <span className="text-sm text-white">
                {cls.area_km2} km²{" "}
                <span>({cls.pct}%)</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-white">
          Model confidence
        </h2>
        <div className="card-inner px-3 py-3 text-sm">
          {isKmeans ? (
            <p className="text-xs text-white">
              K-means is unsupervised — agreement with rule-based map is the validation check.
            </p>
          ) : (
            <>
              <div className="flex justify-between py-1 text-white">
                <span>Kappa</span>
                <span>{summary.kappa.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 text-white">
                <span>OOB error</span>
                <span>{(summary.oob_error * 100).toFixed(1)}%</span>
              </div>
            </>
          )}
          {limeAccuracy !== undefined && (
            <div className="mt-2 flex justify-between pt-2 text-white">
              <span>LIME model acc.</span>
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
      className={`rounded-lg px-3 py-3 ${
        highlight ? "bg-accent/10" : "bg-black ring-1 ring-white/10"
      }`}
    >
      <p className="text-xs text-white">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}
