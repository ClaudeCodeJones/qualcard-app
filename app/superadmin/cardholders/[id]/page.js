"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { QRCodeSVG } from "qrcode.react"
import { supabase } from "@/lib/supabase"
import { getLicenceStatus } from "@/lib/licenceStatus"
import Header from "@/app/components/Header"
import FileUploadArea from "@/app/components/FileUploadArea"
import StatusBadge from "@/app/components/StatusBadge"
import {
  ArrowLeft, ExternalLink, Copy, Check,
  GraduationCap, Award, ClipboardCheck, ShieldCheck,
  Pencil, Trash2, Search, X, ChevronDown, ChevronUp,
  Camera, RefreshCw, Archive, RotateCcw, Building2, Users,
} from "lucide-react"

// ─── Constants ────────────────────────────────────────────────────────────────

const GRADIENT = "linear-gradient(to bottom, #214f4b, #2a5f5b, #35736f)"
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
  { key: "restore",             label: "Restore Cardholder",   Icon: RotateCcw },
  { key: "delete-cardholder",   label: "Delete Cardholder",    Icon: Trash2    },
]

const COMPANY_ACTIONS = [
  { key: "change-photo",        label: "Change Photo",         Icon: Camera    },
  { key: "archive",             label: "Archive Cardholder",   Icon: Archive   },
  { key: "restore",             label: "Restore Cardholder",   Icon: RotateCcw },
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

function getPhotoBorderColor(status) {
  const map = {
    active:             "#FFFFFF",
    archived:           "#9CA3AF",
    pending_activation: "#F97316",
  }
  return map[status] ?? "#EF4444"
}

function getCredentialBadge(expiryDate) {
  if (!expiryDate) return null
  const now = new Date()
  const end = new Date(expiryDate)
  const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24))
  if (daysLeft < 0) return { label: "Expired", filled: true, color: "#EF4444" }
  if (daysLeft <= 30) return { label: "Expiring", filled: true, color: "#F59E0B" }
  return { label: "Active", filled: false, color: "#16A34A" }
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

// ─── EditCredentialModal ──────────────────────────────────────────────────────

