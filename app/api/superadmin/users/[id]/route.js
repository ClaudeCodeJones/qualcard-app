import { createClient } from "@supabase/supabase-js"

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function PATCH(request, ctx) {
  try {
    const { id } = await ctx.params

    const token = request.headers.get("Authorization")?.replace("Bearer ", "")
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const supabaseAdmin = adminClient()

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const { data: caller } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!caller || caller.role !== "qc_admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()

    const { full_name, email, role, account_status, company_id, currentEmail } = body

    const updates = { full_name, role, account_status, company_id }
    if (email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return Response.json({ error: "Invalid email format" }, { status: 400 })
      }
      updates.email = email
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("users")
      .update(updates)
      .eq("id", id)
      .select("id, full_name, email, role, account_status, company_id, last_login, created_at, companies(company_name)")
      .single()

    if (updateError) {
      return Response.json({ error: updateError.message }, { status: 500 })
    }

    if (email && email !== currentEmail) {
      const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(id, { email })
      if (authUpdateError) {
        return Response.json({ error: authUpdateError.message }, { status: 500 })
      }
    }

    return Response.json({ user: updated })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
