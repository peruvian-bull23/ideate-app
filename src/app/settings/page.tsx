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
      
      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

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

    const keywordsArray = keywords
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    const { error } = await supabase
      .from("profiles")
      .update({
        youtube_channel_name: channelName || null,
        email_schedule: emailSchedule,
        outlier_threshold: outlierThreshold,
        discovery_niche: discoveryNiche || null,
        discovery_keywords: keywordsArray.length > 0 ? keywordsArray : null,
      })
      .eq("id", user.id);

    if (error) {
      setMessage("Failed to save settings");
    } else {
      setMessage("Settings saved successfully!");
    }
    setSaving(false);
  }

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
      
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-gray-400">Manage your account and preferences</p>
        </div>

        <form onSubmit={saveSettings} className="space-y-6">
          {/* Account Section */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Account</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={profile?.email || ""}
                  disabled
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Your YouTube Channel Name
                </label>
                <input
                  type="text"
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  placeholder="e.g., Peruvian Bull"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white"
                />
                <p className="text-gray-500 text-sm mt-1">Used to personalize your email digests</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Plan
                </label>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    profile?.plan === "pro" 
                      ? "bg-indigo-600/20 text-indigo-400" 
                      : "bg-gray-700 text-gray-300"
                  }`}>
                    {profile?.plan?.toUpperCase() || "FREE"}
                  </span>
                  {profile?.plan !== "pro" && (
                    <a href="/pricing" className="text-indigo-400 text-sm hover:underline">
                      Upgrade to Pro
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Email Settings */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Email Settings</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Email Schedule
              </label>
              <select
                value={emailSchedule}
                onChange={(e) => setEmailSchedule(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white"
              >
                <option value="daily">Daily</option>
                <option value="weekdays">Weekdays Only</option>
                <option value="weekly_monday">Weekly on Monday</option>
                <option value="weekly_sunday">Weekly on Sunday</option>
                <option value="none">Paused</option>
              </select>
            </div>
          </div>

          {/* Scan Settings */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Scan Settings</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Outlier Threshold: {outlierThreshold.toFixed(1)}x
              </label>
              <input
                type="range"
                min="1.5"
                max="10"
                step="0.5"
                value={outlierThreshold}
                onChange={(e) => setOutlierThreshold(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-gray-500 text-xs mt-1">
                <span>1.5x - More results</span>
                <span>10x - Only top viral</span>
              </div>
            </div>
          </div>

          {/* Discovery Settings */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Discovery Settings</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Your Niche
                </label>
                <input
                  type="text"
                  value={discoveryNiche}
                  onChange={(e) => setDiscoveryNiche(e.target.value)}
                  placeholder="e.g., finance and economics"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Discovery Keywords
                </label>
                <textarea
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="bitcoin, federal reserve, inflation, market crash"
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white resize-none"
                />
                <p className="text-gray-500 text-sm mt-1">Comma-separated keywords for trending video discovery</p>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Settings"}
            </button>
            {message && (
              <span className={message.includes("Failed") ? "text-red-400" : "text-green-400"}>
                {message}
              </span>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}
