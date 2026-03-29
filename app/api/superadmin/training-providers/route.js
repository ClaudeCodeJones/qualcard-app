import { createClient } from "@supabase/supabase-js"

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function verifyAuthenticated(token, supabaseAdmin) {
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return false
  const { data } = await supabaseAdmin.from("users").select("role").eq("id", user.id).single()
  return data?.role === "qc_admin" || data?.role === "company_admin"
}

async function verifyQcAdmin(token, supabaseAdmin) {
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return false
  const { data } = await supabaseAdmin.from("users").select("role").eq("id", user.id).single()
  return data?.role === "qc_admin"
}

export async function GET(request) {
  try {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "")
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const supabaseAdmin = adminClient()
    if (!await verifyAuthenticated(token, supabaseAdmin)) {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const admin_view = searchParams.get("admin_view") === "true"

    let query = supabaseAdmin
      .from("training_providers")
      .select("id, provider_name, is_global, company_id, status")
      .order("provider_name", { ascending: true })

    if (!admin_view) query = query.eq("status", "active")

    const { data, error } = await query

    if (error) {
      console.error("training-providers GET error:", JSON.stringify(error))
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ providers: data ?? [] })
  } catch (error) {
    console.error("training-providers GET error:", error.message)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "")
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const supabaseAdmin = adminClient()
    if (!await verifyQcAdmin(token, supabaseAdmin)) {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { provider_name, is_global, company_id } = body

    if (!provider_name?.trim()) return Response.json({ error: "Provider name is required" }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from("training_providers")
      .insert({
        provider_name: provider_name.trim(),
        is_global: is_global ?? false,
        company_id: company_id || null,
        status: "active",
      })
      .select("id, provider_name, is_global, company_id, status")
      .single()

    if (error) {
      console.error("training-providers POST error:", JSON.stringify(error))
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ provider: data })
  } catch (error) {
    console.error("training-providers POST error:", error.message)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
