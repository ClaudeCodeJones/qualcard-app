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

export async function GET(request) {
  console.log("superadmin/cardholders GET hit")
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
      .select("id, full_name, photo_url, status, company_id, companies(company_name)")
      .neq("status", "deleted")
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
      console.log("cardholders fetch error:", JSON.stringify(cardholdersError))
      return Response.json({ error: cardholdersError.message }, { status: 500 })
    }

    if (companiesError) {
      console.log("companies fetch error:", JSON.stringify(companiesError))
      return Response.json({ error: companiesError.message }, { status: 500 })
    }

    const mapped = (cardholders ?? []).map((ch) => ({
      ...ch,
      company_name: ch.companies?.company_name ?? null,
      companies: undefined,
    }))

    return Response.json({ cardholders: mapped, companies: companies ?? [] })
  } catch (error) {
    console.error("superadmin/cardholders GET error:", error.message)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  console.log("superadmin/cardholders POST hit")
  try {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "")
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const supabaseAdmin = adminClient()
    if (!await verifyQcAdmin(token, supabaseAdmin)) {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { full_name, company_id, status, photo_url, slug, created_by } = body

    if (!full_name?.trim()) return Response.json({ error: "Full name is required" }, { status: 400 })
    if (!company_id) return Response.json({ error: "Company is required" }, { status: 400 })
    if (!slug) return Response.json({ error: "Slug is required" }, { status: 400 })

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
      .select("id, full_name, photo_url, status, company_id")
      .single()

    if (insertError) {
      console.log("cardholder insert error:", JSON.stringify(insertError))
      return Response.json({ error: insertError.message }, { status: 500 })
    }

    const { data: companyData } = await supabaseAdmin
      .from("companies")
      .select("company_name")
      .eq("id", company_id)
      .single()

    return Response.json({
      cardholder: {
        ...inserted,
        company_name: companyData?.company_name ?? null,
      },
    })
  } catch (error) {
    console.error("superadmin/cardholders POST error:", error.message)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
