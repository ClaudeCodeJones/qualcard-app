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

export async function GET(request) {
  try {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "")
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const supabaseAdmin = adminClient()
    if (!await verifyQcAdmin(token, supabaseAdmin)) {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)

    const search = searchParams.get("search") ?? ""
    const company = searchParams.get("company") ?? ""
    const status = searchParams.get("status") ?? ""

    let query = supabaseAdmin
      .from("cardholders")
      .select("id, full_name, photo_url, status, company_id, licence_end_date, created_at, companies(company_name)")
      .order("full_name", { ascending: true })

    if (search) {
      query = query.ilike("full_name", `%${search}%`)
    }
    if (company) {
      query = query.eq("company_id", company)
    }
    if (status) {
      query = query.eq("status", status)
    }

    const [{ data: cardholders, error: cardholdersError }, { data: companies, error: companiesError }] =
      await Promise.all([
        query,
        supabaseAdmin.from("companies").select("id, company_name").order("company_name"),
      ])

    if (cardholdersError) {
      return Response.json({ error: cardholdersError.message }, { status: 500 })
    }

    if (companiesError) {
      return Response.json({ error: companiesError.message }, { status: 500 })
    }

    const mapped = (cardholders ?? []).map((ch) => ({
      ...ch,
      company_name: ch.companies?.company_name ?? null,
      companies: undefined,
    }))

    return Response.json({ cardholders: mapped, companies: companies ?? [] })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "")
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const supabaseAdmin = adminClient()
    const caller = await verifyQcAdmin(token, supabaseAdmin)
    if (!caller) {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { full_name, company_id, status, photo_url, slug, created_by } = body

    if (!full_name?.trim()) return Response.json({ error: "Full name is required" }, { status: 400 })
    if (!company_id) return Response.json({ error: "Company is required" }, { status: 400 })
    if (!slug) return Response.json({ error: "Slug is required" }, { status: 400 })
    if (!photo_url) return Response.json({ error: "Photo is required" }, { status: 400 })

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("cardholders")
      .insert({
        full_name: full_name.trim(),
        company_id,
        status: status ?? "pending_activation",
        photo_url: photo_url ?? null,
        slug,
        created_by: created_by ?? "qc_admin",
      })
      .select("id, full_name, photo_url, status, company_id, created_at, licence_end_date, companies(id, company_name)")
      .single()

    if (insertError) {
      return Response.json({ error: insertError.message }, { status: 500 })
    }

    await writeAuditLog(supabaseAdmin, {
      entityType: "cardholder",
      entityId: inserted.id,
      action: "created",
      newValue: status ?? "pending_activation",
      performedBy: caller.id,
      performedByRole: caller.role,
      performedByName: caller.fullName,
      metadata: { full_name: full_name.trim(), company_id },
    })

    return Response.json({
      cardholder: {
        ...inserted,
        company_name: inserted.companies?.company_name ?? null,
        companies: undefined,
      },
    })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
