import { createClient } from "@supabase/supabase-js"

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET(request) {
  console.log("superadmin/users route hit")

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

    const [{ data: users, error: usersError }, { data: companies, error: companiesError }] = await Promise.all([
      supabaseAdmin
        .from("users")
        .select("id, full_name, email, role, account_status, company_id, last_login, created_at, companies(company_name)")
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("companies")
        .select("id, company_name")
        .order("company_name", { ascending: true }),
    ])

    if (usersError) {
      console.log("users query error:", JSON.stringify(usersError))
      return Response.json({ error: usersError.message }, { status: 500 })
    }

    return Response.json({ users: users ?? [], companies: companies ?? [] })
  } catch (error) {
    console.error("superadmin/users route error:", error.message)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
