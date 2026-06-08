import { AUTH_COOKIE } from "@/services/auth"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST() {
  const store = await cookies()
  store.delete(AUTH_COOKIE)
  return NextResponse.json({ ok: true })
}
