"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import Navbar from "@/components/Navbar";
import ExpandableText from "@/components/ExpandableText";
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
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }
      setUser(user);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [profileRes, resultsRes, trendingRes, channelCountRes, myVideosRes] = await Promise.all([
        supabase.from("profiles").select("youtube_channel_name, my_channel_name, my_channel_thumbnail, my_channel_subs, my_channel_views").eq("id", user.id).single(),
        supabase.from("results").select("*").eq("user_id", user.id).gte("created_at", today.toISOString()).order("outlier_score", { ascending: false }),
        supabase.from("discovery_trending_videos").select("*").eq("user_id", user.id).gte("discovered_at", today.toISOString()).order("views_per_hour", { ascending: false }).limit(20),
        supabase.from("user_channels").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("my_recent_videos").select("*").eq("user_id", user.id).order("published_at", { ascending: false }).limit(4),
      ]);

      setProfile(profileRes.data);
      setResults(resultsRes.data || []);
      setTrending(trendingRes.data || []);
      setMyVideos(myVideosRes.data || []);
      setChannelCount(channelCountRes.count || 0);
      setLoading(false);
    }
    loadData();
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
