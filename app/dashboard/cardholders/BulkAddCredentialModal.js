"use client"

import { useState, useEffect, useRef } from "react"
import { X, Check, AlertCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"

const OTHER_VALUE = "__other__"
const OTHER_PROVIDER = "__other_provider__"

const TABS = [
  { key: "qualification", label: "Qualification" },
  { key: "competency", label: "Competency" },
  { key: "site_induction", label: "Site Induction" },
  { key: "permit", label: "Permit" },
]

const TYPE_CONFIG = {
  qualification:  { nameLabel: "Qualification Name",  codeLabel: "Unit Standard Number", codeField: "unit_standard_number" },
  competency:     { nameLabel: "Competency Name",      codeLabel: "Competency Code",       codeField: "competency_code" },
  site_induction: { nameLabel: "Site Induction Name",  codeLabel: "Induction Code",        codeField: "induction_code" },
  permit:         { nameLabel: "Permit Name",           codeLabel: "Permit Number",         codeField: "permit_number" },
}

const inputStyle = {
  width: "100%",
  padding: "0.625rem 0.875rem",
  border: "1px solid #E5E7EB",
  borderRadius: "0.5rem",
  fontSize: "0.875rem",
  color: "#333333",
  backgroundColor: "#FFFFFF",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
}

const labelStyle = {
  display: "block",
  fontSize: "0.8125rem",
  fontWeight: 600,
  color: "#374151",
  marginBottom: "0.375rem",
}

function SimpleDropdown({ options, value, onChange, placeholder }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    if (open) document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
  const selectedLabel = options.find(o => o.value === value)?.label

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => { setOpen(!open); setSearch("") }}
        style={{
          ...inputStyle,
          textAlign: "left",
          cursor: "pointer",
          color: value ? "#333333" : "#9CA3AF",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selectedLabel || placeholder}
        </span>
        <span style={{ fontSize: "0.625rem", color: "#9CA3AF" }}>&#9662;</span>
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 300,
          background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: "0.5rem",
          boxShadow: "0 4px 16px rgba(44,62,80,0.12)", maxHeight: "220px", overflowY: "auto",
        }}>
          <div style={{ padding: "0.375rem", borderBottom: "1px solid #E5E7EB" }}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              autoFocus
              style={{ ...inputStyle, fontSize: "0.8125rem", padding: "0.5rem 0.625rem" }}
            />
          </div>
          {filtered.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false) }}
              style={{
                display: "block", width: "100%", textAlign: "left", padding: "0.5rem 0.75rem",
                border: "none", background: o.value === value ? "#F0FDF4" : "transparent",
                cursor: "pointer", fontSize: "0.8125rem", color: "#333333", fontFamily: "inherit",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#F3F4F6"}
              onMouseLeave={(e) => e.currentTarget.style.background = o.value === value ? "#F0FDF4" : "transparent"}
            >
              {o.label}
            </button>
          ))}
          {filtered.length === 0 && (
            <p style={{ padding: "0.75rem", margin: 0, fontSize: "0.8125rem", color: "#9CA3AF", textAlign: "center" }}>No results</p>
          )}
        </div>
      )}
    </div>
  )
}

