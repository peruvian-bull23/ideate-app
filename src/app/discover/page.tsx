"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import Navbar from "@/components/Navbar";

interface DiscoveredChannel {
  id: number;
  channel_id: string;
  channel_name: string;
  subscriber_count: number;
  video_count: number;
  discovered_from: string;
  discovered_at: string;
}

interface TrackedData {
  channel_id: string;
  description: string | null;
  thumbnail: string | null;
  country: string | null;
  subscriber_count: number;
  view_count: number;
  video_count: number;
  sub_growth_pct: number;
  view_growth_pct: number;
  sub_growth_raw: number;
  view_growth_raw: number;
  prev_subscriber_count: number;
  prev_view_count: number;
}

interface EnrichedChannel extends DiscoveredChannel {
  tracked?: TrackedData;
}

type SortKey = "subscriber_count" | "sub_growth" | "view_growth";

const PAGE_SIZE = 25;

export default function DiscoverPage() {
  const [channels, setChannels] = useState<EnrichedChannel[]>([]);
  const [trackedIds, setTrackedIds] = useState<Set<string>>(new Set());
  const [ignoredIds, setIgnoredIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortKey>("sub_growth");
  const [page, setPage] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [showIgnored, setShowIgnored] = useState(false);
  const supabase = createClient();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = "/login"; return; }
    setUserId(user.id);

    const [channelsRes, trackedRes, trackedDataRes] = await Promise.all([
      supabase.from("discovered_channels").select("*").order("discovered_at", { ascending: false }).limit(500),
      supabase.from("user_channels").select("channel_id").eq("user_id", user.id),
      supabase.from("tracked_discovery_channels").select("channel_id, description, thumbnail, country, subscriber_count, view_count, video_count, sub_growth_pct, view_growth_pct, sub_growth_raw, view_growth_raw, prev_subscriber_count, prev_view_count").limit(500),
    ]);

    const map = new Map<string, TrackedData>();
    (trackedDataRes.data || []).forEach((t) => map.set(t.channel_id, t));

    setChannels((channelsRes.data || []).map((ch) => ({ ...ch, tracked: map.get(ch.channel_id) })));
    setTrackedIds(new Set((trackedRes.data || []).map((r) => r.channel_id)));

    try {
      const ignoredRes = await supabase.from("ignored_discovery_channels").select("channel_id").eq("user_id", user.id);
      if (ignoredRes.data) setIgnoredIds(new Set(ignoredRes.data.map((r) => r.channel_id)));
    } catch { /* table may not exist */ }

    setLoading(false);
  }

  async function trackChannel(ch: EnrichedChannel) {
    if (!userId) return;
    setActionLoading(ch.channel_id);
    const t = ch.tracked;
    await supabase.from("user_channels").insert({
      user_id: userId, channel_id: ch.channel_id, channel_name: ch.channel_name,
      subscriber_count: t?.subscriber_count || ch.subscriber_count,
      video_count: t?.video_count || ch.video_count,
      total_view_count: t?.view_count || 0,
      description: t?.description || null, thumbnail_url: t?.thumbnail || null, country: t?.country || null,
    });
    setTrackedIds((prev) => new Set([...prev, ch.channel_id]));
    setActionLoading(null);
  }

  async function ignoreChannel(id: string) {
    if (!userId) return;
    setActionLoading(id);
    await supabase.from("ignored_discovery_channels").insert({ user_id: userId, channel_id: id });
    setIgnoredIds((prev) => new Set([...prev, id]));
    setActionLoading(null);
  }

  async function unignoreChannel(id: string) {
    if (!userId) return;
    setActionLoading(id);
    await supabase.from("ignored_discovery_channels").delete().eq("user_id", userId).eq("channel_id", id);
    setIgnoredIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    setActionLoading(null);
  }

  const visible = channels
    .filter((c) => !trackedIds.has(c.channel_id) && !ignoredIds.has(c.channel_id))
    .sort((a, b) => {
      switch (sortBy) {
        case "subscriber_count": return (b.tracked?.subscriber_count || b.subscriber_count || 0) - (a.tracked?.subscriber_count || a.subscriber_count || 0);
        case "sub_growth": return (b.tracked?.sub_growth_pct || 0) - (a.tracked?.sub_growth_pct || 0);
        case "view_growth": return (b.tracked?.view_growth_pct || 0) - (a.tracked?.view_growth_pct || 0);
        default: return 0;
      }
    });

  const totalPages = Math.ceil(visible.length / PAGE_SIZE);
  const paged = visible.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const ignored = channels.filter((c) => ignoredIds.has(c.channel_id));

  // Reset page when sort changes
  useEffect(() => { setPage(0); }, [sortBy]);

  const fmtNum = (n: number) => {
    if (!n) return "—";
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(0) + "K";
    return n.toString();
  };
  const fmtGrowth = (p: number) => { if (!p && p !== 0) return "—"; return (p > 0 ? "+" : "") + p.toFixed(1) + "%"; };
  const growthColor = (p: number) => p > 10 ? "var(--green)" : p > 0 ? "#6ee7b7" : p < 0 ? "var(--red)" : "var(--text-tertiary)";

  const timeAgo = (dateStr: string) => {
    if (!dateStr) return "";
    const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return days + "d ago";
    if (days < 30) return Math.floor(days / 7) + "w ago";
    return Math.floor(days / 30) + "mo ago";
  };

  const channelUrl = (id: string, name: string) => {
    // If channel_id looks like a UC... ID, link directly. Otherwise try handle.
    if (id.startsWith("UC")) return `https://www.youtube.com/channel/${id}`;
    return `https://www.youtube.com/@${name.replace(/\s+/g, "")}`;
  };

  function PaginationControls() {
    if (totalPages <= 1) return null;
    return (
      <div className="flex items-center justify-center gap-1 py-4">
        {Array.from({ length: totalPages }, (_, i) => (
          <button
            key={i}
            onClick={() => { setPage(i); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            className="min-w-[36px] px-2 py-1.5 rounded text-[12px] font-medium font-mono"
            style={{
              color: page === i ? "var(--gold)" : "var(--text-muted)",
              background: page === i ? "var(--gold-bg)" : "transparent",
              border: page === i ? "1px solid var(--gold-border)" : "1px solid transparent",
            }}
          >
            {i * PAGE_SIZE + 1}–{Math.min((i + 1) * PAGE_SIZE, visible.length)}
          </button>
        ))}
      </div>
    );
  }

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
          <h1 className="text-4xl font-bold tracking-tight">Discover</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-tertiary)" }}>
            Find growing channels in your niche to track
          </p>
        </div>

        {/* Sort + count */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] mr-1" style={{ color: "var(--text-muted)" }}>Sort:</span>
            {([
              { key: "sub_growth" as SortKey, label: "Sub Growth" },
              { key: "view_growth" as SortKey, label: "View Growth" },
              { key: "subscriber_count" as SortKey, label: "Subscribers" },
            ]).map((o) => (
              <button
                key={o.key}
                onClick={() => setSortBy(o.key)}
                className="px-2.5 py-1 rounded text-[11px] font-medium"
                style={{
                  color: sortBy === o.key ? "var(--gold)" : "var(--text-muted)",
                  background: sortBy === o.key ? "var(--gold-bg)" : "transparent",
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
          <span className="text-[11px] font-mono" style={{ color: "var(--text-muted)" }}>
            {visible.length} channels
          </span>
        </div>

        {/* Pagination top */}
        <PaginationControls />

        {visible.length === 0 ? (
          <div className="rounded-lg p-12 text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
            <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
              {channels.length === 0 ? (
                <>No channels discovered yet. Set your <a href="/settings" style={{ color: "var(--gold)" }} className="hover:underline">discovery keywords</a> to get started.</>
              ) : "You've handled all discovered channels."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {paged.map((ch) => {
              const t = ch.tracked;
              const subs = t?.subscriber_count || ch.subscriber_count;
              const views = t?.view_count || 0;
              const vids = t?.video_count || ch.video_count;
              const url = channelUrl(ch.channel_id, ch.channel_name);

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
                      {t?.thumbnail ? (
                        <img src={t.thumbnail} alt="" className="w-14 h-14 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-14 h-14 rounded-full shrink-0" style={{ background: "var(--bg-elevated)" }} />
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="text-[15px] font-semibold truncate">{ch.channel_name}</h3>
                            {t?.description && (
                              <p className="text-xs line-clamp-2 mt-1 leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
                                {t.description}
                              </p>
                            )}
                          </div>
                          {t?.country && (
                            <span className="text-[10px] font-mono shrink-0 px-1.5 py-0.5 rounded" style={{ color: "var(--text-muted)", background: "var(--bg-elevated)" }}>
                              {t.country}
                            </span>
                          )}
                        </div>

                        {/* Stats row */}
                        <div className="flex items-center gap-5 mt-3">
                          <div>
                            <span className="text-sm font-semibold font-mono">{fmtNum(subs)}</span>
                            <span className="text-[10px] ml-1" style={{ color: "var(--text-muted)" }}>subs</span>
                          </div>
                          <div>
                            <span className="text-sm font-semibold font-mono">{fmtNum(views)}</span>
                            <span className="text-[10px] ml-1" style={{ color: "var(--text-muted)" }}>views</span>
                          </div>
                          <div>
                            <span className="text-sm font-semibold font-mono">{fmtNum(vids)}</span>
                            <span className="text-[10px] ml-1" style={{ color: "var(--text-muted)" }}>videos</span>
                          </div>

                          {t?.sub_growth_pct != null && (
                            <div className="flex items-center gap-1">
                              <span className="text-sm font-semibold font-mono" style={{ color: growthColor(t.sub_growth_pct) }}>
                                {fmtGrowth(t.sub_growth_pct)}
                              </span>
                              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>sub ↑</span>
                              {t.sub_growth_raw > 0 && (
                                <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
                                  (+{fmtNum(t.sub_growth_raw)})
                                </span>
                              )}
                            </div>
                          )}

                          {t?.view_growth_pct != null && (
                            <div className="flex items-center gap-1">
                              <span className="text-sm font-semibold font-mono" style={{ color: growthColor(t.view_growth_pct) }}>
                                {fmtGrowth(t.view_growth_pct)}
                              </span>
                              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>view ↑</span>
                            </div>
                          )}
                        </div>

                        {/* Meta row */}
                        <div className="flex items-center gap-3 mt-2">
                          {ch.discovered_from && (
                            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                              via {ch.discovered_from}
                            </span>
                          )}
                          {ch.discovered_at && (
                            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                              {timeAgo(ch.discovered_at)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </a>

                  {/* Action bar */}
                  <div
                    className="flex items-center justify-end gap-2 px-5 py-2.5"
                    style={{ borderTop: "1px solid var(--border-subtle)" }}
                  >
                    <button
                      onClick={(e) => { e.preventDefault(); trackChannel(ch); }}
                      disabled={actionLoading === ch.channel_id}
                      className="px-4 py-1.5 rounded text-[11px] font-medium disabled:opacity-50"
                      style={{ background: "var(--gold)", color: "var(--bg-primary)" }}
                    >
                      {actionLoading === ch.channel_id ? "..." : "+ Track"}
                    </button>
                    <button
                      onClick={(e) => { e.preventDefault(); ignoreChannel(ch.channel_id); }}
                      disabled={actionLoading === ch.channel_id}
                      className="px-3 py-1.5 rounded text-[11px] disabled:opacity-50"
                      style={{ color: "var(--text-muted)", background: "var(--bg-elevated)" }}
                    >
                      Ignore
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination bottom */}
        <PaginationControls />

        {/* Ignored */}
        {ignored.length > 0 && (
          <div className="mt-8">
            <button
              onClick={() => setShowIgnored(!showIgnored)}
              className="text-[11px]"
              style={{ color: "var(--text-muted)" }}
            >
              {showIgnored ? "▾" : "▸"} {ignored.length} ignored
            </button>
            {showIgnored && (
              <div className="space-y-1.5 mt-2">
                {ignored.map((ch) => (
                  <div
                    key={ch.id}
                    className="rounded-md px-4 py-2.5 flex items-center justify-between opacity-50 hover:opacity-100 transition-opacity"
                    style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
                  >
                    <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{ch.channel_name}</span>
                    <button
                      onClick={() => unignoreChannel(ch.channel_id)}
                      className="text-[11px]"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
