"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import Header from "@/app/components/Header"
import { UserRoundPlus, KeyRound } from "lucide-react"

export default function GatewayPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        router.replace("/dashboard")
        return
      }
      setReady(true)
    }
    checkAuth()
  }, [router])

  if (!ready) return null

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      backgroundColor: "#D9DEE5",
    }}>
      <Header user={null} hasSidebar={false} variant="superadmin" logoHref="/" />

      <main style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "3rem 1rem 4rem",
        maxWidth: "1280px",
        margin: "0 auto",
        width: "100%",
      }}>
        <h1 style={{
          color: "#333333",
          fontSize: "2.25rem",
          fontWeight: 700,
          textAlign: "center",
          marginBottom: "0.5rem",
          letterSpacing: "-0.03em",
          lineHeight: 1.2,
        }}>
          Welcome to QualCard
        </h1>
        <p style={{
          color: "#6B7280",
          fontSize: "1.0625rem",
          textAlign: "center",
          marginBottom: "3rem",
          lineHeight: 1.5,
        }}>
          Manage your team's qualifications and competencies
        </p>

        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1.5rem",
          width: "100%",
          maxWidth: "760px",
        }}>
          {/* Register card */}
          <Link href="/register/company" style={{ textDecoration: "none", color: "inherit" }}>
            <div
              className="gateway-card"
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: "1rem",
                padding: "2rem 1.75rem",
                boxShadow: "0 4px 24px rgba(44, 62, 80, 0.10), 0 1px 4px rgba(44, 62, 80, 0.06)",
                border: "1px solid #E5E7EB",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                height: "100%",
                transition: "border-color 0.15s ease, box-shadow 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#2f6f6a"
                e.currentTarget.style.boxShadow = "0 8px 32px rgba(44, 62, 80, 0.14), 0 2px 8px rgba(44, 62, 80, 0.08)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#E5E7EB"
                e.currentTarget.style.boxShadow = "0 4px 24px rgba(44, 62, 80, 0.10), 0 1px 4px rgba(44, 62, 80, 0.06)"
              }}
            >
              <div style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                backgroundColor: "#2f6f6a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1.25rem",
              }}>
                <UserRoundPlus size={22} color="#FFFFFF" strokeWidth={2} />
              </div>

              <h2 style={{
                fontSize: "1.1875rem",
                fontWeight: 700,
                color: "#333333",
                marginBottom: "0.25rem",
                lineHeight: 1.3,
              }}>
                Create Your QualCard Account
              </h2>
              <p style={{
                fontSize: "0.875rem",
                color: "#6B7280",
                marginBottom: "1rem",
                lineHeight: 1.5,
              }}>
                Register your company
              </p>

              <p style={{
                fontSize: "0.875rem",
                color: "#6B7280",
                lineHeight: 1.6,
                flex: 1,
              }}>
                Start managing your team's qualifications and competencies with QualCard.
              </p>

              <div style={{
                marginTop: "1.5rem",
                backgroundColor: "#2f6f6a",
                color: "#FFFFFF",
                padding: "0.75rem 1.25rem",
                borderRadius: "1rem",
                fontSize: "0.9375rem",
                fontWeight: 500,
                textAlign: "center",
              }}>
                Register your company
              </div>

              <p style={{
                fontSize: "0.75rem",
                color: "#6B7280",
                textAlign: "center",
                marginTop: "0.75rem",
                lineHeight: 1.5,
              }}>
                All new company registrations are reviewed by QualCard before access is granted.
              </p>
            </div>
          </Link>

          {/* Sign in card */}
          <Link href="/login" style={{ textDecoration: "none", color: "inherit" }}>
            <div
              className="gateway-card"
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: "1rem",
                padding: "2rem 1.75rem",
                boxShadow: "0 4px 24px rgba(44, 62, 80, 0.10), 0 1px 4px rgba(44, 62, 80, 0.06)",
                border: "1px solid #E5E7EB",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                height: "100%",
                transition: "border-color 0.15s ease, box-shadow 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#2f6f6a"
                e.currentTarget.style.boxShadow = "0 8px 32px rgba(44, 62, 80, 0.14), 0 2px 8px rgba(44, 62, 80, 0.08)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#E5E7EB"
                e.currentTarget.style.boxShadow = "0 4px 24px rgba(44, 62, 80, 0.10), 0 1px 4px rgba(44, 62, 80, 0.06)"
              }}
            >
              <div style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                backgroundColor: "#2f6f6a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1.25rem",
              }}>
                <KeyRound size={22} color="#FFFFFF" strokeWidth={2} />
              </div>

              <h2 style={{
                fontSize: "1.1875rem",
                fontWeight: 700,
                color: "#333333",
                marginBottom: "0.25rem",
                lineHeight: 1.3,
              }}>
                Already have an account?
              </h2>
              <p style={{
                fontSize: "0.875rem",
                color: "#6B7280",
                marginBottom: "1rem",
                lineHeight: 1.5,
              }}>
                Sign in to your QualCard account
              </p>

              <p style={{
                fontSize: "0.875rem",
                color: "#6B7280",
                lineHeight: 1.6,
                flex: 1,
              }}>
                Access your dashboard to manage your team's credentials and qualifications.
              </p>

              <div style={{
                marginTop: "1.5rem",
                backgroundColor: "#2f6f6a",
                color: "#FFFFFF",
                padding: "0.75rem 1.25rem",
                borderRadius: "1rem",
                fontSize: "0.9375rem",
                fontWeight: 500,
                textAlign: "center",
              }}>
                Sign in
              </div>

              <p style={{
                fontSize: "0.75rem",
                color: "#6B7280",
                textAlign: "center",
                marginTop: "0.75rem",
                lineHeight: 1.5,
              }}>
                Sign in with your email and password or Google account
              </p>
            </div>
          </Link>
        </div>

        <p style={{
          textAlign: "center",
          fontSize: "0.875rem",
          color: "#6B7280",
          marginTop: "2.5rem",
        }}>
          Need help? Contact us at{" "}
          <a
            href="mailto:info@qualcard.co.nz"
            style={{ color: "#34495E", fontWeight: 500, textDecoration: "underline", textUnderlineOffset: "2px" }}
          >
            info@qualcard.co.nz
          </a>
        </p>
      </main>

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

      <style jsx>{`
        @media (max-width: 640px) {
          main div[style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
