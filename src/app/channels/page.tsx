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
  thumbnail_url: string | null;
  added_at: string;
}

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [channelUrl, setChannelUrl] = useState("");
  const [error, setError] = useState("");
  const supabase = createClient();

  useEffect(() => {
    loadChannels();
  }, []);

  async function loadChannels() {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { data } = await supabase
      .from("user_channels")
      .select("*")
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

    // Extract channel ID from URL
    let channelId = channelUrl;
    
    // Handle different URL formats
    const patterns = [
      /youtube\.com\/channel\/([a-zA-Z0-9_-]+)/,
      /youtube\.com\/@([a-zA-Z0-9_-]+)/,
      /youtube\.com\/c\/([a-zA-Z0-9_-]+)/,
      /youtube\.com\/user\/([a-zA-Z0-9_-]+)/,
    ];

    for (const pattern of patterns) {
      const match = channelUrl.match(pattern);
      if (match) {
        channelId = match[1];
        break;
      }
    }

    // Check if already added
    const { data: existing } = await supabase
      .from("user_channels")
      .select("id")
      .eq("user_id", user.id)
      .eq("channel_id", channelId)
      .single();

    if (existing) {
      setError("Channel already added");
      setAdding(false);
      return;
    }

    // Add channel
    const { error: insertError } = await supabase
      .from("user_channels")
      .insert({
        user_id: user.id,
        channel_id: channelId,
        channel_name: channelId, // Will be updated by backend
      });

    if (insertError) {
      setError("Failed to add channel");
    } else {
      setChannelUrl("");
      loadChannels();
    }
    setAdding(false);
  }

  async function removeChannel(channelId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("user_channels")
      .delete()
      .eq("user_id", user.id)
      .eq("channel_id", channelId);

    loadChannels();
  }

  const formatNumber = (num: number) => {
    if (!num) return "-";
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(0) + "K";
    return num.toString();
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
          <h1 className="text-3xl font-bold mb-2">Channels</h1>
          <p className="text-gray-400">Manage the YouTube channels you're tracking</p>
        </div>

        {/* Add Channel Form */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Add Channel</h2>
          <form onSubmit={addChannel} className="flex gap-4">
            <input
              type="text"
              value={channelUrl}
              onChange={(e) => setChannelUrl(e.target.value)}
              placeholder="Paste YouTube channel URL (e.g., youtube.com/@MrBeast)"
              className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white"
              required
            />
            <button
              type="submit"
              disabled={adding}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {adding ? "Adding..." : "Add Channel"}
            </button>
          </form>
          {error && (
            <p className="text-red-400 text-sm mt-2">{error}</p>
          )}
        </div>

        {/* Channel List */}
        {channels.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
            <div className="text-5xl mb-4">📺</div>
            <h2 className="text-xl font-bold mb-2">No Channels Yet</h2>
            <p className="text-gray-400">
              Add YouTube channels above to start tracking outlier videos
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {channels.map((channel) => (
              <div
                key={channel.id}
                className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  {channel.thumbnail_url ? (
                    <img
                      src={channel.thumbnail_url}
                      alt={channel.channel_name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center text-xl">
                      📺
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold">{channel.channel_name}</h3>
                    <p className="text-gray-500 text-sm">{channel.channel_id}</p>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <div className="font-semibold">{formatNumber(channel.subscriber_count)}</div>
                    <div className="text-gray-500 text-xs">Subscribers</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold">{formatNumber(channel.video_count)}</div>
                    <div className="text-gray-500 text-xs">Videos</div>
                  </div>
                  <button
                    onClick={() => removeChannel(channel.channel_id)}
                    className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                    title="Remove channel"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 text-center text-gray-500 text-sm">
          Tracking {channels.length} channel{channels.length !== 1 ? "s" : ""}
        </div>
      </main>
    </div>
  );
}
