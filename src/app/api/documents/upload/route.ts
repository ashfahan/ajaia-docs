import { markdownToHtml } from "@/lib/markdownImport"
import { getCurrentUser } from "@/services/auth"
import { createDocumentFromHtml, createDocumentFromText } from "@/services/documents"
import { NextRequest, NextResponse } from "next/server"

// Accepted upload types. Stated in the UI and README. .docx etc. are out of
// scope (documented cut). Markdown files are parsed into rich formatting;
// plain .txt becomes one paragraph per line.
const ALLOWED_EXT = [".txt", ".md", ".markdown"]
const MARKDOWN_EXT = [".md", ".markdown"]
const MAX_BYTES = 1_000_000 // 1 MB guard

// POST multipart/form-data with a "file" field -> creates a new document
// whose content is the file's text. Returns the new document id.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 })

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 })
  }

  const file = form.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 })
  }

  const name = file.name || "upload.txt"
  const ext = name.slice(name.lastIndexOf(".")).toLowerCase()
  if (!ALLOWED_EXT.includes(ext)) {
    return NextResponse.json({ error: `Unsupported file type. Allowed: ${ALLOWED_EXT.join(", ")}` }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 1 MB)." }, { status: 400 })
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "File is empty." }, { status: 400 })
  }

  const text = await file.text()
  const title = name.replace(/\.(txt|md|markdown)$/i, "") || "Imported document"

  // Markdown is parsed into rich formatting; plain text keeps line breaks.
  const doc = MARKDOWN_EXT.includes(ext)
    ? await createDocumentFromHtml(user.id, title, markdownToHtml(text))
    : await createDocumentFromText(user.id, title, text)

  return NextResponse.json({ document: doc }, { status: 201 })
}
