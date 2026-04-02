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

async function resolveProvider(supabaseAdmin, custom_provider) {
  const { provider_name, is_global, company_id } = custom_provider
  if (!provider_name?.trim()) return { error: "Provider name is required" }

  const parsedCompanyId = company_id ? parseInt(company_id, 10) : null
  if (company_id && !Number.isInteger(parsedCompanyId)) return { error: "Invalid company_id" }
  const orClause = parsedCompanyId
    ? `is_global.eq.true,company_id.eq.${parsedCompanyId}`
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
      custom_credential,
      training_provider_id,
      custom_provider,
      issue_date,
      expiry_date,
      confirmation_checked,
      confirmation_initials,
      confirmation_date,
    } = body

    if (!issue_date) return Response.json({ error: "issue_date is required" }, { status: 400 })
    if (!confirmation_checked) return Response.json({ error: "Confirmation is required" }, { status: 400 })
    if (!confirmation_initials?.trim()) return Response.json({ error: "Confirmation initials are required" }, { status: 400 })

    let resolvedProviderId = training_provider_id ?? null
    if (custom_provider) {
      const result = await resolveProvider(supabaseAdmin, custom_provider)
      if (result.error) return Response.json({ error: result.error }, { status: 400 })
      resolvedProviderId = result.id
    }

    let resolvedQualCompId = qual_comp_id

    if (!resolvedQualCompId && custom_credential) {
      const { name, type, scope_company_id, ...codeFields } = custom_credential
      if (!name?.trim()) return Response.json({ error: "Credential name is required" }, { status: 400 })
      if (!type) return Response.json({ error: "Credential type is required" }, { status: 400 })

      // Deduplication: match by name (case-insensitive) + type within global and scoped company
      const parsedScopeId = scope_company_id ? parseInt(scope_company_id, 10) : null
      if (scope_company_id && !Number.isInteger(parsedScopeId)) return Response.json({ error: "Invalid scope_company_id" }, { status: 400 })
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

      const existing = existingList?.[0] ?? null

      if (existing) {
        resolvedQualCompId = existing.id
      } else {
        const { data: created, error: createError } = await supabaseAdmin
          .from("qualifications_competencies")
          .insert({
            name: name.trim(),
            type,
            company_id: scope_company_id ?? null,
            ...codeFields,
          })
          .select("id")
          .single()

        if (createError) {
          return Response.json({ error: createError.message }, { status: 500 })
        }
        resolvedQualCompId = created.id
      }
    }

    if (!resolvedQualCompId) return Response.json({ error: "qual_comp_id is required" }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from("cardholder_credentials")
      .insert({
        cardholder_id,
        qual_comp_id: resolvedQualCompId,
        training_provider_id: resolvedProviderId,
        issue_date,
        expiry_date: expiry_date ?? null,
        confirmation_checked: true,
        confirmation_initials: confirmation_initials.trim().toUpperCase(),
        confirmation_date: confirmation_date ?? new Date().toISOString(),
      })
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

    return Response.json({ credential: data })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
