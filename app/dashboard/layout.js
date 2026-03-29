import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import DashboardSidebar from "./DashboardSidebar"

export default async function DashboardLayout({ children }) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookies().getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookies().set(name, value, options)
            })
          } catch {}
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  if (!session) redirect("/login")

  const { data: userData } = await supabase
    .from("users")
    .select("role, account_status, full_name")
    .eq("id", session.user.id)
    .single()

  if (!userData) redirect("/login")
  if (userData.account_status !== "active") redirect("/login")
  if (userData.role === "qc_admin") redirect("/superadmin")
  if (userData.role !== "company_admin") redirect("/login")

  const parts = (userData.full_name ?? "").trim().split(/\s+/)
  const initials = ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?"

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(to bottom, #1a3a38, #2f6f6a, #4a9e98)",
      display: "flex",
    }}>
      <DashboardSidebar initials={initials} />
      <main style={{ flex: 1, padding: "2rem", overflowY: "auto" }}>
        {children}
      </main>
    </div>
  )
}
