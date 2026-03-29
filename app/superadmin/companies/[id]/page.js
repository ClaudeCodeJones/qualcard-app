"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { supabase } from "@/lib/supabase"
import Header from "@/app/components/Header"
import { ArrowLeft, Edit2, UserCircle, ToggleLeft, Trash2, Lock, ChevronDown, FileText, Image as ImageIcon } from "lucide-react"
import FileUploadArea from "@/app/components/FileUploadArea"

// ─── Constants ────────────────────────────────────────────────────────────────

const GRADIENT = "radial-gradient(circle, #34495E 0%, #2C3E50 100%)"

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
  return d.toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" })
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
}

const fieldLabelStyle = {
  display: "block",
  fontSize: "0.8125rem",
  fontWeight: 600,
  color: "#374151",
  marginBottom: "0.375rem",
}

function ModalOverlay({ onClose, children, maxWidth = "480px" }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(44, 62, 80, 0.45)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "1rem",
          padding: "2rem",
          width: "100%",
          maxWidth,
          boxShadow: "0 8px 32px rgba(44, 62, 80, 0.18)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

function ModalActions({ onCancel, onConfirm, confirmLabel, confirmBg, confirmColor = "#FFFFFF", saving, disabled }) {
  return (
    <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
      <button
        onClick={onConfirm}
        disabled={saving || disabled}
        style={{
          flex: 1,
          padding: "0.75rem",
          borderRadius: "1rem",
          border: "none",
          background: confirmBg,
          color: confirmColor,
          fontSize: "0.875rem",
          fontWeight: 500,
          cursor: saving || disabled ? "not-allowed" : "pointer",
          fontFamily: "inherit",
          opacity: saving || disabled ? 0.7 : 1,
        }}
      >
        {saving ? "Saving..." : confirmLabel}
      </button>
      <button
        onClick={onCancel}
        disabled={saving}
        style={{
          padding: "0.75rem 1.25rem",
          borderRadius: "1rem",
          border: "1.5px solid #E5E7EB",
          background: "#FFFFFF",
          color: "#374151",
          fontSize: "0.875rem",
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        Cancel
      </button>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const map = {
    active:   { label: "Active",   bg: "#2f6f6a" },
    inactive: { label: "Inactive", bg: "#4A5568" },
    pending:  { label: "Pending",  bg: "#F97316" },
  }
  const { label, bg } = map[status] ?? { label: status, bg: "#4A5568" }
  return (
    <span style={{
      display: "inline-block",
      padding: "0.25rem 0.875rem",
      borderRadius: "1rem",
      border: "1.5px solid #FFFFFF",
      background: bg,
      color: "#FFFFFF",
      fontSize: "0.8125rem",
      fontWeight: 600,
      letterSpacing: "0.01em",
    }}>
      {label}
    </span>
  )
}

function ContactField({ label, value }) {
  return (
    <div>
      <p style={{
        margin: "0 0 0.25rem",
        fontSize: "0.6875rem",
        fontWeight: 700,
        color: "#6B7280",
        textTransform: "uppercase",
        letterSpacing: "0.07em",
      }}>
        {label}
      </p>
      <p style={{
        margin: 0,
        fontSize: "0.9375rem",
        color: value ? "#333333" : "#9CA3AF",
        lineHeight: 1.5,
      }}>
        {value || "\u2014"}
      </p>
    </div>
  )
}

function CardholderStatusBadge({ status }) {
  const map = {
    active:             { label: "Active",   color: "#2f6f6a" },
    inactive:           { label: "Inactive", color: "#4A5568" },
    pending:            { label: "Pending",  color: "#F97316" },
    pending_activation: { label: "Payment Pending",  color: "#F97316" },
  }
  const { label, color } = map[status] ?? { label: status, color: "#4A5568" }
  return (
    <span style={{
      padding: "0.2rem 0.625rem",
      borderRadius: "1rem",
      border: `1.5px solid ${color}`,
      color,
      fontSize: "0.75rem",
      fontWeight: 600,
      whiteSpace: "nowrap",
    }}>
      {label}
    </span>
  )
}

function CardholderAvatar({ photoUrl, name }) {
  if (photoUrl) {
    return (
      <div style={{ width: 40, height: 40, borderRadius: "50%", overflow: "hidden", flexShrink: 0 }}>
        <Image
          src={photoUrl}
          alt={name || ""}
          width={40}
          height={40}
          style={{ objectFit: "cover", width: "100%", height: "100%" }}
        />
      </div>
    )
  }
  return (
    <div style={{
      width: 40,
      height: 40,
      borderRadius: "50%",
      background: GRADIENT,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#FFFFFF",
      fontSize: "0.8125rem",
      fontWeight: 700,
      flexShrink: 0,
      letterSpacing: "-0.01em",
    }}>
      {getInitials(name)}
    </div>
  )
}

// ─── Modals ────────────────────────────────────────────────────────────────────

function EditGeneralModal({ company, token, onSave, onClose }) {
  const [form, setForm] = useState({
    phone: company.phone || "",
    general_email: company.general_email || "",
    street_address: company.street_address || "",
    suburb: company.suburb || "",
    city: company.city || "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const fields = [
    { key: "phone", label: "Phone" },
    { key: "general_email", label: "General Email", type: "email" },
    { key: "street_address", label: "Street Address" },
    { key: "suburb", label: "Suburb" },
    { key: "city", label: "City" },
  ]

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/superadmin/companies/${company.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); setSaving(false); return }
      onSave(data.company)
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <h2 style={{ margin: "0 0 1.5rem", fontSize: "1.0625rem", fontWeight: 700, color: "#333333" }}>
        Edit General Contact
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {fields.map(({ key, label, type = "text" }) => (
          <div key={key}>
            <label style={fieldLabelStyle}>{label}</label>
            <input
              type={type}
              value={form[key]}
              onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "#2f6f6a")}
              onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
            />
          </div>
        ))}
      </div>
      {error && <p style={{ margin: "0.75rem 0 0", color: "#EF4444", fontSize: "0.8125rem" }}>{error}</p>}
      <ModalActions
        onCancel={onClose}
        onConfirm={handleSave}
        confirmLabel="Save Changes"
        confirmBg="#2f6f6a"
        saving={saving}
      />
    </ModalOverlay>
  )
}

function EditPrimaryModal({ company, token, onSave, onClose }) {
  const [form, setForm] = useState({
    primary_contact_name: company.primary_contact_name || "",
    primary_contact_email: company.primary_contact_email || "",
    primary_contact_phone: company.primary_contact_phone || "",
    primary_contact_role: company.primary_contact_role || "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const fields = [
    { key: "primary_contact_name", label: "Contact Name" },
    { key: "primary_contact_role", label: "Primary Contact Role", placeholder: "e.g. Health & Safety Manager" },
    { key: "primary_contact_email", label: "Contact Email", type: "email" },
    { key: "primary_contact_phone", label: "Contact Phone" },
  ]

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/superadmin/companies/${company.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); setSaving(false); return }
      onSave(data.company)
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <h2 style={{ margin: "0 0 1.5rem", fontSize: "1.0625rem", fontWeight: 700, color: "#333333" }}>
        Edit Primary Contact
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {fields.map(({ key, label, type = "text", placeholder }) => (
          <div key={key}>
            <label style={fieldLabelStyle}>{label}</label>
            <input
              type={type}
              placeholder={placeholder}
              value={form[key]}
              onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "#2f6f6a")}
              onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
            />
          </div>
        ))}
      </div>
      {error && <p style={{ margin: "0.75rem 0 0", color: "#EF4444", fontSize: "0.8125rem" }}>{error}</p>}
      <ModalActions
        onCancel={onClose}
        onConfirm={handleSave}
        confirmLabel="Save Changes"
        confirmBg="#2f6f6a"
        saving={saving}
      />
    </ModalOverlay>
  )
}

