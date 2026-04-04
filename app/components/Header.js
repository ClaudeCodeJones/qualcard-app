"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { LogOut, Menu, X, Settings, CreditCard } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useIsMobile } from "@/lib/useIsMobile"

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
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const ref = useRef(null)
  const isQcAdmin = role === "qc_admin"

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    function handleScroll() {
      setOpen(false)
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
      window.addEventListener("scroll", handleScroll, true)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      window.removeEventListener("scroll", handleScroll, true)
    }
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
          width: isMobile ? "24px" : "32px",
          height: isMobile ? "24px" : "32px",
          borderRadius: "50%",
          background: isQcAdmin ? "rgba(47, 111, 106, 0.15)" : "#FFFFFF",
          border: isMobile ? "1.5px solid #16A34A" : "2px solid #16A34A",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: isMobile ? "0.5625rem" : "0.75rem",
          fontWeight: 700,
          color: isQcAdmin ? "#FFFFFF" : "#34495E",
          letterSpacing: "0.02em",
        }}>
          {initials}
        </div>
        {isQcAdmin && !isMobile && (
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
          top: "50%",
          right: "calc(100% + 0.75rem)",
          transform: "translateY(-50%)",
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

function MobileHamburger({ variant }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const isDashboard = variant === "dashboard"

  const menuItems = isDashboard
    ? [
        { label: "Billing", href: "/dashboard/billing", Icon: CreditCard },
        { label: "Settings", href: "/dashboard/settings", Icon: Settings },
      ]
    : []

  return (
    <>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 36,
          height: 36,
          borderRadius: "0.5rem",
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.15)",
          color: "#FFFFFF",
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              top: "56px",
              background: "rgba(0,0,0,0.3)",
              zIndex: 999,
            }}
          />
          <div style={{
            position: "fixed",
            top: "56px",
            left: 0,
            right: 0,
            background: "#1f3f3c",
            borderTop: "1px solid rgba(255,255,255,0.1)",
            padding: "0.5rem",
            zIndex: 1000,
            boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
          }}>
            {menuItems.map(({ label, href, Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.875rem 1rem",
                  color: "#FFFFFF",
                  textDecoration: "none",
                  borderRadius: "0.5rem",
                  fontSize: "0.9375rem",
                  fontWeight: 500,
                }}
              >
                <Icon size={18} />
                {label}
              </Link>
            ))}
            {isDashboard && (
              <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "0.25rem 0" }} />
            )}
            <button
              onClick={handleLogout}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                width: "100%",
                padding: "0.875rem 1rem",
                background: "transparent",
                border: "none",
                color: "#FCA5A5",
                textAlign: "left",
                fontSize: "0.9375rem",
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "inherit",
                borderRadius: "0.5rem",
              }}
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </>
      )}
    </>
  )
}

export default function Header({ user, variant = "default", logoHref = "/superadmin", hasSidebar = true }) {
  const isMobile = useIsMobile()
  const router = useRouter()
  const backgroundGradient = (variant === "superadmin" || variant === "dashboard")
    ? "#344e4b"
    : "radial-gradient(circle, #34495E 0%, #2C3E50 100%)"

  const showMobileMenu = isMobile && (variant === "dashboard" || variant === "superadmin")

  return (
    <header style={{
      background: backgroundGradient,
      position: "sticky",
      top: 0,
      zIndex: 10,
    }}>
      <div style={{
        height: isMobile ? "56px" : "88px",
        paddingLeft: isMobile ? "1rem" : (hasSidebar ? "88px" : "1.5rem"),
        paddingRight: isMobile ? "1rem" : (hasSidebar ? "2.25rem" : "1.5rem"),
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxSizing: "border-box",
        ...(hasSidebar && !isMobile ? {} : { maxWidth: "1280px", margin: "0 auto", width: "100%" }),
      }}>
        <Link href={logoHref} style={{ display: "flex", alignItems: "center" }}>
          <Image
            src="/images/qualcard_logo_wide_white.png"
            alt="QualCard"
            width={958}
            height={413}
            priority
            style={{ objectFit: "contain", width: "auto", height: isMobile ? "32px" : "48px", cursor: "pointer" }}
          />
        </Link>
        {showMobileMenu ? (
          <MobileHamburger variant={variant} />
        ) : user ? (
          <Avatar fullName={user.full_name} email={user.email} role={user.role} />
        ) : (
          !isMobile && (
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: "0.25rem",
            }}>
              <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.8125rem", fontWeight: 400 }}>info@qualcard.co.nz</span>
              <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.8125rem", fontWeight: 400 }}>027 QUALCARD</span>
            </div>
          )
        )}
      </div>
    </header>
  )
}
