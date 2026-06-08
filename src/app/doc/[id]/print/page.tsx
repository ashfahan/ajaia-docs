import PrintTrigger from "@/features/document/PrintTrigger"
import { getCurrentUser } from "@/services/auth"
import { getDocumentForUser } from "@/services/documents"
import { notFound, redirect } from "next/navigation"

export const dynamic = "force-dynamic"

// A clean, print-optimized view of a single document. The editor's "PDF"
// export opens this route in a new tab; it auto-triggers the print dialog so
// the user can Save as PDF. Any user with view access can print.
export default async function PrintPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const { id } = await params
  const result = await getDocumentForUser(id, user.id)
  if (!result) notFound()

  const { doc } = result

  return (
    <main className="mx-auto max-w-3xl bg-white px-8 py-12 text-zinc-900 print:py-0">
      <h1 className="mb-6 text-2xl font-bold">{doc.title}</h1>
      <div className="doc-content" dangerouslySetInnerHTML={{ __html: doc.content_html || "<p></p>" }} />
      <PrintTrigger />
    </main>
  )
}
