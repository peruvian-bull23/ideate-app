"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import Navbar from "@/components/Navbar";
import { User } from "@supabase/supabase-js";

interface Result {
  id: number;
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
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [trending, setTrending] = useState<TrendingVideo[]>([]);
  const [channelCount, setChannelCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      setUser(user);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [profileRes, resultsRes, trendingRes, channelCountRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("youtube_channel_name")
          .eq("id", user.id)
          .single(),
        supabase
          .from("results")
          .select("*")
          .eq("user_id", user.id)
          .gte("created_at", today.toISOString())
          .order("outlier_score", { ascending: false }),
        supabase
          .from("discovery_trending_videos")
          .select("*")
          .eq("user_id", user.id)
          .gte("discovered_at", today.toISOString())
          .order("views_per_hour", { ascending: false })
          .limit(20),
        supabase
          .from("user_channels")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id),
      ]);

      setProfile(profileRes.data);
      setResults(resultsRes.data || []);
      setTrending(trendingRes.data || []);
      setChannelCount(channelCountRes.count || 0);
      setLoading(false);
    }

    loadData();
  }, []);

  const formatViews = (views: number) => {
    if (views >= 1000000) return (views / 1000000).toFixed(1) + "M";
    if (views >= 1000) return (views / 1000).toFixed(0) + "K";
    return views.toString();
  };

  const formatViewsPerHour = (vph: number) => {
    if (!vph) return "-";
    if (vph >= 1000) return (vph / 1000).toFixed(1) + "K/hr";
    return vph.toFixed(0) + "/hr";
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment?.toLowerCase()) {
      case "bullish": return "text-green-400 bg-green-400/10";
      case "bearish": return "text-red-400 bg-red-400/10";
      default: return "text-gray-400 bg-gray-400/10";
    }
  };

  const getRelevanceColor = (score: number) => {
    if (score >= 8) return "text-green-400 bg-green-400/10";
    if (score >= 5) return "text-yellow-400 bg-yellow-400/10";
    return "text-gray-400 bg-gray-400/10";
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
          <h1 className="text-3xl font-bold mb-2">
            Welcome back{profile?.youtube_channel_name ? `, ${profile.youtube_channel_name}` : ""}!
          </h1>
          <p className="text-gray-400">Here are your latest outlier videos</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="text-3xl font-bold text-indigo-400">{results.length}</div>
            <div className="text-gray-400 text-sm">Outliers Today</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="text-3xl font-bold text-purple-400">{channelCount}</div>
            <div className="text-gray-400 text-sm">Channels Tracked</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="text-3xl font-bold text-cyan-400">
              {results.length > 0 ? results[0].outlier_score.toFixed(1) + "x" : "-"}
            </div>
            <div className="text-gray-400 text-sm">Top Outlier Score</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="text-3xl font-bold text-orange-400">{trending.length}</div>
            <div className="text-gray-400 text-sm">Trending Today</div>
          </div>
        </div>

        {/* Today's Outliers */}
        <section className="mb-12">
          <h2 className="text-xl font-bold mb-4">Today&apos;s Outliers</h2>

          {results.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
              <div className="text-5xl mb-4">🔍</div>
              <h3 className="text-lg font-bold mb-2">No Outliers Today</h3>
              <p className="text-gray-400 mb-4">
                Your daily scan hasn&apos;t found any outlier videos yet. Check back later!
              </p>
              {channelCount === 0 && (
                <a
                  href="/channels"
                  className="inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition-colors"
                >
                  Add Channels to Track
                </a>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {results.map((result) => (
                <div
                  key={result.id}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <a
                        href={result.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-lg font-semibold hover:text-indigo-400 transition-colors"
                      >
                        {result.title}
                      </a>
                      <p className="text-gray-400 text-sm mt-1">{result.channel_name}</p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getSentimentColor(
                        result.sentiment
                      )}`}
                    >
                      {result.sentiment?.toUpperCase() || "NEUTRAL"}
                    </span>
                  </div>

                  <div className="flex gap-6 mb-4">
                    <div>
                      <div className="text-xl font-bold">{formatViews(result.view_count)}</div>
                      <div className="text-gray-500 text-xs">Views</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-indigo-400">
                        {result.outlier_score.toFixed(1)}x
                      </div>
                      <div className="text-gray-500 text-xs">Outlier Score</div>
                    </div>
                  </div>

                  <p className="text-gray-300 text-sm mb-4">{result.summary}</p>

                  {result.key_claims && result.key_claims.length > 0 && (
                    <div className="border-t border-gray-800 pt-4">
                      <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">
                        Key Takeaways
                      </h4>
                      <ul className="text-sm text-gray-400 space-y-1">
                        {result.key_claims.slice(0, 3).map((claim, i) => (
                          <li key={i}>• {claim}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <a
                    href={result.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    Watch Video
                  </a>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Trending in Your Niche */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">🔥 Trending in Your Niche</h2>
            {trending.length > 0 && (
              <span className="text-gray-500 text-sm">{trending.length} videos today</span>
            )}
          </div>

          {trending.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-10 text-center">
              <div className="text-4xl mb-3">🔥</div>
              <h3 className="text-lg font-bold mb-2">No Trending Videos Today</h3>
              <p className="text-gray-400 text-sm">
                Set your discovery keywords in{" "}
                <a href="/settings" className="text-indigo-400 hover:underline">
                  Settings
                </a>{" "}
                to see what&apos;s hot in your niche.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {trending.map((video) => (
                <div
                  key={video.id}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {video.thumbnail && (
                      <a
                        href={video.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0"
                      >
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="w-32 h-[72px] object-cover rounded-lg"
                        />
                      </a>
                    )}
                    <div className="flex-1 min-w-0">
                      <a
                        href={video.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-sm hover:text-indigo-400 transition-colors line-clamp-1"
                      >
                        {video.title}
                      </a>
                      <p className="text-gray-500 text-xs mt-1">{video.channel_name}</p>
                      {video.relevance_reason && (
                        <p className="text-gray-400 text-xs mt-1 line-clamp-1">
                          {video.relevance_reason}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-5 shrink-0">
                      <div className="text-right">
                        <div className="font-semibold text-sm">
                          {formatViews(video.view_count)}
                        </div>
                        <div className="text-gray-500 text-xs">Views</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-sm text-cyan-400">
                          {formatViewsPerHour(video.views_per_hour)}
                        </div>
                        <div className="text-gray-500 text-xs">Velocity</div>
                      </div>
                      {video.relevance_score > 0 && (
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-medium ${getRelevanceColor(
                            video.relevance_score
                          )}`}
                        >
                          {video.relevance_score.toFixed(0)}/10
                        </span>
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
