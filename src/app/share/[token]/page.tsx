import { getCurrentUser } from "@/services/auth"
import { grantLinkRoleToUser, resolveLink } from "@/services/links"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"

export const dynamic = "force-dynamic"

// Public "anyone with the link" landing page. Logged-in visitors get the link
// role persisted and are sent into the editor. Anonymous visitors see a clean
// read-only render — read-only is the safe public view regardless of the link
// role, and they're invited to sign in for richer access.
export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const resolved = await resolveLink(token)
  if (!resolved) notFound()

  const { document: doc, role } = resolved

  const user = await getCurrentUser()
  if (user) {
    await grantLinkRoleToUser(doc.id, user.id, role)
    redirect("/doc/" + doc.id)
  }

  return (
    <main className="mx-auto max-w-3xl px-8 py-12">
      <div className="bg-muted text-muted-foreground mb-6 flex flex-wrap items-center gap-1 rounded-lg px-4 py-3 text-sm">
        <span>
          Shared via link ({role}).{" "}
          <Link href="/login" className="text-foreground font-medium underline">
            Sign in
          </Link>{" "}
          to edit or comment.
        </span>
      </div>
      <h1 className="mb-6 text-2xl font-bold">{doc.title}</h1>
      <div className="doc-content" dangerouslySetInnerHTML={{ __html: doc.content_html || "<p></p>" }} />
    </main>
  )
}
