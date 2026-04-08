"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import Navbar from "@/components/Navbar";

interface DiscoveredChannel {
  id: number;
  channel_id: string;
  channel_name: string;
  description: string;
  thumbnail: string;
  country: string;
  subscriber_count: number;
  view_count: number;
  video_count: number;
  sub_growth_pct: number;
  view_growth_pct: number;
  first_seen: string;
  last_checked: string;
}

type SortKey = "sub_growth_pct" | "view_growth_pct" | "subscriber_count" | "first_seen";

export default function DiscoverPage() {
  const [channels, setChannels] = useState<DiscoveredChannel[]>([]);
  const [trackedIds, setTrackedIds] = useState<Set<string>>(new Set());
  const [ignoredIds, setIgnoredIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortKey>("sub_growth_pct");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [showIgnored, setShowIgnored] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    setUserId(user.id);

    const [channelsRes, trackedRes, ignoredRes] = await Promise.all([
      supabase
        .from("discovered_channels")
        .select("*")
        .order("sub_growth_pct", { ascending: false })
        .limit(200),
      supabase
        .from("user_channels")
        .select("channel_id")
        .eq("user_id", user.id),
      supabase
        .from("ignored_discovery_channels")
        .select("channel_id")
        .eq("user_id", user.id),
    ]);

    const tracked = new Set((trackedRes.data || []).map((r) => r.channel_id));
    setTrackedIds(tracked);

    const ignored = new Set((ignoredRes.data || []).map((r) => r.channel_id));
    setIgnoredIds(ignored);

    setChannels(channelsRes.data || []);
    setLoading(false);
  }

  async function trackChannel(channel: DiscoveredChannel) {
    if (!userId) return;
    setActionLoading(channel.channel_id);

    const { error } = await supabase.from("user_channels").insert({
      user_id: userId,
      channel_id: channel.channel_id,
      channel_name: channel.channel_name,
      subscriber_count: channel.subscriber_count,
      video_count: channel.video_count,
      total_view_count: channel.view_count,
      description: channel.description,
      thumbnail_url: channel.thumbnail,
      country: channel.country,
    });

    if (!error) {
      setTrackedIds((prev) => new Set([...prev, channel.channel_id]));
    }
    setActionLoading(null);
  }

  async function ignoreChannel(channelId: string) {
    if (!userId) return;
    setActionLoading(channelId);

    const { error } = await supabase.from("ignored_discovery_channels").insert({
      user_id: userId,
      channel_id: channelId,
    });

    if (!error) {
      setIgnoredIds((prev) => new Set([...prev, channelId]));
    }
    setActionLoading(null);
  }

  async function unignoreChannel(channelId: string) {
    if (!userId) return;
    setActionLoading(channelId);

    await supabase
      .from("ignored_discovery_channels")
      .delete()
      .eq("user_id", userId)
      .eq("channel_id", channelId);

    setIgnoredIds((prev) => {
      const next = new Set(prev);
      next.delete(channelId);
      return next;
    });
    setActionLoading(null);
  }

  const visibleChannels = channels
    .filter((c) => !trackedIds.has(c.channel_id) && !ignoredIds.has(c.channel_id))
    .sort((a, b) => {
      if (sortBy === "first_seen") {
        return new Date(b.first_seen).getTime() - new Date(a.first_seen).getTime();
      }
      return (b[sortBy] || 0) - (a[sortBy] || 0);
    });

  const ignoredChannels = channels.filter((c) => ignoredIds.has(c.channel_id));

  const formatNumber = (num: number) => {
    if (!num) return "-";
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(0) + "K";
    return num.toString();
  };

  const formatGrowth = (pct: number) => {
    if (!pct && pct !== 0) return "-";
    const sign = pct > 0 ? "+" : "";
    return sign + pct.toFixed(1) + "%";
  };

  const getGrowthColor = (pct: number) => {
    if (pct > 10) return "text-green-400";
    if (pct > 0) return "text-emerald-400";
    if (pct < 0) return "text-red-400";
    return "text-gray-400";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-400">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Discover</h1>
          <p className="text-gray-400">
            Find growing channels in your niche to track
          </p>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-sm">Sort by:</span>
            {([
              { key: "sub_growth_pct" as SortKey, label: "Sub Growth" },
              { key: "view_growth_pct" as SortKey, label: "View Growth" },
              { key: "subscriber_count" as SortKey, label: "Subscribers" },
              { key: "first_seen" as SortKey, label: "Newest" },
            ]).map((option) => (
              <button
                key={option.key}
                onClick={() => setSortBy(option.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  sortBy === option.key
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:text-white"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <span className="text-gray-500 text-sm">
            {visibleChannels.length} channels
          </span>
        </div>

        {/* Channel List */}
        {visibleChannels.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
            <div className="text-5xl mb-4">📡</div>
            <h2 className="text-xl font-bold mb-2">No Channels to Discover</h2>
            <p className="text-gray-400 mb-2">
              {channels.length === 0
                ? "The discovery engine hasn't found any channels yet."
                : "You've handled all discovered channels!"}
            </p>
            {channels.length === 0 && (
              <p className="text-gray-500 text-sm">
                Set your discovery keywords in{" "}
                <a href="/settings" className="text-indigo-400 hover:underline">
                  Settings
                </a>{" "}
                to get started.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {visibleChannels.map((channel) => (
              <div
                key={channel.id}
                className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {channel.thumbnail ? (
                    <img
                      src={channel.thumbnail}
                      alt={channel.channel_name}
                      className="w-12 h-12 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center text-xl shrink-0">
                      📺
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">
                      {channel.channel_name}
                    </h3>
                    {channel.description && (
                      <p className="text-gray-500 text-sm line-clamp-1 mt-0.5">
                        {channel.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-6 shrink-0">
                    <div className="text-center">
                      <div className="font-semibold text-sm">
                        {formatNumber(channel.subscriber_count)}
                      </div>
                      <div className="text-gray-500 text-xs">Subs</div>
                    </div>
                    <div className="text-center">
                      <div className={`font-semibold text-sm ${getGrowthColor(channel.sub_growth_pct)}`}>
                        {formatGrowth(channel.sub_growth_pct)}
                      </div>
                      <div className="text-gray-500 text-xs">Sub Growth</div>
                    </div>
                    <div className="text-center">
                      <div className={`font-semibold text-sm ${getGrowthColor(channel.view_growth_pct)}`}>
                        {formatGrowth(channel.view_growth_pct)}
                      </div>
                      <div className="text-gray-500 text-xs">View Growth</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-sm">
                        {formatNumber(channel.video_count)}
                      </div>
                      <div className="text-gray-500 text-xs">Videos</div>
                    </div>

                    <div className="flex items-center gap-2 ml-2">
                      <button
                        onClick={() => trackChannel(channel)}
                        disabled={actionLoading === channel.channel_id}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        {actionLoading === channel.channel_id ? "..." : "+ Track"}
                      </button>
                      <button
                        onClick={() => ignoreChannel(channel.channel_id)}
                        disabled={actionLoading === channel.channel_id}
                        className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                        title="Hide this channel"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Ignored Channels */}
        {ignoredChannels.length > 0 && (
          <div className="mt-10">
            <button
              onClick={() => setShowIgnored(!showIgnored)}
              className="text-gray-500 text-sm hover:text-gray-300 transition-colors"
            >
              {showIgnored ? "▾" : "▸"} {ignoredChannels.length} ignored channel
              {ignoredChannels.length !== 1 ? "s" : ""}
            </button>

            {showIgnored && (
              <div className="space-y-2 mt-3">
                {ignoredChannels.map((channel) => (
                  <div
                    key={channel.id}
                    className="bg-gray-900/50 border border-gray-800/50 rounded-xl p-4 flex items-center justify-between opacity-60 hover:opacity-100 transition-opacity"
                  >
                    <div className="flex items-center gap-3">
                      {channel.thumbnail ? (
                        <img
                          src={channel.thumbnail}
                          alt={channel.channel_name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center text-sm">
                          📺
                        </div>
                      )}
                      <span className="text-sm text-gray-400">
                        {channel.channel_name}
                      </span>
                      <span className="text-xs text-gray-600">
                        {formatNumber(channel.subscriber_count)} subs
                      </span>
                    </div>
                    <button
                      onClick={() => unignoreChannel(channel.channel_id)}
                      disabled={actionLoading === channel.channel_id}
                      className="text-xs text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50"
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
