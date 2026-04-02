import Link from "next/link"

export default function NotFound() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#D9DEE5",
      fontFamily: "Inter, system-ui, sans-serif",
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
        <h1 style={{ color: "#34495E", fontSize: "3rem", fontWeight: 800, marginBottom: "0.5rem" }}>
          404
        </h1>
        <p style={{ color: "#6B7280", fontSize: "0.9375rem", lineHeight: 1.6, marginBottom: "1.5rem" }}>
          This page does not exist.
        </p>
        <Link
          href="/login"
          style={{
            display: "inline-block",
            padding: "0.75rem 1.5rem",
            background: "#2f6f6a",
            color: "#FFFFFF",
            border: "none",
            borderRadius: "1rem",
            fontSize: "0.9375rem",
            fontWeight: 500,
            textDecoration: "none",
            fontFamily: "inherit",
          }}
        >
          Go home
        </Link>
      </div>
    </div>
  )
}
