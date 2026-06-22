"use client";

import React from "react";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface PieChartProps {
  data: { name: string; value: number }[];
  title?: string;
}

export default function PieChart({ data, title }: PieChartProps) {
  const colors = ["#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"];

  if (!data || data.length === 0) {
    return (
      <div className="flex h-[350px] items-center justify-center rounded-2xl border border-slate-800/40 bg-slate-900/10 dark:bg-slate-900/40 text-slate-400 text-xs">
        No distribution data available.
      </div>
    );
  }

  // Capped at max 6 categories for visual cleanliness
  const displayData = data.slice(0, 6);

  if (data.length > 6) {
    const otherSum = data.slice(6).reduce((sum, d) => sum + d.value, 0);
    displayData.push({ name: "Other", value: parseFloat(otherSum.toFixed(2)) });
  }

  return (
    <div className="w-full h-full space-y-2">
      {title && <h3 className="text-xs font-bold text-slate-400 tracking-wide uppercase">{title}</h3>}
      <div className="w-full h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPieChart margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(15, 23, 42, 0.8)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "12px",
                color: "#f8fafc",
                fontSize: "12px",
              }}
              formatter={(value: any) => [
                typeof value === "number" ? value.toLocaleString() : value,
                "Volume",
              ]}
            />
            <Pie
              data={displayData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={95}
              paddingAngle={4}
              dataKey="value"
              label={({ name, percent }) => `${name} (${percent ? (percent * 100).toFixed(0) : 0}%)`}
              labelLine={false}
            >
              {displayData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: "11px", color: "rgb(148, 163, 184)" }}
            />
          </RechartsPieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
