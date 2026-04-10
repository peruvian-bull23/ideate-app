"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

interface StepProps {
  onNext: () => void;
  onBack?: () => void;
}

function LogoHeader() {
  return (
    <div className="flex items-center gap-2.5 mb-8">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--gold)" }}>
        <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
      </svg>
      <span className="text-xl font-semibold tracking-tight" style={{ color: "var(--gold)" }}>Ideate</span>
    </div>
  );
}

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex gap-2 mb-8">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className="h-1 flex-1 rounded-full transition-colors"
          style={{
            background: i <= step ? "var(--gold)" : "var(--bg-elevated)",
          }}
        />
      ))}
    </div>
  );
}

const inputStyle = {
  background: "var(--bg-elevated)",
  border: "1px solid var(--border-default)",
  color: "var(--text-primary)",
  outline: "none",
};

// Step 1: Your Channel
function StepChannel({ onNext }: StepProps) {
  const [channelName, setChannelName] = useState("");
  const [channelUrl, setChannelUrl] = useState("");
  const [niche, setNiche] = useState("");
  const supabase = createClient();

  async function handleNext() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Save profile fields
    await supabase.from("profiles").update({
      youtube_channel_name: channelName || null,
      discovery_niche: niche || null,
    }).eq("id", user.id);

    // If they provided a channel URL, try to extract and save the channel ID
    if (channelUrl.trim()) {
      let channelId = channelUrl.trim();
      const patterns = [
        /youtube\.com\/channel\/([a-zA-Z0-9_-]+)/,
        /youtube\.com\/@([a-zA-Z0-9_-]+)/,
        /youtube\.com\/c\/([a-zA-Z0-9_-]+)/,
        /youtube\.com\/user\/([a-zA-Z0-9_-]+)/,
      ];
      for (const p of patterns) {
        const m = channelUrl.match(p);
        if (m) { channelId = m[1]; break; }
      }

      await supabase.from("profiles").update({
        my_channel_id: channelId,
      }).eq("id", user.id);
    }

    onNext();
  }

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome to Ideate</h1>
      <p className="text-lg mb-8" style={{ color: "var(--text-tertiary)" }}>
        Let&apos;s set up your account in a few quick steps.
      </p>

      <div className="space-y-5">
        <div>
          <label className="block text-base font-medium mb-1.5" style={{ color: "var(--text-tertiary)" }}>
            What&apos;s your YouTube channel name?
          </label>
          <input
            type="text"
            value={channelName}
            onChange={(e) => setChannelName(e.target.value)}
            placeholder="e.g., Peruvian Bull"
            className="w-full px-4 py-3 rounded-md text-base"
            style={inputStyle}
            autoFocus
          />
        </div>

        <div>
          <label className="block text-base font-medium mb-1.5" style={{ color: "var(--text-tertiary)" }}>
            Your YouTube channel URL
          </label>
          <input
            type="text"
            value={channelUrl}
            onChange={(e) => setChannelUrl(e.target.value)}
            placeholder="e.g., youtube.com/@PeruvianBull"
            className="w-full px-4 py-3 rounded-md text-base"
            style={inputStyle}
          />
          <p className="text-base mt-1" style={{ color: "var(--text-muted)" }}>
            We&apos;ll track your channel stats and show your recent videos on the dashboard.
          </p>
        </div>

        <div>
          <label className="block text-base font-medium mb-1.5" style={{ color: "var(--text-tertiary)" }}>
            What&apos;s your niche?
          </label>
          <input
            type="text"
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            placeholder="e.g., finance and economics, tech reviews, fitness"
            className="w-full px-4 py-3 rounded-md text-base"
            style={inputStyle}
          />
          <p className="text-base mt-1" style={{ color: "var(--text-muted)" }}>
            Helps us find trending videos and channels relevant to you.
          </p>
        </div>
      </div>

      <div className="flex gap-3 mt-8">
        <button
          onClick={onNext}
          className="px-6 py-3 rounded-md text-base font-medium"
          style={{ color: "var(--text-muted)", background: "var(--bg-elevated)" }}
        >
          Skip
        </button>
        <button
          onClick={handleNext}
          className="flex-1 py-3 rounded-md text-base font-semibold"
          style={{ background: "var(--gold)", color: "var(--bg-primary)" }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

// Step 2: Discovery Keywords
function StepKeywords({ onNext, onBack }: StepProps) {
  const [keywords, setKeywords] = useState("");
  const supabase = createClient();

  const keywordsArray = keywords.split(",").map((k) => k.trim()).filter((k) => k.length > 0);
  const count = keywordsArray.length;
  const hasEnough = count >= 5;

  async function handleNext() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("profiles").update({
      discovery_keywords: keywordsArray.length > 0 ? keywordsArray : null,
    }).eq("id", user.id);

    onNext();
  }

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight mb-2">Discovery Keywords</h1>
      <p className="text-lg mb-8" style={{ color: "var(--text-tertiary)" }}>
        What topics do you want to track? We&apos;ll use these to find trending videos and growing channels.
      </p>

      <div>
        <label className="block text-base font-medium mb-1.5" style={{ color: "var(--text-tertiary)" }}>
          Enter keywords separated by commas
        </label>
        <textarea
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          placeholder="bitcoin, federal reserve, inflation, market crash, gold, macro economics"
          rows={4}
          className="w-full px-4 py-3 rounded-md text-base resize-none"
          style={inputStyle}
          autoFocus
        />
        <div className="flex items-center justify-between mt-2">
          <p className="text-base" style={{ color: "var(--text-muted)" }}>
            The more specific, the better. You can always change these later in Settings.
          </p>
          <span
            className="text-base font-mono font-semibold shrink-0 ml-4"
            style={{ color: hasEnough ? "var(--green)" : count > 0 ? "var(--gold)" : "var(--text-muted)" }}
          >
            {count}/5{hasEnough ? " ✓" : ""}
          </span>
        </div>
        {count > 0 && count < 5 && (
          <p className="text-base mt-2" style={{ color: "var(--gold)" }}>
            We recommend at least 5 keywords for the best discovery results. Add {5 - count} more.
          </p>
        )}
      </div>

      <div className="flex gap-3 mt-8">
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-md text-base font-medium"
          style={{ color: "var(--text-muted)", background: "var(--bg-elevated)" }}
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="px-6 py-3 rounded-md text-base font-medium"
          style={{ color: "var(--text-muted)", background: "var(--bg-elevated)" }}
        >
          Skip
        </button>
        <button
          onClick={handleNext}
          className="flex-1 py-3 rounded-md text-base font-semibold"
          style={{ background: "var(--gold)", color: "var(--bg-primary)" }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

// Step 3: Add Channels
function StepChannels({ onNext, onBack }: StepProps) {
  const [channelUrl, setChannelUrl] = useState("");
  const [channels, setChannels] = useState<{ id: string; name: string }[]>([]);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  async function addChannel() {
    if (!channelUrl.trim()) return;
    setAdding(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setAdding(false); return; }

    let channelId = channelUrl;
    const patterns = [
      /youtube\.com\/channel\/([a-zA-Z0-9_-]+)/,
      /youtube\.com\/@([a-zA-Z0-9_-]+)/,
      /youtube\.com\/c\/([a-zA-Z0-9_-]+)/,
      /youtube\.com\/user\/([a-zA-Z0-9_-]+)/,
    ];
    for (const p of patterns) {
      const m = channelUrl.match(p);
      if (m) { channelId = m[1]; break; }
    }

    const { data: existing } = await supabase.from("user_channels").select("id").eq("user_id", user.id).eq("channel_id", channelId).single();
    if (existing) { setError("Already added"); setAdding(false); return; }

    const { error: insertError } = await supabase.from("user_channels").insert({
      user_id: user.id, channel_id: channelId, channel_name: channelId,
    });

    if (insertError) { setError("Failed to add"); }
    else {
      setChannels([...channels, { id: channelId, name: channelId }]);
      setChannelUrl("");
    }
    setAdding(false);
  }

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight mb-2">Track Channels</h1>
      <p className="text-lg mb-8" style={{ color: "var(--text-tertiary)" }}>
        Add YouTube channels you want to monitor for outlier videos. We recommend starting with 3–5 competitors or creators you follow.
      </p>

      <div className="flex gap-3 mb-4">
        <input
          type="text"
          value={channelUrl}
          onChange={(e) => setChannelUrl(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addChannel(); } }}
          placeholder="Paste YouTube channel URL"
          className="flex-1 px-4 py-3 rounded-md text-base"
          style={inputStyle}
          autoFocus
        />
        <button
          onClick={addChannel}
          disabled={adding}
          className="px-5 py-3 rounded-md text-base font-medium disabled:opacity-50"
          style={{ background: "var(--gold)", color: "var(--bg-primary)" }}
        >
          {adding ? "..." : "Add"}
        </button>
      </div>
      {error && <p className="text-base mb-3" style={{ color: "var(--red)" }}>{error}</p>}

      {channels.length > 0 && (
        <div className="space-y-2 mb-6">
          {channels.map((ch) => (
            <div
              key={ch.id}
              className="flex items-center gap-3 px-4 py-2.5 rounded-md"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--green)" }}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="text-base">{ch.name}</span>
            </div>
          ))}
        </div>
      )}

      <p className="text-base mb-6" style={{ color: "var(--text-muted)" }}>
        {channels.length === 0
          ? "Add at least one channel to get started, or skip for now."
          : `${channels.length} channel${channels.length !== 1 ? "s" : ""} added. Add more or continue.`
        }
      </p>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-md text-base font-medium"
          style={{ color: "var(--text-muted)", background: "var(--bg-elevated)" }}
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="px-6 py-3 rounded-md text-base font-medium"
          style={{ color: "var(--text-muted)", background: "var(--bg-elevated)" }}
        >
          Skip
        </button>
        <button
          onClick={onNext}
          className="flex-1 py-3 rounded-md text-base font-semibold"
          style={{ background: "var(--gold)", color: "var(--bg-primary)" }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

// Step 4: Done
function StepComplete() {
  const supabase = createClient();

  async function finish() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user.id);
    }
    window.location.href = "/dashboard";
  }

  return (
    <div className="text-center py-8">
      <div className="text-5xl mb-4">✨</div>
      <h1 className="text-3xl font-bold tracking-tight mb-3">You&apos;re All Set</h1>
      <p className="text-lg mb-8 max-w-md mx-auto" style={{ color: "var(--text-tertiary)" }}>
        Your first scan will run automatically. You&apos;ll start seeing outlier videos and trending content on your dashboard soon.
      </p>

      <div
        className="rounded-lg p-5 mb-8 text-left max-w-sm mx-auto"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
      >
        <h3 className="text-base font-semibold mb-3">What happens next:</h3>
        <div className="space-y-2">
          {[
            "Daily scans check your tracked channels for outlier videos",
            "Trending videos in your niche appear on your dashboard",
            "Email digests are sent based on your schedule",
            "Discovery finds new growing channels for you",
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <span style={{ color: "var(--gold)" }} className="mt-0.5">→</span>
              <span className="text-base" style={{ color: "var(--text-secondary)" }}>{item}</span>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={finish}
        className="px-8 py-3 rounded-md text-lg font-semibold"
        style={{ background: "var(--gold)", color: "var(--bg-primary)" }}
      >
        Go to Dashboard
      </button>
    </div>
  );
}

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [checking, setChecking] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }

      const { data: profile } = await supabase.from("profiles").select("onboarding_completed").eq("id", user.id).single();

      if (profile?.onboarding_completed) {
        window.location.href = "/dashboard";
        return;
      }

      setChecking(false);
    }
    check();
  }, []);

  if (checking) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }} className="flex items-center justify-center">
        <div className="text-base" style={{ color: "var(--text-muted)" }}>Loading...</div>
      </div>
    );
  }

  const steps = [
    <StepChannel key="channel" onNext={() => setStep(1)} />,
    <StepKeywords key="keywords" onNext={() => setStep(2)} onBack={() => setStep(0)} />,
    <StepChannels key="channels" onNext={() => setStep(3)} onBack={() => setStep(1)} />,
    <StepComplete key="complete" />,
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <div className="max-w-lg mx-auto px-6 py-12">
        <LogoHeader />
        {step < 3 && <ProgressBar step={step} total={3} />}
        {steps[step]}
      </div>
    </div>
  );
}
