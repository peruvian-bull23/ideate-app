"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import Navbar from "@/components/Navbar";
import ExpandableText from "@/components/ExpandableText";

interface SavedVideo {
  id: string;
  video_id: string;
  title: string;
  channel_name: string;
  link: string;
  view_count: number;
  outlier_score: number | null;
  summary: string | null;
  sentiment: string | null;
  thumbnail: string | null;
  saved_at: string;
}

export default function SavedPage() {
  const [videos, setVideos] = useState<SavedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => { loadSaved(); }, []);

  async function loadSaved() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = "/login"; return; }

    const { data } = await supabase
      .from("saved_videos").select("*")
      .eq("user_id", user.id)
      .order("saved_at", { ascending: false });

    setVideos(data || []);
    setLoading(false);
  }

  async function unsave(videoId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("saved_videos").delete().eq("user_id", user.id).eq("video_id", videoId);
    setVideos((prev) => prev.filter((v) => v.video_id !== videoId));
  }

  const fmtNum = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(0) + "K";
    return n.toString();
  };

  const sentimentStyle = (s: string | null) => {
    switch (s?.toLowerCase()) {
      case "bullish": return { color: "var(--green)", background: "var(--green-bg)" };
      case "bearish": return { color: "var(--red)", background: "var(--red-bg)" };
      default: return { color: "var(--text-tertiary)", background: "var(--bg-elevated)" };
    }
  };

  const timeAgo = (dateStr: string) => {
    const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return days + "d ago";
    if (days < 30) return Math.floor(days / 7) + "w ago";
    return Math.floor(days / 30) + "mo ago";
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

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">Saved</h1>
          <p className="text-lg mt-1" style={{ color: "var(--text-tertiary)" }}>
            Videos you&apos;ve bookmarked for later
          </p>
        </div>

        {videos.length === 0 ? (
          <div className="rounded-lg p-12 text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
            <p className="text-base" style={{ color: "var(--text-tertiary)" }}>
              No saved videos yet. Click the bookmark icon on any video card to save it here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {videos.map((v) => {
              const thumb = v.thumbnail || `https://img.youtube.com/vi/${v.video_id}/mqdefault.jpg`;

              return (
                <div
                  key={v.id}
                  className="rounded-lg p-5"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
                >
                  <div className="flex items-start gap-4">
                    <a href={v.link} target="_blank" rel="noopener noreferrer" className="shrink-0">
                      <img src={thumb} alt="" className="w-40 h-[90px] object-cover rounded-md" />
                    </a>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <a
                          href={v.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-2xl leading-snug hover:text-[var(--gold)] transition-colors line-clamp-2"
                        >
                          {v.title}
                        </a>
                        <div className="flex items-center gap-2 shrink-0">
                          {v.sentiment && (
                            <span
                              className="text-base font-semibold px-2.5 py-0.5 rounded"
                              style={sentimentStyle(v.sentiment)}
                            >
                              {v.sentiment.toUpperCase()}
                            </span>
                          )}
                          <button
                            onClick={() => unsave(v.video_id)}
                            className="p-1.5 rounded-md"
                            style={{ color: "var(--gold)", background: "var(--gold-bg)" }}
                            title="Remove from saved"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <p className="text-base mt-1" style={{ color: "var(--text-tertiary)" }}>{v.channel_name}</p>

                      <div className="flex items-center gap-5 mt-3">
                        <div>
                          <span className="text-lg font-bold font-mono">{fmtNum(v.view_count)}</span>
                          <span className="text-base ml-1" style={{ color: "var(--text-muted)" }}>views</span>
                        </div>
                        {v.outlier_score && v.outlier_score > 0 && (
                          <div>
                            <span className="text-lg font-bold font-mono" style={{ color: "var(--gold)" }}>
                              {v.outlier_score.toFixed(1)}x
                            </span>
                            <span className="text-base ml-1" style={{ color: "var(--text-muted)" }}>score</span>
                          </div>
                        )}
                        <span className="text-base" style={{ color: "var(--text-muted)" }}>
                          Saved {timeAgo(v.saved_at)}
                        </span>
                      </div>

                      {v.summary && (
                        <ExpandableText
                          text={v.summary}
                          className="text-base mt-3 leading-relaxed"
                          style={{ color: "var(--text-secondary)" }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-8 text-center text-base font-mono" style={{ color: "var(--text-muted)" }}>
          {videos.length} saved video{videos.length !== 1 ? "s" : ""}
        </div>
      </main>
    </div>
  );
}
