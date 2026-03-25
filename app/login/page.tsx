"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// ─── Google Icon ──────────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAuthErrorMessage(error: { message: string; code?: string }): string {
  const msg = error.message.toLowerCase();
  const code = (error.code ?? "").toLowerCase();

  if (code === "invalid_credentials" || msg.includes("invalid login credentials")) {
    return "Incorrect email or password.";
  }
  if (msg.includes("email not confirmed")) {
    return "Please confirm your email address before signing in.";
  }
  if (msg.includes("user not found") || msg.includes("no user found")) {
    return "No account found with that email address.";
  }
  if (msg.includes("rate limit") || msg.includes("too many")) {
    return "Too many attempts. Please try again later.";
  }
  return "Something went wrong. Please try again.";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  // Surface errors forwarded from the OAuth callback (e.g. inactive account)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "inactive") {
      setError("Your account is not active. Please contact support.");
    }
  }, []);

  async function handlePostLogin(userId: string) {
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role, account_status")
      .eq("id", userId)
      .single();

    if (userError || !userData) {
      // DEBUG: remove before go-live
      console.error("[handlePostLogin] users query failed:", {
        code: (userError as any)?.code,
        message: (userError as any)?.message,
        details: (userError as any)?.details,
        hint: (userError as any)?.hint,
        userId,
      });
      setError(
        `Unable to load your account. (${(userError as any)?.code ?? "no data"}) Please contact support.`
      );
      setLoading(false);
      return;
    }

    if (userData.account_status !== "active") {
      setError("Your account is not active. Please contact support.");
      setLoading(false);
      return;
    }

    const sessionKey = `last_login_updated_${userId}`;
    if (!sessionStorage.getItem(sessionKey)) {
      await supabase
        .from("users")
        .update({ last_login: new Date().toISOString() })
        .eq("id", userId);
      sessionStorage.setItem(sessionKey, "1");
    }

    router.push(userData.role === "qc_admin" ? "/superadmin" : "/dashboard");
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(getAuthErrorMessage(authError));
      setLoading(false);
      return;
    }

    await handlePostLogin(data.user.id);
  }

  async function handleGoogleLogin() {
    setError("");
    setGoogleLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    // Page will redirect away; no need to reset loading state
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#D9DEE5" }}>

      {/* ── Header ── */}
      <header
        className="px-6 py-4"
        style={{ background: "radial-gradient(circle, #34495E 0%, #2C3E50 100%)" }}
      >
        <img
          src="/images/qualcard_logo_white.png"
          alt="QualCard"
          className="h-10 w-auto"
        />
      </header>

      {/* ── Main ── */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div
          className="w-full max-w-md p-8 shadow-lg"
          style={{ backgroundColor: "#FFFFFF", borderRadius: "1rem" }}
        >
          <h1
            className="text-2xl font-bold mb-6 text-center"
            style={{ color: "#333333" }}
          >
            Sign in to QualCard
          </h1>

          {error && (
            <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleEmailLogin} className="flex flex-col gap-4">
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
              style={{ focusRingColor: "#34495E" } as React.CSSProperties}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-white font-semibold text-sm transition-opacity disabled:opacity-60"
              style={{
                background: "radial-gradient(circle, #34495E 0%, #2C3E50 100%)",
                borderRadius: "1rem",
              }}
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-gray-400 text-sm">or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="w-full py-3 border border-gray-300 rounded-lg bg-white flex items-center justify-center gap-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
          >
            <GoogleIcon />
            {googleLoading ? "Redirecting…" : "Continue with Google"}
          </button>

          <p className="mt-6 text-center text-sm text-gray-500">
            Need access?{" "}
            <Link
              href="/register"
              className="font-medium hover:underline"
              style={{ color: "#34495E" }}
            >
              Register your company
            </Link>
          </p>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="px-6 py-4 flex items-center justify-between flex-wrap gap-2 text-xs text-gray-500">
        <span>QualCard © 2026 All rights reserved</span>
        <div className="flex gap-4">
          <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
          <Link href="/terms" className="hover:underline">Terms &amp; Conditions</Link>
        </div>
      </footer>

    </div>
  );
}
