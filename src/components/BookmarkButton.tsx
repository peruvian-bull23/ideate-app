"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";

interface BookmarkButtonProps {
  videoId: string;
  title: string;
  channelName: string;
  link: string;
  viewCount: number;
  outlierScore?: number;
  summary?: string;
  sentiment?: string;
  thumbnail?: string;
  isSaved: boolean;
  onToggle: (videoId: string, saved: boolean) => void;
}

export default function BookmarkButton({
  videoId, title, channelName, link, viewCount,
  outlierScore, summary, sentiment, thumbnail,
  isSaved, onToggle,
}: BookmarkButtonProps) {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    if (isSaved) {
      await supabase.from("saved_videos").delete().eq("user_id", user.id).eq("video_id", videoId);
      onToggle(videoId, false);
    } else {
      await supabase.from("saved_videos").insert({
        user_id: user.id,
        video_id: videoId,
        title,
        channel_name: channelName,
        link,
        view_count: viewCount,
        outlier_score: outlierScore || null,
        summary: summary || null,
        sentiment: sentiment || null,
        thumbnail: thumbnail || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
      });
      onToggle(videoId, true);
    }
    setLoading(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="p-1.5 rounded-md transition-colors disabled:opacity-50"
      style={{
        color: isSaved ? "var(--gold)" : "var(--text-muted)",
        background: isSaved ? "var(--gold-bg)" : "transparent",
      }}
      title={isSaved ? "Remove from saved" : "Save video"}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill={isSaved ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
      </svg>
    </button>
  );
}
