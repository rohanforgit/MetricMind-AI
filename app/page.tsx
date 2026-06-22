import Link from "next/link";
import { ArrowRight, BarChart2, Brain, Database, ShieldAlert, Sparkles } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-[#040812] text-slate-100 font-sans overflow-hidden">
      {/* Background radial overlays */}
      <div className="absolute top-[-10%] left-[-15%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[130px]" />
      <div className="absolute top-[20%] right-[-10%] w-[45%] h-[45%] rounded-full bg-violet-600/10 blur-[130px]" />
      <div className="absolute bottom-[-10%] left-[20%] w-[50%] h-[50%] rounded-full bg-cyan-500/5 blur-[130px]" />

      {/* Navigation Header */}
      <header className="relative w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-20">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-9 h-9 bg-indigo-500/10 rounded-xl border border-indigo-500/20 shadow-md">
            <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">MM</span>
          </div>
          <span className="font-bold text-lg tracking-tight text-white">MetricMind AI</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm font-semibold text-slate-400 hover:text-slate-100 transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-md shadow-indigo-500/10 active:scale-[0.98]"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto px-6 pt-16 pb-24 flex flex-col items-center justify-center text-center z-10 space-y-8">
        <div className="inline-flex items-center gap-2 bg-indigo-500/5 border border-indigo-500/10 rounded-full px-4 py-1.5 animate-pulse-border">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-300">
            Powered by Gemini 2.5 Flash
          </span>
        </div>

        <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-4xl leading-tight">
          An Analytics Dashboard <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400">
            That Explains Itself
          </span>
        </h1>

        <p className="text-sm md:text-base text-slate-400 max-w-2xl leading-relaxed">
          MetricMind AI automatically bridges the gap between raw CSV files and actionable business intelligence. Upload data, view interactive charts, and read plain-English AI explanations instantly.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white px-8 py-3.5 rounded-xl font-semibold shadow-lg shadow-indigo-500/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Get Started for Free
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center border border-slate-800 hover:border-slate-700 bg-slate-950/20 hover:bg-slate-900/40 text-slate-300 hover:text-white px-8 py-3.5 rounded-xl font-semibold transition-all active:scale-[0.98]"
          >
            Sign In to Sandbox
          </Link>
        </div>

        {/* Hero Visual Mock */}
        <div className="w-full max-w-4xl pt-12 animate-fade-in">
          <div className="glass-dark border border-slate-800 rounded-3xl p-1.5 shadow-2xl overflow-hidden">
            <div className="bg-[#0b0f19] border border-slate-800/80 rounded-[22px] p-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
              
              {/* Left Side: Mock Raw Data Table */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                  <span className="text-[10px] font-mono text-slate-500 ml-2">sales_dataset.csv</span>
                </div>
                <div className="overflow-x-auto text-[11px] font-mono text-slate-400">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500 text-left">
                        <th className="pb-2 pr-4">Date</th>
                        <th className="pb-2 pr-4">Category</th>
                        <th className="pb-2 pr-4">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-800/40">
                        <td className="py-2 pr-4 text-indigo-400">2026-03-01</td>
                        <td className="py-2 pr-4">Electronics</td>
                        <td className="py-2 pr-4 text-emerald-400">$1,500.00</td>
                      </tr>
                      <tr className="border-b border-slate-800/40">
                        <td className="py-2 pr-4 text-indigo-400">2026-03-02</td>
                        <td className="py-2 pr-4">Office Supplies</td>
                        <td className="py-2 pr-4 text-emerald-400">$120.00</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 text-indigo-400">2026-03-03</td>
                        <td className="py-2 pr-4">Electronics</td>
                        <td className="py-2 pr-4 text-emerald-400">$2,400.00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right Side: Mock AI Insight Display */}
              <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-2xl p-5 space-y-3 relative overflow-hidden flex flex-col justify-center">
                <div className="absolute top-[-20%] right-[-20%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-xl" />
                <div className="flex items-center gap-2 text-indigo-400">
                  <Brain className="w-4 h-4 shrink-0" />
                  <span className="text-[10px] font-extrabold uppercase tracking-wider">AI Business Insight</span>
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-slate-200 leading-relaxed font-semibold">
                    &ldquo;Revenue jumped 60% on March 3rd, propelled by a surge in Electronics sales which represent 97% of total revenue. Recommended to secure buffer stock of top-performing items.&rdquo;
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 px-2 py-0.5 rounded-full font-semibold">
                      +60% Growth
                    </span>
                    <span className="text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/10 px-2 py-0.5 rounded-full font-semibold">
                      97% Electronics
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="relative w-full max-w-7xl mx-auto px-6 py-20 border-t border-slate-900 z-10">
        <div className="text-center mb-16 space-y-2">
          <h2 className="text-2xl md:text-3xl font-bold">Comprehensive Capabilities</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Everything you need to turn raw columns into business context.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="glass-dark border border-slate-800/80 rounded-2xl p-6 space-y-4 hover:border-slate-700/80 transition-all group">
            <div className="flex items-center justify-center w-10 h-10 bg-indigo-500/10 rounded-xl border border-indigo-500/15 group-hover:scale-110 transition-transform">
              <Database className="w-5 h-5 text-indigo-400" />
            </div>
            <h3 className="font-bold text-slate-200 text-sm">Clean CSV Parser</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Robust client/server parsing. Strips character errors, fills null cells, standardizes currencies, and formats dates automatically.
            </p>
          </div>

          <div className="glass-dark border border-slate-800/80 rounded-2xl p-6 space-y-4 hover:border-slate-700/80 transition-all group">
            <div className="flex items-center justify-center w-10 h-10 bg-cyan-500/10 rounded-xl border border-cyan-500/15 group-hover:scale-110 transition-transform">
              <BarChart2 className="w-5 h-5 text-cyan-400" />
            </div>
            <h3 className="font-bold text-slate-200 text-sm">Auto Chart Mapping</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Examines headers and data patterns to dynamically select and map Trend Line, Area, Bar, or Pie charts using Recharts.
            </p>
          </div>

          <div className="glass-dark border border-slate-800/80 rounded-2xl p-6 space-y-4 hover:border-slate-700/80 transition-all group">
            <div className="flex items-center justify-center w-10 h-10 bg-violet-500/10 rounded-xl border border-violet-500/15 group-hover:scale-110 transition-transform">
              <Brain className="w-5 h-5 text-violet-400" />
            </div>
            <h3 className="font-bold text-slate-200 text-sm">Gemini AI Explanations</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Converts precalculated stats into clear plain-English reports showing observations, risk warning blocks, and actionable strategies.
            </p>
          </div>

          <div className="glass-dark border border-slate-800/80 rounded-2xl p-6 space-y-4 hover:border-slate-700/80 transition-all group">
            <div className="flex items-center justify-center w-10 h-10 bg-rose-500/10 rounded-xl border border-rose-500/15 group-hover:scale-110 transition-transform">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
            </div>
            <h3 className="font-bold text-slate-200 text-sm">Tenant Database Isolation</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Strict Supabase Row-Level Security (RLS) guarantees complete tenant isolation. No user can ever access another's datasets or logs.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full text-center py-12 border-t border-slate-900 text-slate-600 text-xs">
        <p>&copy; {new Date().getFullYear()} MetricMind AI. Capstone Internship Build.</p>
      </footer>
    </div>
  );
}
