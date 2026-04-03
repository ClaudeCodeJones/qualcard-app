"use client"

import { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { Home, Users, Settings, CreditCard, LogOut } from "lucide-react"
import { supabase } from "@/lib/supabase"

const NAV_ITEMS = [
  { href: "/dashboard", icon: Home, label: "Home" },
  { href: "/dashboard/cardholders", icon: Users, label: "Cardholders" },
  { href: "/dashboard/settings", icon: Settings, label: "Settings" },
  { href: "/dashboard/billing", icon: CreditCard, label: "Billing" },
]

export default function DashboardSidebar({ initials }) {
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

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

  useEffect(() => { setMenuOpen(false) }, [pathname])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

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
