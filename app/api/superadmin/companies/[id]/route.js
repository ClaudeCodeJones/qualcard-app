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

export async function GET(request, ctx) {
  console.log("companies/[id] GET hit")
  try {
    const { id } = await ctx.params
    const token = request.headers.get("Authorization")?.replace("Bearer ", "")
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const supabaseAdmin = adminClient()
    if (!await verifyQcAdmin(token, supabaseAdmin)) {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }

    const [
      { data: company, error: companyError },
      { data: cardholders },
      { data: notes },
    ] = await Promise.all([
      supabaseAdmin.from("companies").select("*").eq("id", id).single(),
      supabaseAdmin
        .from("cardholders")
        .select("id, full_name, photo_url, status")
        .eq("company_id", id)
        .neq("status", "deleted")
        .order("full_name"),
      supabaseAdmin
        .from("company_notes")
        .select("*, users(full_name)")
        .eq("company_id", id)
        .order("created_at", { ascending: false }),
    ])

    if (companyError) {
      console.log("company fetch error:", JSON.stringify(companyError))
      return Response.json({ error: companyError.message }, { status: 404 })
    }

    const notesWithAuthor = (notes ?? []).map((n) => ({
      ...n,
      author_name: n.users?.full_name ?? null,
      users: undefined,
    }))

    return Response.json({
      company,
      cardholders: cardholders ?? [],
      notes: notesWithAuthor,
    })
  } catch (error) {
    console.error("companies/[id] GET error:", error.message)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request, ctx) {
  console.log("companies/[id] PATCH hit")
  try {
    const { id } = await ctx.params
    const token = request.headers.get("Authorization")?.replace("Bearer ", "")
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const supabaseAdmin = adminClient()
    if (!await verifyQcAdmin(token, supabaseAdmin)) {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()

    const ALLOWED_FIELDS = [
      "company_name",
      "phone",
      "general_email",
      "street_address",
      "suburb",
      "city",
      "primary_contact_name",
      "primary_contact_email",
      "primary_contact_phone",
      "primary_contact_role",
      "status",
      "logo_url",
    ]

    const updates = {}
    for (const field of ALLOWED_FIELDS) {
      if (field in body) updates[field] = body[field]
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: "No valid fields to update" }, { status: 400 })
    }

    const { data: company, error: updateError } = await supabaseAdmin
      .from("companies")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single()

    if (updateError) {
      console.log("company update error:", JSON.stringify(updateError))
      return Response.json({ error: updateError.message }, { status: 500 })
    }

    return Response.json({ company })
  } catch (error) {
    console.error("companies/[id] PATCH error:", error.message)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request, ctx) {
  console.log("companies/[id] DELETE hit")
  try {
    const { id } = await ctx.params
    const token = request.headers.get("Authorization")?.replace("Bearer ", "")
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const supabaseAdmin = adminClient()
    if (!await verifyQcAdmin(token, supabaseAdmin)) {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }

    await Promise.all([
      supabaseAdmin.from("cardholders").update({ company_id: null }).eq("company_id", id),
      supabaseAdmin.from("users").update({ company_id: null }).eq("company_id", id),
    ])

    const { error: deleteError } = await supabaseAdmin
      .from("companies")
      .delete()
      .eq("id", id)

    if (deleteError) {
      console.log("company delete error:", JSON.stringify(deleteError))
      return Response.json({ error: deleteError.message }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error("companies/[id] DELETE error:", error.message)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
