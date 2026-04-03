import { createClient } from "@supabase/supabase-js"

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function DELETE(request, { params }) {
  try {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "")
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const supabaseAdmin = adminClient()

    // Verify caller is an active company_admin
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const { data: userData, error: userError } = await supabaseAdmin
      .from("users")
      .select("role, account_status, company_id")
      .eq("id", user.id)
      .single()

    if (userError || !userData) return Response.json({ error: "Unauthorized" }, { status: 401 })
    if (userData.role !== "company_admin") return Response.json({ error: "Forbidden" }, { status: 403 })
    if (userData.account_status !== "active") return Response.json({ error: "Forbidden" }, { status: 403 })

    const { id: cardholderId, credentialId } = await params

    // Verify cardholder belongs to this company
    const { data: cardholder, error: chError } = await supabaseAdmin
      .from("cardholders")
      .select("id, company_id")
      .eq("id", cardholderId)
      .single()

    if (chError || !cardholder) return Response.json({ error: "Cardholder not found" }, { status: 404 })
    if (cardholder.company_id !== userData.company_id) return Response.json({ error: "Forbidden" }, { status: 403 })

    // Verify credential belongs to this cardholder
    const { data: credential, error: credError } = await supabaseAdmin
      .from("cardholder_credentials")
      .select("id")
      .eq("id", credentialId)
      .eq("cardholder_id", cardholderId)
      .single()

    if (credError || !credential) return Response.json({ error: "Credential not found" }, { status: 404 })

    // Delete the credential
    const { error: deleteError } = await supabaseAdmin
      .from("cardholder_credentials")
      .delete()
      .eq("id", credentialId)

    if (deleteError) return Response.json({ error: deleteError.message }, { status: 500 })

    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
