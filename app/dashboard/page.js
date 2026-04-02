"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, AlertCircle, Plus, Users, ListChecks, GraduationCap, Award, ClipboardCheck, ShieldCheck, X, ChevronRight } from "lucide-react"
import Image from "next/image"
import { supabase } from "@/lib/supabase"
import { getLicenceStatus } from "@/lib/licenceStatus"

const CARD = {
  background: "#FFFFFF",
  borderRadius: "0.75rem",
  border: "1px solid #E5E7EB",
  padding: "1.5rem",
  boxShadow: "0 1px 3px rgba(44,62,80,0.06), 0 4px 12px rgba(44,62,80,0.08)",
}

const CREDENTIAL_ICONS = {
  qualification: GraduationCap,
  competency: Award,
  site_induction: ClipboardCheck,
  permit: ShieldCheck,
}

const CREDENTIAL_COLORS = {
  qualification: "#4A90D9",
  competency: "#F97316",
  site_induction: "#7C3AED",
  permit: "#16A34A",
}

const CREDENTIAL_LABELS = {
  qualification: "Qualifications",
  competency: "Competencies",
  site_induction: "Site Inductions",
  permit: "Permits & Certificates",
}

function getStatusBarColor(status) {
  switch (status) {
    case "Active":
      return "#10B981"
    case "Expiring Soon":
      return "#D97706"
    case "Expired":
      return "#B84B45"
    case "Payment Pending":
      return "#0A9FB5"
    default:
      return "#D1D5DB"
  }
}

function getStatusLabel(status) {
  switch (status) {
    case "active":
      return "Active"
    case "pending_activation":
      return "Payment Pending"
    case "deleted":
      return "Deleted"
    default:
      return status
  }
}

function getCardTint(status) {
  switch (status) {
    case "Active":
      return { bg: "#F0FDF4", border: "#D1E8D9", hover: "#E8FCF1", hoverBorder: "#B8E0C5" }
    case "Expiring Soon":
      return { bg: "#FFF3E6", border: "#EDD4B6", hover: "#FFECCA", hoverBorder: "#E5C299" }
    case "Payment Pending":
      return { bg: "#F0F7FB", border: "#D0E8F2", hover: "#E8F2F9", hoverBorder: "#B0D5E8" }
    case "Expired":
      return { bg: "#FEE2E2", border: "#FECACA", hover: "#FCBDBD", hoverBorder: "#F87171" }
    default:
      return { bg: "#F9FAFB", border: "#E5E7EB", hover: "#F3F4F6", hoverBorder: "#D1D5DB" }
  }
}

function getInitials(name) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
}

