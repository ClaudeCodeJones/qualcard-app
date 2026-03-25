"use client";

import { useState, type ReactNode } from "react";
import { QRCodeSVG } from "qrcode.react";
import { GraduationCap, Award, ClipboardCheck, Shield, Building2, Calendar, QrCode } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type Status = "Active" | "Expired";

interface Credential {
  id: number;
  name: string;
  code: string;
  status: Status;
  issueDate: string;
  expiryDate: string;
  provider?: string;
}

// ─── Placeholder Data ─────────────────────────────────────────────────────────

const WORKER = {
  name: "LACHIE ANDERSON",
  company: "Jeslanvy Civil",
  initials: "LA",
  cardUrl: "https://qualcard.co.nz/card/lachie-anderson-7egfkvs",
};

const QUALIFICATIONS: Credential[] = [
  { id: 1, name: "First Aid", code: "US 6401/6402", status: "Expired", issueDate: "15 March 2022", expiryDate: "15 March 2025", provider: "St John" },
  { id: 2, name: "STMS Practicing", code: "US 31963", status: "Active", issueDate: "19 January 2026", expiryDate: "No expiry", provider: "MW Training & Planning" },
  { id: 3, name: "STMS Non Practicing", code: "US 31962", status: "Active", issueDate: "19 January 2026", expiryDate: "No expiry", provider: "MW Training & Planning" },
  { id: 4, name: "STMS Universal", code: "US 31961", status: "Active", issueDate: "19 January 2026", expiryDate: "No expiry", provider: "MW Training & Planning" },
  { id: 5, name: "TMO Practicing", code: "US 31960", status: "Active", issueDate: "19 January 2026", expiryDate: "No expiry", provider: "MW Training & Planning" },
  { id: 6, name: "TMO Non Practicing", code: "US 31959", status: "Active", issueDate: "19 January 2026", expiryDate: "No expiry", provider: "MW Training & Planning" },
  { id: 7, name: "TTM Worker", code: "US 31958", status: "Active", issueDate: "19 January 2026", expiryDate: "No expiry", provider: "MW Training & Planning" },
];

const COMPETENCIES: Credential[] = [
  { id: 1, name: "Traffic Lights", code: "EQ 001", status: "Active", issueDate: "15 January 2025", expiryDate: "No expiry" },
  { id: 2, name: "VMS Board trailer", code: "EQ 002", status: "Active", issueDate: "15 January 2025", expiryDate: "No expiry" },
  { id: 3, name: "Cyclist Management", code: "Static G002", status: "Active", issueDate: "15 January 2025", expiryDate: "No expiry" },
  { id: 4, name: "AWVMS", code: "Driver VC003", status: "Active", issueDate: "15 January 2025", expiryDate: "No expiry" },
  { id: 5, name: "Pedestrian Management", code: "Static G001", status: "Active", issueDate: "15 January 2025", expiryDate: "No expiry" },
  { id: 6, name: "Class One Arrow Board", code: "Static VC001", status: "Active", issueDate: "15 January 2025", expiryDate: "No expiry" },
];

const SITE_INDUCTIONS: Credential[] = [
  { id: 1, name: "Fulton Hogan Subcontractor Induction", code: "", status: "Active", issueDate: "1 February 2025", expiryDate: "No expiry" },
  { id: 2, name: "Downer Company Induction", code: "", status: "Active", issueDate: "1 March 2025", expiryDate: "No expiry" },
];

const PERMITS: Credential[] = [
  { id: 1, name: "Excavation/Digging", code: "PTW1.7", status: "Active", issueDate: "15 January 2025", expiryDate: "No expiry" },
  { id: 2, name: "Hot Work", code: "PTW1.6", status: "Active", issueDate: "15 January 2025", expiryDate: "No expiry" },
  { id: 3, name: "Working at Height", code: "PTW1.4", status: "Active", issueDate: "15 January 2025", expiryDate: "No expiry" },
  { id: 4, name: "Confined Space Entry", code: "PTW1.5", status: "Active", issueDate: "15 January 2025", expiryDate: "No expiry" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status, large, accentClass }: { status: Status; large?: boolean; accentClass?: string }) {
  const base = large
    ? "inline-flex items-center rounded-full border text-sm font-medium px-4 py-1"
    : "inline-flex items-center rounded-full border text-xs font-medium px-3 py-0.5 whitespace-nowrap";

  if (status === "Expired") {
    return <span className={`${base} bg-red-500 border-red-500 text-white`}>Expired</span>;
  }
  return <span className={`${base} bg-white ${accentClass ?? "border-gray-400 text-gray-600"}`}>Active</span>;
}

