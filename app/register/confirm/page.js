"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import Header from "@/app/components/Header"

function CheckIcon() {
  return (
    <div style={{
      width: "64px",
      height: "64px",
      borderRadius: "50%",
      backgroundColor: "#2f6f6a",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      margin: "0 auto 1.5rem",
      boxShadow: "0 4px 12px rgba(47, 111, 106, 0.3)",
    }}>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M5 13l4 4L19 7"
          stroke="#FFFFFF"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

function ConfirmContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get("email") || ""

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "#D9DEE5" }}>

      <Header user={null} />

      {/* Main */}
      <main style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1rem 4rem",
        maxWidth: "1280px",
        margin: "0 auto",
        width: "100%",
      }}>
        <div style={{
          backgroundColor: "#FFFFFF",
          borderRadius: "1rem",
          padding: "2.75rem 2rem",
          width: "100%",
          maxWidth: "480px",
          boxShadow: "0 4px 24px rgba(44, 62, 80, 0.12), 0 1px 4px rgba(44, 62, 80, 0.06)",
          textAlign: "center",
        }}>

          <CheckIcon />

          <h1 style={{
            color: "#333333",
            fontSize: "1.375rem",
            fontWeight: 700,
            marginBottom: "0.875rem",
            letterSpacing: "-0.03em",
            lineHeight: 1.3,
          }}>
            Application Received
          </h1>

          <p style={{
            color: "#333333",
            fontSize: "0.9375rem",
            lineHeight: 1.7,
            marginBottom: "1rem",
          }}>
            Thanks for registering. We'll be in touch
            {email && (
              <> with <strong style={{ color: "#34495E" }}>{email}</strong></>
            )}{" "}
            within 24 hours.
          </p>

          <p style={{
            color: "#374151",
            fontSize: "0.9rem",
            lineHeight: 1.7,
            marginBottom: "1.75rem",
          }}>
            Our team will review your application and may contact you to verify your company details. You'll receive an email once your account is approved and ready to use.
          </p>

          <p style={{
            fontSize: "0.8125rem",
            color: "#8A8A8A",
            lineHeight: 1.6,
          }}>
            Need help? Contact us at{" "}
            <a
              href="mailto:info@qualcard.co.nz"
              style={{ color: "#34495E", textDecoration: "underline", textUnderlineOffset: "2px" }}
            >
              info@qualcard.co.nz
            </a>
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
          <Link
            href="/privacy"
            style={{ fontSize: "0.8125rem", color: "#374151", textDecoration: "none" }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms"
            style={{ fontSize: "0.8125rem", color: "#374151", textDecoration: "none" }}
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

export default function ConfirmPage() {
  return (
    <Suspense>
      <ConfirmContent />
    </Suspense>
  )
}