export default function BulkAddCredentialModal({ selectedCardholders, companyId, defaultInitials = "", onSuccess, onClose }) {
  const [activeTab, setActiveTab] = useState("qualification")
  const [qualOptions, setQualOptions] = useState([])
  const [providerOptions, setProviderOptions] = useState([])
  const [loadingOptions, setLoadingOptions] = useState(true)

  const [qualId, setQualId] = useState("")
  const [otherName, setOtherName] = useState("")
  const [otherCode, setOtherCode] = useState("")
  const [providerId, setProviderId] = useState("")
  const [otherProviderName, setOtherProviderName] = useState("")
  const [issueDate, setIssueDate] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [confirmed, setConfirmed] = useState(false)
  const [initials, setInitials] = useState(defaultInitials)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  // Results view
  const [results, setResults] = useState(null)

  const typeConfig = TYPE_CONFIG[activeTab]
  const isOther = qualId === OTHER_VALUE
  const isOtherProvider = providerId === OTHER_PROVIDER

  useEffect(() => {
    async function fetchOptions() {
      setLoadingOptions(true)

      const providerFilter = companyId
        ? `is_global.eq.true,company_id.eq.${companyId}`
        : `is_global.eq.true`

      const [qualsResult, providersResult] = await Promise.all([
        supabase
          .from("qualifications_competencies")
          .select("id, name, type")
          .or(companyId ? `company_id.is.null,company_id.eq.${companyId}` : `company_id.is.null`)
          .order("name"),
        supabase
          .from("training_providers")
          .select("id, provider_name")
          .or(providerFilter)
          .order("provider_name"),
      ])

      const quals = (qualsResult.data ?? []).filter(q => q.type === activeTab)
      setQualOptions([
        ...quals.map(q => ({ value: q.id, label: q.name })),
        { value: OTHER_VALUE, label: "Other / Not Listed" },
      ])

      const providers = providersResult.data ?? []
      providers.sort((a, b) => {
        if (a.provider_name === "MW Training & Planning") return -1
        if (b.provider_name === "MW Training & Planning") return 1
        return a.provider_name.localeCompare(b.provider_name)
      })

      setProviderOptions([
        ...providers.map(p => ({ value: p.id, label: p.provider_name })),
        { value: OTHER_PROVIDER, label: "Other / Not Listed" },
      ])

      setLoadingOptions(false)
    }
    fetchOptions()
  }, [activeTab, companyId])

  function handleTabChange(key) {
    setActiveTab(key)
    setQualId("")
    setOtherName("")
    setOtherCode("")
    setError("")
  }

  async function handleSubmit() {
    setError("")

    if (!qualId) { setError("Please select a credential."); return }
    if (isOther && !otherName.trim()) { setError(`Please enter a ${typeConfig.nameLabel.toLowerCase()}.`); return }
    if (!providerId) { setError("Please select a training provider."); return }
    if (isOtherProvider && !otherProviderName.trim()) { setError("Please enter a provider name."); return }
    if (!issueDate) { setError("Issue date is required."); return }
    if (!confirmed) { setError("Please confirm the details are true and correct."); return }
    if (!initials.trim()) { setError("Confirmation initials are required."); return }

    setSaving(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setError("Session expired. Please log in again."); setSaving(false); return }

    const payload = {
      cardholder_ids: selectedCardholders.map(c => c.id),
      issue_date: issueDate,
      expiry_date: expiryDate || null,
      confirmation_checked: true,
      confirmation_initials: initials.trim(),
    }

    if (isOther) {
      payload.custom_credential = {
        name: otherName.trim(),
        type: activeTab,
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

    const res = await fetch("/api/dashboard/cardholders/bulk-credentials", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(payload),
    })

    const data = await res.json()
    setSaving(false)

    if (!res.ok) {
      setError(data.error || "Something went wrong.")
      return
    }

    setResults(data)
    if (data.successCount > 0) onSuccess()
  }

  const names = selectedCardholders.map(c => c.full_name).join(", ")

  // Results view
  if (results) {
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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
            <h2 style={{ margin: 0, fontSize: "1.0625rem", fontWeight: 700, color: "#333333" }}>
              Bulk Add Results
            </h2>
            <button
              onClick={onClose}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", padding: "0.25rem", display: "flex" }}
            >
              <X size={18} />
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.25rem" }}>
            {results.results.map((r) => (
              <div key={r.id} style={{
                display: "flex", alignItems: "center", gap: "0.625rem",
                padding: "0.625rem 0.75rem", borderRadius: "0.5rem",
                background: r.success ? "#F0FDF4" : "#FEF2F2",
                border: `1px solid ${r.success ? "#D1E8D9" : "#FECACA"}`,
              }}>
                {r.success ? (
                  <Check size={16} color="#16A34A" strokeWidth={2.5} />
                ) : (
                  <AlertCircle size={16} color="#EF4444" strokeWidth={2} />
                )}
                <span style={{ flex: 1, fontSize: "0.875rem", color: "#333333", fontWeight: 500 }}>
                  {r.name || `ID: ${r.id}`}
                </span>
                {!r.success && (
                  <span style={{ fontSize: "0.75rem", color: "#EF4444" }}>{r.error}</span>
                )}
              </div>
            ))}
          </div>

          <div style={{
            padding: "0.75rem 1rem", borderRadius: "0.5rem",
            background: "#F3F4F6", fontSize: "0.875rem", color: "#374151", fontWeight: 500,
            textAlign: "center",
          }}>
            {results.successCount} succeeded, {results.failureCount} failed
          </div>

          <button
            onClick={onClose}
            style={{
              width: "100%", marginTop: "1rem", padding: "0.75rem", borderRadius: "1rem",
              border: "1.5px solid #E5E7EB", background: "#FFFFFF",
              color: "#374151", fontSize: "0.875rem", fontWeight: 500,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  // Form view
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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.0625rem", fontWeight: 700, color: "#333333" }}>
            Bulk Add Credential
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

        <p style={{
          margin: "0 0 1.25rem", fontSize: "0.8125rem", color: "#374151", lineHeight: 1.5,
        }}>
          Add the same credential to {selectedCardholders.length} selected cardholder{selectedCardholders.length !== 1 ? "s" : ""}:
          {" "}<strong>{names}</strong>
        </p>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1.25rem" }}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabChange(tab.key)}
              style={{
                flex: 1, padding: "0.5rem 0.25rem", borderRadius: "0.5rem",
                border: activeTab === tab.key ? "1.5px solid #2f6f6a" : "1px solid #E5E7EB",
                background: activeTab === tab.key ? "#F0FDF4" : "#FFFFFF",
                color: activeTab === tab.key ? "#2f6f6a" : "#6B7280",
                fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loadingOptions ? (
          <p style={{ color: "#374151", fontSize: "0.875rem", textAlign: "center", padding: "1rem 0" }}>Loading options...</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={labelStyle}>Credential Name <span style={{ color: "#EF4444" }}>*</span></label>
              <SimpleDropdown
                options={qualOptions}
                value={qualId}
                onChange={(v) => { setQualId(v); if (v !== OTHER_VALUE) { setOtherName(""); setOtherCode("") } }}
                placeholder="Select credential..."
              />
            </div>

            {isOther && (
              <>
                <div>
                  <label style={labelStyle}>{typeConfig.nameLabel} <span style={{ color: "#EF4444" }}>*</span></label>
                  <input
                    type="text" value={otherName} onChange={(e) => setOtherName(e.target.value)}
                    placeholder={`Enter ${typeConfig.nameLabel.toLowerCase()}...`}
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = "#2f6f6a")}
                    onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
                  />
                </div>
                <div>
                  <label style={labelStyle}>{typeConfig.codeLabel}</label>
                  <input
                    type="text" value={otherCode} onChange={(e) => setOtherCode(e.target.value)}
                    placeholder={`Enter ${typeConfig.codeLabel.toLowerCase()}...`}
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = "#2f6f6a")}
                    onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
                  />
                </div>
              </>
            )}

            <div>
              <label style={labelStyle}>Training Provider <span style={{ color: "#EF4444" }}>*</span></label>
              <SimpleDropdown
                options={providerOptions}
                value={providerId}
                onChange={(v) => { setProviderId(v); if (v !== OTHER_PROVIDER) setOtherProviderName("") }}
                placeholder="Select provider..."
              />
              {isOtherProvider && (
                <input
                  type="text" value={otherProviderName} onChange={(e) => setOtherProviderName(e.target.value)}
                  placeholder="Enter provider name..."
                  style={{ ...inputStyle, marginTop: "0.5rem" }}
                  onFocus={(e) => (e.target.style.borderColor = "#2f6f6a")}
                  onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
                />
              )}
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Issue Date <span style={{ color: "#EF4444" }}>*</span></label>
                <input
                  type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)}
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = "#2f6f6a")}
                  onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Expiry Date</label>
                <input
                  type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)}
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = "#2f6f6a")}
                  onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
                />
              </div>
            </div>

            <label style={{ display: "flex", alignItems: "flex-start", gap: "0.625rem", cursor: "pointer" }}>
              <input
                type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)}
                style={{ marginTop: "0.15rem", flexShrink: 0, accentColor: "#2f6f6a", width: "15px", height: "15px" }}
              />
              <span style={{ fontSize: "0.8125rem", color: "#374151", lineHeight: 1.5 }}>
                I confirm the details entered above are true and correct
              </span>
            </label>

            <div>
              <label style={labelStyle}>Confirmation Initials <span style={{ color: "#EF4444" }}>*</span></label>
              <input
                type="text" value={initials}
                onChange={(e) => setInitials(e.target.value.toUpperCase().slice(0, 4))}
                placeholder="e.g. JB" maxLength={4}
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
                onClick={handleSubmit}
                disabled={saving}
                style={{
                  flex: 1, padding: "0.75rem", borderRadius: "1rem", border: "none",
                  background: "#2f6f6a", color: "#FFFFFF", fontSize: "0.875rem", fontWeight: 500,
                  cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit",
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? "Adding..." : `Add to ${selectedCardholders.length} Cardholder${selectedCardholders.length !== 1 ? "s" : ""}`}
              </button>
              <button
                onClick={onClose}
                disabled={saving}
                style={{
                  padding: "0.75rem 1.25rem", borderRadius: "1rem",
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
