"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";

const icons = {
  dashboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  channels: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8Z" />
      <path d="m10 9 5 3-5 3V9Z" />
    </svg>
  ),
  discover: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="m14.5 9.5-5 2 2 5 5-2-2-5Z" />
    </svg>
  ),
  history: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  ),
  settings: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  saved: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
    </svg>
  ),
};

export default function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [newCount, setNewCount] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (!user) return;

      // Get last_seen_at
      const { data: profile } = await supabase
        .from("profiles")
        .select("last_seen_at")
        .eq("id", user.id)
        .single();

      const lastSeen = profile?.last_seen_at || new Date(0).toISOString();

      // Count new outliers + trending since last visit
      const [outliersRes, trendingRes] = await Promise.all([
        supabase.from("results").select("*", { count: "exact", head: true }).eq("user_id", user.id).gt("created_at", lastSeen),
        supabase.from("discovery_trending_videos").select("*", { count: "exact", head: true }).eq("user_id", user.id).gt("discovered_at", lastSeen),
      ]);

      const total = (outliersRes.count || 0) + (trendingRes.count || 0);
      setNewCount(total);

      // Update last_seen_at if on dashboard
      if (window.location.pathname === "/dashboard") {
        await supabase.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", user.id);
        setNewCount(0);
      }
    }
    init();
  }, []);

  // Update last_seen_at when navigating to dashboard
  useEffect(() => {
    if (pathname === "/dashboard" && user) {
      supabase.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", user.id);
      setNewCount(0);
    }
  }, [pathname]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const links = [
    { href: "/dashboard", label: "Dashboard", icon: icons.dashboard, badge: newCount },
    { href: "/channels", label: "Channels", icon: icons.channels, badge: 0 },
    { href: "/discover", label: "Discover", icon: icons.discover, badge: 0 },
    { href: "/saved", label: "Saved", icon: icons.saved, badge: 0 },
    { href: "/history", label: "History", icon: icons.history, badge: 0 },
    { href: "/settings", label: "Settings", icon: icons.settings, badge: 0 },
  ];

  return (
    <nav
      style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-subtle)" }}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-8">
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5"
              style={{ color: "var(--gold)" }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
              </svg>
              <span className="text-[15px] font-semibold tracking-tight">Ideate</span>
            </Link>

            <div className="flex items-center gap-0.5">
              {links.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="relative flex items-center gap-2 px-3.5 py-1.5 rounded-md text-[13px] font-medium"
                    style={{
                      color: isActive ? "var(--gold)" : "var(--text-tertiary)",
                      background: isActive ? "var(--gold-bg)" : "transparent",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.color = "var(--text-primary)";
                        e.currentTarget.style.background = "var(--bg-hover)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.color = "var(--text-tertiary)";
                        e.currentTarget.style.background = "transparent";
                      }
                    }}
                  >
                    {link.icon}
                    {link.label}
                    {link.badge > 0 && (
                      <span
                        className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold px-1"
                        style={{ background: "var(--gold)", color: "var(--bg-primary)" }}
                      >
                        {link.badge > 99 ? "99+" : link.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <>
                <span
                  className="text-[13px]"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {user.email}
                </span>
                <button
                  onClick={handleSignOut}
                  className="text-[13px] px-3 py-1 rounded-md"
                  style={{
                    color: "var(--text-secondary)",
                    border: "1px solid var(--border-subtle)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-hover)";
                    e.currentTarget.style.color = "var(--text-primary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-subtle)";
                    e.currentTarget.style.color = "var(--text-secondary)";
                  }}
                >
                  Sign Out
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
