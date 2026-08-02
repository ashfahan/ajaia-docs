import { Toaster } from "@/components/ui/sonner"
import { cn } from "@/lib/utils"
import type { Metadata } from "next"
import { Geist } from "next/font/google"
import "./globals.css"

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
  title: "Ajaia Docs",
  description: "A lightweight collaborative document editor.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={cn("h-full antialiased", "font-sans", geist.variable)}>
      <body className="min-h-full">
        {children}
        {/* Offset clears the sticky editor bar + toolbar (~96px) so a toast
            never covers the Share / Delete actions in the top-right corner. */}
        <Toaster position="top-right" duration={2500} offset={104} />
      </body>
    </html>
  )
}
