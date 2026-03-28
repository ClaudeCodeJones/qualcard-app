"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import { UploadCloud } from "lucide-react"

const MAX_SIZE = 2 * 1024 * 1024 // 2MB

export default function FileUploadArea({ accept = "image/jpeg,image/png,image/webp", file, onFile }) {
  const [dragActive, setDragActive] = useState(false)
  const [sizeError, setSizeError] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  function handleFile(f) {
    if (!f) return
    if (f.size > MAX_SIZE) {
      setSizeError("File too large. Maximum size is 2MB.")
      return
    }
    setSizeError(null)
    onFile(f)
  }

  function handleChange(e) {
    handleFile(e.target.files?.[0] ?? null)
    e.target.value = ""
  }

  function handleDragOver(e) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }

  function handleDragLeave(e) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }

  function handleDrop(e) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    handleFile(e.dataTransfer.files?.[0] ?? null)
  }

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragActive ? "#2f6f6a" : "#E5E7EB"}`,
          borderRadius: "1rem",
          padding: "1.75rem 1.5rem",
          textAlign: "center",
          cursor: "pointer",
          background: dragActive ? "rgba(47, 111, 106, 0.04)" : "#F9FAFB",
          transition: "border-color 0.15s ease, background 0.15s ease",
          userSelect: "none",
        }}
        onMouseEnter={(e) => { if (!dragActive) e.currentTarget.style.borderColor = "#2f6f6a" }}
        onMouseLeave={(e) => { if (!dragActive) e.currentTarget.style.borderColor = dragActive ? "#2f6f6a" : "#E5E7EB" }}
      >
        {file && previewUrl ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
            <Image
              src={previewUrl}
              alt="Preview"
              width={80}
              height={80}
              style={{ objectFit: "cover", borderRadius: "0.5rem", height: "auto" }}
            />
            <p style={{ margin: 0, fontSize: "0.8125rem", color: "#374151", fontWeight: 500 }}>
              {file.name}
            </p>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "#9CA3AF" }}>
              Click or drag to replace
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem" }}>
            <UploadCloud size={28} color="#9CA3AF" />
            <p style={{ margin: "0.375rem 0 0", fontSize: "0.875rem", color: "#374151", fontWeight: 500 }}>
              Click to upload or drag and drop
            </p>
            <p style={{ margin: 0, fontSize: "0.8125rem", color: "#9CA3AF" }}>
              JPG, PNG or WebP accepted
            </p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          style={{ display: "none" }}
        />
      </div>
      {sizeError && (
        <p style={{ margin: "0.375rem 0 0", fontSize: "0.8125rem", color: "#EF4444" }}>
          {sizeError}
        </p>
      )}
    </div>
  )
}
