import { createClient } from "@supabase/supabase-js"

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const ALLOWED_FIELDS = [
  "company_name",
  "street_address",
  "suburb",
  "city",
  "phone",
  "general_email",
  "primary_contact_name",
  "primary_contact_email",
  "primary_contact_phone",
  "primary_contact_role",
]

export async function GET(request) {
  try {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "")
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const supabaseAdmin = adminClient()
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const { data: userData } = await supabaseAdmin
      .from("users")
      .select("role, account_status, company_id")
      .eq("id", user.id)
      .single()

    if (!userData) return Response.json({ error: "Unauthorized" }, { status: 401 })
    if (userData.role !== "company_admin") return Response.json({ error: "Forbidden" }, { status: 403 })
    if (userData.account_status !== "active") return Response.json({ error: "Forbidden" }, { status: 403 })

    // Fetch company details
    const { data: company, error: queryError } = await supabaseAdmin
      .from("companies")
      .select("id, company_name, street_address, suburb, city, phone, general_email, primary_contact_name, primary_contact_email, primary_contact_phone, primary_contact_role")
      .eq("id", userData.company_id)
      .single()

    if (queryError) throw queryError
    if (!company) return Response.json({ error: "Company not found" }, { status: 404 })

    return Response.json({ company })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "")
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const supabaseAdmin = adminClient()
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const { data: userData } = await supabaseAdmin
      .from("users")
      .select("role, account_status, company_id")
      .eq("id", user.id)
      .single()

    if (!userData) return Response.json({ error: "Unauthorized" }, { status: 401 })
    if (userData.role !== "company_admin") return Response.json({ error: "Forbidden" }, { status: 403 })
    if (userData.account_status !== "active") return Response.json({ error: "Forbidden" }, { status: 403 })

    const body = await request.json()

    // Filter to allowed fields only
    const updateData = {}
    Object.keys(body).forEach(key => {
      if (ALLOWED_FIELDS.includes(key)) {
        updateData[key] = body[key]
      }
    })

    if (Object.keys(updateData).length === 0) {
      return Response.json({ error: "No valid fields to update" }, { status: 400 })
    }

    // Update company
    const { data: company, error: updateError } = await supabaseAdmin
      .from("companies")
      .update(updateData)
      .eq("id", userData.company_id)
      .select("id, company_name, street_address, suburb, city, phone, general_email, primary_contact_name, primary_contact_email, primary_contact_phone, primary_contact_role")
      .single()

    if (updateError) throw updateError

    return Response.json({ success: true, company })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
