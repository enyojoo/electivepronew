interface PageHeaderProps {
  heading: string
  subheading?: string
}

export function PageHeader({ heading, subheading }: PageHeaderProps) {
  return (
    <div className="space-y-1">
      <h1 className="text-2xl font-bold tracking-tight">{heading}</h1>
      {subheading && <p className="text-muted-foreground">{subheading}</p>}
    </div>
  )
}
