import { getServiceClient } from "@/services/supabaseServer"
import { NextResponse } from "next/server"

// Lists the seeded accounts so the login screen can offer a picker.
export async function GET() {
  const supabase = getServiceClient()
  const { data, error } = await supabase.from("users").select("id, email, display_name").order("email")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ users: data ?? [] })
}
