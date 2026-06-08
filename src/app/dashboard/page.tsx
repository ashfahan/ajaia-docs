import { Card, CardContent } from "@/components/ui/card"
import DashboardActions from "@/features/dashboard/DashboardActions"
import type { DocumentListItem } from "@/lib/types"
import { getCurrentUser } from "@/services/auth"
import { listDocumentsForUser } from "@/services/documents"
import Link from "next/link"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const { owned, shared } = await listDocumentsForUser(user.id)

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Ajaia Docs</h1>
          <p className="text-sm text-zinc-500">
            Signed in as {user.display_name} ({user.email})
          </p>
        </div>
        <DashboardActions />
      </header>

      <Section
        title="Your documents"
        empty="You have no documents yet. Create one or upload a .txt/.md file."
        docs={owned}
      />
      <Section title="Shared with you" empty="Nothing has been shared with you yet." docs={shared} shared />
    </div>
  )
}

function Section({
  title,
  empty,
  docs,
  shared = false,
}: {
  title: string
  empty: string
  docs: DocumentListItem[]
  shared?: boolean
}) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-sm font-semibold tracking-wide text-zinc-500 uppercase">
        {title} {docs.length > 0 && `(${docs.length})`}
      </h2>
      {docs.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-400">
          {empty}
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {docs.map((d) => (
            <li key={d.id}>
              <Link href={`/doc/${d.id}`} className="block rounded-xl">
                <Card className="hover:ring-foreground/20 transition hover:shadow-sm">
                  <CardContent>
                    <div className="flex items-start justify-between gap-2">
                      <span className="line-clamp-2 font-medium">{d.title}</span>
                      {shared && (
                        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                          {d.shared_role}
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground mt-2 text-xs">
                      {shared ? `Owned by ${d.owner_name}` : `Edited ${new Date(d.updated_at).toLocaleString()}`}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
