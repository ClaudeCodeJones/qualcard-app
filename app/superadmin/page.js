"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { ClipboardCheck, Building2, Users, LogOut } from "lucide-react"
import Image from "next/image"
import FileUploadArea from "@/app/components/FileUploadArea"

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = ["Overview", "Pending Approvals", "Users", "Companies", "Cardholders"]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(fullName, email) {
  if (fullName) {
    const parts = fullName.trim().split(/\s+/)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return parts[0][0].toUpperCase()
  }
  return email ? email[0].toUpperCase() : "A"
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

function formatDateTime(dateStr) {
  if (!dateStr) return "—"
  const d = new Date(dateStr)
  const date = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
  return `${date} ${time}`
}

function RoleBadge({ role }) {
  const isQcAdmin = role === "qc_admin"
  return (
    <span style={{
      display: "inline-block",
      padding: "0.25rem 0.625rem",
      borderRadius: "1rem",
      fontSize: "0.75rem",
      fontWeight: 700,
      color: "#FFFFFF",
      background: isQcAdmin ? "#2f6f6a" : "radial-gradient(circle, #34495E 0%, #2C3E50 100%)",
      whiteSpace: "nowrap",
    }}>
      {isQcAdmin ? "QualCard Admin" : "Company Admin"}
    </span>
  )
}

function StatusBadge({ status }) {
  const map = {
    active:            { label: "Active",           color: "#2f6f6a" },
    pending_approval:  { label: "Pending",          color: "#F97316" },
    pending:           { label: "Pending",          color: "#F97316" },
    declined:          { label: "Declined",         color: "#EF4444" },
    inactive:          { label: "Inactive",         color: "#4A5568" },
  }
  const { label, color } = map[status] ?? { label: status, color: "#4A5568" }
  return (
    <span style={{
      display: "inline-block",
      padding: "0.25rem 0.625rem",
      borderRadius: "1rem",
      fontSize: "0.75rem",
      fontWeight: 600,
      color,
      border: `1.5px solid ${color}`,
      whiteSpace: "nowrap",
    }}>
      {label}
    </span>
  )
}

// ─── Components ───────────────────────────────────────────────────────────────

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

function Avatar({ fullName, email, role }) {
  const initials = getInitials(fullName, email)
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const ref = useRef(null)
  const isQcAdmin = role === "qc_admin"

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    if (open) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace("/login")
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0.25rem",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
        }}
      >
        <div style={{
          width: "38px",
          height: "38px",
          borderRadius: "50%",
          background: isQcAdmin ? "rgba(47, 111, 106, 0.15)" : "#FFFFFF",
          border: isQcAdmin ? "2px solid rgba(47, 111, 106, 0.4)" : "2px solid rgba(255,255,255,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.875rem",
          fontWeight: 700,
          color: isQcAdmin ? "#FFFFFF" : "#34495E",
          letterSpacing: "0.02em",
        }}>
          {initials}
        </div>
        {isQcAdmin && (
          <span style={{
            fontSize: "0.625rem",
            fontWeight: 700,
            color: "#2f6f6a",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}>
            ADMIN
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 0.75rem)",
          right: 0,
          backgroundColor: "#FFFFFF",
          borderRadius: "1rem",
          boxShadow: "0 8px 24px rgba(44, 62, 80, 0.12), 0 2px 8px rgba(44, 62, 80, 0.08)",
          minWidth: "210px",
          zIndex: 50,
        }}>
          <div style={{ padding: "1rem 1.25rem" }}>
            <p style={{ margin: 0, fontWeight: 700, color: "#34495E", fontSize: "0.9375rem" }}>
              {fullName || email}
            </p>
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.8125rem", color: "#6B7280" }}>
              {isQcAdmin ? "QualCard Admin" : "Company Admin"}
            </p>
          </div>
          <div style={{ height: "1px", backgroundColor: "#E5E7EB" }} />
          <div style={{ padding: "0.5rem" }}>
            <button
              onClick={handleLogout}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#FEF2F2"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "0.625rem",
                padding: "0.625rem 0.75rem",
                borderRadius: "0.625rem",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "#EF4444",
                fontFamily: "inherit",
                textAlign: "left",
              }}
            >
              <LogOut size={15} strokeWidth={2} />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Header({ user }) {
  return (
    <header style={{
      background: "radial-gradient(circle, #34495E 0%, #2C3E50 100%)",
      position: "sticky",
      top: 0,
      zIndex: 10,
    }}>
      <div style={{
        maxWidth: "1280px",
        margin: "0 auto",
        padding: "0.875rem 1.5rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <Image
          src="/images/qualcard_logo_white.png"
          alt="QualCard"
          width={120}
          height={32}
          style={{ objectFit: "contain", height: "auto" }}
        />
        <Avatar fullName={user?.full_name} email={user?.email} role={user?.role} />
      </div>
    </header>
  )
}

function TabBar({ activeTab, onTabChange }) {
  return (
    <div style={{
      backgroundColor: "#FFFFFF",
      borderBottom: "1px solid #E5E7EB",
    }}>
      <div style={{
        maxWidth: "1280px",
        margin: "0 auto",
        padding: "0.625rem 1.5rem",
        display: "flex",
        gap: "0.375rem",
        overflowX: "auto",
      }}>
      {TABS.map((tab) => {
        const isActive = tab === activeTab
        return (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            style={{
              padding: "0.4375rem 1rem",
              borderRadius: "1rem",
              border: "none",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: isActive ? 600 : 400,
              whiteSpace: "nowrap",
              fontFamily: "inherit",
              transition: "background-color 0.15s ease, color 0.15s ease",
              backgroundColor: isActive ? "#34495E" : "transparent",
              color: isActive ? "#FFFFFF" : "#374151",
            }}
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.backgroundColor = "#EFF3F7"
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.backgroundColor = "transparent"
            }}
          >
            {tab}
          </button>
        )
      })}
      </div>
    </div>
  )
}

function StatSkeleton() {
  return (
    <div className="skeleton-pulse" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <div style={{ height: "0.875rem", borderRadius: "0.25rem", backgroundColor: "#E8ECF0", width: "72%" }} />
      <div style={{ height: "0.875rem", borderRadius: "0.25rem", backgroundColor: "#E8ECF0", width: "56%" }} />
    </div>
  )
}

