"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Home, Users, Settings, CreditCard } from "lucide-react"

const NAV_ITEMS = [
  { href: "/dashboard", icon: Home, label: "Home" },
  { href: "/dashboard/cardholders", icon: Users, label: "Cardholders" },
  { href: "/dashboard/settings", icon: Settings, label: "Settings" },
  { href: "/dashboard/billing", icon: CreditCard, label: "Billing" },
]

export default function DashboardSidebar({ initials }) {
  const pathname = usePathname()

  return (
    <aside style={{
      width: "64px",
      flexShrink: 0,
      background: "rgba(0,0,0,0.15)",
      borderRight: "1px solid rgba(255,255,255,0.1)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      paddingTop: "1.25rem",
      paddingBottom: "1.25rem",
      position: "sticky",
      top: 0,
      height: "100vh",
    }}>
      {/* Logo mark */}
      <div style={{
        width: "36px",
        height: "36px",
        borderRadius: "10px",
        background: "rgba(255,255,255,0.15)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: "2rem",
        flexShrink: 0,
      }}>
        <span style={{
          color: "#fff",
          fontSize: "0.7rem",
          fontWeight: 700,
          letterSpacing: "0.05em",
          lineHeight: 1,
        }}>QC</span>
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

      {/* User avatar */}
      <div style={{
        width: "36px",
        height: "36px",
        borderRadius: "50%",
        background: "rgba(255,255,255,0.2)",
        border: "1.5px solid rgba(255,255,255,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        cursor: "default",
      }}>
        <span style={{ color: "#fff", fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.03em" }}>
          {initials}
        </span>
      </div>
    </aside>
  )
}
