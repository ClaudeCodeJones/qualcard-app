import { createClient } from "@supabase/supabase-js"

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function PATCH(request, { params }) {
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

    const { id } = await params

    // Fetch cardholder
    const { data: cardholder, error: cardholderError } = await supabaseAdmin
      .from("cardholders")
      .select("id, company_id, status, licence_end_date")
      .eq("id", id)
      .single()

    if (cardholderError || !cardholder) {
      return Response.json({ error: "Cardholder not found" }, { status: 404 })
    }

    // Company scope check
    if (cardholder.company_id !== userData.company_id) {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }

    // Idempotency guard: already active with a valid future licence
    if (
      cardholder.status === "active" &&
      cardholder.licence_end_date &&
      new Date(cardholder.licence_end_date) > new Date()
    ) {
      return Response.json({
        success: true,
        message: "Already active",
        licence_end_date: cardholder.licence_end_date,
      })
    }

    // Licence date logic
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const fmt = d => d.toISOString().split("T")[0]

    let licenceStartDate
    let licenceEndDate

    if (cardholder.licence_end_date) {
      const existingEnd = new Date(cardholder.licence_end_date)
      existingEnd.setHours(0, 0, 0, 0)

      if (existingEnd > today) {
        // Renewal: extend from existing end date
        licenceStartDate = fmt(existingEnd)
        const renewedEnd = new Date(existingEnd)
        renewedEnd.setFullYear(renewedEnd.getFullYear() + 1)
        licenceEndDate = fmt(renewedEnd)
      } else {
        // Expired licence: activate fresh from today
        licenceStartDate = fmt(today)
        const newEnd = new Date(today)
        newEnd.setFullYear(newEnd.getFullYear() + 1)
        licenceEndDate = fmt(newEnd)
      }
    } else {
      // No licence date: fresh activation from today
      licenceStartDate = fmt(today)
      const newEnd = new Date(today)
      newEnd.setFullYear(newEnd.getFullYear() + 1)
      licenceEndDate = fmt(newEnd)
    }

    // Update cardholder
    const { error: updateError } = await supabaseAdmin
      .from("cardholders")
      .update({
        status: "active",
        licence_start_date: licenceStartDate,
        licence_end_date: licenceEndDate,
      })
      .eq("id", id)

    if (updateError) {
      console.error("activate route update error:", updateError.message)
      return Response.json({ error: updateError.message }, { status: 500 })
    }

    return Response.json({
      success: true,
      licence_start_date: licenceStartDate,
      licence_end_date: licenceEndDate,
    })
  } catch (err) {
    console.error("dashboard/cardholders/[id]/activate PATCH error:", err.message)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
