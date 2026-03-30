"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

function getStatusBadge(status, licence_end_date) {
  if (licence_end_date && new Date(licence_end_date) < new Date()) {
    return { label: "Expired", bg: "rgba(239,68,68,0.15)", color: "#FCA5A5" }
  }
  if (status === "active" && licence_end_date) {
    const exp = new Date(licence_end_date)
    const in30 = new Date(); in30.setDate(in30.getDate() + 30)
    if (exp <= in30) return { label: "Expiring Soon", bg: "rgba(245,158,11,0.15)", color: "#FCD34D" }
  }
  if (status === "active") return { label: "Active", bg: "rgba(47,111,106,0.2)", color: "#6EE7B7" }
  if (status === "pending_activation") return { label: "Payment Pending", bg: "rgba(249,115,22,0.15)", color: "#FDBA74" }
  return { label: status?.replace(/_/g, " ") ?? "", bg: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.45)" }
}

export default function CardholdersPage() {
  const router = useRouter()
  const [cardholders, setCardholders] = useState([])
  const [filter, setFilter] = useState("all")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [newPhoto, setNewPhoto] = useState(null)
  const [newPhotoPreview, setNewPhotoPreview] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [companyName, setCompanyName] = useState("")
  const [formError, setFormError] = useState("")
  const [selectedIds, setSelectedIds] = useState([])
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkType, setBulkType] = useState(null)

  useEffect(() => {
    supabase
      .from("cardholders")
      .select("id, full_name, status, licence_end_date, created_at, photo_url")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setCardholders(data)
      })

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from("users")
        .select("company_id, companies(name)")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data?.companies?.name) setCompanyName(data.companies.name)
        })
    })
  }, [])

  async function applyActivation(id) {
    const today = new Date()
    const nextYear = new Date(today)
    nextYear.setFullYear(nextYear.getFullYear() + 1)
    const fmt = d => d.toISOString().split("T")[0]
    const { error } = await supabase
      .from("cardholders")
      .update({
        status: "active",
        licence_start_date: fmt(today),
        licence_end_date: fmt(nextYear),
      })
      .eq("id", id)
    if (error) console.error(error)
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
    <div style={{
      background: "linear-gradient(to bottom, #214f4b, #2a5f5b, #35736f)",
      borderRadius: "1rem",
      padding: "2rem",
      display: "flex",
      flexDirection: "column",
      gap: "2rem",
    }}>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ color: "#fff", fontSize: "1.5rem", fontWeight: 700, margin: 0, letterSpacing: "-0.03em" }}>
          Cardholders
        </h1>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {!bulkMode && (
            <>
              <button
                onClick={() => { setBulkMode(true); setBulkType("update"); setSelectedIds([]) }}
                style={{
                  padding: "0.625rem 1.125rem",
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "0.5rem",
                  color: "rgba(255,255,255,0.7)",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  fontFamily: "inherit",
                  cursor: "pointer",
                  transition: "opacity 0.15s ease, transform 0.15s ease",
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = "0.75"}
                onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                onMouseDown={e => e.currentTarget.style.transform = "scale(0.98)"}
                onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
              >
                Bulk Update
              </button>
              <button
                onClick={() => { setBulkMode(true); setBulkType("activate"); setSelectedIds([]) }}
                style={{
                  padding: "0.625rem 1.125rem",
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "0.5rem",
                  color: "rgba(255,255,255,0.7)",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  fontFamily: "inherit",
                  cursor: "pointer",
                  transition: "opacity 0.15s ease, transform 0.15s ease",
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = "0.75"}
                onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                onMouseDown={e => e.currentTarget.style.transform = "scale(0.98)"}
                onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
              >
                Activate / Renew
              </button>
            </>
          )}
          {bulkMode && bulkType === "update" && (
            <button
              onClick={() => { setBulkMode(false); setSelectedIds([]); setBulkType(null) }}
              style={{
                padding: "0.625rem 1.125rem",
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "0.5rem",
                color: "rgba(255,255,255,0.5)",
                fontSize: "0.875rem",
                fontWeight: 600,
                fontFamily: "inherit",
                cursor: "pointer",
                transition: "opacity 0.15s ease, transform 0.15s ease",
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.75"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
              onMouseDown={e => e.currentTarget.style.transform = "scale(0.98)"}
              onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
            >
              Cancel
            </button>
          )}
          {bulkMode && bulkType === "activate" && (
            <>
              {selectedIds.length > 0 && (
                <>
                  <button
                    onClick={handleBulkActivate}
                    style={{
                      padding: "0.625rem 1.125rem",
                      background: "rgba(249,115,22,0.2)",
                      border: "1px solid rgba(249,115,22,0.4)",
                      borderRadius: "0.5rem",
                      color: "#FDBA74",
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      fontFamily: "inherit",
                      cursor: "pointer",
                      transition: "opacity 0.15s ease, transform 0.15s ease",
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = "0.75"}
                    onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                    onMouseDown={e => e.currentTarget.style.transform = "scale(0.98)"}
                    onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
                  >
                    Activate Selected
                  </button>
                  <button
                    onClick={handleBulkRenew}
                    style={{
                      padding: "0.625rem 1.125rem",
                      background: "rgba(47,111,106,0.2)",
                      border: "1px solid rgba(47,111,106,0.4)",
                      borderRadius: "0.5rem",
                      color: "#6EE7B7",
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      fontFamily: "inherit",
                      cursor: "pointer",
                      transition: "opacity 0.15s ease, transform 0.15s ease",
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = "0.75"}
                    onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                    onMouseDown={e => e.currentTarget.style.transform = "scale(0.98)"}
                    onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
                  >
                    Renew Selected
                  </button>
                </>
              )}
              <button
                onClick={() => { setBulkMode(false); setSelectedIds([]); setBulkType(null) }}
                style={{
                  padding: "0.625rem 1.125rem",
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "0.5rem",
                  color: "rgba(255,255,255,0.5)",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  fontFamily: "inherit",
                  cursor: "pointer",
                  transition: "opacity 0.15s ease, transform 0.15s ease",
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = "0.75"}
                onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                onMouseDown={e => e.currentTarget.style.transform = "scale(0.98)"}
                onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
              >
                Cancel
              </button>
            </>
          )}
          <button
            onClick={() => setIsModalOpen(true)}
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
            + Add Cardholder
          </button>
        </div>
      </div>

      <div style={{
        background: "#1f3f3c",
        borderRadius: "0.75rem",
        border: "1px solid rgba(255,255,255,0.05)",
        padding: "1.5rem",
        boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
      }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={{
              padding: "0.625rem 1rem",
              background: "#1f3f3c",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "0.5rem",
              color: "#fff",
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
          </select>

        </div>

        {(() => {
          const today = new Date()
          const in30 = new Date(); in30.setDate(today.getDate() + 30)
          const filtered = cardholders.filter(c => {
            if (filter === "active") return c.status === "active"
            if (filter === "payment") return c.status === "pending_activation"
            if (filter === "expiring") {
              if (!c.licence_end_date) return false
              const exp = new Date(c.licence_end_date)
              return exp >= today && exp <= in30
            }
            return true
          })
          if (filtered.length === 0) return (
            <div style={{ padding: "2rem 1rem", textAlign: "center" }}>
              <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.9375rem", margin: 0 }}>
                No cardholders found
              </p>
            </div>
          )
          const visible = filtered.slice(0, 6)
          return (
            <>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.75rem", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 1rem" }}>
              Recent Cardholders
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {visible.map(({ id, full_name, status, licence_end_date, photo_url }) => {
                const isDisabled = status === "deleted"
                const badge = getStatusBadge(status, licence_end_date)
                const isSelected = selectedIds.includes(id)
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
                      border: `1px solid ${isSelected ? "rgba(47,111,106,0.5)" : "rgba(255,255,255,0.07)"}`,
                      background: isSelected ? "rgba(47,111,106,0.1)" : "rgba(255,255,255,0.03)",
                      cursor: isDisabled ? "default" : "pointer",
                      opacity: isDisabled ? 0.5 : 1,
                      transition: "background 0.15s ease, opacity 0.15s ease",
                    }}
                    onMouseEnter={e => {
                      if (!isSelected && !isDisabled) e.currentTarget.style.background = "rgba(255,255,255,0.07)"
                    }}
                    onMouseLeave={e => {
                      if (!isSelected && !isDisabled) e.currentTarget.style.background = "rgba(255,255,255,0.03)"
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
                    <div style={{ paddingLeft: bulkMode ? "1.5rem" : 0, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: "#fff", fontSize: "0.9375rem", fontWeight: 700, margin: "0 0 0.25rem", lineHeight: 1.3 }}>
                          {full_name}
                        </p>
                        <p style={{ margin: "0 0 0.375rem" }}>
                          <span style={{ color: badge.color, fontSize: "0.8125rem", fontWeight: 500 }}>
                            {badge.label}
                          </span>
                        </p>
                        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8125rem", margin: "0 0 0.75rem" }}>
                          {licence_end_date
                            ? `Expires ${new Date(licence_end_date).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" })}`
                            : "No expiry"}
                        </p>
                        {(status === "pending_activation" || status === "active") && (
                          <button
                            onClick={async e => {
                              e.stopPropagation()
                              const msg = status === "pending_activation"
                                ? "Activate this cardholder and start their 12-month licence?"
                                : "Renew this cardholder for another 12 months?"
                              if (!confirm(msg)) return
                              await applyActivation(id)
                              router.refresh()
                            }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              height: "36px",
                              minWidth: "100px",
                              padding: "0 1rem",
                              background: "#2f6f6a",
                              border: "none",
                              borderRadius: "0.375rem",
                              color: "#fff",
                              fontSize: "0.875rem",
                              fontWeight: 600,
                              fontFamily: "inherit",
                              cursor: "pointer",
                              transition: "opacity 0.15s ease",
                            }}
                            onMouseEnter={e => e.currentTarget.style.opacity = "0.8"}
                            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                          >
                            {status === "pending_activation" ? "Activate" : "Renew"}
                          </button>
                        )}
                      </div>
                      <div style={{ flexShrink: 0, marginLeft: "1rem" }}>
                        {photo_url ? (
                          <img
                            src={photo_url}
                            alt={full_name}
                            style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", display: "block" }}
                            onError={e => {
                              e.currentTarget.style.display = "none"
                              e.currentTarget.nextSibling.style.display = "flex"
                            }}
                          />
                        ) : null}
                        <div style={{
                          width: 56, height: 56, borderRadius: "50%",
                          background: "rgba(255,255,255,0.05)",
                          display: photo_url ? "none" : "flex",
                          alignItems: "center", justifyContent: "center",
                          color: "rgba(255,255,255,0.6)", fontSize: "1rem", fontWeight: 700,
                        }}>
                          {full_name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            {filtered.length > 6 && (
              <div style={{ textAlign: "right", marginTop: "1rem" }}>
                <a
                  href="/dashboard/cardholders"
                  onClick={e => { e.preventDefault(); router.push("/dashboard/cardholders") }}
                  style={{
                    color: "rgba(255,255,255,0.55)",
                    fontSize: "0.8125rem",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.25rem",
                    transition: "color 0.15s ease",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = "#2f6f6a"; e.currentTarget.style.textDecoration = "underline" }}
                  onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.55)"; e.currentTarget.style.textDecoration = "none" }}
                >
                  View all
                </a>
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
              background: "rgba(30,35,45,0.97)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "0.75rem",
              padding: "2rem",
              width: "100%",
              maxWidth: "440px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.4)",
            }}
          >
            <h2 style={{ color: "#fff", fontSize: "1.125rem", fontWeight: 700, margin: "0 0 1.5rem", letterSpacing: "-0.02em" }}>
              Add Cardholder
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
              <div>
                <label style={{ display: "block", color: "rgba(255,255,255,0.6)", fontSize: "0.8125rem", marginBottom: "0.375rem" }}>
                  Full Name <span style={{ color: "#FCA5A5" }}>*</span>
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => { setNewName(e.target.value); setFormError("") }}
                  placeholder="e.g. Jane Smith"
                  style={{
                    width: "100%", padding: "0.75rem 1rem",
                    background: "rgba(0,0,0,0.3)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "0.5rem",
                    color: "#fff", fontSize: "0.9375rem",
                    fontFamily: "inherit", outline: "none",
                    boxSizing: "border-box",
                  }}
                  onFocus={e => e.target.style.borderColor = "rgba(255,255,255,0.3)"}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.12)"}
                />
              </div>
              <div>
                <label style={{ display: "block", color: "rgba(255,255,255,0.6)", fontSize: "0.8125rem", marginBottom: "0.375rem" }}>
                  Photo <span style={{ color: "#FCA5A5" }}>*</span>
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
                    setNewPhotoPreview(URL.createObjectURL(file))
                    setFormError("")
                  }}
                  style={{
                    border: `2px dashed ${dragOver ? "rgba(47,111,106,0.8)" : "rgba(255,255,255,0.15)"}`,
                    borderRadius: "0.5rem",
                    padding: "1.25rem",
                    textAlign: "center",
                    cursor: "pointer",
                    background: dragOver ? "rgba(47,111,106,0.08)" : "rgba(0,0,0,0.2)",
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
                      <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.875rem", margin: "0 0 0.25rem" }}>
                        Click to upload or drag and drop
                      </p>
                      <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.75rem", margin: 0 }}>
                        JPG, PNG or WebP
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label style={{ display: "block", color: "rgba(255,255,255,0.6)", fontSize: "0.8125rem", marginBottom: "0.375rem" }}>
                  Company
                </label>
                <input
                  type="text"
                  value={companyName || "Your Company"}
                  disabled
                  style={{
                    width: "100%", padding: "0.75rem 1rem",
                    background: "rgba(0,0,0,0.2)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: "0.5rem",
                    color: "rgba(255,255,255,0.4)", fontSize: "0.9375rem",
                    fontFamily: "inherit", outline: "none",
                    boxSizing: "border-box", cursor: "not-allowed",
                  }}
                />
              </div>
            </div>

            {formError && (
              <p style={{ color: "#FCA5A5", fontSize: "0.8125rem", margin: "0 0 1rem" }}>{formError}</p>
            )}

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button
                onClick={() => { setIsModalOpen(false); setFormError(""); setNewName(""); setNewPhoto(null); setNewPhotoPreview(null); setDragOver(false) }}
                style={{
                  padding: "0.625rem 1.125rem",
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "0.5rem",
                  color: "rgba(255,255,255,0.7)",
                  fontSize: "0.875rem",
                  fontFamily: "inherit",
                  cursor: "pointer",
                  transition: "opacity 0.15s ease",
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = "0.7"}
                onMouseLeave={e => e.currentTarget.style.opacity = "1"}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!newPhoto) return setFormError("A photo is required.")
                  if (!newName.trim()) return setFormError("Full name is required.")

                  const { data: { user }, error: authError } = await supabase.auth.getUser()
                  if (authError || !user) { console.error(authError); return setFormError("Not authenticated.") }

                  const { data: userData, error: userError } = await supabase
                    .from("users")
                    .select("company_id")
                    .eq("id", user.id)
                    .single()
                  if (userError || !userData?.company_id) { console.error(userError); return setFormError("Could not fetch company.") }

                  const filePath = `${Date.now()}-${newPhoto.name}`
                  const { error: uploadError } = await supabase.storage
                    .from("cardholder-photos")
                    .upload(filePath, newPhoto)
                  if (uploadError) { console.error(uploadError); return setFormError("Photo upload failed.") }

                  const { data: { publicUrl } } = supabase.storage
                    .from("cardholder-photos")
                    .getPublicUrl(filePath)

                  const { error: insertError } = await supabase
                    .from("cardholders")
                    .insert({
                      full_name: newName.trim(),
                      photo_url: publicUrl,
                      status: "pending_activation",
                      company_id: userData.company_id,
                      created_by: user.id,
                      licence_start_date: null,
                      licence_end_date: null,
                    })
                  if (insertError) { console.error(insertError); return setFormError("Failed to save cardholder.") }

                  setIsModalOpen(false); setFormError(""); setNewName(""); setNewPhoto(null); setNewPhotoPreview(null); setDragOver(false)
                  router.refresh()
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
