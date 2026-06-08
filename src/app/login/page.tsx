"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { User } from "@/lib/types"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function LoginPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((d) => setUsers(d.users ?? []))
      .catch(() => setUsers([]))
  }, [])

  async function login(withEmail: string) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: withEmail }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Login failed.")
        return
      }
      router.push("/dashboard")
      router.refresh()
    } catch {
      setError("Network error.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Ajaia Docs</CardTitle>
          <CardDescription>A lightweight collaborative document editor.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm font-medium">Sign in as a demo user</p>
          <p className="text-muted-foreground mb-3 text-xs">
            No password. Open a second user in another browser/incognito window to test sharing.
          </p>
          <div className="flex flex-col gap-2">
            {users.map((u) => (
              <Button
                key={u.id}
                variant="outline"
                disabled={busy}
                onClick={() => login(u.email)}
                className="h-auto justify-between py-2.5"
              >
                <span className="font-medium">{u.display_name}</span>
                <span className="text-muted-foreground text-xs">{u.email}</span>
              </Button>
            ))}
            {users.length === 0 && (
              <p className="text-muted-foreground text-xs">No seeded users found. Did you run supabase/schema.sql?</p>
            )}
          </div>

          <div className="text-muted-foreground my-5 flex items-center gap-3 text-xs">
            <span className="bg-border h-px flex-1" />
            or by email
            <span className="bg-border h-px flex-1" />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (email.trim()) login(email)
            }}
            className="flex gap-2"
          >
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alice@ajaia.test"
            />
            <Button type="submit" disabled={busy || !email.trim()}>
              Sign in
            </Button>
          </form>

          {error && <p className="text-destructive mt-3 text-sm">{error}</p>}
        </CardContent>
      </Card>
    </main>
  )
}
