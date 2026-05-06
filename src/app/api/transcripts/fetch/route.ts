import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const youtubeApiKey = process.env.YOUTUBE_API_KEY!;

interface VideoInfo {
  id: string;
  title: string;
  channelName: string;
  channelId: string;
  publishedAt: string;
  viewCount: number;
  thumbnail: string;
}

async function getChannelInfo(channelId: string): Promise<{ name: string; uploadsPlaylist: string } | null> {
  const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&id=${channelId}&key=${youtubeApiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  
  if (!data.items || data.items.length === 0) return null;
  
  return {
    name: data.items[0].snippet.title,
    uploadsPlaylist: data.items[0].contentDetails.relatedPlaylists.uploads,
  };
}

async function getAllVideoIds(uploadsPlaylistId: string): Promise<string[]> {
  const videoIds: string[] = [];
  let nextPageToken: string | undefined;
  
  do {
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${uploadsPlaylistId}&maxResults=50&key=${youtubeApiKey}${nextPageToken ? `&pageToken=${nextPageToken}` : ""}`;
    const res = await fetch(url);
    const data = await res.json();
    
    for (const item of data.items || []) {
      videoIds.push(item.contentDetails.videoId);
    }
    nextPageToken = data.nextPageToken;
  } while (nextPageToken);
  
  return videoIds;
}

async function getVideoDetails(videoIds: string[]): Promise<VideoInfo[]> {
  const videos: VideoInfo[] = [];
  
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${batch.join(",")}&key=${youtubeApiKey}`;
    const res = await fetch(url);
    const data = await res.json();
    
    for (const item of data.items || []) {
      videos.push({
        id: item.id,
        title: item.snippet.title,
        channelName: item.snippet.channelTitle,
        channelId: item.snippet.channelId,
        publishedAt: item.snippet.publishedAt,
        viewCount: parseInt(item.statistics.viewCount || "0", 10),
        thumbnail: item.snippet.thumbnails?.medium?.url || "",
      });
    }
  }
  return videos;
}

async function fetchTranscript(videoId: string): Promise<string | null> {
  try {
    const url = `https://yt.lemnoslife.com/noKey/videos?part=transcript&id=${videoId}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    
    const data = await res.json();
    const transcriptData = data.items?.[0]?.transcript?.content;
    if (!transcriptData || !Array.isArray(transcriptData)) return null;
    
    return transcriptData.map((entry: any) => entry.text || "").join(" ") || null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  try {
    const { channel_id, top_n = 40 } = await request.json();
    
    if (!channel_id) {
      return NextResponse.json({ error: "channel_id is required" }, { status: 400 });
    }
    
    const channelInfo = await getChannelInfo(channel_id);
    if (!channelInfo) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }
    
    const allVideoIds = await getAllVideoIds(channelInfo.uploadsPlaylist);
    const allVideos = await getVideoDetails(allVideoIds);
    
    allVideos.sort((a, b) => b.viewCount - a.viewCount);
    const topVideos = allVideos.slice(0, top_n);
    
    const results: any[] = [];
    
    for (const video of topVideos) {
      const { data: existing } = await supabase
        .from("channel_video_transcripts")
        .select("*")
        .eq("video_id", video.id)
        .single();
      
      if (existing) {
        results.push(existing);
        continue;
      }
      
      const transcript = await fetchTranscript(video.id);
      
      const record = {
        video_id: video.id,
        channel_id: video.channelId,
        channel_name: video.channelName,
        title: video.title,
        view_count: video.viewCount,
        published_at: video.publishedAt,
        thumbnail: video.thumbnail,
        transcript,
        fetched_at: new Date().toISOString(),
      };
      
      await supabase.from("channel_video_transcripts").upsert(record, { onConflict: "video_id" });
      results.push(record);
      
      await new Promise((r) => setTimeout(r, 200));
    }
    
    return NextResponse.json({
      channel_id,
      channel_name: channelInfo.name,
      total_videos: allVideos.length,
      fetched: results.length,
      videos: results,
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
