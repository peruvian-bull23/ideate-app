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
  plan: string;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [channelName, setChannelName] = useState("");
  const [emailSchedule, setEmailSchedule] = useState("daily");
  const [outlierThreshold, setOutlierThreshold] = useState(2.0);
  const [discoveryNiche, setDiscoveryNiche] = useState("");
  const [keywords, setKeywords] = useState("");

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
          <div className="text-sm" style={{ color: "var(--text-muted)" }}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <Navbar />
      <main className="max-w-2xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-tertiary)" }}>
            Manage your account and preferences
          </p>
        </div>

        <form onSubmit={saveSettings} className="space-y-6">
          {/* Account */}
          <section className="rounded-lg p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
            <h2 className="text-base font-bold mb-4" style={{ color: "var(--text-primary)" }}>
              Account
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-tertiary)" }}>Email</label>
                <input
                  type="email" value={profile?.email || ""} disabled
                  className="w-full px-3.5 py-2.5 rounded-md text-sm cursor-not-allowed"
                  style={{ ...inputStyle, color: "var(--text-muted)" }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-tertiary)" }}>Your YouTube Channel Name</label>
                <input
                  type="text" value={channelName} onChange={(e) => setChannelName(e.target.value)}
                  placeholder="e.g., Peruvian Bull"
                  className="w-full px-3.5 py-2.5 rounded-md text-sm"
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-tertiary)" }}>Plan</label>
                <span
                  className="inline-block text-[11px] font-medium px-2.5 py-1 rounded"
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
            <h2 className="text-base font-bold mb-4" style={{ color: "var(--text-primary)" }}>
              Email Schedule
            </h2>
            <select
              value={emailSchedule} onChange={(e) => setEmailSchedule(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-md text-sm"
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
            <h2 className="text-base font-bold mb-4" style={{ color: "var(--text-primary)" }}>
              Scan Settings
            </h2>
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-tertiary)" }}>
                Outlier Threshold: <span className="font-mono" style={{ color: "var(--gold)" }}>{outlierThreshold.toFixed(1)}x</span>
              </label>
              <input
                type="range" min="1.5" max="10" step="0.5"
                value={outlierThreshold} onChange={(e) => setOutlierThreshold(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
                <span>1.5x — More results</span>
                <span>10x — Only top viral</span>
              </div>
            </div>
          </section>

          {/* Discovery */}
          <section className="rounded-lg p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
            <h2 className="text-base font-bold mb-4" style={{ color: "var(--text-primary)" }}>
              Discovery
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-tertiary)" }}>Your Niche</label>
                <input
                  type="text" value={discoveryNiche} onChange={(e) => setDiscoveryNiche(e.target.value)}
                  placeholder="e.g., finance and economics"
                  className="w-full px-3.5 py-2.5 rounded-md text-sm"
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-tertiary)" }}>Discovery Keywords</label>
                <textarea
                  value={keywords} onChange={(e) => setKeywords(e.target.value)}
                  placeholder="bitcoin, federal reserve, inflation, market crash"
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-md text-sm resize-none"
                  style={inputStyle}
                />
                <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
                  Comma-separated keywords for trending video discovery
                </p>
              </div>
            </div>
          </section>

          {/* Save */}
          <div className="flex items-center gap-3">
            <button
              type="submit" disabled={saving}
              className="px-5 py-2.5 rounded-md text-sm font-medium disabled:opacity-50"
              style={{ background: "var(--gold)", color: "var(--bg-primary)" }}
            >
              {saving ? "Saving..." : "Save Settings"}
            </button>
            {message && (
              <span className="text-xs font-medium" style={{ color: message === "Saved" ? "var(--green)" : "var(--red)" }}>
                {message}
              </span>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}
