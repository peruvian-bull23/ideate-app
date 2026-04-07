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

interface Profile {
  youtube_channel_name: string | null;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [results, setResults] = useState<Result[]>([]);
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

      const { data: profileData } = await supabase
        .from("profiles")
        .select("youtube_channel_name")
        .eq("id", user.id)
        .single();
      
      setProfile(profileData);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: resultsData } = await supabase
        .from("results")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", today.toISOString())
        .order("outlier_score", { ascending: false });
      
      setResults(resultsData || []);

      const { count } = await supabase
        .from("user_channels")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      
      setChannelCount(count || 0);
      setLoading(false);
    }

    loadData();
  }, []);

  const formatViews = (views: number) => {
    if (views >= 1000000) return (views / 1000000).toFixed(1) + "M";
    if (views >= 1000) return (views / 1000).toFixed(0) + "K";
    return views.toString();
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment?.toLowerCase()) {
      case "bullish": return "text-green-400 bg-green-400/10";
      case "bearish": return "text-red-400 bg-red-400/10";
      default: return "text-gray-400 bg-gray-400/10";
    }
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
        </div>

        {results.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
            <div className="text-5xl mb-4">🔍</div>
            <h2 className="text-xl font-bold mb-2">No Outliers Today</h2>
            <p className="text-gray-400 mb-4">
              Your daily scan has not found any outlier videos yet. Check back later!
            </p>
            {channelCount === 0 && (
              <a href="/channels" className="inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition-colors">
                Add Channels to Track
              </a>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Todays Outliers</h2>
            {results.map((result) => (
              <div key={result.id} className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <a href={result.link} target="_blank" rel="noopener noreferrer" className="text-lg font-semibold hover:text-indigo-400 transition-colors">
                      {result.title}
                    </a>
                    <p className="text-gray-400 text-sm mt-1">{result.channel_name}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getSentimentColor(result.sentiment)}`}>
                    {result.sentiment?.toUpperCase() || "NEUTRAL"}
                  </span>
                </div>

                <div className="flex gap-6 mb-4">
                  <div>
                    <div className="text-xl font-bold">{formatViews(result.view_count)}</div>
                    <div className="text-gray-500 text-xs">Views</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-indigo-400">{result.outlier_score.toFixed(1)}x</div>
                    <div className="text-gray-500 text-xs">Outlier Score</div>
                  </div>
                </div>

                <p className="text-gray-300 text-sm mb-4">{result.summary}</p>

                {result.key_claims && result.key_claims.length > 0 && (
                  <div className="border-t border-gray-800 pt-4">
                    <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Key Takeaways</h4>
                    <ul className="text-sm text-gray-400 space-y-1">
                      {result.key_claims.slice(0, 3).map((claim, i) => (
                        <li key={i}>• {claim}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <a href={result.link} target="_blank" rel="noopener noreferrer" className="inline-block mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors">
                  Watch Video
                </a>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
