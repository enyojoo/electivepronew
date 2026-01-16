import { getElectivePacks } from "@/actions/elective-packs"
import { getCountries } from "@/actions/countries"
import { ExchangeUniversityForm } from "@/components/exchange-university-form"
import { PageHeader } from "@/components/page-header"
import { getCurrentUser } from "@/lib/session"

export default async function NewExchangeUniversityPage() {
  const user = await getCurrentUser()
  const electivePacks = await getElectivePacks()
  const countries = await getCountries()

  return (
    <div className="space-y-6">
      <PageHeader
        heading="Add Exchange University"
        subheading="Create a new partner university for student exchange programs"
      />
      <ExchangeUniversityForm electivePacks={electivePacks} countries={countries} />
    </div>
  )
}
