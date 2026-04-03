import { createClient } from "@supabase/supabase-js"
import { writeAuditLog } from "@/lib/auditLog"

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(request) {
  try {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "")
    if (!token) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabaseAdmin = adminClient()

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const { data: caller } = await supabaseAdmin
      .from("users")
      .select("role, full_name")
      .eq("id", user.id)
      .single()

    if (!caller || caller.role !== "qc_admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()

    const { userId, companyId, action } = body

    if (!userId) {
      return Response.json({ error: "Missing userId" }, { status: 400 })
    }
    if (!companyId) {
      return Response.json({ error: "Missing companyId" }, { status: 400 })
    }
    if (!["approve", "decline"].includes(action)) {
      return Response.json({ error: "Invalid action" }, { status: 400 })
    }

    const userStatus = action === "approve" ? "active" : "declined"
    const companyStatus = action === "approve" ? "active" : "inactive"

    const [{ error: userError }, { error: companyError }] = await Promise.all([
      supabaseAdmin.from("users").update({ account_status: userStatus }).eq("id", userId),
      supabaseAdmin.from("companies").update({ status: companyStatus }).eq("id", companyId),
    ])

    if (userError || companyError) {
      return Response.json({ error: "Update failed" }, { status: 500 })
    }

    const auditAction = action === "approve" ? "approval" : "decline"
    await Promise.all([
      writeAuditLog(supabaseAdmin, {
        entityType: "user",
        entityId: userId,
        action: auditAction,
        oldValue: "pending",
        newValue: userStatus,
        performedBy: user.id,
        performedByRole: "qc_admin",
        performedByName: caller.full_name,
      }),
      writeAuditLog(supabaseAdmin, {
        entityType: "company",
        entityId: companyId,
        action: auditAction,
        oldValue: "pending",
        newValue: companyStatus,
        performedBy: user.id,
        performedByRole: "qc_admin",
        performedByName: caller.full_name,
      }),
    ])

    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