function EditLogoModal({ company, token, onSave, onClose }) {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const filePath = `${company.id}/${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage
        .from("company-logos")
        .upload(filePath, file, { contentType: file.type, upsert: false })
      if (uploadError) {
        setError(uploadError.message)
        setUploading(false)
        return
      }
      const { data: { publicUrl } } = supabase.storage.from("company-logos").getPublicUrl(filePath)
      const res = await fetch(`/api/superadmin/companies/${company.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ logo_url: publicUrl }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); setUploading(false); return }
      onSave(data.company)
    } catch (e) {
      setError(e.message)
      setUploading(false)
    }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <h2 style={{ margin: "0 0 1.25rem", fontSize: "1.0625rem", fontWeight: 700, color: "#333333" }}>
        Upload Company Logo
      </h2>
      <div style={{ marginBottom: "1.25rem" }}>
        <FileUploadArea
          accept="image/jpeg,image/png,image/webp"
          file={file}
          onFile={(f) => { setFile(f); setError(null) }}
        />
      </div>
      {uploading && (
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.875rem", color: "#374151", textAlign: "center" }}>
          Uploading...
        </p>
      )}
      {error && <p style={{ margin: "0 0 0.75rem", fontSize: "0.8125rem", color: "#EF4444" }}>{error}</p>}
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          style={{
            flex: 1,
            padding: "0.75rem",
            borderRadius: "1rem",
            border: "none",
            background: "#2f6f6a",
            color: "#FFFFFF",
            fontSize: "0.875rem",
            fontWeight: 500,
            cursor: !file || uploading ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            opacity: !file || uploading ? 0.6 : 1,
          }}
        >
          {uploading ? "Uploading..." : "Upload Logo"}
        </button>
        <button
          onClick={onClose}
          disabled={uploading}
          style={{
            padding: "0.75rem 1.25rem",
            borderRadius: "1rem",
            border: "1.5px solid #E5E7EB",
            background: "#FFFFFF",
            color: "#374151",
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Cancel
        </button>
      </div>
    </ModalOverlay>
  )
}

