"use client"

import { useState } from "react"
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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <aside style={{
      width: "88px",
      flexShrink: 0,
      background: "#183532",
      borderRight: "1px solid rgba(255,255,255,0.05)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      paddingTop: "1.25rem",
      paddingBottom: "1.25rem",
      position: "sticky",
      top: 0,
      height: "100vh",
    }}>
      {/* User avatar */}
      <div style={{ position: "relative", marginBottom: "2rem" }}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.2)",
            border: "1.5px solid rgba(255,255,255,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            cursor: "pointer",
            color: "#fff",
            fontSize: "0.7rem",
            fontWeight: 600,
            letterSpacing: "0.03em",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "rgba(255,255,255,0.3)"
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.5)"
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "rgba(255,255,255,0.2)"
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.35)"
          }}
        >
          {initials}
        </button>

        {/* Logout menu */}
        {menuOpen && (
          <div style={{
            position: "absolute",
            top: "100%",
            right: "-150px",
            marginTop: "0.5rem",
            background: "#1f4f4b",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "0.5rem",
            padding: "0.5rem",
            zIndex: 1000,
            minWidth: "140px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
          }}>
            <button
              onClick={handleLogout}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.625rem 0.75rem",
                background: "transparent",
                border: "none",
                color: "#fff",
                fontSize: "0.875rem",
                cursor: "pointer",
                borderRadius: "0.375rem",
                transition: "background 0.15s ease",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        )}
      </div>

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

    </aside>
  )
}