function EditCredentialModal({ cred, token, cardholderId, companyId, userRole, onSave, onClose }) {
  const qc = cred.qualifications_competencies ?? {}
  const credType = qc.type ?? "qualification"

  const TYPE_LABELS = {
    qualification:  "Qualification",
    competency:     "Competency",
    site_induction: "Site Induction",
    permit:         "Permit & Certificate",
  }
  const typeLabel = TYPE_LABELS[credType] ?? credType

  const [providerId, setProviderId] = useState(cred.training_provider_id ?? "")
  const [otherProviderName, setOtherProviderName] = useState("")
  const [issueDate, setIssueDate] = useState(cred.issue_date ?? "")
  const [expiryDate, setExpiryDate] = useState(cred.expiry_date ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [providerOptions, setProviderOptions] = useState([])
  const [loadingProviders, setLoadingProviders] = useState(true)

  const isOtherProvider = providerId === OTHER_PROVIDER

  useEffect(() => {
    async function fetchProviders() {
      const res = await fetch("/api/superadmin/training-providers", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      const filtered = (json.providers ?? []).filter((p) => p.is_global || p.company_id === companyId)
      filtered.sort((a, b) => {
        if (a.provider_name === "MW Training & Planning") return -1
        if (b.provider_name === "MW Training & Planning") return 1
        return a.provider_name.localeCompare(b.provider_name)
      })
      setProviderOptions([
        { value: "", label: "None" },
        ...filtered.map((p) => ({ value: p.id, label: p.provider_name })),
        { value: OTHER_PROVIDER, label: "Other / Not Listed" },
      ])
      setLoadingProviders(false)
    }
    fetchProviders()
  }, [])

  async function handleSave() {
    setError("")
    if (!issueDate) { setError("Issue date is required."); return }
    if (isOtherProvider && !otherProviderName.trim()) { setError("Please enter a provider name."); return }
    setSaving(true)

    const body = { issue_date: issueDate, expiry_date: expiryDate || null }
    if (isOtherProvider) {
      body.custom_provider = {
        provider_name: otherProviderName.trim(),
        is_global: userRole === "qc_admin",
        company_id: userRole === "qc_admin" ? null : (companyId ?? null),
      }
    } else {
      body.training_provider_id = providerId || null
    }

    const res = await fetch(`/api/superadmin/cardholders/${cardholderId}/credentials/${cred.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { setError(json.error ?? "Failed to update credential."); return }
    onSave(json.credential)
  }

  const readOnlyFields = []
  if (credType === "qualification") {
    readOnlyFields.push({ label: "Qualification Name", value: qc.name })
    if (qc.unit_standard_number) readOnlyFields.push({ label: "Unit Standard Number", value: qc.unit_standard_number })
  } else if (credType === "competency") {
    readOnlyFields.push({ label: "Competency Name", value: qc.name })
    if (qc.competency_code) readOnlyFields.push({ label: "Competency Code", value: qc.competency_code })
  } else if (credType === "site_induction") {
    readOnlyFields.push({ label: "Site Induction Name", value: qc.name })
  } else if (credType === "permit") {
    readOnlyFields.push({ label: "Permit Name", value: qc.name })
    if (qc.permit_number) readOnlyFields.push({ label: "Permit Number", value: qc.permit_number })
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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.0625rem", fontWeight: 700, color: "#333333" }}>
            Edit {typeLabel}
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

        <div style={{ display: "flex", flexDirection: "column", gap: "1.125rem" }}>
            {readOnlyFields.map(({ label, value }) => (
              <div key={label}>
                <label style={fieldLabelStyle}>{label}</label>
                <input
                  type="text"
                  value={value ?? ""}
                  readOnly
                  style={{ ...inputStyle, background: "#F9FAFB", color: "#9CA3AF", cursor: "default" }}
                />
              </div>
            ))}

            <div>
              <label style={fieldLabelStyle}>Training Provider</label>
              {loadingProviders ? (
                <div style={{ ...inputStyle, color: "#9CA3AF" }}>Loading providers...</div>
              ) : (
                <SearchableDropdown
                  options={providerOptions}
                  value={providerId}
                  onChange={(v) => { setProviderId(v); if (v !== OTHER_PROVIDER) setOtherProviderName("") }}
                  placeholder="Select provider..."
                />
              )}
              {isOtherProvider && (
                <input
                  type="text"
                  value={otherProviderName}
                  onChange={(e) => setOtherProviderName(e.target.value)}
                  placeholder="Enter provider name..."
                  style={{ ...inputStyle, marginTop: "0.625rem" }}
                  onFocus={(e) => (e.target.style.borderColor = "#2f6f6a")}
                  onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
                />
              )}
            </div>

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

            <div>
              <label style={fieldLabelStyle}>Expiry Date</label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "#2f6f6a")}
                onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
              />
              <p style={{ margin: "0.375rem 0 0", fontSize: "0.75rem", color: "#9CA3AF" }}>
                Clear the date to remove the expiry
              </p>
            </div>

            {error && (
              <p style={{ margin: 0, fontSize: "0.8125rem", color: "#EF4444" }}>{error}</p>
            )}

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
                {saving ? "Saving..." : `Update ${typeLabel}`}
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
      </div>
    </div>
  )
}

// ─── AddCredentialModal ───────────────────────────────────────────────────────

const OTHER_VALUE = "__other__"
const OTHER_PROVIDER = "__other_provider__"

const TYPE_CONFIG = {
  qualification:  { nameLabel: "Qualification Name",  codeLabel: "Unit Standard Number", codeField: "unit_standard_number" },
  competency:     { nameLabel: "Competency Name",      codeLabel: "Competency Code",       codeField: "competency_code" },
  site_induction: { nameLabel: "Site Induction Name",  codeLabel: "Induction Code",        codeField: "induction_code" },
  permit:         { nameLabel: "Permit Name",           codeLabel: "Permit Number",         codeField: "permit_number" },
}

function AddCredentialModal({ section, cardholderId, companyId, userInitials, userRole, token, onSave, onClose }) {
  const [qualOptions, setQualOptions] = useState([])
  const [providerOptions, setProviderOptions] = useState([])
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [qualId, setQualId] = useState("")
  const [otherName, setOtherName] = useState("")
  const [otherCode, setOtherCode] = useState("")
  const [otherProviderName, setOtherProviderName] = useState("")
  const [providerId, setProviderId] = useState("")
  const [issueDate, setIssueDate] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [confirmed, setConfirmed] = useState(false)
  const [initials, setInitials] = useState(userInitials ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const typeConfig = TYPE_CONFIG[section.key] ?? TYPE_CONFIG.qualification
  const isOther = qualId === OTHER_VALUE
  const isOtherProvider = providerId === OTHER_PROVIDER

  useEffect(() => {
    async function fetchOptions() {
      setLoadingOptions(true)
      const params = new URLSearchParams({ type: section.key })
      if (companyId) params.set("company_id", companyId)

      const [qualsRes, credentialsRes, providersRes] = await Promise.all([
        fetch(`/api/superadmin/qualifications?${params}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/superadmin/cardholders/${cardholderId}?include=credentials`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/superadmin/training-providers", { headers: { Authorization: `Bearer ${token}` } }),
      ])
      const [qualsJson, credentialsJson, providersJson] = await Promise.all([
        qualsRes.json(), credentialsRes.json(), providersRes.json(),
      ])

      const existingQualIds = new Set((credentialsJson.credentials ?? []).map((c) => c.qual_comp_id))
      const filteredQuals = (qualsJson.qualifications ?? []).filter((q) => !existingQualIds.has(q.id))

      setQualOptions([
        ...filteredQuals.map((q) => ({ value: q.id, label: q.name })),
        { value: OTHER_VALUE, label: "Other / Not Listed" },
      ])

      const filteredProviders = (providersJson.providers ?? []).filter(
        (p) => p.is_global || p.company_id === companyId
      )
      filteredProviders.sort((a, b) => {
        if (a.provider_name === "MW Training & Planning") return -1
        if (b.provider_name === "MW Training & Planning") return 1
        return a.provider_name.localeCompare(b.provider_name)
      })
      setProviderOptions([
        ...filteredProviders.map((p) => ({ value: p.id, label: p.provider_name })),
        { value: OTHER_PROVIDER, label: "Other / Not Listed" },
      ])

      setLoadingOptions(false)
    }
    fetchOptions()
  }, [section.key, companyId, token, cardholderId])

  async function handleSave() {
    setError("")
    const isQcAdmin = userRole === "qc_admin"

    if (!qualId) { setError("Please select a credential name."); return }
    if (isOther && !otherName.trim()) { setError(`Please enter a ${typeConfig.nameLabel.toLowerCase()}.`); return }
    if (!providerId) { setError("Please select a training provider."); return }
    if (isOtherProvider && !otherProviderName.trim()) { setError("Please enter a provider name."); return }
    if (!issueDate) { setError("Issue date is required."); return }
    if (!isQcAdmin && !confirmed) { setError("Please confirm the credential has been sighted and verified."); return }
    if (!isQcAdmin && !initials.trim()) { setError("Confirmation initials are required."); return }

    setSaving(true)
    const body = {
      issue_date: issueDate,
      expiry_date: expiryDate || null,
      confirmation_checked: true,
      confirmation_initials: isQcAdmin ? "QCA" : initials.trim().toUpperCase(),
      confirmation_date: new Date().toISOString(),
    }

    if (isOtherProvider) {
      body.custom_provider = {
        provider_name: otherProviderName.trim(),
        is_global: isQcAdmin,
        company_id: isQcAdmin ? null : (companyId ?? null),
      }
    } else {
      body.training_provider_id = providerId
    }

    if (isOther) {
      body.custom_credential = {
        name: otherName.trim(),
        type: section.key,
        scope_company_id: isQcAdmin ? null : (companyId ?? null),
        [typeConfig.codeField]: otherCode.trim() || null,
      }
    } else {
      body.qual_comp_id = qualId
    }

    const res = await fetch(`/api/superadmin/cardholders/${cardholderId}/credentials`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
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
                onChange={(v) => { setQualId(v); if (v !== OTHER_VALUE) { setOtherName(""); setOtherCode("") } }}
                placeholder="Select credential..."
              />
            </div>

            {/* "Other / Not Listed" fields */}
            {isOther && (
              <>
                <div>
                  <label style={fieldLabelStyle}>{typeConfig.nameLabel} <span style={{ color: "#EF4444" }}>*</span></label>
                  <input
                    type="text"
                    value={otherName}
                    onChange={(e) => setOtherName(e.target.value)}
                    placeholder={`Enter ${typeConfig.nameLabel.toLowerCase()}...`}
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = "#2f6f6a")}
                    onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
                  />
                </div>
                <div>
                  <label style={fieldLabelStyle}>{typeConfig.codeLabel}</label>
                  <input
                    type="text"
                    value={otherCode}
                    onChange={(e) => setOtherCode(e.target.value)}
                    placeholder={`Enter ${typeConfig.codeLabel.toLowerCase()}...`}
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = "#2f6f6a")}
                    onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
                  />
                </div>
              </>
            )}

            {/* Training provider */}
            <div>
              <label style={fieldLabelStyle}>Training Provider <span style={{ color: "#EF4444" }}>*</span></label>
              <SearchableDropdown
                options={providerOptions}
                value={providerId}
                onChange={(v) => { setProviderId(v); if (v !== OTHER_PROVIDER) setOtherProviderName("") }}
                placeholder="Select provider..."
              />
              {isOtherProvider && (
                <input
                  type="text"
                  value={otherProviderName}
                  onChange={(e) => setOtherProviderName(e.target.value)}
                  placeholder="Enter provider name..."
                  style={{ ...inputStyle, marginTop: "0.625rem" }}
                  onFocus={(e) => (e.target.style.borderColor = "#2f6f6a")}
                  onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
                />
              )}
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
                  I confirm the details entered above are true and correct
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

function CredentialRow({ cred, onEdit, onDelete, onMoveUp, onMoveDown, isFirst, isLast, sectionColor }) {
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
        <p style={{ margin: "0.15rem 0 0", fontSize: "0.8125rem", visibility: code ? "visible" : "hidden", color: "#6B7280" }}>
          {code || "\u00A0"}
        </p>
      </div>

      {/* Right actions */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
        {badge && (
          <span style={{
            display: "inline-block",
            padding: "0.2rem 0.625rem",
            borderRadius: "1rem",
            fontSize: "0.75rem",
            fontWeight: 600,
            color: badge.filled ? "#FFFFFF" : badge.color,
            backgroundColor: badge.filled ? badge.color : "transparent",
            border: badge.filled ? "none" : `1.5px solid ${badge.color}`,
            whiteSpace: "nowrap",
          }}>
            {badge.label}
          </span>
        )}

        <button
          onClick={onEdit}
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
  qualification:  (a, b) => (a.qualifications_competencies?.name ?? "").localeCompare(b.qualifications_competencies?.name ?? ""),
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

function CredentialSection({ section, credentials, searchQuery, onAdd, onEdit, onDelete, onReorder, onResetOrder, token, cardholderId }) {
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
          padding: "1.5rem 0.5rem",
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
                onEdit={() => onEdit(cred)}
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

function ReassignCompanyModal({ currentCompanyId, token, onSave, onClose, loading, error }) {
  const [companies, setCompanies] = useState([])
  const [loadingCompanies, setLoadingCompanies] = useState(true)
  const [companyId, setCompanyId] = useState(currentCompanyId ?? "")

  useEffect(() => {
    async function fetchCompanies() {
      const res = await fetch("/api/superadmin/companies", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      setCompanies(json.companies ?? [])
      setLoadingCompanies(false)
    }
    fetchCompanies()
  }, [])

  const options = companies
    .slice()
    .sort((a, b) => a.company_name.localeCompare(b.company_name))
    .map((c) => ({ value: c.id, label: c.company_name }))

  return (
    <ModalOverlay onClose={onClose}>
      <ModalHeader title="Reassign Company" onClose={onClose} />
      <div>
        <label style={fieldLabelStyle}>Company <span style={{ color: "#EF4444" }}>*</span></label>
        {loadingCompanies ? (
          <div style={{ ...inputStyle, color: "#9CA3AF" }}>Loading companies...</div>
        ) : (
          <SearchableDropdown
            options={options}
            value={companyId}
            onChange={setCompanyId}
            placeholder="Select company..."
          />
        )}
        {error && <p style={{ margin: "0.5rem 0 0", fontSize: "0.8125rem", color: "#EF4444" }}>{error}</p>}
      </div>
      <ModalActions
        confirmLabel="Save"
        onConfirm={() => onSave(companyId, companies.find((c) => c.id === companyId) ?? null)}
        onCancel={onClose}
        loading={loading || loadingCompanies}
      />
    </ModalOverlay>
  )
}

function ChangeStatusModal({ currentStatus, onConfirm, onClose, loading, error }) {
  const isActive = currentStatus === "active"
  const nextLabel = isActive ? "Archived" : "Active"
  const nextStatus = isActive ? "archived" : "active"

  return (
    <ModalOverlay onClose={onClose}>
      <ModalHeader title="Change Status" onClose={onClose} />
      <p style={{ margin: "0 0 0.25rem", fontSize: "0.9375rem", color: "#374151", lineHeight: 1.6 }}>
        This cardholder is currently <strong>{currentStatus === "active" ? "Active" : currentStatus === "archived" ? "Archived" : currentStatus}</strong>.
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
        This will set the cardholder status to <strong>Archived</strong>. Their card will no longer be publicly visible.
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

function RestoreModal({ onConfirm, onClose, loading, error }) {
  return (
    <ModalOverlay onClose={onClose}>
      <ModalHeader title="Restore Cardholder" onClose={onClose} />
      <p style={{ margin: 0, fontSize: "0.9375rem", color: "#374151", lineHeight: 1.6 }}>
        This will restore the cardholder to <strong>Active</strong> and reset their licence period to 12 months from today.
      </p>
      {error && <p style={{ margin: "0.75rem 0 0", fontSize: "0.8125rem", color: "#EF4444" }}>{error}</p>}
      <ModalActions
        confirmLabel="Restore Cardholder"
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
      <p style={{ margin: 0, fontSize: "0.9375rem", color: "#374151", lineHeight: 1.6 }}>
        This cardholder will be permanently hidden from the platform. This action cannot be undone in the app — to restore a deleted cardholder you must contact QualCard directly.
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
  const [editTarget, setEditTarget] = useState(null)

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

  function handleCredentialEdited(updated) {
    setCredentials((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
    setEditTarget(null)
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

  async function handleReassignCompany(newCompanyId, newCompany) {
    if (!newCompanyId) { setActionError("Please select a company."); return }
    const ok = await patchCardholder({ company_id: newCompanyId })
    if (ok) {
      setCompany(newCompany)
      setActionModal(null)
    }
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
    const now = new Date()
    const startDate = now.toISOString().split("T")[0]
    const endDate = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()).toISOString().split("T")[0]
    const ok = await patchCardholder({ status: "active", licence_start_date: startDate, licence_end_date: endDate })
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
  const licenceStatus = getLicenceStatus(cardholder.licence_end_date)
  const headerAction = (() => {
    const { status } = cardholder
    if (status === "pending_activation") return { label: "Activate Now", bg: "#F97316", onClick: () => setActionModal("change-status") }
    if (status === "archived") return { label: "Restore Cardholder", bg: "#2f6f6a", onClick: () => setActionModal("restore") }
    if (licenceStatus.showButton) return { label: licenceStatus.buttonLabel, bg: "#F97316", onClick: () => {} }
    return null
  })()
  const visibleActions = (userRole === "qc_admin" ? QC_ACTIONS : COMPANY_ACTIONS).filter(a => {
    if (a.key === "archive") return cardholder.status !== "archived"
    if (a.key === "restore") return cardholder.status === "archived"
    return true
  })

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
                const keyMap = {
                  "Active": "active",
                  "Expiring Soon": "expiring",
                  "Expired": "expired",
                  "Payment Pending": "payment_pending",
                }
                return <StatusBadge status={keyMap[licenceStatus.status] ?? "inactive"} />
              })()}
              <span style={{
                display: "inline-block", padding: "0.25rem 0.75rem", borderRadius: "1rem",
                fontSize: "0.75rem", fontWeight: 400, color: "#FFFFFF",
                backgroundColor: "transparent",
                border: "1.5px solid rgba(255,255,255,0.8)", whiteSpace: "nowrap",
              }}>
                {licenceStatus.dateLabel ? `${licenceStatus.dateLabel}: ${new Date(cardholder.licence_end_date).toLocaleDateString("en-NZ", { day: "2-digit", month: "2-digit", year: "numeric" })}` : "No expiry"}
              </span>
              {headerAction && (
                <button
                  onClick={headerAction.onClick}
                  style={{
                    padding: "0.25rem 0.875rem", borderRadius: "1rem", border: "none",
                    background: headerAction.bg, color: "#FFFFFF", fontSize: "0.75rem", fontWeight: 600,
                    cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                    transition: "opacity 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                >
                  {headerAction.label}
                </button>
              )}
            </div>
          </div>

          <div style={{ flexShrink: 0 }}>
            <div style={{ background: "#FFFFFF", borderRadius: "0.5rem", padding: "0.5rem", display: "inline-flex" }}>
              <QRCodeSVG value={profileUrl} size={80} />
            </div>
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

          {/* Four sections — 2x2 grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", alignItems: "stretch" }}>
            {SECTIONS.map((section) => {
              const sectionCreds = credentials.filter(
                (c) => c.qualifications_competencies?.type === section.key
              )
              return (
                <div
                  key={section.key}
                  style={{
                    background: "#FFFFFF",
                    borderRadius: "1rem",
                    border: "1px solid #E5E7EB",
                    boxShadow: "0 2px 8px rgba(44,62,80,0.06), 0 1px 2px rgba(44,62,80,0.04)",
                    padding: "1.5rem",
                    height: "100%",
                  }}
                >
                  <CredentialSection
                    section={section}
                    credentials={sectionCreds}
                    searchQuery={searchQuery}
                    onAdd={() => setAddSection(section)}
                    onEdit={(cred) => setEditTarget(cred)}
                    onDelete={(cred) => setDeleteTarget(cred)}
                    onReorder={handleReorder}
                    onResetOrder={handleResetOrder}
                  />
                </div>
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

      {editTarget && (
        <EditCredentialModal
          cred={editTarget}
          cardholderId={id}
          companyId={company?.id ?? null}
          userRole={userRole}
          token={token}
          onSave={handleCredentialEdited}
          onClose={() => setEditTarget(null)}
        />
      )}

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
        <ReassignCompanyModal
          currentCompanyId={cardholder.company_id}
          token={token}
          onSave={handleReassignCompany}
          onClose={() => { setActionModal(null); setActionError("") }}
          loading={actionLoading}
          error={actionError}
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

      {actionModal === "restore" && (
        <RestoreModal
          onConfirm={handleRestore}
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
