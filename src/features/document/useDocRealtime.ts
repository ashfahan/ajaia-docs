"use client"

import { getBrowserSupabase } from "@/services/realtimeClient"
import type { RealtimeChannel } from "@supabase/supabase-js"
import { useCallback, useEffect, useRef } from "react"

/**
 * Subscribes to a per-document Realtime broadcast channel so that multiple open
 * editors of the same document can notify each other when one of them saves.
 *
 * The broadcast carries no document data — only the originating user id — so the
 * receiving client knows to refetch the document through the authenticated API.
 */
export function useDocRealtime(opts: {
  docId: string
  selfId: string // current user id, to ignore our own broadcasts
  onRemoteUpdate: () => void
}): { broadcastUpdate: () => void } {
  const { docId, selfId, onRemoteUpdate } = opts

  // Keep the latest callback in a ref so the subscription never uses a stale one.
  const onRemoteUpdateRef = useRef(onRemoteUpdate)
  onRemoteUpdateRef.current = onRemoteUpdate

  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    let channel: RealtimeChannel | null = null

    try {
      const supabase = getBrowserSupabase()
      channel = supabase.channel(`doc:${docId}`, {
        config: { broadcast: { self: false } },
      })

      channel.on("broadcast", { event: "updated" }, (message) => {
        const payload = (message?.payload ?? {}) as { by?: string }
        if (payload.by !== selfId) {
          try {
            onRemoteUpdateRef.current()
          } catch {
            // Ignore errors from the consumer's update handler.
          }
        }
      })

      channel.subscribe()
      channelRef.current = channel
    } catch {
      // Realtime hiccups must never crash the editor.
      channelRef.current = null
    }

    return () => {
      try {
        if (channel) {
          getBrowserSupabase().removeChannel(channel)
        }
      } catch {
        // Ignore cleanup errors.
      }
      channelRef.current = null
    }
  }, [docId, selfId])

  const broadcastUpdate = useCallback(() => {
    const channel = channelRef.current
    if (!channel) return
    try {
      channel.send({
        type: "broadcast",
        event: "updated",
        payload: { by: selfId },
      })
    } catch {
      // Realtime hiccups must never crash the editor.
    }
  }, [selfId])

  return { broadcastUpdate }
}
