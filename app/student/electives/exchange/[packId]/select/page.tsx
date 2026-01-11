import { getExchangeUniversities } from "@/actions/exchange-universities"
import { getElectivePack } from "@/actions/elective-packs"
import { StudentExchangeSelectionForm } from "@/components/student-exchange-selection-form"
import { PageHeader } from "@/components/page-header"

interface StudentExchangeSelectionPageProps {
  params: {
    packId: string
  }
}

export default async function StudentExchangeSelectionPage({ params }: StudentExchangeSelectionPageProps) {
  const electivePack = await getElectivePack(params.packId)
  const universities = await getExchangeUniversities(params.packId)

  return (
    <div className="space-y-6">
      <PageHeader heading={electivePack.title} subheading="Select your preferred exchange universities" />
      <StudentExchangeSelectionForm
        electivePackId={params.packId}
        universities={universities}
        maxSelections={electivePack.max_selections || 3}
      />
    </div>
  )
}
