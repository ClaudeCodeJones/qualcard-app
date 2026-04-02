"use client"

export default function GlobalError({ error, reset }) {
  return (
    <html lang="en">
      <body style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#D9DEE5",
        fontFamily: "Inter, system-ui, sans-serif",
        margin: 0,
      }}>
        <div style={{
          backgroundColor: "#FFFFFF",
          borderRadius: "1rem",
          padding: "2.5rem 2rem",
          maxWidth: "420px",
          width: "100%",
          textAlign: "center",
          boxShadow: "0 4px 24px rgba(44, 62, 80, 0.12), 0 1px 4px rgba(44, 62, 80, 0.06)",
        }}>
          <h1 style={{ color: "#34495E", fontSize: "1.375rem", fontWeight: 700, marginBottom: "0.75rem" }}>
            Something went wrong
          </h1>
          <p style={{ color: "#6B7280", fontSize: "0.9375rem", lineHeight: 1.6, marginBottom: "1.5rem" }}>
            A critical error occurred. Please refresh the page.
          </p>
          <button
            onClick={reset}
            style={{
              padding: "0.75rem 1.5rem",
              background: "#2f6f6a",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "1rem",
              fontSize: "0.9375rem",
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "Inter, system-ui, sans-serif",
            }}
          >
            Refresh
          </button>
        </div>
      </body>
    </html>
  )
}