function CredentialCard({
  credential,
  onClick,
  accentClass,
}: {
  credential: Credential;
  onClick: (c: Credential) => void;
  accentClass?: string;
}) {
  return (
    <button
      onClick={() => onClick(credential)}
      className="w-full text-left bg-white rounded-2xl px-4 py-3.5 shadow-md border border-gray-100 flex items-center justify-between gap-3 active:bg-gray-50 transition-colors"
    >
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-gray-900 text-sm leading-snug">{credential.name}</p>
        {credential.code && (
          <p className="text-gray-400 text-xs mt-0.5">{credential.code}</p>
        )}
      </div>
      <StatusBadge status={credential.status} accentClass={accentClass} />
    </button>
  );
}

interface SectionConfig {
  title: string;
  icon: ReactNode;
  credentials: Credential[];
  defaultCount: number;
  borderClass: string;
  textClass: string;
  badgeAccent: string;
}

function CredentialSection({
  title,
  icon,
  credentials,
  defaultCount,
  borderClass,
  textClass,
  badgeAccent,
  onCredentialClick,
}: SectionConfig & { onCredentialClick: (c: Credential) => void }) {
  const [showAll, setShowAll] = useState(false);
  const displayed = showAll ? credentials : credentials.slice(0, defaultCount);
  const hasMore = credentials.length > defaultCount;

  return (
    <div className={`bg-white border-l-4 ${borderClass} rounded-2xl shadow-lg overflow-hidden`}>
      <div className="px-4 py-4">
        <div className="flex items-center gap-2 mb-3">
          {icon}
          <h2 className="font-bold text-xs tracking-widest text-gray-700">{title}</h2>
        </div>
        <div className="flex flex-col gap-2">
          {displayed.map((cred) => (
            <CredentialCard key={cred.id} credential={cred} onClick={onCredentialClick} accentClass={badgeAccent} />
          ))}
        </div>
        {hasMore && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            className={`w-full text-center mt-3 text-sm font-semibold ${textClass}`}
          >
            View all ({credentials.length})
          </button>
        )}
      </div>
    </div>
  );
}

