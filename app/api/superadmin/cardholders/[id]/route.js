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

export async function GET(request, { params }) {
  try {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "")
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const supabaseAdmin = adminClient()
    const caller = await verifyQcAdmin(token, supabaseAdmin)
    if (!caller) {
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
    const caller = await verifyQcAdmin(token, supabaseAdmin)
    if (!caller) {
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

    // Fetch current state for licence logic and audit trail
    let oldStatus = null
    if (updates.status) {
      const { data: prev } = await supabaseAdmin
        .from("cardholders")
        .select("status")
        .eq("id", id)
        .single()
      if (prev) oldStatus = prev.status
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

    // Audit log for non-status changes (name, photo, company reassign)
    if (updates.full_name) {
      await writeAuditLog(supabaseAdmin, {
        entityType: "cardholder",
        entityId: id,
        action: "name_change",
        oldValue: null,
        newValue: updates.full_name,
        performedBy: caller.id,
        performedByRole: caller.role,
        performedByName: caller.fullName,
      })
    }
    if (updates.photo_url) {
      await writeAuditLog(supabaseAdmin, {
        entityType: "cardholder",
        entityId: id,
        action: "photo_change",
        performedBy: caller.id,
        performedByRole: caller.role,
        performedByName: caller.fullName,
      })
    }
    if (updates.company_id) {
      await writeAuditLog(supabaseAdmin, {
        entityType: "cardholder",
        entityId: id,
        action: "company_reassign",
        newValue: updates.company_id,
        performedBy: caller.id,
        performedByRole: caller.role,
        performedByName: caller.fullName,
      })
    }

    if (updates.status && oldStatus !== updates.status) {
      const actionMap = {
        active: "activation",
        archived: "archive",
        deleted: "delete",
        pending_activation: "status_change",
      }
      await writeAuditLog(supabaseAdmin, {
        entityType: "cardholder",
        entityId: id,
        action: actionMap[updates.status] ?? "status_change",
        oldValue: oldStatus,
        newValue: updates.status,
        performedBy: caller.id,
        performedByRole: caller.role,
        performedByName: caller.fullName,
        metadata: updates.licence_start_date ? {
          licence_start_date: updates.licence_start_date,
          licence_end_date: updates.licence_end_date,
        } : {},
      })
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
    const caller = await verifyQcAdmin(token, supabaseAdmin)
    if (!caller) {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params

    const { data: prev } = await supabaseAdmin
      .from("cardholders")
      .select("status")
      .eq("id", id)
      .single()

    const { error } = await supabaseAdmin
      .from("cardholders")
      .update({ status: "deleted" })
      .eq("id", id)

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    await writeAuditLog(supabaseAdmin, {
      entityType: "cardholder",
      entityId: id,
      action: "delete",
      oldValue: prev?.status ?? null,
      newValue: "deleted",
      performedBy: caller.id,
      performedByRole: caller.role,
      performedByName: caller.fullName,
    })

    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
