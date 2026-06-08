"use client"

import { useEffect } from "react"

// Opens the browser print dialog on load so "Download PDF" -> Save as PDF.
export default function PrintTrigger() {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 300)
    return () => clearTimeout(t)
  }, [])
  return null
}
