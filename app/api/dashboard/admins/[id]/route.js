import { createClient } from "@supabase/supabase-js"

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function DELETE(request, { params }) {
  try {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "")
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const supabaseAdmin = adminClient()
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const { data: userData } = await supabaseAdmin
      .from("users")
      .select("role, account_status, company_id")
      .eq("id", user.id)
      .single()

    if (!userData) return Response.json({ error: "Unauthorized" }, { status: 401 })
    if (userData.role !== "company_admin") return Response.json({ error: "Forbidden" }, { status: 403 })
    if (userData.account_status !== "active") return Response.json({ error: "Forbidden" }, { status: 403 })

    const targetId = params.id

    // Get target admin
    const { data: targetAdmin } = await supabaseAdmin
      .from("users")
      .select("id, company_id, role, account_status")
      .eq("id", targetId)
      .single()

    if (!targetAdmin) return Response.json({ error: "Admin not found" }, { status: 404 })
    if (targetAdmin.company_id !== userData.company_id) {
      return Response.json({ error: "Cannot remove admin from another company" }, { status: 403 })
    }
    if (targetAdmin.role !== "company_admin") {
      return Response.json({ error: "Target is not an admin" }, { status: 400 })
    }

    // Check minimum admin count (must be > 1 to remove)
    const { data: activeAdmins, error: countError } = await supabaseAdmin
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("company_id", userData.company_id)
      .eq("role", "company_admin")
      .neq("account_status", "inactive")

    if (countError) throw countError
    if (activeAdmins.length <= 1) {
      return Response.json({ error: "Cannot remove the last company admin" }, { status: 400 })
    }

    // Soft delete: set account_status to inactive
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({ account_status: "inactive" })
      .eq("id", targetId)

    if (updateError) throw updateError

    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
