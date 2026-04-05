"use client"

import { useState, useRef } from "react"
import { UploadCloud, Download, X, AlertCircle, CheckCircle2 } from "lucide-react"
import { parseCsv } from "@/lib/csvParse"
import { supabase } from "@/lib/supabase"

const REQUIRED_HEADERS = ["full_name"]

function validateRows(rows) {
  const errors = []
  const warnings = []
  const nameCounts = new Map()

  rows.forEach((r, idx) => {
    const rowNum = idx + 2 // +1 for header, +1 for 1-based

    const fullName = (r.full_name ?? "").trim()
    if (!fullName) {
      errors.push({ row: rowNum, error: "full_name is required" })
    } else {
      nameCounts.set(fullName.toLowerCase(), (nameCounts.get(fullName.toLowerCase()) ?? 0) + 1)
    }
  })

  // Duplicate-within-CSV warnings
  nameCounts.forEach((count, lowerName) => {
    if (count > 1) {
      warnings.push({ error: `"${lowerName}" appears ${count} times in this CSV` })
    }
  })

  return { errors, warnings }
}

function downloadTemplate() {
  const csv = "full_name\n"
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "cardholders_template.csv"
  a.click()
  URL.revokeObjectURL(url)
}

export default function BulkUploadCardholdersModal({ companyId, companyName, onClose, onSuccess }) {
  const [file, setFile] = useState(null)
  const [parsedRows, setParsedRows] = useState([])
  const [errors, setErrors] = useState([])
  const [warnings, setWarnings] = useState([])
  const [headerError, setHeaderError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [resultMessage, setResultMessage] = useState(null)
  const [serverError, setServerError] = useState(null)
  const inputRef = useRef(null)

  async function handleFile(f) {
    if (!f) return
    setFile(f)
    setParsedRows([])
    setErrors([])
    setWarnings([])
    setHeaderError(null)
    setResultMessage(null)
    setServerError(null)

    const text = await f.text()
    const { rows, headers } = parseCsv(text)

    // Header check
    const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h))
    if (missing.length > 0) {
      setHeaderError(`CSV is missing required columns: ${missing.join(", ")}. Expected headers: ${REQUIRED_HEADERS.join(", ")}`)
      return
    }

    setParsedRows(rows)
    const { errors: rowErrors, warnings: rowWarnings } = validateRows(rows)
    setErrors(rowErrors)
    setWarnings(rowWarnings)
  }

  function handleFileChange(e) {
    const f = e.target.files?.[0] ?? null
    handleFile(f)
    e.target.value = ""
  }

  function handleDrop(e) {
    e.preventDefault()
    const f = e.dataTransfer.files?.[0] ?? null
    handleFile(f)
  }

  async function handleImport() {
    if (errors.length > 0 || parsedRows.length === 0) return
    setSubmitting(true)
    setServerError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const payload = {
        rows: parsedRows.map((r) => ({
          full_name: (r.full_name ?? "").trim(),
        })),
      }
      const res = await fetch(`/api/superadmin/companies/${companyId}/cardholders/bulk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        setServerError(data.error ?? "Import failed")
        setSubmitting(false)
        return
      }
      setResultMessage(`Imported ${data.inserted} cardholder${data.inserted === 1 ? "" : "s"} successfully.`)
      setSubmitting(false)
      if (onSuccess) onSuccess(data.inserted)
      setTimeout(() => { onClose?.() }, 1500)
    } catch (err) {
      setServerError(err.message)
      setSubmitting(false)
    }
  }

  const canImport = parsedRows.length > 0 && errors.length === 0 && !headerError && !submitting

  return (
    <div
      style={{
        position: "fixed", inset: 0,
        background: "rgba(44, 62, 80, 0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 100, padding: "1rem",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#FFFFFF", borderRadius: "1rem",
          width: "100%", maxWidth: "640px",
          maxHeight: "88vh", overflowY: "auto",
          boxShadow: "0 8px 32px rgba(44, 62, 80, 0.18)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: "1.25rem 1.5rem",
          borderBottom: "1px solid #E5E7EB",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          position: "sticky", top: 0, background: "#FFFFFF", zIndex: 1,
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.0625rem", fontWeight: 700, color: "#34495E" }}>
              Bulk Upload Cardholders
            </h2>
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.8125rem", color: "#6B7280" }}>
              {companyName}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: "50%", border: "none",
              background: "#EFF3F7", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#374151",
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: "1.5rem" }}>
          {/* Template download */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "0.75rem 1rem", marginBottom: "1rem",
            background: "#F9FAFB", borderRadius: "0.625rem",
            border: "1px solid #E5E7EB",
          }}>
            <div>
              <p style={{ margin: 0, fontSize: "0.875rem", fontWeight: 600, color: "#374151" }}>
                Need a template?
              </p>
              <p style={{ margin: "0.125rem 0 0", fontSize: "0.75rem", color: "#6B7280" }}>
                Download a CSV with the required columns.
              </p>
            </div>
            <button
              onClick={downloadTemplate}
              style={{
                display: "flex", alignItems: "center", gap: "0.375rem",
                padding: "0.5rem 0.875rem", borderRadius: "0.5rem",
                border: "1px solid #E5E7EB", background: "#FFFFFF",
                color: "#374151", fontSize: "0.8125rem", fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#2f6f6a")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#E5E7EB")}
            >
              <Download size={14} />
              Download
            </button>
          </div>

          {/* File picker */}
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            style={{
              border: "2px dashed #E5E7EB",
              borderRadius: "0.75rem",
              padding: "1.75rem 1.5rem",
              textAlign: "center",
              cursor: "pointer",
              background: "#F9FAFB",
              transition: "border-color 0.15s ease",
              marginBottom: "1rem",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#2f6f6a")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#E5E7EB")}
          >
            <UploadCloud size={28} color="#9CA3AF" />
            <p style={{ margin: "0.5rem 0 0", fontSize: "0.875rem", color: "#374151", fontWeight: 500 }}>
              {file ? file.name : "Click or drag a CSV file here"}
            </p>
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem", color: "#9CA3AF" }}>
              One column: full_name. Imported cardholders start as Payment Pending.
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
          </div>

          {/* Header error */}
          {headerError && (
            <div style={{
              display: "flex", gap: "0.625rem",
              padding: "0.75rem 1rem", marginBottom: "1rem",
              background: "#FEF2F2", border: "1px solid #FECACA",
              borderRadius: "0.625rem",
            }}>
              <AlertCircle size={16} color="#EF4444" style={{ flexShrink: 0, marginTop: "0.125rem" }} />
              <p style={{ margin: 0, fontSize: "0.8125rem", color: "#991B1B" }}>
                {headerError}
              </p>
            </div>
          )}

          {/* Row errors */}
          {errors.length > 0 && (
            <div style={{
              padding: "0.75rem 1rem", marginBottom: "1rem",
              background: "#FEF2F2", border: "1px solid #FECACA",
              borderRadius: "0.625rem",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <AlertCircle size={16} color="#EF4444" />
                <p style={{ margin: 0, fontSize: "0.8125rem", fontWeight: 700, color: "#991B1B" }}>
                  {errors.length} error{errors.length === 1 ? "" : "s"} — fix your CSV and re-upload
                </p>
              </div>
              <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.75rem", color: "#991B1B", lineHeight: 1.6 }}>
                {errors.slice(0, 20).map((e, i) => (
                  <li key={i}>Row {e.row}: {e.error}</li>
                ))}
                {errors.length > 20 && (
                  <li style={{ fontStyle: "italic" }}>...and {errors.length - 20} more</li>
                )}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && errors.length === 0 && (
            <div style={{
              padding: "0.75rem 1rem", marginBottom: "1rem",
              background: "#FFFBEB", border: "1px solid #FDE68A",
              borderRadius: "0.625rem",
            }}>
              <p style={{ margin: "0 0 0.375rem", fontSize: "0.8125rem", fontWeight: 700, color: "#92400E" }}>
                {warnings.length} warning{warnings.length === 1 ? "" : "s"} (import still allowed)
              </p>
              <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.75rem", color: "#92400E", lineHeight: 1.6 }}>
                {warnings.map((w, i) => (
                  <li key={i}>{w.error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Success ready state */}
          {parsedRows.length > 0 && errors.length === 0 && !headerError && !resultMessage && (
            <div style={{
              display: "flex", alignItems: "center", gap: "0.625rem",
              padding: "0.75rem 1rem", marginBottom: "1rem",
              background: "#F0FDF4", border: "1px solid #BBF7D0",
              borderRadius: "0.625rem",
            }}>
              <CheckCircle2 size={16} color="#16A34A" />
              <p style={{ margin: 0, fontSize: "0.8125rem", color: "#166534", fontWeight: 600 }}>
                {parsedRows.length} row{parsedRows.length === 1 ? "" : "s"} ready to import
              </p>
            </div>
          )}

          {/* Preview */}
          {parsedRows.length > 0 && !headerError && (
            <div style={{
              border: "1px solid #E5E7EB", borderRadius: "0.625rem",
              marginBottom: "1rem", overflow: "hidden",
            }}>
              <p style={{
                margin: 0, padding: "0.625rem 0.875rem",
                fontSize: "0.75rem", fontWeight: 700, color: "#6B7280",
                textTransform: "uppercase", letterSpacing: "0.05em",
                background: "#F9FAFB", borderBottom: "1px solid #E5E7EB",
              }}>
                {parsedRows.length > 5
                  ? `Preview (first 5 of ${parsedRows.length})`
                  : `Preview (${parsedRows.length} row${parsedRows.length === 1 ? "" : "s"})`}
              </p>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem" }}>
                <thead>
                  <tr style={{ background: "#F9FAFB" }}>
                    <th style={{ padding: "0.5rem 0.875rem", textAlign: "left", color: "#6B7280", fontWeight: 600 }}>Name</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.slice(0, 5).map((r, i) => (
                    <tr key={i} style={{ borderTop: "1px solid #F3F4F6" }}>
                      <td style={{ padding: "0.5rem 0.875rem", color: "#374151" }}>{r.full_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Server error */}
          {serverError && (
            <div style={{
              padding: "0.75rem 1rem", marginBottom: "1rem",
              background: "#FEF2F2", border: "1px solid #FECACA",
              borderRadius: "0.625rem",
              fontSize: "0.8125rem", color: "#991B1B",
            }}>
              {serverError}
            </div>
          )}

          {/* Result */}
          {resultMessage && (
            <div style={{
              padding: "0.75rem 1rem", marginBottom: "1rem",
              background: "#F0FDF4", border: "1px solid #BBF7D0",
              borderRadius: "0.625rem",
              fontSize: "0.875rem", color: "#166534", fontWeight: 600,
            }}>
              {resultMessage}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
            <button
              onClick={onClose}
              disabled={submitting}
              style={{
                padding: "0.625rem 1.125rem", borderRadius: "0.5rem",
                border: "1px solid #E5E7EB", background: "#FFFFFF",
                color: "#34495E", fontSize: "0.875rem", fontWeight: 600,
                cursor: submitting ? "not-allowed" : "pointer",
                fontFamily: "inherit",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={!canImport}
              style={{
                padding: "0.625rem 1.125rem", borderRadius: "0.5rem", border: "none",
                background: "#2f6f6a", color: "#FFFFFF",
                fontSize: "0.875rem", fontWeight: 600,
                cursor: canImport ? "pointer" : "not-allowed",
                opacity: canImport ? 1 : 0.5,
                fontFamily: "inherit",
              }}
            >
              {submitting ? "Importing..." : parsedRows.length > 0 ? `Import ${parsedRows.length}` : "Import"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