function OverviewCard({ icon, title, stats, buttonLabel, onButtonClick, loading, badge }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div style={{
      width: "100%",
      backgroundColor: "#FFFFFF",
      borderRadius: "1rem",
      padding: "1.75rem",
      display: "flex",
      flexDirection: "column",
      gap: "1.25rem",
      boxShadow: "0 2px 8px rgba(44, 62, 80, 0.08), 0 1px 3px rgba(44, 62, 80, 0.05)",
      position: "relative",
      overflow: "hidden",
    }}>
      {badge && (
        <div style={{
          position: "absolute",
          top: "14px",
          right: "-24px",
          width: "90px",
          textAlign: "center",
          background: "#2f6f6a",
          color: "#FFFFFF",
          fontSize: "0.625rem",
          fontWeight: 800,
          letterSpacing: "0.1em",
          padding: "5px 0",
          transform: "rotate(45deg)",
          textTransform: "uppercase",
        }}>
          {badge}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
        <div style={{
          width: "46px",
          height: "46px",
          borderRadius: "0.75rem",
          backgroundColor: "rgba(44, 62, 80, 0.07)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}>
          {icon}
        </div>
        <h3 style={{
          margin: 0,
          fontSize: "1rem",
          fontWeight: 700,
          color: "#34495E",
          letterSpacing: "-0.02em",
        }}>
          {title}
        </h3>
      </div>

      <div style={{ flex: 1 }}>
        {loading ? (
          <StatSkeleton />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            {stats.map((stat, i) => (
              <p key={i} style={{
                margin: 0,
                fontSize: "0.875rem",
                color: "#666666",
                lineHeight: 1.6,
              }}>
                {stat}
              </p>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={onButtonClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: "100%",
          padding: "0.75rem",
          borderRadius: "1rem",
          border: "none",
          cursor: "pointer",
          background: "#2f6f6a",
          color: "#FFFFFF",
          fontSize: "0.875rem",
          fontWeight: 700,
          fontFamily: "inherit",
          letterSpacing: "0.01em",
          opacity: hovered ? 0.88 : 1,
          transform: hovered ? "translateY(-1px)" : "translateY(0)",
          transition: "opacity 0.15s ease, transform 0.15s ease",
        }}
      >
        {buttonLabel}
      </button>
    </div>
  )
}

function OverviewTab({ setActiveTab }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch("/api/superadmin/stats", {
        headers: { "Authorization": `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      setStats(data)
      setLoading(false)
    }

    fetchStats()
  }, [])

  return (
    <div style={{ padding: "2rem 1.5rem", maxWidth: "1280px", margin: "0 auto" }}>
      <div style={{ marginBottom: "2.5rem" }}>
        <h1 style={{
          margin: 0,
          fontSize: "1.75rem",
          fontWeight: 800,
          color: "#34495E",
          letterSpacing: "-0.03em",
          lineHeight: 1.2,
        }}>
          QUALCARD ADMIN DASHBOARD
        </h1>
        <p style={{ margin: "0.5rem 0 0.125rem", fontSize: "0.9375rem", color: "#6B7280", lineHeight: 1.7 }}>
          • Full platform control
        </p>
        <p style={{ margin: 0, fontSize: "0.9375rem", color: "#6B7280", lineHeight: 1.7 }}>
          • Manage companies, users, approvals, and system settings
        </p>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "1.25rem",
      }}>
        <OverviewCard
          icon={<ClipboardCheck size={26} color="#34495E" strokeWidth={2} />}
          title="User Access Approvals"
          stats={stats ? [
            `Pending approvals: ${stats.pendingApprovals}`,
            `Total users: ${stats.totalUsers}`,
          ] : []}
          buttonLabel="Review Users"
          onButtonClick={() => setActiveTab("Pending Approvals")}
          loading={loading}
          badge={!loading && stats?.pendingApprovals > 0 ? "NEW" : null}
        />
        <OverviewCard
          icon={<Building2 size={26} color="#34495E" strokeWidth={2} />}
          title="Companies"
          stats={stats ? [
            `Total companies: ${stats.totalCompanies}`,
            `Active companies: ${stats.activeCompanies}`,
          ] : []}
          buttonLabel="Manage Companies"
          onButtonClick={() => setActiveTab("Companies")}
          loading={loading}
        />
        <OverviewCard
          icon={<Users size={26} color="#34495E" strokeWidth={2} />}
          title="Cardholders"
          stats={stats ? [
            `Total cardholders: ${stats.totalCardholders}`,
            `Active cardholders: ${stats.activeCardholders}`,
          ] : []}
          buttonLabel="Manage Cardholders"
          onButtonClick={() => setActiveTab("Cardholders")}
          loading={loading}
        />
      </div>
    </div>
  )
}

function Toast({ message, type, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3000)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <div style={{
      position: "fixed",
      bottom: "1.5rem",
      right: "1.5rem",
      backgroundColor: type === "error" ? "#EF4444" : "#2f6f6a",
      color: "#FFFFFF",
      padding: "0.75rem 1.25rem",
      borderRadius: "0.75rem",
      fontSize: "0.875rem",
      fontWeight: 600,
      boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
      zIndex: 100,
    }}>
      {message}
    </div>
  )
}

function ConfirmModal({ message, onConfirm, onCancel, loading }) {
  return (
    <div style={{
      position: "fixed",
      inset: 0,
      backgroundColor: "rgba(0,0,0,0.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 90,
    }}>
      <div style={{
        backgroundColor: "#FFFFFF",
        borderRadius: "1rem",
        padding: "2rem",
        maxWidth: "420px",
        width: "calc(100% - 2rem)",
        boxShadow: "0 8px 32px rgba(44, 62, 80, 0.15)",
      }}>
        <p style={{ margin: "0 0 1.5rem", fontSize: "1rem", color: "#34495E", lineHeight: 1.6 }}>
          {message}
        </p>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              padding: "0.625rem 1.25rem",
              borderRadius: "1rem",
              border: "1px solid #E5E7EB",
              backgroundColor: "#FFFFFF",
              color: "#374151",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "inherit",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: "0.625rem 1.25rem",
              borderRadius: "1rem",
              border: "none",
              background: "#2f6f6a",
              color: "#FFFFFF",
              fontSize: "0.875rem",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Processing..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  )
}

function PendingApprovalsTab() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [modalLoading, setModalLoading] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    async function fetchPending() {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch("/api/superadmin/pending-approvals", {
        headers: { "Authorization": `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      setUsers(Array.isArray(data) ? data : [])
      setLoading(false)
    }
    fetchPending()
  }, [])

  async function handleConfirm() {
    setModalLoading(true)
    const { data: { session } } = await supabase.auth.getSession()

    try {
      const res = await fetch("/api/admin/user-approval", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          userId: modal.userId,
          companyId: modal.companyId,
          action: modal.action,
        }),
      })

      if (!res.ok) throw new Error()

      setUsers((prev) => prev.filter((u) => u.id !== modal.userId))
      setToast({ message: modal.action === "approve" ? "Account approved" : "Account declined", type: "success" })
    } catch {
      setToast({ message: "Something went wrong, please try again", type: "error" })
    } finally {
      setModalLoading(false)
      setModal(null)
    }
  }

  return (
    <div style={{ padding: "2rem 1.5rem", maxWidth: "1280px", margin: "0 auto" }}>
      <div style={{
        backgroundColor: "#FFFFFF",
        borderRadius: "1rem",
        boxShadow: "0 2px 8px rgba(44, 62, 80, 0.08), 0 1px 3px rgba(44, 62, 80, 0.05)",
        overflow: "hidden",
      }}>
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #E5E7EB" }}>
          <h2 style={{
            margin: 0,
            fontSize: "1.0625rem",
            fontWeight: 700,
            color: "#34495E",
            letterSpacing: "-0.02em",
          }}>
            Pending User Access - Company Admin
          </h2>
        </div>

        {loading ? (
          <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ height: "3.75rem", borderRadius: "0.5rem", backgroundColor: "#E8ECF0" }} />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: "3rem 1.5rem", textAlign: "center" }}>
            <p style={{ margin: 0, color: "#6B7280", fontSize: "0.9375rem" }}>
              No pending company admin approvals
            </p>
          </div>
        ) : (
          <div>
            {users.map((user, index) => (
              <div
                key={user.id}
                style={{
                  padding: "1.25rem 1.5rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "1rem",
                  borderBottom: index < users.length - 1 ? "1px solid #E5E7EB" : "none",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 700, color: "#34495E", fontSize: "0.9375rem" }}>
                    {user.full_name || "—"}
                  </p>
                  <p style={{ margin: "0.125rem 0 0", color: "#6B7280", fontSize: "0.8125rem" }}>
                    {user.email}
                  </p>
                  <p style={{ margin: "0.125rem 0 0", color: "#6B7280", fontSize: "0.8125rem" }}>
                    {user.companies?.company_name ?? "—"} &middot; {formatDate(user.created_at)}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                  <button
                    onClick={() => setModal({ userId: user.id, companyId: user.company_id, action: "approve", fullName: user.full_name })}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.88"; e.currentTarget.style.transform = "translateY(-1px)" }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "translateY(0)" }}
                    style={{
                      padding: "0.5rem 1rem",
                      borderRadius: "1rem",
                      border: "none",
                      background: "#2f6f6a",
                      color: "#FFFFFF",
                      fontSize: "0.8125rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "opacity 0.15s ease, transform 0.15s ease",
                    }}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => setModal({ userId: user.id, companyId: user.company_id, action: "decline", fullName: user.full_name })}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.88"; e.currentTarget.style.transform = "translateY(-1px)" }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "translateY(0)" }}
                    style={{
                      padding: "0.5rem 1rem",
                      borderRadius: "1rem",
                      border: "none",
                      backgroundColor: "#EF4444",
                      color: "#FFFFFF",
                      fontSize: "0.8125rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "opacity 0.15s ease, transform 0.15s ease",
                    }}
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <ConfirmModal
          message={
            modal.action === "approve"
              ? `Approve ${modal.fullName}? This will activate their account and their company.`
              : `Decline ${modal.fullName}? This will decline their account.`
          }
          onConfirm={handleConfirm}
          onCancel={() => !modalLoading && setModal(null)}
          loading={modalLoading}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  )
}

function EditUserForm({ user, companies, onSave, onCancel }) {
  const [form, setForm] = useState({
    full_name: user.full_name ?? "",
    email: user.email ?? "",
    role: user.role ?? "company_admin",
    account_status: user.account_status ?? "active",
    company_id: user.company_id ?? "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [companySearch, setCompanySearch] = useState("")
  const [companyOpen, setCompanyOpen] = useState(false)
  const companyRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (companyRef.current && !companyRef.current.contains(e.target)) setCompanyOpen(false)
    }
    if (companyOpen) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [companyOpen])

  function set(key, val) {
    setForm((prev) => ({ ...prev, [key]: val }))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`/api/superadmin/users/${user.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ ...form, currentEmail: user.email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Save failed")
      onSave(data.user)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    width: "100%",
    padding: "0.625rem 0.75rem",
    borderRadius: "0.625rem",
    border: "1.5px solid #E5E7EB",
    fontSize: "0.875rem",
    fontFamily: "inherit",
    color: "#34495E",
    outline: "none",
    boxSizing: "border-box",
  }
  const labelStyle = {
    display: "block",
    fontSize: "0.75rem",
    fontWeight: 700,
    color: "#374151",
    marginBottom: "0.375rem",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  }

  const selectedCompanyName = companies.find((c) => c.id === form.company_id)?.company_name ?? ""
  const filteredCompanies = companies.filter((c) =>
    c.company_name.toLowerCase().includes(companySearch.toLowerCase())
  )

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div>
        <label style={labelStyle}>Full Name</label>
        <input style={inputStyle} value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
      </div>
      <div>
        <label style={labelStyle}>Email</label>
        <input style={inputStyle} type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
      </div>
      <div>
        <label style={labelStyle}>Role</label>
        {user.role === "qc_admin" ? (
          <p style={{
            margin: 0,
            padding: "0.625rem 0.75rem",
            borderRadius: "0.625rem",
            border: "1.5px solid #E5E7EB",
            fontSize: "0.875rem",
            color: "#6B7280",
            backgroundColor: "#F8FAFC",
          }}>
            QualCard Admin
          </p>
        ) : (
          <select style={inputStyle} value={form.role} onChange={(e) => set("role", e.target.value)}>
            <option value="company_admin">Company Admin</option>
          </select>
        )}
      </div>
      <div>
        <label style={labelStyle}>Account Status</label>
        <select style={inputStyle} value={form.account_status} onChange={(e) => set("account_status", e.target.value)}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="pending_approval">Pending Approval</option>
          <option value="declined">Declined</option>
        </select>
      </div>
      <div>
        <label style={labelStyle}>Company</label>
        <div ref={companyRef} style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => { setCompanyOpen((v) => !v); setCompanySearch("") }}
            style={{
              ...inputStyle,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              background: "#FFFFFF",
              textAlign: "left",
              border: `1.5px solid ${companyOpen ? "#34495E" : "#E5E7EB"}`,
            }}
          >
            <span style={{ color: selectedCompanyName ? "#34495E" : "#6B7280" }}>
              {selectedCompanyName || "— None —"}
            </span>
            <span style={{ color: "#6B7280", fontSize: "0.75rem", marginLeft: "0.5rem" }}>▾</span>
          </button>

          {companyOpen && (
            <div style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              right: 0,
              backgroundColor: "#FFFFFF",
              border: "1.5px solid #E5E7EB",
              borderRadius: "0.625rem",
              zIndex: 20,
              boxShadow: "0 4px 16px rgba(44, 62, 80, 0.12)",
              overflow: "hidden",
            }}>
              <div style={{ padding: "0.5rem", borderBottom: "1px solid #EFF3F7" }}>
                <input
                  autoFocus
                  placeholder="Search companies..."
                  value={companySearch}
                  onChange={(e) => setCompanySearch(e.target.value)}
                  style={{ ...inputStyle, border: "1.5px solid #E5E7EB" }}
                />
              </div>
              <div style={{ maxHeight: "180px", overflowY: "auto" }}>
                <div
                  onClick={() => { set("company_id", ""); setCompanyOpen(false) }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#EFF3F7"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                  style={{ padding: "0.625rem 0.875rem", cursor: "pointer", fontSize: "0.875rem", color: "#6B7280" }}
                >
                  — None —
                </div>
                {filteredCompanies.length === 0 ? (
                  <p style={{ margin: 0, padding: "0.625rem 0.875rem", fontSize: "0.875rem", color: "#6B7280" }}>
                    No matches
                  </p>
                ) : filteredCompanies.map((c) => {
                  const isSelected = form.company_id === c.id
                  return (
                    <div
                      key={c.id}
                      onClick={() => { set("company_id", c.id); setCompanyOpen(false) }}
                      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = "#EFF3F7" }}
                      onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = isSelected ? "#34495E" : "transparent" }}
                      style={{
                        padding: "0.625rem 0.875rem",
                        cursor: "pointer",
                        fontSize: "0.875rem",
                        color: isSelected ? "#FFFFFF" : "#34495E",
                        backgroundColor: isSelected ? "#34495E" : "transparent",
                      }}
                    >
                      {c.company_name}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <p style={{ margin: 0, fontSize: "0.8125rem", color: "#EF4444" }}>{error}</p>
      )}

      <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            flex: 1,
            padding: "0.75rem",
            borderRadius: "1rem",
            border: "none",
            background: "#2f6f6a",
            color: "#FFFFFF",
            fontSize: "0.875rem",
            fontWeight: 700,
            cursor: saving ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          style={{
            padding: "0.75rem 1.25rem",
            borderRadius: "1rem",
            border: "1.5px solid #E5E7EB",
            backgroundColor: "#FFFFFF",
            color: "#374151",
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: saving ? "not-allowed" : "pointer",
            fontFamily: "inherit",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

function UserPanel({ user, companies, onClose, onUserUpdated }) {
  const [visible, setVisible] = useState(false)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(t)
  }, [])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 250)
  }

  function handleSaved(updated) {
    setEditing(false)
    onUserUpdated(updated)
  }

  const labelStyle = { fontSize: "0.75rem", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }
  const valueStyle = { fontSize: "0.9375rem", color: "#34495E", lineHeight: 1.5 }

  return (
    <>
      <div
        onClick={handleClose}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.3)",
          zIndex: 70,
          opacity: visible ? 1 : 0,
          transition: "opacity 0.25s ease",
        }}
      />
      <div style={{
        position: "fixed",
        top: 0,
        right: 0,
        height: "100vh",
        width: "400px",
        backgroundColor: "#FFFFFF",
        boxShadow: "-4px 0 24px rgba(44, 62, 80, 0.12)",
        zIndex: 80,
        display: "flex",
        flexDirection: "column",
        transform: visible ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.25s ease",
        overflowY: "auto",
      }}>
        <div style={{
          padding: "1.25rem 1.5rem",
          borderBottom: "1px solid #E5E7EB",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#34495E" }}>
            {editing ? "Edit Profile" : "User Profile"}
          </h2>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "1rem",
                  border: "none",
                  background: "#2f6f6a",
                  color: "#FFFFFF",
                  fontSize: "0.8125rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Edit Profile
              </button>
            )}
            <button
              onClick={handleClose}
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                border: "none",
                backgroundColor: "#EFF3F7",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1rem",
                color: "#374151",
                flexShrink: 0,
              }}
            >
              ✕
            </button>
          </div>
        </div>

        <div style={{ padding: "1.5rem", flex: 1 }}>
          {editing ? (
            <EditUserForm
              user={user}
              companies={companies}
              onSave={handleSaved}
              onCancel={() => setEditing(false)}
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div>
                <p style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "#34495E", letterSpacing: "-0.02em" }}>
                  {user.full_name || "—"}
                </p>
                <p style={{ margin: "0.25rem 0 0", fontSize: "0.875rem", color: "#6B7280" }}>
                  {user.email}
                </p>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <RoleBadge role={user.role} />
                <StatusBadge status={user.account_status} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <p style={labelStyle}>Company</p>
                  <p style={{ ...valueStyle, fontWeight: 700 }}>{user.companies?.company_name ?? "System"}</p>
                </div>
                <div>
                  <p style={labelStyle}>Last Login</p>
                  <p style={valueStyle}>{formatDateTime(user.last_login)}</p>
                </div>
                <div>
                  <p style={labelStyle}>Created At</p>
                  <p style={valueStyle}>{user.created_at ? formatDate(user.created_at) : "—"}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function UsersTab() {
  const [users, setUsers] = useState([])
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState(null)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  useEffect(() => {
    async function fetchUsers() {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch("/api/superadmin/users", {
        headers: { "Authorization": `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      setUsers(data.users ?? [])
      setCompanies(data.companies ?? [])
      setLoading(false)
    }
    fetchUsers()
  }, [])

  const filtered = users.filter((u) => {
    const matchSearch = !search ||
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === "all" || u.role === roleFilter
    const matchStatus = statusFilter === "all" || u.account_status === statusFilter
    return matchSearch && matchRole && matchStatus
  })

  const controlStyle = {
    padding: "0.5625rem 0.875rem",
    borderRadius: "0.625rem",
    border: "1.5px solid #E5E7EB",
    fontSize: "0.875rem",
    fontFamily: "inherit",
    color: "#34495E",
    backgroundColor: "#FFFFFF",
    outline: "none",
  }

  const thStyle = {
    padding: "0.75rem 1rem",
    textAlign: "left",
    fontSize: "0.75rem",
    fontWeight: 700,
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    whiteSpace: "nowrap",
    borderBottom: "1px solid #E5E7EB",
  }

  const tdStyle = {
    padding: "0.875rem 1rem",
    fontSize: "0.875rem",
    color: "#34495E",
    borderBottom: "1px solid #EFF3F7",
    verticalAlign: "middle",
  }

  return (
    <div style={{ padding: "2rem 1.5rem", maxWidth: "1280px", margin: "0 auto" }}>
      <div style={{
        display: "flex",
        gap: "0.75rem",
        marginBottom: "1.25rem",
        flexWrap: "wrap",
        alignItems: "center",
      }}>
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...controlStyle, minWidth: "220px", flex: 1 }}
        />
        <select style={controlStyle} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="all">All Roles</option>
          <option value="company_admin">Company Admin</option>
          <option value="qc_admin">QualCard Admin</option>
        </select>
        <select style={controlStyle} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="pending_approval">Pending</option>
          <option value="declined">Declined</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div style={{
        backgroundColor: "#FFFFFF",
        borderRadius: "1rem",
        boxShadow: "0 2px 8px rgba(44, 62, 80, 0.08), 0 1px 3px rgba(44, 62, 80, 0.05)",
        overflow: "hidden",
      }}>
        {loading ? (
          <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{ height: "3rem", borderRadius: "0.5rem", backgroundColor: "#E8ECF0" }} />
            ))}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>Full Name</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Role</th>
                  <th style={thStyle}>Company</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Last Login</th>
                  <th style={thStyle}>Created</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ ...tdStyle, textAlign: "center", color: "#6B7280", padding: "3rem" }}>
                      No users found
                    </td>
                  </tr>
                ) : filtered.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#F8FAFC"}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                    style={{ cursor: "pointer" }}
                  >
                    <td style={{ ...tdStyle, fontWeight: 700 }}>{u.full_name || "—"}</td>
                    <td style={{ ...tdStyle, color: "#374151" }}>{u.email}</td>
                    <td style={tdStyle}><RoleBadge role={u.role} /></td>
                    <td style={{ ...tdStyle, color: "#374151" }}>{u.companies?.company_name ?? "System"}</td>
                    <td style={tdStyle}><StatusBadge status={u.account_status} /></td>
                    <td style={{ ...tdStyle, color: "#374151", whiteSpace: "nowrap" }}>{formatDateTime(u.last_login)}</td>
                    <td style={{ ...tdStyle, color: "#374151", whiteSpace: "nowrap" }}>
                      {u.created_at ? formatDate(u.created_at) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedUser && (
        <UserPanel
          user={selectedUser}
          companies={companies}
          onClose={() => setSelectedUser(null)}
          onUserUpdated={(updated) => {
            setUsers((prev) => prev.map((u) => u.id === updated.id ? updated : u))
            setSelectedUser(updated)
          }}
        />
      )}
    </div>
  )
}

