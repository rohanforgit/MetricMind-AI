"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import FileUpload from "@/components/FileUpload";
import ChartMapper from "@/components/charts/ChartMapper";
import {
  Database,
  Brain,
  Upload,
  Search,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Calendar,
  Layers,
  LogOut,
  X,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  Award,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  MapPin,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

interface DatasetItem {
  id: string;
  name: string;
  file_size: number;
  row_count: number;
  column_count: number;
  headers: string[];
  created_at: string;
}

interface DashboardSummary {
  total_datasets: number;
  total_rows_monitored: number;
  total_insights_generated: number;
  recent_uploads: { id: string; name: string; created_at: string }[];
}

export default function DashboardPage() {
  const { user, loading: authLoading, signOut } = useAuth();

  const [datasets, setDatasets] = useState<DatasetItem[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Modal states for delete and rename operations
  const [activeDeleteId, setActiveDeleteId] = useState<string | null>(null);
  const [activeRenameItem, setActiveRenameItem] = useState<{ id: string; name: string } | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Workspace Dynamic Selection Preview States
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);
  const [selectedDataset, setSelectedDataset] = useState<any | null>(null);
  const [sampleRows, setSampleRows] = useState<any[]>([]);
  const [insights, setInsights] = useState<any | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [previewTab, setPreviewTab] = useState<"viewer" | "analytics" | "insights">("viewer");
  const [previewSearchQuery, setPreviewSearchQuery] = useState("");

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch summary statistics
      const summaryRes = await fetch("/api/dashboard/summary");
      const summaryJson = await summaryRes.json();
      if (summaryRes.ok && summaryJson.success) {
        setSummary(summaryJson.summary);
      }

      // Fetch list of datasets
      const datasetsRes = await fetch("/api/datasets");
      const datasetsJson = await datasetsRes.json();
      if (datasetsRes.ok && datasetsJson.success) {
        setDatasets(datasetsJson.datasets);
      }
    } catch (err) {
      console.error("Error loading dashboard metrics:", err);
      setError("Could not load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  // Load details, rows and insights for selected dataset preview panel
  const handleSelectDataset = async (id: string) => {
    setSelectedDatasetId(id);
    setPreviewLoading(true);
    setError(null);
    setPreviewTab("viewer");
    setPreviewSearchQuery("");
    setInsights(null);

    try {
      const res = await fetch(`/api/datasets/${id}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load dataset details.");
      }
      setSelectedDataset(json.dataset);
      setSampleRows(json.sample_rows || []);

      // Fetch cached insights if present
      try {
        const insightsRes = await fetch(`/api/datasets/${id}/insights`);
        const insightsJson = await insightsRes.json();
        if (insightsRes.ok && insightsJson.success && insightsJson.insights) {
          setInsights(insightsJson.insights.insights_content);
        }
      } catch (iErr) {
        console.warn("Cached insights unavailable or offline:", iErr);
      }

      // Scroll smoothly to preview container
      setTimeout(() => {
        document.getElementById("workspace-preview")?.scrollIntoView({ behavior: "smooth" });
      }, 150);

    } catch (err: any) {
      console.error("Error loading preview:", err);
      setError(err.message || "Could not retrieve dataset details.");
      setSelectedDatasetId(null);
      setSelectedDataset(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleUploadSuccess = (data: { dataset_id: string }) => {
    setShowUploadModal(false);
    fetchDashboardData();
    if (data?.dataset_id) {
      handleSelectDataset(data.dataset_id);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!activeDeleteId) return;
    setActionLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/datasets/${activeDeleteId}`, {
        method: "DELETE",
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to delete dataset.");
      }

      // Deselect preview panel if active
      if (selectedDatasetId === activeDeleteId) {
        setSelectedDatasetId(null);
        setSelectedDataset(null);
        setSampleRows([]);
        setInsights(null);
      }

      setActiveDeleteId(null);
      fetchDashboardData();
    } catch (err: any) {
      setError(err.message || "An error occurred during deletion.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRenameItem || !renameValue.trim()) return;
    setActionLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/datasets/${activeRenameItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameValue }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to rename dataset.");
      }

      // Update preview panel active title
      if (selectedDatasetId === activeRenameItem.id) {
        setSelectedDataset((prev: any) => prev ? { ...prev, name: renameValue.trim() } : null);
      }

      setActiveRenameItem(null);
      setRenameValue("");
      fetchDashboardData();
    } catch (err: any) {
      setError(err.message || "An error occurred during renaming.");
    } finally {
      setActionLoading(false);
    }
  };

  // Compile / Regenerate AI insights for preview dataset
  const handleGeneratePreviewInsights = async () => {
    if (!selectedDatasetId) return;
    setInsightsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/datasets/${selectedDatasetId}/insights`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to compile AI insights.");
      }
      setInsights(json.insights.insights_content);
      // Fetch stats again to make sure "total_insights_generated" card updates
      fetchDashboardData();
    } catch (err: any) {
      console.error("AI Insight preview compile error:", err);
      setError(err.message || "Failed to request Gemini AI generation. Activating fallback.");
    } finally {
      setInsightsLoading(false);
    }
  };

  const filteredDatasets = datasets.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter rows on client side
  const filteredPreviewRows = useMemo(() => {
    if (!previewSearchQuery.trim()) return sampleRows;
    return sampleRows.filter((row) =>
      Object.values(row.row_data).some((val) =>
        String(val || "").toLowerCase().includes(previewSearchQuery.toLowerCase())
      )
    );
  }, [sampleRows, previewSearchQuery]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (authLoading || (loading && !summary)) {
    return (
      <div className="min-h-screen bg-[#060a13] text-slate-100 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <span className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-semibold tracking-wide">Syncing data streams...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060a13] text-slate-100 font-sans flex flex-col relative overflow-x-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-15%] w-[45%] h-[45%] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-violet-600/5 blur-[120px] pointer-events-none" />

      {/* Top Navbar */}
      <header className="border-b border-slate-900 bg-[#070b15]/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
              <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">MM</span>
            </div>
            <span className="font-bold text-sm text-slate-200">MetricMind AI</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-400 hidden sm:inline-block border-r border-slate-800 pr-4">
              Logged in as: <span className="font-semibold text-slate-300">{user?.email}</span>
            </span>
            <button
              onClick={signOut}
              className="inline-flex items-center gap-2 bg-slate-950/40 hover:bg-red-500/15 border border-slate-800 hover:border-red-500/30 text-slate-300 hover:text-red-400 text-xs font-semibold px-4 py-2 rounded-xl transition-all active:scale-[0.98] cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-12 space-y-8 animate-fade-in z-10">
        {/* Banner header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Analytics Hub</h1>
            <p className="text-xs text-slate-400 mt-1">
              Manage your projects, upload new datasets, and explore AI-powered business insights.
            </p>
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-750 text-white text-xs font-bold px-5 py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/10 active:scale-[0.98] cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            New Project
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-3 bg-red-500/15 border border-red-500/30 rounded-2xl p-4 text-red-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold">Database Error</span>
              <p className="leading-relaxed text-slate-400">{error}</p>
            </div>
          </div>
        )}

        {/* Aggregate Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-dark border border-slate-800/80 rounded-2xl p-6 flex items-center justify-between shadow-xl">
            <div className="space-y-2">
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Projects</p>
              <h3 className="text-3xl font-extrabold text-white">{summary?.total_datasets ?? 0}</h3>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
              <Database className="w-5 h-5 text-indigo-400" />
            </div>
          </div>

          <div className="glass-dark border border-slate-800/80 rounded-2xl p-6 flex items-center justify-between shadow-xl">
            <div className="space-y-2">
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Cleaned Rows Ingested</p>
              <h3 className="text-3xl font-extrabold text-white">{(summary?.total_rows_monitored ?? 0).toLocaleString()}</h3>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-cyan-500/10 rounded-2xl border border-cyan-500/20">
              <Layers className="w-5 h-5 text-cyan-400" />
            </div>
          </div>

          <div className="glass-dark border border-slate-800/80 rounded-2xl p-6 flex items-center justify-between shadow-xl">
            <div className="space-y-2">
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Generated Insights</p>
              <h3 className="text-3xl font-extrabold text-white">{summary?.total_insights_generated ?? 0}</h3>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-violet-500/10 rounded-2xl border border-violet-500/20">
              <Brain className="w-5 h-5 text-violet-400" />
            </div>
          </div>
        </div>

        {/* Projects Listing Section */}
        <div className="glass-dark border border-slate-800/60 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-5">
            <h2 className="text-lg font-bold text-slate-200">Saved Projects</h2>

            {/* Search filter */}
            <div className="relative w-full sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0b0e17] border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-100 placeholder-slate-500 outline-none transition-all"
              />
            </div>
          </div>

          {/* Table list */}
          {filteredDatasets.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-900 text-slate-400 font-semibold">
                    <th className="pb-3 pr-4 font-bold uppercase tracking-wider text-[10px]">Project Name</th>
                    <th className="pb-3 pr-4 font-bold uppercase tracking-wider text-[10px] hidden md:table-cell">File Parameters</th>
                    <th className="pb-3 pr-4 font-bold uppercase tracking-wider text-[10px] hidden sm:table-cell">Upload Date</th>
                    <th className="pb-3 text-right font-bold uppercase tracking-wider text-[10px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60">
                  {filteredDatasets.map((d) => (
                    <tr
                      key={d.id}
                      className={`hover:bg-slate-900/10 transition-colors group cursor-pointer ${
                        selectedDatasetId === d.id ? "bg-indigo-500/5" : ""
                      }`}
                      onClick={() => handleSelectDataset(d.id)}
                    >
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400">
                            <FileSpreadsheet className="w-4 h-4" />
                          </div>
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-200 group-hover:text-indigo-400 transition-colors truncate max-w-[200px] sm:max-w-xs block">
                              {d.name}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono hidden md:inline">ID: {d.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 pr-4 hidden md:table-cell">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <Layers className="w-3.5 h-3.5 text-slate-500" />
                            <span>{d.row_count.toLocaleString()} rows &bull; {d.column_count} columns</span>
                          </div>
                          <span className="text-[10px] text-slate-500">{formatBytes(d.file_size)}</span>
                        </div>
                      </td>
                      <td className="py-4 pr-4 hidden sm:table-cell text-slate-400">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <span>{new Date(d.created_at).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleSelectDataset(d.id)}
                            className={`p-2 border rounded-xl transition-all cursor-pointer ${
                              selectedDatasetId === d.id
                                ? "bg-indigo-500/20 border-indigo-500 text-indigo-400"
                                : "bg-[#0d1220] border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-500/10 text-slate-400 hover:text-indigo-400"
                            }`}
                            title="Open project insights"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setActiveRenameItem({ id: d.id, name: d.name });
                              setRenameValue(d.name);
                            }}
                            className="p-2 bg-[#0d1220] border border-slate-800 hover:border-violet-500/50 hover:bg-violet-500/10 text-slate-400 hover:text-violet-400 rounded-xl transition-all cursor-pointer"
                            title="Rename project"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setActiveDeleteId(d.id)}
                            className="p-2 bg-[#0d1220] border border-slate-800 hover:border-red-500/50 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-xl transition-all cursor-pointer"
                            title="Delete project"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center border border-slate-850 rounded-2xl bg-slate-950/10">
              <Database className="w-12 h-12 text-slate-700/80 mb-4 animate-pulse" />
              <h3 className="text-sm font-bold text-slate-300">No Projects Saved</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
                You haven&apos;t saved any projects yet. Click the &ldquo;New Project&rdquo; button to upload a CSV and get started.
              </p>
            </div>
          )}
        </div>

        {/* Dynamic Selected Dataset preview Panel */}
        {selectedDatasetId && (
          <div
            id="workspace-preview"
            className="glass-dark border border-slate-800/80 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 relative animate-fade-in"
          >
            <button
              onClick={() => {
                setSelectedDatasetId(null);
                setSelectedDataset(null);
                setSampleRows([]);
                setInsights(null);
              }}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700 rounded-xl cursor-pointer"
              title="Close details"
            >
              <X className="w-4 h-4" />
            </button>

            {previewLoading ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-4">
                <span className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-slate-400 font-semibold tracking-wider">Unpacking workspace assets...</p>
              </div>
            ) : selectedDataset ? (
              <div className="space-y-6">
                {/* Active Project Specs Header */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-900 pb-5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                        Active Project
                      </span>
                      <span className="text-[10px] text-slate-500">ID: {selectedDataset.id}</span>
                    </div>
                    <h2 className="text-xl font-bold text-slate-100">{selectedDataset.name}</h2>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {selectedDataset.row_count.toLocaleString()} rows &bull; {selectedDataset.column_count} columns &bull; Size: {formatBytes(selectedDataset.file_size)}
                    </p>
                  </div>

                  {/* Fluid scroll back to top of page and Tabs Navigator */}
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-950/40 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-md"
                    >
                      Saved Projects &uarr;
                    </button>

                    <div className="flex bg-[#0b0f19] border border-slate-900 p-1 rounded-xl">
                      <button
                        onClick={() => setPreviewTab("viewer")}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                          previewTab === "viewer"
                            ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                            : "text-slate-400 hover:text-slate-200 border border-transparent"
                        }`}
                      >
                        <Database className="w-3.5 h-3.5" />
                        Data Viewer
                      </button>
                      <button
                        onClick={() => setPreviewTab("analytics")}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                          previewTab === "analytics"
                            ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                            : "text-slate-400 hover:text-slate-200 border border-transparent"
                        }`}
                      >
                        <TrendingUp className="w-3.5 h-3.5" />
                        Visual Charts
                      </button>
                      <button
                        onClick={() => setPreviewTab("insights")}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                          previewTab === "insights"
                            ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                            : "text-slate-400 hover:text-slate-200 border border-transparent"
                        }`}
                      >
                        <Brain className="w-3.5 h-3.5" />
                        AI Insights
                      </button>
                    </div>
                  </div>
                </div>

                {/* Tab Content 1: Data Viewer */}
                {previewTab === "viewer" && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-sm font-bold text-slate-300">Clean Sample View</h3>
                        <p className="text-[10px] text-slate-500 mt-0.5">Showing first 100 rows fetched from relational store.</p>
                      </div>
                      <div className="relative w-full sm:w-64">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                          <Search className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          placeholder="Filter rows..."
                          value={previewSearchQuery}
                          onChange={(e) => setPreviewSearchQuery(e.target.value)}
                          className="w-full bg-[#0b0e17] border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-100 placeholder-slate-500 outline-none transition-all"
                        />
                      </div>
                    </div>

                    {filteredPreviewRows.length > 0 ? (
                      <div className="overflow-x-auto max-h-[350px]">
                        <table className="w-full border-collapse text-left text-[11px] relative">
                          <thead>
                            <tr className="border-b border-slate-900 text-slate-400 font-semibold sticky top-0 bg-[#070b15] z-10">
                              <th className="pb-3 pr-4 font-mono font-bold text-slate-500 text-[10px] w-12">#</th>
                              {selectedDataset.headers.map((h: string) => (
                                <th key={h} className="pb-3 pr-4 font-bold uppercase tracking-wider text-[9px]">
                                  {h.replace(/_/g, " ")}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-900/60">
                            {filteredPreviewRows.map((row) => (
                              <tr key={row.row_index} className="hover:bg-slate-900/10 transition-colors">
                                <td className="py-2.5 pr-4 font-mono text-slate-600">{row.row_index}</td>
                                {selectedDataset.headers.map((h: string) => {
                                  const val = row.row_data[h];
                                  return (
                                    <td key={h} className="py-2.5 pr-4 text-slate-300 font-medium truncate max-w-[150px]">
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
                        <Search className="w-6 h-6 text-slate-700 mb-2" />
                        <h4 className="text-xs font-bold text-slate-400">No Matching Sample Rows</h4>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab Content 2: Visual Charts */}
                {previewTab === "analytics" && (
                  <div className="animate-fade-in">
                    <ChartMapper
                      headers={selectedDataset.headers}
                      summaryStatistics={selectedDataset.summary_statistics}
                      rows={sampleRows}
                    />
                  </div>
                )}

                {/* Tab Content 3: AI Insights */}
                {previewTab === "insights" && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fade-in">
                    {/* Left: Summary Metrics Cards */}
                    <div className="lg:col-span-4 space-y-6">
                      <div className="p-5 rounded-3xl bg-[#090e18]/80 border border-slate-900 space-y-5 shadow-inner">
                        <h4 className="text-xs font-bold text-slate-300 border-b border-slate-900 pb-2.5 uppercase tracking-wider flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-indigo-400" />
                          Precalculated Metrics
                        </h4>

                        {selectedDataset.summary_statistics.growth_rate_pct !== undefined && (
                          <div className="p-3 bg-[#050910] border border-slate-900 rounded-xl flex items-center justify-between">
                            <div>
                              <p className="text-[8px] uppercase font-bold text-slate-500 tracking-wider">Growth Trend</p>
                              <h5 className={`text-lg font-extrabold mt-0.5 ${selectedDataset.summary_statistics.growth_rate_pct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                {selectedDataset.summary_statistics.growth_rate_pct >= 0 ? "+" : ""}{selectedDataset.summary_statistics.growth_rate_pct}%
                              </h5>
                            </div>
                            <span className={`p-1.5 rounded-lg text-xs ${selectedDataset.summary_statistics.growth_rate_pct >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                              <TrendingUp className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        )}

                        {selectedDataset.summary_statistics.top_category && (
                          <div className="p-3 bg-[#050910] border border-slate-900 rounded-xl flex items-center justify-between">
                            <div className="truncate pr-2">
                              <p className="text-[8px] uppercase font-bold text-slate-500 tracking-wider">Top Category ({selectedDataset.summary_statistics.top_category.column})</p>
                              <h5 className="text-xs font-extrabold text-slate-200 truncate mt-0.5">{selectedDataset.summary_statistics.top_category.name}</h5>
                            </div>
                            <span className="p-1.5 bg-violet-500/10 text-violet-400 rounded-lg shrink-0">
                              <Award className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        )}

                        {selectedDataset.summary_statistics.regional_distribution && (
                          <div className="space-y-2">
                            <p className="text-[8px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-indigo-400" />
                              Regional Breakdown
                            </p>
                            <div className="space-y-1.5 max-h-[150px] overflow-y-auto pr-1">
                              {Object.entries(selectedDataset.summary_statistics.regional_distribution).map(([region, val]: [string, any]) => (
                                <div key={region} className="flex justify-between items-center text-[11px] p-2 bg-[#050910] border border-slate-900/60 rounded-lg">
                                  <span className="font-semibold text-slate-300">{region}</span>
                                  <span className="font-mono text-indigo-400 font-bold">{val.toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {selectedDataset.summary_statistics.numeric_metrics && Object.keys(selectedDataset.summary_statistics.numeric_metrics).length > 0 && (
                          <div className="space-y-2">
                            <p className="text-[8px] uppercase font-bold text-slate-500 tracking-wider">Calculated Totals</p>
                            <div className="space-y-1.5 max-h-[150px] overflow-y-auto pr-1">
                              {Object.entries(selectedDataset.summary_statistics.numeric_metrics).map(([col, metric]: [string, any]) => (
                                <div key={col} className="flex justify-between items-center text-[11px] p-2 bg-[#050910] border border-slate-900/60 rounded-lg">
                                  <span className="font-semibold text-slate-300 truncate max-w-[120px]">{col}</span>
                                  <span className="font-mono text-indigo-400 font-bold">{metric.total.toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Gemini AI briefing */}
                    <div className="lg:col-span-8">
                      {insightsLoading ? (
                        <div className="p-8 border border-slate-800 rounded-3xl bg-[#090e18]/40 flex flex-col items-center justify-center text-center space-y-4 h-[320px]">
                          <div className="relative">
                            <div className="w-12 h-12 rounded-full border-4 border-indigo-500/10 border-t-indigo-500 animate-spin" />
                            <Sparkles className="w-5 h-5 text-indigo-400 absolute inset-0 m-auto animate-pulse" />
                          </div>
                          <div className="space-y-1">
                            <h5 className="text-xs font-bold text-slate-200">Querying Gemini AI...</h5>
                            <p className="text-[10px] text-slate-500 max-w-xs leading-relaxed">
                              Compiling mathematical stats models and analyzing growth dynamics.
                            </p>
                          </div>
                        </div>
                      ) : insights ? (
                        <div className="p-6 md:p-8 border border-slate-800 rounded-3xl bg-[#090e18]/45 space-y-6 shadow-lg">
                          <div className="flex items-center justify-between border-b border-slate-900 pb-3.5">
                            <div className="flex items-center gap-1.5">
                              <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
                              <span className="font-bold text-xs text-slate-200">Executive Narrative Summary</span>
                            </div>
                            <button
                              onClick={handleGeneratePreviewInsights}
                              className="inline-flex items-center gap-1 bg-slate-950/40 hover:bg-slate-900 border border-slate-800 text-slate-400 text-[10px] px-2.5 py-1.5 rounded-xl transition-all cursor-pointer font-bold"
                            >
                              <RefreshCw className="w-2.5 h-2.5" />
                              Regenerate
                            </button>
                          </div>

                          <p className="p-4 bg-indigo-500/5 border border-indigo-500/10 text-slate-300 text-xs leading-relaxed rounded-xl">
                            {insights.business_insights}
                          </p>

                          {insights.key_observations && insights.key_observations.length > 0 && (
                            <div className="space-y-2">
                              <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Observations</span>
                              <ul className="space-y-2 text-xs text-slate-350">
                                {insights.key_observations.map((obs: string, idx: number) => (
                                  <li key={idx} className="flex gap-2 items-start">
                                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full mt-2 shrink-0 shadow-[0_0_6px_rgba(99,102,241,0.8)]" />
                                    <span>{obs}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {insights.warnings && insights.warnings.length > 0 && (
                            <div className="p-3.5 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-1.5 text-xs text-slate-300">
                              <div className="flex items-center gap-1.5 text-amber-400 font-extrabold uppercase text-[9px]">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Warnings & Risks
                              </div>
                              <ul className="list-disc pl-5 space-y-1 text-slate-400 text-[11px]">
                                {insights.warnings.map((warn: string, idx: number) => (
                                  <li key={idx}>{warn}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {insights.recommendations && insights.recommendations.length > 0 && (
                            <div className="p-3.5 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-2 text-xs text-slate-300">
                              <div className="flex items-center gap-1.5 text-emerald-400 font-extrabold uppercase text-[9px]">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Recommended Strategies
                              </div>
                              <ul className="space-y-2 text-[11px] text-slate-400 pl-1">
                                {insights.recommendations.map((rec: string, idx: number) => (
                                  <li key={idx} className="flex gap-2 items-start">
                                    <span className="p-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-md mt-0.5 shrink-0">
                                      <CheckCircle2 className="w-3 h-3" />
                                    </span>
                                    <span>{rec}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-8 border border-slate-800 rounded-3xl bg-[#090e18]/40 flex flex-col items-center justify-center text-center space-y-5 h-[320px]">
                          <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center">
                            <Brain className="w-6 h-6" />
                          </div>
                          <div className="space-y-1 max-w-xs">
                            <h5 className="text-xs font-bold text-slate-200">No Insights Synthesized</h5>
                            <p className="text-[10px] text-slate-500 leading-relaxed">
                              Run the precalculated statistical summary model through Gemini to generate insights.
                            </p>
                          </div>
                          <button
                            onClick={handleGeneratePreviewInsights}
                            className="inline-flex items-center gap-1.5 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-755 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-[0.98] cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                            Generate insights
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </main>

      {/* Upload Dialog Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="glass-dark border border-slate-800 w-full max-w-lg rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setShowUploadModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-200 transition-colors border border-slate-800 hover:border-slate-700 rounded-xl cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="space-y-4 mb-6">
              <h3 className="text-lg font-bold text-slate-100">Create New Project (Upload CSV)</h3>
              <p className="text-xs text-slate-400">
                Your project will parse, clean, and store the dataset, then map interactive charts and generate live AI insights.
              </p>
            </div>
            <FileUpload onUploadSuccess={handleUploadSuccess} onClose={() => setShowUploadModal(false)} />
          </div>
        </div>
      )}

      {/* Rename Dialog Modal */}
      {activeRenameItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="glass-dark border border-slate-800 w-full max-w-md rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setActiveRenameItem(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-200 transition-colors border border-slate-800 hover:border-slate-700 rounded-xl cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-lg font-bold text-slate-100 mb-2">Rename Project</h3>
            <p className="text-xs text-slate-400 mb-6">
              Provide a new descriptive name for project: <span className="font-semibold text-slate-300 font-mono">{activeRenameItem.name}</span>
            </p>
            <form onSubmit={handleRenameSubmit} className="space-y-4">
              <input
                type="text"
                required
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="w-full bg-[#0d1527] border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl py-2.5 px-4 text-xs text-slate-100 placeholder-slate-500 outline-none transition-all"
              />
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setActiveRenameItem(null)}
                  className="px-5 py-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/10 active:scale-[0.98] cursor-pointer"
                >
                  {actionLoading ? "Renaming..." : "Confirm"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Dialog Modal */}
      {activeDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="glass-dark border border-slate-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5 animate-bounce" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-100">Delete Project?</h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                Are you sure? This action is irreversible. All project data, uploaded rows, and generated insights will be deleted forever.
              </p>
            </div>
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={() => setActiveDeleteId(null)}
                className="px-5 py-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSubmit}
                disabled={actionLoading}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-red-500/10 active:scale-[0.98] cursor-pointer"
              >
                {actionLoading ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900/60 py-8 text-center text-slate-600 text-xs">
        <p>&copy; {new Date().getFullYear()} MetricMind AI. Capstone Project.</p>
      </footer>
    </div>
  );
}
