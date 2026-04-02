"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { supabase } from "@/lib/supabase"

function getInitials(fullName, email) {
  if (fullName) {
    const parts = fullName.trim().split(/\s+/)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return parts[0][0].toUpperCase()
  }
  return email ? email[0].toUpperCase() : "A"
}

function Avatar({ fullName, email, role }) {
  const initials = getInitials(fullName, email)
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const ref = useRef(null)
  const isQcAdmin = role === "qc_admin"

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    if (open) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace("/login")
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0.25rem",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
        }}
      >
        <div style={{
          width: "38px",
          height: "38px",
          borderRadius: "50%",
          background: isQcAdmin ? "rgba(47, 111, 106, 0.15)" : "#FFFFFF",
          border: isQcAdmin ? "2px solid #16A34A" : "2px solid rgba(255,255,255,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.875rem",
          fontWeight: 700,
          color: isQcAdmin ? "#FFFFFF" : "#34495E",
          letterSpacing: "0.02em",
        }}>
          {initials}
        </div>
        {isQcAdmin && (
          <span style={{
            fontSize: "0.625rem",
            fontWeight: 700,
            color: "#16A34A",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}>
            ADMIN
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 0.75rem)",
          right: 0,
          backgroundColor: "#FFFFFF",
          borderRadius: "1rem",
          boxShadow: "0 8px 24px rgba(44, 62, 80, 0.12), 0 2px 8px rgba(44, 62, 80, 0.08)",
          minWidth: "210px",
          zIndex: 50,
        }}>
          <div style={{ padding: "1rem 1.25rem" }}>
            <p style={{ margin: 0, fontWeight: 700, color: "#34495E", fontSize: "0.9375rem" }}>
              {fullName || email}
            </p>
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.8125rem", color: "#6B7280" }}>
              {isQcAdmin ? "QualCard Admin" : "Company Admin"}
            </p>
          </div>
          <div style={{ height: "1px", backgroundColor: "#E5E7EB" }} />
          <div style={{ padding: "0.5rem" }}>
            <button
              onClick={handleLogout}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#FEF2F2"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "0.625rem",
                padding: "0.625rem 0.75rem",
                borderRadius: "0.625rem",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "#EF4444",
                fontFamily: "inherit",
                textAlign: "left",
              }}
            >
              <LogOut size={15} strokeWidth={2} />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Header({ user, variant = "default" }) {
  const backgroundGradient = variant === "superadmin"
    ? "linear-gradient(to bottom, #214f4b, #2a5f5b, #35736f)"
    : "radial-gradient(circle, #34495E 0%, #2C3E50 100%)"

  return (
    <header style={{
      background: backgroundGradient,
      position: "sticky",
      top: 0,
      zIndex: 10,
    }}>
      <div style={{
        maxWidth: "1280px",
        margin: "0 auto",
        padding: "0.875rem 1.5rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <Link href="/superadmin" style={{ display: "flex", alignItems: "center" }}>
          <Image
            src="/images/qualcard_logo_white.png?v=2"
            alt="QualCard"
            width={240}
            height={64}
            priority
            style={{ objectFit: "contain", width: "auto", height: "auto", cursor: "pointer" }}
          />
        </Link>
        <Avatar fullName={user?.full_name} email={user?.email} role={user?.role} />
      </div>
    </header>
  )
}
