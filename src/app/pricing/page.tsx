"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import Navbar from "@/components/Navbar";

export default function PricingPage() {
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<string>("free");
  const supabase = createClient();

  useEffect(() => {
    async function loadPlan() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("plan")
          .eq("id", user.id)
          .single();
        if (data?.plan) {
          setPlan(data.plan);
        }
      }
    }
    loadPlan();
  }, []);

  const handleUpgrade = async () => {
    setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { data, error } = await supabase.functions.invoke("create-checkout-session", {
      body: {
        userId: user.id,
        email: user.email,
      },
    });

    if (error) {
      console.error("Checkout error:", error);
      alert("Failed to start checkout. Please try again.");
      setLoading(false);
      return;
    }

    if (data?.url) {
      window.location.href = data.url;
    } else {
      alert("Failed to get checkout URL");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      
      <main className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Simple Pricing</h1>
          <p className="text-gray-400 text-lg">Start free, upgrade when you need more</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {/* Free Plan */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-2">Free</h2>
            <p className="text-gray-400 mb-6">For getting started</p>
            
            <div className="mb-6">
              <span className="text-4xl font-bold">$0</span>
              <span className="text-gray-400">/month</span>
            </div>

            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-2 text-gray-300">
                <span className="text-green-400">✓</span> Track up to 5 channels
              </li>
              <li className="flex items-center gap-2 text-gray-300">
                <span className="text-green-400">✓</span> Daily outlier scans
              </li>
              <li className="flex items-center gap-2 text-gray-300">
                <span className="text-green-400">✓</span> Email digests
              </li>
              <li className="flex items-center gap-2 text-gray-500">
                <span>✗</span> Trending video discovery
              </li>
              <li className="flex items-center gap-2 text-gray-500">
                <span>✗</span> Channel discovery
              </li>
            </ul>

            {plan === "free" ? (
              <div className="w-full py-3 bg-gray-800 text-gray-400 font-medium rounded-lg text-center">
                Current Plan
              </div>
            ) : (
              <div className="w-full py-3 bg-gray-800 text-gray-400 font-medium rounded-lg text-center">
                Free Tier
              </div>
            )}
          </div>

          {/* Pro Plan */}
          <div className="bg-gradient-to-b from-indigo-900/50 to-gray-900 border border-indigo-500 rounded-2xl p-8 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-sm font-medium px-3 py-1 rounded-full">
              Most Popular
            </div>
            
            <h2 className="text-2xl font-bold mb-2">Pro</h2>
            <p className="text-gray-400 mb-6">For serious creators</p>
            
            <div className="mb-6">
              <span className="text-4xl font-bold">$12</span>
              <span className="text-gray-400">/month</span>
            </div>

            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-2 text-gray-300">
                <span className="text-green-400">✓</span> Unlimited channels
              </li>
              <li className="flex items-center gap-2 text-gray-300">
                <span className="text-green-400">✓</span> Daily outlier scans
              </li>
              <li className="flex items-center gap-2 text-gray-300">
                <span className="text-green-400">✓</span> Email digests
              </li>
              <li className="flex items-center gap-2 text-gray-300">
                <span className="text-green-400">✓</span> Trending video discovery
              </li>
              <li className="flex items-center gap-2 text-gray-300">
                <span className="text-green-400">✓</span> Growing channel discovery
              </li>
              <li className="flex items-center gap-2 text-gray-300">
                <span className="text-green-400">✓</span> Priority support
              </li>
            </ul>

            {plan === "pro" ? (
              <div className="w-full py-3 bg-indigo-600/50 text-indigo-300 font-medium rounded-lg text-center">
                Current Plan
              </div>
            ) : (
              <button
                onClick={handleUpgrade}
                disabled={loading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? "Loading..." : "Upgrade to Pro"}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-gray-500 mt-8">
          Have a discount code? You can apply it at checkout.
        </p>
      </main>
    </div>
  );
}
