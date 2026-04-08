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
}

interface EnrichedChannel extends DiscoveredChannel {
  tracked?: TrackedData;
}

type SortKey = "subscriber_count" | "sub_growth" | "view_growth";

export default function DiscoverPage() {
  const [channels, setChannels] = useState<EnrichedChannel[]>([]);
  const [trackedIds, setTrackedIds] = useState<Set<string>>(new Set());
  const [ignoredIds, setIgnoredIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortKey>("sub_growth");
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
      supabase.from("discovered_channels").select("*").order("discovered_at", { ascending: false }).limit(200),
      supabase.from("user_channels").select("channel_id").eq("user_id", user.id),
      supabase.from("tracked_discovery_channels").select("channel_id, description, thumbnail, country, subscriber_count, view_count, video_count, sub_growth_pct, view_growth_pct").limit(500),
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

  const ignored = channels.filter((c) => ignoredIds.has(c.channel_id));

  const fmtNum = (n: number) => {
    if (!n) return "—";
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(0) + "K";
    return n.toString();
  };
  const fmtGrowth = (p: number) => { if (!p && p !== 0) return "—"; return (p > 0 ? "+" : "") + p.toFixed(1) + "%"; };
  const growthColor = (p: number) => p > 10 ? "var(--green)" : p > 0 ? "#6ee7b7" : p < 0 ? "var(--red)" : "var(--text-tertiary)";

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
          <h1 className="text-2xl font-semibold tracking-tight">Discover</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-tertiary)" }}>
            Find growing channels in your niche to track
          </p>
        </div>

        {/* Sort */}
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

        {visible.length === 0 ? (
          <div className="rounded-lg p-12 text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
            <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
              {channels.length === 0 ? (
                <>No channels discovered yet. Set your <a href="/settings" style={{ color: "var(--gold)" }} className="hover:underline">discovery keywords</a> to get started.</>
              ) : "You've handled all discovered channels."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {visible.map((ch) => {
              const t = ch.tracked;
              return (
                <div
                  key={ch.id}
                  className="rounded-lg px-5 py-4"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
                >
                  <div className="flex items-center gap-4">
                    {t?.thumbnail ? (
                      <img src={t.thumbnail} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-full shrink-0" style={{ background: "var(--bg-elevated)" }} />
                    )}

                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium truncate">{ch.channel_name}</h3>
                      {t?.description && (
                        <p className="text-[11px] line-clamp-1 mt-0.5" style={{ color: "var(--text-muted)" }}>
                          {t.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-5 shrink-0">
                      <div className="text-right">
                        <div className="text-xs font-semibold font-mono">{fmtNum(t?.subscriber_count || ch.subscriber_count)}</div>
                        <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>Subs</div>
                      </div>
                      {t?.sub_growth_pct != null && (
                        <div className="text-right">
                          <div className="text-xs font-semibold font-mono" style={{ color: growthColor(t.sub_growth_pct) }}>
                            {fmtGrowth(t.sub_growth_pct)}
                          </div>
                          <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>Sub ↑</div>
                        </div>
                      )}
                      {t?.view_growth_pct != null && (
                        <div className="text-right">
                          <div className="text-xs font-semibold font-mono" style={{ color: growthColor(t.view_growth_pct) }}>
                            {fmtGrowth(t.view_growth_pct)}
                          </div>
                          <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>View ↑</div>
                        </div>
                      )}
                      <div className="text-right">
                        <div className="text-xs font-semibold font-mono">{fmtNum(t?.video_count || ch.video_count)}</div>
                        <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>Vids</div>
                      </div>

                      <div className="flex items-center gap-1.5 ml-2">
                        <button
                          onClick={() => trackChannel(ch)}
                          disabled={actionLoading === ch.channel_id}
                          className="px-3 py-1.5 rounded text-[11px] font-medium disabled:opacity-50"
                          style={{ background: "var(--gold)", color: "var(--bg-primary)" }}
                        >
                          {actionLoading === ch.channel_id ? "..." : "+ Track"}
                        </button>
                        <button
                          onClick={() => ignoreChannel(ch.channel_id)}
                          disabled={actionLoading === ch.channel_id}
                          className="px-2 py-1.5 rounded text-[11px] disabled:opacity-50"
                          style={{ color: "var(--text-muted)", background: "var(--bg-elevated)" }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

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
