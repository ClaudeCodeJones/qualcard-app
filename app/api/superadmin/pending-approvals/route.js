import { createClient } from "@supabase/supabase-js"

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET(request) {
  console.log("pending-approvals route hit")

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

    const { data, error } = await supabaseAdmin
      .from("users")
      .select("*, companies(company_name, status)")
      .eq("account_status", "pending_approval")
      .order("created_at", { ascending: false })

    console.log("query error:", JSON.stringify(error))
    console.log("query data:", JSON.stringify(data))

    if (error) return Response.json({ error: error.message }, { status: 500 })

    return Response.json(data ?? [])
  } catch (error) {
    console.error("pending-approvals route error:", error.message)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
