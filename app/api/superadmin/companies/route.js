import { createClient } from "@supabase/supabase-js"
import { randomUUID } from "crypto"

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
  try {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "")
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const supabaseAdmin = adminClient()
    if (!await verifyQcAdmin(token, supabaseAdmin)) {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }

    const [{ data: companies, error: companiesError }, { data: cardholders }] = await Promise.all([
      supabaseAdmin.from("companies").select("*").neq("status", "deleted").order("created_at", { ascending: false }),
      supabaseAdmin.from("cardholders").select("company_id").neq("status", "deleted"),
    ])

    if (companiesError) {
      return Response.json({ error: companiesError.message }, { status: 500 })
    }

    const countMap = {}
    for (const ch of cardholders ?? []) {
      if (ch.company_id) countMap[ch.company_id] = (countMap[ch.company_id] ?? 0) + 1
    }

    const result = (companies ?? []).map((c) => ({ ...c, cardholder_count: countMap[c.id] ?? 0 }))
    return Response.json({ companies: result })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "")
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const supabaseAdmin = adminClient()
    if (!await verifyQcAdmin(token, supabaseAdmin)) {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }

    const formData = await request.formData()
    const company_name = formData.get("company_name")
    const street_address = formData.get("street_address")
    const suburb = formData.get("suburb")
    const city = formData.get("city")
    const phone = formData.get("phone")
    const general_email = formData.get("general_email")
    const status = formData.get("status") ?? "active"
    const primary_contact_name = formData.get("primary_contact_name")
    const primary_contact_email = formData.get("primary_contact_email")
    const primary_contact_phone = formData.get("primary_contact_phone")
    const logoFile = formData.get("logo")

    let logo_url = null
    if (logoFile && logoFile.size > 0) {
      const ext = logoFile.name.split(".").pop()
      const filePath = `companies/${randomUUID()}/logo.${ext}`
      const buffer = Buffer.from(await logoFile.arrayBuffer())
      const { error: uploadError } = await supabaseAdmin.storage
        .from("logos")
        .upload(filePath, buffer, { contentType: logoFile.type })
      if (!uploadError) {
        const { data: { publicUrl } } = supabaseAdmin.storage.from("logos").getPublicUrl(filePath)
        logo_url = publicUrl
      }
    }

    const { data: company, error: insertError } = await supabaseAdmin
      .from("companies")
      .insert({
        company_name,
        street_address,
        suburb,
        city,
        phone,
        general_email,
        status,
        primary_contact_name,
        primary_contact_email,
        primary_contact_phone,
        logo_url,
        admin_type: "company_managed",
      })
      .select("*")
      .single()

    if (insertError) {
      return Response.json({ error: insertError.message }, { status: 500 })
    }

    return Response.json({ company: { ...company, cardholder_count: 0 } })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
