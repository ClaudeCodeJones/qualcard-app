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

export async function DELETE(request, { params }) {
  try {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "")
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const supabaseAdmin = adminClient()
    if (!await verifyQcAdmin(token, supabaseAdmin)) {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id: cardholder_id, credentialId } = await params

    const { error } = await supabaseAdmin
      .from("cardholder_credentials")
      .delete()
      .eq("id", credentialId)
      .eq("cardholder_id", cardholder_id)

    if (error) {
      console.error("credential delete error:", JSON.stringify(error))
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error("credentials/[credentialId] DELETE error:", error.message)
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

    const { id: cardholder_id, credentialId } = await params
    const body = await request.json()

    const allowed = ["is_manually_ordered", "display_order"]
    const updates = {}
    for (const key of allowed) {
      if (key in body) updates[key] = body[key]
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: "No valid fields provided" }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from("cardholder_credentials")
      .update(updates)
      .eq("id", credentialId)
      .eq("cardholder_id", cardholder_id)
      .select(`
        id, cardholder_id, qual_comp_id, issue_date, expiry_date,
        is_manually_ordered, display_order, confirmation_checked,
        confirmation_initials, confirmation_date,
        qualifications_competencies(name, type, unit_standard_number, competency_code, permit_number, induction_code),
        training_providers(provider_name)
      `)
      .single()

    if (error) {
      console.error("credential PATCH error:", JSON.stringify(error))
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ credential: data })
  } catch (error) {
    console.error("credentials/[credentialId] PATCH error:", error.message)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
