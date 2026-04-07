"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase";

export default function Home() {
  const supabase = createClient();

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        window.location.href = "/dashboard";
      } else {
        window.location.href = "/login";
      }
    }

    checkAuth();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="text-gray-400">Loading...</div>
    </div>
  );
}
