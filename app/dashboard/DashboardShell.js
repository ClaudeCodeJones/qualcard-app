"use client"

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
          padding: "0.875rem 1rem calc(0.875rem + env(safe-area-inset-bottom))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem" }}>
            info@qualcard.co.nz <span style={{ margin: "0 0.5rem" }}>|</span> 027 QUALCARD
          </span>
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
