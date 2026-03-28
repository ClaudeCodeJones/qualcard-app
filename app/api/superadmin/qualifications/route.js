import { createClient } from "@supabase/supabase-js"

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
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
    if (!await verifyQcAdmin(token, supabaseAdmin)) {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") ?? ""
    const company_id = searchParams.get("company_id") ?? ""

    let query = supabaseAdmin
      .from("qualifications_competencies")
      .select("id, name, type, unit_standard_number, competency_code, permit_number, induction_code, company_id")
      .order("sort_order", { ascending: true })

    if (type) query = query.eq("type", type)

    // scope to global (null company_id) and this company
    if (company_id) {
      query = query.or(`company_id.is.null,company_id.eq.${company_id}`)
    } else {
      query = query.is("company_id", null)
    }

    const { data, error } = await query

    if (error) {
      console.error("qualifications GET error:", JSON.stringify(error))
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ qualifications: data ?? [] })
  } catch (error) {
    console.error("qualifications GET error:", error.message)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
