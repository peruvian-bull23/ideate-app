"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import Navbar from "@/components/Navbar";
import ExpandableText from "@/components/ExpandableText";
import BookmarkButton from "@/components/BookmarkButton";
import { User } from "@supabase/supabase-js";

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
  key_claims: string[];
  used_view_curve: boolean;
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

interface Profile {
  youtube_channel_name: string | null;
  my_channel_name: string | null;
  my_channel_thumbnail: string | null;
  my_channel_subs: number | null;
  my_channel_views: number | null;
  trending_min_views_per_hour: number | null;
  trending_english_only: boolean | null;
  trending_max_age_hours: number | null;
  email_schedule: string | null;
}

interface MyVideo {
  id: string;
  video_id: string;
  title: string;
  thumbnail: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  published_at: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [trending, setTrending] = useState<TrendingVideo[]>([]);
  const [myVideos, setMyVideos] = useState<MyVideo[]>([]);
  const [channelCount, setChannelCount] = useState(0);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [lastEmailAt, setLastEmailAt] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<{ completed_at: string; status: string; videos_found: number; videos_analyzed: number } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }
      setUser(user);

      // Load profile first to get trending preferences
      const profileRes = await supabase.from("profiles").select("youtube_channel_name, my_channel_name, my_channel_thumbnail, my_channel_subs, my_channel_views, trending_min_views_per_hour, trending_english_only, trending_max_age_hours, email_schedule, onboarding_completed").eq("id", user.id).single();
      const prof = profileRes.data;

      // Check if onboarding needed
      if (!prof?.onboarding_completed) {
        window.location.href = "/onboarding";
        return;
      }

      setProfile(prof);

      const minVPH = prof?.trending_min_views_per_hour ?? 500;
      const maxAgeHours = prof?.trending_max_age_hours ?? 48;
      const englishOnly = prof?.trending_english_only ?? true;

      const cutoff = new Date();
      cutoff.setHours(cutoff.getHours() - maxAgeHours);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let trendingQuery = supabase.from("discovery_trending_videos").select("*").eq("user_id", user.id).gte("discovered_at", cutoff.toISOString()).gte("views_per_hour", minVPH);
      if (englishOnly) {
        trendingQuery = trendingQuery.eq("language", "en");
      }
      trendingQuery = trendingQuery.order("views_per_hour", { ascending: false }).limit(20);

      const [resultsRes, trendingRes, channelCountRes, myVideosRes, savedRes, lastEmailRes, lastScanRes] = await Promise.all([
        supabase.from("results").select("*").eq("user_id", user.id).gte("created_at", today.toISOString()).order("outlier_score", { ascending: false }),
        trendingQuery,
        supabase.from("user_channels").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("my_recent_videos").select("*").eq("user_id", user.id).order("published_at", { ascending: false }).limit(4),
        supabase.from("saved_videos").select("video_id").eq("user_id", user.id),
        supabase.from("emailed_videos").select("emailed_at").eq("user_id", user.id).order("emailed_at", { ascending: false }).limit(1),
        supabase.from("scans").select("completed_at, status, videos_found, videos_analyzed").eq("user_id", user.id).order("completed_at", { ascending: false }).limit(1),
      ]);

      setResults(resultsRes.data || []);
      setTrending(trendingRes.data || []);
      setMyVideos(myVideosRes.data || []);
      setChannelCount(channelCountRes.count || 0);
      setSavedIds(new Set((savedRes.data || []).map((s) => s.video_id)));
      if (lastEmailRes.data && lastEmailRes.data.length > 0) setLastEmailAt(lastEmailRes.data[0].emailed_at);
      if (lastScanRes.data && lastScanRes.data.length > 0) setLastScan(lastScanRes.data[0]);
      setLoading(false);
    }
    loadData();
  }, []);

  const fmtNum = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(0) + "K";
    return n.toString();
  };

  const handleBookmarkToggle = (videoId: string, saved: boolean) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (saved) next.add(videoId); else next.delete(videoId);
      return next;
    });
  };

  const fmtVPH = (v: number) => {
    if (!v) return "—";
    if (v >= 1000) return (v / 1000).toFixed(1) + "K/hr";
    return v.toFixed(0) + "/hr";
  };

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
          <div style={{ color: "var(--text-muted)" }} className="text-base">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <Navbar />

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">
            Welcome back{profile?.youtube_channel_name ? `, ${profile.youtube_channel_name}` : ""}
          </h1>
          <p style={{ color: "var(--text-tertiary)" }} className="text-base mt-1">
            Your daily briefing
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          {[
            { label: "Outliers Today", value: results.length, color: "var(--gold)" },
            { label: "Channels Tracked", value: channelCount, color: "var(--text-secondary)" },
            { label: "Top Score", value: results.length > 0 ? results[0].outlier_score.toFixed(1) + "x" : "—", color: "var(--gold-light)" },
            { label: "Trending Today", value: trending.length, color: "var(--text-secondary)" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg px-5 py-4"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
            >
              <div className="text-2xl font-semibold font-mono" style={{ color: stat.color }}>
                {stat.value}
              </div>
              <div className="text-base mt-1" style={{ color: "var(--text-muted)" }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Email Digest Status */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
              Email Digest
            </h2>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-md text-base font-medium"
              style={{
                color: showPreview ? "var(--gold)" : "var(--text-muted)",
                background: showPreview ? "var(--gold-bg)" : "var(--bg-elevated)",
                border: showPreview ? "1px solid var(--gold-border)" : "1px solid transparent",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              {showPreview ? "Hide Preview" : "Preview Next Email"}
            </button>
          </div>

          <div
            className="rounded-lg p-5"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
          >
            <div className="flex items-center gap-8">
              <div>
                <span className="text-base" style={{ color: "var(--text-muted)" }}>Last email sent</span>
                <p className="text-lg font-semibold mt-0.5">
                  {lastEmailAt
                    ? new Date(lastEmailAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) + " at " + new Date(lastEmailAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
                    : "No emails sent yet"
                  }
                </p>
              </div>
              <div style={{ width: "1px", height: "36px", background: "var(--border-subtle)" }} />
              <div>
                <span className="text-base" style={{ color: "var(--text-muted)" }}>Last scan</span>
                <p className="text-lg font-semibold mt-0.5">
                  {lastScan
                    ? new Date(lastScan.completed_at).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) + " at " + new Date(lastScan.completed_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
                    : "No scans yet"
                  }
                </p>
              </div>
              <div style={{ width: "1px", height: "36px", background: "var(--border-subtle)" }} />
              <div>
                <span className="text-base" style={{ color: "var(--text-muted)" }}>Schedule</span>
                <p className="text-lg font-semibold mt-0.5" style={{ color: "var(--gold)" }}>
                  {(() => {
                    const scheduleMap: Record<string, string> = {
                      daily: "Daily",
                      weekdays: "Weekdays",
                      weekly_monday: "Weekly (Mon)",
                      weekly_sunday: "Weekly (Sun)",
                      none: "Paused",
                    };
                    return scheduleMap[profile?.email_schedule || "daily"] || "Daily";
                  })()}
                </p>
              </div>
              {lastScan && (
                <>
                  <div style={{ width: "1px", height: "36px", background: "var(--border-subtle)" }} />
                  <div>
                    <span className="text-base" style={{ color: "var(--text-muted)" }}>Last scan found</span>
                    <p className="text-lg font-semibold mt-0.5">
                      {lastScan.videos_found} videos, {lastScan.videos_analyzed} analyzed
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Email Preview */}
          {showPreview && (
            <div
              className="rounded-lg mt-3 overflow-hidden"
              style={{ border: "1px solid var(--border-default)" }}
            >
              {/* Email header */}
              <div className="px-5 py-4" style={{ background: "var(--bg-elevated)", borderBottom: "1px solid var(--border-subtle)" }}>
                <div className="flex items-center gap-3 mb-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--gold)" }}>
                    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
                  </svg>
                  <span className="text-lg font-bold" style={{ color: "var(--gold)" }}>Ideate Daily Digest</span>
                </div>
                <p className="text-base" style={{ color: "var(--text-muted)" }}>
                  {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                  {profile?.youtube_channel_name ? ` — for ${profile.youtube_channel_name}` : ""}
                </p>
              </div>

              <div className="px-5 py-5" style={{ background: "var(--bg-card)" }}>
                {results.length === 0 && trending.length === 0 ? (
                  <p className="text-base text-center py-6" style={{ color: "var(--text-muted)" }}>
                    No outliers or trending videos to include. The email would not be sent today.
                  </p>
                ) : (
                  <div className="space-y-6">
                    {/* Outliers preview */}
                    {results.length > 0 && (
                      <div>
                        <h3 className="text-lg font-bold mb-3">
                          Outlier Videos ({results.length})
                        </h3>
                        <div className="space-y-2">
                          {results.slice(0, 5).map((r) => (
                            <div key={r.id} className="flex items-center gap-3 py-2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                              {r.video_id && (
                                <img
                                  src={`https://img.youtube.com/vi/${r.video_id}/default.jpg`}
                                  alt="" className="w-16 h-12 object-cover rounded"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-base font-medium truncate">{r.title}</p>
                                <p className="text-base" style={{ color: "var(--text-muted)" }}>{r.channel_name}</p>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="text-base font-bold font-mono" style={{ color: "var(--gold)" }}>{r.outlier_score.toFixed(1)}x</span>
                                <p className="text-base font-mono" style={{ color: "var(--text-muted)" }}>{fmtNum(r.view_count)} views</p>
                              </div>
                            </div>
                          ))}
                          {results.length > 5 && (
                            <p className="text-base pt-2" style={{ color: "var(--text-muted)" }}>
                              + {results.length - 5} more outlier{results.length - 5 !== 1 ? "s" : ""}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Trending preview */}
                    {trending.length > 0 && (
                      <div>
                        <h3 className="text-lg font-bold mb-3">
                          Trending in Your Niche ({trending.length})
                        </h3>
                        <div className="space-y-2">
                          {trending.slice(0, 5).map((v) => (
                            <div key={v.id} className="flex items-center gap-3 py-2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                              {v.thumbnail && (
                                <img src={v.thumbnail} alt="" className="w-16 h-12 object-cover rounded" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-base font-medium truncate">{v.title}</p>
                                <p className="text-base" style={{ color: "var(--text-muted)" }}>{v.channel_name}</p>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="text-base font-bold font-mono" style={{ color: "var(--cyan)" }}>{fmtVPH(v.views_per_hour)}</span>
                                <p className="text-base font-mono" style={{ color: "var(--text-muted)" }}>{fmtNum(v.view_count)} views</p>
                              </div>
                            </div>
                          ))}
                          {trending.length > 5 && (
                            <p className="text-base pt-2" style={{ color: "var(--text-muted)" }}>
                              + {trending.length - 5} more trending video{trending.length - 5 !== 1 ? "s" : ""}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="px-5 py-3 text-center" style={{ background: "var(--bg-elevated)", borderTop: "1px solid var(--border-subtle)" }}>
                <p className="text-base" style={{ color: "var(--text-muted)" }}>
                  This is a preview of what your next email digest would contain.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* My Channel */}
        {profile?.my_channel_name && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
              Your Channel
            </h2>
            <div
              className="rounded-lg p-5"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
            >
              <div className="flex items-center gap-4 mb-5">
                {profile.my_channel_thumbnail ? (
                  <img src={profile.my_channel_thumbnail} alt="" className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full" style={{ background: "var(--bg-elevated)" }} />
                )}
                <div>
                  <h3 className="font-semibold text-[15px]">{profile.my_channel_name}</h3>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-base" style={{ color: "var(--text-tertiary)" }}>
                      {fmtNum(profile.my_channel_subs || 0)} subscribers
                    </span>
                    <span style={{ color: "var(--text-muted)" }}>·</span>
                    <span className="text-base" style={{ color: "var(--text-tertiary)" }}>
                      {fmtNum(profile.my_channel_views || 0)} views
                    </span>
                  </div>
                </div>
              </div>

              {myVideos.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {myVideos.map((v) => (
                    <a
                      key={v.id}
                      href={`https://www.youtube.com/watch?v=${v.video_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group"
                    >
                      {v.thumbnail && (
                        <img
                          src={v.thumbnail}
                          alt=""
                          className="w-full aspect-video object-cover rounded-md mb-2 group-hover:opacity-80 transition-opacity"
                        />
                      )}
                      <p className="text-lg font-bold line-clamp-2 leading-snug group-hover:text-[var(--gold)] transition-colors">
                        {v.title}
                      </p>
                      <p className="text-base mt-1 font-mono" style={{ color: "var(--text-muted)" }}>
                        {fmtNum(v.view_count)} views
                      </p>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Outliers */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
            Today&apos;s Outliers
          </h2>

          {results.length === 0 ? (
            <div
              className="rounded-lg p-10 text-center"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
            >
              <p className="text-base" style={{ color: "var(--text-tertiary)" }}>
                No outliers found today.
                {channelCount === 0 && (
                  <> <a href="/channels" style={{ color: "var(--gold)" }} className="hover:underline">Add channels</a> to start scanning.</>
                )}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((r) => (
                <div
                  key={r.id}
                  className="rounded-lg p-5"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
                >
                  <div className="flex items-start gap-4">
                    {r.video_id && (
                      <a href={r.link} target="_blank" rel="noopener noreferrer" className="shrink-0">
                        <img
                          src={`https://img.youtube.com/vi/${r.video_id}/mqdefault.jpg`}
                          alt=""
                          className="w-40 h-[90px] object-cover rounded-md"
                        />
                      </a>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <a
                          href={r.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-2xl leading-snug hover:text-[var(--gold)] transition-colors line-clamp-1"
                        >
                          {r.title}
                        </a>
                        <span
                          className="shrink-0 px-2.5 py-0.5 rounded text-base font-medium"
                          style={sentimentStyle(r.sentiment)}
                        >
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
                      <p className="text-base mt-1" style={{ color: "var(--text-tertiary)" }}>{r.channel_name}</p>

                      <div className="flex items-center gap-5 mt-3">
                        <div>
                          <span className="text-lg font-bold font-mono">{fmtNum(r.view_count)}</span>
                          <span className="text-base ml-1" style={{ color: "var(--text-muted)" }}>views</span>
                        </div>
                        <div>
                          <span className="text-lg font-bold font-mono" style={{ color: "var(--gold)" }}>
                            {r.outlier_score.toFixed(1)}x
                          </span>
                          <span className="text-base ml-1" style={{ color: "var(--text-muted)" }}>score</span>
                        </div>
                        <span
                          className="text-base font-medium px-2.5 py-0.5 rounded"
                          style={r.used_view_curve
                            ? { color: "var(--green)", background: "var(--green-bg)" }
                            : { color: "var(--gold)", background: "var(--gold-bg)" }
                          }
                        >
                          {r.used_view_curve ? "✓ View Curve" : "↗ Estimated"}
                        </span>
                      </div>

                      {r.summary && (
                        <ExpandableText
                          text={r.summary}
                          className="text-base mt-3 leading-relaxed"
                          style={{ color: "var(--text-secondary)" }}
                        />
                      )}

                      {r.key_claims && r.key_claims.length > 0 && (
                        <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--border-subtle)" }}>
                          {r.key_claims.slice(0, 3).map((c, i) => (
                            <p key={i} className="text-base leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
                              → {c}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Trending */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
              Trending in Your Niche
            </h2>
            {trending.length > 0 && (
              <span className="text-base font-mono" style={{ color: "var(--text-muted)" }}>
                {trending.length} videos
              </span>
            )}
          </div>

          {trending.length === 0 ? (
            <div
              className="rounded-lg p-10 text-center"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
            >
              <p className="text-base" style={{ color: "var(--text-tertiary)" }}>
                No trending videos today. Set your{" "}
                <a href="/settings" style={{ color: "var(--gold)" }} className="hover:underline">discovery keywords</a>
                {" "}to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {trending.map((v) => (
                <div
                  key={v.id}
                  className="rounded-lg p-5"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
                >
                  <div className="flex items-start gap-4">
                    {v.thumbnail && (
                      <a href={v.link} target="_blank" rel="noopener noreferrer" className="shrink-0">
                        <img src={v.thumbnail} alt="" className="w-40 h-[90px] object-cover rounded-md" />
                      </a>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <a
                          href={v.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-2xl leading-snug hover:text-[var(--gold)] transition-colors line-clamp-1"
                        >
                          {v.title}
                        </a>
                        {v.relevance_score > 0 && (
                          <div
                            className="shrink-0 text-base font-mono font-bold px-2 py-0.5 rounded"
                            style={{
                              color: v.relevance_score >= 8 ? "var(--green)" : v.relevance_score >= 5 ? "var(--gold)" : "var(--text-tertiary)",
                              background: v.relevance_score >= 8 ? "var(--green-bg)" : v.relevance_score >= 5 ? "var(--gold-bg)" : "var(--bg-elevated)",
                            }}
                          >
                            {v.relevance_score.toFixed(0)}/10
                          </div>
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
                      <p className="text-base mt-1" style={{ color: "var(--text-tertiary)" }}>{v.channel_name}</p>

                      <div className="flex items-center gap-5 mt-3">
                        <div>
                          <span className="text-lg font-bold font-mono">{fmtNum(v.view_count)}</span>
                          <span className="text-base ml-1" style={{ color: "var(--text-muted)" }}>views</span>
                        </div>
                        <div>
                          <span className="text-lg font-bold font-mono" style={{ color: "var(--cyan)" }}>{fmtVPH(v.views_per_hour)}</span>
                          <span className="text-base ml-1" style={{ color: "var(--text-muted)" }}>velocity</span>
                        </div>
                      </div>

                      {v.relevance_reason && (
                        <ExpandableText
                          text={v.relevance_reason}
                          className="text-base mt-3 leading-relaxed"
                          style={{ color: "var(--text-secondary)" }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
