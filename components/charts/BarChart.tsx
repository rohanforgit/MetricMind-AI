"use client";

import React from "react";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface BarChartProps {
  data: { label: string; value: number }[];
  title?: string;
  yAxisLabel?: string;
}

export default function BarChart({ data, title, yAxisLabel }: BarChartProps) {
  const colors = ["#6366f1", "#8b5cf6", "#3b82f6", "#06b6d4", "#10b981", "#f59e0b"];

  if (!data || data.length === 0) {
    return (
      <div className="flex h-[350px] items-center justify-center rounded-2xl border border-slate-800/40 bg-slate-900/10 dark:bg-slate-900/40 text-slate-400 text-xs">
        No comparative data available.
      </div>
    );
  }

  return (
    <div className="w-full h-full space-y-2">
      {title && <h3 className="text-xs font-bold text-slate-400 tracking-wide uppercase">{title}</h3>}
      <div className="w-full h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsBarChart
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.08)" />
            <XAxis
              dataKey="label"
              stroke="rgb(100, 116, 139)"
              tick={{ fill: "rgba(255, 255, 255, 0.6)", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              dy={10}
            />
            <YAxis
              stroke="rgb(100, 116, 139)"
              tick={{ fill: "rgba(255, 255, 255, 0.6)", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              dx={-10}
              tickFormatter={(val) => (typeof val === "number" ? val.toLocaleString() : val)}
            />
            <Tooltip
              cursor={false}
              contentStyle={{
                backgroundColor: "rgba(15, 23, 42, 0.8)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "12px",
                color: "#f8fafc",
                fontSize: "12px",
              }}
              labelStyle={{
                color: "#cbd5e1",
                fontWeight: "600",
                marginBottom: "4px",
              }}
              formatter={(value: any) => [
                typeof value === "number" ? value.toLocaleString() : value,
                yAxisLabel || "Value",
              ]}
            />
            <Bar
              dataKey="value"
              name={yAxisLabel || "Value"}
              radius={[6, 6, 0, 0]}
              maxBarSize={45}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
