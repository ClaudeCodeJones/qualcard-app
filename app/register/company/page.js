"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import Header from "@/app/components/Header"
import FileUploadArea from "@/app/components/FileUploadArea"

// ─── Constants ────────────────────────────────────────────────────────────────

const FLAGGED_WORDS = ["test", "demo", "example", "mcdonalds"]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function validate(form) {
  const errors = {}

  if (!form.companyName.trim()) errors.companyName = "Company name is required."
  if (!form.streetAddress.trim()) errors.streetAddress = "Street address is required."
  if (!form.suburb.trim()) errors.suburb = "Suburb is required."
  if (!form.city.trim()) errors.city = "City is required."

  if (!form.generalEmail.trim()) {
    errors.generalEmail = "Company email is required."
  } else if (!isValidEmail(form.generalEmail)) {
    errors.generalEmail = "Please enter a valid email address."
  }

  if (!form.companyPhone.trim()) errors.companyPhone = "Company phone is required."
  if (!form.contactName.trim()) errors.contactName = "Full name is required."

  if (!form.contactEmail.trim()) {
    errors.contactEmail = "Email address is required."
  } else if (!isValidEmail(form.contactEmail)) {
    errors.contactEmail = "Please enter a valid email address."
  }

  if (!form.contactPhone.trim()) errors.contactPhone = "Phone number is required."

  return errors
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputStyle = {
  width: "100%",
  padding: "0.625rem 0.875rem",
  border: "1px solid #E5E7EB",
  borderRadius: "0.5rem",
  fontSize: "0.9375rem",
  color: "#333333",
  backgroundColor: "#FFFFFF",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.15s ease",
  fontFamily: "inherit",
}

const inputErrorStyle = {
  ...inputStyle,
  borderColor: "#EF4444",
}

const labelStyle = {
  display: "block",
  fontSize: "0.875rem",
  fontWeight: 500,
  color: "#333333",
  marginBottom: "0.375rem",
}

const helperStyle = {
  fontSize: "0.8125rem",
  color: "#374151",
  marginTop: "0.3rem",
  lineHeight: 1.5,
}

const fieldErrorStyle = {
  fontSize: "0.8125rem",
  color: "#EF4444",
  marginTop: "0.3rem",
}

const sectionLabelStyle = {
  fontSize: "0.6875rem",
  fontWeight: 700,
  color: "#374151",
  textTransform: "uppercase",
  letterSpacing: "0.07em",
  marginBottom: "1rem",
  paddingBottom: "0.5rem",
  borderBottom: "1px solid #E5E7EB",
}

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({ label, required, helper, error, children }) {
  return (
    <div>
      <label style={labelStyle}>
        {label}
        {required && <span style={{ color: "#EF4444", marginLeft: "0.2rem" }}>*</span>}
      </label>
      {children}
      {helper && !error && <p style={helperStyle}>{helper}</p>}
      {error && <p style={fieldErrorStyle}>{error}</p>}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CompanyRegistrationPage() {
  const router = useRouter()

  const [form, setForm] = useState({
    companyName: "",
    streetAddress: "",
    suburb: "",
    city: "",
    generalEmail: "",
    companyPhone: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
  })
  const [errors, setErrors] = useState({})
  const [generalError, setGeneralError] = useState("")
  const [loading, setLoading] = useState(false)
  const [logoFile, setLogoFile] = useState(null)

  function handleChange(field) {
    return (e) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  function getInputStyle(field) {
    return errors[field] ? inputErrorStyle : inputStyle
  }

  function onFocus(e) {
    if (!e.target.style.borderColor.includes("EF4444")) {
      e.target.style.borderColor = "#34495E"
    }
  }

  function onBlur(e, field) {
    if (!errors[field]) e.target.style.borderColor = "#E5E7EB"
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setGeneralError("")

    const validationErrors = validate(form)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setLoading(true)

    const isFlagged = FLAGGED_WORDS.some((word) =>
      form.companyName.toLowerCase().includes(word)
    )

    const { error: insertError } = await supabase
      .from("registration_drafts")
      .insert({
        email: form.contactEmail.trim().toLowerCase(),
        company_name: form.companyName.trim(),
        company_phone: form.companyPhone.trim(),
        street_address: form.streetAddress.trim(),
        suburb: form.suburb.trim(),
        city: form.city.trim(),
        primary_contact_name: form.contactName.trim(),
        primary_contact_phone: form.contactPhone.trim(),
        logo_url: null,
        is_flagged: isFlagged,
      })

    if (insertError) {
      setLoading(false)
      if (insertError.code === "23505" || insertError.message?.toLowerCase().includes("duplicate")) {
        setErrors((prev) => ({
          ...prev,
          contactEmail:
            "An application for this email already exists. Please contact info@qualcard.co.nz if you need help.",
        }))
        return
      }
      setGeneralError("Something went wrong submitting your registration. Please try again.")
      return
    }

    router.push(`/register/confirm?email=${encodeURIComponent(form.contactEmail.trim())}`)
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "#D9DEE5" }}>

      <Header user={null} />

      {/* Main */}
      <main style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "2rem 1rem 4rem",
        maxWidth: "1280px",
        margin: "0 auto",
        width: "100%",
      }}>

        {/* Back link */}
        <div style={{ width: "100%", maxWidth: "480px", marginBottom: "0.875rem" }}>
          <Link
            href="/login"
            style={{
              fontSize: "0.875rem",
              color: "#34495E",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem",
              fontWeight: 500,
              opacity: 0.9,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
          >
            &larr; Back to sign in
          </Link>
        </div>

        {/* Card */}
        <div style={{
          backgroundColor: "#FFFFFF",
          borderRadius: "1rem",
          padding: "2.5rem 2rem",
          width: "100%",
          maxWidth: "480px",
          boxShadow: "0 4px 24px rgba(44, 62, 80, 0.12), 0 1px 4px rgba(44, 62, 80, 0.06)",
        }}>

          {/* Heading */}
          <h1 style={{
            color: "#333333",
            fontSize: "1.375rem",
            fontWeight: 700,
            marginBottom: "0.375rem",
            letterSpacing: "-0.03em",
            lineHeight: 1.3,
          }}>
            Register Your Company
          </h1>
          <p style={{
            color: "#374151",
            fontSize: "0.9rem",
            lineHeight: 1.6,
            marginBottom: "1.5rem",
          }}>
            Tell us about your company and we'll be in touch within 24 hours.
          </p>

          {/* Info banner */}
          <div style={{
            backgroundColor: "#EFF3F7",
            borderLeft: "4px solid #34495E",
            borderRadius: "0 0.5rem 0.5rem 0",
            padding: "0.875rem 1rem",
            marginBottom: "1.75rem",
            fontSize: "0.875rem",
            color: "#334155",
            lineHeight: 1.6,
          }}>
            All new company registrations are reviewed by QualCard before access is granted. You'll receive an email once your account has been approved.
          </div>

          {/* General error */}
          {generalError && (
            <div style={{
              backgroundColor: "#FEF2F2",
              border: "1px solid #FECACA",
              borderRadius: "0.5rem",
              padding: "0.75rem 1rem",
              marginBottom: "1.25rem",
              color: "#EF4444",
              fontSize: "0.875rem",
              lineHeight: 1.5,
            }}>
              {generalError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "1.125rem" }}>

            {/* Section: Company Details */}
            <div style={sectionLabelStyle}>Company Details</div>

            <Field label="Company Name" required error={errors.companyName}>
              <input
                type="text"
                value={form.companyName}
                onChange={handleChange("companyName")}
                placeholder="Acme Construction Ltd"
                style={getInputStyle("companyName")}
                onFocus={onFocus}
                onBlur={(e) => onBlur(e, "companyName")}
              />
            </Field>

            <Field label="Street Address" required error={errors.streetAddress}>
              <input
                type="text"
                value={form.streetAddress}
                onChange={handleChange("streetAddress")}
                placeholder="123 Example Street"
                style={getInputStyle("streetAddress")}
                onFocus={onFocus}
                onBlur={(e) => onBlur(e, "streetAddress")}
              />
            </Field>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem" }}>
              <Field label="Suburb" required error={errors.suburb}>
                <input
                  type="text"
                  value={form.suburb}
                  onChange={handleChange("suburb")}
                  placeholder="Ponsonby"
                  style={getInputStyle("suburb")}
                  onFocus={onFocus}
                  onBlur={(e) => onBlur(e, "suburb")}
                />
              </Field>
              <Field label="City" required error={errors.city}>
                <input
                  type="text"
                  value={form.city}
                  onChange={handleChange("city")}
                  placeholder="Auckland"
                  style={getInputStyle("city")}
                  onFocus={onFocus}
                  onBlur={(e) => onBlur(e, "city")}
                />
              </Field>
            </div>

            <Field
              label="General Company Email"
              required
              error={errors.generalEmail}
              helper="Used for company-level contact, billing, and notifications"
            >
              <input
                type="email"
                value={form.generalEmail}
                onChange={handleChange("generalEmail")}
                placeholder="info@company.co.nz"
                style={getInputStyle("generalEmail")}
                onFocus={onFocus}
                onBlur={(e) => onBlur(e, "generalEmail")}
              />
            </Field>

            <Field label="Company Phone" required error={errors.companyPhone}>
              <input
                type="text"
                value={form.companyPhone}
                onChange={handleChange("companyPhone")}
                placeholder="+64 21 123 4567"
                style={getInputStyle("companyPhone")}
                onFocus={onFocus}
                onBlur={(e) => onBlur(e, "companyPhone")}
              />
            </Field>

            <Field label="Company Logo">
              <FileUploadArea
                accept="image/jpeg,image/png,image/webp"
                file={logoFile}
                onFile={setLogoFile}
              />
            </Field>

            {/* Section: Primary Contact */}
            <div style={{ ...sectionLabelStyle, marginTop: "0.5rem" }}>
              Primary Contact (Company Administrator)
            </div>

            <Field label="Full Name" required error={errors.contactName}>
              <input
                type="text"
                value={form.contactName}
                onChange={handleChange("contactName")}
                placeholder="Jane Smith"
                style={getInputStyle("contactName")}
                onFocus={onFocus}
                onBlur={(e) => onBlur(e, "contactName")}
              />
            </Field>

            <Field
              label="Email Address"
              required
              error={errors.contactEmail}
              helper={!errors.contactEmail ? "This will be your login email" : undefined}
            >
              <input
                type="email"
                value={form.contactEmail}
                onChange={handleChange("contactEmail")}
                placeholder="jane@company.co.nz"
                style={getInputStyle("contactEmail")}
                onFocus={onFocus}
                onBlur={(e) => onBlur(e, "contactEmail")}
              />
            </Field>

            <Field label="Phone Number" required error={errors.contactPhone}>
              <input
                type="text"
                value={form.contactPhone}
                onChange={handleChange("contactPhone")}
                placeholder="+64 21 987 6543"
                style={getInputStyle("contactPhone")}
                onFocus={onFocus}
                onBlur={(e) => onBlur(e, "contactPhone")}
              />
            </Field>

            {/* What happens next */}
            <div style={{
              backgroundColor: "#F7F9FA",
              borderRadius: "0.75rem",
              padding: "1.125rem 1.25rem",
              fontSize: "0.875rem",
              color: "#374151",
              lineHeight: 1.7,
            }}>
              <p style={{ fontWeight: 600, color: "#333333", marginBottom: "0.5rem", fontSize: "0.9rem" }}>
                What happens next
              </p>
              <ol style={{ paddingLeft: "1.25rem", margin: 0, display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                <li>Submit your registration below</li>
                <li>We'll review your application within 24 hours</li>
                <li>Our team may contact you to verify your company details</li>
                <li>You'll receive an email once your account is approved and ready to use</li>
              </ol>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "0.8125rem",
                background: loading
                  ? "#8FA3B1"
                  : "#2f6f6a",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "1rem",
                fontSize: "0.9375rem",
                fontWeight: 500,
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                transition: "opacity 0.15s ease",
                marginTop: "0.25rem",
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.opacity = "0.9" }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1" }}
            >
              {loading ? "Submitting..." : "Submit Registration"}
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        padding: "1rem 1.5rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "0.5rem",
      }}>
        <span style={{ fontSize: "0.8125rem", color: "#374151" }}>
          QualCard &copy; 2026 All rights reserved
        </span>
        <div style={{ display: "flex", gap: "1.25rem" }}>
          <Link
            href="/privacy"
            style={{ fontSize: "0.8125rem", color: "#374151", textDecoration: "none" }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms"
            style={{ fontSize: "0.8125rem", color: "#374151", textDecoration: "none" }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
          >
            Terms &amp; Conditions
          </Link>
        </div>
      </footer>

    </div>
  )
}
