"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import Link from "next/link";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    // Supabase handles the token exchange automatically via the URL hash
    // We just need to wait for the session to be established
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    // Also check if we already have a session (user clicked link and got redirected)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  const inputStyle = {
    background: "var(--bg-elevated)",
    border: "1px solid var(--border-default)",
    color: "var(--text-primary)",
    outline: "none",
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
      <div className="w-full max-w-sm px-6">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2.5 mb-3">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--gold)" }}>
              <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
            </svg>
            <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--gold)" }}>Ideate</h1>
          </div>
        </div>

        <div className="rounded-lg p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
          {success ? (
            <div className="text-center py-4">
              <div className="text-base px-4 py-3 rounded-md mb-4" style={{ color: "var(--green)", background: "var(--green-bg)" }}>
                Password updated successfully.
              </div>
              <Link href="/dashboard" className="text-base font-semibold hover:underline" style={{ color: "var(--gold)" }}>
                Go to Dashboard
              </Link>
            </div>
          ) : !ready ? (
            <div className="text-center py-4">
              <p className="text-base" style={{ color: "var(--text-muted)" }}>
                Verifying reset link...
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold mb-2">Set New Password</h2>
              <p className="text-base mb-5" style={{ color: "var(--text-muted)" }}>
                Enter your new password below.
              </p>

              {error && (
                <div className="text-xs px-3 py-2.5 rounded-md mb-4" style={{ color: "var(--red)", background: "var(--red-bg)", border: "1px solid rgba(248,113,113,0.2)" }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-tertiary)" }}>New Password</label>
                  <input
                    type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-md text-sm" style={inputStyle}
                    placeholder="••••••••" required minLength={6} autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-tertiary)" }}>Confirm Password</label>
                  <input
                    type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-md text-sm" style={inputStyle}
                    placeholder="••••••••" required minLength={6}
                  />
                </div>
                <button
                  type="submit" disabled={loading}
                  className="w-full py-2.5 rounded-md text-sm font-medium disabled:opacity-50"
                  style={{ background: "var(--gold)", color: "var(--bg-primary)" }}
                >
                  {loading ? "Updating..." : "Update Password"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
