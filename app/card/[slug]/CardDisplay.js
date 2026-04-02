"use client"

import { useState } from "react"
import { QRCodeSVG } from "qrcode.react"
import { GraduationCap, Award, ClipboardCheck, Shield, Building2, Calendar, QrCode } from "lucide-react"

function formatDate(iso) {
  if (!iso) return "No expiry"
  return new Date(iso).toLocaleDateString("en-NZ", { day: "numeric", month: "long", year: "numeric" })
}

function getStatus(expiryDate) {
  if (!expiryDate) return "Active"
  const now = new Date()
  const expiry = new Date(expiryDate)
  if (expiry < now) return "Expired"
  const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24))
  if (daysLeft <= 30) return "Expiring Soon"
  return "Active"
}

function StatusBadge({ status, large, accentClass }) {
  const base = large
    ? "inline-flex items-center rounded-full border text-sm font-medium px-4 py-1"
    : "inline-flex items-center rounded-full border text-xs font-medium px-3 py-0.5 whitespace-nowrap"
  if (status === "Expired") {
    return <span className={`${base} bg-red-500 border-red-500 text-white`}>Expired</span>
  }
  if (status === "Expiring Soon") {
    return <span className={`${base} bg-yellow-500 border-yellow-500 text-white`}>Expiring Soon</span>
  }
  return <span className={`${base} bg-white ${accentClass ?? "border-gray-400 text-gray-600"}`}>Active</span>
}

function CredentialCard({ cred, onClick, accentClass }) {
  const status = getStatus(cred.expiry_date)
  const code = getCode(cred)
  return (
    <button
      onClick={() => onClick(cred)}
      className="w-full text-left bg-white rounded-2xl px-3 py-2.5 md:px-4 md:py-3.5 shadow-md border border-gray-100 flex items-center justify-between gap-2.5 md:gap-3 active:bg-gray-50 transition-colors"
    >
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-gray-900 text-sm leading-snug">{cred.qualification?.name}</p>
        {code && (
          <p className="text-gray-400 text-xs mt-0.5">{code}</p>
        )}
      </div>
      {status !== "Active" && <StatusBadge status={status} accentClass={accentClass} />}
    </button>
  )
}

function CredentialSection({ title, icon, credentials, defaultCount, borderClass, textClass, badgeAccent, onCredentialClick }) {
  const [showAll, setShowAll] = useState(false)
  const displayed = showAll ? credentials : credentials.slice(0, defaultCount)
  const hasMore = credentials.length > defaultCount

  return (
    <div className={`bg-white border-l-4 ${borderClass} rounded-2xl shadow-lg overflow-hidden`}>
      <div className="px-4 py-4">
        <div className="flex items-center gap-2 mb-3">
          {icon}
          <h2 className="font-bold text-xs tracking-widest text-gray-700">{title}</h2>
        </div>
        <div className="flex flex-col gap-1.5 md:gap-2">
          {displayed.map((cred) => (
            <CredentialCard key={cred.id} cred={cred} onClick={onCredentialClick} accentClass={badgeAccent} />
          ))}
        </div>
        {hasMore && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            className={`w-full text-center mt-3 text-xs font-medium text-gray-500`}
          >
            View all ({credentials.length})
          </button>
        )}
      </div>
    </div>
  )
}