function ChangeStatusModal({ company, token, onSave, onClose }) {
  const isActive = company.status === "active"
  const nextStatus = isActive ? "inactive" : "active"
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleConfirm() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/superadmin/companies/${company.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); setSaving(false); return }
      onSave(data.company)
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <h2 style={{ margin: "0 0 0.75rem", fontSize: "1.0625rem", fontWeight: 700, color: "#333333" }}>
        {isActive ? "Deactivate Company?" : "Activate Company?"}
      </h2>
      <p style={{ margin: "0 0 1.5rem", fontSize: "0.9375rem", color: "#374151", lineHeight: 1.6 }}>
        {isActive
          ? "This will set the company to inactive. Company admins will lose access."
          : "This will set the company to active."}
      </p>
      {error && <p style={{ margin: "0 0 0.75rem", color: "#EF4444", fontSize: "0.8125rem" }}>{error}</p>}
      <ModalActions
        onCancel={onClose}
        onConfirm={handleConfirm}
        confirmLabel={isActive ? "Deactivate" : "Activate"}
        confirmBg={isActive ? "#EF4444" : "#2f6f6a"}
        saving={saving}
      />
    </ModalOverlay>
  )
}

function DeleteModal({ company, token, router, onClose }) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch(`/api/superadmin/companies/${company.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); setDeleting(false); return }
      router.replace("/superadmin?tab=companies")
    } catch (e) {
      setError(e.message)
      setDeleting(false)
    }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <h2 style={{ margin: "0 0 0.75rem", fontSize: "1.0625rem", fontWeight: 700, color: "#EF4444" }}>
        Delete Company?
      </h2>
      <p style={{ margin: "0 0 1.5rem", fontSize: "0.9375rem", color: "#374151", lineHeight: 1.6 }}>
        This will permanently delete this company and cannot be undone. All linked cardholders and users will be unlinked.
      </p>
      {error && <p style={{ margin: "0 0 0.75rem", color: "#EF4444", fontSize: "0.8125rem" }}>{error}</p>}
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button
          onClick={handleDelete}
          disabled={deleting}
          style={{
            flex: 1,
            padding: "0.75rem",
            borderRadius: "1rem",
            border: "none",
            background: "#EF4444",
            color: "#FFFFFF",
            fontSize: "0.875rem",
            fontWeight: 700,
            cursor: deleting ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            opacity: deleting ? 0.7 : 1,
          }}
        >
          {deleting ? "Deleting..." : "Delete Company"}
        </button>
        <button
          onClick={onClose}
          disabled={deleting}
          style={{
            padding: "0.75rem 1.25rem",
            borderRadius: "1rem",
            border: "1.5px solid #E5E7EB",
            background: "#FFFFFF",
            color: "#374151",
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Cancel
        </button>
      </div>
    </ModalOverlay>
  )
}

function EditCompanyNameModal({ company, token, onSave, onClose }) {
  const [name, setName] = useState(company.company_name || "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSave() {
    if (!name.trim()) { setError("Company name is required."); return }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/superadmin/companies/${company.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ company_name: name.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); setSaving(false); return }
      onSave(data.company)
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <h2 style={{ margin: "0 0 1.5rem", fontSize: "1.0625rem", fontWeight: 700, color: "#333333" }}>
        Edit Company Name
      </h2>
      <div>
        <label style={fieldLabelStyle}>Company Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={inputStyle}
          onFocus={(e) => (e.target.style.borderColor = "#2f6f6a")}
          onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
        />
      </div>
      {error && <p style={{ margin: "0.75rem 0 0", color: "#EF4444", fontSize: "0.8125rem" }}>{error}</p>}
      <ModalActions
        onCancel={onClose}
        onConfirm={handleSave}
        confirmLabel="Save Changes"
        confirmBg="#2f6f6a"
        saving={saving}
      />
    </ModalOverlay>
  )
}

function AddNoteModal({ companyId, token, currentUser, onAdd, onClose }) {
  const defaultInitials = currentUser ? getInitials(currentUser.full_name) : ""
  const [note, setNote] = useState("")
  const [initials, setInitials] = useState(defaultInitials)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const isValid = note.trim().length >= 10

  async function handleSave() {
    if (!isValid) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/superadmin/companies/${companyId}/notes`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ note: note.trim(), initials: initials.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); setSaving(false); return }
      onAdd(data.note)
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <h2 style={{ margin: "0 0 1.5rem", fontSize: "1.0625rem", fontWeight: 700, color: "#333333" }}>
        Add Note
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div>
          <label style={fieldLabelStyle}>Note</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={5}
            placeholder="Enter note (minimum 10 characters)..."
            style={{
              ...inputStyle,
              resize: "vertical",
              minHeight: "120px",
              lineHeight: 1.6,
            }}
            onFocus={(e) => (e.target.style.borderColor = "#2f6f6a")}
            onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
          />
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem", color: note.trim().length < 10 ? "#9CA3AF" : "#2f6f6a" }}>
            {note.trim().length} / 10 minimum characters
          </p>
        </div>
        <div>
          <label style={fieldLabelStyle}>Initials</label>
          <input
            type="text"
            value={initials}
            onChange={(e) => setInitials(e.target.value.slice(0, 4).toUpperCase())}
            maxLength={4}
            style={{ ...inputStyle, width: "80px" }}
            onFocus={(e) => (e.target.style.borderColor = "#2f6f6a")}
            onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
          />
        </div>
      </div>
      {error && <p style={{ margin: "0.75rem 0 0", color: "#EF4444", fontSize: "0.8125rem" }}>{error}</p>}
      <ModalActions
        onCancel={onClose}
        onConfirm={handleSave}
        confirmLabel="Add Note"
        confirmBg="#2f6f6a"
        saving={saving}
        disabled={!isValid}
      />
    </ModalOverlay>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CompanyDetailPage() {
  const router = useRouter()
  const { id } = useParams()

  const [token, setToken] = useState(null)
  const [company, setCompany] = useState(null)
  const [cardholders, setCardholders] = useState([])
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [contactTab, setContactTab] = useState("general")
  const [modal, setModal] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)
  const [cardholderSearch, setCardholderSearch] = useState("")
  const [showAllCardholders, setShowAllCardholders] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace("/login"); return }

      const tok = session.access_token
      setToken(tok)

      const { data: userData } = await supabase
        .from("users")
        .select("full_name, email, role")
        .eq("id", session.user.id)
        .single()
      setCurrentUser(userData ?? null)

      try {
        const res = await fetch(`/api/superadmin/companies/${id}`, {
          headers: { Authorization: `Bearer ${tok}` },
        })
        if (res.status === 401 || res.status === 403) {
          router.replace("/login")
          return
        }
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || "Failed to load company")
          setLoading(false)
          return
        }
        setCompany(data.company)
        setCardholders(data.cardholders ?? [])
        setNotes(data.notes ?? [])
      } catch (e) {
        setError(e.message)
      }

      setLoading(false)
    }

    if (id) load()
  }, [id, router])

  function showSuccess(msg) {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 2500)
  }

  function handleSave(updated, msg) {
    setCompany(updated)
    setModal(null)
    showSuccess(msg || "Changes saved")
  }

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#D9DEE5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Inter, system-ui, sans-serif",
      }}>
        <p style={{ color: "#374151", fontSize: "0.9375rem" }}>Loading...</p>
      </div>
    )
  }

  if (error || !company) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#D9DEE5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Inter, system-ui, sans-serif",
      }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "#EF4444", marginBottom: "1rem", fontSize: "0.9375rem" }}>
            {error || "Company not found"}
          </p>
          <Link href="/superadmin" style={{ color: "#34495E", fontWeight: 600, fontSize: "0.875rem" }}>
            Back to Admin
          </Link>
        </div>
      </div>
    )
  }

  const generalFields = [
    { label: "Phone",          value: company.phone },
    { label: "General Email",  value: company.general_email },
    { label: "Street Address", value: company.street_address },
    { label: "Suburb",         value: company.suburb },
    { label: "City",           value: company.city },
  ]

  const primaryFields = [
    { label: "Contact Name",  value: company.primary_contact_name },
    { label: "Contact Role",  value: company.primary_contact_role },
    { label: "Contact Email", value: company.primary_contact_email },
    { label: "Contact Phone", value: company.primary_contact_phone },
  ]

  const unpaidCount = cardholders.filter((ch) => ch.status === "pending_activation").length
  const filteredCardholders = cardholders.filter((ch) =>
    ch.full_name?.toLowerCase().includes(cardholderSearch.toLowerCase())
  )
  const INITIAL_SHOW = 3
  const displayedCardholders = cardholderSearch
    ? filteredCardholders
    : showAllCardholders ? filteredCardholders : filteredCardholders.slice(0, INITIAL_SHOW)
  const hasMore = !cardholderSearch && !showAllCardholders && filteredCardholders.length > INITIAL_SHOW
  const moreCount = filteredCardholders.length - INITIAL_SHOW

  const actions = [
    {
      key: "changeStatus",
      Icon: ToggleLeft,
      label: "Change Status",
      desc: "Toggle Active / Inactive",
      iconBg: "#2f6f6a",
    },
    {
      key: "delete",
      Icon: Trash2,
      label: "Delete Company",
      desc: "Permanently remove",
      iconBg: "#EF4444",
      destructive: true,
    },
    {
      key: "editCompanyName",
      Icon: Edit2,
      label: "Edit Company Name",
      desc: "Update the company's trading name",
      iconBg: "#2f6f6a",
    },
  ]

  return (
    <div style={{
      minHeight: "100vh",
      background: "#D9DEE5",
      fontFamily: "Inter, system-ui, sans-serif",
    }}>
      <Header user={currentUser} />
      <div style={{
        maxWidth: "1280px",
        margin: "0 auto",
        padding: "2rem 1.5rem 4rem",
      }}>

        {/* ── Section 1: Back button ───────────────────────────────────── */}
        <Link
          href="/superadmin?tab=companies"
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
          Back to Companies
        </Link>

        {/* Success toast */}
        {successMsg && (
          <div style={{
            marginBottom: "1rem",
            padding: "0.75rem 1.25rem",
            background: "#2f6f6a",
            color: "#FFFFFF",
            borderRadius: "0.75rem",
            fontSize: "0.875rem",
            fontWeight: 500,
            boxShadow: "0 2px 8px rgba(47, 111, 106, 0.3)",
          }}>
            {successMsg}
          </div>
        )}

        {/* ── Section 2: Header card ───────────────────────────────────── */}
        <div style={{
          background: GRADIENT,
          borderRadius: "1rem",
          padding: "2rem",
          marginBottom: "1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "2rem",
          boxShadow: "0 4px 20px rgba(44, 62, 80, 0.2), 0 1px 4px rgba(44, 62, 80, 0.12)",
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{
              margin: "0 0 0.75rem",
              fontSize: "clamp(1.375rem, 3vw, 2rem)",
              fontWeight: 800,
              color: "#FFFFFF",
              textTransform: "uppercase",
              letterSpacing: "0.03em",
              lineHeight: 1.1,
            }}>
              {company.company_name}
            </h1>
            <StatusBadge status={company.status} />
          </div>

          <div style={{ position: "relative", width: "fit-content" }}>
            {company.logo_url ? (
              <div style={{
                background: "#FFFFFF",
                borderRadius: "0.875rem",
                padding: "0.75rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 96,
                height: 80,
                flexShrink: 0,
              }}>
                <Image
                  src={company.logo_url}
                  alt={`${company.company_name} logo`}
                  width={80}
                  height={56}
                  style={{ objectFit: "contain", width: "100%", height: "auto" }}
                />
              </div>
            ) : (
              <div style={{
                background: "#FFFFFF",
                borderRadius: "0.75rem",
                border: "1px solid #E5E7EB",
                boxShadow: "0 2px 8px rgba(44, 62, 80, 0.10)",
                width: 80,
                height: 80,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}>
                <span style={{
                  color: "#2C3E50",
                  fontSize: "1.5rem",
                  fontWeight: 700,
                }}>
                {getInitials(company.company_name)}
              </span>
            </div>
            )}
            <button
              onClick={() => setModal("editLogo")}
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                background: "#2f6f6a",
                border: "none",
                borderRadius: "50%",
                width: 32,
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#FFFFFF",
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#1F2937" }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#2f6f6a" }}
              title="Edit logo"
            >
              <Edit2 size={16} />
            </button>
          </div>
        </div>

        {/* ── Section 3: Contact tabs ──────────────────────────────────── */}
        <div style={{
          background: "#FFFFFF",
          borderRadius: "1rem",
          marginBottom: "1.5rem",
          boxShadow: "0 2px 8px rgba(44, 62, 80, 0.07), 0 1px 3px rgba(44, 62, 80, 0.04)",
          overflow: "hidden",
        }}>
          <div style={{
            display: "flex",
            gap: "0.5rem",
            padding: "0.875rem 1.25rem",
            borderBottom: "1px solid #E5E7EB",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {[
                { key: "general", label: "General Contact" },
                { key: "primary", label: "Primary Contact" },
              ].map(({ key, label }) => {
                const isActive = contactTab === key
                return (
                  <button
                    key={key}
                    onClick={() => setContactTab(key)}
                    style={{
                      padding: "0.5rem 1.125rem",
                      borderRadius: "1rem",
                      border: isActive ? "none" : "1.5px solid #E5E7EB",
                      cursor: "pointer",
                      fontSize: "0.875rem",
                      fontWeight: isActive ? 600 : 400,
                      fontFamily: "inherit",
                      background: isActive ? GRADIENT : "#FFFFFF",
                      color: isActive ? "#FFFFFF" : "#374151",
                      transition: "background 0.15s ease, color 0.15s ease, border-color 0.15s ease",
                    }}
                    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.borderColor = "#34495E" }}
                    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.borderColor = "#E5E7EB" }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
            <button
              onClick={() => setModal(contactTab === "general" ? "editGeneral" : "editPrimary")}
              style={{
                background: "none",
                border: "none",
                padding: "0.375rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#2f6f6a",
                transition: "color 0.15s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#1F2937" }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#2f6f6a" }}
              title="Edit contact information"
            >
              <Edit2 size={16} />
            </button>
          </div>

          <div style={{
            padding: "1.75rem 1.5rem",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: "1.5rem 2rem",
          }}>
            {(contactTab === "general" ? generalFields : primaryFields).map(({ label, value }) => (
              <ContactField key={label} label={label} value={value} />
            ))}
          </div>
        </div>

        {/* ── Section 4: Cardholders ──────────────────────────────────── */}
        <div style={{
          background: "#FFFFFF",
          borderRadius: "1rem",
          marginBottom: "1.5rem",
          boxShadow: "0 2px 8px rgba(44, 62, 80, 0.07), 0 1px 3px rgba(44, 62, 80, 0.04)",
          overflow: "hidden",
          paddingBottom: "1rem",
        }}>

          {/* Header */}
          <div style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid #E5E7EB",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "1rem",
            flexWrap: "wrap",
          }}>
            <div>
              <p style={{
                margin: "0 0 0.25rem",
                fontSize: "0.8125rem",
                fontWeight: 700,
                color: "#333333",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}>
                Cardholders
              </p>
              <p style={{ margin: 0, fontSize: "0.8125rem", color: "#6B7280" }}>
                {cardholders.length} total{unpaidCount > 0 ? `, ${unpaidCount} unpaid` : ""}
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {["Bulk Update", "Bulk Upload"].map((label) => (
                <button
                  key={label}
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "1rem",
                    border: "1.5px solid #E5E7EB",
                    background: "#FFFFFF",
                    color: "#374151",
                    fontSize: "0.8125rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#34495E")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#E5E7EB")}
                >
                  {label}
                </button>
              ))}
              <button
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "1rem",
                  border: "none",
                  background: "#2f6f6a",
                  color: "#FFFFFF",
                  fontSize: "0.8125rem",
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                + Add Cardholder
              </button>
            </div>
          </div>

          {/* Unpaid alert */}
          {unpaidCount > 0 && (
            <div style={{
              margin: "1rem 1.5rem 0",
              padding: "0.75rem 1rem",
              background: "#FFF7ED",
              border: "1px solid rgba(249, 115, 22, 0.2)",
              borderRadius: "0.625rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
            }}>
              <p style={{ margin: 0, fontSize: "0.875rem", color: "#374151" }}>
                <strong>{unpaidCount}</strong> cardholder{unpaidCount > 1 ? "s" : ""} unpaid and pending activation.
              </p>
              <a
                href="#"
                style={{ fontSize: "0.875rem", fontWeight: 700, color: "#F97316", textDecoration: "none", whiteSpace: "nowrap" }}
                onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
              >
                Activate now
              </a>
            </div>
          )}

          {/* Search */}
          <div style={{ padding: "1rem 1.5rem" }}>
            <input
              type="text"
              placeholder="Search cardholders by name..."
              value={cardholderSearch}
              onChange={(e) => { setCardholderSearch(e.target.value); setShowAllCardholders(false) }}
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "#2f6f6a")}
              onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
            />
          </div>

          {/* List */}
          {filteredCardholders.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
              <p style={{ margin: 0, color: "#9CA3AF", fontSize: "0.9375rem" }}>
                {cardholderSearch ? "No cardholders match your search" : "No cardholders yet"}
              </p>
            </div>
          ) : (
            <>
              {displayedCardholders.map((ch, i) => (
                <div
                  key={ch.id}
                  onClick={() => router.push(`/superadmin/cardholders/${ch.id}`)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.875rem",
                    padding: "0.75rem 1.5rem",
                    cursor: "pointer",
                    borderTop: i === 0 ? "1px solid #F3F4F6" : "1px solid #F3F4F6",
                    transition: "background-color 0.1s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F9FAFB")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <CardholderAvatar photoUrl={ch.photo_url} name={ch.full_name} />
                  <span style={{ flex: 1, fontSize: "0.9375rem", fontWeight: 500, color: "#333333" }}>
                    {ch.full_name}
                  </span>
                  <CardholderStatusBadge status={ch.status} />
                </div>
              ))}

              {hasMore && (
                <div style={{ textAlign: "center", padding: "0.875rem 1.5rem", borderTop: "1px solid #F3F4F6" }}>
                  <button
                    onClick={() => setShowAllCardholders(true)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.375rem",
                      background: "none",
                      border: "1.5px solid #E5E7EB",
                      borderRadius: "1rem",
                      padding: "0.4375rem 1.25rem",
                      fontSize: "0.8125rem",
                      fontWeight: 600,
                      color: "#374151",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#34495E")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#E5E7EB")}
                  >
                    Show All ({moreCount} more)
                    <ChevronDown size={14} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Section 5: Notes ─────────────────────────────────────────── */}
        <div style={{
          background: "#FFFFFF",
          borderRadius: "1rem",
          marginBottom: "1.5rem",
          boxShadow: "0 2px 8px rgba(44, 62, 80, 0.07), 0 1px 3px rgba(44, 62, 80, 0.04)",
          overflow: "hidden",
        }}>
          <div style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid #E5E7EB",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
              <FileText size={16} color="#6B7280" />
              <div>
                <p style={{
                  margin: "0 0 0.125rem",
                  fontSize: "0.8125rem",
                  fontWeight: 700,
                  color: "#333333",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}>
                  Notes
                </p>
                <p style={{ margin: 0, fontSize: "0.8125rem", color: "#6B7280" }}>
                  {notes.length} {notes.length === 1 ? "note" : "notes"} &middot; <span style={{ color: "#9CA3AF" }}>QC Admin only — not visible to the company</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => setModal("addNote")}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "1rem",
                border: "none",
                background: "#2f6f6a",
                color: "#FFFFFF",
                fontSize: "0.8125rem",
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "inherit",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              + Add Note
            </button>
          </div>

          {notes.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
              <p style={{ margin: 0, color: "#9CA3AF", fontSize: "0.9375rem" }}>No notes yet</p>
            </div>
          ) : (
            <div>
              {notes.map((n, i) => (
                <div
                  key={n.id}
                  style={{
                    padding: "1.25rem 1.5rem",
                    borderTop: i === 0 ? "none" : "1px solid #F3F4F6",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.625rem" }}>
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: n.initials ? GRADIENT : "#E5E7EB",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#FFFFFF",
                      fontSize: "0.6875rem",
                      fontWeight: 700,
                      flexShrink: 0,
                      letterSpacing: "0.02em",
                    }}>
                      {n.initials || ""}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: "0.8125rem", fontWeight: 600, color: "#374151" }}>
                        {n.author_name ?? "QualCard Admin"}
                      </p>
                      <p style={{ margin: 0, fontSize: "0.75rem", color: "#9CA3AF" }}>
                        {formatDate(n.created_at)}
                      </p>
                    </div>
                  </div>
                  <p style={{
                    margin: 0,
                    fontSize: "0.9375rem",
                    color: "#333333",
                    lineHeight: 1.7,
                    paddingLeft: "2.75rem",
                  }}>
                    {n.note}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Section 6: Action grid ───────────────────────────────────── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "1rem",
        }}>
          {actions.map((action, i) => {
            const { Icon, label, desc, iconBg, destructive, muted, key } = action
            const isClickable = key !== null && !muted

            return (
              <div
                key={i}
                onClick={isClickable ? () => setModal(key) : undefined}
                style={{
                  background: "#FFFFFF",
                  borderRadius: "1rem",
                  padding: "1.75rem 1.5rem",
                  textAlign: "center",
                  cursor: isClickable ? "pointer" : "default",
                  boxShadow: "0 2px 8px rgba(44, 62, 80, 0.07), 0 1px 3px rgba(44, 62, 80, 0.04)",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease",
                  opacity: muted ? 0.55 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!isClickable) return
                  e.currentTarget.style.transform = "translateY(-2px)"
                  e.currentTarget.style.boxShadow = destructive
                    ? "0 6px 20px rgba(239, 68, 68, 0.15), 0 2px 8px rgba(44, 62, 80, 0.08)"
                    : "0 6px 20px rgba(44, 62, 80, 0.12), 0 2px 8px rgba(44, 62, 80, 0.06)"
                  if (destructive) e.currentTarget.style.background = "#FEF2F2"
                }}
                onMouseLeave={(e) => {
                  if (!isClickable) return
                  e.currentTarget.style.transform = "translateY(0)"
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(44, 62, 80, 0.07), 0 1px 3px rgba(44, 62, 80, 0.04)"
                  e.currentTarget.style.background = "#FFFFFF"
                }}
              >
                <div style={{
                  width: 60,
                  height: 60,
                  borderRadius: "50%",
                  background: iconBg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 1rem",
                }}>
                  <Icon size={24} color={muted ? "#9CA3AF" : "#FFFFFF"} strokeWidth={1.75} />
                </div>
                <p style={{
                  margin: "0 0 0.375rem",
                  fontSize: "0.9375rem",
                  fontWeight: 700,
                  color: muted ? "#9CA3AF" : destructive ? "#EF4444" : "#333333",
                  lineHeight: 1.3,
                }}>
                  {label}
                </p>
                <p style={{
                  margin: 0,
                  fontSize: "0.8125rem",
                  color: "#6B7280",
                  lineHeight: 1.5,
                }}>
                  {desc}
                </p>
              </div>
            )
          })}
        </div>

      </div>

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      {modal === "editCompanyName" && (
        <EditCompanyNameModal
          company={company}
          token={token}
          onSave={(updated) => handleSave(updated, "Company name updated")}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "editGeneral" && (
        <EditGeneralModal
          company={company}
          token={token}
          onSave={(updated) => handleSave(updated, "General contact updated")}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "editPrimary" && (
        <EditPrimaryModal
          company={company}
          token={token}
          onSave={(updated) => handleSave(updated, "Primary contact updated")}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "editLogo" && (
        <EditLogoModal
          company={company}
          token={token}
          onSave={(updated) => handleSave(updated, "Logo updated")}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "changeStatus" && (
        <ChangeStatusModal
          company={company}
          token={token}
          onSave={(updated) => handleSave(updated, "Status updated")}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "delete" && (
        <DeleteModal
          company={company}
          token={token}
          router={router}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "addNote" && (
        <AddNoteModal
          companyId={id}
          token={token}
          currentUser={currentUser}
          onAdd={(newNote) => {
            setNotes((prev) => [newNote, ...prev])
            setModal(null)
            showSuccess("Note added")
          }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
