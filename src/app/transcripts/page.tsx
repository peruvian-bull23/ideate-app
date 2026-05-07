"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import Navbar from "@/components/Navbar";

interface VideoResult {
  video_id: string;
  channel_id: string;
  channel_name: string;
  title: string;
  view_count: number;
  published_at: string;
  thumbnail: string;
  transcript: string | null;
  fetched_at: string;
}

interface ApiResponse {
  channel_id: string;
  channel_name: string;
  total_videos: number;
  fetched: number;
  videos: VideoResult[];
}

export default function TranscriptsPage() {
  const [channelUrl, setChannelUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [videos, setVideos] = useState<VideoResult[]>([]);
  const [channelName, setChannelName] = useState("");
  const [channelId, setChannelId] = useState("");
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

  async function fetchTranscripts() {
    setLoading(true);
    setError("");
    setVideos([]);
    setChannelName("");

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

      const response = await fetch("https://content-machine-production-a06b.up.railway.app/api/transcripts/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel_id: channelId, top_n: topN }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Request failed (${response.status})`);
      }

      const data: ApiResponse = await response.json();
      setChannelName(data.channel_name || channelId);
      setChannelId(channelId);
      setVideos(data.videos || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch transcripts. Please try again.");
    }

    setLoading(false);
  }

  function downloadTranscript(video: VideoResult) {
    if (!video.transcript) return;
    const content = [
      video.title, "=".repeat(video.title.length), "",
      `Channel: ${video.channel_name}`,
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
    const withTranscripts = videos.filter((v) => v.transcript);
    if (withTranscripts.length === 0) return;
    const sections = withTranscripts.map((v, i) => [
      `[${i + 1}/${withTranscripts.length}] ${v.title}`,
      "=".repeat(80),
      `Channel: ${v.channel_name}`,
      `Views: ${v.view_count.toLocaleString()}`,
      `Published: ${v.published_at ? new Date(v.published_at).toLocaleDateString() : "Unknown"}`,
      `URL: https://www.youtube.com/watch?v=${v.video_id}`,
      "", v.transcript, "", "",
    ].join("\n"));
    const blob = new Blob([sections.join("\n")], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transcripts-${channelName.replace(/[^a-zA-Z0-9]/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const fmtNum = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(0) + "K";
    return n.toString();
  };

  const withTranscripts = videos.filter((v) => v.transcript);
  const withoutTranscripts = videos.filter((v) => !v.transcript);

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
              onKeyDown={(e) => { if (e.key === "Enter" && !loading) fetchTranscripts(); }}
              placeholder="Paste YouTube channel URL or channel ID"
              className="flex-1 px-4 py-3 rounded-md text-base"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: "var(--text-primary)", outline: "none" }}
              disabled={loading}
            />
            <button
              onClick={fetchTranscripts}
              disabled={loading || !channelUrl.trim()}
              className="px-6 py-3 rounded-md text-base font-semibold disabled:opacity-50"
              style={{ background: "var(--gold)", color: "var(--bg-primary)" }}
            >
              {loading ? "Fetching..." : "Pull Transcripts"}
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

        {/* Loading state */}
        {loading && (
          <div className="rounded-lg p-8 text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
            <div className="inline-block w-8 h-8 border-2 rounded-full animate-spin mb-3" style={{ borderColor: "var(--border-default)", borderTopColor: "var(--gold)" }} />
            <p className="text-base" style={{ color: "var(--text-tertiary)" }}>
              Fetching videos and transcripts... This may take a minute.
            </p>
          </div>
        )}

        {/* Results */}
        {!loading && videos.length > 0 && (
          <>
            {/* Summary bar */}
            <div
              className="rounded-lg px-5 py-4 mb-6 flex items-center justify-between"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
            >
              <div className="flex items-center gap-4">
                <span className="text-lg font-bold">{channelName}</span>
                <span className="text-base" style={{ color: "var(--text-muted)" }}>
                  {videos.length} video{videos.length !== 1 ? "s" : ""} found
                </span>
                <span className="text-base font-medium px-2.5 py-0.5 rounded" style={{ color: "var(--green)", background: "var(--green-bg)" }}>
                  {withTranscripts.length} transcript{withTranscripts.length !== 1 ? "s" : ""}
                </span>
                {withoutTranscripts.length > 0 && (
                  <span className="text-base font-medium px-2.5 py-0.5 rounded" style={{ color: "var(--text-muted)", background: "var(--bg-elevated)" }}>
                    {withoutTranscripts.length} unavailable
                  </span>
                )}
              </div>
              {withTranscripts.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={downloadAllTranscripts}
                    className="flex items-center gap-2 px-4 py-2 rounded-md text-base font-semibold"
                    style={{ color: "var(--text-muted)", background: "var(--bg-elevated)" }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    .txt ({withTranscripts.length})
                  </button>
                  <button
                    onClick={async () => {
                      setDownloadingPdf(true);
                      try {
                        const response = await fetch("https://content-machine-production-a06b.up.railway.app/api/transcripts/download-pdf", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ channel_id: channelId, top_n: topN }),
                        });
                        if (!response.ok) throw new Error("PDF generation failed");
                        const blob = await response.blob();
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `transcripts-${channelName.replace(/[^a-zA-Z0-9]/g, "-")}.zip`;
                        a.click();
                        URL.revokeObjectURL(url);
                      } catch {
                        setError("Failed to generate PDFs. Try again.");
                      }
                      setDownloadingPdf(false);
                    }}
                    disabled={downloadingPdf}
                    className="flex items-center gap-2 px-4 py-2 rounded-md text-base font-semibold disabled:opacity-50"
                    style={{ background: "var(--gold)", color: "var(--bg-primary)" }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                      <path d="M14 2v6h6" />
                    </svg>
                    {downloadingPdf ? "Generating..." : `PDF Zip (${withTranscripts.length})`}
                  </button>
                </div>
              )}
            </div>

            {/* Video list */}
            <div className="space-y-2">
              {videos.map((v, i) => (
                <div
                  key={v.video_id}
                  className="rounded-lg px-5 py-4"
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-subtle)",
                    opacity: v.transcript ? 1 : 0.6,
                  }}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-base font-mono font-bold shrink-0 w-8" style={{ color: "var(--text-muted)" }}>
                      {i + 1}
                    </span>
                    <a
                      href={`https://www.youtube.com/watch?v=${v.video_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0"
                    >
                      <img src={v.thumbnail} alt="" className="w-28 h-[63px] object-cover rounded-md" />
                    </a>
                    <div className="flex-1 min-w-0">
                      <a
                        href={`https://www.youtube.com/watch?v=${v.video_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-lg font-semibold hover:text-[var(--gold)] transition-colors line-clamp-1"
                      >
                        {v.title}
                      </a>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-base font-mono" style={{ color: "var(--text-muted)" }}>
                          {fmtNum(v.view_count)} views
                        </span>
                        {v.published_at && (
                          <span className="text-base" style={{ color: "var(--text-muted)" }}>
                            {new Date(v.published_at).toLocaleDateString()}
                          </span>
                        )}
                        {v.transcript && (
                          <span className="text-base" style={{ color: "var(--text-muted)" }}>
                            {v.transcript.length.toLocaleString()} chars
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0">
                      {v.transcript ? (
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
                      ) : (
                        <span className="text-base px-3 py-1.5 rounded" style={{ color: "var(--text-muted)", background: "var(--bg-elevated)" }}>
                          No transcript
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
