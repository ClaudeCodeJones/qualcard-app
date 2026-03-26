import { createClient } from "@supabase/supabase-js"

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(request) {
  console.log("user-approval route hit")

  try {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "")
    if (!token) {
      console.log("400: no token")
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabaseAdmin = adminClient()

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    console.log("auth result:", user?.id ?? null, authError?.message ?? null)

    if (authError || !user) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const { data: caller } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()

    console.log("caller role:", caller?.role ?? null)

    if (!caller || caller.role !== "qc_admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    console.log("request body:", JSON.stringify(body))

    const { userId, companyId, action } = body

    if (!userId) {
      console.log("400: missing userId")
      return Response.json({ error: "Missing userId" }, { status: 400 })
    }
    if (!companyId) {
      console.log("400: missing companyId — user.company_id may be null in DB")
      return Response.json({ error: "Missing companyId" }, { status: 400 })
    }
    if (!["approve", "decline"].includes(action)) {
      console.log("400: invalid action:", action)
      return Response.json({ error: "Invalid action" }, { status: 400 })
    }

    const userStatus = action === "approve" ? "active" : "declined"
    const companyStatus = action === "approve" ? "active" : "inactive"

    console.log(`updating user ${userId} -> account_status: ${userStatus}`)
    console.log(`updating company ${companyId} -> status: ${companyStatus}`)

    const [{ error: userError }, { error: companyError }] = await Promise.all([
      supabaseAdmin.from("users").update({ account_status: userStatus }).eq("id", userId),
      supabaseAdmin.from("companies").update({ status: companyStatus }).eq("id", companyId),
    ])

    if (userError) console.log("user update error:", JSON.stringify(userError))
    if (companyError) console.log("company update error:", JSON.stringify(companyError))

    if (userError || companyError) {
      return Response.json({ error: "Update failed" }, { status: 500 })
    }

    console.log("user-approval success")
    return Response.json({ success: true })
  } catch (error) {
    console.error("user-approval route error:", error.message)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
