import { createClient } from "@supabase/supabase-js"
import { writeAuditLog } from "@/lib/auditLog"

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(request, { params }) {
  try {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "")
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const supabaseAdmin = adminClient()

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

    const { id: cardholderId } = await params

    // Verify cardholder belongs to this company
    const { data: cardholder, error: chError } = await supabaseAdmin
      .from("cardholders")
      .select("id, company_id")
      .eq("id", cardholderId)
      .single()

    if (chError || !cardholder) return Response.json({ error: "Cardholder not found" }, { status: 404 })
    if (cardholder.company_id !== userData.company_id) return Response.json({ error: "Forbidden" }, { status: 403 })

    const body = await request.json()
    const {
      qual_comp_id,
      custom_credential,
      training_provider_id,
      custom_provider,
      issue_date,
      expiry_date,
      confirmation_initials,
    } = body

    if (!issue_date) return Response.json({ error: "Issue date is required" }, { status: 400 })
    if (!confirmation_initials?.trim()) return Response.json({ error: "Confirmation initials are required" }, { status: 400 })

    const companyId = userData.company_id

    // Resolve credential
    let resolvedQualId = qual_comp_id ?? null

    if (!resolvedQualId && custom_credential) {
      const { name, type, code_field, code_value, scope_company_id } = custom_credential
      if (!name?.trim()) return Response.json({ error: "Credential name is required" }, { status: 400 })
      if (!type) return Response.json({ error: "Credential type is required" }, { status: 400 })

      const parsedScopeId = scope_company_id ? parseInt(scope_company_id, 10) : null
      const orClause = parsedScopeId
        ? `company_id.is.null,company_id.eq.${parsedScopeId}`
        : `company_id.is.null`

      const { data: existingList } = await supabaseAdmin
        .from("qualifications_competencies")
        .select("id")
        .ilike("name", name.trim())
        .eq("type", type)
        .or(orClause)
        .limit(1)

      if (existingList?.[0]) {
        resolvedQualId = existingList[0].id
      } else {
        const insertData = {
          name: name.trim(),
          type,
          company_id: scope_company_id ?? null,
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
        resolvedQualId = created.id
      }
    }

    if (!resolvedQualId) return Response.json({ error: "Credential selection is required" }, { status: 400 })

    // Resolve provider
    let resolvedProviderId = training_provider_id ?? null

    if (custom_provider?.provider_name?.trim()) {
      const provFilter = companyId
        ? `is_global.eq.true,company_id.eq.${companyId}`
        : `is_global.eq.true`

      const { data: existingList } = await supabaseAdmin
        .from("training_providers")
        .select("id")
        .ilike("provider_name", custom_provider.provider_name.trim())
        .or(provFilter)
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

    // Insert credential
    const { data, error } = await supabaseAdmin
      .from("cardholder_credentials")
      .insert({
        cardholder_id: cardholderId,
        qual_comp_id: resolvedQualId,
        training_provider_id: resolvedProviderId,
        issue_date,
        expiry_date: expiry_date ?? null,
        confirmation_checked: true,
        confirmation_initials: confirmation_initials.trim().toUpperCase(),
        confirmation_date: new Date().toISOString(),
      })
      .select(`
        id, cardholder_id, qual_comp_id, training_provider_id, issue_date, expiry_date,
        is_manually_ordered, display_order, confirmation_checked,
        confirmation_initials, confirmation_date,
        qualifications_competencies(name, type, unit_standard_number, competency_code, permit_number, induction_code),
        training_providers(provider_name)
      `)
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })

    await writeAuditLog(supabaseAdmin, {
      entityType: "cardholder",
      entityId: cardholderId,
      action: "credential_added",
      newValue: data.qualifications_competencies?.name ?? null,
      performedBy: user.id,
      performedByRole: "company_admin",
      performedByName: userData.full_name,
      metadata: {
        credential_id: data.id,
        type: data.qualifications_competencies?.type ?? null,
      },
    })

    return Response.json({ credential: data })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
