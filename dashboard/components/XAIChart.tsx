"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { FeatureImportance } from "@/lib/types";

interface XAIChartProps {
  data: FeatureImportance[];
  method: string;
}

export default function XAIChart({ data, method }: XAIChartProps) {
  const sorted = [...data].sort(
    (a, b) => b.importance_pct - a.importance_pct
  );

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3">
        <h2 className="text-sm font-medium uppercase tracking-wider text-gray-400">
          Explainable AI
        </h2>
        <p className="mt-1 text-xs text-gray-500">{method}</p>
      </div>
      <div className="min-h-[280px] flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={sorted}
            layout="vertical"
            margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#2d3a4f" />
            <XAxis
              type="number"
              domain={[0, "auto"]}
              tick={{ fill: "#9ca3af", fontSize: 11 }}
              unit="%"
            />
            <YAxis
              type="category"
              dataKey="label"
              width={130}
              tick={{ fill: "#d1d5db", fontSize: 10 }}
            />
            <Tooltip
              contentStyle={{
                background: "#1a2332",
                border: "1px solid #2d3a4f",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value: number) => [`${value.toFixed(1)}%`, "Importance"]}
            />
            <Bar dataKey="importance_pct" fill="#0984e3" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-gray-500">
        Higher bars indicate stronger influence on the Random Forest classifier
        decision boundaries. Water and vegetation delta indices dominate flood
        change signatures.
      </p>
    </div>
  );
}
