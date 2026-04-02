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

export async function GET(request, { params }) {
  try {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "")
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const supabaseAdmin = adminClient()
    if (!await verifyQcAdmin(token, supabaseAdmin)) {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params

    const [cardholderResult, credentialsResult] = await Promise.all([
      supabaseAdmin
        .from("cardholders")
        .select("id, full_name, photo_url, status, company_id, slug, licence_start_date, licence_end_date, created_by, created_at, companies(id, company_name)")
        .eq("id", id)
        .single(),
      supabaseAdmin
        .from("cardholder_credentials")
        .select(`
          id, cardholder_id, qual_comp_id, training_provider_id, issue_date, expiry_date,
          is_manually_ordered, display_order, confirmation_checked,
          confirmation_initials, confirmation_date,
          qualifications_competencies(name, type, unit_standard_number, competency_code, permit_number, induction_code),
          training_providers(provider_name)
        `)
        .eq("cardholder_id", id)
        .order("is_manually_ordered", { ascending: false })
        .order("display_order", { ascending: true }),
    ])

    if (cardholderResult.error) {
      if (cardholderResult.error.code === "PGRST116") {
        return Response.json({ error: "Cardholder not found" }, { status: 404 })
      }
      return Response.json({ error: cardholderResult.error.message }, { status: 500 })
    }

    if (credentialsResult.error) {
      return Response.json({ error: credentialsResult.error.message }, { status: 500 })
    }

    const raw = cardholderResult.data
    const cardholder = { ...raw, companies: undefined }
    const company = raw.companies ?? null

    return Response.json({
      cardholder,
      company,
      credentials: credentialsResult.data ?? [],
    })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request, { params }) {
  try {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "")
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const supabaseAdmin = adminClient()
    if (!await verifyQcAdmin(token, supabaseAdmin)) {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    const allowed = ["full_name", "photo_url", "status", "company_id", "licence_start_date", "licence_end_date"]
    const updates = {}
    for (const field of allowed) {
      if (field in body) updates[field] = body[field]
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: "No valid fields provided" }, { status: 400 })
    }

    if (updates.status === "active") {
      const { data: currentCardholder, error: fetchError } = await supabaseAdmin
        .from("cardholders")
        .select("licence_start_date, licence_end_date")
        .eq("id", id)
        .single()

      if (!fetchError && currentCardholder) {
        const now = new Date()
        const licenceEndDate = currentCardholder.licence_end_date ? new Date(currentCardholder.licence_end_date) : null

        if (!licenceEndDate || licenceEndDate < now) {
          updates.licence_start_date = now.toISOString().split("T")[0]
          updates.licence_end_date = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()).toISOString().split("T")[0]
        } else {
          updates.licence_start_date = licenceEndDate.toISOString().split("T")[0]
          updates.licence_end_date = new Date(licenceEndDate.getFullYear() + 1, licenceEndDate.getMonth(), licenceEndDate.getDate()).toISOString().split("T")[0]
        }
      }
    }

    const { data, error } = await supabaseAdmin
      .from("cardholders")
      .update(updates)
      .eq("id", id)
      .select("id, full_name, photo_url, status, company_id, slug, licence_start_date, licence_end_date, created_by, created_at")
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return Response.json({ error: "Cardholder not found" }, { status: 404 })
      }
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ cardholder: data })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "")
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const supabaseAdmin = adminClient()
    if (!await verifyQcAdmin(token, supabaseAdmin)) {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params

    const { error } = await supabaseAdmin
      .from("cardholders")
      .update({ status: "deleted" })
      .eq("id", id)

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
