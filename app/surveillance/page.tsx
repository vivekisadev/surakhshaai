import SurveillancePageClient from "./SurveillancePageClient"

// Prevent static prerendering - this page requires runtime Supabase credentials
export const dynamic = 'force-dynamic'

export default function SurveillancePage() {
  return <SurveillancePageClient />
}

