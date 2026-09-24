"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  ChangeStats,
  LimeExplanations,
  LULCTransition,
  MlComparison,
  PixelInspection,
} from "@/lib/types";

const DEFAULT_RULES = [
  { text: "MNDWI value increased", icon: "📈", ok: true },
  { text: "NDWI value increased", icon: "💧", ok: true },
  { text: "Pre-event = non-water", icon: "⬜", ok: true },
  { text: "Post-event = water", icon: "🔵", ok: true },
  { text: "Permanent water excluded (JRC ≥50%)", icon: "🗺️", ok: true },
  { text: "Snow / cloud excluded (QA mask)", icon: "❄️", ok: true },
];

const TRANSITION_COLORS = ["#3b82f6", "#60a5fa", "#93c5fd", "#a78bfa", "#c4b5fd"];

interface MapInsightsSectionProps {
  transitions: LULCTransition[];
  studyAreaKm2: number;
  totalChangeKm2: number;
  lime: LimeExplanations | null;
  inspection: PixelInspection | null;
  mlComparison: MlComparison;
  stats: ChangeStats;
  limeAccuracy?: number;
}

function MetricCard({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <article className="metric-card flex h-full flex-col">
      <div className="metric-card-header">
        <h2 className="metric-card-title">{title}</h2>
        {badge && <span className="metric-pill">{badge}</span>}
      </div>
      {children}
    </article>
  );
}

function HeroMetric({ value, label }: { value: string; label: string }) {
  return (
    <div className="mb-5">
      <p className="metric-hero">{value}</p>
      <p className="metric-hero-label">{label}</p>
    </div>
  );
}

function MetricRow({
  left,
  right,
  sub,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="metric-row">
      <div>
        <span className="text-sm text-white">{left}</span>
        {sub && <p className="mt-0.5 text-xs text-white/50">{sub}</p>}
      </div>
      <span className="text-sm font-semibold text-white">{right}</span>
    </div>
  );
}

function HorizontalBar({
  label,
  value,
  max,
  color,
  suffix = "",
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  suffix?: string;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="mb-3">
      <div className="mb-1 flex justify-between text-xs text-white/70">
        <span>{label}</span>
        <span className="font-medium text-white">
          {value}
          {suffix}
        </span>
      </div>
      <div className="metric-bar-track">
        <div
          className="metric-bar-fill h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: color.startsWith("linear-gradient") ? color : color,
          }}
        />
      </div>
    </div>
  );
}

