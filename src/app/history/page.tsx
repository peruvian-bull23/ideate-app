"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import Navbar from "@/components/Navbar";
import ExpandableText from "@/components/ExpandableText";
import BookmarkButton from "@/components/BookmarkButton";

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

interface TrendingVideo {
  id: number;
  video_id: string;
  title: string;
  channel_name: string;
  view_count: number;
  views_per_hour: number;
  link: string;
  thumbnail: string;
  relevance_score: number;
  relevance_reason: string;
  discovered_at: string;
}

interface DayData {
  outliers: Result[];
  trending: TrendingVideo[];
}

export default function HistoryPage() {
  const [days, setDays] = useState<Map<string, DayData>>(new Map());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadHistory() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }

      const [resultsRes, trendingRes, savedRes] = await Promise.all([
        supabase.from("results").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(200),
        supabase.from("discovery_trending_videos").select("*").eq("user_id", user.id).order("discovered_at", { ascending: false }).limit(200),
        supabase.from("saved_videos").select("video_id").eq("user_id", user.id),
      ]);

      const dayMap = new Map<string, DayData>();

      (resultsRes.data || []).forEach((r) => {
        const d = new Date(r.created_at).toDateString();
        if (!dayMap.has(d)) dayMap.set(d, { outliers: [], trending: [] });
        dayMap.get(d)!.outliers.push(r);
      });

      (trendingRes.data || []).forEach((t) => {
        const d = new Date(t.discovered_at).toDateString();
        if (!dayMap.has(d)) dayMap.set(d, { outliers: [], trending: [] });
        dayMap.get(d)!.trending.push(t);
      });

      setDays(dayMap);
      setSavedIds(new Set((savedRes.data || []).map((s) => s.video_id)));
      setLoading(false);
    }
    loadHistory();
  }, []);

  const fmtNum = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(0) + "K";
    return n.toString();
  };

  const fmtVPH = (v: number) => {
    if (!v) return "—";
    if (v >= 1000) return (v / 1000).toFixed(1) + "K/hr";
    return v.toFixed(0) + "/hr";
  };

  const handleBookmarkToggle = (videoId: string, saved: boolean) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (saved) next.add(videoId); else next.delete(videoId);
      return next;
    });
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

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
          <div className="text-base" style={{ color: "var(--text-muted)" }}>Loading...</div>
        </div>
      </div>
    );
  }

  const sortedDates = [...days.keys()].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  const totalResults = [...days.values()].reduce((sum, d) => sum + d.outliers.length + d.trending.length, 0);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">History</h1>
          <p className="text-lg mt-1" style={{ color: "var(--text-tertiary)" }}>
            Browse past outliers and trending videos
          </p>
        </div>

        {sortedDates.length === 0 ? (
          <div className="rounded-lg p-12 text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
            <p className="text-base" style={{ color: "var(--text-tertiary)" }}>
              No history yet. Results will appear after your first scan.
            </p>
          </div>
        ) : (
          <div className="space-y-0">
            {sortedDates.map((date, idx) => {
              const day = days.get(date)!;
              return (
                <div key={date}>
                  {/* Divider between days */}
                  {idx > 0 && (
                    <div className="my-8" style={{ borderTop: "1px solid var(--border-default)" }} />
                  )}
                  {/* Date header */}
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                      {formatDate(date)}
                    </h2>
                    {day.outliers.length > 0 && (
                      <span className="text-base font-mono px-2 py-0.5 rounded" style={{ color: "var(--gold)", background: "var(--gold-bg)" }}>
                        {day.outliers.length} outlier{day.outliers.length !== 1 ? "s" : ""}
                      </span>
                    )}
                    {day.trending.length > 0 && (
                      <span className="text-base font-mono px-2 py-0.5 rounded" style={{ color: "var(--cyan)", background: "var(--cyan-bg)" }}>
                        {day.trending.length} trending
                      </span>
                    )}
                  </div>

                  {/* Outliers for this day */}
                  {day.outliers.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {day.outliers.map((r) => (
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
                                  alt="" className="w-32 h-[72px] object-cover rounded-md"
                                />
                              </a>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-3">
                                <a href={r.link} target="_blank" rel="noopener noreferrer" className="text-2xl font-bold hover:text-[var(--gold)] transition-colors line-clamp-1">
                                  {r.title}
                                </a>
                                <div className="flex items-center gap-3 shrink-0">
                                  <span className="text-base font-mono font-semibold">{fmtNum(r.view_count)}</span>
                                  <span className="text-base font-mono font-semibold" style={{ color: "var(--gold)" }}>
                                    {r.outlier_score.toFixed(1)}x
                                  </span>
                                  <span className="text-base font-semibold px-2 py-0.5 rounded" style={sentimentStyle(r.sentiment)}>
                                    {r.sentiment?.toUpperCase() || "NEUTRAL"}
                                  </span>
                                  <BookmarkButton
                                    videoId={r.video_id}
                                    title={r.title}
                                    channelName={r.channel_name}
                                    link={r.link}
                                    viewCount={r.view_count}
                                    outlierScore={r.outlier_score}
                                    summary={r.summary}
                                    sentiment={r.sentiment}
                                    isSaved={savedIds.has(r.video_id)}
                                    onToggle={handleBookmarkToggle}
                                  />
                                </div>
                              </div>
                              <p className="text-base mt-1" style={{ color: "var(--text-muted)" }}>{r.channel_name}</p>
                              {r.summary && (
                                <ExpandableText
                                  text={r.summary}
                                  className="text-base mt-2 leading-relaxed"
                                  style={{ color: "var(--text-tertiary)" }}
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Trending for this day */}
                  {day.trending.length > 0 && (
                    <div className="space-y-2">
                      {day.outliers.length > 0 && (
                        <p className="text-base font-semibold uppercase tracking-wider mt-2 mb-2" style={{ color: "var(--text-muted)" }}>
                          Trending
                        </p>
                      )}
                      {day.trending.map((v) => (
                        <div
                          key={v.id}
                          className="rounded-lg px-5 py-4"
                          style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
                        >
                          <div className="flex items-start gap-4">
                            {v.thumbnail ? (
                              <a href={v.link} target="_blank" rel="noopener noreferrer" className="shrink-0">
                                <img src={v.thumbnail} alt="" className="w-32 h-[72px] object-cover rounded-md" />
                              </a>
                            ) : v.video_id ? (
                              <a href={v.link} target="_blank" rel="noopener noreferrer" className="shrink-0">
                                <img
                                  src={`https://img.youtube.com/vi/${v.video_id}/mqdefault.jpg`}
                                  alt="" className="w-32 h-[72px] object-cover rounded-md"
                                />
                              </a>
                            ) : null}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-3">
                                <a href={v.link} target="_blank" rel="noopener noreferrer" className="text-2xl font-bold hover:text-[var(--gold)] transition-colors line-clamp-1">
                                  {v.title}
                                </a>
                                <div className="flex items-center gap-3 shrink-0">
                                  <span className="text-base font-mono font-semibold">{fmtNum(v.view_count)}</span>
                                  <span className="text-base font-mono font-semibold" style={{ color: "var(--cyan)" }}>
                                    {fmtVPH(v.views_per_hour)}
                                  </span>
                                  {v.relevance_score > 0 && (
                                    <span
                                      className="text-base font-mono font-medium px-2 py-0.5 rounded"
                                      style={{
                                        color: v.relevance_score >= 8 ? "var(--green)" : v.relevance_score >= 5 ? "var(--gold)" : "var(--text-tertiary)",
                                        background: v.relevance_score >= 8 ? "var(--green-bg)" : v.relevance_score >= 5 ? "var(--gold-bg)" : "var(--bg-elevated)",
                                      }}
                                    >
                                      {v.relevance_score.toFixed(0)}/10
                                    </span>
                                  )}
                                  <BookmarkButton
                                    videoId={v.video_id}
                                    title={v.title}
                                    channelName={v.channel_name}
                                    link={v.link}
                                    viewCount={v.view_count}
                                    thumbnail={v.thumbnail}
                                    isSaved={savedIds.has(v.video_id)}
                                    onToggle={handleBookmarkToggle}
                                  />
                                </div>
                              </div>
                              <p className="text-base mt-1" style={{ color: "var(--text-muted)" }}>{v.channel_name}</p>
                              {v.relevance_reason && (
                                <ExpandableText
                                  text={v.relevance_reason}
                                  className="text-base mt-2 leading-relaxed"
                                  style={{ color: "var(--text-tertiary)" }}
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-8 text-center text-base font-mono" style={{ color: "var(--text-muted)" }}>
          {totalResults} result{totalResults !== 1 ? "s" : ""}
        </div>
      </main>
    </div>
  );
}
