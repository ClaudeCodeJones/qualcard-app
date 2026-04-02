const STATUS_MAP = {
  active:           { label: "Active",            color: "#16A34A" },
  expiring:         { label: "Expiring Soon",     color: "#F59E0B" },
  expired:          { label: "Expired",           color: "#EF4444" },
  payment_pending:  { label: "Payment Pending",   color: "#0EA5E9" },
  inactive:         { label: "Inactive",          color: "#4A5568" },
  pending:          { label: "Pending",           color: "#F97316" },
  pending_approval: { label: "Pending Approval",  color: "#F97316" },
  declined:         { label: "Declined",          color: "#EF4444" },
}

const FALLBACK = { label: "Inactive", color: "#4A5568" }

export default function StatusBadge({ status }) {
  const key = typeof status === "string" ? status.toLowerCase() : ""
  const { label, color } = STATUS_MAP[key] ?? FALLBACK

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "0.25rem 0.5rem",
        borderRadius: "9999px",
        fontSize: "0.75rem",
        fontWeight: 500,
        lineHeight: 1,
        whiteSpace: "nowrap",
        color,
        backgroundColor: `${color}1A`,
        border: `1px solid ${color}`,
      }}
    >
      {label}
    </span>
  )
}
