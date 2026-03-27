"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

function getAuthErrorMessage(error) {
  const msg = error.message.toLowerCase()
  const code = (error.code ?? "").toLowerCase()

  if (code === "invalid_credentials" || msg.includes("invalid login credentials")) {
    return "Incorrect email or password."
  }
  if (msg.includes("email not confirmed")) {
    return "Please confirm your email address before signing in."
  }
  if (msg.includes("user not found") || msg.includes("no user found")) {
    return "No account found with that email address."
  }
  if (msg.includes("rate limit") || msg.includes("too many")) {
    return "Too many attempts. Please try again later."
  }
  return "Something went wrong. Please try again."
}

const inputStyle = {
  width: "100%",
  padding: "0.625rem 0.875rem",
  border: "1px solid #E5E7EB",
  borderRadius: "0.5rem",
  fontSize: "0.9375rem",
  color: "#333333",
  backgroundColor: "#FFFFFF",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.15s ease",
  fontFamily: "inherit",
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("error") === "inactive") {
      setError("Your account is not active. Please contact support.")
    }
  }, [])

  async function handlePostLogin(userId) {
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role, account_status")
      .eq("id", userId)
      .single()

    if (userError || !userData) {
      setError("Unable to load your account. Please contact support.")
      setLoading(false)
      return
    }

    if (userData.account_status !== "active") {
      setError("Your account is not active. Please contact support.")
      setLoading(false)
      return
    }

    const sessionKey = `last_login_updated_${userId}`
    if (!sessionStorage.getItem(sessionKey)) {
      await supabase
        .from("users")
        .update({ last_login: new Date().toISOString() })
        .eq("id", userId)
      sessionStorage.setItem(sessionKey, "1")
    }

    router.push(userData.role === "qc_admin" ? "/superadmin" : "/dashboard")
  }

  async function handleEmailLogin(e) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(getAuthErrorMessage(authError))
      setLoading(false)
      return
    }

    await handlePostLogin(data.user.id)
  }

  async function handleGoogleLogin() {
    setError("")
    setGoogleLoading(true)

    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    })

    if (authError) {
      setError(getAuthErrorMessage(authError))
      setGoogleLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      backgroundColor: "#D9DEE5",
    }}>

      {/* Header */}
      <header style={{
        background: "radial-gradient(circle, #34495E 0%, #2C3E50 100%)",
        padding: "1rem 1.5rem",
        display: "flex",
        alignItems: "center",
      }}>
        <Image
          src="/images/qualcard_logo_white.png"
          alt="QualCard"
          width={0}
          height={0}
          sizes="100vw"
          style={{ width: '140px', height: 'auto' }}
          priority
        />
      </header>

      {/* Main */}
      <main style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1rem",
        maxWidth: "1280px",
        margin: "0 auto",
        width: "100%",
      }}>
        <div style={{
          backgroundColor: "#FFFFFF",
          borderRadius: "1rem",
          padding: "2.5rem 2rem",
          width: "100%",
          maxWidth: "420px",
          boxShadow: "0 4px 24px rgba(44, 62, 80, 0.12), 0 1px 4px rgba(44, 62, 80, 0.06)",
        }}>

          <h1 style={{
            color: "#333333",
            fontSize: "1.375rem",
            fontWeight: 700,
            marginBottom: "1.75rem",
            textAlign: "center",
            letterSpacing: "-0.03em",
            lineHeight: 1.3,
          }}>
            Sign in to QualCard
          </h1>

          {error && (
            <div style={{
              backgroundColor: "#FEF2F2",
              border: "1px solid #FECACA",
              borderRadius: "0.5rem",
              padding: "0.75rem 1rem",
              marginBottom: "1.25rem",
              color: "#EF4444",
              fontSize: "0.875rem",
              lineHeight: 1.5,
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleEmailLogin} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "#333333",
                marginBottom: "0.375rem",
              }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "#34495E")}
                onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
              />
            </div>

            <div>
              <label style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "#333333",
                marginBottom: "0.375rem",
              }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "#34495E")}
                onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "0.75rem",
                background: loading
                  ? "#8FA3B1"
                  : "#2f6f6a",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "1rem",
                fontSize: "0.9375rem",
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                marginTop: "0.25rem",
                fontFamily: "inherit",
                transition: "opacity 0.15s ease",
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.opacity = "0.9" }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1" }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", margin: "1.5rem 0" }}>
            <div style={{ flex: 1, height: "1px", backgroundColor: "#E5E7EB" }} />
            <span style={{ fontSize: "0.8125rem", color: "#374151" }}>or</span>
            <div style={{ flex: 1, height: "1px", backgroundColor: "#E5E7EB" }} />
          </div>

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            style={{
              width: "100%",
              padding: "0.75rem",
              backgroundColor: "#FFFFFF",
              border: "1px solid #E5E7EB",
              borderRadius: "1rem",
              fontSize: "0.9375rem",
              fontWeight: 500,
              color: "#333333",
              cursor: googleLoading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.625rem",
              fontFamily: "inherit",
              transition: "background-color 0.15s ease, border-color 0.15s ease",
            }}
            onMouseEnter={(e) => {
              if (!googleLoading) {
                e.currentTarget.style.backgroundColor = "#F9FAFB"
                e.currentTarget.style.borderColor = "#34495E"
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#FFFFFF"
              e.currentTarget.style.borderColor = "#E5E7EB"
            }}
          >
            <GoogleIcon />
            {googleLoading ? "Redirecting..." : "Continue with Google"}
          </button>

          <p style={{
            textAlign: "center",
            fontSize: "0.8125rem",
            color: "#374151",
            marginTop: "1.75rem",
            lineHeight: 1.6,
          }}>
            Need access?{" "}
            <Link
              href="/register"
              style={{
                color: "#34495E",
                fontWeight: 500,
                textDecoration: "underline",
                textUnderlineOffset: "2px",
              }}
            >
              Register your company
            </Link>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        padding: "1rem 1.5rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "0.5rem",
      }}>
        <span style={{ fontSize: "0.8125rem", color: "#374151" }}>
          QualCard &copy; 2026 All rights reserved
        </span>
        <div style={{ display: "flex", gap: "1.25rem" }}>
          <Link href="/privacy" style={{ fontSize: "0.8125rem", color: "#374151", textDecoration: "none" }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
          >
            Privacy Policy
          </Link>
          <Link href="/terms" style={{ fontSize: "0.8125rem", color: "#374151", textDecoration: "none" }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
          >
            Terms &amp; Conditions
          </Link>
        </div>
      </footer>

    </div>
  )
}
