"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import Navbar from "@/components/Navbar";

interface VideoResult {
  video_id: string;
  title: string;
  view_count: number;
  published_at: string;
  thumbnail: string;
  status: "pending" | "fetching" | "done" | "no_transcript" | "error";
  transcript?: string;
}

export default function TranscriptsPage() {
  const [channelUrl, setChannelUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [videos, setVideos] = useState<VideoResult[]>([]);
  const [stage, setStage] = useState<"input" | "fetching_videos" | "fetching_transcripts" | "done">("input");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [topN, setTopN] = useState(25);
  const supabase = createClient();

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) window.location.href = "/login";
    }
    checkAuth();
  }, []);

  async function fetchChannelVideos() {
    setLoading(true);
    setError("");
    setStage("fetching_videos");
    setVideos([]);
    setProgress(0);

    try {
      let channelId = channelUrl.trim();
      const patterns = [
        /youtube\.com\/channel\/([a-zA-Z0-9_-]+)/,
        /youtube\.com\/@([a-zA-Z0-9_-]+)/,
        /youtube\.com\/c\/([a-zA-Z0-9_-]+)/,
        /youtube\.com\/user\/([a-zA-Z0-9_-]+)/,
      ];
      for (const p of patterns) {
        const m = channelUrl.match(p);
        if (m) { channelId = m[1]; break; }
      }

      // Try channel_videos table first, then results table
      const { data: dbVideos } = await supabase
        .from("channel_videos")
        .select("video_id, title, view_count, published_at, thumbnail_url")
        .eq("channel_id", channelId)
        .order("view_count", { ascending: false })
        .limit(topN);

      let videoList: VideoResult[] = [];

      if (dbVideos && dbVideos.length > 0) {
        videoList = dbVideos.map((v) => ({
          video_id: v.video_id,
          title: v.title,
          view_count: v.view_count || 0,
          published_at: v.published_at || "",
          thumbnail: v.thumbnail_url || `https://img.youtube.com/vi/${v.video_id}/mqdefault.jpg`,
          status: "pending" as const,
        }));
      } else {
        const { data: resultVideos } = await supabase
          .from("results")
          .select("video_id, title, view_count, created_at")
          .eq("channel_name", channelId)
          .order("view_count", { ascending: false })
          .limit(topN);

        if (resultVideos && resultVideos.length > 0) {
          videoList = resultVideos.map((v) => ({
            video_id: v.video_id,
            title: v.title,
            view_count: v.view_count || 0,
            published_at: v.created_at || "",
            thumbnail: `https://img.youtube.com/vi/${v.video_id}/mqdefault.jpg`,
            status: "pending" as const,
          }));
        }
      }

      if (videoList.length === 0) {
        setError("No videos found for this channel. The channel may need to be tracked first, or try the exact channel ID.");
        setStage("input");
        setLoading(false);
        return;
      }

      setVideos(videoList);
      setStage("fetching_transcripts");

      for (let i = 0; i < videoList.length; i++) {
        const video = videoList[i];

        setVideos((prev) => prev.map((v, idx) =>
          idx === i ? { ...v, status: "fetching" } : v
        ));

        try {
          const { data: dbTranscript } = await supabase
            .from("my_recent_videos")
            .select("transcript")
            .eq("video_id", video.video_id)
            .single();

          if (dbTranscript?.transcript) {
            setVideos((prev) => prev.map((v, idx) =>
              idx === i ? { ...v, status: "done", transcript: dbTranscript.transcript } : v
            ));
          } else {
            setVideos((prev) => prev.map((v, idx) =>
              idx === i ? { ...v, status: "no_transcript" } : v
            ));
          }
        } catch {
          setVideos((prev) => prev.map((v, idx) =>
            idx === i ? { ...v, status: "no_transcript" } : v
          ));
        }

        setProgress(i + 1);
      }

      setStage("done");
      setLoading(false);
    } catch {
      setError("Failed to fetch channel videos. Please try again.");
      setStage("input");
      setLoading(false);
    }
  }

  function downloadTranscript(video: VideoResult) {
    if (!video.transcript) return;
    const content = [
      video.title, "=".repeat(video.title.length), "",
      `Views: ${video.view_count.toLocaleString()}`,
      `Published: ${video.published_at ? new Date(video.published_at).toLocaleDateString() : "Unknown"}`,
      `URL: https://www.youtube.com/watch?v=${video.video_id}`,
      "", "---", "", video.transcript,
    ].join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${video.title.replace(/[^a-zA-Z0-9 ]/g, "").substring(0, 60)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadAllTranscripts() {
    const withTranscripts = videos.filter((v) => v.status === "done" && v.transcript);
    if (withTranscripts.length === 0) return;
    const sections = withTranscripts.map((v, i) => [
      `[${i + 1}/${withTranscripts.length}] ${v.title}`,
      "=".repeat(80),
      `Views: ${v.view_count.toLocaleString()}`,
      `Published: ${v.published_at ? new Date(v.published_at).toLocaleDateString() : "Unknown"}`,
      `URL: https://www.youtube.com/watch?v=${v.video_id}`,
      "", v.transcript, "", "",
    ].join("\n"));
    const blob = new Blob([sections.join("\n")], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transcripts-all.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  const fmtNum = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(0) + "K";
    return n.toString();
  };

  const doneCount = videos.filter((v) => v.status === "done").length;
  const noTranscriptCount = videos.filter((v) => v.status === "no_transcript").length;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">Transcript Lab</h1>
          <p className="text-lg mt-1" style={{ color: "var(--text-tertiary)" }}>
            Pull transcripts from a channel&apos;s top videos by view count
          </p>
        </div>

        {/* Input */}
        <div className="rounded-lg p-5 mb-8" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
          <div className="flex gap-3 mb-4">
            <input
              type="text"
              value={channelUrl}
              onChange={(e) => setChannelUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !loading) fetchChannelVideos(); }}
              placeholder="Paste YouTube channel URL (e.g., youtube.com/@MrBeast)"
              className="flex-1 px-4 py-3 rounded-md text-base"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: "var(--text-primary)", outline: "none" }}
              disabled={loading}
            />
            <button
              onClick={fetchChannelVideos}
              disabled={loading || !channelUrl.trim()}
              className="px-6 py-3 rounded-md text-base font-semibold disabled:opacity-50"
              style={{ background: "var(--gold)", color: "var(--bg-primary)" }}
            >
              {loading ? "Working..." : "Pull Transcripts"}
            </button>
          </div>
          <div className="flex items-center gap-4">
            <label className="text-base" style={{ color: "var(--text-muted)" }}>Top videos:</label>
            {[10, 25, 50].map((n) => (
              <button
                key={n}
                onClick={() => setTopN(n)}
                disabled={loading}
                className="px-3 py-1 rounded text-base font-medium"
                style={{
                  color: topN === n ? "var(--gold)" : "var(--text-muted)",
                  background: topN === n ? "var(--gold-bg)" : "transparent",
                  border: topN === n ? "1px solid var(--gold-border)" : "1px solid transparent",
                }}
              >
                {n}
              </button>
            ))}
          </div>
          {error && <p className="text-base mt-3" style={{ color: "var(--red)" }}>{error}</p>}
        </div>

        {/* Progress */}
        {stage !== "input" && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-base font-medium">
                {stage === "fetching_videos" && "Finding top videos..."}
                {stage === "fetching_transcripts" && `Fetching transcripts (${progress}/${videos.length})...`}
                {stage === "done" && `Complete — ${doneCount} transcript${doneCount !== 1 ? "s" : ""} found`}
              </span>
              {stage === "done" && doneCount > 0 && (
                <button
                  onClick={downloadAllTranscripts}
                  className="flex items-center gap-2 px-4 py-2 rounded-md text-base font-semibold"
                  style={{ background: "var(--gold)", color: "var(--bg-primary)" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download All ({doneCount})
                </button>
              )}
            </div>
            <div className="w-full h-2 rounded-full" style={{ background: "var(--bg-elevated)" }}>
              <div
                className="h-2 rounded-full transition-all"
                style={{ background: "var(--gold)", width: videos.length > 0 ? `${(progress / videos.length) * 100}%` : "0%" }}
              />
            </div>
            {stage === "done" && noTranscriptCount > 0 && (
              <p className="text-base mt-2" style={{ color: "var(--text-muted)" }}>
                {noTranscriptCount} video{noTranscriptCount !== 1 ? "s" : ""} had no transcript available.
              </p>
            )}
          </div>
        )}

        {/* Video List */}
        {videos.length > 0 && (
          <div className="space-y-2">
            {videos.map((v, i) => (
              <div
                key={v.video_id}
                className="rounded-lg px-5 py-4"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
              >
                <div className="flex items-center gap-4">
                  <span className="text-base font-mono font-bold shrink-0 w-8" style={{ color: "var(--text-muted)" }}>
                    {i + 1}
                  </span>
                  <img src={v.thumbnail} alt="" className="w-24 h-[54px] object-cover rounded-md shrink-0" />
                  <div className="flex-1 min-w-0">
                    <a
                      href={`https://www.youtube.com/watch?v=${v.video_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-base font-medium hover:text-[var(--gold)] transition-colors line-clamp-1"
                    >
                      {v.title}
                    </a>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-base font-mono" style={{ color: "var(--text-muted)" }}>{fmtNum(v.view_count)} views</span>
                      {v.published_at && (
                        <span className="text-base" style={{ color: "var(--text-muted)" }}>
                          {new Date(v.published_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0">
                    {v.status === "pending" && (
                      <span className="text-base" style={{ color: "var(--text-muted)" }}>Waiting</span>
                    )}
                    {v.status === "fetching" && (
                      <span className="text-base" style={{ color: "var(--gold)" }}>Fetching...</span>
                    )}
                    {v.status === "done" && (
                      <button
                        onClick={() => downloadTranscript(v)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded text-base font-medium"
                        style={{ color: "var(--green)", background: "var(--green-bg)" }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Download
                      </button>
                    )}
                    {v.status === "no_transcript" && (
                      <span className="text-base px-3 py-1.5 rounded" style={{ color: "var(--text-muted)", background: "var(--bg-elevated)" }}>
                        No transcript
                      </span>
                    )}
                    {v.status === "error" && (
                      <span className="text-base" style={{ color: "var(--red)" }}>Error</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
