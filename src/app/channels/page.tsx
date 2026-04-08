"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import Navbar from "@/components/Navbar";

interface Channel {
  id: number;
  channel_id: string;
  channel_name: string;
  subscriber_count: number;
  video_count: number;
  total_view_count: number;
  thumbnail_url: string | null;
  description: string | null;
  country: string | null;
  added_at: string;
}

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [channelUrl, setChannelUrl] = useState("");
  const [error, setError] = useState("");
  const supabase = createClient();

  useEffect(() => { loadChannels(); }, []);

  async function loadChannels() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = "/login"; return; }

    const { data } = await supabase
      .from("user_channels").select("*")
      .eq("user_id", user.id)
      .order("added_at", { ascending: false });

    setChannels(data || []);
    setLoading(false);
  }

  async function addChannel(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let channelId = channelUrl;
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

    const { data: existing } = await supabase.from("user_channels").select("id").eq("user_id", user.id).eq("channel_id", channelId).single();
    if (existing) { setError("Channel already added"); setAdding(false); return; }

    const { error: insertError } = await supabase.from("user_channels").insert({
      user_id: user.id, channel_id: channelId, channel_name: channelId,
    });

    if (insertError) { setError("Failed to add channel"); }
    else { setChannelUrl(""); loadChannels(); }
    setAdding(false);
  }

  async function removeChannel(e: React.MouseEvent, channelId: string) {
    e.preventDefault();
    e.stopPropagation();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("user_channels").delete().eq("user_id", user.id).eq("channel_id", channelId);
    loadChannels();
  }

  const fmtNum = (n: number) => {
    if (!n) return "—";
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(0) + "K";
    return n.toString();
  };

  const channelUrl2 = (id: string, name: string) => {
    if (id.startsWith("UC")) return `https://www.youtube.com/channel/${id}`;
    return `https://www.youtube.com/@${name.replace(/\s+/g, "")}`;
  };

  const timeAgo = (dateStr: string) => {
    if (!dateStr) return "";
    const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
    if (days === 0) return "Added today";
    if (days === 1) return "Added yesterday";
    if (days < 7) return `Added ${days}d ago`;
    if (days < 30) return `Added ${Math.floor(days / 7)}w ago`;
    if (days < 365) return `Added ${Math.floor(days / 30)}mo ago`;
    return `Added ${Math.floor(days / 365)}y ago`;
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

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">Channels</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-tertiary)" }}>
            Manage the YouTube channels you&apos;re tracking
          </p>
        </div>

        {/* Add Channel */}
        <div className="rounded-lg p-5 mb-8" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
          <form onSubmit={addChannel} className="flex gap-3">
            <input
              type="text"
              value={channelUrl}
              onChange={(e) => setChannelUrl(e.target.value)}
              placeholder="Paste YouTube channel URL (e.g., youtube.com/@MrBeast)"
              className="flex-1 px-4 py-2.5 rounded-md text-sm"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-default)",
                color: "var(--text-primary)",
                outline: "none",
              }}
              required
            />
            <button
              type="submit"
              disabled={adding}
              className="px-5 py-2.5 rounded-md text-sm font-medium disabled:opacity-50"
              style={{ background: "var(--gold)", color: "var(--bg-primary)" }}
            >
              {adding ? "Adding..." : "Add Channel"}
            </button>
          </form>
          {error && <p className="text-xs mt-2" style={{ color: "var(--red)" }}>{error}</p>}
        </div>

        {/* Channel List */}
        {channels.length === 0 ? (
          <div className="rounded-lg p-12 text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
            <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
              No channels yet. Add YouTube channels above to start tracking outlier videos.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {channels.map((ch) => {
              const url = channelUrl2(ch.channel_id, ch.channel_name);

              return (
                <div
                  key={ch.id}
                  className="rounded-lg overflow-hidden"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
                >
                  {/* Clickable card body */}
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block px-5 py-5 hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                  >
                    <div className="flex items-start gap-4">
                      {ch.thumbnail_url ? (
                        <img src={ch.thumbnail_url} alt="" className="w-14 h-14 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-14 h-14 rounded-full shrink-0" style={{ background: "var(--bg-elevated)" }} />
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="text-[15px] font-semibold truncate">{ch.channel_name}</h3>
                            {ch.description && (
                              <p className="text-xs line-clamp-2 mt-1 leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
                                {ch.description}
                              </p>
                            )}
                          </div>
                          {ch.country && (
                            <span className="text-[10px] font-mono shrink-0 px-1.5 py-0.5 rounded" style={{ color: "var(--text-muted)", background: "var(--bg-elevated)" }}>
                              {ch.country}
                            </span>
                          )}
                        </div>

                        {/* Stats row */}
                        <div className="flex items-center gap-5 mt-3">
                          <div>
                            <span className="text-sm font-semibold font-mono">{fmtNum(ch.subscriber_count)}</span>
                            <span className="text-[10px] ml-1" style={{ color: "var(--text-muted)" }}>subs</span>
                          </div>
                          <div>
                            <span className="text-sm font-semibold font-mono">{fmtNum(ch.total_view_count)}</span>
                            <span className="text-[10px] ml-1" style={{ color: "var(--text-muted)" }}>views</span>
                          </div>
                          <div>
                            <span className="text-sm font-semibold font-mono">{fmtNum(ch.video_count)}</span>
                            <span className="text-[10px] ml-1" style={{ color: "var(--text-muted)" }}>videos</span>
                          </div>
                        </div>

                        {/* Meta row */}
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                            {timeAgo(ch.added_at)}
                          </span>
                          <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
                            {ch.channel_id}
                          </span>
                        </div>
                      </div>
                    </div>
                  </a>

                  {/* Action bar */}
                  <div
                    className="flex items-center justify-end px-5 py-2.5"
                    style={{ borderTop: "1px solid var(--border-subtle)" }}
                  >
                    <button
                      onClick={(e) => removeChannel(e, ch.channel_id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-medium"
                      style={{ color: "var(--text-muted)", background: "var(--bg-elevated)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = "var(--red)"; e.currentTarget.style.background = "var(--red-bg)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.background = "var(--bg-elevated)"; }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                      </svg>
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 text-center text-[11px] font-mono" style={{ color: "var(--text-muted)" }}>
          {channels.length} channel{channels.length !== 1 ? "s" : ""} tracked
        </div>
      </main>
    </div>
  );
}
