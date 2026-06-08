import { NextRequest } from "next/server"
import { vi } from "vitest"

export const ALICE = {
  id: "u-alice",
  email: "alice@ajaia.test",
  display_name: "Alice",
}

export const params = (id: string) => ({ params: Promise.resolve({ id }) })

export const asMock = (fn: unknown) => fn as ReturnType<typeof vi.fn>

export function jsonReq(url: string, method: string, body?: unknown) {
  return new NextRequest(url, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
}