// ─── Companies Tab ────────────────────────────────────────────────────────────

function exportCompaniesCSV(companies) {
  const headers = ["Company Name", "Street Address", "Suburb", "City", "Phone", "General Email", "Status", "Cardholders", "Created At"]
  const rows = companies.map((c) => [
    c.company_name ?? "",
    c.street_address ?? "",
    c.suburb ?? "",
    c.city ?? "",
    c.phone ?? "",
    c.general_email ?? "",
    c.status ?? "",
    c.cardholder_count ?? 0,
    c.created_at ? formatDate(c.created_at) : "",
  ])
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n")
  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "companies.csv"
  a.click()
  URL.revokeObjectURL(url)
}

function CompanyPanel({ company, onClose }) {
  const [visible, setVisible] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(t)
  }, [])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 250)
  }

  const labelStyle = { fontSize: "0.75rem", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }
  const valueStyle = { margin: 0, fontSize: "0.9375rem", color: "#34495E", lineHeight: 1.5 }

  return (
    <>
      <div
        onClick={handleClose}
        style={{
          position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.3)", zIndex: 70,
          opacity: visible ? 1 : 0, transition: "opacity 0.25s ease",
        }}
      />
      <div style={{
        position: "fixed", top: 0, right: 0, height: "100vh", width: "400px",
        backgroundColor: "#FFFFFF", boxShadow: "-4px 0 24px rgba(44, 62, 80, 0.12)",
        zIndex: 80, display: "flex", flexDirection: "column",
        transform: visible ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.25s ease", overflowY: "auto",
      }}>
        <div style={{
          padding: "1.25rem 1.5rem", borderBottom: "1px solid #E5E7EB",
          display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
        }}>
          <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#34495E" }}>Company</h2>
          <button
            onClick={handleClose}
            style={{
              width: "32px", height: "32px", borderRadius: "50%", border: "none",
              backgroundColor: "#EFF3F7", cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center", fontSize: "1rem", color: "#374151",
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: "1.5rem", flex: 1, display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div>
            <p style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "#34495E", letterSpacing: "-0.02em" }}>
              {company.company_name}
            </p>
            <div style={{ marginTop: "0.5rem" }}>
              <StatusBadge status={company.status} />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <p style={labelStyle}>Address</p>
              <p style={valueStyle}>{company.street_address ?? "—"}</p>
              {company.suburb && <p style={{ ...valueStyle, color: "#6B7280", fontSize: "0.875rem" }}>{company.suburb}</p>}
              <p style={{ ...valueStyle, color: "#6B7280", fontSize: "0.875rem" }}>{company.city ?? "—"}</p>
            </div>
            <div>
              <p style={labelStyle}>Phone</p>
              <p style={valueStyle}>{company.phone ?? "—"}</p>
            </div>
            <div>
              <p style={labelStyle}>General Email</p>
              <p style={valueStyle}>{company.general_email ?? "—"}</p>
            </div>
            <div>
              <p style={labelStyle}>Cardholders</p>
              <p style={valueStyle}>{company.cardholder_count ?? 0}</p>
            </div>
            <div>
              <p style={labelStyle}>Created At</p>
              <p style={valueStyle}>{company.created_at ? formatDate(company.created_at) : "—"}</p>
            </div>
          </div>

          <button
            onClick={() => router.push(`/superadmin/companies/${company.id}`)}
            style={{
              width: "100%", padding: "0.75rem", borderRadius: "1rem", border: "none",
              background: "#2f6f6a",
              color: "#FFFFFF", fontSize: "0.875rem", fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit", marginTop: "auto",
            }}
          >
            Manage Company
          </button>
        </div>
      </div>
    </>
  )
}

function CreateCompanyModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    company_name: "", street_address: "", suburb: "", city: "",
    phone: "", general_email: "", status: "active",
    primary_contact_name: "", primary_contact_email: "", primary_contact_phone: "",
  })
  const [logoFile, setLogoFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  function set(key, val) { setForm((prev) => ({ ...prev, [key]: val })) }

  const isValid = form.company_name && form.street_address && form.suburb && form.city &&
    form.phone && form.general_email && form.primary_contact_name &&
    form.primary_contact_email && form.primary_contact_phone

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      if (logoFile) fd.append("logo", logoFile)

      const res = await fetch("/api/superadmin/companies", {
        method: "POST",
        headers: { "Authorization": `Bearer ${session.access_token}` },
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Create failed")
      onCreated(data.company)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const inputStyle = {
    width: "100%", padding: "0.625rem 0.75rem", borderRadius: "0.625rem",
    border: "1.5px solid #E5E7EB", fontSize: "0.875rem", fontFamily: "inherit",
    color: "#34495E", outline: "none", boxSizing: "border-box",
  }
  const labelStyle = {
    display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#374151",
    marginBottom: "0.375rem", textTransform: "uppercase", letterSpacing: "0.05em",
  }
  const fieldStyle = { display: "flex", flexDirection: "column" }

  return (
    <div style={{
      position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 90, padding: "1rem",
    }}>
      <div style={{
        backgroundColor: "#FFFFFF", borderRadius: "1rem", width: "100%", maxWidth: "560px",
        maxHeight: "88vh", overflowY: "auto",
        boxShadow: "0 8px 32px rgba(44, 62, 80, 0.18)",
      }}>
        <div style={{
          padding: "1.25rem 1.5rem", borderBottom: "1px solid #E5E7EB",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          position: "sticky", top: 0, backgroundColor: "#FFFFFF", zIndex: 1,
        }}>
          <h2 style={{ margin: 0, fontSize: "1.0625rem", fontWeight: 700, color: "#34495E" }}>
            Create Company
          </h2>
          <button
            onClick={onClose}
            style={{
              width: "32px", height: "32px", borderRadius: "50%", border: "none",
              backgroundColor: "#EFF3F7", cursor: "pointer", fontSize: "1rem", color: "#374151",
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Company Name <span style={{ color: "#EF4444" }}>*</span></label>
            <input style={inputStyle} value={form.company_name} onChange={(e) => set("company_name", e.target.value)} />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Logo (optional)</label>
            <FileUploadArea
              accept="image/jpeg,image/png,image/webp"
              file={logoFile}
              onFile={setLogoFile}
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Street Address <span style={{ color: "#EF4444" }}>*</span></label>
            <input style={inputStyle} value={form.street_address} onChange={(e) => set("street_address", e.target.value)} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Suburb <span style={{ color: "#EF4444" }}>*</span></label>
              <input style={inputStyle} value={form.suburb} onChange={(e) => set("suburb", e.target.value)} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>City <span style={{ color: "#EF4444" }}>*</span></label>
              <input style={inputStyle} value={form.city} onChange={(e) => set("city", e.target.value)} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Phone <span style={{ color: "#EF4444" }}>*</span></label>
              <input style={inputStyle} value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>General Email <span style={{ color: "#EF4444" }}>*</span></label>
              <input style={inputStyle} type="email" value={form.general_email} onChange={(e) => set("general_email", e.target.value)} />
            </div>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Status</label>
            <select style={inputStyle} value={form.status} onChange={(e) => set("status", e.target.value)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          <p style={{ margin: "0.5rem 0 0", fontSize: "0.8125rem", fontWeight: 700, color: "#34495E", letterSpacing: "-0.01em" }}>
            Primary Company Contact
          </p>

          <div style={fieldStyle}>
            <label style={labelStyle}>Contact Name <span style={{ color: "#EF4444" }}>*</span></label>
            <input style={inputStyle} value={form.primary_contact_name} onChange={(e) => set("primary_contact_name", e.target.value)} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Contact Email <span style={{ color: "#EF4444" }}>*</span></label>
              <input style={inputStyle} type="email" value={form.primary_contact_email} onChange={(e) => set("primary_contact_email", e.target.value)} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Contact Phone <span style={{ color: "#EF4444" }}>*</span></label>
              <input style={inputStyle} value={form.primary_contact_phone} onChange={(e) => set("primary_contact_phone", e.target.value)} />
            </div>
          </div>

          {error && <p style={{ margin: 0, fontSize: "0.8125rem", color: "#EF4444" }}>{error}</p>}

          <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
            <button
              onClick={handleSubmit}
              disabled={!isValid || submitting}
              style={{
                flex: 1, padding: "0.75rem", borderRadius: "1rem", border: "none",
                background: "#2f6f6a",
                color: "#FFFFFF", fontSize: "0.875rem", fontWeight: 700,
                cursor: !isValid || submitting ? "not-allowed" : "pointer",
                fontFamily: "inherit", opacity: !isValid || submitting ? 0.6 : 1,
              }}
            >
              {submitting ? "Creating..." : "Create Company"}
            </button>
            <button
              onClick={onClose}
              disabled={submitting}
              style={{
                padding: "0.75rem 1.25rem", borderRadius: "1rem", border: "1.5px solid #E5E7EB",
                backgroundColor: "#FFFFFF", color: "#374151", fontSize: "0.875rem",
                fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
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

function CompaniesTab() {
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [search, setSearch] = useState("")
  const [cityFilter, setCityFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [visibleCount, setVisibleCount] = useState(10)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    async function fetchCompanies() {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch("/api/superadmin/companies", {
        headers: { "Authorization": `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      setCompanies(data.companies ?? [])
      setLoading(false)
    }
    fetchCompanies()
  }, [])

  const cities = ["all", ...Array.from(new Set(companies.map((c) => c.city).filter(Boolean))).sort()]

  const filtered = companies.filter((c) => {
    const matchSearch = !search || c.company_name?.toLowerCase().includes(search.toLowerCase())
    const matchCity = cityFilter === "all" || c.city === cityFilter
    const matchStatus = statusFilter === "all" || c.status === statusFilter
    return matchSearch && matchCity && matchStatus
  })

  const visible = filtered.slice(0, visibleCount)

  const controlStyle = {
    padding: "0.5625rem 0.875rem", borderRadius: "0.625rem", border: "1.5px solid #E5E7EB",
    fontSize: "0.875rem", fontFamily: "inherit", color: "#34495E", backgroundColor: "#FFFFFF", outline: "none",
  }
  const thStyle = {
    padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: 700,
    color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em",
    whiteSpace: "nowrap", borderBottom: "1px solid #E5E7EB",
  }
  const tdStyle = {
    padding: "0.875rem 1rem", fontSize: "0.875rem", color: "#34495E",
    borderBottom: "1px solid #EFF3F7", verticalAlign: "middle",
  }

  return (
    <div style={{ padding: "2rem 1.5rem", maxWidth: "1280px", margin: "0 auto" }}>
      <div style={{
        backgroundColor: "#FFFFFF", borderRadius: "1rem",
        boxShadow: "0 2px 8px rgba(44, 62, 80, 0.08), 0 1px 3px rgba(44, 62, 80, 0.05)",
        overflow: "hidden",
      }}>
        <div style={{
          padding: "1.25rem 1.5rem", borderBottom: "1px solid #E5E7EB",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap",
        }}>
          <h2 style={{ margin: 0, fontSize: "1.0625rem", fontWeight: 700, color: "#34495E", letterSpacing: "-0.02em" }}>
            All Companies
          </h2>
          <div style={{ display: "flex", gap: "0.625rem" }}>
            <button
              onClick={() => exportCompaniesCSV(filtered)}
              style={{
                padding: "0.5rem 1rem", borderRadius: "1rem", border: "1.5px solid #E5E7EB",
                backgroundColor: "#FFFFFF", color: "#374151", fontSize: "0.8125rem",
                fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#EFF3F7"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#FFFFFF"}
            >
              Export CSV
            </button>
            <button
              onClick={() => setShowCreate(true)}
              style={{
                padding: "0.5rem 1rem", borderRadius: "1rem", border: "none",
                background: "#2f6f6a",
                color: "#FFFFFF", fontSize: "0.8125rem", fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit",
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = "0.88"}
              onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
            >
              Create Company
            </button>
          </div>
        </div>

        <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #EFF3F7", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="Search by company name..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setVisibleCount(10) }}
            style={{ ...controlStyle, minWidth: "200px", flex: 1 }}
          />
          <select
            style={controlStyle}
            value={cityFilter}
            onChange={(e) => { setCityFilter(e.target.value); setVisibleCount(10) }}
          >
            {cities.map((c) => (
              <option key={c} value={c}>{c === "all" ? "All Cities" : c}</option>
            ))}
          </select>
          <select
            style={controlStyle}
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setVisibleCount(10) }}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        {loading ? (
          <div className="skeleton-pulse" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} style={{ height: "3rem", borderRadius: "0.5rem", backgroundColor: "#E8ECF0" }} />
            ))}
          </div>
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Company Name</th>
                    <th style={thStyle}>Street Address</th>
                    <th style={thStyle}>City</th>
                    <th style={thStyle}>Cardholders</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ ...tdStyle, textAlign: "center", color: "#6B7280", padding: "3rem" }}>
                        No companies found
                      </td>
                    </tr>
                  ) : visible.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedCompany(c)}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#F8FAFC"}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                      style={{ cursor: "pointer" }}
                    >
                      <td style={{ ...tdStyle, fontWeight: 700 }}>{c.company_name}</td>
                      <td style={{ ...tdStyle, color: "#374151" }}>{c.street_address ?? "—"}</td>
                      <td style={{ ...tdStyle, color: "#374151" }}>{c.city ?? "—"}</td>
                      <td style={{ ...tdStyle, color: "#374151" }}>{c.cardholder_count}</td>
                      <td style={tdStyle}><StatusBadge status={c.status} /></td>
                      <td style={{ ...tdStyle, color: "#374151", whiteSpace: "nowrap" }}>
                        {c.created_at ? formatDate(c.created_at) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filtered.length > visibleCount && (
              <div style={{ padding: "1.25rem 1.5rem", borderTop: "1px solid #EFF3F7", textAlign: "center" }}>
                <button
                  onClick={() => setVisibleCount((v) => v + 10)}
                  style={{
                    padding: "0.625rem 2rem", borderRadius: "1rem", border: "1.5px solid #E5E7EB",
                    backgroundColor: "#FFFFFF", color: "#374151", fontSize: "0.875rem",
                    fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#EFF3F7"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#FFFFFF"}
                >
                  Load More ({filtered.length - visibleCount} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {selectedCompany && (
        <CompanyPanel
          company={selectedCompany}
          onClose={() => setSelectedCompany(null)}
        />
      )}

      {showCreate && (
        <CreateCompanyModal
          onClose={() => setShowCreate(false)}
          onCreated={(company) => {
            setCompanies((prev) => [company, ...prev])
            setShowCreate(false)
            setToast({ message: "Company created", type: "success" })
          }}
        />
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      )}
    </div>
  )
}

// ─── Cardholders Tab ──────────────────────────────────────────────────────────

function CardholderStatusBadge({ status }) {
  const map = {
    active:             { label: "Active",   color: "#2f6f6a" },
    inactive:           { label: "Inactive", color: "#4A5568" },
    pending:            { label: "Pending",  color: "#F97316" },
    pending_activation: { label: "Pending",  color: "#F97316" },
  }
  const { label, color } = map[status] ?? { label: status, color: "#4A5568" }
  return (
    <span style={{
      display: "inline-block",
      padding: "0.25rem 0.625rem",
      borderRadius: "1rem",
      fontSize: "0.75rem",
      fontWeight: 600,
      color,
      border: `1.5px solid ${color}`,
      whiteSpace: "nowrap",
    }}>
      {label}
    </span>
  )
}

function AddCardholderModal({ token, companies, onCreated, onClose }) {
  const router = useRouter()
  const [form, setForm] = useState({
    full_name: "",
    company_id: "",
    status: "pending_activation",
  })
  const [photoFile, setPhotoFile] = useState(null)
  const [companySearch, setCompanySearch] = useState("")
  const [companyOpen, setCompanyOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const companyRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (companyRef.current && !companyRef.current.contains(e.target)) setCompanyOpen(false)
    }
    if (companyOpen) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [companyOpen])

  function set(key, val) {
    setForm((prev) => ({ ...prev, [key]: val }))
  }

  const isValid = form.full_name.trim() && form.company_id && form.status

  function generateSlug(fullName) {
    const base = fullName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
    const digits = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join("")
    return `${base}-${digits}`
  }

  async function handleSave() {
    if (!isValid) return
    setSaving(true)
    setError(null)
    try {
      let photo_url = null

      if (photoFile) {
        const filePath = `${form.company_id}/${Date.now()}-${photoFile.name}`
        const { error: uploadError } = await supabase.storage
          .from("cardholder-photos")
          .upload(filePath, photoFile, { contentType: photoFile.type, upsert: false })
        if (uploadError) {
          setError(uploadError.message)
          setSaving(false)
          return
        }
        const { data: { publicUrl } } = supabase.storage.from("cardholder-photos").getPublicUrl(filePath)
        photo_url = publicUrl
      }

      const slug = generateSlug(form.full_name)

      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch("/api/superadmin/cardholders", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: form.full_name.trim(),
          company_id: form.company_id,
          status: form.status,
          photo_url,
          slug,
          created_by: "qc_admin",
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); setSaving(false); return }
      onCreated(data.cardholder)
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  const modalInputStyle = {
    width: "100%",
    padding: "0.625rem 0.75rem",
    borderRadius: "0.625rem",
    border: "1.5px solid #E5E7EB",
    fontSize: "0.875rem",
    fontFamily: "inherit",
    color: "#34495E",
    outline: "none",
    boxSizing: "border-box",
    background: "#FFFFFF",
  }
  const labelStyle = {
    display: "block",
    fontSize: "0.75rem",
    fontWeight: 700,
    color: "#374151",
    marginBottom: "0.375rem",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  }

  const selectedCompanyName = companies.find((c) => c.id === form.company_id)?.company_name ?? ""
  const filteredCompanies = companies.filter((c) =>
    c.company_name.toLowerCase().includes(companySearch.toLowerCase())
  )

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(44, 62, 80, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 90,
        padding: "1rem",
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: "1rem",
          width: "100%",
          maxWidth: "480px",
          maxHeight: "88vh",
          overflowY: "auto",
          boxShadow: "0 8px 32px rgba(44, 62, 80, 0.18)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          padding: "1.25rem 1.5rem",
          borderBottom: "1px solid #E5E7EB",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          backgroundColor: "#FFFFFF",
          zIndex: 1,
        }}>
          <h2 style={{ margin: 0, fontSize: "1.0625rem", fontWeight: 700, color: "#34495E" }}>
            Add New Cardholder
          </h2>
          <button
            onClick={onClose}
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              border: "none",
              backgroundColor: "#EFF3F7",
              cursor: "pointer",
              fontSize: "1rem",
              color: "#374151",
              flexShrink: 0,
            }}
          >
            &#x2715;
          </button>
        </div>

        <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={labelStyle}>Full Name <span style={{ color: "#EF4444" }}>*</span></label>
            <input
              style={modalInputStyle}
              value={form.full_name}
              onChange={(e) => set("full_name", e.target.value)}
              onFocus={(e) => (e.target.style.borderColor = "#2f6f6a")}
              onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
              placeholder="e.g. John Smith"
            />
          </div>

          <div>
            <label style={labelStyle}>Photo (optional)</label>
            <FileUploadArea
              accept="image/jpeg,image/png,image/webp"
              file={photoFile}
              onFile={setPhotoFile}
            />
          </div>

          <div>
            <label style={labelStyle}>Company <span style={{ color: "#EF4444" }}>*</span></label>
            <div ref={companyRef} style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => { setCompanyOpen((v) => !v); setCompanySearch("") }}
                style={{
                  ...modalInputStyle,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  textAlign: "left",
                  border: `1.5px solid ${companyOpen ? "#2f6f6a" : "#E5E7EB"}`,
                }}
              >
                <span style={{ color: selectedCompanyName ? "#34495E" : "#9CA3AF" }}>
                  {selectedCompanyName || "Select a company..."}
                </span>
                <span style={{ color: "#6B7280", fontSize: "0.75rem", marginLeft: "0.5rem" }}>&#9662;</span>
              </button>

              {companyOpen && (
                <div style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  left: 0,
                  right: 0,
                  backgroundColor: "#FFFFFF",
                  border: "1.5px solid #E5E7EB",
                  borderRadius: "0.625rem",
                  zIndex: 20,
                  boxShadow: "0 4px 16px rgba(44, 62, 80, 0.12)",
                  overflow: "hidden",
                }}>
                  <div style={{ padding: "0.5rem", borderBottom: "1px solid #EFF3F7" }}>
                    <input
                      autoFocus
                      placeholder="Search companies..."
                      value={companySearch}
                      onChange={(e) => setCompanySearch(e.target.value)}
                      style={{ ...modalInputStyle, border: "1.5px solid #E5E7EB" }}
                    />
                  </div>
                  <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                    {filteredCompanies.length === 0 ? (
                      <p style={{ margin: 0, padding: "0.625rem 0.875rem", fontSize: "0.875rem", color: "#6B7280" }}>
                        No matches
                      </p>
                    ) : filteredCompanies.map((c) => {
                      const isSelected = form.company_id === c.id
                      return (
                        <div
                          key={c.id}
                          onClick={() => { set("company_id", c.id); setCompanyOpen(false) }}
                          onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = "#EFF3F7" }}
                          onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = isSelected ? "#34495E" : "transparent" }}
                          style={{
                            padding: "0.625rem 0.875rem",
                            cursor: "pointer",
                            fontSize: "0.875rem",
                            color: isSelected ? "#FFFFFF" : "#34495E",
                            backgroundColor: isSelected ? "#34495E" : "transparent",
                          }}
                        >
                          {c.company_name}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <label style={labelStyle}>Status <span style={{ color: "#EF4444" }}>*</span></label>
            <select
              style={modalInputStyle}
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
            >
              <option value="pending_activation">Pending Activation</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {error && <p style={{ margin: 0, fontSize: "0.8125rem", color: "#EF4444" }}>{error}</p>}

          <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
            <button
              onClick={handleSave}
              disabled={!isValid || saving}
              style={{
                flex: 1,
                padding: "0.75rem",
                borderRadius: "1rem",
                border: "none",
                background: "#2f6f6a",
                color: "#FFFFFF",
                fontSize: "0.875rem",
                fontWeight: 700,
                cursor: !isValid || saving ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                opacity: !isValid || saving ? 0.6 : 1,
              }}
            >
              {saving ? "Creating..." : "Create Cardholder"}
            </button>
            <button
              onClick={onClose}
              disabled={saving}
              style={{
                padding: "0.75rem 1.25rem",
                borderRadius: "1rem",
                border: "1.5px solid #E5E7EB",
                backgroundColor: "#FFFFFF",
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
        </div>
      </div>
    </div>
  )
}

function CardholdersTab() {
  const router = useRouter()
  const [cardholders, setCardholders] = useState([])
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [companyFilter, setCompanyFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [visibleCount, setVisibleCount] = useState(10)
  const [showAdd, setShowAdd] = useState(false)
  const [toast, setToast] = useState(null)
  const [token, setToken] = useState(null)

  async function fetchCardholders(tok, s, c, st) {
    const params = new URLSearchParams()
    if (s) params.set("search", s)
    if (c) params.set("company", c)
    if (st) params.set("status", st)
    const res = await fetch(`/api/superadmin/cardholders?${params.toString()}`, {
      headers: { Authorization: `Bearer ${tok}` },
    })
    const data = await res.json()
    setCardholders(data.cardholders ?? [])
    if (data.companies) setCompanies(data.companies)
  }

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      setToken(session.access_token)
      await fetchCardholders(session.access_token, "", "", "")
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (!token) return
    setVisibleCount(10)
    fetchCardholders(token, search, companyFilter, statusFilter)
  }, [search, companyFilter, statusFilter])

  const visible = cardholders.slice(0, visibleCount)
  const hasMore = cardholders.length > visibleCount

  function exportCSV() {
    const headers = ["Full Name", "Company", "Status"]
    const rows = cardholders.map((ch) => [
      ch.full_name ?? "",
      ch.company_name ?? "",
      ch.status ?? "",
    ])
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "cardholders.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  const controlStyle = {
    padding: "0.5625rem 0.875rem",
    borderRadius: "0.625rem",
    border: "1.5px solid #E5E7EB",
    fontSize: "0.875rem",
    fontFamily: "inherit",
    color: "#34495E",
    backgroundColor: "#FFFFFF",
    outline: "none",
  }

  const thStyle = {
    padding: "0.75rem 1rem",
    textAlign: "left",
    fontSize: "0.75rem",
    fontWeight: 700,
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    whiteSpace: "nowrap",
    borderBottom: "1px solid #E5E7EB",
  }

  const tdStyle = {
    padding: "0.875rem 1rem",
    fontSize: "0.875rem",
    color: "#34495E",
    borderBottom: "1px solid #EFF3F7",
    verticalAlign: "middle",
  }

  return (
    <div style={{ padding: "2rem 1.5rem", maxWidth: "1280px", margin: "0 auto" }}>
      <div style={{
        backgroundColor: "#FFFFFF",
        borderRadius: "1rem",
        boxShadow: "0 2px 8px rgba(44, 62, 80, 0.08), 0 1px 3px rgba(44, 62, 80, 0.05)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "1.25rem 1.5rem",
          borderBottom: "1px solid #E5E7EB",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
        }}>
          <h2 style={{ margin: 0, fontSize: "1.0625rem", fontWeight: 700, color: "#333333", letterSpacing: "-0.02em" }}>
            All Cardholders
          </h2>
          <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap" }}>
            {["Bulk Update", "Bulk Upload"].map((label) => (
              <button
                key={label}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "1rem",
                  border: "1.5px solid #E5E7EB",
                  backgroundColor: "#FFFFFF",
                  color: "#374151",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#EFF3F7")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#FFFFFF")}
              >
                {label}
              </button>
            ))}
            <button
              onClick={exportCSV}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "1rem",
                border: "1.5px solid #E5E7EB",
                backgroundColor: "#FFFFFF",
                color: "#374151",
                fontSize: "0.8125rem",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#EFF3F7")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#FFFFFF")}
            >
              &#8615; Export CSV
            </button>
            <button
              onClick={() => setShowAdd(true)}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "1rem",
                border: "none",
                background: "#2f6f6a",
                color: "#FFFFFF",
                fontSize: "0.8125rem",
                fontWeight: 700,
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

        {/* Filters */}
        <div style={{
          padding: "1rem 1.5rem",
          borderBottom: "1px solid #EFF3F7",
          display: "flex",
          gap: "0.75rem",
          flexWrap: "wrap",
        }}>
          <input
            type="text"
            placeholder="Search cardholders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...controlStyle, minWidth: "200px", flex: 1 }}
          />
          <select
            style={controlStyle}
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
          >
            <option value="">All Companies</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.company_name}</option>
            ))}
          </select>
          <select
            style={controlStyle}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
            <option value="pending_activation">Pending Activation</option>
          </select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="skeleton-pulse" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} style={{ height: "3rem", borderRadius: "0.5rem", backgroundColor: "#E8ECF0" }} />
            ))}
          </div>
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>Company</th>
                    <th style={thStyle}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ ...tdStyle, textAlign: "center", color: "#9CA3AF", padding: "3rem" }}>
                        No cardholders found
                      </td>
                    </tr>
                  ) : visible.map((ch) => (
                    <tr
                      key={ch.id}
                      onClick={() => router.push(`/superadmin/cardholders/${ch.id}`)}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F8FAFC")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                      style={{ cursor: "pointer" }}
                    >
                      <td style={{ ...tdStyle, fontWeight: 700 }}>{ch.full_name || "—"}</td>
                      <td style={{ ...tdStyle, color: "#374151" }}>{ch.company_name ?? "—"}</td>
                      <td style={tdStyle}><CardholderStatusBadge status={ch.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {hasMore && (
              <div style={{ padding: "1.25rem 1.5rem", borderTop: "1px solid #EFF3F7", textAlign: "center" }}>
                <button
                  onClick={() => setVisibleCount((v) => v + 10)}
                  style={{
                    width: "100%",
                    padding: "0.625rem 2rem",
                    borderRadius: "1rem",
                    border: "1.5px solid #E5E7EB",
                    backgroundColor: "#FFFFFF",
                    color: "#374151",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#EFF3F7")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#FFFFFF")}
                >
                  Load More ({cardholders.length - visibleCount} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {showAdd && (
        <AddCardholderModal
          token={token}
          companies={companies}
          onCreated={(newCh) => {
            setCardholders((prev) => [newCh, ...prev])
            setShowAdd(false)
            setToast({ message: "Cardholder created", type: "success" })
          }}
          onClose={() => setShowAdd(false)}
        />
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      )}
    </div>
  )
}

function TabContent({ activeTab, setActiveTab }) {
  if (activeTab === "Overview") return <OverviewTab setActiveTab={setActiveTab} />
  if (activeTab === "Pending Approvals") return <PendingApprovalsTab />
  if (activeTab === "Users") return <UsersTab />
  if (activeTab === "Companies") return <CompaniesTab />
  if (activeTab === "Cardholders") return <CardholdersTab />

  return (
    <div style={{
      padding: "2rem 1.5rem",
      maxWidth: "1280px",
      margin: "0 auto",
      color: "#374151",
      fontSize: "0.9375rem",
    }}>
      {activeTab} content goes here
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function SuperAdminPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState(null)
  const tabParam = searchParams.get("tab")
  const initialTab = TABS.find((t) => t.toLowerCase() === tabParam?.toLowerCase()) ?? "Overview"
  const [activeTab, setActiveTab] = useState(initialTab)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.replace("/login")
        return
      }

      const { data: userData, error } = await supabase
        .from("users")
        .select("role, full_name, account_status")
        .eq("id", session.user.id)
        .single()

      if (error || !userData) {
        router.replace("/login")
        return
      }

      if (userData.role !== "qc_admin") {
        router.replace("/dashboard")
        return
      }

      setUser({ ...userData, email: session.user.email })
      setLoading(false)
    }

    checkAuth()
  }, [router])

  if (loading) return <LoadingScreen />

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      backgroundColor: "#D9DEE5",
      fontFamily: "Inter, system-ui, sans-serif",
    }}>
      <Header user={user} />
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
      <main style={{ flex: 1 }}>
        <TabContent activeTab={activeTab} setActiveTab={setActiveTab} />
      </main>
    </div>
  )
}

export default function SuperAdminPage() {
  return (
    <Suspense>
      <SuperAdminPageInner />
    </Suspense>
  )
}
