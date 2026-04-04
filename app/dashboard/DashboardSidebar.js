"use client"

import { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { Home, Users, Settings, CreditCard, LogOut, Menu, X } from "lucide-react"
import { supabase } from "@/lib/supabase"

const NAV_ITEMS = [
  { href: "/dashboard", icon: Home, label: "Home" },
  { href: "/dashboard/cardholders", icon: Users, label: "Cardholders" },
  { href: "/dashboard/settings", icon: Settings, label: "Settings" },
  { href: "/dashboard/billing", icon: CreditCard, label: "Billing" },
]

export default function DashboardSidebar({ initials, isMobile }) {
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [hamburgerOpen, setHamburgerOpen] = useState(false)

  useEffect(() => {
    if (!menuOpen) return
    const close = () => setMenuOpen(false)
    document.addEventListener("mousedown", close)
    window.addEventListener("scroll", close, true)
    return () => {
      document.removeEventListener("mousedown", close)
      window.removeEventListener("scroll", close, true)
    }
  }, [menuOpen])

  useEffect(() => { setMenuOpen(false); setHamburgerOpen(false) }, [pathname])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  // ── Mobile: fixed bottom bar ──
  if (isMobile) {
    return (
      <>
        <nav style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: "60px",
          background: "#344e4b",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
          zIndex: 1000,
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}>
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                title={label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.125rem",
                  color: isActive ? "#fff" : "rgba(255,255,255,0.5)",
                  textDecoration: "none",
                  padding: "0.5rem",
                  borderBottom: isActive ? "3px solid #fff" : "3px solid transparent",
                  transition: "color 0.15s ease",
                }}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                <span style={{ fontSize: "0.625rem", fontWeight: isActive ? 600 : 400 }}>{label}</span>
              </Link>
            )
          })}

          {/* Hamburger menu button */}
          <button
            onClick={() => setHamburgerOpen(v => !v)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.125rem",
              color: hamburgerOpen ? "#fff" : "rgba(255,255,255,0.5)",
              background: "transparent",
              border: "none",
              padding: "0.5rem",
              cursor: "pointer",
              borderBottom: "3px solid transparent",
            }}
          >
            {hamburgerOpen ? <X size={20} strokeWidth={2} /> : <Menu size={20} strokeWidth={2} />}
            <span style={{ fontSize: "0.625rem", fontWeight: 400 }}>More</span>
          </button>
        </nav>

        {/* Hamburger dropdown - slides up from bottom nav */}
        {hamburgerOpen && (
          <>
            <div
              onClick={() => setHamburgerOpen(false)}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.3)",
                zIndex: 999,
              }}
            />
            <div style={{
              position: "fixed",
              bottom: "60px",
              left: 0,
              right: 0,
              background: "#1f3f3c",
              borderTop: "1px solid rgba(255,255,255,0.1)",
              padding: "0.75rem 1rem",
              zIndex: 1001,
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.5rem 0",
                marginBottom: "0.5rem",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
              }}>
                <div style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.1)",
                  border: "2px solid #16A34A",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: "0.65rem",
                  fontWeight: 600,
                }}>
                  {initials}
                </div>
                <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.8125rem" }}>
                  Signed in
                </span>
              </div>
              <button
                onClick={handleLogout}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.625rem",
                  padding: "0.75rem 0.5rem",
                  background: "transparent",
                  border: "none",
                  color: "#fff",
                  fontSize: "0.875rem",
                  cursor: "pointer",
                  borderRadius: "0.375rem",
                }}
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </>
        )}
      </>
    )
  }

  // ── Desktop: vertical sidebar ──
  return (
    <aside style={{
      width: "88px",
      flexShrink: 0,
      background: "#344e4b",
      borderRight: "1px solid rgba(255,255,255,0.05)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      paddingTop: "1.25rem",
      paddingBottom: "1.25rem",
      position: "sticky",
      top: "88px",
      height: "calc(100vh - 88px)",
    }}>

      {/* Nav items */}
      <nav style={{ display: "flex", flexDirection: "column", gap: "0.25rem", flex: 1, width: "100%", paddingLeft: "0.5rem", paddingRight: "0.5rem" }}>
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              title={label}
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                height: "44px",
                borderRadius: "10px",
                color: isActive ? "#fff" : "rgba(255,255,255,0.5)",
                textDecoration: "none",
                transition: "color 0.15s ease, background 0.15s ease",
                background: isActive ? "rgba(255,255,255,0.12)" : "transparent",
              }}
              onMouseEnter={e => {
                if (!isActive) e.currentTarget.style.color = "rgba(255,255,255,1)"
              }}
              onMouseLeave={e => {
                if (!isActive) e.currentTarget.style.color = "rgba(255,255,255,0.5)"
              }}
            >
              {isActive && (
                <span style={{
                  position: "absolute",
                  left: "-0.5rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: "3px",
                  height: "20px",
                  borderRadius: "0 2px 2px 0",
                  background: "#fff",
                }} />
              )}
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
            </Link>
          )
        })}
      </nav>

      {/* Divider + avatar */}
      <div style={{ width: "50%", height: "1px", background: "rgba(255,255,255,0.1)", margin: "0.75rem 0" }} />
      <div style={{ position: "relative", zIndex: 1001 }}>
        <button
          onClick={() => setMenuOpen(v => !v)}
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.1)",
            border: "2px solid #16A34A",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "#fff",
            fontSize: "0.7rem",
            fontWeight: 600,
            letterSpacing: "0.03em",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
        >
          {initials}
        </button>

        {menuOpen && (
          <div style={{
            position: "absolute",
            top: "50%",
            left: "calc(100% + 0.75rem)",
            transform: "translateY(-50%)",
            background: "#1f3f3c",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "0.5rem",
            padding: "0.5rem",
            zIndex: 1000,
            minWidth: "130px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
          }}>
            <button
              onClick={handleLogout}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "0.625rem",
                padding: "0.625rem 0.75rem",
                background: "transparent",
                border: "none",
                color: "#fff",
                fontSize: "0.875rem",
                cursor: "pointer",
                borderRadius: "0.375rem",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <LogOut size={15} />
              Logout
            </button>
          </div>
        )}
      </div>

    </aside>
  )
}