function CredentialModal({
  credential,
  onClose,
}: {
  credential: Credential | null;
  onClose: () => void;
}) {
  if (!credential) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-5 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border-l-4 border-blue-500 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 text-xl leading-none transition-colors"
          aria-label="Close"
        >
          ×
        </button>

        <div className="p-5 pt-4">
          {/* Modal header */}
          <div className="flex items-center gap-2 mb-4">
            <GraduationCap className="w-5 h-5 text-blue-500 shrink-0" />
            <h3 className="font-bold text-xs tracking-widest text-gray-600 uppercase">
              Qualification Details
            </h3>
          </div>

          {/* Credential name + code */}
          <h2 className="font-bold text-xl text-gray-900 leading-tight pr-6">
            {credential.name}
          </h2>
          <p className="text-gray-500 text-sm mt-1">{credential.code}</p>

          {/* Training Provider */}
          {credential.provider && (
            <div className="mt-5 flex items-start gap-2.5">
              <Building2 className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                  Training Provider
                </p>
                <p className="text-sm text-gray-700 mt-0.5">{credential.provider}</p>
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                  Issue Date
                </p>
                <p className="text-sm text-gray-700 mt-0.5">{credential.issueDate}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                  Expiry Date
                </p>
                <p className="text-sm text-gray-700 mt-0.5">{credential.expiryDate}</p>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="mt-5">
            <p className="text-sm font-semibold text-gray-700 mb-2">Status</p>
            <StatusBadge status={credential.status} large />
          </div>

          {/* Divider + Disclaimer */}
          <hr className="my-4 border-gray-200" />
          <p className="text-xs text-gray-400 leading-relaxed">
            Data maintained by employer.
            <br />
            QualCard assumes no liability for accuracy.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── QualCard Logo Mark ───────────────────────────────────────────────────────

function QualCardLogo({ size = "md" }: { size?: "sm" | "md" }) {
  const ring = size === "sm" ? "w-5 h-5 border" : "w-7 h-7 border-2";
  const text = size === "sm" ? "text-[7px]" : "text-[9px]";
  const label = size === "sm" ? "text-xs" : "text-sm";
  return (
    <div className="flex items-center gap-1.5">
      <div className={`${ring} rounded-full border-current flex items-center justify-center shrink-0`}>
        <span className={`${text} font-black leading-none`}>QC</span>
      </div>
      <span className={`${label} font-extrabold tracking-wider`}>QUALCARD</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CardPage() {
  const [selectedCredential, setSelectedCredential] = useState<Credential | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const sections: SectionConfig[] = [
    {
      title: "QUALIFICATIONS",
      icon: <GraduationCap className="w-5 h-5 text-blue-500" />,
      credentials: QUALIFICATIONS,
      defaultCount: 3,
      borderClass: "border-blue-500",
      textClass: "text-blue-500",
      badgeAccent: "border-blue-500 text-blue-500",
    },
    {
      title: "COMPETENCIES",
      icon: <Award className="w-5 h-5 text-orange-500" />,
      credentials: COMPETENCIES,
      defaultCount: 3,
      borderClass: "border-orange-500",
      textClass: "text-orange-500",
      badgeAccent: "border-orange-500 text-orange-500",
    },
    {
      title: "SITE INDUCTIONS",
      icon: <ClipboardCheck className="w-5 h-5 text-teal-500" />,
      credentials: SITE_INDUCTIONS,
      defaultCount: 3,
      borderClass: "border-teal-500",
      textClass: "text-teal-500",
      badgeAccent: "border-teal-500 text-teal-500",
    },
    {
      title: "PERMITS & CERTIFICATES",
      icon: <Shield className="w-5 h-5 text-green-600" />,
      credentials: PERMITS,
      defaultCount: 3,
      borderClass: "border-green-600",
      textClass: "text-green-600",
      badgeAccent: "border-green-600 text-green-600",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-sm mx-auto flex flex-col min-h-screen">

        {/* ── Hero Header ── */}
        <div className="bg-[#2d4a5e] px-5 pt-6 pb-28 rounded-t-3xl mt-3">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-white/50 text-[9px] font-bold tracking-[0.18em] uppercase mb-1">
                Powered by
              </p>
              <img
                src="/images/qualcard_logo_white.png"
                alt="QualCard"
                className="h-10 w-auto"
              />
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

        {/* ── Worker Identity ── */}
        <div className="bg-white flex flex-col items-center pb-5 px-5 rounded-b-3xl shadow-lg">
          {/* Avatar — overlaps the dark header */}
          <div className="w-44 h-44 rounded-full border-4 border-white shadow-xl -mt-32 z-10 overflow-hidden shrink-0">
            <img
              src="/images/placeholder_worker.webp"
              alt={WORKER.name}
              className="w-full h-full object-cover"
            />
          </div>

          <h1 className="mt-4 text-2xl font-extrabold text-gray-900 tracking-tight text-center leading-tight">
            {WORKER.name}
          </h1>
          <p className="text-base text-gray-700 font-medium mt-1">{WORKER.company}</p>

          {/* Active status + QR */}
          <div className="w-full mt-5">
            <div className="w-full bg-green-500 rounded-2xl py-4 flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-base tracking-widest">ACTIVE</span>
            </div>
            <button
              onClick={() => setShowQR(true)}
              className="w-full mt-3 py-2.5 rounded-full border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 shadow-md"
            >
              <QrCode className="w-4 h-4" />
              Show QR Code
            </button>
          </div>
        </div>

        {/* ── Credential Sections ── */}
        <div className="flex flex-col gap-3 mt-3 flex-1">
          {sections.map((section) => (
            <CredentialSection
              key={section.title}
              {...section}
              onCredentialClick={setSelectedCredential}
            />
          ))}
        </div>

        {/* ── Footer ── */}
        <footer className="mt-6 pt-5 pb-8 px-5 flex flex-col items-center gap-2.5">
          <div className="flex items-center gap-2 text-gray-500 flex-wrap justify-center">
            <img
                src="/images/qualcard_logo_colour.png"
                alt="QualCard"
                className="h-8 w-auto"
              />
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

      {/* ── QR Modal ── */}
      {showQR && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50"
          onClick={() => setShowQR(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-xs p-8 flex flex-col items-center relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowQR(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 text-xl leading-none transition-colors"
              aria-label="Close"
            >
              ×
            </button>
            <p className="font-bold text-gray-900 text-lg tracking-tight mb-1">{WORKER.name}</p>
            <p className="text-gray-400 text-sm mb-6">{WORKER.company}</p>
            <div className="p-3 bg-white rounded-2xl border border-gray-100 shadow-inner">
              <QRCodeSVG value={WORKER.cardUrl} size={220} level="M" />
            </div>
            <p className="text-xs text-gray-400 mt-5">Scan to view credentials</p>
          </div>
        </div>
      )}

      {/* ── Info Modal ── */}
      {showInfo && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50"
          onClick={() => setShowInfo(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowInfo(false)}
              className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 text-lg leading-none transition-colors"
              aria-label="Close"
            >
              ×
            </button>
            <h3 className="font-bold text-gray-900 text-base text-center mb-3">Information</h3>
            <p className="text-sm text-gray-500 text-center leading-relaxed">
              All competency and qualification records are maintained by the respective company.
              QualCard assumes no liability for data entry errors or the accuracy of information
              provided by third parties.
            </p>
          </div>
        </div>
      )}

      {/* ── Credential Detail Modal ── */}
      <CredentialModal
        credential={selectedCredential}
        onClose={() => setSelectedCredential(null)}
      />
    </div>
  );
}
