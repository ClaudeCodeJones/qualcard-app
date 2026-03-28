"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { QRCodeSVG } from "qrcode.react"
import { supabase } from "@/lib/supabase"
import Header from "@/app/components/Header"
import FileUploadArea from "@/app/components/FileUploadArea"
import {
  ArrowLeft, ExternalLink, Copy, Check,
  GraduationCap, Award, ClipboardCheck, ShieldCheck,
  Pencil, Trash2, Search, X, ChevronDown, ChevronUp,
  Camera, RefreshCw, Archive, Building2, Users,
} from "lucide-react"

// ─── Constants ────────────────────────────────────────────────────────────────

const GRADIENT = "radial-gradient(circle, #34495E 0%, #2C3E50 100%)"
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? ""

const SECTIONS = [
  { key: "qualification",  label: "Qualifications",         color: "#4A90D9", Icon: GraduationCap },
  { key: "competency",     label: "Competencies",           color: "#F97316", Icon: Award         },
  { key: "site_induction", label: "Site Inductions",        color: "#7C3AED", Icon: ClipboardCheck },
  { key: "permit",         label: "Permits & Certificates", color: "#16A34A", Icon: ShieldCheck    },
]

const QC_ACTIONS = [
  { key: "change-name",         label: "Change Name",          Icon: Pencil    },
  { key: "reassign-company",    label: "Reassign Company",     Icon: Building2 },
  { key: "change-status",       label: "Change Status",        Icon: RefreshCw },
  { key: "change-photo",        label: "Change Photo",         Icon: Camera    },
  { key: "archive",             label: "Archive Cardholder",   Icon: Archive   },
  { key: "delete-cardholder",   label: "Delete Cardholder",    Icon: Trash2    },
]

const COMPANY_ACTIONS = [
  { key: "change-photo",        label: "Change Photo",         Icon: Camera    },
  { key: "archive",             label: "Archive Cardholder",   Icon: Archive   },
  { key: "delete-cardholder",   label: "Delete Cardholder",    Icon: Trash2    },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name) {
  if (!name) return "?"
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function formatDate(dateStr) {
  if (!dateStr) return ""
  return new Date(dateStr).toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function getLicenceBadge(licenceEndDate) {
  if (!licenceEndDate) return null
  const now = new Date()
  const end = new Date(licenceEndDate)
  const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24))
  if (daysLeft < 0) return { label: `EXPIRED: ${formatDate(licenceEndDate)}`, color: "#EF4444" }
  if (daysLeft <= 30) return { label: `EXPIRING: ${formatDate(licenceEndDate)}`, color: "#F59E0B" }
  return null
}

function getStatusBadgeColor(status) {
  const map = {
    active:             { bg: "transparent", border: "#16A34A", text: "#16A34A" },
    archived:           { bg: "#9CA3AF", border: "#9CA3AF", text: "#FFFFFF" },
    pending:            { bg: "#F97316", border: "#F97316", text: "#FFFFFF" },
    pending_activation: { bg: "#F97316", border: "#F97316", text: "#FFFFFF" },
  }
  return map[status] ?? { bg: "#9CA3AF", border: "#9CA3AF", text: "#FFFFFF" }
}

function getStatusLabel(status) {
  const map = {
    active:             "Active",
    archived:           "Archived",
    pending:            "Pending",
    pending_activation: "Payment Pending",
  }
  return map[status] ?? status
}

function getPhotoBorderColor(status) {
  const map = {
    active:             "#FFFFFF",
    archived:           "#9CA3AF",
    pending_activation: "#F97316",
  }
  return map[status] ?? "#EF4444"
}

function getCredentialBadge(expiryDate) {
  if (!expiryDate) return { label: "Active", color: "#2f6f6a" }
  const now = new Date()
  const end = new Date(expiryDate)
  const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24))
  if (daysLeft < 0) return { label: "Expired", color: "#EF4444" }
  if (daysLeft <= 30) return { label: "Expiring", color: "#F59E0B" }
  return { label: "Active", color: "#2f6f6a" }
}

function getCredentialCode(cred) {
  const qc = cred.qualifications_competencies
  if (!qc) return null
  return qc.unit_standard_number || qc.competency_code || qc.induction_code || qc.permit_number || null
}

// ─── Shared primitives ────────────────────────────────────────────────────────

const inputStyle = {
  width: "100%",
  padding: "0.625rem 0.875rem",
  border: "1.5px solid #E5E7EB",
  borderRadius: "0.5rem",
  fontSize: "0.875rem",
  color: "#333333",
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box",
  background: "#FFFFFF",
  transition: "border-color 0.15s ease",
}

const fieldLabelStyle = {
  display: "block",
  fontSize: "0.8125rem",
  fontWeight: 600,
  color: "#374151",
  marginBottom: "0.375rem",
}

// ─── Loading / Error screens ──────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#D9DEE5",
      fontFamily: "Inter, system-ui, sans-serif",
    }}>
      <p style={{ color: "#374151", fontSize: "0.9375rem" }}>Loading...</p>
    </div>
  )
}

function ErrorScreen({ message }) {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#D9DEE5",
      fontFamily: "Inter, system-ui, sans-serif",
      flexDirection: "column",
      gap: "0.75rem",
    }}>
      <p style={{ color: "#EF4444", fontSize: "0.9375rem", fontWeight: 500 }}>
        {message ?? "Something went wrong."}
      </p>
      <Link
        href="/superadmin?tab=cardholders"
        style={{ color: "#374151", fontSize: "0.875rem", textDecoration: "underline" }}
      >
        Back to Cardholders
      </Link>
    </div>
  )
}

// ─── PhotoCircle ──────────────────────────────────────────────────────────────