export default function MapInsightsSection({
  transitions,
  studyAreaKm2,
  totalChangeKm2,
  lime,
  inspection,
  mlComparison,
  stats,
  limeAccuracy,
}: MapInsightsSectionProps) {
  const { summary, classes } = stats;
  const changeClasses = classes.filter((c) => c.id !== 0);
  const isKmeans = summary.kappa === 0 && summary.oob_error === 0;

  const chartData = transitions.map((t, i) => {
    const pct =
      t.pct_aoi ?? (studyAreaKm2 > 0 ? (t.area_km2 / studyAreaKm2) * 100 : 0);
    return {
      label: `${t.pre.split(" ")[0]}→${t.post.split(" ")[0]}`,
      km2: t.area_km2,
      pct,
      fill: TRANSITION_COLORS[i % TRANSITION_COLORS.length],
    };
  });

  const avgTransition =
    chartData.length > 0
      ? chartData.reduce((s, d) => s + d.km2, 0) / chartData.length
      : 0;

  const topDelta =
    lime?.global
      .filter((f) => f.feature.startsWith("Delta_"))
      .sort((a, b) => (b.importance_pct ?? 0) - (a.importance_pct ?? 0))
      .slice(0, 2) ?? [];

  const rules = inspection?.rules ?? DEFAULT_RULES.map((r) => ({ ...r, ok: r.ok }));
  const classificationLabel = inspection
    ? inspection.classification
    : "NEW INUNDATION (sample)";

  const maxClassArea = Math.max(...changeClasses.map((c) => c.area_km2), 1);
  const maxMl = Math.max(
    mlComparison.rule_based_km2,
    mlComparison.ml_km2,
    mlComparison.overlap_km2,
    1
  );

  return (
    <section className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* LULC Transformation — vertical bar chart card */}
      <MetricCard title="LULC Transformation Panel" badge="Transitions">
        <HeroMetric
          value={`${totalChangeKm2.toFixed(2)} km²`}
          label={`Total LULC changed · AOI ${studyAreaKm2.toFixed(1)} km²`}
        />
        <div className="mb-4 h-[160px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                unit=" km²"
              />
              <Tooltip
                contentStyle={{
                  background: "#000000",
                  border: "none",
                  borderRadius: 12,
                  fontSize: 12,
                  color: "#fff",
                }}
                formatter={(v: number) => [`${v.toFixed(2)} km²`, "Area"]}
              />
              <ReferenceLine
                y={avgTransition}
                stroke="rgba(255,255,255,0.25)"
                strokeDasharray="4 4"
                label={{
                  value: `Avg ${avgTransition.toFixed(1)}`,
                  fill: "rgba(255,255,255,0.5)",
                  fontSize: 10,
                  position: "insideTopRight",
                }}
              />
              <Bar dataKey="km2" radius={[6, 6, 0, 0]} maxBarSize={40}>
                {chartData.map((entry) => (
                  <Cell key={entry.label} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="metric-list">
          {transitions.map((t) => {
            const pct =
              t.pct_aoi ??
              (studyAreaKm2 > 0 ? (t.area_km2 / studyAreaKm2) * 100 : 0);
            return (
              <MetricRow
                key={`${t.pre}-${t.post}`}
                left={
                  <>
                    {t.pre} → {t.post} {t.emoji}
                  </>
                }
                right={`${t.area_km2.toFixed(2)} km² · ${pct.toFixed(2)}%`}
              />
            );
          })}
        </div>
      </MetricCard>

      {/* Overview & change by class */}
      <MetricCard title="Overview" badge="Study area">
        <HeroMetric
          value={`${summary.study_area_km2} km²`}
          label={`Changed ${summary.changed_area_km2} km² · ${summary.changed_pct}% of AOI`}
        />
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="metric-stat-tile">
            <p className="text-xs text-white/60">Changed area</p>
            <p className="text-xl font-bold text-white">{summary.changed_area_km2} km²</p>
          </div>
          <div className="metric-stat-tile">
            <p className="text-xs text-white/60">
              {isKmeans ? "ML agreement" : "Model accuracy"}
            </p>
            <p className="text-xl font-bold text-white">
              {isKmeans && summary.ml_agreement_pct
                ? `${summary.ml_agreement_pct.toFixed(0)}%`
                : `${(summary.model_accuracy * 100).toFixed(0)}%`}
            </p>
          </div>
        </div>
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-white/60">
          Change by class
        </p>
        {changeClasses.map((cls) => (
          <HorizontalBar
            key={cls.id}
            label={cls.name}
            value={cls.area_km2}
            max={maxClassArea}
            color={cls.color}
            suffix={` km² (${cls.pct}%)`}
          />
        ))}
        <div className="metric-list mt-4">
          {changeClasses.map((cls) => (
            <MetricRow
              key={cls.id}
              left={
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: cls.color }}
                  />
                  {cls.name}
                </span>
              }
              right={`${cls.area_km2} km² (${cls.pct}%)`}
            />
          ))}
        </div>
        <div className="metric-stat-tile mt-4">
          <p className="text-xs text-white/60">Model confidence</p>
          <p className="mt-1 text-sm text-white/80">
            {isKmeans
              ? "K-means is unsupervised — agreement with rule-based map is the validation check."
              : `Kappa ${summary.kappa.toFixed(2)} · OOB ${(summary.oob_error * 100).toFixed(1)}%`}
          </p>
          {limeAccuracy !== undefined && (
            <div className="mt-2 flex justify-between border-t border-white/10 pt-2 text-sm">
              <span className="text-white/60">LIME model acc.</span>
              <span className="font-semibold text-white">
                {(limeAccuracy * 100).toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      </MetricCard>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Insight & XAI */}
      <MetricCard title="Insight & Explainable AI" badge="Pixel rules">
        <HeroMetric
          value={classificationLabel}
          label={
            inspection
              ? `Pixel ${inspection.lat.toFixed(4)}, ${inspection.lng.toFixed(4)}`
              : "Click the map to inspect a pixel — or see default inundation rules"
          }
        />
        <div className="metric-list mb-4">
          {rules.map((rule) => (
            <div key={rule.text} className="metric-row">
              <span className="flex items-center gap-2 text-sm text-white">
                <span>{rule.ok ? "✅" : "❌"}</span>
                <span>{rule.icon}</span>
                {rule.text}
              </span>
            </div>
          ))}
        </div>
        {topDelta.length > 0 && (
          <div className="mb-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-white/60">
              Delta feature influence (LIME)
            </p>
            {topDelta.map((f) => (
              <HorizontalBar
                key={f.feature}
                label={f.label}
                value={f.importance_pct ?? 0}
                max={100}
                color="linear-gradient(90deg, #6366f1, #a855f7)"
                suffix="%"
              />
            ))}
          </div>
        )}
        <div className="rounded-2xl px-4 py-3 text-center text-sm font-semibold text-white ring-1 ring-white/10">
          → Final classification: {classificationLabel}
        </div>
      </MetricCard>

      {/* Rule-based vs ML */}
      <MetricCard title="Rule-based vs ML (K-means)" badge="Validation">
        <HeroMetric
          value={`${mlComparison.agreement_pct.toFixed(0)}%`}
          label="Spatial agreement · rule-based vs K-means change maps"
        />
        <div className="mb-4 space-y-1">
          <HorizontalBar
            label="Rule-based change"
            value={mlComparison.rule_based_km2}
            max={maxMl}
            color="linear-gradient(90deg, #0984e3, #38bdf8)"
            suffix=" km²"
          />
          <HorizontalBar
            label="ML change area"
            value={mlComparison.ml_km2}
            max={maxMl}
            color="linear-gradient(90deg, #7c3aed, #a78bfa)"
            suffix=" km²"
          />
          <HorizontalBar
            label="Overlap (both)"
            value={mlComparison.overlap_km2}
            max={maxMl}
            color="linear-gradient(90deg, #059669, #34d399)"
            suffix=" km²"
          />
        </div>
        <div className="metric-list">
          <MetricRow
            left="Rule-based change"
            right={`${mlComparison.rule_based_km2.toFixed(1)} km²`}
          />
          <MetricRow
            left="ML change area"
            right={`${mlComparison.ml_km2.toFixed(1)} km²`}
          />
          <MetricRow
            left="Overlap (both)"
            right={`${mlComparison.overlap_km2.toFixed(1)} km²`}
          />
          <MetricRow
            left="Agreement"
            right={`${mlComparison.agreement_pct.toFixed(0)}%`}
          />
        </div>
        <p className="mt-4 text-xs text-white/60">
          K-means is unsupervised — spatial agreement with the rule-based TerraTrace map is the
          validation check (same approach as the GEE App).
        </p>
      </MetricCard>
      </div>
    </section>
  );
}
