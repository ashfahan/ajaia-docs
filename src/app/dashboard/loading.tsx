import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

// Route-level fallback for the dashboard. The dashboard is force-dynamic, so it
// waits on Supabase before painting; this mirrors the real layout (header, two
// sections, a card grid) so the page does not jump when the data lands.
export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-8" aria-busy="true" aria-label="Loading your documents">
      <header className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-40" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-20" />
        </div>
      </header>

      <SectionSkeleton cards={4} />
      <SectionSkeleton cards={2} />
    </div>
  )
}

function SectionSkeleton({ cards }: { cards: number }) {
  return (
    <section className="mt-8">
      <Skeleton className="mb-3 h-4 w-36" />
      <ul className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: cards }).map((_, i) => (
          <li key={i}>
            <Card>
              <CardContent>
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="mt-3 h-3 w-1/2" />
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  )
}
