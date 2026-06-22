"use client";

import React, { useMemo, useState, useEffect } from "react";
import LineChart from "./LineChart";
import BarChart from "./BarChart";
import PieChart from "./PieChart";
import AreaChart from "./AreaChart";
import { SummaryStatistics } from "@/types/database.types";
import { TrendingUp, BarChart2, PieChart as PieIcon, Activity } from "lucide-react";

interface ChartMapperProps {
  headers: string[];
  summaryStatistics: SummaryStatistics;
  rows: { row_index: number; row_data: Record<string, any> }[];
}

export default function ChartMapper({ headers, summaryStatistics, rows }: ChartMapperProps) {
  const isDateColumn = (col: string) => /date|time|timestamp|created_at/i.test(col);
  const isRevenueOrSalesColumn = (col: string) => /revenue|sales|amount|price|total/i.test(col);

  const numericCols = useMemo(() => {
    if (!summaryStatistics.numeric_metrics) return [];
    return Object.keys(summaryStatistics.numeric_metrics);
  }, [summaryStatistics]);

  const primaryNumericCol = useMemo(() => {
    return numericCols.find(isRevenueOrSalesColumn) || numericCols[0];
  }, [numericCols]);

  const categoricalCols = useMemo(() => {
    if (!summaryStatistics.categorical_distributions) return [];
    return Object.keys(summaryStatistics.categorical_distributions).filter(
      (col) => !isDateColumn(col) && !col.includes("id")
    );
  }, [summaryStatistics]);

  const primaryCategoricalCol = useMemo(() => {
    return categoricalCols[0];
  }, [categoricalCols]);

  // Dropdown state for dynamic mapping
  const [selectedNumeric, setSelectedNumeric] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  // Sync state with incoming props
  useEffect(() => {
    if (primaryNumericCol) {
      setSelectedNumeric(primaryNumericCol);
    }
  }, [primaryNumericCol]);

  useEffect(() => {
    if (primaryCategoricalCol) {
      setSelectedCategory(primaryCategoricalCol);
    }
  }, [primaryCategoricalCol]);

  // Aggregate numeric values by selected category on the client side
  const categoryChartData = useMemo(() => {
    if (!selectedCategory) return [];

    if (selectedNumeric) {
      const aggregates: Record<string, number> = {};
      rows.forEach((row) => {
        const catVal = String(row.row_data[selectedCategory] || "Unknown").trim();
        const numVal = parseFloat(row.row_data[selectedNumeric]);
        if (catVal && !isNaN(numVal)) {
          aggregates[catVal] = (aggregates[catVal] || 0) + numVal;
        }
      });

      return Object.entries(aggregates)
        .map(([name, value]) => ({
          name,
          label: name,
          value: parseFloat(value.toFixed(2)),
        }))
        .sort((a, b) => b.value - a.value);
    }

    const distribution = summaryStatistics.categorical_distributions[selectedCategory] || {};
    return Object.entries(distribution)
      .map(([name, count]) => ({
        name,
        label: name,
        value: count,
      }))
      .sort((a, b) => b.value - a.value);

  }, [rows, selectedCategory, selectedNumeric, summaryStatistics]);

  const trendData = useMemo(() => {
    const raw = summaryStatistics.trend_data || [];
    if (!selectedNumeric) return raw;
    return raw.map((item: any) => {
      // Robust mapping: copy 'value' key if it exists but selectedNumeric key is missing
      if (item && item.value !== undefined && item[selectedNumeric] === undefined) {
        return {
          ...item,
          [selectedNumeric]: item.value,
        };
      }
      return item;
    });
  }, [summaryStatistics, selectedNumeric]);

  const budgetSummary = summaryStatistics.budget_summary?.is_budget
    ? summaryStatistics.budget_summary
    : null;

  const budgetExpenseData = useMemo(() => {
    if (!budgetSummary?.expense_by_category) return [];
    return Object.entries(budgetSummary.expense_by_category)
      .map(([name, value]) => ({
        name,
        label: name,
        value,
      }))
      .sort((a, b) => b.value - a.value);
  }, [budgetSummary]);

  const budgetIncomeData = useMemo(() => {
    if (!budgetSummary?.income_by_category) return [];
    return Object.entries(budgetSummary.income_by_category)
      .map(([name, value]) => ({
        name,
        label: name,
        value,
      }))
      .sort((a, b) => b.value - a.value);
  }, [budgetSummary]);

  const hasTimeline = trendData.length > 0;
  const hasCategories = categoryChartData.length > 0;

  if (!hasTimeline && !hasCategories && !budgetSummary) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-slate-800/40 rounded-3xl bg-[#0f1524]/40 text-slate-400">
        <Activity className="w-12 h-12 text-indigo-500/50 mb-4 animate-pulse" />
        <h3 className="text-sm font-bold text-slate-300">No Chartable Data Found</h3>
        <p className="text-[10px] text-slate-500 max-w-sm mt-1">
          To display visualizations, your CSV must contain at least one date or numeric column, or categorical classes.
        </p>
      </div>
    );
  }

  const numericLabel = selectedNumeric 
    ? selectedNumeric.replace(/_/g, " ").toUpperCase() 
    : "FREQUENCY";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">Visual Analytics</h2>
          <p className="text-xs text-slate-400">
            Automatically mapped metrics for column:{" "}
            <span className="text-indigo-400 font-mono">
              {selectedNumeric || "frequency counts"}
            </span>
          </p>
        </div>

        {/* Dropdown Selectors */}
        <div className="flex flex-wrap gap-4 items-center bg-[#0d1323]/60 border border-slate-800/80 px-4 py-2.5 rounded-2xl backdrop-blur-md shadow-lg">
          {numericCols.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider text-slate-400">Metric:</span>
              <select
                value={selectedNumeric}
                onChange={(e) => setSelectedNumeric(e.target.value)}
                className="bg-[#060a13] border border-slate-800 hover:border-slate-700 focus:border-indigo-500 rounded-lg px-2.5 py-1 text-xs text-slate-200 outline-none cursor-pointer font-medium"
              >
                {numericCols.map((col) => (
                  <option key={col} value={col}>
                    {col.replace(/_/g, " ").toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          )}

          {categoricalCols.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider text-slate-400">Dimension:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-[#060a13] border border-slate-800 hover:border-slate-700 focus:border-indigo-500 rounded-lg px-2.5 py-1 text-xs text-slate-200 outline-none cursor-pointer font-medium"
              >
                {categoricalCols.map((col) => (
                  <option key={col} value={col}>
                    {col.replace(/_/g, " ").toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {budgetSummary && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-dark border border-emerald-500/20 rounded-2xl p-5 shadow-xl">
              <p className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Income</p>
              <h3 className="text-2xl font-extrabold text-white mt-2">
                {budgetSummary.total_income.toLocaleString()}
              </h3>
              <p className="text-[10px] text-slate-500 mt-1">
                {budgetSummary.transaction_counts.income} income rows
              </p>
            </div>

            <div className="glass-dark border border-rose-500/20 rounded-2xl p-5 shadow-xl">
              <p className="text-[10px] uppercase font-bold text-rose-400 tracking-wider">Expenses</p>
              <h3 className="text-2xl font-extrabold text-white mt-2">
                {budgetSummary.total_expenses.toLocaleString()}
              </h3>
              <p className="text-[10px] text-slate-500 mt-1">
                {budgetSummary.transaction_counts.expense} expense rows
              </p>
            </div>

            <div className="glass-dark border border-indigo-500/20 rounded-2xl p-5 shadow-xl">
              <p className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">Net Savings</p>
              <h3 className={`text-2xl font-extrabold mt-2 ${budgetSummary.net_savings >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {budgetSummary.net_savings.toLocaleString()}
              </h3>
              <p className="text-[10px] text-slate-500 mt-1">
                Income minus expenses
              </p>
            </div>
          </div>

          {(budgetExpenseData.length > 0 || budgetIncomeData.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {budgetExpenseData.length > 0 && (
                <div className="glass-dark border border-slate-800/60 rounded-3xl p-6 shadow-xl space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                    <div className="flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-rose-400" />
                      <span className="font-semibold text-sm text-slate-200">Expense Categories</span>
                    </div>
                    <span className="text-[10px] bg-rose-500/10 text-rose-400 font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Budget
                    </span>
                  </div>
                  <div className="h-[350px]">
                    <BarChart data={budgetExpenseData} yAxisLabel="EXPENSES" />
                  </div>
                </div>
              )}

              {budgetIncomeData.length > 0 && (
                <div className="glass-dark border border-slate-800/60 rounded-3xl p-6 shadow-xl space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                    <div className="flex items-center gap-2">
                      <PieIcon className="w-4 h-4 text-emerald-400" />
                      <span className="font-semibold text-sm text-slate-200">Income Sources</span>
                    </div>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Budget
                    </span>
                  </div>
                  <div className="h-[350px]">
                    <PieChart data={budgetIncomeData} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {(hasTimeline || hasCategories) && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timeline Charts (Line & Area) */}
        {hasTimeline && (
          <>
            <div className="glass-dark border border-slate-800/60 rounded-3xl p-6 shadow-xl space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-400" />
                  <span className="font-semibold text-sm text-slate-200">Timeline Performance Trend</span>
                </div>
                <span className="text-[10px] bg-indigo-500/10 text-indigo-400 font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Line Chart
                </span>
              </div>
              <div className="h-[350px]">
                <LineChart
                  data={trendData}
                  xAxisKey="label"
                  yAxisKeys={[selectedNumeric]}
                />
              </div>
            </div>

            <div className="glass-dark border border-slate-800/60 rounded-3xl p-6 shadow-xl space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-400" />
                  <span className="font-semibold text-sm text-slate-200">Cumulative Tracking Scale</span>
                </div>
                <span className="text-[10px] bg-indigo-500/10 text-indigo-400 font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Area Chart
                </span>
              </div>
              <div className="h-[350px]">
                <AreaChart
                  data={trendData}
                  xAxisKey="label"
                  yAxisKey={selectedNumeric}
                />
              </div>
            </div>
          </>
        )}

        {/* Categorical Charts (Bar & Pie) */}
        {hasCategories && (
          <>
            <div className="glass-dark border border-slate-800/60 rounded-3xl p-6 shadow-xl space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-violet-400" />
                  <span className="font-semibold text-sm text-slate-200">
                    Breakdown ({selectedCategory.replace(/_/g, " ").toUpperCase()})
                  </span>
                </div>
                <span className="text-[10px] bg-violet-500/10 text-violet-400 font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Bar Chart
                </span>
              </div>
              <div className="h-[350px]">
                <BarChart
                  data={categoryChartData}
                  yAxisLabel={numericLabel}
                />
              </div>
            </div>

            <div className="glass-dark border border-slate-800/60 rounded-3xl p-6 shadow-xl space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                <div className="flex items-center gap-2">
                  <PieIcon className="w-4 h-4 text-violet-400" />
                  <span className="font-semibold text-sm text-slate-200">
                    Breakdown Distribution ({selectedCategory.replace(/_/g, " ").toUpperCase()})
                  </span>
                </div>
                <span className="text-[10px] bg-violet-500/10 text-violet-400 font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Pie Chart
                </span>
              </div>
              <div className="h-[350px]">
                <PieChart
                  data={categoryChartData}
                />
              </div>
            </div>
          </>
        )}
      </div>
      )}
    </div>
  );
}
