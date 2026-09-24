"use client";

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
import ChartSlideshow from "./ChartSlideshow";
import type { DashboardCharts } from "@/lib/types";

interface AreaChartsPanelProps {
  charts: DashboardCharts;
}

function AreaBarChart({
  data,
}: {
  data: { label: string; km2: number; color?: string }[];
}) {
  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
          <XAxis type="number" tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 10 }} unit=" km²" />
          <YAxis
            type="category"
            dataKey="label"
            width={100}
            tick={{ fill: "rgba(255,255,255,0.8)", fontSize: 9 }}
          />
          <Tooltip
            contentStyle={{
              background: "#000000",
              border: "none",
              borderRadius: 12,
              fontSize: 11,
              color: "#fff",
            }}
            formatter={(v: number) => [`${v.toFixed(2)} km²`, "Area"]}
          />
          <Bar dataKey="km2" radius={[0, 6, 6, 0]}>
            {data.map((entry) => (
              <Cell key={entry.label} fill={entry.color ?? "#0984e3"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function AreaChartsPanel({ charts }: AreaChartsPanelProps) {
  const slides = [
    {
      label: "Transitions",
      content: <AreaBarChart data={charts.transitions} />,
    },
    {
      label: "Flood risk",
      content: <AreaBarChart data={charts.flood_risk_by_prior} />,
    },
    {
      label: "Rule vs ML",
      content: <AreaBarChart data={charts.ml_comparison} />,
    },
  ];

  return <ChartSlideshow slides={slides} />;
}
