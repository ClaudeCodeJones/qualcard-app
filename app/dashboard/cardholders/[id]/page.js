"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

function getStatusBadge(status, licence_end_date) {
  if (licence_end_date && new Date(licence_end_date) < new Date()) {
    return { label: "Expired", color: "#FCA5A5" }
  }
  if (status === "active" && licence_end_date) {
    const exp = new Date(licence_end_date)
    const in30 = new Date(); in30.setDate(in30.getDate() + 30)
    if (exp <= in30) return { label: "Expiring Soon", color: "#FCD34D" }
  }
  if (status === "active") return { label: "Active", color: "#6EE7B7" }
  if (status === "pending_activation") return { label: "Payment Pending", color: "#F97316" }
  return { label: status?.replace(/_/g, " ") ?? "", color: "rgba(255,255,255,0.45)" }
}

export default function CardholderDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [cardholder, setCardholder] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from("cardholders")
      .select("id, full_name, status, licence_start_date, licence_end_date, photo_url")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { router.push("/dashboard/cardholders"); return }
        setCardholder(data)
        setLoading(false)
      })
  }, [id])

  if (loading) return (
    <div style={{
      background: "linear-gradient(to bottom, #214f4b, #2a5f5b, #35736f)",
      borderRadius: "1rem",
      padding: "2rem",
      minHeight: "400px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.9375rem" }}>Loading...</p>
    </div>
  )

  const { full_name, status, licence_start_date, licence_end_date, photo_url } = cardholder
  const badge = getStatusBadge(status, licence_end_date)
  const initials = full_name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()

  return (
    <div style={{
      background: "linear-gradient(to bottom, #214f4b, #2a5f5b, #35736f)",
      borderRadius: "1rem",
      padding: "2rem",
      display: "flex",
      flexDirection: "column",
      gap: "1.5rem",
    }}>

      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <button
          onClick={() => router.push("/dashboard/cardholders")}
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "0.5rem",
            color: "rgba(255,255,255,0.6)",
            fontSize: "0.875rem",
            fontFamily: "inherit",
            padding: "0.375rem 0.875rem",
            cursor: "pointer",
            transition: "opacity 0.15s ease",
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = "0.7"}
          onMouseLeave={e => e.currentTarget.style.opacity = "1"}
        >
          Back
        </button>
        <h1 style={{ color: "#fff", fontSize: "1.5rem", fontWeight: 700, margin: 0, letterSpacing: "-0.03em" }}>
          Cardholder
        </h1>
      </div>

      <div style={{
        background: "#1f3f3c",
        borderRadius: "0.75rem",
        border: "1px solid rgba(255,255,255,0.05)",
        padding: "1.5rem",
        boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
        display: "flex",
        alignItems: "center",
        gap: "1.5rem",
      }}>
        {photo_url ? (
          <img
            src={photo_url}
            alt={full_name}
            style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
          />
        ) : (
          <div style={{
            width: 80, height: 80, borderRadius: "50%",
            background: "rgba(255,255,255,0.08)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "rgba(255,255,255,0.6)", fontSize: "1.5rem", fontWeight: 700,
            flexShrink: 0,
          }}>
            {initials}
          </div>
        )}
        <div>
          <h2 style={{ color: "#fff", fontSize: "1.25rem", fontWeight: 700, margin: "0 0 0.375rem", letterSpacing: "-0.02em" }}>
            {full_name}
          </h2>
          <span style={{ color: badge.color, fontSize: "0.875rem", fontWeight: 500 }}>
            {badge.label}
          </span>
        </div>
      </div>

      <div style={{
        background: "#1f3f3c",
        borderRadius: "0.75rem",
        border: "1px solid rgba(255,255,255,0.05)",
        padding: "1.5rem",
        boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
      }}>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 1rem" }}>
          Licence
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.875rem" }}>Start date</span>
            <span style={{ color: "#fff", fontSize: "0.875rem", fontWeight: 500 }}>
              {licence_start_date
                ? new Date(licence_start_date).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" })
                : "Not set"}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.875rem" }}>Expiry date</span>
            <span style={{ color: "#fff", fontSize: "0.875rem", fontWeight: 500 }}>
              {licence_end_date
                ? new Date(licence_end_date).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" })
                : "Not set"}
            </span>
          </div>
        </div>
      </div>

    </div>
  )
}
