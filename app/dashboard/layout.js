import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import DashboardSidebar from "./DashboardSidebar"

export default async function DashboardLayout({ children }) {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {}
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: userData } = await supabase
    .from("users")
    .select("role, account_status, full_name")
    .eq("id", user.id)
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
      background: "radial-gradient(circle at top, #2f6f6a 0%, #1f4f4b 100%)",
      display: "flex",
    }}>
      <DashboardSidebar initials={initials} />
      <main style={{ flex: 1, padding: "2rem", overflowY: "auto" }}>
        {children}
      </main>
    </div>
  )
}
