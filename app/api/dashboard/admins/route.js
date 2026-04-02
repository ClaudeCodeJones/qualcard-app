import { createClient } from "@supabase/supabase-js"

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET(request) {
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

    // Get all active company admins
    const { data: admins, error: queryError } = await supabaseAdmin
      .from("users")
      .select("id, full_name, email")
      .eq("company_id", userData.company_id)
      .eq("role", "company_admin")
      .neq("account_status", "inactive")
      .order("full_name")

    if (queryError) throw queryError

    const canRemove = admins.length > 1
    const isAtLimit = admins.length >= 4

    return Response.json({ admins, canRemove, isAtLimit, callerId: user.id })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request) {
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

    const { full_name, email } = await request.json()

    if (!full_name || !email) {
      return Response.json({ error: "Full name and email are required" }, { status: 400 })
    }

    // Check admin count
    const { data: admins, error: countError } = await supabaseAdmin
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("company_id", userData.company_id)
      .eq("role", "company_admin")
      .neq("account_status", "inactive")

    if (countError) throw countError
    if (admins.length >= 4) {
      return Response.json({ error: "Admin limit reached (4 max)" }, { status: 400 })
    }

    // Check email uniqueness across all users
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", email)
      .single()

    if (existingUser) {
      return Response.json({ error: "A user with this email already exists" }, { status: 400 })
    }

    // Insert new admin
    const { data: newAdmin, error: insertError } = await supabaseAdmin
      .from("users")
      .insert({
        full_name,
        email,
        role: "company_admin",
        company_id: userData.company_id,
        account_status: "active",
      })
      .select("id, full_name, email")
      .single()

    if (insertError) throw insertError

    return Response.json({ success: true, admin: newAdmin })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