export default function DashboardPage() {
  const router = useRouter()
  const [company, setCompany] = useState(null)
  const [pendingCardholders, setPendingCardholders] = useState([])
  const [expiringCardholders, setExpiringCardholders] = useState([])
  const [recentCardholders, setRecentCardholders] = useState([])
  const [allCardholders, setAllCardholders] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const [totalCardholders, setTotalCardholders] = useState(0)
  const [activeCardholders, setActiveCardholders] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)
  const [expiringCount, setExpiringCount] = useState(0)
  const [expiredCount, setExpiredCount] = useState(0)
  const [credentialCounts, setCredentialCounts] = useState({ qualification: 0, competency: 0, site_induction: 0, permit: 0 })
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0]
    const storedDate = localStorage.getItem("expiringBannerDismissedDate")
    setDismissed(storedDate === today)
  }, [])

  const handleBannerDismiss = () => {
    const today = new Date().toISOString().split("T")[0]
    localStorage.setItem("expiringBannerDismissedDate", today)
    setDismissed(true)
  }

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userData } = await supabase
        .from("users")
        .select("company_id")
        .eq("id", user.id)
        .single()

      if (!userData?.company_id) return
      const companyId = userData.company_id

      // Company info
      supabase
        .from("companies")
        .select("id, company_name, status")
        .eq("id", companyId)
        .single()
        .then(({ data, error }) => {
          if (error) console.error("Company fetch error:", error)
          if (data) setCompany(data)
        })

      // Pending activations
      supabase
        .from("cardholders")
        .select("id, full_name, status, photo_url")
        .eq("status", "pending_activation")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(2)
        .then(({ data }) => {
          if (data) setPendingCardholders(data)
        })

      // Expiring soon - within 30 days but not yet expired
      const today = new Date().toISOString().split("T")[0]
      const thirtyDaysFromNow = new Date()
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

      supabase
        .from("cardholders")
        .select("id, full_name, licence_end_date, status, photo_url")
        .eq("company_id", companyId)
        .not("licence_end_date", "is", null)
        .gte("licence_end_date", today)
        .lte("licence_end_date", thirtyDaysFromNow.toISOString().split("T")[0])
        .order("licence_end_date", { ascending: true })
        .limit(2)
        .then(({ data }) => {
          if (data) setExpiringCardholders(data)
        })

      // Expired licenses
      supabase
        .from("cardholders")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .eq("company_id", companyId)
        .not("licence_end_date", "is", null)
        .lt("licence_end_date", today)
        .then(({ count }) => {
          if (count !== null) setExpiredCount(count)
        })

      // Total count
      supabase
        .from("cardholders")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .neq("status", "deleted")
        .then(({ count }) => {
          if (count !== null) setTotalCardholders(count)
        })

      // Active count
      supabase
        .from("cardholders")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .eq("company_id", companyId)
        .then(({ count }) => {
          if (count !== null) setActiveCardholders(count)
        })

      // Pending count
      supabase
        .from("cardholders")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending_activation")
        .eq("company_id", companyId)
        .then(({ count }) => {
          if (count !== null) setPendingCount(count)
        })

      // Expiring count
      supabase
        .from("cardholders")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .not("licence_end_date", "is", null)
        .gte("licence_end_date", today)
        .lte("licence_end_date", thirtyDaysFromNow.toISOString().split("T")[0])
        .then(({ count }) => {
          if (count !== null) setExpiringCount(count)
        })

      // Recent cardholders with photos (8)
      supabase
        .from("cardholders")
        .select("id, full_name, created_at, status, photo_url, licence_end_date")
        .eq("company_id", companyId)
        .neq("status", "deleted")
        .order("created_at", { ascending: false })
        .limit(8)
        .then(({ data }) => {
          if (data) setRecentCardholders(data)
        })

      // Credential counts by type
      supabase
        .from("cardholder_credentials")
        .select("qualifications_competencies(type), cardholders!inner(company_id)")
        .eq("cardholders.company_id", companyId)
        .then(({ data }) => {
          if (data) {
            const counts = { qualification: 0, competency: 0, site_induction: 0, permit: 0 }
            data.forEach(cred => {
              const type = cred.qualifications_competencies?.type || "qualification"
              if (counts[type] !== undefined) counts[type]++
            })
            setCredentialCounts(counts)
          }
        })

      // All cardholders for search dropdown
      supabase
        .from("cardholders")
        .select("id, full_name, photo_url")
        .eq("company_id", companyId)
        .neq("status", "deleted")
        .order("full_name")
        .then(({ data }) => {
          if (data) setAllCardholders(data)
        })
    }

    fetchData()
  }, [])


  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      gap: "2rem",
    }}>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ color: "#2C3E50", fontSize: "1.5rem", fontWeight: 700, margin: 0, letterSpacing: "-0.03em" }}>
          Dashboard
        </h1>
        <Image
          src="/images/qualcard_logo_colour.png?v=2"
          alt="QualCard"
          width={120}
          height={32}
          style={{ objectFit: "contain", opacity: 0.9 }}
        />
      </div>

      {/* 2-column grid: left 2fr, right 0.5fr */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 0.5fr", gap: "1.5rem", alignItems: "start" }}>

        {/* LEFT COLUMN */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

          {/* Search + Actions */}
          <div style={CARD}>
            <p style={{
              color: "#6B7280",
              fontSize: "0.75rem",
              fontWeight: 500,
              margin: "0 0 0.875rem",
              textTransform: "uppercase",
              letterSpacing: "0.07em",
            }}>
              Search Cardholders
            </p>
            <div style={{ position: "relative", marginBottom: "1rem" }}>
              <input
                type="text"
                placeholder="Search by name..."
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  background: "#F9FAFB",
                  border: "1px solid #E5E7EB",
                  borderRadius: "0.5rem",
                  color: "#1F2937",
                  fontSize: "0.9375rem",
                  outline: "none",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
                value={searchTerm}
                onChange={e => {
                  setSearchTerm(e.target.value)
                  setShowSearchDropdown(e.target.value.length > 0)
                }}
                onFocus={() => setShowSearchDropdown(searchTerm.length > 0)}
                onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
              />

              {/* Search Dropdown */}
              {showSearchDropdown && searchTerm.trim() && (
                <div style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  marginTop: "0.5rem",
                  background: "#FFFFFF",
                  border: "1px solid #E5E7EB",
                  borderRadius: "0.5rem",
                  boxShadow: "0 4px 16px rgba(44,62,80,0.12)",
                  maxHeight: "300px",
                  overflowY: "auto",
                  zIndex: 10,
                }}>
                  {(() => {
                    const filtered = allCardholders.filter(c =>
                      c.full_name.toLowerCase().includes(searchTerm.toLowerCase())
                    )

                    if (filtered.length === 0) {
                      return (
                        <div style={{ padding: "1rem", textAlign: "center" }}>
                          <p style={{ color: "#9CA3AF", fontSize: "0.875rem", margin: 0 }}>
                            No cardholders found
                          </p>
                        </div>
                      )
                    }

                    return filtered.slice(0, 8).map(({ id, full_name, photo_url }) => (
                      <div
                        key={id}
                        onClick={() => {
                          router.push(`/dashboard/cardholders/${id}`)
                          setSearchTerm("")
                          setShowSearchDropdown(false)
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                          padding: "0.75rem 1rem",
                          borderBottom: "1px solid #F3F4F6",
                          cursor: "pointer",
                          transition: "background 0.15s ease",
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = "#F9FAFB"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        {photo_url ? (
                          <img
                            src={photo_url}
                            alt={full_name}
                            style={{ width: 36, height: 36, borderRadius: "0.375rem", objectFit: "cover", flexShrink: 0 }}
                            onError={e => e.currentTarget.style.display = "none"}
                          />
                        ) : null}
                        {!photo_url && (
                          <div style={{
                            width: 36,
                            height: 36,
                            borderRadius: "0.375rem",
                            background: "#F3F4F6",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#6B7280",
                            fontSize: "0.7rem",
                            fontWeight: 600,
                            flexShrink: 0,
                          }}>
                            {getInitials(full_name)}
                          </div>
                        )}
                        <p style={{ color: "#1F2937", fontSize: "0.9375rem", fontWeight: 500, margin: 0, flex: 1 }}>
                          {full_name}
                        </p>
                      </div>
                    ))
                  })()}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
              <button
                onClick={() => router.push("/dashboard/cardholders")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  padding: "0.75rem 1rem",
                  background: "#FFFFFF",
                  border: "1px solid #2f6f6a",
                  borderRadius: "0.5rem",
                  color: "#2f6f6a",
                  fontSize: "0.9375rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "#F0F9F8"
                  e.currentTarget.style.borderColor = "#1F5A55"
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "#FFFFFF"
                  e.currentTarget.style.borderColor = "#2f6f6a"
                }}
              >
                <Plus size={18} strokeWidth={2.5} />
                Add
              </button>
              <button
                onClick={() => router.push("/dashboard/cardholders")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  padding: "0.75rem 1rem",
                  background: "#F3F4F6",
                  border: "1px solid #E5E7EB",
                  borderRadius: "0.5rem",
                  color: "#374151",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "#E9ECEF"
                  e.currentTarget.style.borderColor = "#D1D5DB"
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "#F3F4F6"
                  e.currentTarget.style.borderColor = "#E5E7EB"
                }}
              >
                <Users size={16} />
                All
              </button>
              <button
                onClick={() => router.push("/dashboard/cardholders?bulk=true")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  padding: "0.75rem 1rem",
                  background: "#F3F4F6",
                  border: "1px solid #E5E7EB",
                  borderRadius: "0.5rem",
                  color: "#374151",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "#E9ECEF"
                  e.currentTarget.style.borderColor = "#D1D5DB"
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "#F3F4F6"
                  e.currentTarget.style.borderColor = "#E5E7EB"
                }}
              >
                <ListChecks size={16} />
                Bulk
              </button>
            </div>
          </div>

          {/* Expiring Soon Warning Banner (dismissible) */}
          {expiringCount > 0 && !dismissed && (
            <div style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "1rem",
              padding: "1.25rem 1.5rem",
              background: "rgba(217, 119, 6, 0.1)",
              border: "1px solid rgba(217, 119, 6, 0.25)",
              borderRadius: "0.75rem",
            }}>
              <AlertCircle size={20} style={{ color: "#D97706", flexShrink: 0, marginTop: "0.125rem" }} />
              <div style={{ flex: 1 }}>
                <p style={{ color: "#92400E", fontSize: "0.9375rem", fontWeight: 600, margin: "0 0 0.25rem" }}>
                  {expiringCount} cardholder subscription{expiringCount === 1 ? "" : "s"} expiring soon
                </p>
                <p style={{ color: "#92400E", fontSize: "0.8125rem", margin: "0" }}>
                  Renewals needed within 30 days
                </p>
              </div>
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", flexShrink: 0 }}>
                <a href="/dashboard/cardholders?filter=expiring" onClick={e => { e.preventDefault(); router.push("/dashboard/cardholders?filter=expiring") }} style={{
                  color: "#92400E",
                  fontSize: "0.8125rem",
                  fontWeight: 500,
                  textDecoration: "none",
                  transition: "opacity 0.15s ease",
                  cursor: "pointer",
                }}
                  onMouseEnter={e => e.currentTarget.style.opacity = "0.7"}
                  onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                >
                  View All
                </a>
                <button
                  onClick={handleBannerDismiss}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#D97706",
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "color 0.15s ease",
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = "#92400E"}
                  onMouseLeave={e => e.currentTarget.style.color = "#D97706"}
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          )}

          {/* Payment Required + Expiring Soon (side by side) */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>

            {/* Payment Required */}
            <div style={{ ...CARD, borderTop: "3px solid #0EA5E9", background: "#F8FBFD" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                <p style={{
                  color: "#6B7280",
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  margin: 0,
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                }}>
                  Payment Required
                </p>
                {pendingCount > 0 && (
                  <div style={{
                    width: "7px", height: "7px", borderRadius: "50%",
                    backgroundColor: "#0EA5E9",
                    boxShadow: "0 0 0 2px rgba(14,165,233,0.3)",
                    animation: "pulse 2s infinite",
                  }} />
                )}
              </div>
              <p style={{ color: "#9CA3AF", fontSize: "0.8125rem", margin: "0 0 1.25rem" }}>
                Cardholders awaiting activation
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
                {pendingCardholders.length === 0 ? (
                  <>
                    {[0, 1].map(i => (
                      <div key={i} style={{
                        display: "flex",
                        flexDirection: "column",
                        background: "transparent",
                        border: "1px solid #E5E7EB",
                        borderRadius: "0.5rem",
                        overflow: "hidden",
                        height: "112px",
                      }} />
                    ))}
                  </>
                ) : (
                  <>
                    {pendingCardholders.map(({ id, full_name, photo_url }) => (
                    <div key={id} style={{
                      display: "flex",
                      flexDirection: "column",
                      background: "#F0F7FB",
                      border: "1px solid #D0E8F2",
                      borderRadius: "0.5rem",
                      overflow: "hidden",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                    }}
                      onClick={() => router.push(`/dashboard/cardholders/${id}`)}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = "translateY(-2px)"
                        e.currentTarget.style.background = "#E8F2F9"
                        e.currentTarget.style.borderColor = "#B0D5E8"
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = "translateY(0)"
                        e.currentTarget.style.background = "#F0F7FB"
                        e.currentTarget.style.borderColor = "#D0E8F2"
                      }}
                    >
                      <div style={{ padding: "0.875rem 1rem", display: "flex", alignItems: "center", gap: "0.75rem", flex: 1 }}>
                        {photo_url ? (
                          <img
                            src={photo_url}
                            alt={full_name}
                            style={{ width: 40, height: 40, borderRadius: "0.375rem", border: "1px solid #D0E8F2", objectFit: "cover", flexShrink: 0 }}
                            onError={e => e.currentTarget.style.display = "none"}
                          />
                        ) : null}
                        {!photo_url && (
                          <div style={{
                            width: 40,
                            height: 40,
                            borderRadius: "0.375rem",
                            border: "1px solid #D0E8F2",
                            background: "#E8F2F9",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#0B7EA0",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            flexShrink: 0,
                          }}>
                            {getInitials(full_name)}
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <p style={{ color: "#1F2937", fontSize: "0.9375rem", fontWeight: 600, margin: "0", lineHeight: 1.2 }}>
                            {full_name}
                          </p>
                          <ChevronRight size={16} style={{ color: "#9CA3AF", flexShrink: 0 }} />
                        </div>
                      </div>
                      <div style={{
                        background: "transparent",
                        border: "1px solid #0A9FB5",
                        borderRadius: "0.375rem",
                        margin: "0 0.75rem 0.75rem",
                        color: "#0A9FB5",
                        padding: "0.5rem 1rem",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        textAlign: "center",
                      }}>
                        Payment Pending
                      </div>
                    </div>
                    ))}
                    {pendingCardholders.length === 1 && (
                      <div style={{
                        display: "flex",
                        flexDirection: "column",
                        background: "transparent",
                        border: "1px solid #E5E7EB",
                        borderRadius: "0.5rem",
                        overflow: "hidden",
                        height: "112px",
                      }} />
                    )}
                  </>
                )}
              </div>

              {pendingCardholders.length > 0 && (
                <div style={{ textAlign: "right" }}>
                  <a href="/dashboard/cardholders?filter=payment" onClick={e => { e.preventDefault(); router.push("/dashboard/cardholders?filter=payment") }} style={{
                    color: "#6B7280",
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
                      e.currentTarget.style.color = "#6B7280"
                      e.currentTarget.style.textDecoration = "none"
                    }}
                  >
                    View all <ArrowRight size={13} />
                  </a>
                </div>
              )}
            </div>

            {/* Expiring Soon */}
            <div style={{ ...CARD, borderTop: "3px solid #F59E0B", background: "#FFF6EB" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                <p style={{
                  color: "#6B7280",
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  margin: 0,
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                }}>
                  Expiring Soon
                </p>
                {expiringCount > 0 && (
                  <div style={{
                    width: "7px", height: "7px", borderRadius: "50%",
                    backgroundColor: "#F59E0B",
                    boxShadow: "0 0 0 2px rgba(245,158,11,0.3)",
                    animation: "pulse 2s infinite",
                  }} />
                )}
              </div>
              <p style={{ color: "#9CA3AF", fontSize: "0.8125rem", margin: "0 0 1.25rem" }}>
                Subscriptions expiring within 30 days
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
                {expiringCardholders.length === 0 ? (
                  <>
                    {[0, 1].map(i => (
                      <div key={i} style={{
                        display: "flex",
                        flexDirection: "column",
                        background: "transparent",
                        border: "1px solid #E5E7EB",
                        borderRadius: "0.5rem",
                        overflow: "hidden",
                        height: "112px",
                      }} />
                    ))}
                  </>
                ) : (
                  <>
                    {expiringCardholders.map(({ id, full_name, licence_end_date, photo_url }) => (
                    <div key={id} style={{
                      display: "flex",
                      flexDirection: "column",
                      background: "#FFF3E6",
                      border: "1px solid #EDD4B6",
                      borderRadius: "0.5rem",
                      overflow: "hidden",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                    }}
                      onClick={() => router.push(`/dashboard/cardholders/${id}`)}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = "translateY(-2px)"
                        e.currentTarget.style.background = "#FFECCA"
                        e.currentTarget.style.borderColor = "#E5C299"
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = "translateY(0)"
                        e.currentTarget.style.background = "#FFF3E6"
                        e.currentTarget.style.borderColor = "#EDD4B6"
                      }}
                    >
                      <div style={{ padding: "0.875rem 1rem", display: "flex", alignItems: "center", gap: "0.75rem", flex: 1 }}>
                        {photo_url ? (
                          <img
                            src={photo_url}
                            alt={full_name}
                            style={{ width: 40, height: 40, borderRadius: "0.375rem", border: "1px solid #EDD4B6", objectFit: "cover", flexShrink: 0 }}
                            onError={e => e.currentTarget.style.display = "none"}
                          />
                        ) : null}
                        {!photo_url && (
                          <div style={{
                            width: 40,
                            height: 40,
                            borderRadius: "0.375rem",
                            border: "1px solid #EDD4B6",
                            background: "#FFECCA",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#92400E",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            flexShrink: 0,
                          }}>
                            {getInitials(full_name)}
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <p style={{ color: "#1F2937", fontSize: "0.9375rem", fontWeight: 600, margin: "0", lineHeight: 1.2 }}>
                            {full_name}
                          </p>
                          <ChevronRight size={16} style={{ color: "#9CA3AF", flexShrink: 0 }} />
                        </div>
                      </div>
                      <div style={{
                        background: "transparent",
                        border: "1px solid #D97706",
                        borderRadius: "0.375rem",
                        margin: "0 0.75rem 0.75rem",
                        color: "#D97706",
                        padding: "0.5rem 1rem",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        textAlign: "center",
                      }}>
                        Expires {new Date(licence_end_date).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" })}
                      </div>
                    </div>
                    ))}
                    {expiringCardholders.length === 1 && (
                      <div style={{
                        display: "flex",
                        flexDirection: "column",
                        background: "transparent",
                        border: "1px solid #E5E7EB",
                        borderRadius: "0.5rem",
                        overflow: "hidden",
                        height: "112px",
                      }} />
                    )}
                  </>
                )}
              </div>

              {expiringCardholders.length > 0 && (
                <div style={{ textAlign: "right" }}>
                  <a href="/dashboard/cardholders?filter=expiring" onClick={e => { e.preventDefault(); router.push("/dashboard/cardholders?filter=expiring") }} style={{
                    color: "#6B7280",
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
                      e.currentTarget.style.color = "#6B7280"
                      e.currentTarget.style.textDecoration = "none"
                    }}
                  >
                    View all <ArrowRight size={13} />
                  </a>
                </div>
              )}
            </div>

          </div>

          {/* Recently Added */}
          <div style={CARD}>
            <p style={{
              color: "#6B7280",
              fontSize: "0.75rem",
              fontWeight: 500,
              margin: "0 0 0.25rem",
              textTransform: "uppercase",
              letterSpacing: "0.07em",
            }}>
              Recently Added
            </p>
            <p style={{ color: "#9CA3AF", fontSize: "0.8125rem", margin: "0 0 1.25rem" }}>
              Most recently added cardholders
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0.75rem" }}>
              {recentCardholders.length === 0 ? (
                <>
                  {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
                    <div key={i} style={{
                      display: "flex",
                      flexDirection: "column",
                      background: "transparent",
                      border: "1px solid #E5E7EB",
                      borderRadius: "0.5rem",
                      overflow: "hidden",
                      minHeight: "100px",
                    }} />
                  ))}
                </>
              ) : (
                <>
                  {recentCardholders.map(({ id, full_name, created_at, status, photo_url, licence_end_date }) => {
                  const licenceStatus = getLicenceStatus(licence_end_date)
                  const tint = getCardTint(licenceStatus.status)
                  return (
                    <div key={id} style={{
                      display: "flex",
                      flexDirection: "column",
                      background: tint.bg,
                      border: `1px solid ${tint.border}`,
                      borderRadius: "0.5rem",
                      overflow: "hidden",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                    }}
                      onClick={() => router.push(`/dashboard/cardholders/${id}`)}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = "translateY(-2px)"
                        e.currentTarget.style.background = tint.hover
                        e.currentTarget.style.borderColor = tint.hoverBorder
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = "translateY(0)"
                        e.currentTarget.style.background = tint.bg
                        e.currentTarget.style.borderColor = tint.border
                      }}
                    >
                      <div style={{ padding: "0.875rem 1rem", display: "flex", alignItems: "center", gap: "0.75rem", flex: 1 }}>
                        {photo_url ? (
                          <img
                            src={photo_url}
                            alt={full_name}
                            style={{ width: 40, height: 40, borderRadius: "0.375rem", border: `1px solid rgba(0,0,0,0.1)`, objectFit: "cover", flexShrink: 0 }}
                            onError={e => e.currentTarget.style.display = "none"}
                          />
                        ) : null}
                        {!photo_url && (
                          <div style={{
                            width: 40,
                            height: 40,
                            borderRadius: "0.375rem",
                            border: `1px solid rgba(0,0,0,0.1)`,
                            background: "#F3F4F6",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#6B7280",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            flexShrink: 0,
                          }}>
                            {getInitials(full_name)}
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ color: "#1F2937", fontSize: "0.9375rem", fontWeight: 600, margin: "0", lineHeight: 1.2 }}>
                              {full_name}
                            </p>
                            <p style={{ color: "#9CA3AF", fontSize: "0.75rem", margin: "0.25rem 0 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              {new Date(created_at).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" })}
                              <span style={{ width: 6, height: 6, borderRadius: "50%", background: getStatusBarColor(licenceStatus.status), flexShrink: 0 }} />
                              <span style={{ color: getStatusBarColor(licenceStatus.status), fontSize: "0.7rem", fontWeight: 600 }}>{licenceStatus.status}</span>
                            </p>
                          </div>
                          <ChevronRight size={16} style={{ color: "#9CA3AF", flexShrink: 0 }} />
                        </div>
                      </div>
                    </div>
                  )
                  })}
                  {recentCardholders.length < 8 && (
                    <>
                      {[...Array(8 - recentCardholders.length)].map((_, i) => (
                        <div key={`placeholder-${i}`} style={{
                          display: "flex",
                          flexDirection: "column",
                          background: "transparent",
                          border: "1px solid #E5E7EB",
                          borderRadius: "0.5rem",
                          overflow: "hidden",
                          minHeight: "100px",
                        }} />
                      ))}
                    </>
                  )}
                </>
              )}
            </div>

            {recentCardholders.length > 0 && (
              <div style={{ textAlign: "right", marginTop: "1rem" }}>
                <a href="/dashboard/cardholders" onClick={e => { e.preventDefault(); router.push("/dashboard/cardholders") }} style={{
                  color: "#6B7280",
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
                    e.currentTarget.style.color = "#6B7280"
                    e.currentTarget.style.textDecoration = "none"
                  }}
                >
                  View all <ArrowRight size={13} />
                </a>
              </div>
            )}
          </div>

        </div>

        {/* RIGHT SIDEBAR */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

          {/* Company Info */}
          <div style={CARD}>
            <p style={{
              color: "#6B7280",
              fontSize: "0.75rem",
              fontWeight: 500,
              margin: "0 0 1rem",
              textTransform: "uppercase",
              letterSpacing: "0.07em",
            }}>
              Company Info
            </p>

            {company && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
                <p style={{ color: "#1F2937", fontSize: "0.9375rem", fontWeight: 600, margin: 0, lineHeight: 1.2 }}>
                  {company.company_name}
                </p>
                <p style={{
                  color: "#fff",
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  padding: "0.375rem 0.625rem",
                  background: company.status === "active" ? "#10B981" : "#4A5568",
                  borderRadius: "0.25rem",
                  width: "fit-content",
                  margin: 0,
                  flexShrink: 0,
                }}>
                  {company.status === "active" ? "Active" : "Inactive"}
                </p>
              </div>
            )}
          </div>

          {/* Cardholders Overview */}
          <div style={CARD}>
            <p style={{
              color: "#6B7280",
              fontSize: "0.75rem",
              fontWeight: 500,
              margin: "0 0 1rem",
              textTransform: "uppercase",
              letterSpacing: "0.07em",
            }}>
              Cardholders Overview
            </p>

            <div style={{ borderBottom: "1px solid #E5E7EB", paddingBottom: "1rem", marginBottom: "1rem" }}>
              <p style={{ color: "#6B7280", fontSize: "0.75rem", margin: "0 0 0.625rem", textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10B981" }} />
                Active
              </p>
              <p style={{ color: "#1F2937", fontSize: "2.25rem", fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>
                {activeCardholders}
              </p>
            </div>

            <p style={{ color: "#6B7280", fontSize: "0.75rem", margin: "0 0 0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Action Items
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {[
                { label: "Pending", value: pendingCount, color: "#0A9FB5" },
                { label: "Expiring Soon", value: expiringCount, color: "#F59E0B" },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{
                    color: "#374151",
                    fontSize: "0.875rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
                    {label}
                  </span>
                  <span style={{ color: "#1F2937", fontSize: "1rem", fontWeight: 600 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Credentials Overview */}
          <div style={CARD}>
            <p style={{
              color: "#6B7280",
              fontSize: "0.75rem",
              fontWeight: 500,
              margin: "0 0 1rem",
              textTransform: "uppercase",
              letterSpacing: "0.07em",
            }}>
              Credentials Overview
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
              {Object.entries(credentialCounts).map(([type, count]) => {
                const Icon = CREDENTIAL_ICONS[type]
                const color = CREDENTIAL_COLORS[type]
                const label = CREDENTIAL_LABELS[type]
                return (
                  <div key={type} style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.75rem",
                    background: "#F9FAFB",
                    borderLeft: `3px solid ${color}`,
                    borderRadius: "0.375rem",
                  }}>
                    <Icon size={18} style={{ color, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ color: "#374151", fontSize: "0.8125rem", margin: 0 }}>
                        {label}
                      </p>
                    </div>
                    <span style={{ color: "#1F2937", fontSize: "1rem", fontWeight: 700 }}>
                      {count}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

        </div>

      </div>

    </div>
  )
}
