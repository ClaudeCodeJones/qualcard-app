import { createClient } from "@supabase/supabase-js"

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET(request, { params }) {
  try {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "")
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const supabaseAdmin = adminClient()

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const { data: userData } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!userData || userData.role !== "qc_admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params

    const { data: logs, error } = await supabaseAdmin
      .from("audit_logs")
      .select("*")
      .eq("entity_type", "cardholder")
      .eq("entity_id", id)
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ logs: logs ?? [] })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
