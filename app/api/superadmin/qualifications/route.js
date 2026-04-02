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
    const admin_view = searchParams.get("admin_view") === "true"

    let query = supabaseAdmin
      .from("qualifications_competencies")
      .select("id, name, type, unit_standard_number, competency_code, permit_number, induction_code, company_id, status")
      .order("name", { ascending: true })

    if (type) query = query.eq("type", type)

    if (!admin_view) {
      if (company_id) {
        const parsed = parseInt(company_id, 10)
        if (!Number.isInteger(parsed)) return Response.json({ error: "Invalid company_id" }, { status: 400 })
        query = query.or(`company_id.is.null,company_id.eq.${parsed}`)
      } else {
        query = query.is("company_id", null)
      }
    }

    const { data, error } = await query

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ qualifications: data ?? [] })
  } catch (error) {
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
    const { name, type, company_id, unit_standard_number, competency_code, permit_number, induction_code } = body

    if (!name?.trim()) return Response.json({ error: "Name is required" }, { status: 400 })
    if (!type) return Response.json({ error: "Type is required" }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from("qualifications_competencies")
      .insert({
        name: name.trim(),
        type,
        company_id: company_id || null,
        unit_standard_number: unit_standard_number?.trim() || null,
        competency_code: competency_code?.trim() || null,
        permit_number: permit_number?.trim() || null,
        induction_code: induction_code?.trim() || null,
        status: "active",
      })
      .select("id, name, type, unit_standard_number, competency_code, permit_number, induction_code, company_id, status")
      .single()

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ qualification: data })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
