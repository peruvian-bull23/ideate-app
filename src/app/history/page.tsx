"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import Navbar from "@/components/Navbar";

interface Result {
  id: number;
  title: string;
  channel_name: string;
  view_count: number;
  outlier_score: number;
  link: string;
  summary: string;
  sentiment: string;
  created_at: string;
}

interface GroupedResults {
  [date: string]: Result[];
}

export default function HistoryPage() {
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadHistory() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data } = await supabase
        .from("results")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200);

      setResults(data || []);
      setLoading(false);
    }

    loadHistory();
  }, []);

  const formatViews = (views: number) => {
    if (views >= 1000000) return (views / 1000000).toFixed(1) + "M";
    if (views >= 1000) return (views / 1000).toFixed(0) + "K";
    return views.toString();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const groupByDate = (results: Result[]): GroupedResults => {
    return results.reduce((groups: GroupedResults, result) => {
      const date = new Date(result.created_at).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(result);
      return groups;
    }, {});
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

  const groupedResults = groupByDate(results);
  const dates = Object.keys(groupedResults);

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">History</h1>
          <p className="text-gray-400">Browse your past outlier video results</p>
        </div>

        {results.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
            <div className="text-5xl mb-4">📜</div>
            <h2 className="text-xl font-bold mb-2">No History Yet</h2>
            <p className="text-gray-400">
              Your scan results will appear here after your first daily scan
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {dates.map((date) => (
              <div key={date}>
                <div className="flex items-center gap-4 mb-4">
                  <h2 className="text-lg font-semibold">{formatDate(date)}</h2>
                  <span className="px-3 py-1 bg-indigo-600/20 text-indigo-400 rounded-full text-sm">
                    {groupedResults[date].length} video{groupedResults[date].length !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className="space-y-3">
                  {groupedResults[date].map((result) => (
                    <div
                      key={result.id}
                      className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          
                            href={result.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold hover:text-indigo-400 transition-colors"
                          >
                            {result.title}
                          </a>
                          <p className="text-gray-500 text-sm mt-1">{result.channel_name}</p>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-semibold">{formatViews(result.view_count)}</div>
                            <div className="text-gray-500 text-xs">Views</div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-indigo-400">{result.outlier_score.toFixed(1)}x</div>
                            <div className="text-gray-500 text-xs">Score</div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getSentimentColor(result.sentiment)}`}>
                            {result.sentiment?.toUpperCase() || "NEUTRAL"}
                          </span>
                        </div>
                      </div>

                      {result.summary && (
                        <p className="text-gray-400 text-sm mt-3 line-clamp-2">{result.summary}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 text-center text-gray-500 text-sm">
          Showing {results.length} result{results.length !== 1 ? "s" : ""}
        </div>
      </main>
    </div>
  );
}
