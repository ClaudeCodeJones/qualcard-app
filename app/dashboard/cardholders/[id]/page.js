"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { QRCodeSVG } from "qrcode.react"
import { supabase } from "@/lib/supabase"
import { getLicenceStatus } from "@/lib/licenceStatus"
import { useIsMobile } from "@/lib/useIsMobile"
import {
  ArrowLeft, ExternalLink, Copy, Check,
  GraduationCap, Award, ClipboardCheck, ShieldCheck,
  Pencil, Trash2, Search, X, ChevronDown, ChevronUp,
  Archive, Users,
} from "lucide-react"
import StatusBadge from "@/app/components/StatusBadge"

// ─── Constants ────────────────────────────────────────────────────────────────

const LIGHT_CARD = { background: "#FFFFFF", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(44,62,80,0.06), 0 4px 12px rgba(44,62,80,0.08)" }
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? ""

const SECTIONS = [
  { key: "qualification",  label: "Qualifications",         color: "#4A90D9", mutedColor: "#93B8D9", Icon: GraduationCap },
  { key: "competency",     label: "Competencies",           color: "#F97316", mutedColor: "#F4B88A", Icon: Award         },
  { key: "site_induction", label: "Site Inductions",        color: "#7C3AED", mutedColor: "#A78BD6", Icon: ClipboardCheck },
  { key: "permit",         label: "Permits & Certificates", color: "#16A34A", mutedColor: "#6DBF8A", Icon: ShieldCheck    },
]

const DASHBOARD_ACTIONS = [
  { key: "archive",           label: "Archive Cardholder", Icon: Archive },
  { key: "delete-cardholder", label: "Delete Cardholder",  Icon: Trash2  },
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
  const d = new Date(dateStr)
  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const year = String(d.getFullYear()).slice(-2)
  return `${day}/${month}/${year}`
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

// ─── PhotoCircle ──────────────────────────────────────────────────────────────

function PhotoCircle({ photoUrl, name, size = 80, borderColor = "rgba(255,255,255,0.3)" }) {
  if (photoUrl) {
    return (
      <div style={{
        width: size,
        height: size,
        borderRadius: "1rem",
        overflow: "hidden",
        flexShrink: 0,
        border: `2.5px solid ${borderColor}`,
        boxShadow: "inset 0 0 6px rgba(255,255,255,0.1)",
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

function EditCredentialModal({ cred, companyId, onSave, onClose }) {
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

  const OTHER_PROVIDER = "__other_provider__"
  const isOtherProvider = providerId === OTHER_PROVIDER

  useEffect(() => {
    async function fetchProviders() {
      const orFilter = companyId
        ? `is_global.eq.true,company_id.eq.${companyId}`
        : `is_global.eq.true`
      const { data } = await supabase
        .from("training_providers")
        .select("id, provider_name")
        .or(orFilter)
        .order("provider_name")

      const list = data ?? []
      list.sort((a, b) => {
        if (a.provider_name === "MW Training & Planning") return -1
        if (b.provider_name === "MW Training & Planning") return 1
        return a.provider_name.localeCompare(b.provider_name)
      })

      setProviderOptions([
        { value: "", label: "None" },
        ...list.map((p) => ({ value: p.id, label: p.provider_name })),
        { value: OTHER_PROVIDER, label: "Other / Not Listed" },
      ])
      setLoadingProviders(false)
    }
    fetchProviders()
  }, [companyId])

  async function handleSave() {
    setError("")
    if (!issueDate) { setError("Issue date is required."); return }
    if (isOtherProvider && !otherProviderName.trim()) { setError("Please enter a provider name."); return }
    setSaving(true)

    let resolvedProviderId = providerId || null

    if (isOtherProvider) {
      const orFilter = companyId
        ? `is_global.eq.true,company_id.eq.${companyId}`
        : `is_global.eq.true`
      const { data: existing } = await supabase
        .from("training_providers")
        .select("id")
        .ilike("provider_name", otherProviderName.trim())
        .or(orFilter)
        .limit(1)

      if (existing?.[0]) {
        resolvedProviderId = existing[0].id
      } else {
        const { data: created, error: provErr } = await supabase
          .from("training_providers")
          .insert({ provider_name: otherProviderName.trim(), is_global: false, company_id: companyId ?? null, status: "active" })
          .select("id")
          .single()
        if (provErr) { setError(provErr.message); setSaving(false); return }
        resolvedProviderId = created.id
      }
    }

    const { data: updated, error: updateErr } = await supabase
      .from("cardholder_credentials")
      .update({
        issue_date: issueDate,
        expiry_date: expiryDate || null,
        training_provider_id: resolvedProviderId,
      })
      .eq("id", cred.id)
      .select("*, qualifications_competencies(*)")
      .single()

    setSaving(false)
    if (updateErr) { setError(updateErr.message); return }
    onSave(updated)
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

function AddCredentialModal({ section, cardholderId, companyId, credentialsLibrary, userInitials, onSave, onClose }) {
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

      const providerFilter = companyId
        ? `is_global.eq.true,company_id.eq.${companyId}`
        : `is_global.eq.true`

      const [existingResult, providersResult] = await Promise.all([
        supabase
          .from("cardholder_credentials")
          .select("qual_comp_id")
          .eq("cardholder_id", cardholderId),
        supabase
          .from("training_providers")
          .select("id, provider_name")
          .or(providerFilter)
          .order("provider_name"),
      ])

      const existingQualIds = new Set((existingResult.data ?? []).map((c) => c.qual_comp_id))
      const filteredQuals = (credentialsLibrary ?? []).filter(
        (q) => q.type === section.key && !existingQualIds.has(q.id)
      )

      setQualOptions([
        ...filteredQuals.map((q) => ({ value: q.id, label: q.name })),
        { value: OTHER_VALUE, label: "Other / Not Listed" },
      ])

      const providers = providersResult.data ?? []
      providers.sort((a, b) => {
        if (a.provider_name === "MW Training & Planning") return -1
        if (b.provider_name === "MW Training & Planning") return 1
        return a.provider_name.localeCompare(b.provider_name)
      })

      setProviderOptions([
        ...providers.map((p) => ({ value: p.id, label: p.provider_name })),
        { value: OTHER_PROVIDER, label: "Other / Not Listed" },
      ])

      setLoadingOptions(false)
    }
    fetchOptions()
  }, [section.key, credentialsLibrary, cardholderId])

  async function handleSave() {
    setError("")

    if (!qualId) { setError("Please select a credential name."); return }
    if (isOther && !otherName.trim()) { setError(`Please enter a ${typeConfig.nameLabel.toLowerCase()}.`); return }
    if (!providerId) { setError("Please select a training provider."); return }
    if (isOtherProvider && !otherProviderName.trim()) { setError("Please enter a provider name."); return }
    if (!issueDate) { setError("Issue date is required."); return }
    if (!confirmed) { setError("Please confirm the credential has been sighted and verified."); return }
    if (!initials.trim()) { setError("Confirmation initials are required."); return }

    setSaving(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setError("Not authenticated."); setSaving(false); return }

    const payload = {
      issue_date: issueDate,
      expiry_date: expiryDate || null,
      confirmation_initials: initials.trim(),
    }

    if (isOther) {
      payload.custom_credential = {
        name: otherName.trim(),
        type: section.key,
        scope_company_id: companyId ?? null,
        code_field: typeConfig.codeField,
        code_value: otherCode.trim() || null,
      }
    } else {
      payload.qual_comp_id = qualId
    }

    if (isOtherProvider) {
      payload.custom_provider = { provider_name: otherProviderName.trim() }
    } else {
      payload.training_provider_id = providerId
    }

    const res = await fetch(`/api/dashboard/cardholders/${cardholderId}/credentials`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(payload),
    })

    const json = await res.json()
    setSaving(false)

    if (!res.ok) { setError(json.error ?? "Failed to add credential."); return }
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
            <div>
              <label style={fieldLabelStyle}>Credential Name <span style={{ color: "#EF4444" }}>*</span></label>
              <SearchableDropdown
                options={qualOptions}
                value={qualId}
                onChange={(v) => { setQualId(v); if (v !== OTHER_VALUE) { setOtherName(""); setOtherCode("") } }}
                placeholder="Select credential..."
              />
            </div>

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

function CredentialRow({ cred, onEdit, onDelete, onMoveUp, onMoveDown, isFirst, isLast, sectionColor, isMobile }) {
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
      <div style={{ display: "flex", flexDirection: "column", gap: "0", flexShrink: 0 }}>
        {arrowBtn(isFirst, "Move up", onMoveUp, ChevronUp)}
        {arrowBtn(isLast, "Move down", onMoveDown, ChevronDown)}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: "0.8125rem", fontWeight: 600, color: "#333333", lineHeight: 1.4 }}>
          {name}
        </p>
        {cred.issue_date && (
          <p style={{ margin: "0.1rem 0 0", fontSize: "0.8125rem", color: "#6B7280" }}>
            Issue date: {formatDate(cred.issue_date)}
          </p>
        )}
        {cred.expiry_date && (
          <p style={{ margin: "0.1rem 0 0", fontSize: "0.8125rem", color: "#9CA3AF" }}>
            Expires {formatDate(cred.expiry_date)}
          </p>
        )}
        {!isMobile && (
          <p style={{ margin: "0.1rem 0 0", fontSize: "0.8125rem", visibility: code ? "visible" : "hidden", color: "#6B7280" }}>
            {code || "\u00A0"}
          </p>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", flexShrink: 0 }}>
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
            background: "none", border: "none", cursor: "pointer", padding: "0.2rem",
            color: "#9CA3AF", display: "flex", alignItems: "center", justifyContent: "center", transition: "color 0.15s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#374151")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#9CA3AF")}
        >
          <Pencil size={16} strokeWidth={2} />
        </button>

        <button
          onClick={onDelete}
          title="Delete credential"
          style={{
            background: "none", border: "none", cursor: "pointer", padding: "0.2rem",
            color: "#9CA3AF", display: "flex", alignItems: "center", justifyContent: "center", transition: "color 0.15s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#EF4444")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#9CA3AF")}
        >
          <Trash2 size={16} strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}

// ─── Sort helpers ──────────────────────────────────────────────────────────────

function sortCredentials(creds, sectionKey) {
  const manual = creds.filter((c) => c.is_manually_ordered).sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
  const auto = creds.filter((c) => !c.is_manually_ordered).sort((a, b) =>
    (a.qualifications_competencies?.name ?? "").localeCompare(b.qualifications_competencies?.name ?? "")
  )
  return [...manual, ...auto]
}

// ─── CredentialSection ────────────────────────────────────────────────────────

function CredentialSection({ section, credentials, searchQuery, onAdd, onEdit, onDelete, onReorder, onResetOrder, isMobile }) {
  const [expanded, setExpanded] = useState(false)

  const sorted = sortCredentials(credentials, section.key)
  const filtered = sorted.filter((c) =>
    (c.qualifications_competencies?.name ?? "").toLowerCase().includes(searchQuery.toLowerCase())
  )

  const hasManual = credentials.some((c) => c.is_manually_ordered)
  const DEFAULT_VISIBLE = isMobile ? 0 : 3
  const showToggle = filtered.length > DEFAULT_VISIBLE
  const visible = expanded ? filtered : filtered.slice(0, DEFAULT_VISIBLE)

  return (
    <div>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "0.875rem",
        marginBottom: filtered.length > 0 ? "0.25rem" : "0",
        paddingBottom: "0.75rem",
        borderBottom: "1px solid #E5E7EB",
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
              fontSize: "0.75rem", fontWeight: 500, color: "#9CA3AF",
              fontFamily: "inherit", padding: "0.25rem 0.25rem",
              textDecoration: "none", transition: "color 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#374151"
              e.currentTarget.style.textDecoration = "underline"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#9CA3AF"
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
            fontSize: "0.8125rem", fontWeight: 600, color: "#9CA3AF",
            fontFamily: "inherit", padding: "0.25rem 0.5rem",
            transition: "color 0.15s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = section.color)}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#9CA3AF")}
          onMouseDown={(e) => (e.currentTarget.style.color = section.color)}
        >
          Add
        </button>
      </div>

      {filtered.length === 0 ? (
        (!isMobile || searchQuery) ? (
          <div style={{
            padding: "1.5rem 0.5rem",
            minHeight: isMobile ? "0" : "80px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <p style={{ margin: 0, fontSize: "0.9rem", color: "#9CA3AF" }}>
              {searchQuery
                ? `No ${section.label.toLowerCase()} match your search`
                : `No ${section.label.toLowerCase()} added yet`}
            </p>
          </div>
        ) : null
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
                sectionColor={section.mutedColor}
                isMobile={isMobile}
              />
            ))}
          </div>

          {showToggle && (
            <div style={{ textAlign: "center", marginTop: "0.75rem" }}>
              <button
                onClick={() => setExpanded((v) => !v)}
                style={{
                  padding: 0,
                  border: "none",
                  background: "none",
                  color: "#2f6f6a",
                  fontSize: isMobile ? "0.6875rem" : "0.8125rem",
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  textDecoration: "none",
                  transition: "color 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.textDecoration = "underline"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.textDecoration = "none"
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

function DeleteCardholderModal({ onConfirm, onClose, loading, error }) {
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
  const isMobile = useIsMobile()

  const [cardholder, setCardholder] = useState(null)
  const [company, setCompany] = useState(null)
  const [credentials, setCredentials] = useState([])
  const [credentialsLibrary, setCredentialsLibrary] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [userInitials, setUserInitials] = useState("")
  const [companyId, setCompanyId] = useState(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [addSection, setAddSection] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [editTarget, setEditTarget] = useState(null)

  const [actionModal, setActionModal] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState("")

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setError("Not authenticated."); setLoading(false); return }

      const { data: userData } = await supabase
        .from("users")
        .select("full_name, company_id")
        .eq("id", session.user.id)
        .single()

      if (userData) {
        if (userData.full_name) setUserInitials(getInitials(userData.full_name))
        if (userData.company_id) setCompanyId(userData.company_id)
      }

      const { data: ch, error: chErr } = await supabase
        .from("cardholders")
        .select("id, full_name, status, licence_start_date, licence_end_date, photo_url, slug, company_id, created_at, companies(id, company_name)")
        .eq("id", id)
        .single()

      if (chErr || !ch) {
        setError("Cardholder not found.")
        setLoading(false)
        return
      }

      setCardholder(ch)
      if (ch.companies) setCompany(ch.companies)

      const { data: creds } = await supabase
        .from("cardholder_credentials")
        .select(`
          id, cardholder_id, qual_comp_id, training_provider_id, issue_date, expiry_date,
          is_manually_ordered, display_order, confirmation_checked,
          confirmation_initials, confirmation_date,
          qualifications_competencies(id, name, type, unit_standard_number, competency_code, permit_number, induction_code),
          training_providers(id, provider_name)
        `)
        .eq("cardholder_id", id)
        .order("is_manually_ordered", { ascending: false })
        .order("display_order", { ascending: true })

      setCredentials(creds ?? [])

      const { data: credsLib } = await supabase
        .from("qualifications_competencies")
        .select("id, name, type")
        .eq("is_active", true)
        .order("name")

      setCredentialsLibrary(credsLib ?? [])
      setLoading(false)
    }

    load()
  }, [id])

  // ── Credential handlers ──────────────────────────────────────────────────

  async function handleDeleteCredential(cred) {
    setDeleting(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`/api/dashboard/cardholders/${id}/credentials/${cred.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session?.access_token}` },
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
        supabase
          .from("cardholder_credentials")
          .update({ is_manually_ordered: false, display_order: 0 })
          .eq("id", c.id)
          .select("*, qualifications_competencies(*)")
          .single()
          .then(({ data }) => data)
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

    const newOrder = sectionSorted.map((c, i) => ({ id: c.id, display_order: i }))
    const a = newOrder[fromIdx]
    const b = newOrder[toIdx]
    const tmpOrder = a.display_order
    a.display_order = b.display_order
    b.display_order = tmpOrder

    const patch = async (credId, display_order) => {
      const { data } = await supabase
        .from("cardholder_credentials")
        .update({ is_manually_ordered: true, display_order })
        .eq("id", credId)
        .select("*, qualifications_competencies(*)")
        .single()
      return data
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

  function handleActivate() {
    router.push(`/payment-summary?cardholder=${id}`)
  }

  async function handleRenew() {
    setActionLoading(true)
    setActionError("")
    const currentEndDate = cardholder.licence_end_date ? new Date(cardholder.licence_end_date) : new Date()
    const newEndDate = new Date(currentEndDate.getFullYear() + 1, currentEndDate.getMonth(), currentEndDate.getDate()).toISOString().split("T")[0]
    const { data, error: err } = await supabase
      .from("cardholders")
      .update({ licence_end_date: newEndDate })
      .eq("id", id)
      .select("id, full_name, status, licence_start_date, licence_end_date, photo_url, slug, company_id")
      .single()
    setActionLoading(false)
    if (err) { setActionError(err.message); return }
    setCardholder(data)
  }

  async function handleArchive() {
    setActionLoading(true)
    setActionError("")
    const { data, error: err } = await supabase
      .from("cardholders")
      .update({ status: "inactive" })
      .eq("id", id)
      .select("id, full_name, status, licence_start_date, licence_end_date, photo_url, slug, company_id")
      .single()
    setActionLoading(false)
    if (err) { setActionError(err.message); return }
    setCardholder(data)
    setActionModal(null)
  }

  async function handleDeleteCardholder() {
    setActionLoading(true)
    setActionError("")
    const { error: err } = await supabase
      .from("cardholders")
      .update({ status: "deleted" })
      .eq("id", id)
    setActionLoading(false)
    if (err) { setActionError(err.message); return }
    router.push("/dashboard/cardholders")
  }

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{
        borderRadius: "1rem",
        padding: "2rem",
        minHeight: "400px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Inter, system-ui, sans-serif",
      }}>
        <p style={{ color: "#9CA3AF", fontSize: "0.9375rem", margin: 0 }}>Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        borderRadius: "1rem",
        padding: "2rem",
        minHeight: "400px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.75rem",
        fontFamily: "Inter, system-ui, sans-serif",
      }}>
        <p style={{ color: "#EF4444", fontSize: "0.9375rem", fontWeight: 500, margin: 0 }}>{error}</p>
        <Link href="/dashboard/cardholders" style={{ color: "#6B7280", fontSize: "0.875rem", textDecoration: "underline" }}>
          Back to Cardholders
        </Link>
      </div>
    )
  }

  const profileUrl = `${APP_URL}/card/${cardholder.slug}`
  const licenceStatus = getLicenceStatus(cardholder.licence_end_date)

  const getFullDateLabel = (dateLabel) => {
    if (!dateLabel || !cardholder.licence_end_date) return null
    const dateStr = new Date(cardholder.licence_end_date).toLocaleDateString("en-NZ", { day: "2-digit", month: "2-digit", year: "numeric" })
    return `${dateLabel}: ${dateStr}`
  }

  const getButtonBg = (buttonLabel) => {
    if (buttonLabel === "Activate") return "#F97316"
    if (buttonLabel === "Renew") return "#F59E0B"
    if (buttonLabel === "Renew Now") return "#EF4444"
    return "#F97316"
  }

  const headerAction = licenceStatus.showButton ? {
    label: licenceStatus.buttonLabel,
    bg: getButtonBg(licenceStatus.buttonLabel),
    onClick: licenceStatus.buttonLabel === "Activate" ? handleActivate : handleRenew,
  } : null

  const visibleActions = DASHBOARD_ACTIONS.filter((a) => {
    if (a.key === "archive") return cardholder.status !== "archived"
    return true
  })

  return (
    <div style={{
      borderRadius: "1rem",
      padding: "0 0 2rem",
      display: "flex",
      flexDirection: "column",
      gap: "1.25rem",
      fontFamily: "Inter, system-ui, sans-serif",
      maxWidth: "1280px",
      margin: "0 auto",
      width: "100%",
    }}>

      {/* ── Back button ─────────────────────────────────────────────────── */}
      <Link
        href={isMobile ? "/dashboard" : "/dashboard/cardholders"}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.375rem",
          color: "#6B7280",
          fontSize: "0.875rem",
          fontWeight: 500,
          textDecoration: "none",
          width: "fit-content",
          transition: "color 0.15s ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#2C3E50")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "#6B7280")}
      >
        <ArrowLeft size={15} strokeWidth={2.5} />
        {isMobile ? "Back" : "Back to Cardholders"}
      </Link>

      {/* ── Header card ─────────────────────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(to bottom, #214f4b, #2a5f5b, #35736f)",
        borderRadius: "1rem",
        padding: isMobile ? "1rem 1.25rem" : "1.5rem 2rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}>
        {/* Row 1: Photo + Name + QR (simplified on mobile) */}
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? "1rem" : "1.5rem" }}>
          <PhotoCircle photoUrl={cardholder.photo_url} name={cardholder.full_name} size={isMobile ? 56 : 80} borderColor={getPhotoBorderColor(cardholder.status)} />

          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{
              margin: 0,
              fontSize: isMobile ? "1.25rem" : "1.75rem",
              fontWeight: 800,
              color: "#FFFFFF",
              textTransform: "uppercase",
              letterSpacing: "0.03em",
              lineHeight: 1.1,
            }}>
              {cardholder.full_name}
            </h1>
            {isMobile && licenceStatus.dateLabel && cardholder.licence_end_date && (
              <p style={{ margin: "0.375rem 0 0", fontSize: "0.8125rem", color: "rgba(255,255,255,0.65)", fontWeight: 500 }}>
                {licenceStatus.dateLabel}: {new Date(cardholder.licence_end_date).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            )}
            {isMobile && (
              <a
                href={profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex", alignItems: "center", gap: "0.25rem",
                  fontSize: "0.75rem", color: "rgba(255,255,255,0.5)",
                  textDecoration: "none", marginTop: "0.375rem",
                }}
              >
                View Profile <ExternalLink size={10} strokeWidth={2} />
              </a>
            )}
            {!isMobile && company && (
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.875rem", color: "rgba(255,255,255,0.6)", fontWeight: 400 }}>
                {company.company_name}
              </p>
            )}
          </div>

          {!isMobile && (
            <div style={{
              background: "#FFFFFF",
              borderRadius: "0.75rem",
              padding: "0.75rem",
              display: "inline-flex",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              flexShrink: 0,
            }}>
              <QRCodeSVG value={profileUrl} size={56} />
            </div>
          )}
        </div>

        {/* Row 2: Company, status, creds, actions (hidden on mobile - simplified header) */}
        <div style={{
          display: isMobile ? "none" : "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.625rem",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          paddingTop: "1rem",
        }}>
          <span style={{
            display: "inline-block", padding: "0.2rem 0.625rem", borderRadius: "1rem",
            fontSize: "0.6875rem", fontWeight: 600,
            color: "rgba(255,255,255,0.65)",
            backgroundColor: "transparent",
            border: "1px solid rgba(255,255,255,0.25)",
            whiteSpace: "nowrap",
          }}>
            Created: {new Date(cardholder.created_at).toLocaleDateString("en-NZ", { day: "2-digit", month: "2-digit", year: "numeric" })}
          </span>

          {(() => {
            const fullDateLabel = getFullDateLabel(licenceStatus.dateLabel)
            return fullDateLabel ? (
              <span style={{
                display: "inline-block", padding: "0.2rem 0.625rem", borderRadius: "1rem",
                fontSize: "0.6875rem", fontWeight: 600,
                color: "rgba(255,255,255,0.65)",
                backgroundColor: "transparent",
                border: "1px solid rgba(255,255,255,0.25)",
                whiteSpace: "nowrap",
              }}>
                {fullDateLabel}
              </span>
            ) : null
          })()}

          {(() => {
            const keyMap = {
              "Active": "active",
              "Expiring Soon": "expiring",
              "Expired": "expired",
              "Payment Pending": "payment_pending",
            }
            return <StatusBadge status={keyMap[licenceStatus.status] ?? "inactive"} />
          })()}

          {headerAction && (
            <button
              onClick={headerAction.onClick}
              disabled={actionLoading}
              style={{
                padding: "0.2rem 0.75rem", borderRadius: "1rem", border: "none",
                background: headerAction.bg, color: "#FFFFFF", fontSize: "0.6875rem", fontWeight: 600,
                cursor: actionLoading ? "not-allowed" : "pointer", fontFamily: "inherit",
                whiteSpace: "nowrap", opacity: actionLoading ? 0.7 : 1,
                transition: "opacity 0.15s ease",
              }}
              onMouseEnter={(e) => { if (!actionLoading) e.currentTarget.style.opacity = "0.88" }}
              onMouseLeave={(e) => { if (!actionLoading) e.currentTarget.style.opacity = "1" }}
            >
              {actionLoading ? "Saving..." : headerAction.label}
            </button>
          )}

          <span style={{ color: "rgba(255,255,255,0.2)" }}>|</span>

          {SECTIONS.map((s) => {
            const count = credentials.filter(c => c.qualifications_competencies?.type === s.key).length
            return (
              <div key={s.key} style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                <s.Icon size={13} color={s.mutedColor} strokeWidth={2} />
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: count === 0 ? "rgba(255,255,255,0.3)" : "#FFFFFF" }}>
                  {count}
                </span>
              </div>
            )
          })}


          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", marginLeft: "auto" }}>
            <a
              href={profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", gap: "0.25rem",
                fontSize: "0.6875rem", color: "rgba(255,255,255,0.5)",
                textDecoration: "none", transition: "color 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
            >
              View Profile
              <ExternalLink size={10} strokeWidth={2} />
            </a>
            <CopyButton textToCopy={profileUrl} />
          </div>

          {actionError && (
            <p style={{ margin: 0, fontSize: "0.8125rem", color: "#FCA5A5" }}>{actionError}</p>
          )}
        </div>
      </div>

      {/* ── Credentials ─────────────────────────────────────────────────── */}
      <div style={{
        ...LIGHT_CARD,
        borderRadius: "1rem",
        padding: "1.75rem",
      }}>
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
              width: "100%",
              padding: "0.625rem 0.875rem",
              paddingLeft: "2.5rem",
              border: "1px solid #E5E7EB",
              borderRadius: "0.5rem",
              fontSize: "0.9375rem",
              color: "#1F2937",
              fontFamily: "inherit",
              outline: "none",
              boxSizing: "border-box",
              background: "#F9FAFB",
              transition: "border-color 0.15s ease",
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

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "1.25rem", alignItems: "stretch" }}>
          {SECTIONS.map((section) => {
            const sectionCreds = credentials.filter(
              (c) => c.qualifications_competencies?.type === section.key
            )
            return (
              <div
                key={section.key}
                style={{
                  background: "#F9FAFB",
                  borderRadius: "1rem",
                  border: "1px solid #E5E7EB",
                  borderTop: `3px solid ${section.color}`,
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
                  isMobile={isMobile}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Cardholder actions ───────────────────────────────────────────── */}
      <div style={{
        ...LIGHT_CARD,
        borderRadius: "1rem",
        padding: "1.75rem",
      }}>
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
            color: "#6B7280",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}>
            Cardholder Actions
          </span>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)",
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

      {/* ── Credential modals ─────────────────────────────────────────────── */}

      {editTarget && (
        <EditCredentialModal
          cred={editTarget}
          companyId={companyId}
          onSave={handleCredentialEdited}
          onClose={() => setEditTarget(null)}
        />
      )}

      {addSection && (
        <AddCredentialModal
          section={addSection}
          cardholderId={id}
          companyId={companyId}
          credentialsLibrary={credentialsLibrary}
          userInitials={userInitials}
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

      {/* ── Action modals ─────────────────────────────────────────────────── */}

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
          onConfirm={handleDeleteCardholder}
          onClose={() => setActionModal(null)}
          loading={actionLoading}
          error={actionError}
        />
      )}
    </div>
  )
}
