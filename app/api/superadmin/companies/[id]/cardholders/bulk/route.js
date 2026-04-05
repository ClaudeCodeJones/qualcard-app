import { createClient } from "@supabase/supabase-js"
import { writeAuditLog } from "@/lib/auditLog"

const MAX_ROWS = 1000

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

function slugify(fullName) {
  return fullName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
}

function randomDigits(n) {
  return Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join("")
}

function generateSlug(fullName) {
  return `${slugify(fullName)}-${randomDigits(12)}`
}

export async function POST(request, { params }) {
  try {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "")
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const supabaseAdmin = adminClient()
    const caller = await verifyQcAdmin(token, supabaseAdmin)
    if (!caller) return Response.json({ error: "Forbidden" }, { status: 403 })

    const { id: companyId } = await params
    if (!companyId) return Response.json({ error: "Company id is required" }, { status: 400 })

    // Verify company exists
    const { data: company, error: companyErr } = await supabaseAdmin
      .from("companies")
      .select("id, company_name")
      .eq("id", companyId)
      .single()
    if (companyErr || !company) return Response.json({ error: "Company not found" }, { status: 404 })

    const body = await request.json()
    const rows = Array.isArray(body?.rows) ? body.rows : null
    if (!rows) return Response.json({ error: "rows array is required" }, { status: 400 })
    if (rows.length === 0) return Response.json({ error: "No rows to import" }, { status: 400 })
    if (rows.length > MAX_ROWS) {
      return Response.json({ error: `Too many rows. Max ${MAX_ROWS} per import.` }, { status: 400 })
    }

    // Server-side validation (safety net — client should have blocked first)
    const rowErrors = []
    rows.forEach((r, idx) => {
      const rowNum = idx + 2 // +2 for header row + 1-based display
      const fullName = typeof r?.full_name === "string" ? r.full_name.trim() : ""
      if (!fullName) rowErrors.push({ row: rowNum, error: "full_name is required" })
    })
    if (rowErrors.length > 0) {
      return Response.json({ error: "Validation failed", rowErrors }, { status: 400 })
    }

    // Bulk imports always land as pending_activation with null licence dates.
    // Activation happens later per-cardholder via the existing activation flow
    // (payment trigger). Matches the "No automatic activation" rule in CLAUDE.md.
    const toInsert = rows.map((r) => ({
      full_name: r.full_name.trim(),
      company_id: companyId,
      status: "pending_activation",
      photo_url: null, // v1: photos deferred
      slug: generateSlug(r.full_name.trim()),
      created_by: "qc_admin",
      licence_start_date: null,
      licence_end_date: null,
    }))

    // Slug collision check (astronomically rare at 700 rows with 10^12 suffixes)
    const candidateSlugs = toInsert.map((r) => r.slug)
    const { data: existingSlugRows } = await supabaseAdmin
      .from("cardholders")
      .select("slug")
      .in("slug", candidateSlugs)
    const existingSlugSet = new Set((existingSlugRows ?? []).map((r) => r.slug))
    toInsert.forEach((r) => {
      if (existingSlugSet.has(r.slug)) {
        // Regenerate once — if it collides again we bail loudly
        r.slug = generateSlug(r.full_name)
      }
    })

    // Bulk insert
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("cardholders")
      .insert(toInsert)
      .select("id, full_name")
    if (insertError) {
      return Response.json({ error: insertError.message }, { status: 500 })
    }

    // Single audit log entry for the whole import
    await writeAuditLog(supabaseAdmin, {
      entityType: "company",
      entityId: companyId,
      action: "bulk_import_cardholders",
      newValue: String(inserted?.length ?? 0),
      performedBy: caller.id,
      performedByRole: caller.role,
      performedByName: caller.fullName,
      metadata: {
        row_count: inserted?.length ?? 0,
        source: "csv",
        company_name: company.company_name,
      },
    })

    return Response.json({
      inserted: inserted?.length ?? 0,
      cardholder_ids: (inserted ?? []).map((r) => r.id),
    })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
