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

export async function POST(request, { params }) {
  try {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "")
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const supabaseAdmin = adminClient()
    if (!await verifyQcAdmin(token, supabaseAdmin)) {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id: cardholder_id } = await params
    const body = await request.json()
    const {
      qual_comp_id,
      training_provider_id,
      issue_date,
      expiry_date,
      confirmation_checked,
      confirmation_initials,
      confirmation_date,
    } = body

    if (!qual_comp_id) return Response.json({ error: "qual_comp_id is required" }, { status: 400 })
    if (!issue_date) return Response.json({ error: "issue_date is required" }, { status: 400 })
    if (!confirmation_checked) return Response.json({ error: "Confirmation is required" }, { status: 400 })
    if (!confirmation_initials?.trim()) return Response.json({ error: "Confirmation initials are required" }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from("cardholder_credentials")
      .insert({
        cardholder_id,
        qual_comp_id,
        training_provider_id: training_provider_id ?? null,
        issue_date,
        expiry_date: expiry_date ?? null,
        confirmation_checked: true,
        confirmation_initials: confirmation_initials.trim().toUpperCase(),
        confirmation_date: confirmation_date ?? new Date().toISOString(),
      })
      .select(`
        id, cardholder_id, qual_comp_id, issue_date, expiry_date,
        is_manually_ordered, display_order, confirmation_checked,
        confirmation_initials, confirmation_date,
        qualifications_competencies(name, type, unit_standard_number, competency_code, permit_number, induction_code),
        training_providers(provider_name)
      `)
      .single()

    if (error) {
      console.error("credential insert error:", JSON.stringify(error))
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ credential: data })
  } catch (error) {
    console.error("credentials POST error:", error.message)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
