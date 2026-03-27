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
  if (error || !user) return { ok: false, user: null }
  const { data } = await supabaseAdmin.from("users").select("role").eq("id", user.id).single()
  return { ok: data?.role === "qc_admin", user }
}

export async function POST(request, ctx) {
  console.log("companies/[id]/notes POST hit")
  try {
    const { id } = await ctx.params
    const token = request.headers.get("Authorization")?.replace("Bearer ", "")
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const supabaseAdmin = adminClient()
    const { ok, user } = await verifyQcAdmin(token, supabaseAdmin)
    if (!ok) return Response.json({ error: "Forbidden" }, { status: 403 })

    const body = await request.json()
    const { note, initials } = body

    if (!note?.trim()) {
      return Response.json({ error: "Note text is required" }, { status: 400 })
    }

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("company_notes")
      .insert({
        company_id: id,
        note: note.trim(),
        initials: initials ? initials.trim().slice(0, 4) : null,
        created_by: user.id,
      })
      .select("*")
      .single()

    if (insertError) {
      console.log("company_notes insert error:", JSON.stringify(insertError))
      return Response.json({ error: insertError.message }, { status: 500 })
    }

    const { data: userData } = await supabaseAdmin
      .from("users")
      .select("full_name")
      .eq("id", user.id)
      .single()

    return Response.json({
      note: {
        ...inserted,
        author_name: userData?.full_name ?? null,
      },
    })
  } catch (error) {
    console.error("companies/[id]/notes POST error:", error.message)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
