import { getExchangeUniversity } from "@/actions/exchange-universities"
import { getElectivePacks } from "@/actions/elective-packs"
import { getCountries } from "@/actions/countries"
import { ExchangeUniversityForm } from "@/components/exchange-university-form"
import { PageHeader } from "@/components/page-header"
import { getCurrentUser } from "@/lib/session"

interface EditExchangeUniversityPageProps {
  params: {
    id: string
  }
}

export default async function EditExchangeUniversityPage({ params }: EditExchangeUniversityPageProps) {
  const user = await getCurrentUser()
  const university = await getExchangeUniversity(params.id)
  const electivePacks = await getElectivePacks()
  const countries = await getCountries()

  return (
    <div className="space-y-6">
      <PageHeader
        heading="Edit Exchange University"
        subheading="Update partner university information for student exchange programs"
      />
      <ExchangeUniversityForm university={university} electivePacks={electivePacks} countries={countries} />
    </div>
  )
}
