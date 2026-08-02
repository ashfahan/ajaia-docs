import Editor from "@/features/document/Editor"
import { getCurrentUser } from "@/services/auth"
import { getDocumentForUser } from "@/services/documents"
import { notFound, redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function DocPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const { id } = await params
  const result = await getDocumentForUser(id, user.id)
  if (!result) notFound()

  return <Editor doc={result.doc} role={result.role} currentUser={user} />
}
