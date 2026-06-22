"use client";

import React, { use, useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Database,
  FileSpreadsheet,
  LineChart as LineChartIcon,
  Brain,
  Search,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  Award,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  MapPin,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import ChartMapper from "@/components/charts/ChartMapper";
import { Dataset, DatasetRow, AIInsightsContent } from "@/types/database.types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function DatasetDetailPage({ params }: PageProps) {
  const { id: datasetId } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Data states
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [sampleRows, setSampleRows] = useState<DatasetRow[]>([]);
  const [insights, setInsights] = useState<AIInsightsContent | null>(null);

  // Interface states
  const [activeTab, setActiveTab] = useState<"viewer" | "analytics" | "insights">("viewer");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch Dataset Profile and Rows
  const fetchDatasetDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/datasets/${datasetId}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load dataset details.");
      }

      setDataset(json.dataset);
      setSampleRows(json.sample_rows || []);
    } catch (err: any) {
      console.error("Error loading dataset:", err);
      setError(err.message || "Could not retrieve dataset details. Verify ownership and try again.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Cached Insights
  const fetchCachedInsights = async () => {
    try {
      const res = await fetch(`/api/datasets/${datasetId}/insights`);
      const json = await res.json();
      if (res.ok && json.success && json.insights) {
        setInsights(json.insights.insights_content);
      }
    } catch (err) {
      console.warn("Cached insights unavailable or offline:", err);
    }
  };

  useEffect(() => {
    if (user && datasetId) {
      fetchDatasetDetails();
      fetchCachedInsights();
    }
  }, [user, datasetId]);

  // Generate / Regenerate AI insights
  const handleGenerateInsights = async () => {
    setInsightsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/datasets/${datasetId}/insights`, {
        method: "POST",
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to compile AI insights.");
      }

      setInsights(json.insights.insights_content);
    } catch (err: any) {
      console.error("AI Insight compile error:", err);
      setError(err.message || "Failed to request Gemini AI generation. Falling back to pre-calculated views.");
    } finally {
      setInsightsLoading(false);
    }
  };

  // Filter rows on client side
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return sampleRows;
    return sampleRows.filter((row) =>
      Object.values(row.row_data).some((val) =>
        String(val || "").toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  }, [sampleRows, searchQuery]);

  // Format Helper
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (authLoading || (loading && !dataset)) {
    return (
      <div className="min-h-screen bg-[#060a13] text-slate-100 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <span className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-semibold tracking-wide">Retrieving asset data...</p>
        </div>
      </div>
    );
  }

  if (error && !dataset) {
    return (
      <div className="min-h-screen bg-[#060a13] text-slate-100 flex items-center justify-center font-sans px-6">
        <div className="glass-dark border border-slate-800 max-w-md w-full p-8 rounded-3xl text-center space-y-6">
          <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6 animate-pulse" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white">Resource Unavailable</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{error}</p>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-[0.98] cursor-pointer"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const stats = dataset?.summary_statistics;

  return (
    <div className="min-h-screen bg-[#060a13] text-slate-100 font-sans flex flex-col relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-15%] w-[45%] h-[45%] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-violet-600/5 blur-[120px] pointer-events-none" />

      {/* Top Navbar */}
      <header className="border-b border-slate-900 bg-[#070b15]/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="p-2 bg-slate-950/40 border border-slate-800 hover:border-slate-700 hover:text-indigo-400 rounded-xl transition-all cursor-pointer"
              title="Back to dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-500/10 rounded-lg border border-indigo-500/20 text-indigo-400">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <span className="font-bold text-sm text-slate-200 truncate max-w-[200px] sm:max-w-xs">
                {dataset?.name}
              </span>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 font-mono hidden md:block">
            DATASET ID: {dataset?.id}
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 space-y-6 z-10">
        {/* Dataset Metadata Ribbon */}
        <div className="glass-dark border border-slate-900/60 rounded-2xl px-6 py-4 flex flex-wrap gap-x-8 gap-y-4 items-center justify-between shadow-lg">
          <div className="flex items-center gap-6">
            <div className="space-y-1">
              <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Total Rows</span>
              <p className="text-sm font-extrabold text-white">{dataset?.row_count.toLocaleString()}</p>
            </div>
            <div className="border-r border-slate-850 h-8 hidden sm:block" />
            <div className="space-y-1">
              <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Columns</span>
              <p className="text-sm font-extrabold text-white">{dataset?.column_count}</p>
            </div>
            <div className="border-r border-slate-850 h-8 hidden sm:block" />
            <div className="space-y-1 col-span-2 sm:col-span-1">
              <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">File Size</span>
              <p className="text-sm font-extrabold text-white">{formatBytes(dataset?.file_size || 0)}</p>
            </div>
          </div>

          {/* Tab buttons */}
          <div className="flex bg-[#0b0f19] border border-slate-900 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("viewer")}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === "viewer"
                  ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                  : "text-slate-400 hover:text-slate-200 border border-transparent"
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              Data Viewer
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === "analytics"
                  ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                  : "text-slate-400 hover:text-slate-200 border border-transparent"
              }`}
            >
              <LineChartIcon className="w-3.5 h-3.5" />
              Analytics Dashboard
            </button>
            <button
              onClick={() => setActiveTab("insights")}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === "insights"
                  ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                  : "text-slate-400 hover:text-slate-200 border border-transparent"
              }`}
            >
              <Brain className="w-3.5 h-3.5" />
              AI Insights
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-3 bg-red-500/15 border border-red-500/30 rounded-2xl p-4 text-red-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold">Execution Error</span>
              <p className="leading-relaxed text-slate-400">{error}</p>
            </div>
          </div>
        )}

        {/* Tab 1: Data Viewer */}
        {activeTab === "viewer" && (
          <div className="glass-dark border border-slate-800/60 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-5">
              <div>
                <h2 className="text-lg font-bold text-slate-200">Ingested CSV Sample Rows</h2>
                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                  Showing first 100 cleaned records stored securely in the PostgreSQL relational databases.
                </p>
              </div>

              {/* Client-side row search */}
              <div className="relative w-full sm:w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="Filter rows locally..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#0b0e17] border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-100 placeholder-slate-500 outline-none transition-all"
                />
              </div>
            </div>

            {filteredRows.length > 0 ? (
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full border-collapse text-left text-[11px] relative">
                  <thead>
                    <tr className="border-b border-slate-900 text-slate-400 font-semibold sticky top-0 bg-[#070b15] z-10">
                      <th className="pb-3 pr-4 font-mono font-bold text-slate-500 text-[10px] w-12">#</th>
                      {dataset?.headers.map((header) => (
                        <th key={header} className="pb-3 pr-4 font-bold uppercase tracking-wider text-[9px]">
                          {header.replace(/_/g, " ")}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/60">
                    {filteredRows.map((row) => (
                      <tr key={row.row_index} className="hover:bg-slate-900/15 transition-colors">
                        <td className="py-3 pr-4 font-mono text-slate-600">{row.row_index}</td>
                        {dataset?.headers.map((header) => {
                          const val = row.row_data[header];
                          return (
                            <td key={header} className="py-3 pr-4 text-slate-300 font-medium truncate max-w-[150px]">
                              {val === null || val === undefined ? (
                                <span className="text-slate-600 italic">null</span>
                              ) : typeof val === "number" ? (
                                val.toLocaleString()
                              ) : (
                                String(val)
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center border border-slate-850 rounded-2xl bg-slate-950/10">
                <Search className="w-8 h-8 text-slate-700 mb-2" />
                <h3 className="text-xs font-bold text-slate-400">No Matching Records</h3>
                <p className="text-[10px] text-slate-500 max-w-xs mt-1">
                  Adjust your search terms to match parameters within headers or parsed cellular values.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Analytics Dashboard */}
        {activeTab === "analytics" && dataset && (
          <div className="animate-fade-in">
            <ChartMapper
              headers={dataset.headers}
              summaryStatistics={dataset.summary_statistics}
              rows={sampleRows}
            />
          </div>
        )}

        {/* Tab 3: AI Insights */}
        {activeTab === "insights" && dataset && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fade-in">
            {/* Left Panel: Statistics Recap Cards */}
            <div className="lg:col-span-4 space-y-6">
              <div className="glass-dark border border-slate-800/60 rounded-3xl p-6 shadow-xl space-y-5">
                <h3 className="text-sm font-bold text-slate-200 border-b border-slate-900 pb-3 flex items-center gap-2">
                  <Database className="w-4 h-4 text-indigo-400" />
                  Precalculated Statistics
                </h3>

                {/* Growth Rate Card */}
                {stats?.growth_rate_pct !== undefined && (
                  <div className="p-4 rounded-2xl bg-[#090e18] border border-slate-900 flex items-center justify-between">
                    <div>
                      <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Growth Trend</p>
                      <h4 className={`text-xl font-extrabold mt-0.5 ${stats.growth_rate_pct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {stats.growth_rate_pct >= 0 ? "+" : ""}{stats.growth_rate_pct}%
                      </h4>
                    </div>
                    <div className={`p-2 rounded-xl ${stats.growth_rate_pct >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </div>
                )}

                {/* Top Category Card */}
                {stats?.top_category && (
                  <div className="p-4 rounded-2xl bg-[#090e18] border border-slate-900 flex items-center justify-between">
                    <div className="space-y-1 truncate pr-2">
                      <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Top Category ({stats.top_category.column})</p>
                      <h4 className="text-sm font-extrabold text-slate-200 truncate">{stats.top_category.name}</h4>
                      <p className="text-[10px] text-slate-500">Volume: {stats.top_category.value.toLocaleString()}</p>
                    </div>
                    <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400 shrink-0">
                      <Award className="w-4 h-4" />
                    </div>
                  </div>
                )}

                {/* Regional Distributions list */}
                {stats?.regional_distribution && (
                  <div className="space-y-3">
                    <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-indigo-400" />
                      Regional Breakdown
                    </p>
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {Object.entries(stats.regional_distribution).map(([region, val]) => (
                        <div key={region} className="flex justify-between items-center text-xs p-2 bg-[#050910] border border-slate-900/60 rounded-xl">
                          <span className="font-semibold text-slate-300">{region}</span>
                          <span className="font-mono text-indigo-400 font-bold">{val.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Basic Metrics List */}
                {stats?.numeric_metrics && Object.keys(stats.numeric_metrics).length > 0 && (
                  <div className="space-y-3">
                    <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Calculated Totals</p>
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {Object.entries(stats.numeric_metrics).map(([col, metric]: [string, any]) => (
                        <div key={col} className="space-y-1.5 p-3 bg-[#050910] border border-slate-900/60 rounded-xl">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-400 truncate max-w-[120px]">{col.toUpperCase()}</span>
                            <span className="font-mono text-indigo-400 font-bold">{metric.total.toLocaleString()}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-[9px] text-slate-500 border-t border-slate-900/40 pt-1.5">
                            <div>Avg: {metric.avg.toLocaleString()}</div>
                            <div>Min: {metric.min.toLocaleString()}</div>
                            <div>Max: {metric.max.toLocaleString()}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel: Gemini Insights */}
            <div className="lg:col-span-8">
              {insightsLoading ? (
                /* Scanning Loader State */
                <div className="glass-dark border border-slate-800/60 rounded-3xl p-12 shadow-xl flex flex-col items-center justify-center text-center space-y-6 h-[400px]">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-indigo-500/10 border-t-indigo-500 animate-spin" />
                    <Sparkles className="w-6 h-6 text-indigo-400 absolute inset-0 m-auto animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-slate-200">Querying Gemini AI Engine...</h3>
                    <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                      Analyzing precalculated statistics, evaluating growth trajectories, and building narrative summaries.
                    </p>
                  </div>
                </div>
              ) : insights ? (
                /* Insights Renders */
                <div className="glass-dark border border-slate-800/60 rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
                  {/* Insight Header */}
                  <div className="flex items-center justify-between border-b border-slate-900 pb-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
                      <h3 className="text-sm font-bold text-slate-200">AI Executive Briefing</h3>
                    </div>
                    <button
                      onClick={handleGenerateInsights}
                      className="inline-flex items-center gap-1.5 bg-slate-950/40 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs px-3.5 py-2 rounded-xl transition-all active:scale-[0.98] cursor-pointer font-bold"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Recalculate
                    </button>
                  </div>

                  {/* Narrative Insight */}
                  <div className="p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 text-slate-300 text-xs leading-relaxed">
                    <h4 className="font-extrabold text-indigo-400 mb-1 text-[11px] uppercase tracking-wider">Business Brief</h4>
                    {insights.business_insights}
                  </div>

                  {/* Observations */}
                  {insights.key_observations && insights.key_observations.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-extrabold text-slate-400 text-[10px] uppercase tracking-wider">Key Observations</h4>
                      <ul className="space-y-2.5 text-xs text-slate-300">
                        {insights.key_observations.map((obs, idx) => (
                          <li key={idx} className="flex gap-2.5 items-start">
                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full shrink-0 mt-2 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                            <span>{obs}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Warnings */}
                  {insights.warnings && insights.warnings.length > 0 && (
                    <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-slate-300 text-xs space-y-2">
                      <div className="flex items-center gap-2 text-amber-400 font-extrabold uppercase tracking-wider text-[10px]">
                        <AlertTriangle className="w-4 h-4" />
                        System Anomalies / Warnings
                      </div>
                      <ul className="space-y-1.5 pl-6 list-disc text-slate-400">
                        {insights.warnings.map((warn, idx) => (
                          <li key={idx}>{warn}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recommendations */}
                  {insights.recommendations && insights.recommendations.length > 0 && (
                    <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-slate-300 text-xs space-y-3">
                      <div className="flex items-center gap-2 text-emerald-400 font-extrabold uppercase tracking-wider text-[10px]">
                        <CheckCircle2 className="w-4 h-4" />
                        Actionable Recommendations
                      </div>
                      <ul className="space-y-2.5">
                        {insights.recommendations.map((rec, idx) => (
                          <li key={idx} className="flex gap-2.5 items-start pl-1">
                            <span className="p-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-md shrink-0 mt-0.5">
                              <CheckCircle2 className="w-3 h-3" />
                            </span>
                            <span className="text-slate-400">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                /* Empty state trigger */
                <div className="glass-dark border border-slate-800/60 rounded-3xl p-12 shadow-xl flex flex-col items-center justify-center text-center space-y-6 h-[400px]">
                  <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-3xl flex items-center justify-center mx-auto shadow-[0_0_15px_rgba(99,102,241,0.15)]">
                    <Brain className="w-8 h-8" />
                  </div>
                  <div className="space-y-2 max-w-sm">
                    <h3 className="text-sm font-bold text-slate-200">No Insights Processed</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Analyze metrics with Google Gemini AI to construct narrative business briefs, observation breakdowns, and recommendations.
                    </p>
                  </div>
                  <button
                    onClick={handleGenerateInsights}
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-755 text-white text-xs font-bold px-6 py-3 rounded-xl transition-all shadow-lg active:scale-[0.98] cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 animate-pulse" />
                    Generate AI Narrative
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900/60 py-8 text-center text-slate-600 text-xs mt-12">
        <p>&copy; {new Date().getFullYear()} MetricMind AI. Capstone Project.</p>
      </footer>
    </div>
  );
}