function CredentialModal({ cred, onClose }) {
  if (!cred) return null
  const status = getStatus(cred.expiry_date)

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-5 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border-l-4 border-blue-500 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 text-xl leading-none transition-colors"
          aria-label="Close"
        >
          ×
        </button>

        <div className="p-5 pt-4">
          <div className="flex items-center gap-2 mb-4">
            <GraduationCap className="w-5 h-5 text-blue-500 shrink-0" />
            <h3 className="font-bold text-xs tracking-widest text-gray-600 uppercase">
              Credential Details
            </h3>
          </div>

          <h2 className="font-bold text-xl text-gray-900 leading-tight pr-6">
            {cred.qualification?.name}
          </h2>
          {cred.qualification?.unit_standard_number && (
            <p className="text-gray-500 text-sm mt-1">{cred.qualification.unit_standard_number}</p>
          )}

          {cred.provider && (
            <div className="mt-5 flex items-start gap-2.5">
              <Building2 className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Training Provider</p>
                <p className="text-sm text-gray-700 mt-0.5">{cred.provider}</p>
              </div>
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Issue Date</p>
                <p className="text-sm text-gray-700 mt-0.5">{formatDate(cred.issue_date)}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Expiry Date</p>
                <p className="text-sm text-gray-700 mt-0.5">{formatDate(cred.expiry_date)}</p>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <p className="text-sm font-semibold text-gray-700 mb-2">Status</p>
            <StatusBadge status={status} large />
          </div>

          <hr className="my-4 border-gray-200" />
          <p className="text-xs text-gray-400 leading-relaxed">
            Data maintained by employer.<br />
            QualCard assumes no liability for accuracy.
          </p>
        </div>
      </div>
    </div>
  )
}

function getCode(cred) {
  const q = cred.qualification
  if (!q) return null
  return q.unit_standard_number || q.competency_code || q.induction_code || q.permit_number || null
}

function sortCredentials(creds, type) {
  const manually = creds.filter(c => c.is_manually_ordered === true)
  const notManually = creds.filter(c => c.is_manually_ordered !== true)

  manually.sort((a, b) => (a.display_order || 0) - (b.display_order || 0))

  if (type === "qualification") {
    notManually.sort((a, b) => new Date(b.issue_date) - new Date(a.issue_date))
  } else {
    notManually.sort((a, b) => (a.qualification?.name || "").localeCompare(b.qualification?.name || ""))
  }

  return [...manually, ...notManually]
}

function ProfilePhoto({ name, url }) {
  const [loaded, setLoaded] = useState(false)
  const initials = name?.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()

  return (
    <div className="w-44 h-44 rounded-full border-4 border-white shadow-xl -mt-32 z-10 overflow-hidden shrink-0" style={{ position: "relative" }}>
      <div className="w-full h-full flex items-center justify-center text-3xl font-bold" style={{ backgroundColor: "#D1D5DB", color: "#6B7280" }}>
        {initials}
      </div>
      {url && (
        <img
          src={url}
          alt={name}
          onLoad={() => setLoaded(true)}
          className="w-full h-full object-cover"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            opacity: loaded ? 1 : 0,
            transition: "opacity 0.3s ease",
          }}
        />
      )}
    </div>
  )
}

