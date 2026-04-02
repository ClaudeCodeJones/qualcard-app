"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { getLicenceStatus } from "@/lib/licenceStatus"
import { GraduationCap, Award, ClipboardCheck, ChevronRight, ArrowRight } from "lucide-react"

const CARD = {
  background: "#FFFFFF",
  borderRadius: "0.75rem",
  border: "1px solid #E5E7EB",
  padding: "1.5rem",
  boxShadow: "0 1px 3px rgba(44,62,80,0.06), 0 4px 12px rgba(44,62,80,0.08)",
}

function getStatusColour(status) {
  switch (status) {
    case "Active": return "#16A34A"
    case "Expiring Soon": return "#F59E0B"
    case "Expired": return "#EF4444"
    case "Payment Pending": return "#0EA5E9"
    default: return "#4A5568"
  }
}

function getCardTint(status) {
  switch (status) {
    case "Active": return { bg: "#F0FDF4", border: "#D1E8D9", hover: "#E8FCF1", hoverBorder: "#B8E0C5" }
    case "Expiring Soon": return { bg: "#FFF3E6", border: "#EDD4B6", hover: "#FFECCA", hoverBorder: "#E5C299" }
    case "Payment Pending": return { bg: "#F0F7FB", border: "#D0E8F2", hover: "#E8F2F9", hoverBorder: "#B0D5E8" }
    case "Expired": return { bg: "#FEE2E2", border: "#FECACA", hover: "#FCBDBD", hoverBorder: "#F87171" }
    default: return { bg: "#F9FAFB", border: "#E5E7EB", hover: "#F3F4F6", hoverBorder: "#D1D5DB" }
  }
}


function getStatusSortOrder(licenceStatus) {
  switch (licenceStatus?.status) {
    case "Expiring Soon": return 0
    case "Payment Pending": return 1
    case "Active": return 2
    case "Expired": return 3
    default: return 4
  }
}

