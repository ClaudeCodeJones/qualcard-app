import { createClient } from "@supabase/supabase-js"
import { writeAuditLog } from "@/lib/auditLog"

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(request) {
  try {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "")
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const supabaseAdmin = adminClient()

    // Verify caller is an active company_admin
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const { data: userData, error: userError } = await supabaseAdmin
      .from("users")
      .select("role, account_status, company_id, full_name")
      .eq("id", user.id)
      .single()

    if (userError || !userData) return Response.json({ error: "Unauthorized" }, { status: 401 })
    if (userData.role !== "company_admin") return Response.json({ error: "Forbidden" }, { status: 403 })
    if (userData.account_status !== "active") return Response.json({ error: "Forbidden" }, { status: 403 })

    const body = await request.json()
    const {
      cardholder_ids,
      qual_comp_id,
      custom_credential,
      training_provider_id,
      custom_provider,
      issue_date,
      expiry_date,
      confirmation_checked,
      confirmation_initials,
    } = body

    if (!Array.isArray(cardholder_ids) || cardholder_ids.length === 0) {
      return Response.json({ error: "At least one cardholder is required" }, { status: 400 })
    }
    if (!issue_date) return Response.json({ error: "Issue date is required" }, { status: 400 })
    if (!confirmation_checked) return Response.json({ error: "Confirmation is required" }, { status: 400 })
    if (!confirmation_initials?.trim()) return Response.json({ error: "Confirmation initials are required" }, { status: 400 })

    const companyId = userData.company_id

    // Phase 1: Resolve credential and provider (once, shared across all cardholders)

    let resolvedQualCompId = qual_comp_id ?? null

    if (!resolvedQualCompId && custom_credential) {
      const { name, type, code_field, code_value } = custom_credential
      if (!name?.trim()) return Response.json({ error: "Credential name is required" }, { status: 400 })
      if (!type) return Response.json({ error: "Credential type is required" }, { status: 400 })

      const parsedCompanyId = companyId ? parseInt(companyId, 10) : null
      const orClause = parsedCompanyId
        ? `company_id.is.null,company_id.eq.${parsedCompanyId}`
        : `company_id.is.null`

      const { data: existingList } = await supabaseAdmin
        .from("qualifications_competencies")
        .select("id")
        .ilike("name", name.trim())
        .eq("type", type)
        .or(orClause)
        .limit(1)

      if (existingList?.[0]) {
        resolvedQualCompId = existingList[0].id
      } else {
        const insertData = {
          name: name.trim(),
          type,
          company_id: companyId ?? null,
        }
        if (code_field && code_value?.trim()) {
          insertData[code_field] = code_value.trim()
        }

        const { data: created, error: createError } = await supabaseAdmin
          .from("qualifications_competencies")
          .insert(insertData)
          .select("id")
          .single()

        if (createError) return Response.json({ error: createError.message }, { status: 500 })
        resolvedQualCompId = created.id
      }
    }

    if (!resolvedQualCompId) return Response.json({ error: "Credential selection is required" }, { status: 400 })

    let resolvedProviderId = training_provider_id ?? null

    if (custom_provider?.provider_name?.trim()) {
      const parsedCompanyId = companyId ? parseInt(companyId, 10) : null
      const orClause = parsedCompanyId
        ? `is_global.eq.true,company_id.eq.${parsedCompanyId}`
        : `is_global.eq.true`

      const { data: existingList } = await supabaseAdmin
        .from("training_providers")
        .select("id")
        .ilike("provider_name", custom_provider.provider_name.trim())
        .or(orClause)
        .limit(1)

      if (existingList?.[0]) {
        resolvedProviderId = existingList[0].id
      } else {
        const { data: created, error: provError } = await supabaseAdmin
          .from("training_providers")
          .insert({
            provider_name: custom_provider.provider_name.trim(),
            is_global: false,
            company_id: companyId ?? null,
            status: "active",
          })
          .select("id")
          .single()

        if (provError) return Response.json({ error: provError.message }, { status: 500 })
        resolvedProviderId = created.id
      }
    }

    // Phase 2: Process each cardholder sequentially
    const results = []
    const confirmDate = new Date().toISOString()

    for (const cardholderId of cardholder_ids) {
      try {
        // Verify cardholder exists and belongs to this company
        const { data: cardholder, error: chError } = await supabaseAdmin
          .from("cardholders")
          .select("id, full_name, company_id")
          .eq("id", cardholderId)
          .single()

        if (chError || !cardholder) {
          results.push({ id: cardholderId, name: null, success: false, error: "Cardholder not found" })
          continue
        }

        if (cardholder.company_id !== companyId) {
          results.push({ id: cardholderId, name: cardholder.full_name, success: false, error: "Not in your company" })
          continue
        }

        // Duplicate check - skip if cardholder already has this credential
        const { data: existing } = await supabaseAdmin
          .from("cardholder_credentials")
          .select("id")
          .eq("cardholder_id", cardholderId)
          .eq("qual_comp_id", resolvedQualCompId)
          .limit(1)

        if (existing?.length > 0) {
          results.push({ id: cardholderId, name: cardholder.full_name, success: false, error: "Already has this credential" })
          continue
        }

        // Get next display order
        const { data: existingCreds } = await supabaseAdmin
          .from("cardholder_credentials")
          .select("display_order")
          .eq("cardholder_id", cardholderId)
          .order("display_order", { ascending: false })
          .limit(1)

        const nextOrder = (existingCreds?.[0]?.display_order ?? 0) + 1

        // Insert credential
        const { error: insertError } = await supabaseAdmin
          .from("cardholder_credentials")
          .insert({
            cardholder_id: cardholderId,
            qual_comp_id: resolvedQualCompId,
            training_provider_id: resolvedProviderId,
            issue_date,
            expiry_date: expiry_date ?? null,
            display_order: nextOrder,
            confirmation_checked: true,
            confirmation_initials: confirmation_initials.trim().toUpperCase(),
            confirmation_date: confirmDate,
          })

        if (insertError) {
          results.push({ id: cardholderId, name: cardholder.full_name, success: false, error: insertError.message })
          continue
        }

        // Update cardholder timestamp
        await supabaseAdmin
          .from("cardholders")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", cardholderId)

        await writeAuditLog(supabaseAdmin, {
          entityType: "cardholder",
          entityId: cardholderId,
          action: "credential_added",
          performedBy: user.id,
          performedByRole: "company_admin",
          performedByName: userData.full_name,
          metadata: { bulk: true },
        })

        results.push({ id: cardholderId, name: cardholder.full_name, success: true })
      } catch (err) {
        results.push({ id: cardholderId, name: null, success: false, error: err.message })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failureCount = results.filter(r => !r.success).length

    return Response.json({ successCount, failureCount, results })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
