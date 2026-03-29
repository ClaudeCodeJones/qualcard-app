import { createClient } from "@supabase/supabase-js"

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET(request) {
  console.log("stats route hit")

  try {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "")
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const supabaseAdmin = adminClient()

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    console.log("auth result:", user?.id ?? null, authError?.message ?? null)

    if (authError || !user) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const { data: caller } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!caller || caller.role !== "qc_admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }

    const [
      { count: pendingApprovals },
      { count: totalUsers },
      { count: totalCompanies },
      { count: activeCompanies },
      { count: totalCardholders },
      { count: activeCardholders },
      { count: totalCredentials },
      { count: totalProviders },
    ] = await Promise.all([
      supabaseAdmin.from("users").select("*", { count: "exact", head: true }).eq("account_status", "pending_approval"),
      supabaseAdmin.from("users").select("*", { count: "exact", head: true }).eq("role", "company_admin"),
      supabaseAdmin.from("companies").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("companies").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabaseAdmin.from("cardholders").select("*", { count: "exact", head: true }).neq("status", "deleted"),
      supabaseAdmin.from("cardholders").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabaseAdmin.from("qualifications_competencies").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("training_providers").select("*", { count: "exact", head: true }).eq("status", "active"),
    ])

    return Response.json({
      pendingApprovals: pendingApprovals ?? 0,
      totalUsers: totalUsers ?? 0,
      totalCompanies: totalCompanies ?? 0,
      activeCompanies: activeCompanies ?? 0,
      totalCardholders: totalCardholders ?? 0,
      activeCardholders: activeCardholders ?? 0,
      totalCredentials: totalCredentials ?? 0,
      totalProviders: totalProviders ?? 0,
    })
  } catch (error) {
    console.error("stats route error:", error.message)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
