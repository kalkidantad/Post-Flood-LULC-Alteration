import type { MlComparison } from "@/lib/types";

interface MlAgreementPanelProps {
  comparison: MlComparison;
}

export default function MlAgreementPanel({ comparison }: MlAgreementPanelProps) {
  return (
    <section className="card h-full p-4">
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-white">
        Rule-based vs ML (K-means)
      </h2>
      <div className="grid grid-cols-2 gap-3">
        <Metric label="Rule-based change" value={`${comparison.rule_based_km2.toFixed(1)} km²`} />
        <Metric label="ML change area" value={`${comparison.ml_km2.toFixed(1)} km²`} />
        <Metric label="Overlap (both)" value={`${comparison.overlap_km2.toFixed(1)} km²`} highlight />
        <Metric
          label="Agreement"
          value={`${comparison.agreement_pct.toFixed(0)}%`}
          highlight
        />
      </div>
      <p className="mt-3 text-xs text-white">
        K-means is unsupervised — spatial agreement with the rule-based TerraTrace map is the
        validation check (same approach as the GEE App).
      </p>
    </section>
  );
}

function Metric({
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
      className={`rounded-lg px-3 py-2 ${
        highlight ? "bg-accent/10" : "bg-black ring-1 ring-white/10"
      }`}
    >
      <p className="text-xs text-white">{label}</p>
      <p className="text-lg font-semibold text-white">{value}</p>
    </div>
  );
}
