import { createClient } from "@supabase/supabase-js"
import CardDisplay from "./CardDisplay"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? ""

export default async function Page({ params }) {
  const { slug } = await params

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data, error } = await supabase
    .from("cardholders")
    .select("*, companies(id, company_name)")
    .eq("slug", slug.trim())

  const cardholder = data?.[0]

  if (error || !cardholder) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-5">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Cardholder Not Found</h1>
          <p className="text-gray-600">The credential profile you are looking for does not exist.</p>
        </div>
      </div>
    )
  }

  const { data: credsRaw } = await supabase
    .from("cardholder_credentials")
    .select("*")
    .eq("cardholder_id", cardholder.id)

  const { data: quals } = await supabase
    .from("qualifications_competencies")
    .select("id, name, type, unit_standard_number, competency_code, induction_code, permit_number")

  const { data: providers } = await supabase
    .from("training_providers")
    .select("id, provider_name")

  const credentials = credsRaw?.map(c => ({
    ...c,
    qualification: quals?.find(q => q.id === c.qual_comp_id),
    provider: providers?.find(p => p.id === c.training_provider_id)?.provider_name ?? null
  }))

  return (
    <CardDisplay
      cardholder={cardholder}
      credentials={credentials}
      companyName={cardholder?.companies?.company_name ?? null}
      appUrl={APP_URL}
    />
  )
}
