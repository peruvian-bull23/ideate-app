"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import Navbar from "@/components/Navbar";

interface Result {
  id: number;
  video_id: string;
  title: string;
  channel_name: string;
  view_count: number;
  outlier_score: number;
  link: string;
  summary: string;
  sentiment: string;
  created_at: string;
}

interface GroupedResults { [date: string]: Result[]; }

export default function HistoryPage() {
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadHistory() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }

      const { data } = await supabase
        .from("results").select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200);

      setResults(data || []);
      setLoading(false);
    }
    loadHistory();
  }, []);

  const fmtNum = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(0) + "K";
    return n.toString();
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  const groupByDate = (r: Result[]): GroupedResults =>
    r.reduce((g: GroupedResults, item) => {
      const d = new Date(item.created_at).toDateString();
      (g[d] = g[d] || []).push(item);
      return g;
    }, {});

  const sentimentStyle = (s: string) => {
    switch (s?.toLowerCase()) {
      case "bullish": return { color: "var(--green)", background: "var(--green-bg)" };
      case "bearish": return { color: "var(--red)", background: "var(--red-bg)" };
      default: return { color: "var(--text-tertiary)", background: "var(--bg-elevated)" };
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="text-sm" style={{ color: "var(--text-muted)" }}>Loading...</div>
        </div>
      </div>
    );
  }

  const grouped = groupByDate(results);
  const dates = Object.keys(grouped);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">History</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-tertiary)" }}>
            Browse past outlier results
          </p>
        </div>

        {results.length === 0 ? (
          <div className="rounded-lg p-12 text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
            <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
              No history yet. Results will appear after your first scan.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {dates.map((date) => (
              <div key={date}>
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                    {formatDate(date)}
                  </h2>
                  <span
                    className="text-[11px] font-mono px-2 py-0.5 rounded"
                    style={{ color: "var(--gold)", background: "var(--gold-bg)" }}
                  >
                    {grouped[date].length}
                  </span>
                </div>

                <div className="space-y-2">
                  {grouped[date].map((r) => (
                    <div
                      key={r.id}
                      className="rounded-lg px-5 py-4"
                      style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
                    >
                      <div className="flex items-start gap-4">
                        {r.video_id && (
                          <a href={r.link} target="_blank" rel="noopener noreferrer" className="shrink-0">
                            <img
                              src={`https://img.youtube.com/vi/${r.video_id}/mqdefault.jpg`}
                              alt=""
                              className="w-32 h-[72px] object-cover rounded-md"
                            />
                          </a>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <a
                              href={r.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[13px] font-medium hover:text-[var(--gold)] transition-colors line-clamp-1"
                            >
                              {r.title}
                            </a>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-xs font-mono font-semibold">{fmtNum(r.view_count)}</span>
                              <span className="text-xs font-mono font-semibold" style={{ color: "var(--gold)" }}>
                                {r.outlier_score.toFixed(1)}x
                              </span>
                              <span
                                className="text-[10px] font-medium px-2 py-0.5 rounded"
                                style={sentimentStyle(r.sentiment)}
                              >
                                {r.sentiment?.toUpperCase() || "NEUTRAL"}
                              </span>
                            </div>
                          </div>
                          <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>{r.channel_name}</p>
                          {r.summary && (
                            <p className="text-xs mt-2 line-clamp-2 leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
                              {r.summary}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 text-center text-[11px] font-mono" style={{ color: "var(--text-muted)" }}>
          {results.length} result{results.length !== 1 ? "s" : ""}
        </div>
      </main>
    </div>
  );
}