export default function CardholdersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [cardholders, setCardholders] = useState([])
  const [credentials, setCredentials] = useState({})
  const [filter, setFilter] = useState(searchParams.get("filter") || "all")
  const [isModalOpen, setIsModalOpen] = useState(searchParams.get("add") === "true")
  const [newName, setNewName] = useState("")
  const [newPhoto, setNewPhoto] = useState(null)
  const [newPhotoPreview, setNewPhotoPreview] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [companyName, setCompanyName] = useState("")
  const [formError, setFormError] = useState("")
  const [selectedIds, setSelectedIds] = useState([])
  const [bulkMode, setBulkMode] = useState(searchParams.get("bulk") === "true")
  const [bulkType, setBulkType] = useState(null)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    supabase
      .from("cardholders")
      .select("id, full_name, status, licence_end_date, created_at, photo_url")
      .neq("status", "deleted")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setCardholders(data)
      })

    supabase
      .from("cardholder_credentials")
      .select("cardholder_id, qualifications_competencies(type)")
      .then(({ data }) => {
        if (data) {
          const credCounts = {}
          data.forEach(cred => {
            const chId = cred.cardholder_id
            if (!credCounts[chId]) {
              credCounts[chId] = { qualification: 0, competency: 0, site_induction: 0, permit: 0 }
            }
            const type = cred.qualifications_competencies?.type || "qualification"
            if (credCounts[chId][type] !== undefined) {
              credCounts[chId][type]++
            }
          })
          setCredentials(credCounts)
        }
      })

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from("users")
        .select("company_id, companies(company_name)")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data?.companies?.company_name) setCompanyName(data.companies.company_name)
        })
    })
  }, [])

  async function applyActivation(id) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`/api/dashboard/cardholders/${id}/activate`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        return false
      }
      return true
    } catch (err) {
      return false
    }
  }

  async function handleBulkActivate() {
    const targets = cardholders.filter(c => selectedIds.includes(c.id) && c.status === "pending_activation")
    await Promise.all(targets.map(c => applyActivation(c.id)))
    setSelectedIds([])
    router.refresh()
  }

  async function handleBulkRenew() {
    const targets = cardholders.filter(c => selectedIds.includes(c.id) && c.status === "active")
    await Promise.all(targets.map(c => applyActivation(c.id)))
    setSelectedIds([])
    router.refresh()
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ color: "#2C3E50", fontSize: "1.5rem", fontWeight: 700, margin: 0, letterSpacing: "-0.03em" }}>
          Cardholders
        </h1>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {!bulkMode && (
            <>
              <button
                onClick={() => { setBulkMode(true); setBulkType("update"); setSelectedIds([]) }}
                style={{ padding: "0.625rem 1.125rem", background: "#fff", border: "1px solid #E5E7EB", borderRadius: "0.5rem", color: "#34495E", fontSize: "0.875rem", fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}
                onMouseEnter={e => e.currentTarget.style.background = "#F3F4F6"}
                onMouseLeave={e => e.currentTarget.style.background = "#fff"}
              >
                Bulk Update
              </button>
              <button
                onClick={() => { setBulkMode(true); setBulkType("activate"); setSelectedIds([]) }}
                style={{ padding: "0.625rem 1.125rem", background: "#fff", border: "1px solid #E5E7EB", borderRadius: "0.5rem", color: "#34495E", fontSize: "0.875rem", fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}
                onMouseEnter={e => e.currentTarget.style.background = "#F3F4F6"}
                onMouseLeave={e => e.currentTarget.style.background = "#fff"}
              >
                Activate / Renew
              </button>
            </>
          )}
          {bulkMode && bulkType === "update" && (
            <>
              <button
                onClick={() => { const ids = cardholders.filter(c => c.status !== "deleted").map(c => c.id); setSelectedIds(ids) }}
                style={{ padding: "0.625rem 1.125rem", background: "#fff", border: "1px solid #E5E7EB", borderRadius: "0.5rem", color: "#34495E", fontSize: "0.875rem", fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}
                onMouseEnter={e => e.currentTarget.style.background = "#F3F4F6"}
                onMouseLeave={e => e.currentTarget.style.background = "#fff"}
              >
                Select All
              </button>
              <button
                onClick={() => { setBulkMode(false); setSelectedIds([]); setBulkType(null) }}
                style={{ padding: "0.625rem 1.125rem", background: "#fff", border: "1px solid #E5E7EB", borderRadius: "0.5rem", color: "#34495E", fontSize: "0.875rem", fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}
                onMouseEnter={e => e.currentTarget.style.background = "#F3F4F6"}
                onMouseLeave={e => e.currentTarget.style.background = "#fff"}
              >
                Cancel
              </button>
            </>
          )}
          {bulkMode && bulkType === "activate" && (
            <>
              <button
                onClick={() => { const ids = cardholders.filter(c => c.status !== "deleted").map(c => c.id); setSelectedIds(ids) }}
                style={{ padding: "0.625rem 1.125rem", background: "#fff", border: "1px solid #E5E7EB", borderRadius: "0.5rem", color: "#34495E", fontSize: "0.875rem", fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}
                onMouseEnter={e => e.currentTarget.style.background = "#F3F4F6"}
                onMouseLeave={e => e.currentTarget.style.background = "#fff"}
              >
                Select All
              </button>
              {selectedIds.length > 0 && (
                <>
                  <button
                    onClick={handleBulkActivate}
                    style={{ padding: "0.625rem 1.125rem", background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: "0.5rem", color: "#F97316", fontSize: "0.875rem", fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#FFEDD5"}
                    onMouseLeave={e => e.currentTarget.style.background = "#FFF7ED"}
                  >
                    Activate Selected
                  </button>
                  <button
                    onClick={handleBulkRenew}
                    style={{ padding: "0.625rem 1.125rem", background: "#F0FDF4", border: "1px solid #D1E8D9", borderRadius: "0.5rem", color: "#16A34A", fontSize: "0.875rem", fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#DCFCE7"}
                    onMouseLeave={e => e.currentTarget.style.background = "#F0FDF4"}
                  >
                    Renew Selected
                  </button>
                </>
              )}
              <button
                onClick={() => { setBulkMode(false); setSelectedIds([]); setBulkType(null) }}
                style={{ padding: "0.625rem 1.125rem", background: "#fff", border: "1px solid #E5E7EB", borderRadius: "0.5rem", color: "#34495E", fontSize: "0.875rem", fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}
                onMouseEnter={e => e.currentTarget.style.background = "#F3F4F6"}
                onMouseLeave={e => e.currentTarget.style.background = "#fff"}
              >
                Cancel
              </button>
            </>
          )}
          <button
            onClick={() => setIsModalOpen(true)}
            style={{ padding: "0.625rem 1.125rem", background: "#2f6f6a", border: "none", borderRadius: "0.5rem", color: "#fff", fontSize: "0.875rem", fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            + Add Cardholder
          </button>
        </div>
      </div>

      <div style={CARD}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={{
              padding: "0.625rem 1rem",
              background: "#F9FAFB",
              border: "1px solid #E5E7EB",
              borderRadius: "0.5rem",
              color: "#34495E",
              fontSize: "0.875rem",
              fontFamily: "inherit",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="payment">Payment Pending</option>
            <option value="expiring">Expiring Soon</option>
            <option value="expired">Expired</option>
          </select>

        </div>

        {(() => {
          const filtered = cardholders.filter(c => {
            const licenceStatus = getLicenceStatus(c.licence_end_date)

            // Bulk mode filtering
            if (bulkMode && bulkType === "activate") return c.status === "pending_activation"
            if (bulkMode && bulkType === "renew") return licenceStatus.status === "Expired" || licenceStatus.status === "Expiring Soon"

            // Regular filter
            if (filter === "active") return licenceStatus.status === "Active"
            if (filter === "payment") return licenceStatus.status === "Payment Pending"
            if (filter === "expiring") return licenceStatus.status === "Expiring Soon"
            if (filter === "expired") return licenceStatus.status === "Expired"
            return true
          }).sort((a, b) => {
            const statusA = getLicenceStatus(a.licence_end_date).status
            const statusB = getLicenceStatus(b.licence_end_date).status
            const orderDiff = getStatusSortOrder({ status: statusA }) - getStatusSortOrder({ status: statusB })
            if (orderDiff !== 0) return orderDiff
            // Within same group, sort by earliest expiry first (null dates go last)
            if (!a.licence_end_date && !b.licence_end_date) return 0
            if (!a.licence_end_date) return 1
            if (!b.licence_end_date) return -1
            return new Date(a.licence_end_date) - new Date(b.licence_end_date)
          })
          if (filtered.length === 0) return (
            <div style={{ padding: "2rem 1rem", textAlign: "center" }}>
              <p style={{ color: "#9CA3AF", fontSize: "0.9375rem", margin: 0 }}>
                No cardholders found
              </p>
            </div>
          )
          const visible = showAll ? filtered : filtered.slice(0, 8)
          return (
            <>
            <p style={{ color: "#6B7280", fontSize: "0.75rem", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 1rem" }}>
              Recent Cardholders
            </p>
            <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem" }}>
                <div style={{ width: "12px", height: "12px", borderRadius: "0.25rem", background: "#4A90D9" }}></div>
                <span style={{ color: "#6B7280" }}>Qualifications</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem" }}>
                <div style={{ width: "12px", height: "12px", borderRadius: "0.25rem", background: "#F97316" }}></div>
                <span style={{ color: "#6B7280" }}>Competencies</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem" }}>
                <div style={{ width: "12px", height: "12px", borderRadius: "0.25rem", background: "#7C3AED" }}></div>
                <span style={{ color: "#6B7280" }}>Site Inductions</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem" }}>
                <div style={{ width: "12px", height: "12px", borderRadius: "0.25rem", background: "#16A34A" }}></div>
                <span style={{ color: "#6B7280" }}>Permits</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {visible.map(({ id, full_name, status, licence_end_date, photo_url }) => {
                const isDisabled = status === "deleted"
                const licenceStatus = getLicenceStatus(licence_end_date)
                const isSelected = selectedIds.includes(id)
                const tint = getCardTint(licenceStatus.status)
                return (
                  <div
                    key={id}
                    onClick={() => {
                      if (bulkMode && !isDisabled) {
                        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
                      } else if (!isDisabled) {
                        router.push(`/dashboard/cardholders/${id}`)
                      }
                    }}
                    style={{
                      position: "relative",
                      padding: "1.25rem",
                      borderRadius: "0.75rem",
                      border: `1px solid ${isSelected ? "#2f6f6a" : tint.border}`,
                      background: isSelected ? "#E6F4F1" : tint.bg,
                      cursor: isDisabled ? "default" : "pointer",
                      opacity: isDisabled ? 0.5 : 1,
                      transition: "background 0.15s ease, border-color 0.15s ease",
                      boxShadow: "0 1px 3px rgba(44,62,80,0.06)",
                      display: "flex",
                      flexDirection: "column",
                      height: "100%",
                      minHeight: "160px",
                    }}
                    onMouseEnter={e => {
                      if (!isSelected && !isDisabled) {
                        e.currentTarget.style.background = tint.hover
                        e.currentTarget.style.borderColor = tint.hoverBorder
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isSelected && !isDisabled) {
                        e.currentTarget.style.background = tint.bg
                        e.currentTarget.style.borderColor = tint.border
                      }
                    }}
                  >
                    {bulkMode && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={isDisabled}
                        onChange={e => {
                          e.stopPropagation()
                          if (!isDisabled) setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
                        }}
                        onClick={e => e.stopPropagation()}
                        style={{
                          position: "absolute",
                          top: "1rem",
                          left: "1rem",
                          cursor: isDisabled ? "not-allowed" : "pointer",
                          accentColor: "#2f6f6a",
                        }}
                      />
                    )}
                    <div style={{ paddingLeft: bulkMode ? "1.5rem" : 0, display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                          <p style={{ color: "#1F2937", fontSize: "0.9375rem", fontWeight: 700, margin: 0, lineHeight: 1.3 }}>
                            {full_name}
                          </p>
                          <ChevronRight size={16} style={{ color: "#9CA3AF", flexShrink: 0 }} />
                        </div>
                        {licenceStatus.dateLabel && (
                          <p style={{ color: "#6B7280", fontSize: "0.8125rem", margin: 0 }}>
                            {`${licenceStatus.dateLabel} ${new Date(licence_end_date).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" })}`}
                          </p>
                        )}
                      </div>
                      <div style={{ flexShrink: 0, marginLeft: "1rem" }}>
                        {photo_url ? (
                          <img
                            src={photo_url}
                            alt={full_name}
                            style={{ width: 48, height: 48, borderRadius: "0.375rem", border: `1px solid ${tint.border}`, objectFit: "cover", display: "block" }}
                            onError={e => {
                              e.currentTarget.style.display = "none"
                              e.currentTarget.nextSibling.style.display = "flex"
                            }}
                          />
                        ) : null}
                        <div style={{
                          width: 48, height: 48, borderRadius: "0.375rem", border: `1px solid ${tint.border}`,
                          background: tint.hover,
                          display: photo_url ? "none" : "flex",
                          alignItems: "center", justifyContent: "center",
                          color: "#6B7280", fontSize: "0.875rem", fontWeight: 700,
                        }}>
                          {full_name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()}
                        </div>
                      </div>
                    </div>
                    <div style={{ marginTop: "auto" }}>
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "100%",
                        padding: "0.375rem 1rem",
                        borderRadius: "0.375rem",
                        background: "transparent",
                        border: `1px solid ${getStatusColour(licenceStatus.status)}`,
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: getStatusColour(licenceStatus.status),
                        textAlign: "center",
                        fontFamily: "inherit",
                      }}>
                        {licenceStatus.status}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            {filtered.length > 8 && (
              <div style={{ textAlign: "right", marginTop: "1rem" }}>
                <button
                  onClick={() => setShowAll(!showAll)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#6B7280",
                    fontSize: "0.8125rem",
                    textDecoration: "none",
                    cursor: "pointer",
                    padding: 0,
                    transition: "color 0.15s ease",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.25rem",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = "#2f6f6a"; e.currentTarget.style.textDecoration = "underline" }}
                  onMouseLeave={e => { e.currentTarget.style.color = "#6B7280"; e.currentTarget.style.textDecoration = "none" }}
                >
                  {showAll ? "Show less" : "View all"} <ArrowRight size={13} />
                </button>
              </div>
            )}
            </>
          )
        })()}

      </div>

      {isModalOpen && (
        <div
          onClick={() => setIsModalOpen(false)}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 50,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "#FFFFFF",
              border: "1px solid #E5E7EB",
              borderRadius: "0.75rem",
              padding: "2rem",
              width: "100%",
              maxWidth: "440px",
              boxShadow: "0 10px 25px rgba(44,62,80,0.15)",
            }}
          >
            <h2 style={{ color: "#2C3E50", fontSize: "1.125rem", fontWeight: 700, margin: "0 0 1.5rem", letterSpacing: "-0.02em" }}>
              Add Cardholder
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
              <div>
                <label style={{ display: "block", color: "#6B7280", fontSize: "0.8125rem", marginBottom: "0.375rem" }}>
                  Full Name <span style={{ color: "#EF4444" }}>*</span>
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => { setNewName(e.target.value); setFormError("") }}
                  placeholder="e.g. Jane Smith"
                  style={{
                    width: "100%", padding: "0.75rem 1rem",
                    background: "#F9FAFB",
                    border: "1px solid #E5E7EB",
                    borderRadius: "0.5rem",
                    color: "#1F2937", fontSize: "0.9375rem",
                    fontFamily: "inherit", outline: "none",
                    boxSizing: "border-box",
                  }}
                  onFocus={e => e.target.style.borderColor = "#2f6f6a"}
                  onBlur={e => e.target.style.borderColor = "#E5E7EB"}
                />
              </div>
              <div>
                <label style={{ display: "block", color: "#6B7280", fontSize: "0.8125rem", marginBottom: "0.375rem" }}>
                  Photo <span style={{ color: "#EF4444" }}>*</span>
                </label>
                <div
                  onClick={() => document.getElementById("photo-upload").click()}
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => {
                    e.preventDefault()
                    setDragOver(false)
                    const file = e.dataTransfer.files[0]
                    if (!file) return
                    setNewPhoto(file)
                    if (newPhotoPreview) URL.revokeObjectURL(newPhotoPreview)
                    setNewPhotoPreview(URL.createObjectURL(file))
                    setFormError("")
                  }}
                  style={{
                    border: `2px dashed ${dragOver ? "#2f6f6a" : "#E5E7EB"}`,
                    borderRadius: "0.5rem",
                    padding: "1.25rem",
                    textAlign: "center",
                    cursor: "pointer",
                    background: dragOver ? "#F0FDF4" : "#F9FAFB",
                    transition: "border-color 0.15s ease, background 0.15s ease",
                    position: "relative",
                    minHeight: "100px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const file = e.target.files[0]
                      if (!file) return
                      setNewPhoto(file)
                      if (newPhotoPreview) URL.revokeObjectURL(newPhotoPreview)
                      setNewPhotoPreview(URL.createObjectURL(file))
                      setFormError("")
                    }}
                    style={{ display: "none" }}
                  />
                  {newPhotoPreview ? (
                    <img
                      src={newPhotoPreview}
                      alt="Preview"
                      style={{ maxHeight: "80px", maxWidth: "100%", borderRadius: "0.375rem", objectFit: "cover" }}
                    />
                  ) : (
                    <div>
                      <p style={{ color: "#6B7280", fontSize: "0.875rem", margin: "0 0 0.25rem" }}>
                        Click to upload or drag and drop
                      </p>
                      <p style={{ color: "#9CA3AF", fontSize: "0.75rem", margin: 0 }}>
                        JPG, PNG or WebP
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label style={{ display: "block", color: "#6B7280", fontSize: "0.8125rem", marginBottom: "0.375rem" }}>
                  Company
                </label>
                <input
                  type="text"
                  value={companyName || "Your Company"}
                  disabled
                  style={{
                    width: "100%", padding: "0.75rem 1rem",
                    background: "#F3F4F6",
                    border: "1px solid #E5E7EB",
                    borderRadius: "0.5rem",
                    color: "#9CA3AF", fontSize: "0.9375rem",
                    fontFamily: "inherit", outline: "none",
                    boxSizing: "border-box", cursor: "not-allowed",
                  }}
                />
              </div>
            </div>

            {formError && (
              <p style={{ color: "#EF4444", fontSize: "0.8125rem", margin: "0 0 1rem" }}>{formError}</p>
            )}

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button
                onClick={() => { setIsModalOpen(false); setFormError(""); setNewName(""); setNewPhoto(null); if (newPhotoPreview) URL.revokeObjectURL(newPhotoPreview); setNewPhotoPreview(null); setDragOver(false) }}
                style={{ padding: "0.625rem 1.125rem", background: "#fff", border: "1px solid #E5E7EB", borderRadius: "0.5rem", color: "#34495E", fontSize: "0.875rem", fontFamily: "inherit", cursor: "pointer" }}
                onMouseEnter={e => e.currentTarget.style.background = "#F3F4F6"}
                onMouseLeave={e => e.currentTarget.style.background = "#fff"}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!newPhoto) return setFormError("A photo is required.")
                  if (!newName.trim()) return setFormError("Full name is required.")

                  const { data: { user }, error: authError } = await supabase.auth.getUser()
                  if (authError || !user) { return setFormError("Not authenticated.") }

                  const { data: userData, error: userError } = await supabase
                    .from("users")
                    .select("company_id")
                    .eq("id", user.id)
                    .single()
                  if (userError || !userData?.company_id) { return setFormError("Could not fetch company.") }

                  const filePath = `${Date.now()}-${newPhoto.name}`
                  const { error: uploadError } = await supabase.storage
                    .from("cardholder-photos")
                    .upload(filePath, newPhoto)
                  if (uploadError) { return setFormError("Photo upload failed.") }

                  const { data: { publicUrl } } = supabase.storage
                    .from("cardholder-photos")
                    .getPublicUrl(filePath)

                  // Generate slug
                  const nameParts = newName.trim().toLowerCase().split(/\s+/)
                  const randomDigits = Math.random().toString().slice(2, 14).padEnd(12, '0')
                  const slug = `${nameParts.join('-')}-${randomDigits}`

                  // Check for collision
                  const { data: existingSlug, error: slugError } = await supabase
                    .from("cardholders")
                    .select("id")
                    .eq("slug", slug)
                    .limit(1)
                  if (existingSlug && existingSlug.length > 0) return setFormError("Slug collision. Please try again.")

                  const { error: insertError } = await supabase
                    .from("cardholders")
                    .insert({
                      full_name: newName.trim(),
                      photo_url: publicUrl,
                      slug: slug,
                      status: "pending_activation",
                      company_id: userData.company_id,
                      created_by: "company_admin",
                      licence_start_date: null,
                      licence_end_date: null,
                    })
                  if (insertError) {
                    return setFormError(`Failed to save: ${insertError.message}`)
                  }

                  // Refetch cardholders to show new entry
                  supabase
                    .from("cardholders")
                    .select("id, full_name, status, licence_end_date, created_at, photo_url")
                    .order("created_at", { ascending: false })
                    .then(({ data }) => {
                      if (data) setCardholders(data)
                    })

                  setIsModalOpen(false); setFormError(""); setNewName(""); setNewPhoto(null); if (newPhotoPreview) URL.revokeObjectURL(newPhotoPreview); setNewPhotoPreview(null); setDragOver(false)
                }}
                style={{
                  padding: "0.625rem 1.125rem",
                  background: "#2f6f6a",
                  border: "none",
                  borderRadius: "0.5rem",
                  color: "#fff",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  fontFamily: "inherit",
                  cursor: "pointer",
                  transition: "opacity 0.15s ease, transform 0.15s ease",
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
                onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                onMouseDown={e => e.currentTarget.style.transform = "scale(0.98)"}
                onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
