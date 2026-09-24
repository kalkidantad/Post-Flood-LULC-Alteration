"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { LimeFeatureWeight, LimeLocalExplanation } from "@/lib/types";

interface LimeGlobalChartProps {
  globalData: LimeFeatureWeight[];
  method?: string;
  hideHeader?: boolean;
}

interface LimeLocalChartProps {
  localSamples: LimeLocalExplanation[];
  hideHeader?: boolean;
}

interface LimeChartProps {
  globalData: LimeFeatureWeight[];
  localSamples: LimeLocalExplanation[];
  method: string;
}

export function LimeGlobalChart({
  globalData,
  method,
  hideHeader = false,
}: LimeGlobalChartProps) {
  const sorted = [...globalData]
    .filter((d) => (d.importance_pct ?? 0) > 0)
    .sort((a, b) => (b.importance_pct ?? 0) - (a.importance_pct ?? 0))
    .slice(0, 12);

  return (
    <div>
      {!hideHeader && (
        <>
          <h2 className="text-sm font-medium uppercase tracking-wider text-white">
            LIME — Global feature influence
          </h2>
          {method && <p className="mt-1 text-xs text-white">{method}</p>}
        </>
      )}
      <div className={hideHeader ? "h-[320px]" : "mt-3 min-h-[300px]"}>
        <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={sorted}
              layout="vertical"
              margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3a4f" />
              <XAxis
                type="number"
                tick={{ fill: "#9ca3af", fontSize: 11 }}
                unit="%"
              />
              <YAxis
                type="category"
                dataKey="label"
                width={140}
                tick={{ fill: "#d1d5db", fontSize: 10 }}
              />
              <Tooltip
                contentStyle={{
                  background: "#000000",
                  border: "1px solid #2d3a4f",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value: number) => [`${value.toFixed(1)}%`, "Mean |LIME weight|"]}
              />
              <Bar dataKey="importance_pct" radius={[0, 4, 4, 0]}>
                {sorted.map((_, i) => (
                  <Cell key={i} fill="#6c5ce7" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
    </div>
  );
}

export function LimeLocalChart({
  localSamples,
  hideHeader = false,
}: LimeLocalChartProps) {
  const [selectedId, setSelectedId] = useState(localSamples[0]?.id ?? "");
  const selected = localSamples.find((s) => s.id === selectedId);

  return (
    <div>
      {!hideHeader && (
        <>
          <h2 className="text-sm font-medium uppercase tracking-wider text-white">
            LIME — Local explanation
          </h2>
          <p className="mt-1 text-xs text-white">
            Why did the model classify this pixel?
          </p>
        </>
      )}

      {localSamples.length > 0 ? (
          <>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="card-inner mt-3 w-full px-3 py-2 text-sm"
            >
              {localSamples.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.class_name} @ {s.lat.toFixed(3)}, {s.lng.toFixed(3)}
                </option>
              ))}
            </select>

            {selected && (
              <div className={hideHeader ? "mt-3 h-[280px]" : "mt-3 min-h-[260px]"}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={selected.features}
                    layout="vertical"
                    margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#2d3a4f" />
                    <XAxis
                      type="number"
                      tick={{ fill: "#9ca3af", fontSize: 11 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={140}
                      tick={{ fill: "#d1d5db", fontSize: 10 }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#000000",
                        border: "1px solid #2d3a4f",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(value: number) => [value.toFixed(3), "LIME weight"]}
                    />
                    <Bar dataKey="weight" radius={[0, 4, 4, 0]}>
                      {selected.features.map((f, i) => (
                        <Cell
                          key={i}
                          fill={(f.weight ?? 0) >= 0 ? "#0984e3" : "#e17055"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <p className="mt-2 text-xs text-white">
                  Blue = pushes toward <strong>{selected.class_name}</strong>; red = pushes away.
                </p>
              </div>
            )}
          </>
        ) : (
          <p className="mt-4 text-sm text-white">
            No local LIME samples yet. Run{" "}
            <code className="text-accent">python scripts/run_lime_xai.py</code>.
          </p>
        )}
    </div>
  );
}

export default function LimeChart({
  globalData,
  localSamples,
  method,
}: LimeChartProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <LimeGlobalChart globalData={globalData} method={method} />
      <LimeLocalChart localSamples={localSamples} />
    </div>
  );
}
