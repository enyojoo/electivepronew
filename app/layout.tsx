import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "./providers"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { DynamicBranding } from "@/components/dynamic-branding"

const inter = Inter({ subsets: ["latin"] })

import { DEFAULT_FAVICON_URL, DEFAULT_PRIMARY_COLOR, DEFAULT_PLATFORM_NAME } from "@/lib/constants"


export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Use default branding
  const primaryColor = DEFAULT_PRIMARY_COLOR
  const faviconUrl = DEFAULT_FAVICON_URL
  const pageTitle = DEFAULT_PLATFORM_NAME

  // Create metadata for the current request
  const metadata: Metadata = {
    title: pageTitle,
    description:
      "The complete platform for managing the selection of elective courses, exchange programs, and academic pathways.",
    icons: {
      icon: faviconUrl,
      shortcut: faviconUrl,
      apple: faviconUrl,
    },
  }

  return (
    <html lang="en" suppressHydrationWarning style={{ "--primary": primaryColor } as React.CSSProperties}>
      <head>
        <meta name="theme-color" content={primaryColor} />
        <link rel="icon" href={faviconUrl} />
        <link rel="shortcut icon" href={faviconUrl} />
        <link rel="apple-touch-icon" href={faviconUrl} />
        <title>{pageTitle}</title>
      </head>
      <body className={inter.className}>
        <Providers>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
            <DynamicBranding />
            {children}
            <Toaster />
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  )
}

export const metadata = {
  generator: 'v0.dev'
};
