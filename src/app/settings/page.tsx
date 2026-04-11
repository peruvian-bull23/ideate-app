"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import Navbar from "@/components/Navbar";

interface Profile {
  email: string;
  youtube_channel_name: string | null;
  email_schedule: string;
  outlier_threshold: number;
  discovery_niche: string | null;
  discovery_keywords: string[] | null;
  discovery_min_subs: number | null;
  discovery_max_subs: number | null;
  trending_min_views_per_hour: number | null;
  trending_english_only: boolean | null;
  trending_max_age_hours: number | null;
  plan: string;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [message, setMessage] = useState("");

  const [channelName, setChannelName] = useState("");
  const [emailSchedule, setEmailSchedule] = useState("daily");
  const [outlierThreshold, setOutlierThreshold] = useState(2.0);
  const [discoveryNiche, setDiscoveryNiche] = useState("");
  const [keywords, setKeywords] = useState("");
  const [minSubs, setMinSubs] = useState(10000);
  const [maxSubs, setMaxSubs] = useState(1000000);
  const [trendingMinVPH, setTrendingMinVPH] = useState(500);
  const [trendingEnglishOnly, setTrendingEnglishOnly] = useState(true);
  const [trendingMaxAge, setTrendingMaxAge] = useState(48);

  const supabase = createClient();

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }

      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (data) {
        setProfile({ ...data, email: user.email || "" });
        setChannelName(data.youtube_channel_name || "");
        setEmailSchedule(data.email_schedule || "daily");
        setOutlierThreshold(data.outlier_threshold || 2.0);
        setDiscoveryNiche(data.discovery_niche || "");
        setKeywords(data.discovery_keywords?.join(", ") || "");
        setMinSubs(data.discovery_min_subs ?? 10000);
        setMaxSubs(data.discovery_max_subs ?? 1000000);
        setTrendingMinVPH(data.trending_min_views_per_hour ?? 500);
        setTrendingEnglishOnly(data.trending_english_only ?? true);
        setTrendingMaxAge(data.trending_max_age_hours ?? 48);
      }
      setLoading(false);
    }
    loadProfile();
  }, []);

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const keywordsArray = keywords.split(",").map((k) => k.trim()).filter((k) => k.length > 0);

    const { error } = await supabase.from("profiles").update({
      youtube_channel_name: channelName || null,
      email_schedule: emailSchedule,
      outlier_threshold: outlierThreshold,
      discovery_niche: discoveryNiche || null,
      discovery_keywords: keywordsArray.length > 0 ? keywordsArray : null,
      discovery_min_subs: minSubs,
      discovery_max_subs: maxSubs,
      trending_min_views_per_hour: trendingMinVPH,
      trending_english_only: trendingEnglishOnly,
      trending_max_age_hours: trendingMaxAge,
    }).eq("id", user.id);

    setMessage(error ? "Failed to save settings" : "Saved");
    setSaving(false);
    if (!error) setTimeout(() => setMessage(""), 2000);
  }

  const inputStyle = {
    background: "var(--bg-elevated)",
    border: "1px solid var(--border-default)",
    color: "var(--text-primary)",
    outline: "none",
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="text-base" style={{ color: "var(--text-muted)" }}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <Navbar />
      <main className="max-w-2xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">Settings</h1>
          <p className="text-lg mt-1" style={{ color: "var(--text-tertiary)" }}>
            Manage your account and preferences
          </p>
        </div>

        <form onSubmit={saveSettings} className="space-y-6">
          {/* Account */}
          <section className="rounded-lg p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
              Account
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-base font-medium mb-1.5" style={{ color: "var(--text-tertiary)" }}>Email</label>
                <input
                  type="email" value={profile?.email || ""} disabled
                  className="w-full px-3.5 py-2.5 rounded-md text-base cursor-not-allowed"
                  style={{ ...inputStyle, color: "var(--text-muted)" }}
                />
              </div>
              <div>
                <label className="block text-base font-medium mb-1.5" style={{ color: "var(--text-tertiary)" }}>Your YouTube Channel Name</label>
                <input
                  type="text" value={channelName} onChange={(e) => setChannelName(e.target.value)}
                  placeholder="e.g., Peruvian Bull"
                  className="w-full px-3.5 py-2.5 rounded-md text-base"
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-base font-medium mb-1.5" style={{ color: "var(--text-tertiary)" }}>Plan</label>
                <span
                  className="inline-block text-base font-medium px-2.5 py-1 rounded"
                  style={{
                    color: profile?.plan === "pro" ? "var(--gold)" : "var(--text-tertiary)",
                    background: profile?.plan === "pro" ? "var(--gold-bg)" : "var(--bg-elevated)",
                  }}
                >
                  {profile?.plan?.toUpperCase() || "FREE"}
                </span>
              </div>
            </div>
          </section>

          {/* Email */}
          <section className="rounded-lg p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
              Email Schedule
            </h2>
            <select
              value={emailSchedule} onChange={(e) => setEmailSchedule(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-md text-base"
              style={inputStyle}
            >
              <option value="daily">Daily</option>
              <option value="weekdays">Weekdays Only</option>
              <option value="weekly_monday">Weekly on Monday</option>
              <option value="weekly_sunday">Weekly on Sunday</option>
              <option value="none">Paused</option>
            </select>
          </section>

          {/* Scan */}
          <section className="rounded-lg p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
              Scan Settings
            </h2>
            <div>
              <label className="block text-base font-medium mb-2" style={{ color: "var(--text-tertiary)" }}>
                Outlier Threshold: <span className="font-mono" style={{ color: "var(--gold)" }}>{outlierThreshold.toFixed(1)}x</span>
              </label>
              <input
                type="range" min="1.5" max="10" step="0.5"
                value={outlierThreshold} onChange={(e) => setOutlierThreshold(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-base mt-1" style={{ color: "var(--text-muted)" }}>
                <span>1.5x — More results</span>
                <span>10x — Only top viral</span>
              </div>
            </div>
          </section>

          {/* Trending Videos */}
          <section className="rounded-lg p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
              Trending Videos
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-base font-medium mb-2" style={{ color: "var(--text-tertiary)" }}>
                  Minimum Views per Hour: <span className="font-mono" style={{ color: "var(--gold)" }}>{trendingMinVPH.toLocaleString()}</span>
                </label>
                <input
                  type="range" min="0" max="5000" step="100"
                  value={trendingMinVPH} onChange={(e) => setTrendingMinVPH(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-base mt-1" style={{ color: "var(--text-muted)" }}>
                  <span>0 — Show all</span>
                  <span>5,000 — Only fast movers</span>
                </div>
              </div>

              <div>
                <label className="block text-base font-medium mb-2" style={{ color: "var(--text-tertiary)" }}>
                  Max Video Age: <span className="font-mono" style={{ color: "var(--gold)" }}>{trendingMaxAge}h</span>
                </label>
                <input
                  type="range" min="6" max="168" step="6"
                  value={trendingMaxAge} onChange={(e) => setTrendingMaxAge(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-base mt-1" style={{ color: "var(--text-muted)" }}>
                  <span>6h — Very fresh only</span>
                  <span>168h (7 days)</span>
                </div>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <label className="block text-base font-medium" style={{ color: "var(--text-tertiary)" }}>
                    English Only
                  </label>
                  <p className="text-base mt-0.5" style={{ color: "var(--text-muted)" }}>
                    Only show videos in English
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setTrendingEnglishOnly(!trendingEnglishOnly)}
                  className="relative w-12 h-7 rounded-full transition-colors"
                  style={{
                    background: trendingEnglishOnly ? "var(--gold)" : "var(--bg-elevated)",
                    border: trendingEnglishOnly ? "none" : "1px solid var(--border-default)",
                  }}
                >
                  <span
                    className="absolute top-0.5 w-6 h-6 rounded-full transition-transform"
                    style={{
                      background: trendingEnglishOnly ? "var(--bg-primary)" : "var(--text-muted)",
                      left: trendingEnglishOnly ? "calc(100% - 1.625rem)" : "0.125rem",
                    }}
                  />
                </button>
              </div>
            </div>
          </section>

          {/* Discovery */}
          <section className="rounded-lg p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
              Discovery
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-base font-medium mb-1.5" style={{ color: "var(--text-tertiary)" }}>Your Niche</label>
                <input
                  type="text" value={discoveryNiche} onChange={(e) => setDiscoveryNiche(e.target.value)}
                  placeholder="e.g., finance and economics"
                  className="w-full px-3.5 py-2.5 rounded-md text-base"
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-base font-medium mb-1.5" style={{ color: "var(--text-tertiary)" }}>Discovery Keywords</label>
                <textarea
                  value={keywords} onChange={(e) => setKeywords(e.target.value)}
                  placeholder="bitcoin, federal reserve, inflation, market crash"
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-md text-base resize-none"
                  style={inputStyle}
                />
                <p className="text-base mt-1" style={{ color: "var(--text-muted)" }}>
                  Comma-separated keywords for trending video discovery
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-base font-medium mb-1.5" style={{ color: "var(--text-tertiary)" }}>
                    Minimum Subscribers
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={minSubs.toLocaleString()}
                      onChange={(e) => {
                        const val = parseInt(e.target.value.replace(/[^0-9]/g, "")) || 0;
                        setMinSubs(val);
                      }}
                      className="w-full px-3.5 py-2.5 rounded-md text-base font-mono"
                      style={inputStyle}
                    />
                  </div>
                  <p className="text-base mt-1" style={{ color: "var(--text-muted)" }}>
                    Filter out channels below this size
                  </p>
                </div>
                <div>
                  <label className="block text-base font-medium mb-1.5" style={{ color: "var(--text-tertiary)" }}>
                    Maximum Subscribers
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={maxSubs.toLocaleString()}
                      onChange={(e) => {
                        const val = parseInt(e.target.value.replace(/[^0-9]/g, "")) || 0;
                        setMaxSubs(val);
                      }}
                      className="w-full px-3.5 py-2.5 rounded-md text-base font-mono"
                      style={inputStyle}
                    />
                  </div>
                  <p className="text-base mt-1" style={{ color: "var(--text-muted)" }}>
                    Filter out established channels above this size
                  </p>
                </div>
              </div>

              {/* Quick presets */}
              <div>
                <label className="block text-base font-medium mb-2" style={{ color: "var(--text-tertiary)" }}>
                  Quick Presets
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "Small (1K–50K)", min: 1000, max: 50000 },
                    { label: "Mid (10K–500K)", min: 10000, max: 500000 },
                    { label: "Growth (10K–1M)", min: 10000, max: 1000000 },
                    { label: "Large (100K–5M)", min: 100000, max: 5000000 },
                    { label: "All sizes", min: 0, max: 100000000 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => { setMinSubs(preset.min); setMaxSubs(preset.max); }}
                      className="px-3 py-1.5 rounded-md text-base font-medium"
                      style={{
                        color: minSubs === preset.min && maxSubs === preset.max ? "var(--gold)" : "var(--text-muted)",
                        background: minSubs === preset.min && maxSubs === preset.max ? "var(--gold-bg)" : "var(--bg-elevated)",
                        border: minSubs === preset.min && maxSubs === preset.max ? "1px solid var(--gold-border)" : "1px solid transparent",
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Save */}
          <div className="flex items-center gap-3">
            <button
              type="submit" disabled={saving}
              className="px-5 py-2.5 rounded-md text-base font-medium disabled:opacity-50"
              style={{ background: "var(--gold)", color: "var(--bg-primary)" }}
            >
              {saving ? "Saving..." : "Save Settings"}
            </button>
            {message && (
              <span className="text-base font-medium" style={{ color: message === "Saved" ? "var(--green)" : "var(--red)" }}>
                {message}
              </span>
            )}
          </div>
        </form>

        {/* Export All Data */}
        <section className="rounded-lg p-5 mt-8" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
          <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
            Export Your Data
          </h2>
          <p className="text-base mb-4" style={{ color: "var(--text-tertiary)" }}>
            Download all your Ideate data as CSV files — outlier scans, saved videos, tracked channels, trending videos, and discovered channels.
          </p>
          <button
            onClick={async () => {
              setExporting(true);
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) { setExporting(false); return; }

              const [resultsRes, savedRes, channelsRes, trendingRes, discoverRes] = await Promise.all([
                supabase.from("results").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1000),
                supabase.from("saved_videos").select("*").eq("user_id", user.id).order("saved_at", { ascending: false }),
                supabase.from("user_channels").select("*").eq("user_id", user.id).order("added_at", { ascending: false }),
                supabase.from("discovery_trending_videos").select("*").eq("user_id", user.id).order("discovered_at", { ascending: false }).limit(500),
                supabase.from("discovered_channels").select("*").order("discovered_at", { ascending: false }).limit(500),
              ]);

              const results = resultsRes.data || [];
              const saved = savedRes.data || [];
              const channels = channelsRes.data || [];
              const trending = trendingRes.data || [];
              const discovered = discoverRes.data || [];

              const escape = (val: string) => {
                if (val.includes(",") || val.includes('"') || val.includes("\n")) {
                  return '"' + val.replace(/"/g, '""') + '"';
                }
                return val;
              };
              const row = (cells: string[]) => cells.map(escape).join(",");

              const sections: string[] = [];

              // Outlier Results
              sections.push("=== OUTLIER RESULTS (" + results.length + ") ===");
              sections.push(row(["Title", "Channel", "Views", "Outlier Score", "Sentiment", "Summary", "Link", "Date"]));
              results.forEach((r) => sections.push(row([
                r.title || "", r.channel_name || "", String(r.view_count || 0),
                r.outlier_score ? r.outlier_score.toFixed(1) + "x" : "", r.sentiment || "",
                r.summary || "", r.link || "", new Date(r.created_at).toLocaleDateString(),
              ])));

              sections.push("");

              // Saved Videos
              sections.push("=== SAVED VIDEOS (" + saved.length + ") ===");
              sections.push(row(["Title", "Channel", "Views", "Outlier Score", "Sentiment", "Summary", "Link", "Saved On"]));
              saved.forEach((v) => sections.push(row([
                v.title || "", v.channel_name || "", String(v.view_count || 0),
                v.outlier_score ? Number(v.outlier_score).toFixed(1) + "x" : "",
                v.sentiment || "", v.summary || "", v.link || "",
                new Date(v.saved_at).toLocaleDateString(),
              ])));

              sections.push("");

              // Tracked Channels
              sections.push("=== TRACKED CHANNELS (" + channels.length + ") ===");
              sections.push(row(["Channel Name", "Channel ID", "Subscribers", "Total Views", "Videos", "Country", "Description", "Added"]));
              channels.forEach((ch) => sections.push(row([
                ch.channel_name || "", ch.channel_id || "", String(ch.subscriber_count || 0),
                String(ch.total_view_count || 0), String(ch.video_count || 0),
                ch.country || "", ch.description || "",
                new Date(ch.added_at).toLocaleDateString(),
              ])));

              sections.push("");

              // Trending Videos
              sections.push("=== TRENDING VIDEOS (" + trending.length + ") ===");
              sections.push(row(["Title", "Channel", "Views", "Views/Hour", "Relevance Score", "Relevance Reason", "Link", "Discovered"]));
              trending.forEach((v) => sections.push(row([
                v.title || "", v.channel_name || "", String(v.view_count || 0),
                v.views_per_hour ? v.views_per_hour.toFixed(0) : "",
                v.relevance_score ? v.relevance_score.toFixed(0) + "/10" : "",
                v.relevance_reason || "", v.link || "",
                new Date(v.discovered_at).toLocaleDateString(),
              ])));

              sections.push("");

              // Discovered Channels
              sections.push("=== DISCOVERED CHANNELS (" + discovered.length + ") ===");
              sections.push(row(["Channel Name", "Channel ID", "Subscribers", "Videos", "Discovered From", "Discovered On"]));
              discovered.forEach((ch) => sections.push(row([
                ch.channel_name || "", ch.channel_id || "",
                String(ch.subscriber_count || 0), String(ch.video_count || 0),
                ch.discovered_from || "", new Date(ch.discovered_at).toLocaleDateString(),
              ])));

              const csv = sections.join("\n");
              const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "ideate-export-" + new Date().toISOString().slice(0, 10) + ".csv";
              a.click();
              URL.revokeObjectURL(url);

              setExporting(false);
            }}
            disabled={exporting}
            className="flex items-center gap-2.5 px-6 py-3 rounded-md text-base font-semibold disabled:opacity-50"
            style={{ background: "var(--bg-elevated)", color: "var(--text-primary)", border: "1px solid var(--border-default)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {exporting ? "Exporting..." : "Export All Data"}
          </button>
          <p className="text-base mt-2" style={{ color: "var(--text-muted)" }}>
            Downloads a single CSV with all your data organized by section.
          </p>
        </section>

        {/* Danger Zone */}
        <section className="rounded-lg p-5 mt-8" style={{ background: "var(--bg-card)", border: "1px solid rgba(248,113,113,0.2)" }}>
          <h2 className="text-xl font-bold mb-2" style={{ color: "var(--red)" }}>
            Danger Zone
          </h2>
          <p className="text-base mb-4" style={{ color: "var(--text-tertiary)" }}>
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-md text-base font-medium"
              style={{ color: "var(--red)", background: "var(--red-bg)", border: "1px solid rgba(248,113,113,0.2)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
              </svg>
              Delete Account
            </button>
          ) : (
            <div className="rounded-md p-4" style={{ background: "var(--bg-elevated)", border: "1px solid rgba(248,113,113,0.3)" }}>
              <p className="text-base font-medium mb-3" style={{ color: "var(--text-primary)" }}>
                Type <span className="font-mono font-bold" style={{ color: "var(--red)" }}>DELETE</span> to confirm:
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE"
                className="w-full px-3.5 py-2.5 rounded-md text-base font-mono mb-3"
                style={{
                  background: "var(--bg-primary)",
                  border: "1px solid rgba(248,113,113,0.3)",
                  color: "var(--text-primary)",
                  outline: "none",
                }}
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(""); }}
                  className="px-4 py-2 rounded-md text-base font-medium"
                  style={{ color: "var(--text-muted)", background: "var(--bg-card)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (deleteConfirmText !== "DELETE") return;
                    setDeleting(true);

                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) return;

                    // Delete user data from all tables
                    await Promise.all([
                      supabase.from("results").delete().eq("user_id", user.id),
                      supabase.from("saved_videos").delete().eq("user_id", user.id),
                      supabase.from("user_channels").delete().eq("user_id", user.id),
                      supabase.from("discovery_trending_videos").delete().eq("user_id", user.id),
                      supabase.from("ignored_discovery_channels").delete().eq("user_id", user.id),
                      supabase.from("emailed_videos").delete().eq("user_id", user.id),
                      supabase.from("scans").delete().eq("user_id", user.id),
                      supabase.from("my_recent_videos").delete().eq("user_id", user.id),
                      supabase.from("profiles").delete().eq("id", user.id),
                    ]);

                    // Sign out
                    await supabase.auth.signOut();
                    window.location.href = "/login";
                  }}
                  disabled={deleteConfirmText !== "DELETE" || deleting}
                  className="px-4 py-2 rounded-md text-base font-semibold disabled:opacity-30"
                  style={{ background: "var(--red)", color: "#fff" }}
                >
                  {deleting ? "Deleting..." : "Permanently Delete Account"}
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
