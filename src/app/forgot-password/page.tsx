"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSent(true);
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
          <h2 className="text-lg font-semibold mb-2">Reset Password</h2>
          <p className="text-base mb-5" style={{ color: "var(--text-muted)" }}>
            Enter your email and we&apos;ll send you a reset link.
          </p>

          {sent ? (
            <div>
              <div className="text-base px-4 py-3 rounded-md mb-4" style={{ color: "var(--green)", background: "var(--green-bg)" }}>
                Check your email for a password reset link.
              </div>
              <Link href="/login" className="block text-center text-base hover:underline" style={{ color: "var(--gold)" }}>
                Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="text-xs px-3 py-2.5 rounded-md mb-4" style={{ color: "var(--red)", background: "var(--red-bg)", border: "1px solid rgba(248,113,113,0.2)" }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-tertiary)" }}>Email</label>
                  <input
                    type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-md text-sm" style={inputStyle}
                    placeholder="you@example.com" required autoFocus
                  />
                </div>
                <button
                  type="submit" disabled={loading}
                  className="w-full py-2.5 rounded-md text-sm font-medium disabled:opacity-50"
                  style={{ background: "var(--gold)", color: "var(--bg-primary)" }}
                >
                  {loading ? "Sending..." : "Send Reset Link"}
                </button>
              </form>

              <p className="mt-5 text-center text-xs" style={{ color: "var(--text-muted)" }}>
                <Link href="/login" style={{ color: "var(--gold)" }} className="hover:underline">Back to Sign In</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
