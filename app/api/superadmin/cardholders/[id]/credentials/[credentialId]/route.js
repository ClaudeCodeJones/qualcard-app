import { createClient } from "@supabase/supabase-js"
import { writeAuditLog } from "@/lib/auditLog"

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function verifyQcAdmin(token, supabaseAdmin) {
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return null
  const { data } = await supabaseAdmin.from("users").select("role, full_name").eq("id", user.id).single()
  if (data?.role !== "qc_admin") return null
  return { id: user.id, role: data.role, fullName: data.full_name }
}

async function resolveProvider(supabaseAdmin, custom_provider) {
  const { provider_name, is_global, company_id } = custom_provider
  if (!provider_name?.trim()) return { error: "Provider name is required" }

  const orClause = company_id
    ? `is_global.eq.true,company_id.eq.${company_id}`
    : `is_global.eq.true`

  const { data: existingList } = await supabaseAdmin
    .from("training_providers")
    .select("id")
    .ilike("provider_name", provider_name.trim())
    .or(orClause)
    .limit(1)

  if (existingList?.[0]) return { id: existingList[0].id }

  const { data: created, error } = await supabaseAdmin
    .from("training_providers")
    .insert({
      provider_name: provider_name.trim(),
      is_global: is_global ?? false,
      company_id: company_id ?? null,
      status: "active",
    })
    .select("id")
    .single()

  if (error) return { error: error.message }
  return { id: created.id }
}

export async function DELETE(request, { params }) {
  try {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "")
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const supabaseAdmin = adminClient()
    const caller = await verifyQcAdmin(token, supabaseAdmin)
    if (!caller) {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id: cardholder_id, credentialId } = await params

    // Fetch credential name before deleting
    const { data: cred } = await supabaseAdmin
      .from("cardholder_credentials")
      .select("qualifications_competencies(name, type)")
      .eq("id", credentialId)
      .eq("cardholder_id", cardholder_id)
      .single()

    const { error } = await supabaseAdmin
      .from("cardholder_credentials")
      .delete()
      .eq("id", credentialId)
      .eq("cardholder_id", cardholder_id)

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    await writeAuditLog(supabaseAdmin, {
      entityType: "cardholder",
      entityId: cardholder_id,
      action: "credential_removed",
      oldValue: cred?.qualifications_competencies?.name ?? null,
      performedBy: caller.id,
      performedByRole: caller.role,
      performedByName: caller.fullName,
      metadata: { credential_id: credentialId, type: cred?.qualifications_competencies?.type ?? null },
    })

    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request, { params }) {
  try {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "")
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const supabaseAdmin = adminClient()
    const caller = await verifyQcAdmin(token, supabaseAdmin)
    if (!caller) {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id: cardholder_id, credentialId } = await params
    const body = await request.json()

    const allowed = ["is_manually_ordered", "display_order", "training_provider_id", "issue_date", "expiry_date"]
    const updates = {}
    for (const key of allowed) {
      if (key in body) updates[key] = body[key]
    }

    if (body.custom_provider) {
      const result = await resolveProvider(supabaseAdmin, body.custom_provider)
      if (result.error) return Response.json({ error: result.error }, { status: 400 })
      updates.training_provider_id = result.id
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
        id, cardholder_id, qual_comp_id, training_provider_id, issue_date, expiry_date,
        is_manually_ordered, display_order, confirmation_checked,
        confirmation_initials, confirmation_date,
        qualifications_competencies(name, type, unit_standard_number, competency_code, permit_number, induction_code),
        training_providers(provider_name)
      `)
      .single()

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    // Only log meaningful edits (not reorder operations)
    if (updates.issue_date || updates.expiry_date || updates.training_provider_id || body.custom_provider) {
      await writeAuditLog(supabaseAdmin, {
        entityType: "cardholder",
        entityId: cardholder_id,
        action: "credential_edited",
        newValue: data.qualifications_competencies?.name ?? null,
        performedBy: caller.id,
        performedByRole: caller.role,
        performedByName: caller.fullName,
        metadata: { credential_id: credentialId, type: data.qualifications_competencies?.type ?? null },
      })
    }

    return Response.json({ credential: data })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
