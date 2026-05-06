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
  // Try by ID first (UC... format)
  let url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&id=${channelId}&key=${youtubeApiKey}`;
  let res = await fetch(url);
  let data = await res.json();
  
  // If not found by ID, try by handle (@ format)
  if (!data.items || data.items.length === 0) {
    const handle = channelId.replace(/^@/, "");
    url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&forHandle=${handle}&key=${youtubeApiKey}`;
    res = await fetch(url);
    data = await res.json();
  }

  // If still not found, try by username
  if (!data.items || data.items.length === 0) {
    url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&forUsername=${channelId}&key=${youtubeApiKey}`;
    res = await fetch(url);
    data = await res.json();
  }
  
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
    // Method 1: Try YouTube's innertube API for captions
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const watchRes = await fetch(watchUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      signal: AbortSignal.timeout(10000),
    });
    if (!watchRes.ok) return null;

    const html = await watchRes.text();

    // Extract captions URL from the page
    const captionMatch = html.match(/"captionTracks":\[.*?"baseUrl":"(.*?)"/);
    if (!captionMatch) return null;

    const captionUrl = captionMatch[1].replace(/\\u0026/g, "&");
    const captionRes = await fetch(captionUrl, { signal: AbortSignal.timeout(10000) });
    if (!captionRes.ok) return null;

    const xml = await captionRes.text();

    // Parse the XML transcript
    const textMatches = xml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g);
    const lines: string[] = [];
    for (const match of textMatches) {
      let text = match[1];
      // Decode HTML entities
      text = text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\n/g, " ");
      if (text.trim()) lines.push(text.trim());
    }

    return lines.length > 0 ? lines.join(" ") : null;
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
