"use client"

import { useEffect, useState } from "react"
import { Trash2, Users, Building2 } from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function SettingsPage() {
  const [admins, setAdmins] = useState([])
  const [canRemove, setCanRemove] = useState(false)
  const [isAtLimit, setIsAtLimit] = useState(false)
  const [callerId, setCallerId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [removeConfirm, setRemoveConfirm] = useState(null)
  const [inviteError, setInviteError] = useState(null)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [removeLoading, setRemoveLoading] = useState(false)

  const [company, setCompany] = useState(null)
  const [companyLoading, setCompanyLoading] = useState(true)
  const [companyError, setCompanyError] = useState(null)
  const [isEditDetailsOpen, setIsEditDetailsOpen] = useState(false)
  const [isEditContactOpen, setIsEditContactOpen] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState(null)

  const fetchAdmins = async () => {
    try {
      setLoading(true)
      setError(null)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch("/api/dashboard/admins", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      })

      const result = await response.json()
      if (!response.ok) {
        setError(result.error || "Failed to load admins")
        return
      }

      setAdmins(result.admins || [])
      setCanRemove(result.canRemove)
      setIsAtLimit(result.isAtLimit)
      setCallerId(result.callerId)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchCompany = async () => {
    try {
      setCompanyLoading(true)
      setCompanyError(null)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch("/api/dashboard/company", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      })

      const result = await response.json()
      if (!response.ok) {
        setCompanyError(result.error || "Failed to load company")
        return
      }

      setCompany(result.company)
    } catch (err) {
      setCompanyError(err.message)
    } finally {
      setCompanyLoading(false)
    }
  }

  useEffect(() => {
    fetchAdmins()
    fetchCompany()
  }, [])

  const handleInvite = async (fullName, email) => {
    try {
      setInviteLoading(true)
      setInviteError(null)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch("/api/dashboard/admins", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ full_name: fullName, email }),
      })

      const result = await response.json()
      if (!response.ok) {
        setInviteError(result.error || "Failed to invite admin")
        return
      }

      setIsInviteOpen(false)
      fetchAdmins()
    } catch (err) {
      setInviteError(err.message)
    } finally {
      setInviteLoading(false)
    }
  }

  const handleRemove = async (adminId) => {
    try {
      setRemoveLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`/api/dashboard/admins/${adminId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      })

      const result = await response.json()
      if (!response.ok) {
        setError(result.error || "Failed to remove admin")
        return
      }

      setRemoveConfirm(null)
      fetchAdmins()
    } catch (err) {
      setError(err.message)
    } finally {
      setRemoveLoading(false)
    }
  }

  const handleUpdateCompany = async (updates) => {
    try {
      setEditLoading(true)
      setEditError(null)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch("/api/dashboard/company", {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      })

      const result = await response.json()
      if (!response.ok) {
        setEditError(result.error || "Failed to update company")
        return
      }

      setCompany(result.company)
      setIsEditDetailsOpen(false)
      setIsEditContactOpen(false)
    } catch (err) {
      setEditError(err.message)
    } finally {
      setEditLoading(false)
    }
  }

  const CARD = {
    background: "#FFFFFF",
    borderRadius: "0.75rem",
    border: "1px solid #E5E7EB",
    padding: "1.5rem",
    boxShadow: "0 1px 3px rgba(44,62,80,0.06), 0 4px 12px rgba(44,62,80,0.08)",
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* Header */}
      <div>
        <h1 style={{ color: "#2C3E50", fontSize: "1.5rem", fontWeight: 700, margin: 0, letterSpacing: "-0.03em" }}>
          Company Settings
        </h1>
        <p style={{ color: "#6B7280", fontSize: "0.9375rem", margin: "0.5rem 0 0" }}>
          Manage your company information
        </p>
      </div>

      {/* Company Admins Card */}
      <div style={CARD}>
        {/* Card Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Users size={20} style={{ color: "#374151" }} />
            <h2 style={{ color: "#1F2937", fontSize: "1.125rem", fontWeight: 600, margin: 0 }}>
              Company Admins
            </h2>
          </div>
          <button
            onClick={() => setIsInviteOpen(true)}
            disabled={isAtLimit}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.625rem 1rem",
              background: "#2f6f6a",
              border: "none",
              borderRadius: "0.5rem",
              color: "#fff",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: isAtLimit ? "not-allowed" : "pointer",
              opacity: isAtLimit ? 0.6 : 1,
              transition: "all 0.15s ease",
              fontFamily: "inherit",
            }}
            onMouseEnter={e => {
              if (!isAtLimit) e.currentTarget.style.background = "#1F5A55"
            }}
            onMouseLeave={e => {
              if (!isAtLimit) e.currentTarget.style.background = "#2f6f6a"
            }}
            title={isAtLimit ? "Admin limit reached (4 max)" : ""}
          >
            + Invite Admin
          </button>
        </div>

        {/* Admin List */}
        {loading ? (
          <p style={{ color: "#9CA3AF", fontSize: "0.875rem", margin: 0 }}>Loading admins…</p>
        ) : error ? (
          <p style={{ color: "#EF4444", fontSize: "0.875rem", margin: 0 }}>{error}</p>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: admins.length > 0 ? "1.5rem" : 0 }}>
              {admins.map(admin => (
                <div
                  key={admin.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "1rem",
                    background: "#F9FAFB",
                    border: "1px solid #E5E7EB",
                    borderRadius: "0.5rem",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = "#F3F4F6"
                    e.currentTarget.style.borderColor = "#D1D5DB"
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = "#F9FAFB"
                    e.currentTarget.style.borderColor = "#E5E7EB"
                  }}
                >
                  {removeConfirm === admin.id ? (
                    /* Inline Confirmation */
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem", width: "100%" }}>
                      <div>
                        <p style={{ color: "#1F2937", fontSize: "0.875rem", fontWeight: 500, margin: 0 }}>
                          Remove {admin.full_name}?
                        </p>
                        <p style={{ color: "#6B7280", fontSize: "0.75rem", margin: "0.25rem 0 0" }}>
                          This action cannot be undone.
                        </p>
                      </div>
                      <div style={{ display: "flex", gap: "0.5rem", marginLeft: "auto", flexShrink: 0 }}>
                        <button
                          onClick={() => handleRemove(admin.id)}
                          disabled={removeLoading}
                          style={{
                            padding: "0.5rem 1rem",
                            background: "#EF4444",
                            border: "none",
                            borderRadius: "0.375rem",
                            color: "#fff",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            cursor: removeLoading ? "not-allowed" : "pointer",
                            opacity: removeLoading ? 0.6 : 1,
                            transition: "all 0.15s ease",
                            fontFamily: "inherit",
                          }}
                          onMouseEnter={e => {
                            if (!removeLoading) e.currentTarget.style.background = "#DC2626"
                          }}
                          onMouseLeave={e => {
                            if (!removeLoading) e.currentTarget.style.background = "#EF4444"
                          }}
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setRemoveConfirm(null)}
                          style={{
                            padding: "0.5rem 1rem",
                            background: "#E5E7EB",
                            border: "none",
                            borderRadius: "0.375rem",
                            color: "#374151",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                            fontFamily: "inherit",
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = "#D1D5DB"
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = "#E5E7EB"
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Normal View */
                    <>
                      <div style={{ flex: 1 }}>
                        <p style={{ color: "#1F2937", fontSize: "0.9375rem", fontWeight: 600, margin: 0 }}>
                          {admin.full_name}
                          {admin.id === callerId && (
                            <span style={{ color: "#6B7280", fontSize: "0.8125rem", fontWeight: 500, marginLeft: "0.5rem" }}>
                              (You)
                            </span>
                          )}
                        </p>
                        <p style={{ color: "#6B7280", fontSize: "0.8125rem", margin: "0.25rem 0 0" }}>
                          {admin.email}
                        </p>
                      </div>
                      <button
                        onClick={() => setRemoveConfirm(admin.id)}
                        disabled={!canRemove}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "36px",
                          height: "36px",
                          background: "transparent",
                          border: "none",
                          borderRadius: "0.375rem",
                          color: canRemove ? "#EF4444" : "#D1D5DB",
                          cursor: canRemove ? "pointer" : "not-allowed",
                          transition: "all 0.15s ease",
                          opacity: canRemove ? 1 : 0.5,
                        }}
                        onMouseEnter={e => {
                          if (canRemove) e.currentTarget.style.background = "#FEE2E2"
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = "transparent"
                        }}
                        title={canRemove ? "Remove admin" : "Cannot remove the last admin"}
                      >
                        <Trash2 size={18} strokeWidth={2} />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Warning if only 1 admin */}
            {admins.length === 1 && (
              <div style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0.75rem",
                padding: "1rem",
                background: "#FEF3C7",
                border: "1px solid #FCD34D",
                borderRadius: "0.5rem",
              }}>
                <div style={{ color: "#92400E", fontSize: "0.875rem", lineHeight: 1.4 }}>
                  <p style={{ margin: 0, fontWeight: 600 }}>One admin required</p>
                  <p style={{ margin: "0.25rem 0 0", fontSize: "0.8125rem", opacity: 0.8 }}>
                    A company must have at least one admin. Add another admin before removing this one.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Company Information Card */}
      <div style={CARD}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Building2 size={20} style={{ color: "#374151" }} />
            <h2 style={{ color: "#1F2937", fontSize: "1.125rem", fontWeight: 600, margin: 0 }}>
              Company Information
            </h2>
          </div>
          <button
            onClick={() => setIsEditDetailsOpen(true)}
            style={{
              padding: "0.625rem 1rem",
              background: "#E5E7EB",
              border: "1px solid #D1D5DB",
              borderRadius: "0.5rem",
              color: "#374151",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s ease",
              fontFamily: "inherit",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "#D1D5DB"
              e.currentTarget.style.borderColor = "#9CA3AF"
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "#E5E7EB"
              e.currentTarget.style.borderColor = "#D1D5DB"
            }}
          >
            Edit Details
          </button>
        </div>

        {companyLoading ? (
          <p style={{ color: "#9CA3AF", fontSize: "0.875rem", margin: 0 }}>Loading…</p>
        ) : companyError ? (
          <p style={{ color: "#EF4444", fontSize: "0.875rem", margin: 0 }}>{companyError}</p>
        ) : company ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
            <CompanyField label="Company Name" value={company.company_name} />
            <CompanyField label="Phone" value={company.phone} />
            <CompanyField label="Email" value={company.general_email} />
            <CompanyField label="Address" value={company.street_address ? `${company.street_address}, ${company.suburb || ""} ${company.city || ""}`.trim() : null} />
          </div>
        ) : null}
      </div>

      {/* Primary Contact Card */}
      <div style={CARD}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
          <h2 style={{ color: "#1F2937", fontSize: "1.125rem", fontWeight: 600, margin: 0 }}>
            Primary Contact
          </h2>
          <button
            onClick={() => setIsEditContactOpen(true)}
            style={{
              padding: "0.625rem 1rem",
              background: "#E5E7EB",
              border: "1px solid #D1D5DB",
              borderRadius: "0.5rem",
              color: "#374151",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s ease",
              fontFamily: "inherit",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "#D1D5DB"
              e.currentTarget.style.borderColor = "#9CA3AF"
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "#E5E7EB"
              e.currentTarget.style.borderColor = "#D1D5DB"
            }}
          >
            Edit Contact
          </button>
        </div>

        {companyLoading ? (
          <p style={{ color: "#9CA3AF", fontSize: "0.875rem", margin: 0 }}>Loading…</p>
        ) : companyError ? (
          <p style={{ color: "#EF4444", fontSize: "0.875rem", margin: 0 }}>{companyError}</p>
        ) : company ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
            <CompanyField label="Name" value={company.primary_contact_name} />
            <CompanyField label="Phone" value={company.primary_contact_phone} />
            <CompanyField label="Email" value={company.primary_contact_email} />
            <CompanyField label="Role" value={company.primary_contact_role} />
          </div>
        ) : null}
      </div>

      {/* Invite Admin Modal */}
      {isInviteOpen && (
        <InviteAdminModal
          onClose={() => {
            setIsInviteOpen(false)
            setInviteError(null)
          }}
          onSubmit={handleInvite}
          isLoading={inviteLoading}
          error={inviteError}
        />
      )}

      {/* Edit Details Modal */}
      {isEditDetailsOpen && company && (
        <EditDetailsModal
          company={company}
          onClose={() => {
            setIsEditDetailsOpen(false)
            setEditError(null)
          }}
          onSubmit={handleUpdateCompany}
          isLoading={editLoading}
          error={editError}
        />
      )}

      {/* Edit Contact Modal */}
      {isEditContactOpen && company && (
        <EditContactModal
          company={company}
          onClose={() => {
            setIsEditContactOpen(false)
            setEditError(null)
          }}
          onSubmit={handleUpdateCompany}
          isLoading={editLoading}
          error={editError}
        />
      )}
    </div>
  )
}

function CompanyField({ label, value }) {
  return (
    <div>
      <p style={{ color: "#6B7280", fontSize: "0.75rem", fontWeight: 500, margin: "0 0 0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </p>
      <p style={{ color: "#1F2937", fontSize: "0.9375rem", margin: 0 }}>
        {value || "—"}
      </p>
    </div>
  )
}

function InviteAdminModal({ onClose, onSubmit, isLoading, error }) {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")

  const handleSubmit = () => {
    if (!fullName.trim() || !email.trim()) {
      return
    }
    onSubmit(fullName.trim(), email.trim())
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
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
          boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
        }}
      >
        <h3 style={{ color: "#1F2937", fontSize: "1.25rem", fontWeight: 700, margin: "0 0 1.5rem" }}>
          Invite Admin
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", marginBottom: "1.5rem" }}>
          {/* Full Name */}
          <div>
            <label style={{ display: "block", color: "#374151", fontSize: "0.875rem", fontWeight: 500, marginBottom: "0.5rem" }}>
              Full Name
            </label>
            <input
              type="text"
              placeholder="e.g. Jane Smith"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              disabled={isLoading}
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
                transition: "all 0.15s ease",
                opacity: isLoading ? 0.6 : 1,
              }}
              onFocus={e => {
                if (!isLoading) {
                  e.currentTarget.style.borderColor = "#2f6f6a"
                  e.currentTarget.style.background = "#F3F4F6"
                }
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = "#E5E7EB"
                e.currentTarget.style.background = "#F9FAFB"
              }}
            />
          </div>

          {/* Email */}
          <div>
            <label style={{ display: "block", color: "#374151", fontSize: "0.875rem", fontWeight: 500, marginBottom: "0.5rem" }}>
              Email Address
            </label>
            <input
              type="email"
              placeholder="e.g. jane@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={isLoading}
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
                transition: "all 0.15s ease",
                opacity: isLoading ? 0.6 : 1,
              }}
              onFocus={e => {
                if (!isLoading) {
                  e.currentTarget.style.borderColor = "#2f6f6a"
                  e.currentTarget.style.background = "#F3F4F6"
                }
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = "#E5E7EB"
                e.currentTarget.style.background = "#F9FAFB"
              }}
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{ padding: "0.75rem 1rem", background: "#FEE2E2", border: "1px solid #FECACA", borderRadius: "0.375rem" }}>
              <p style={{ color: "#991B1B", fontSize: "0.875rem", margin: 0 }}>{error}</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            disabled={isLoading}
            style={{
              padding: "0.75rem 1.5rem",
              background: "#F3F4F6",
              border: "1px solid #E5E7EB",
              borderRadius: "0.5rem",
              color: "#374151",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: isLoading ? "not-allowed" : "pointer",
              opacity: isLoading ? 0.6 : 1,
              transition: "all 0.15s ease",
              fontFamily: "inherit",
            }}
            onMouseEnter={e => {
              if (!isLoading) e.currentTarget.style.background = "#E5E7EB"
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "#F3F4F6"
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || !fullName.trim() || !email.trim()}
            style={{
              padding: "0.75rem 1.5rem",
              background: "#2f6f6a",
              border: "none",
              borderRadius: "0.5rem",
              color: "#fff",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: isLoading || !fullName.trim() || !email.trim() ? "not-allowed" : "pointer",
              opacity: isLoading || !fullName.trim() || !email.trim() ? 0.6 : 1,
              transition: "all 0.15s ease",
              fontFamily: "inherit",
            }}
            onMouseEnter={e => {
              if (!isLoading && fullName.trim() && email.trim()) {
                e.currentTarget.style.background = "#1F5A55"
              }
            }}
            onMouseLeave={e => {
              if (!isLoading && fullName.trim() && email.trim()) {
                e.currentTarget.style.background = "#2f6f6a"
              }
            }}
          >
            {isLoading ? "Inviting…" : "Invite"}
          </button>
        </div>
      </div>
    </div>
  )
}

function EditDetailsModal({ company, onClose, onSubmit, isLoading, error }) {
  const [companyName, setCompanyName] = useState(company.company_name || "")
  const [streetAddress, setStreetAddress] = useState(company.street_address || "")
  const [suburb, setSuburb] = useState(company.suburb || "")
  const [city, setCity] = useState(company.city || "")
  const [phone, setPhone] = useState(company.phone || "")
  const [generalEmail, setGeneralEmail] = useState(company.general_email || "")

  const handleSubmit = () => {
    onSubmit({
      company_name: companyName,
      street_address: streetAddress,
      suburb,
      city,
      phone,
      general_email: generalEmail,
    })
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
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
          maxWidth: "520px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <h3 style={{ color: "#1F2937", fontSize: "1.25rem", fontWeight: 700, margin: "0 0 1.5rem" }}>
          Edit Company Details
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", marginBottom: "1.5rem" }}>
          <FormField
            label="Company Name"
            value={companyName}
            onChange={setCompanyName}
            disabled={isLoading}
          />
          <FormField
            label="Street Address"
            value={streetAddress}
            onChange={setStreetAddress}
            disabled={isLoading}
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <FormField
              label="Suburb"
              value={suburb}
              onChange={setSuburb}
              disabled={isLoading}
            />
            <FormField
              label="City"
              value={city}
              onChange={setCity}
              disabled={isLoading}
            />
          </div>
          <FormField
            label="Phone"
            value={phone}
            onChange={setPhone}
            disabled={isLoading}
          />
          <FormField
            label="Email"
            value={generalEmail}
            onChange={setGeneralEmail}
            disabled={isLoading}
          />

          {error && (
            <div style={{ padding: "0.75rem 1rem", background: "#FEE2E2", border: "1px solid #FECACA", borderRadius: "0.375rem" }}>
              <p style={{ color: "#991B1B", fontSize: "0.875rem", margin: 0 }}>{error}</p>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            disabled={isLoading}
            style={{
              padding: "0.75rem 1.5rem",
              background: "#F3F4F6",
              border: "1px solid #E5E7EB",
              borderRadius: "0.5rem",
              color: "#374151",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: isLoading ? "not-allowed" : "pointer",
              opacity: isLoading ? 0.6 : 1,
              transition: "all 0.15s ease",
              fontFamily: "inherit",
            }}
            onMouseEnter={e => {
              if (!isLoading) e.currentTarget.style.background = "#E5E7EB"
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "#F3F4F6"
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            style={{
              padding: "0.75rem 1.5rem",
              background: "#2f6f6a",
              border: "none",
              borderRadius: "0.5rem",
              color: "#fff",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: isLoading ? "not-allowed" : "pointer",
              opacity: isLoading ? 0.6 : 1,
              transition: "all 0.15s ease",
              fontFamily: "inherit",
            }}
            onMouseEnter={e => {
              if (!isLoading) e.currentTarget.style.background = "#1F5A55"
            }}
            onMouseLeave={e => {
              if (!isLoading) e.currentTarget.style.background = "#2f6f6a"
            }}
          >
            {isLoading ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  )
}

function EditContactModal({ company, onClose, onSubmit, isLoading, error }) {
  const [name, setName] = useState(company.primary_contact_name || "")
  const [email, setEmail] = useState(company.primary_contact_email || "")
  const [phone, setPhone] = useState(company.primary_contact_phone || "")
  const [role, setRole] = useState(company.primary_contact_role || "")

  const handleSubmit = () => {
    onSubmit({
      primary_contact_name: name,
      primary_contact_email: email,
      primary_contact_phone: phone,
      primary_contact_role: role,
    })
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
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
          boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
        }}
      >
        <h3 style={{ color: "#1F2937", fontSize: "1.25rem", fontWeight: 700, margin: "0 0 1.5rem" }}>
          Edit Primary Contact
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", marginBottom: "1.5rem" }}>
          <FormField
            label="Name"
            value={name}
            onChange={setName}
            disabled={isLoading}
          />
          <FormField
            label="Email"
            value={email}
            onChange={setEmail}
            disabled={isLoading}
          />
          <FormField
            label="Phone"
            value={phone}
            onChange={setPhone}
            disabled={isLoading}
          />
          <FormField
            label="Role"
            value={role}
            onChange={setRole}
            disabled={isLoading}
          />

          {error && (
            <div style={{ padding: "0.75rem 1rem", background: "#FEE2E2", border: "1px solid #FECACA", borderRadius: "0.375rem" }}>
              <p style={{ color: "#991B1B", fontSize: "0.875rem", margin: 0 }}>{error}</p>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            disabled={isLoading}
            style={{
              padding: "0.75rem 1.5rem",
              background: "#F3F4F6",
              border: "1px solid #E5E7EB",
              borderRadius: "0.5rem",
              color: "#374151",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: isLoading ? "not-allowed" : "pointer",
              opacity: isLoading ? 0.6 : 1,
              transition: "all 0.15s ease",
              fontFamily: "inherit",
            }}
            onMouseEnter={e => {
              if (!isLoading) e.currentTarget.style.background = "#E5E7EB"
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "#F3F4F6"
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            style={{
              padding: "0.75rem 1.5rem",
              background: "#2f6f6a",
              border: "none",
              borderRadius: "0.5rem",
              color: "#fff",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: isLoading ? "not-allowed" : "pointer",
              opacity: isLoading ? 0.6 : 1,
              transition: "all 0.15s ease",
              fontFamily: "inherit",
            }}
            onMouseEnter={e => {
              if (!isLoading) e.currentTarget.style.background = "#1F5A55"
            }}
            onMouseLeave={e => {
              if (!isLoading) e.currentTarget.style.background = "#2f6f6a"
            }}
          >
            {isLoading ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  )
}

function FormField({ label, value, onChange, disabled }) {
  return (
    <div>
      <label style={{ display: "block", color: "#374151", fontSize: "0.875rem", fontWeight: 500, marginBottom: "0.5rem" }}>
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
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
          transition: "all 0.15s ease",
          opacity: disabled ? 0.6 : 1,
        }}
        onFocus={e => {
          if (!disabled) {
            e.currentTarget.style.borderColor = "#2f6f6a"
            e.currentTarget.style.background = "#F3F4F6"
          }
        }}
        onBlur={e => {
          e.currentTarget.style.borderColor = "#E5E7EB"
          e.currentTarget.style.background = "#F9FAFB"
        }}
      />
    </div>
  )
}
