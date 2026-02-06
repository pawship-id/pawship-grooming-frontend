import React from "react"
import type { Metadata } from "next"
import { Nunito, Nunito_Sans } from "next/font/google"
import { AuthProvider } from "@/lib/auth-context"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito" })
const nunitoSans = Nunito_Sans({ subsets: ["latin"], variable: "--font-nunito-sans" })

export const metadata: Metadata = {
  title: "PAWship - Pet Grooming",
  description: "Professional pet grooming services for your beloved companions. In-store and home grooming available.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${nunito.variable} ${nunitoSans.variable}`}>
      <body className="font-sans antialiased">
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  )
}