export default function CardDisplay({ cardholder, credentials = [], companyName, appUrl }) {
  const [selectedCred, setSelectedCred] = useState(null)
  const [showQR, setShowQR] = useState(false)
  const [showInfo, setShowInfo] = useState(false)

  const profileUrl = `${appUrl}/card/${cardholder.slug}`

  const sections = [
    {
      key: "qualification",
      title: "QUALIFICATIONS",
      icon: <GraduationCap className="w-5 h-5 text-blue-500" />,
      defaultCount: 3,
      borderClass: "border-blue-500",
      textClass: "text-blue-500",
      badgeAccent: "border-blue-500 text-blue-500",
    },
    {
      key: "competency",
      title: "COMPETENCIES",
      icon: <Award className="w-5 h-5 text-orange-500" />,
      defaultCount: 3,
      borderClass: "border-orange-500",
      textClass: "text-orange-500",
      badgeAccent: "border-orange-500 text-orange-500",
    },
    {
      key: "site_induction",
      title: "SITE INDUCTIONS",
      icon: <ClipboardCheck className="w-5 h-5 text-violet-600" />,
      defaultCount: 3,
      borderClass: "border-violet-600",
      textClass: "text-violet-600",
      badgeAccent: "border-violet-600 text-violet-600",
    },
    {
      key: "permit",
      title: "PERMITS & CERTIFICATES",
      icon: <Shield className="w-5 h-5 text-green-600" />,
      defaultCount: 3,
      borderClass: "border-green-600",
      textClass: "text-green-600",
      badgeAccent: "border-green-600 text-green-600",
    },
  ]

  const grouped = credentials.reduce((acc, cred) => {
    const type = cred.qualification?.type || "qualification"
    if (!acc[type]) acc[type] = []
    acc[type].push(cred)
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-sm mx-auto flex flex-col min-h-screen">

        {/* Header */}
        <div className="px-5 pt-6 pb-28 rounded-t-3xl mt-3" style={{ background: "radial-gradient(circle, #2f6f6a 0%, #1a4f48 100%)" }}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-white/50 text-[9px] font-bold tracking-[0.18em] uppercase mb-1">Powered by</p>
              <img src="/images/qualcard_logo_wide_white.png" alt="QualCard" className="h-10 w-auto" />
            </div>
            <button
              onClick={() => setShowInfo(true)}
              className="w-8 h-8 rounded-full border border-white/30 flex items-center justify-center hover:bg-white/10 transition-colors mt-0.5"
              aria-label="Info"
            >
              <span className="text-white/70 text-sm font-serif italic leading-none select-none">i</span>
            </button>
          </div>
        </div>

        {/* Identity card */}
        <div className="bg-white flex flex-col items-center pb-5 px-5 rounded-b-3xl shadow-lg">
          <ProfilePhoto name={cardholder.full_name} url={cardholder.photo_url} />

          <h1 className="mt-3 text-2xl font-extrabold text-gray-900 tracking-tight text-center leading-tight">
            {cardholder.full_name}
          </h1>
          {companyName && (
            <p className="text-base text-gray-700 font-medium mt-1">{companyName}</p>
          )}

          <div className="w-full mt-3">
            <div className="w-full rounded-2xl py-3 flex items-center justify-center shadow-lg" style={{ background: "#3d7d4f" }}>
              <span className="text-white font-bold text-base tracking-widest">ACTIVE</span>
            </div>
            <button
              onClick={() => setShowQR(true)}
              className="w-full mt-3 py-2.5 rounded-full border border-gray-400 text-gray-800 text-sm font-medium hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 shadow-md"
            >
              <QrCode className="w-4 h-4" />
              Show QR Code
            </button>
          </div>
        </div>

        {/* Credential sections */}
        <div className="flex flex-col gap-3 mt-3 flex-1">
          {sections.map((section) => {
            const creds = sortCredentials(grouped[section.key] || [], section.key)
            if (creds.length === 0) return null
            return (
              <CredentialSection
                key={section.key}
                title={section.title}
                icon={section.icon}
                credentials={creds}
                defaultCount={section.defaultCount}
                borderClass={section.borderClass}
                textClass={section.textClass}
                badgeAccent={section.badgeAccent}
                onCredentialClick={setSelectedCred}
              />
            )
          })}
        </div>

        {/* Footer */}
        <footer className="mt-6 pt-5 pb-8 px-5 flex flex-col items-center gap-2.5">
          <div className="flex items-center gap-2 text-gray-500 flex-wrap justify-center">
            <img src="/images/qualcard_logo_wide_teal.png" alt="QualCard" className="h-8 w-auto" />
            <span className="text-gray-300">|</span>
            <span className="text-xs text-gray-400">qualcard.co.nz</span>
            <span className="text-gray-300">|</span>
            <span className="text-xs text-gray-400">info@qualcard.co.nz</span>
          </div>
          <p className="text-[10px] text-gray-400 text-center leading-relaxed max-w-xs">
            All competency and qualification data is maintained by the respective company.
            QualCard assumes no liability for data accuracy.
          </p>
        </footer>
      </div>

      {/* QR Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50" onClick={() => setShowQR(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xs p-8 flex flex-col items-center relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowQR(false)} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 text-xl leading-none transition-colors" aria-label="Close">×</button>
            <p className="font-bold text-gray-900 text-lg tracking-tight mb-6">{cardholder.full_name}</p>
            <div className="p-3 bg-white rounded-2xl border border-gray-100 shadow-inner">
              <QRCodeSVG value={profileUrl} size={220} level="M" />
            </div>
            <p className="text-xs text-gray-400 mt-5">Scan to view credentials</p>
          </div>
        </div>
      )}

      {/* Info Modal */}
      {showInfo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50" onClick={() => setShowInfo(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowInfo(false)} className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 text-lg leading-none transition-colors" aria-label="Close">×</button>
            <h3 className="font-bold text-gray-900 text-base text-center mb-3">Information</h3>
            <p className="text-sm text-gray-500 text-center leading-relaxed">
              All competency and qualification records are maintained by the respective company.
              QualCard assumes no liability for data entry errors or the accuracy of information provided by third parties.
            </p>
          </div>
        </div>
      )}

      {/* Credential detail modal */}
      <CredentialModal cred={selectedCred} onClose={() => setSelectedCred(null)} />
    </div>
  )
}
