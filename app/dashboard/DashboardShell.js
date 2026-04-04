"use client"

import Link from "next/link"
import { Settings, CreditCard } from "lucide-react"
import { useIsMobile } from "@/lib/useIsMobile"
import DashboardSidebar from "./DashboardSidebar"

export default function DashboardShell({ initials, children }) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <main style={{ flex: 1, padding: "1rem" }}>
          {children}
        </main>
        <footer style={{
          background: "#344e4b",
          padding: "0.875rem 1rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <Link
            href="/dashboard/billing"
            title="Billing"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "rgba(255,255,255,0.5)",
              padding: "0.25rem",
            }}
          >
            <CreditCard size={16} />
          </Link>
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem" }}>
            info@qualcard.co.nz <span style={{ margin: "0 0.5rem" }}>|</span> 027 QUALCARD
          </span>
          <Link
            href="/dashboard/settings"
            title="Settings"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "rgba(255,255,255,0.5)",
              padding: "0.25rem",
            }}
          >
            <Settings size={16} />
          </Link>
        </footer>
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flex: 1 }}>
      <DashboardSidebar initials={initials} isMobile={false} />
      <main style={{ flex: 1, padding: "2rem" }}>
        {children}
      </main>
    </div>
  )
}
