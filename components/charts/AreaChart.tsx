"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceDot,
  ReferenceArea,
} from "recharts";
import { X, Info } from "lucide-react";

interface AreaChartProps {
  data: any[];
  xAxisKey: string;
  yAxisKey: string;
  title?: string;
}

export default function AreaChart({ data, xAxisKey, yAxisKey, title }: AreaChartProps) {
  const [firstPoint, setFirstPoint] = useState<{ label: string; value: number } | null>(null);
  const [secondPoint, setSecondPoint] = useState<{ label: string; value: number } | null>(null);

  // Drag selection states
  const [refAreaLeft, setRefAreaLeft] = useState<string | null>(null);
  const [refAreaRight, setRefAreaRight] = useState<string | null>(null);

  // Reset selected points when dataset or metric changes
  useEffect(() => {
    setFirstPoint(null);
    setSecondPoint(null);
    setRefAreaLeft(null);
    setRefAreaRight(null);
  }, [data, yAxisKey]);

  const percentageChange = useMemo(() => {
    if (!firstPoint || !secondPoint) return null;
    if (firstPoint.value === 0) return 0;
    const diff = secondPoint.value - firstPoint.value;
    const pct = (diff / firstPoint.value) * 100;
    return parseFloat(pct.toFixed(1));
  }, [firstPoint, secondPoint]);

  const handleMouseDown = (e: any) => {
    if (e && e.activeLabel) {
      setRefAreaLeft(e.activeLabel);
    }
  };

  const handleMouseMove = (e: any) => {
    if (e && refAreaLeft && e.activeLabel) {
      setRefAreaRight(e.activeLabel);
    }
  };

  useEffect(() => {
    if (!refAreaLeft) return;

    const handleGlobalMouseUp = () => {
      if (refAreaRight && refAreaLeft !== refAreaRight) {
        // Drag range selection completed
        const leftIndex = data.findIndex((d) => d[xAxisKey] === refAreaLeft);
        const rightIndex = data.findIndex((d) => d[xAxisKey] === refAreaRight);
        
        if (leftIndex !== -1 && rightIndex !== -1) {
          const [startIndex, endIndex] = leftIndex <= rightIndex ? [leftIndex, rightIndex] : [rightIndex, leftIndex];
          const startPoint = data[startIndex];
          const endPoint = data[endIndex];
          setFirstPoint({ label: startPoint[xAxisKey], value: startPoint[yAxisKey] });
          setSecondPoint({ label: endPoint[xAxisKey], value: endPoint[yAxisKey] });
        }
      } else {
        // Fallback: simple point clicking selection
        const clickedItem = data.find((d) => d[xAxisKey] === refAreaLeft);
        if (clickedItem) {
          const clickedPoint = { label: clickedItem[xAxisKey], value: clickedItem[yAxisKey] };
          
          if (!firstPoint) {
            setFirstPoint(clickedPoint);
          } else if (!secondPoint) {
            if (clickedPoint.label === firstPoint.label) {
              setFirstPoint(null);
            } else {
              const firstIdx = data.findIndex((d) => d[xAxisKey] === firstPoint.label);
              const clickedIdx = data.findIndex((d) => d[xAxisKey] === clickedPoint.label);
              if (firstIdx !== -1 && clickedIdx !== -1) {
                const [startIdx, endIdx] = firstIdx <= clickedIdx ? [firstIdx, clickedIdx] : [clickedIdx, firstIdx];
                setFirstPoint({ label: data[startIdx][xAxisKey], value: data[startIdx][yAxisKey] });
                setSecondPoint({ label: data[endIdx][xAxisKey], value: data[endIdx][yAxisKey] });
              }
            }
          } else {
            setFirstPoint(clickedPoint);
            setSecondPoint(null);
          }
        }
      }

      setRefAreaLeft(null);
      setRefAreaRight(null);
    };

    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [refAreaLeft, refAreaRight, data, xAxisKey, yAxisKey, firstPoint, secondPoint]);

  if (!data || data.length === 0) {
    return (
      <div className="flex h-[350px] items-center justify-center rounded-2xl border border-slate-800/40 bg-slate-900/10 dark:bg-slate-900/40 text-slate-400 text-xs">
        No timeline growth data available.
      </div>
    );
  }

  const cleanName = yAxisKey.replace(/_/g, " ").toUpperCase();

  return (
    <div className="w-full h-full space-y-4">
      {title && <h3 className="text-xs font-bold text-slate-400 tracking-wide uppercase">{title}</h3>}
      
      {/* Interactive Delta Overlay */}
      <div className="min-h-[42px] flex items-center">
        {!firstPoint && !secondPoint ? (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 italic bg-slate-950/20 border border-slate-900/50 rounded-xl px-3 py-1.5 w-full">
            <Info className="w-3.5 h-3.5 text-indigo-400/80 shrink-0" />
            <span>Interactive Tool: Click & drag across a range, or click two points to measure percentage gain or loss.</span>
          </div>
        ) : firstPoint && !secondPoint ? (
          <div className="flex items-center justify-between text-[11px] text-indigo-400 bg-indigo-500/5 border border-indigo-500/10 rounded-xl px-3 py-1.5 w-full">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-ping" />
              <span>Selected start point: <strong>{firstPoint.label}</strong> ({firstPoint.value.toLocaleString()}). Click or drag to second point...</span>
            </div>
            <button onClick={() => setFirstPoint(null)} className="p-0.5 hover:bg-slate-850 rounded text-slate-400 hover:text-slate-200">
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : firstPoint && secondPoint && percentageChange !== null ? (
          <div className="flex items-center justify-between text-[11px] bg-slate-950/40 border border-slate-800/80 rounded-xl px-3.5 py-2 w-full animate-fade-in">
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wide">Delta Performance Range:</span>
              <p className="text-slate-350">
                <strong>{firstPoint.label}</strong> ({firstPoint.value.toLocaleString()}) &rarr; <strong>{secondPoint.label}</strong> ({secondPoint.value.toLocaleString()})
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase border ${
                percentageChange >= 0 
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                  : "bg-rose-500/10 text-rose-400 border-rose-500/20"
              }`}>
                {percentageChange >= 0 ? "+" : ""}{percentageChange}% {percentageChange >= 0 ? "Gain" : "Loss"}
              </span>
              <button 
                onClick={() => {
                  setFirstPoint(null);
                  setSecondPoint(null);
                }} 
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 cursor-pointer"
                title="Clear selection"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="w-full h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsAreaChart
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            className="cursor-pointer select-none"
          >
            <defs>
              <linearGradient id="colorValueArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.08)" />
            <XAxis
              dataKey={xAxisKey}
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
                cleanName,
              ]}
            />
            <Legend
              verticalAlign="top"
              height={30}
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: "11px", color: "rgb(148, 163, 184)" }}
            />
            <Area
              type="monotone"
              dataKey={yAxisKey}
              name={cleanName}
              stroke="#6366f1"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorValueArea)"
            />

            {/* Interactive Reference Dots */}
            {firstPoint && (
              <ReferenceDot
                x={firstPoint.label}
                y={firstPoint.value}
                r={5}
                fill="#8b5cf6"
                stroke="#ffffff"
                strokeWidth={2}
              />
            )}
            {secondPoint && (
              <ReferenceDot
                x={secondPoint.label}
                y={secondPoint.value}
                r={5}
                fill="#ec4899"
                stroke="#ffffff"
                strokeWidth={2}
              />
            )}

            {/* Drag Highlight Selection Area */}
            {refAreaLeft && refAreaRight && (
              <ReferenceArea
                x1={refAreaLeft}
                x2={refAreaRight}
                fill="#6366f1"
                fillOpacity={0.15}
              />
            )}
          </RechartsAreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
