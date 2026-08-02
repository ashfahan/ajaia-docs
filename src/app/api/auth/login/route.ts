import { AUTH_COOKIE } from "@/services/auth"
import { getServiceClient } from "@/services/supabaseServer"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

// Passwordless login: look up a seeded user by email, set the id cookie.
export async function POST(req: NextRequest) {
  let body: { email?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }
  const email = body.email?.toLowerCase().trim()
  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 })
  }

  const supabase = getServiceClient()
  const { data: user } = await supabase.from("users").select("id, email, display_name").eq("email", email).single()

  if (!user) {
    return NextResponse.json({ error: "No seeded account with that email. Try one from the list." }, { status: 404 })
  }

  const store = await cookies()
  store.set(AUTH_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  })

  return NextResponse.json({ user })
}
