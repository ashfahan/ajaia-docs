import { Skeleton } from "@/components/ui/skeleton"

// Route-level fallback for the editor: top bar, toolbar, and a paper canvas with
// a few text lines, so opening a document reads as "loading this document"
// rather than a blank screen.
export default function DocumentLoading() {
  return (
    <div className="min-h-screen" aria-busy="true" aria-label="Loading document">
      <div className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-3">
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-8 flex-1" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="mx-auto flex max-w-3xl items-center gap-1 px-6 pb-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-9" />
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="rounded-lg border border-zinc-200 bg-white p-10 shadow-sm">
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="mt-6 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-5/6" />
          <Skeleton className="mt-6 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-3/4" />
        </div>
      </div>
    </div>
  )
}
