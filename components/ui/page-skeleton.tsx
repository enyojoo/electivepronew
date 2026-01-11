import { Skeleton } from "@/components/ui/skeleton"

interface PageSkeletonProps {
  type?: "dashboard" | "table" | "form" | "detail" | "card-grid"
  itemCount?: number
}

export function PageSkeleton({ type = "dashboard", itemCount = 3 }: PageSkeletonProps) {
  switch (type) {
    case "dashboard":
      return <DashboardSkeleton />
    case "table":
      return <TableSkeleton itemCount={itemCount} />
    case "form":
      return <FormSkeleton />
    case "detail":
      return <DetailSkeleton />
    case "card-grid":
      return <CardGridSkeleton itemCount={itemCount} />
    default:
      return <DashboardSkeleton />
  }
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-10 w-[250px]" />
        <Skeleton className="h-4 w-[350px] mt-2" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[120px] rounded-lg" />
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-[300px] rounded-lg" />
        <Skeleton className="h-[300px] rounded-lg" />
      </div>
    </div>
  )
}

export function TableSkeleton({ itemCount = 5 }: { itemCount?: number }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Skeleton className="h-10 w-[250px]" />
          <Skeleton className="h-4 w-[350px] mt-2" />
        </div>
        <Skeleton className="h-10 w-[120px]" />
      </div>

      <div className="space-y-4">
        <div className="flex justify-between">
          <Skeleton className="h-10 w-[250px]" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-[120px]" />
            <Skeleton className="h-10 w-[120px]" />
          </div>
        </div>

        <div className="border rounded-md">
          <div className="border-b p-4">
            <div className="flex gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-5 flex-1" />
              ))}
              <Skeleton className="h-5 w-[50px]" />
            </div>
          </div>
          <div className="p-4 space-y-4">
            {Array.from({ length: itemCount }).map((_, i) => (
              <div key={i} className="flex gap-4">
                {Array.from({ length: 6 }).map((_, j) => (
                  <Skeleton key={j} className="h-5 flex-1" />
                ))}
                <Skeleton className="h-5 w-[50px]" />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-center">
          <div className="flex gap-2">
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-10" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function TableSkeleton2({ itemCount = 5 }: { itemCount?: number }) {
  return (
    <div className="w-full space-y-3">
      {Array.from({ length: itemCount }).map((_, i) => (
        <div key={i} className="flex gap-4 items-center">
          {Array.from({ length: 5 }).map((_, j) => (
            <Skeleton key={j} className="h-5 flex-1" />
          ))}
          <Skeleton className="h-5 w-[50px]" />
        </div>
      ))}
    </div>
  )
}

export function FormSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-10 w-[250px]" />
        <Skeleton className="h-4 w-[350px] mt-2" />
      </div>

      <div className="space-y-4">
        <Skeleton className="h-[500px] rounded-lg" />
        <div className="flex justify-end gap-2">
          <Skeleton className="h-10 w-[100px]" />
          <Skeleton className="h-10 w-[100px]" />
        </div>
      </div>
    </div>
  )
}

export function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Skeleton className="h-10 w-[250px]" />
          <Skeleton className="h-4 w-[350px] mt-2" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-[100px]" />
          <Skeleton className="h-10 w-[100px]" />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Skeleton className="h-[200px] rounded-lg" />
          <Skeleton className="h-[300px] rounded-lg" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-[150px] rounded-lg" />
          <Skeleton className="h-[150px] rounded-lg" />
          <Skeleton className="h-[150px] rounded-lg" />
        </div>
      </div>
    </div>
  )
}

export function CardGridSkeleton({ itemCount = 6 }: { itemCount?: number }) {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-10 w-[250px]" />
        <Skeleton className="h-4 w-[350px] mt-2" />
      </div>

      <div className="flex justify-between">
        <Skeleton className="h-10 w-[250px]" />
        <Skeleton className="h-10 w-[120px]" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: itemCount }).map((_, i) => (
          <Skeleton key={i} className="h-[200px] rounded-lg" />
        ))}
      </div>

      <div className="flex justify-center">
        <div className="flex gap-2">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-10" />
        </div>
      </div>
    </div>
  )
}