function PhotoCircle({ photoUrl, name, size = 80, borderColor = "rgba(255,255,255,0.3)" }) {
  if (photoUrl) {
    return (
      <div style={{
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        flexShrink: 0,
        border: `2.5px solid ${borderColor}`,
      }}>
        <Image
          src={photoUrl}
          alt={name ?? "Photo"}
          width={size}
          height={size}
          style={{ objectFit: "cover", width: "100%", height: "100%" }}
        />
      </div>
    )
  }
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: "50%",
      backgroundColor: "rgba(255,255,255,0.15)",
      border: `2.5px solid ${borderColor}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    }}>
      <span style={{ fontSize: size * 0.35, fontWeight: 700, color: "#FFFFFF", letterSpacing: "0.02em" }}>
        {getInitials(name)}
      </span>
    </div>
  )
}

// ─── CopyButton ───────────────────────────────────────────────────────────────

function CopyButton({ textToCopy }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy(e) {
    e.preventDefault()
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(textToCopy)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* silent */ }
  }

  return (
    <button
      onClick={handleCopy}
      title="Copy profile URL"
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "0.1rem",
        display: "inline-flex",
        alignItems: "center",
        color: copied ? "#86efac" : "rgba(255,255,255,0.7)",
        transition: "color 0.15s ease",
      }}
      onMouseEnter={(e) => { if (!copied) e.currentTarget.style.color = "#FFFFFF" }}
      onMouseLeave={(e) => { if (!copied) e.currentTarget.style.color = "rgba(255,255,255,0.7)" }}
    >
      {copied ? <Check size={14} strokeWidth={2.5} /> : <Copy size={14} strokeWidth={2} />}
    </button>
  )
}

// ─── SearchableDropdown ───────────────────────────────────────────────────────

function SearchableDropdown({ options, value, onChange, placeholder, labelKey = "label", valueKey = "value" }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const ref = useRef(null)

  const selected = options.find((o) => o[valueKey] === value)
  const filtered = options.filter((o) =>
    (o[labelKey] ?? "").toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        style={{
          ...inputStyle,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          textAlign: "left",
          borderColor: open ? "#2f6f6a" : "#E5E7EB",
        }}
      >
        <span style={{ color: selected ? "#333333" : "#9CA3AF" }}>
          {selected ? selected[labelKey] : placeholder}
        </span>
        <ChevronDown size={14} color="#6B7280" style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }} />
      </button>

      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 4px)",
          left: 0,
          right: 0,
          background: "#FFFFFF",
          border: "1.5px solid #E5E7EB",
          borderRadius: "0.5rem",
          boxShadow: "0 4px 16px rgba(44,62,80,0.12)",
          zIndex: 50,
          overflow: "hidden",
        }}>
          <div style={{ padding: "0.5rem", borderBottom: "1px solid #F3F4F6" }}>
            <div style={{ position: "relative" }}>
              <Search size={13} color="#9CA3AF" style={{ position: "absolute", left: "0.625rem", top: "50%", transform: "translateY(-50%)" }} />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                style={{ ...inputStyle, paddingLeft: "2rem", fontSize: "0.8125rem" }}
              />
            </div>
          </div>
          <div style={{ maxHeight: "200px", overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <p style={{ padding: "0.75rem 1rem", fontSize: "0.8125rem", color: "#9CA3AF", margin: 0 }}>No results</p>
            ) : filtered.map((o) => (
              <button
                key={o[valueKey]}
                type="button"
                onClick={() => { onChange(o[valueKey]); setOpen(false); setSearch("") }}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "0.625rem 1rem",
                  background: o[valueKey] === value ? "#F0F9F8" : "transparent",
                  border: "none",
                  textAlign: "left",
                  fontSize: "0.875rem",
                  color: "#333333",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
                onMouseEnter={(e) => { if (o[valueKey] !== value) e.currentTarget.style.background = "#F9FAFB" }}
                onMouseLeave={(e) => { if (o[valueKey] !== value) e.currentTarget.style.background = "transparent" }}
              >
                {o[labelKey]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── ConfirmDeleteModal (credentials) ─────────────────────────────────────────

function ConfirmDeleteModal({ credentialName, onConfirm, onCancel, deleting }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(44,62,80,0.45)",
        zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: "#FFFFFF", borderRadius: "1rem", padding: "2rem",
          width: "100%", maxWidth: "420px",
          boxShadow: "0 8px 32px rgba(44,62,80,0.18)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.0625rem", fontWeight: 700, color: "#333333" }}>
          Delete Credential
        </h2>
        <p style={{ margin: "0 0 1.5rem", fontSize: "0.9rem", color: "#374151", lineHeight: 1.6 }}>
          Are you sure you want to delete <strong>{credentialName}</strong>? This cannot be undone.
        </p>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={onConfirm}
            disabled={deleting}
            style={{
              flex: 1, padding: "0.75rem", borderRadius: "1rem", border: "none",
              background: "#EF4444", color: "#FFFFFF", fontSize: "0.875rem", fontWeight: 500,
              cursor: deleting ? "not-allowed" : "pointer", fontFamily: "inherit",
              opacity: deleting ? 0.7 : 1,
            }}
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
          <button
            onClick={onCancel}
            disabled={deleting}
            style={{
              flex: 1, padding: "0.75rem", borderRadius: "1rem",
              border: "1.5px solid #E5E7EB", background: "#FFFFFF",
              color: "#374151", fontSize: "0.875rem", fontWeight: 500,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── AddCredentialModal ───────────────────────────────────────────────────────

function AddCredentialModal({ section, cardholderId, companyId, userInitials, userRole, token, onSave, onClose }) {
  const [qualOptions, setQualOptions] = useState([])
  const [providerOptions, setProviderOptions] = useState([])
  const [loadingOptions, setLoadingOptions] = useState(true)

  const [qualId, setQualId] = useState("")
  const [providerId, setProviderId] = useState("")
  const [issueDate, setIssueDate] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [confirmed, setConfirmed] = useState(false)
  const [initials, setInitials] = useState(userInitials ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    async function fetchOptions() {
      setLoadingOptions(true)
      const params = new URLSearchParams({ type: section.key })
      if (companyId) params.set("company_id", companyId)

      const [qualsRes, providersRes, credentialsRes] = await Promise.all([
        fetch(`/api/superadmin/qualifications?${params}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/superadmin/training-providers`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/superadmin/cardholders/${cardholderId}?include=credentials`, { headers: { Authorization: `Bearer ${token}` } }),
      ])
      const [qualsJson, providersJson, credentialsJson] = await Promise.all([qualsRes.json(), providersRes.json(), credentialsRes.json()])

      const existingQualIds = new Set((credentialsJson.credentials ?? []).map((c) => c.qual_comp_id))
      const filteredQuals = (qualsJson.qualifications ?? []).filter((q) => !existingQualIds.has(q.id))

      setQualOptions(filteredQuals.map((q) => ({ value: q.id, label: q.name })))
      setProviderOptions((providersJson.providers ?? []).map((p) => ({ value: p.id, label: p.provider_name })))
      setLoadingOptions(false)
    }
    fetchOptions()
  }, [section.key, companyId, token, cardholderId])

  async function handleSave() {
    setError("")
    const isQcAdmin = userRole === "qc_admin"
    if (!qualId) { setError("Please select a credential name."); return }
    if (!providerId) { setError("Please select a training provider."); return }
    if (!issueDate) { setError("Issue date is required."); return }
    if (!isQcAdmin && !confirmed) { setError("Please confirm the credential has been sighted and verified."); return }
    if (!isQcAdmin && !initials.trim()) { setError("Confirmation initials are required."); return }

    setSaving(true)
    const res = await fetch(`/api/superadmin/cardholders/${cardholderId}/credentials`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        qual_comp_id: qualId,
        training_provider_id: providerId,
        issue_date: issueDate,
        expiry_date: expiryDate || null,
        confirmation_checked: true,
        confirmation_initials: isQcAdmin ? "QCA" : initials.trim().toUpperCase(),
        confirmation_date: new Date().toISOString(),
      }),
    })
    const json = await res.json()
    setSaving(false)

    if (!res.ok) { setError(json.error ?? "Failed to save credential."); return }
    onSave(json.credential)
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(44,62,80,0.45)",
        zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#FFFFFF", borderRadius: "1rem", padding: "2rem",
          width: "100%", maxWidth: "520px",
          boxShadow: "0 8px 32px rgba(44,62,80,0.18)",
          maxHeight: "90vh", overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.0625rem", fontWeight: 700, color: "#333333" }}>
            Add {section.label}
          </h2>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", padding: "0.25rem", display: "flex" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#374151")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#9CA3AF")}
          >
            <X size={18} />
          </button>
        </div>

        {loadingOptions ? (
          <p style={{ color: "#374151", fontSize: "0.875rem", textAlign: "center", padding: "1rem 0" }}>Loading options...</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.125rem" }}>
            {/* Credential name */}
            <div>
              <label style={fieldLabelStyle}>Credential Name <span style={{ color: "#EF4444" }}>*</span></label>
              <SearchableDropdown
                options={qualOptions}
                value={qualId}
                onChange={setQualId}
                placeholder="Select credential..."
              />
            </div>

            {/* Training provider */}
            <div>
              <label style={fieldLabelStyle}>Training Provider <span style={{ color: "#EF4444" }}>*</span></label>
              <SearchableDropdown
                options={providerOptions}
                value={providerId}
                onChange={setProviderId}
                placeholder="Select provider..."
              />
            </div>

            {/* Issue date */}
            <div>
              <label style={fieldLabelStyle}>Issue Date <span style={{ color: "#EF4444" }}>*</span></label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "#2f6f6a")}
                onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
              />
            </div>

            {/* Expiry date */}
            <div>
              <label style={fieldLabelStyle}>Expiry Date (leave blank if no expiry)</label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "#2f6f6a")}
                onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
              />
            </div>

            {/* Confirmation checkbox -- hidden for qc_admin */}
            {userRole !== "qc_admin" && (
              <label style={{ display: "flex", alignItems: "flex-start", gap: "0.625rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  style={{ marginTop: "0.15rem", flexShrink: 0, accentColor: "#2f6f6a", width: "15px", height: "15px" }}
                />
                <span style={{ fontSize: "0.875rem", color: "#374151", lineHeight: 1.5 }}>
                  I confirm this credential has been sighted and verified
                </span>
              </label>
            )}

            {/* Confirmation initials -- hidden for qc_admin */}
            {userRole !== "qc_admin" && (
              <div>
                <label style={fieldLabelStyle}>Confirmation Initials <span style={{ color: "#EF4444" }}>*</span></label>
                <input
                  type="text"
                  value={initials}
                  onChange={(e) => setInitials(e.target.value.toUpperCase().slice(0, 4))}
                  placeholder="e.g. JB"
                  maxLength={4}
                  style={{ ...inputStyle, width: "100px" }}
                  onFocus={(e) => (e.target.style.borderColor = "#2f6f6a")}
                  onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
                />
              </div>
            )}

            {error && (
              <p style={{ margin: 0, fontSize: "0.8125rem", color: "#EF4444" }}>{error}</p>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.25rem" }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  flex: 1, padding: "0.75rem", borderRadius: "1rem", border: "none",
                  background: "#2f6f6a", color: "#FFFFFF", fontSize: "0.875rem", fontWeight: 500,
                  cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit",
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? "Saving..." : "Save Credential"}
              </button>
              <button
                onClick={onClose}
                disabled={saving}
                style={{
                  flex: 1, padding: "0.75rem", borderRadius: "1rem",
                  border: "1.5px solid #E5E7EB", background: "#FFFFFF",
                  color: "#374151", fontSize: "0.875rem", fontWeight: 500,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── CredentialRow ────────────────────────────────────────────────────────────

function CredentialRow({ cred, onDelete, onMoveUp, onMoveDown, isFirst, isLast, sectionColor }) {
  const qc = cred.qualifications_competencies ?? {}
  const name = qc.name ?? "Unknown"
  const code = getCredentialCode(cred)
  const badge = getCredentialBadge(cred.expiry_date)

  const arrowBtn = (disabled, title, onClick, Icon) => (
    <button
      onClick={disabled ? undefined : onClick}
      title={title}
      disabled={disabled}
      style={{
        background: "none", border: "none", padding: "0.1rem",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: disabled ? "default" : "pointer",
        color: disabled ? "#D1D5DB" : "#9CA3AF",
        transition: "color 0.15s ease",
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.color = "#374151" }}
      onMouseLeave={(e) => { if (!disabled) e.currentTarget.style.color = "#9CA3AF" }}
    >
      <Icon size={14} strokeWidth={2.5} />
    </button>
  )

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "0.75rem",
      padding: "1rem 1.25rem 1rem 0.75rem",
      background: "#FFFFFF",
      borderRadius: "0.75rem",
      border: "1px solid #E5E7EB",
      borderLeft: `4px solid ${sectionColor}`,
      boxShadow: "0 4px 16px rgba(44, 62, 80, 0.12), 0 1px 4px rgba(44, 62, 80, 0.08)",
    }}>
      {/* Reorder arrows */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0", flexShrink: 0 }}>
        {arrowBtn(isFirst, "Move up", onMoveUp, ChevronUp)}
        {arrowBtn(isLast, "Move down", onMoveDown, ChevronDown)}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: "0.9375rem", fontWeight: 600, color: "#333333", lineHeight: 1.4 }}>
          {name}
        </p>
        {code && (
          <p style={{ margin: "0.15rem 0 0", fontSize: "0.8125rem", color: "#6B7280" }}>{code}</p>
        )}
        {cred.issue_date && (
          <p style={{ margin: "0.15rem 0 0", fontSize: "0.8125rem", color: "#6B7280" }}>
            Issue date: {formatDate(cred.issue_date)}
          </p>
        )}
        {cred.expiry_date && (
          <p style={{ margin: "0.15rem 0 0", fontSize: "0.8125rem", color: "#9CA3AF" }}>
            Expires {formatDate(cred.expiry_date)}
          </p>
        )}
      </div>

      {/* Right actions */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
        <span style={{
          display: "inline-block",
          padding: "0.2rem 0.625rem",
          borderRadius: "1rem",
          fontSize: "0.75rem",
          fontWeight: 600,
          color: "#FFFFFF",
          backgroundColor: badge.color,
          whiteSpace: "nowrap",
        }}>
          {badge.label}
        </span>

        <button
          onClick={() => {}}
          title="Edit credential"
          style={{
            background: "none", border: "none", cursor: "pointer", padding: "0.25rem",
            color: "#9CA3AF", display: "flex", transition: "color 0.15s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#374151")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#9CA3AF")}
        >
          <Pencil size={15} strokeWidth={2} />
        </button>

        <button
          onClick={onDelete}
          title="Delete credential"
          style={{
            background: "none", border: "none", cursor: "pointer", padding: "0.25rem",
            color: "#9CA3AF", display: "flex", transition: "color 0.15s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#EF4444")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#9CA3AF")}
        >
          <Trash2 size={15} strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}

// ─── Sort helpers ──────────────────────────────────────────────────────────────

const SECTION_SORT = {
  qualification:  (a, b) => new Date(b.issue_date ?? 0) - new Date(a.issue_date ?? 0),
  competency:     (a, b) => (a.qualifications_competencies?.name ?? "").localeCompare(b.qualifications_competencies?.name ?? ""),
  site_induction: (a, b) => (a.qualifications_competencies?.name ?? "").localeCompare(b.qualifications_competencies?.name ?? ""),
  permit:         (a, b) => (a.qualifications_competencies?.name ?? "").localeCompare(b.qualifications_competencies?.name ?? ""),
}

function sortCredentials(creds, sectionKey) {
  const manual = creds.filter((c) => c.is_manually_ordered).sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
  const auto = creds.filter((c) => !c.is_manually_ordered).sort(SECTION_SORT[sectionKey] ?? (() => 0))
  return [...manual, ...auto]
}

// ─── CredentialSection ────────────────────────────────────────────────────────

function CredentialSection({ section, credentials, searchQuery, onAdd, onDelete, onReorder, onResetOrder, token, cardholderId }) {
  const [expanded, setExpanded] = useState(false)

  const sorted = sortCredentials(credentials, section.key)
  const filtered = sorted.filter((c) =>
    (c.qualifications_competencies?.name ?? "").toLowerCase().includes(searchQuery.toLowerCase())
  )
  const hasManual = credentials.some((c) => c.is_manually_ordered)
  const DEFAULT_VISIBLE = 3
  const showToggle = filtered.length > DEFAULT_VISIBLE
  const visible = expanded ? filtered : filtered.slice(0, DEFAULT_VISIBLE)

  return (
    <div>
      {/* Section header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "0.875rem",
        marginBottom: filtered.length > 0 ? "0.25rem" : "0",
        paddingBottom: "0.75rem",
        borderBottom: "1px solid #F3F4F6",
      }}>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: "0.625rem",
          backgroundColor: `${section.color}18`,
          border: `1.5px solid ${section.color}40`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}>
          <section.Icon size={18} color={section.color} strokeWidth={2} />
        </div>

        <span style={{
          flex: 1,
          fontSize: "0.75rem",
          fontWeight: 700,
          color: "#374151",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}>
          {section.label}
          <span style={{ fontWeight: 400, color: "#9CA3AF", marginLeft: "0.375rem" }}>
            ({credentials.length})
          </span>
        </span>

        {hasManual && (
          <button
            onClick={() => onResetOrder(section.key)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: "0.75rem", fontWeight: 500, color: "#6B7280",
              fontFamily: "inherit", padding: "0.25rem 0.25rem",
              textDecoration: "none", transition: "color 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#374151"
              e.currentTarget.style.textDecoration = "underline"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#6B7280"
              e.currentTarget.style.textDecoration = "none"
            }}
          >
            Reset order
          </button>
        )}

        <button
          onClick={onAdd}
          style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: "0.8125rem", fontWeight: 600, color: "#6B7280",
            fontFamily: "inherit", padding: "0.25rem 0.5rem",
            transition: "color 0.15s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = section.color)}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#6B7280")}
          onMouseDown={(e) => (e.currentTarget.style.color = section.color)}
        >
          + Add
        </button>
      </div>

      {/* Rows */}
      {filtered.length === 0 ? (
        <div style={{
          background: "#FFFFFF",
          borderRadius: "0.75rem",
          border: "1px solid #E5E7EB",
          boxShadow: "0 4px 16px rgba(44, 62, 80, 0.12), 0 1px 4px rgba(44, 62, 80, 0.08)",
          padding: "1.5rem",
          minHeight: "80px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <p style={{ margin: 0, fontSize: "0.9rem", color: "#6B7280" }}>
            {searchQuery
              ? `No ${section.label.toLowerCase()} match your search`
              : `No ${section.label.toLowerCase()} added yet`}
          </p>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {visible.map((cred, i) => (
              <CredentialRow
                key={cred.id}
                cred={cred}
                onDelete={() => onDelete(cred)}
                onMoveUp={() => onReorder(cred, filtered[i - 1], filtered, i, i - 1)}
                onMoveDown={() => onReorder(cred, filtered[i + 1], filtered, i, i + 1)}
                isFirst={i === 0}
                isLast={i === visible.length - 1}
                sectionColor={section.color}
              />
            ))}
          </div>

          {showToggle && (
            <div style={{ textAlign: "center", marginTop: "0.75rem" }}>
              <button
                onClick={() => setExpanded((v) => !v)}
                style={{
                  padding: "0.4rem 1.2rem",
                  borderRadius: "1rem",
                  border: "1.5px solid #2f6f6a",
                  background: "none",
                  color: "#2f6f6a",
                  fontSize: "0.8125rem",
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "background 0.15s ease, color 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#2f6f6a"
                  e.currentTarget.style.color = "#FFFFFF"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "none"
                  e.currentTarget.style.color = "#2f6f6a"
                }}
              >
                {expanded ? "Show less" : `Show all (${filtered.length})`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Shared modal primitives ──────────────────────────────────────────────────

function ModalOverlay({ onClose, children, maxWidth = "440px" }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(44,62,80,0.45)",
        zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#FFFFFF", borderRadius: "1rem", padding: "2rem",
          width: "100%", maxWidth,
          boxShadow: "0 8px 32px rgba(44,62,80,0.18)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

function ModalHeader({ title, onClose }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
      <h2 style={{ margin: 0, fontSize: "1.0625rem", fontWeight: 700, color: "#333333" }}>{title}</h2>
      <button
        onClick={onClose}
        style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", padding: "0.25rem", display: "flex" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#374151")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "#9CA3AF")}
      >
        <X size={18} />
      </button>
    </div>
  )
}

function ModalActions({ confirmLabel, confirmColor = "#2f6f6a", onConfirm, onCancel, loading, destructive }) {
  return (
    <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
      <button
        onClick={onConfirm}
        disabled={loading}
        style={{
          flex: 1, padding: "0.75rem", borderRadius: "1rem", border: "none",
          background: destructive ? "#EF4444" : confirmColor,
          color: "#FFFFFF", fontSize: "0.875rem", fontWeight: 500,
          cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit",
          opacity: loading ? 0.7 : 1,
          transition: "opacity 0.15s ease",
        }}
        onMouseEnter={(e) => { if (!loading) e.currentTarget.style.opacity = "0.88" }}
        onMouseLeave={(e) => { if (!loading) e.currentTarget.style.opacity = "1" }}
      >
        {loading ? "Saving..." : confirmLabel}
      </button>
      <button
        onClick={onCancel}
        disabled={loading}
        style={{
          flex: 1, padding: "0.75rem", borderRadius: "1rem",
          border: "1.5px solid #E5E7EB", background: "#FFFFFF",
          color: "#374151", fontSize: "0.875rem", fontWeight: 500,
          cursor: "pointer", fontFamily: "inherit",
        }}
      >
        Cancel
      </button>
    </div>
  )
}

// ─── Action modals ────────────────────────────────────────────────────────────

function ChangeNameModal({ currentName, onSave, onClose, loading, error }) {
  const [name, setName] = useState(currentName ?? "")

  return (
    <ModalOverlay onClose={onClose}>
      <ModalHeader title="Change Name" onClose={onClose} />
      <div>
        <label style={fieldLabelStyle}>Full Name <span style={{ color: "#EF4444" }}>*</span></label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
          style={inputStyle}
          onFocus={(e) => (e.target.style.borderColor = "#2f6f6a")}
          onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
        />
        {error && <p style={{ margin: "0.5rem 0 0", fontSize: "0.8125rem", color: "#EF4444" }}>{error}</p>}
      </div>
      <ModalActions
        confirmLabel="Save Name"
        onConfirm={() => onSave(name.trim())}
        onCancel={onClose}
        loading={loading}
      />
    </ModalOverlay>
  )
}

function ChangeStatusModal({ currentStatus, onConfirm, onClose, loading, error }) {
  const isActive = currentStatus === "active"
  const nextLabel = isActive ? "Inactive" : "Active"
  const nextStatus = isActive ? "inactive" : "active"

  return (
    <ModalOverlay onClose={onClose}>
      <ModalHeader title="Change Status" onClose={onClose} />
      <p style={{ margin: "0 0 0.25rem", fontSize: "0.9375rem", color: "#374151", lineHeight: 1.6 }}>
        This cardholder is currently <strong>{getStatusLabel(currentStatus)}</strong>.
      </p>
      <p style={{ margin: 0, fontSize: "0.9375rem", color: "#374151", lineHeight: 1.6 }}>
        Set their status to <strong>{nextLabel}</strong>?
      </p>
      {error && <p style={{ margin: "0.75rem 0 0", fontSize: "0.8125rem", color: "#EF4444" }}>{error}</p>}
      <ModalActions
        confirmLabel={`Set to ${nextLabel}`}
        onConfirm={() => onConfirm(nextStatus)}
        onCancel={onClose}
        loading={loading}
      />
    </ModalOverlay>
  )
}

function ArchiveModal({ onConfirm, onClose, loading, error }) {
  return (
    <ModalOverlay onClose={onClose}>
      <ModalHeader title="Archive Cardholder" onClose={onClose} />
      <p style={{ margin: 0, fontSize: "0.9375rem", color: "#374151", lineHeight: 1.6 }}>
        This will set the cardholder status to <strong>Inactive</strong>. Their card will no longer be publicly visible.
      </p>
      {error && <p style={{ margin: "0.75rem 0 0", fontSize: "0.8125rem", color: "#EF4444" }}>{error}</p>}
      <ModalActions
        confirmLabel="Archive Cardholder"
        onConfirm={onConfirm}
        onCancel={onClose}
        loading={loading}
      />
    </ModalOverlay>
  )
}

function ChangePhotoModal({ onSave, onClose, loading, error }) {
  const [file, setFile] = useState(null)

  return (
    <ModalOverlay onClose={onClose} maxWidth="480px">
      <ModalHeader title="Change Photo" onClose={onClose} />
      <FileUploadArea file={file} onFile={setFile} />
      {error && <p style={{ margin: "0.75rem 0 0", fontSize: "0.8125rem", color: "#EF4444" }}>{error}</p>}
      <ModalActions
        confirmLabel="Upload Photo"
        onConfirm={() => onSave(file)}
        onCancel={onClose}
        loading={loading}
      />
    </ModalOverlay>
  )
}

function ComingSoonModal({ title, onClose }) {
  return (
    <ModalOverlay onClose={onClose}>
      <ModalHeader title={title} onClose={onClose} />
      <p style={{ margin: "0 0 1.5rem", fontSize: "0.9375rem", color: "#374151", lineHeight: 1.6 }}>
        Coming Soon
      </p>
      <button
        onClick={onClose}
        style={{
          width: "100%", padding: "0.75rem", borderRadius: "1rem",
          border: "1.5px solid #E5E7EB", background: "#FFFFFF",
          color: "#374151", fontSize: "0.875rem", fontWeight: 500,
          cursor: "pointer", fontFamily: "inherit",
        }}
      >
        Close
      </button>
    </ModalOverlay>
  )
}

function DeleteCardholderModal({ name, onConfirm, onClose, loading, error }) {
  return (
    <ModalOverlay onClose={onClose}>
      <ModalHeader title="Delete Cardholder" onClose={onClose} />
      <p style={{ margin: "0 0 0.5rem", fontSize: "0.9375rem", color: "#374151", lineHeight: 1.6 }}>
        You are about to permanently delete <strong>{name}</strong> and all of their data.
      </p>
      <p style={{ margin: 0, fontSize: "0.875rem", color: "#EF4444", fontWeight: 500, lineHeight: 1.5 }}>
        This action cannot be undone.
      </p>
      {error && <p style={{ margin: "0.75rem 0 0", fontSize: "0.8125rem", color: "#EF4444" }}>{error}</p>}
      <ModalActions
        confirmLabel="Delete Cardholder"
        onConfirm={onConfirm}
        onCancel={onClose}
        loading={loading}
        destructive
      />
    </ModalOverlay>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CardholderDetailPage() {
  const { id } = useParams()
  const router = useRouter()

  const [cardholder, setCardholder] = useState(null)
  const [company, setCompany] = useState(null)
  const [credentials, setCredentials] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [token, setToken] = useState(null)
  const [user, setUser] = useState(null)
  const [userInitials, setUserInitials] = useState("")
  const [userRole, setUserRole] = useState(null)

  // credential UI state
  const [searchQuery, setSearchQuery] = useState("")
  const [addSection, setAddSection] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // action panel state
  const [actionModal, setActionModal] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState("")

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError("Not authenticated.")
        setLoading(false)
        return
      }

      setToken(session.access_token)

      const { data: userData } = await supabase
        .from("users")
        .select("full_name, email, role")
        .eq("id", session.user.id)
        .single()
      if (userData) {
        setUser(userData)
        if (userData.full_name) setUserInitials(getInitials(userData.full_name))
        if (userData.role) setUserRole(userData.role)
      }

      const res = await fetch(`/api/superadmin/cardholders/${id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? "Failed to load cardholder.")
        setLoading(false)
        return
      }

      console.log("Cardholder data:", json.cardholder)
      setCardholder(json.cardholder)
      setCompany(json.company)
      setCredentials(json.credentials ?? [])
      setLoading(false)
    }

    load()
  }, [id])

  // ── Credential handlers ──────────────────────────────────────────────────

  async function handleDeleteCredential(cred) {
    setDeleting(true)
    const res = await fetch(`/api/superadmin/cardholders/${id}/credentials/${cred.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
    setDeleting(false)

    if (res.ok) {
      setCredentials((prev) => prev.filter((c) => c.id !== cred.id))
      setDeleteTarget(null)
    }
  }

  function handleCredentialAdded(newCred) {
    setCredentials((prev) => [newCred, ...prev])
    setAddSection(null)
  }

  async function handleResetOrder(sectionKey) {
    const toReset = credentials.filter(
      (c) => c.qualifications_competencies?.type === sectionKey && c.is_manually_ordered
    )
    if (toReset.length === 0) return

    const results = await Promise.all(
      toReset.map((c) =>
        fetch(`/api/superadmin/cardholders/${id}/credentials/${c.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ is_manually_ordered: false, display_order: 0 }),
        }).then((r) => (r.ok ? r.json().then((j) => j.credential) : null))
      )
    )

    const updated = results.filter(Boolean)
    if (updated.length > 0) {
      setCredentials((prev) =>
        prev.map((c) => {
          const u = updated.find((u) => u.id === c.id)
          return u ?? c
        })
      )
    }
  }

  async function handleReorder(cred, swapCred, sectionSorted, fromIdx, toIdx) {
    if (!swapCred) return

    // Assign display_order values based on current sorted positions
    // Give every card in the section a stable display_order, then swap the two
    const newOrder = sectionSorted.map((c, i) => ({ id: c.id, display_order: i }))
    const a = newOrder[fromIdx]
    const b = newOrder[toIdx]
    // swap
    const tmpOrder = a.display_order
    a.display_order = b.display_order
    b.display_order = tmpOrder

    const patch = async (credId, display_order) => {
      const res = await fetch(`/api/superadmin/cardholders/${id}/credentials/${credId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_manually_ordered: true, display_order }),
      })
      return res.ok ? (await res.json()).credential : null
    }

    const [updatedA, updatedB] = await Promise.all([
      patch(cred.id, a.display_order),
      patch(swapCred.id, b.display_order),
    ])

    if (updatedA && updatedB) {
      setCredentials((prev) =>
        prev.map((c) => {
          if (c.id === updatedA.id) return updatedA
          if (c.id === updatedB.id) return updatedB
          return c
        })
      )
    }
  }

  // ── Action handlers ──────────────────────────────────────────────────────

  function openAction(key) {
    setActionError("")
    setActionModal(key)
  }

  async function patchCardholder(updates) {
    setActionLoading(true)
    setActionError("")
    const res = await fetch(`/api/superadmin/cardholders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(updates),
    })
    const json = await res.json()
    setActionLoading(false)
    if (!res.ok) { setActionError(json.error ?? "Failed to update."); return false }
    setCardholder((prev) => ({ ...prev, ...json.cardholder }))
    return true
  }

  async function handleChangeName(newName) {
    if (!newName) { setActionError("Name is required."); return }
    const ok = await patchCardholder({ full_name: newName })
    if (ok) setActionModal(null)
  }

  async function handleChangeStatus(newStatus) {
    const ok = await patchCardholder({ status: newStatus })
    if (ok) setActionModal(null)
  }

  async function handleArchive() {
    const ok = await patchCardholder({ status: "archived" })
    if (ok) setActionModal(null)
  }

  async function handleRestore() {
    const ok = await patchCardholder({ status: "active" })
    if (ok) setActionModal(null)
  }

  async function handleChangePhoto(file) {
    if (!file) { setActionError("Please select a photo."); return }
    setActionLoading(true)
    setActionError("")

    const path = `${company?.id ?? "unassigned"}/${Date.now()}-${file.name}`
    const { error: uploadError } = await supabase.storage
      .from("cardholder-photos")
      .upload(path, file, { upsert: false })

    if (uploadError) {
      setActionError(uploadError.message)
      setActionLoading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from("cardholder-photos")
      .getPublicUrl(path)

    setActionLoading(false)
    const ok = await patchCardholder({ photo_url: publicUrl })
    if (ok) setActionModal(null)
  }

  async function handleDeleteCardholder() {
    setActionLoading(true)
    setActionError("")
    const res = await fetch(`/api/superadmin/cardholders/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
    setActionLoading(false)
    if (res.ok) {
      router.push("/superadmin?tab=cardholders")
    } else {
      const json = await res.json()
      setActionError(json.error ?? "Failed to delete cardholder.")
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) return <LoadingScreen />
  if (error) return <ErrorScreen message={error} />

  const profileUrl = `${APP_URL}/card/${cardholder.slug}`
  const licenceBadge = getLicenceBadge(cardholder.licence_end_date)
  const visibleActions = userRole === "qc_admin" ? QC_ACTIONS : COMPANY_ACTIONS

  return (
    <div style={{
      minHeight: "100vh",
      background: "#D9DEE5",
      fontFamily: "Inter, system-ui, sans-serif",
    }}>
      <Header user={user} />
      <div style={{
        maxWidth: "1280px",
        margin: "0 auto",
        padding: "2rem 1.5rem 4rem",
      }}>

        {/* ── Section 1: Back button ───────────────────────────────────── */}
        <Link
          href="/superadmin?tab=cardholders"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.375rem",
            color: "#374151",
            fontSize: "0.875rem",
            fontWeight: 500,
            textDecoration: "none",
            marginBottom: "1.25rem",
            opacity: 0.8,
            transition: "opacity 0.15s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.8")}
        >
          <ArrowLeft size={15} strokeWidth={2.5} />
          Back to Cardholders
        </Link>

        {/* ── Section 2: Header card ───────────────────────────────────── */}
        <div style={{
          background: GRADIENT,
          borderRadius: "1rem",
          padding: "2rem",
          marginBottom: "1.5rem",
          display: "flex",
          alignItems: "center",
          gap: "1.75rem",
          boxShadow: "0 4px 20px rgba(44, 62, 80, 0.2), 0 1px 4px rgba(44, 62, 80, 0.12)",
        }}>
          <PhotoCircle photoUrl={cardholder.photo_url} name={cardholder.full_name} size={120} borderColor={getPhotoBorderColor(cardholder.status)} />

          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{
              margin: "0 0 0.25rem",
              fontSize: "clamp(1.25rem, 2.5vw, 1.75rem)",
              fontWeight: 800,
              color: "#FFFFFF",
              textTransform: "uppercase",
              letterSpacing: "0.03em",
              lineHeight: 1.15,
            }}>
              {cardholder.full_name}
            </h1>

            {company && (
              <p style={{ margin: "0 0 0.625rem", fontSize: "1.0625rem", color: "rgba(255,255,255,0.7)", fontWeight: 400 }}>
                {company.company_name}
              </p>
            )}

            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", marginBottom: "0.875rem" }}>
              <a
                href={profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex", alignItems: "center", gap: "0.3rem",
                  fontSize: "0.8125rem", color: "#93C5FD",
                  textDecoration: "none", transition: "color 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
              >
                Click here for Profile URL
                <ExternalLink size={12} strokeWidth={2} />
              </a>
              <CopyButton textToCopy={profileUrl} />
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {(() => {
                const badgeStyle = getStatusBadgeColor(cardholder.status)
                return (
                  <span style={{
                    display: "inline-block", padding: "0.25rem 0.75rem", borderRadius: "1rem",
                    fontSize: "0.75rem", fontWeight: 600, color: badgeStyle.text,
                    backgroundColor: badgeStyle.bg,
                    border: `1.5px solid ${badgeStyle.border}`, whiteSpace: "nowrap",
                  }}>
                    {getStatusLabel(cardholder.status)}
                  </span>
                )
              })()}
              {cardholder.licence_end_date && (
                <span style={{
                  display: "inline-block", padding: "0.25rem 0.75rem", borderRadius: "1rem",
                  fontSize: "0.75rem", fontWeight: 600, color: "#FFFFFF",
                  backgroundColor: "transparent",
                  border: "1.5px solid rgba(255,255,255,0.8)", whiteSpace: "nowrap",
                }}>
                  EXPIRES: {new Date(cardholder.licence_end_date).toLocaleDateString("en-NZ", { day: "2-digit", month: "2-digit", year: "numeric" })}
                </span>
              )}
              {licenceBadge && (
                <span style={{
                  display: "inline-block", padding: "0.25rem 0.75rem", borderRadius: "1rem",
                  fontSize: "0.75rem", fontWeight: 600, color: "#FFFFFF",
                  backgroundColor: licenceBadge.color,
                  border: "1.5px solid rgba(255,255,255,0.6)", whiteSpace: "nowrap",
                }}>
                  {licenceBadge.label}
                </span>
              )}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
            <div style={{ background: "#FFFFFF", borderRadius: "0.5rem", padding: "0.5rem", display: "inline-flex" }}>
              <QRCodeSVG value={profileUrl} size={80} />
            </div>
            <button
              onClick={() => {}}
              style={{
                padding: "0.5rem 1.25rem", borderRadius: "1rem", border: "none",
                background: "#F97316", color: "#FFFFFF", fontSize: "0.8125rem", fontWeight: 500,
                cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                transition: "opacity 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              Renew Now
            </button>
          </div>
        </div>

        {/* ── Section 3: Credentials ───────────────────────────────────── */}
        <div style={{
          backgroundColor: "#FFFFFF",
          borderRadius: "1rem",
          padding: "1.75rem",
          marginBottom: "1.5rem",
          boxShadow: "0 2px 12px rgba(44,62,80,0.07), 0 1px 3px rgba(44,62,80,0.05)",
        }}>
          {/* Search */}
          <div style={{ position: "relative", marginBottom: "1.75rem" }}>
            <Search
              size={15}
              color="#9CA3AF"
              style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search credentials..."
              style={{
                ...inputStyle,
                paddingLeft: "2.5rem",
                fontSize: "0.9375rem",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#2f6f6a")}
              onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute", right: "0.875rem", top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", padding: 0,
                  color: "#9CA3AF", display: "flex",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#374151")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#9CA3AF")}
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Four sections */}
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            {SECTIONS.map((section) => {
              const sectionCreds = credentials.filter(
                (c) => c.qualifications_competencies?.type === section.key
              )
              return (
                <CredentialSection
                  key={section.key}
                  section={section}
                  credentials={sectionCreds}
                  searchQuery={searchQuery}
                  onAdd={() => setAddSection(section)}
                  onDelete={(cred) => setDeleteTarget(cred)}
                  onReorder={handleReorder}
                  onResetOrder={handleResetOrder}
                />
              )
            })}
          </div>
        </div>

        {/* ── Section 4: Cardholder actions ───────────────────────────── */}
        <div style={{
          backgroundColor: "#FFFFFF",
          borderRadius: "1rem",
          padding: "1.75rem",
          boxShadow: "0 2px 12px rgba(44,62,80,0.07), 0 1px 3px rgba(44,62,80,0.05)",
        }}>
          {/* Section heading */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.875rem", marginBottom: "1.5rem" }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: "0.625rem",
              background: "#2f6f6a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}>
              <Users size={18} color="#FFFFFF" strokeWidth={2} />
            </div>
            <span style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              color: "#374151",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}>
              Cardholder Actions
            </span>
          </div>

          {/* Action grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "0.75rem",
          }}>
            {visibleActions.map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => openAction(key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  padding: "0.6875rem 1rem",
                  borderRadius: "1rem",
                  border: key === "delete-cardholder"
                    ? "1.5px solid rgba(239,68,68,0.35)"
                    : "1.5px solid #E5E7EB",
                  background: "#FFFFFF",
                  color: key === "delete-cardholder" ? "#EF4444" : "#374151",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "border-color 0.15s ease, color 0.15s ease, background 0.15s ease",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  if (key === "delete-cardholder") {
                    e.currentTarget.style.background = "rgba(239,68,68,0.04)"
                    e.currentTarget.style.borderColor = "#EF4444"
                  } else {
                    e.currentTarget.style.background = "#F9FAFB"
                    e.currentTarget.style.borderColor = "#2f6f6a"
                    e.currentTarget.style.color = "#2f6f6a"
                  }
                }}
                onMouseLeave={(e) => {
                  if (key === "delete-cardholder") {
                    e.currentTarget.style.background = "#FFFFFF"
                    e.currentTarget.style.borderColor = "rgba(239,68,68,0.35)"
                  } else {
                    e.currentTarget.style.background = "#FFFFFF"
                    e.currentTarget.style.borderColor = "#E5E7EB"
                    e.currentTarget.style.color = "#374151"
                  }
                }}
              >
                <Icon size={15} strokeWidth={2} />
                {label}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* ── Credential modals ──────────────────────────────────────────── */}

      {addSection && (
        <AddCredentialModal
          section={addSection}
          cardholderId={id}
          companyId={company?.id ?? null}
          userInitials={userInitials}
          userRole={userRole}
          token={token}
          onSave={handleCredentialAdded}
          onClose={() => setAddSection(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          credentialName={deleteTarget.qualifications_competencies?.name ?? "this credential"}
          onConfirm={() => handleDeleteCredential(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
          deleting={deleting}
        />
      )}

      {/* ── Action modals ──────────────────────────────────────────────── */}

      {actionModal === "change-name" && (
        <ChangeNameModal
          currentName={cardholder.full_name}
          onSave={handleChangeName}
          onClose={() => setActionModal(null)}
          loading={actionLoading}
          error={actionError}
        />
      )}

      {actionModal === "reassign-company" && (
        <ComingSoonModal
          title="Reassign Company"
          onClose={() => setActionModal(null)}
        />
      )}

      {actionModal === "change-status" && (
        <ChangeStatusModal
          currentStatus={cardholder.status}
          onConfirm={handleChangeStatus}
          onClose={() => setActionModal(null)}
          loading={actionLoading}
          error={actionError}
        />
      )}

      {actionModal === "change-photo" && (
        <ChangePhotoModal
          onSave={handleChangePhoto}
          onClose={() => setActionModal(null)}
          loading={actionLoading}
          error={actionError}
        />
      )}

      {actionModal === "archive" && (
        <ArchiveModal
          onConfirm={handleArchive}
          onClose={() => setActionModal(null)}
          loading={actionLoading}
          error={actionError}
        />
      )}

      {actionModal === "delete-cardholder" && (
        <DeleteCardholderModal
          name={cardholder.full_name}
          onConfirm={handleDeleteCardholder}
          onClose={() => setActionModal(null)}
          loading={actionLoading}
          error={actionError}
        />
      )}
    </div>
  )
}
