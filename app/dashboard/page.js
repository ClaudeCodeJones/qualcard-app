"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight } from "lucide-react"
import Image from "next/image"
import { supabase } from "@/lib/supabase"

export default function DashboardPage() {
  const router = useRouter()
  const [pendingCardholders, setPendingCardholders] = useState([])
  const [expiringCardholders, setExpiringCardholders] = useState([])

  useEffect(() => {
    supabase
      .from("cardholders")
      .select("id, full_name, status")
      .eq("status", "pending_activation")
      .limit(2)
      .then(({ data }) => {
        if (data) setPendingCardholders(data)
      })

    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

    supabase
      .from("cardholders")
      .select("id, full_name, licence_end_date, status")
      .eq("status", "active")
      .not("licence_end_date", "is", null)
      .lte("licence_end_date", thirtyDaysFromNow.toISOString().split("T")[0])
      .limit(2)
      .then(({ data }) => {
        if (data) setExpiringCardholders(data)
      })
  }, [])

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ color: "#fff", fontSize: "1.5rem", fontWeight: 700, margin: 0, letterSpacing: "-0.03em" }}>
          Overview
        </h1>
        <Image
          src="/images/qualcard_logo_white.png"
          alt="QualCard"
          width={120}
          height={32}
          style={{ objectFit: "contain", opacity: 0.85 }}
        />
      </div>

      {/* 2-column body */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem", alignItems: "start" }}>

        {/* Left col — spans 2 */}
        <div style={{ gridColumn: "span 2", display: "flex", flexDirection: "column", gap: "1.5rem" }}>

          {/* Search Cardholders */}
          <div style={{
            background: "rgba(0, 0, 0, 0.25)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderRadius: "0.75rem",
            border: "1px solid rgba(255,255,255,0.08)",
            padding: "1.5rem",
            boxShadow: "0 8px 24px rgba(0,0,0,0.25), 0 2px 6px rgba(0,0,0,0.15)",
          }}>
            <p style={{
              color: "rgba(255,255,255,0.7)",
              fontSize: "0.75rem",
              fontWeight: 500,
              margin: "0 0 0.875rem",
              textTransform: "uppercase",
              letterSpacing: "0.07em",
            }}>
              Search Cardholders
            </p>
            <input
              type="text"
              placeholder="Search by name..."
              style={{
                width: "100%",
                padding: "0.75rem 1rem",
                background: "rgba(0,0,0,0.3)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "0.5rem",
                color: "#fff",
                fontSize: "0.9375rem",
                outline: "none",
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
              onFocus={e => (e.target.style.borderColor = "rgba(255,255,255,0.3)")}
              onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
            />
          </div>

          {/* Payment Required */}
          <div style={{
            background: "rgba(0, 0, 0, 0.25)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderRadius: "0.75rem",
            border: "1px solid rgba(255,255,255,0.08)",
            padding: "1.5rem",
            boxShadow: "0 8px 24px rgba(0,0,0,0.25), 0 2px 6px rgba(0,0,0,0.15)",
          }}>
            <p style={{
              color: "rgba(255,255,255,0.7)",
              fontSize: "0.75rem",
              fontWeight: 500,
              margin: "0 0 0.25rem",
              textTransform: "uppercase",
              letterSpacing: "0.07em",
            }}>
              Payment Required
            </p>
            <p style={{
              color: "rgba(255,255,255,0.45)",
              fontSize: "0.8125rem",
              margin: "0 0 1.25rem",
            }}>
              Cardholders awaiting activation
            </p>

            {pendingCardholders.length === 0 ? (
              <div style={{ padding: "2rem 1rem", textAlign: "center" }}>
                <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.9375rem", margin: 0 }}>
                  No pending activations
                </p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
                {pendingCardholders.map(({ id, full_name }) => (
                  <div key={id} style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "0.5rem",
                    padding: "0.875rem 1rem",
                    cursor: "pointer",
                    transition: "transform 0.15s ease, opacity 0.15s ease",
                  }}
                    onClick={() => router.push(`/dashboard/cardholders/${id}`)}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = "translateY(-2px)"
                      e.currentTarget.style.background = "rgba(255,255,255,0.09)"
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = "translateY(0)"
                      e.currentTarget.style.background = "rgba(255,255,255,0.05)"
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"
                    }}
                  >
                    <p style={{ color: "#fff", fontSize: "0.9375rem", fontWeight: 600, margin: "0 0 0.25rem", lineHeight: 1.3 }}>
                      {full_name}
                    </p>
                    <p style={{ color: "#F97316", fontSize: "0.8125rem", fontWeight: 500, margin: "0 0 0.25rem" }}>
                      Payment Pending
                    </p>
                    <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem", margin: 0 }}>
                      Awaiting activation
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div style={{ textAlign: "right" }}>
              <a href="/dashboard/cardholders" style={{
                color: "rgba(255,255,255,0.6)",
                fontSize: "0.8125rem",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem",
                transition: "color 0.15s ease",
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = "#2f6f6a"
                  e.currentTarget.style.textDecoration = "underline"
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = "rgba(255,255,255,0.6)"
                  e.currentTarget.style.textDecoration = "none"
                }}
              >
                View all <ArrowRight size={13} />
              </a>
            </div>
          </div>

          {/* Expiring Soon */}
          <div style={{
            background: "rgba(0, 0, 0, 0.25)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderRadius: "0.75rem",
            border: "1px solid rgba(255,255,255,0.08)",
            padding: "1.5rem",
            boxShadow: "0 8px 24px rgba(0,0,0,0.25), 0 2px 6px rgba(0,0,0,0.15)",
          }}>
            <p style={{
              color: "rgba(255,255,255,0.7)",
              fontSize: "0.75rem",
              fontWeight: 500,
              margin: "0 0 0.25rem",
              textTransform: "uppercase",
              letterSpacing: "0.07em",
            }}>
              Expiring Soon
            </p>
            <p style={{
              color: "rgba(255,255,255,0.45)",
              fontSize: "0.8125rem",
              margin: "0 0 1.25rem",
            }}>
              Credentials expiring within 30 days
            </p>
            {expiringCardholders.length === 0 ? (
              <div style={{ padding: "2rem 1rem", textAlign: "center" }}>
                <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.9375rem", margin: 0 }}>
                  No upcoming expiries
                </p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
                {expiringCardholders.map(({ id, full_name, licence_end_date }) => (
                  <div key={id} style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "0.5rem",
                    padding: "0.875rem 1rem",
                    cursor: "pointer",
                    transition: "transform 0.15s ease, opacity 0.15s ease",
                  }}
                    onClick={() => router.push(`/dashboard/cardholders/${id}`)}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = "translateY(-2px)"
                      e.currentTarget.style.background = "rgba(255,255,255,0.09)"
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = "translateY(0)"
                      e.currentTarget.style.background = "rgba(255,255,255,0.05)"
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"
                    }}
                  >
                    <p style={{ color: "#fff", fontSize: "0.9375rem", fontWeight: 600, margin: "0 0 0.25rem", lineHeight: 1.3 }}>
                      {full_name}
                    </p>
                    <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8125rem", margin: "0 0 0.5rem" }}>
                      Licence
                    </p>
                    <p style={{ color: "#F59E0B", fontSize: "0.75rem", fontWeight: 500, margin: 0 }}>
                      Expires {new Date(licence_end_date).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <div style={{ textAlign: "right" }}>
              <a href="/dashboard/cardholders" style={{
                color: "rgba(255,255,255,0.6)",
                fontSize: "0.8125rem",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem",
                transition: "color 0.15s ease",
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = "#2f6f6a"
                  e.currentTarget.style.textDecoration = "underline"
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = "rgba(255,255,255,0.6)"
                  e.currentTarget.style.textDecoration = "none"
                }}
              >
                View all <ArrowRight size={13} />
              </a>
            </div>
          </div>

        </div>

        {/* Right col — spans 1 */}
        <div style={{ gridColumn: "span 1" }}>
          <div style={{
            background: "rgba(0, 0, 0, 0.25)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderRadius: "0.75rem",
            border: "1px solid rgba(255,255,255,0.08)",
            padding: "1.5rem",
            boxShadow: "0 8px 24px rgba(0,0,0,0.25), 0 2px 6px rgba(0,0,0,0.15)",
          }}>
            <p style={{
              color: "rgba(255,255,255,0.7)",
              fontSize: "0.75rem",
              fontWeight: 500,
              margin: "0 0 1rem",
              textTransform: "uppercase",
              letterSpacing: "0.07em",
            }}>
              Company Overview
            </p>

            <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: "1rem", marginBottom: "1.25rem" }}>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem", margin: "0 0 0.375rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Cardholders
              </p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.875rem" }}>Total</span>
                <span style={{ color: "#fff", fontSize: "1.25rem", fontWeight: 700, letterSpacing: "-0.02em" }}>—</span>
              </div>
            </div>

            <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: "1rem" }}>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem", margin: "0 0 0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Status Breakdown
              </p>
              {[
                { label: "Active", value: "—" },
                { label: "Pending", value: "—" },
                { label: "Archived", value: "—" },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.625rem" }}>
                  <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.875rem" }}>{label}</span>
                  <span style={{ color: "#fff", fontSize: "1rem", fontWeight: 600 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

    </div>
  )
}
