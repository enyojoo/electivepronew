import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "./providers"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

import { DEFAULT_FAVICON_URL, DEFAULT_PRIMARY_COLOR, DEFAULT_PLATFORM_NAME } from "@/lib/constants"

export const metadata: Metadata = {
  title: DEFAULT_PLATFORM_NAME,
  description:
    "The complete platform for managing the selection of elective courses, exchange programs, and academic pathways.",
  icons: {
    icon: DEFAULT_FAVICON_URL,
    shortcut: DEFAULT_FAVICON_URL,
    apple: DEFAULT_FAVICON_URL,
  },
  generator: 'v0.dev',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Use default branding
  const primaryColor = DEFAULT_PRIMARY_COLOR
  const faviconUrl = DEFAULT_FAVICON_URL
  const pageTitle = DEFAULT_PLATFORM_NAME

  // Metadata is exported below, not defined here

  return (
    <html lang="en" suppressHydrationWarning style={{ "--primary": primaryColor } as React.CSSProperties}>
      <head>
        <meta name="theme-color" content={primaryColor} />
        <link rel="icon" href={faviconUrl} />
        <link rel="shortcut icon" href={faviconUrl} />
        <link rel="apple-touch-icon" href={faviconUrl} />
        {/* Inline script to apply cached brand settings immediately, before React loads */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const cached = localStorage.getItem('epro-brand-settings');
                  if (cached) {
                    const parsed = JSON.parse(cached);
                    if (parsed.version === '1' && parsed.settings) {
                      const s = parsed.settings;
                      // Check if we've confirmed from Supabase that no custom branding exists
                      let confirmedNoCustom = false;
                      try {
                        const confirmed = localStorage.getItem('epro-brand-confirmed');
                        const hasCustom = localStorage.getItem('epro-brand-has-custom');
                        confirmedNoCustom = confirmed === 'true' && hasCustom === 'false';
                      } catch (e) {
                        // Ignore localStorage errors
                      }

                      const hasCustom = !!(s.name || s.name_ru || s.primary_color || s.logo_url || s.favicon_url);

                      // Apply branding in this order of priority:
                      // 1. Custom branding from cache (if exists)
                      // 2. Default branding (if confirmed no custom exists OR no cached settings at all)
                      const shouldApplyBranding = hasCustom || confirmedNoCustom || !cached;
                      if (shouldApplyBranding) {
                        const primaryColor = s.primary_color || (confirmedNoCustom || !cached ? '#000000' : null);
                        const faviconUrl = s.favicon_url && /^https?:\\/\\//.test(s.favicon_url) ? s.favicon_url : (confirmedNoCustom || !cached ? 'https://cldup.com/Jnah6-hWcg.png' : null);
                        
                        // Get current language from localStorage
                        let currentLanguage = 'en';
                        try {
                          const storedLang = localStorage.getItem('epro-language');
                          if (storedLang === 'ru' || storedLang === 'en') {
                            currentLanguage = storedLang;
                          }
                        } catch (e) {
                          // Ignore localStorage errors
                        }
                        
                        // Use language-specific name - apply defaults if no custom branding exists
                        let nameEn = s.name || '';
                        let nameRu = s.name_ru || '';
                        if ((confirmedNoCustom || !cached) && !nameEn && !nameRu) {
                          nameEn = 'ElectivePRO';
                          nameRu = 'ElectivePRO';
                        }
                        // Priority: Russian name (if language is Russian) > English name > default
                        let name = '';
                        if (currentLanguage === 'ru' && nameRu) {
                          name = nameRu;
                        } else if (nameEn) {
                          name = nameEn;
                        } else if (confirmedNoCustom || !cached) {
                          name = 'ElectivePRO';
                        }
                        
                        // Only set if we have values
                        if (nameEn || nameRu) {
                          document.documentElement.setAttribute('data-platform-name-en', nameEn || '');
                          document.documentElement.setAttribute('data-platform-name-ru', nameRu || '');
                          if (name) {
                            document.documentElement.setAttribute('data-platform-name', name);
                            document.title = name;
                          }
                        }
                        
                        // Apply CSS variables immediately (only if we have values)
                        if (primaryColor) {
                          document.documentElement.style.setProperty('--primary', primaryColor);
                          document.documentElement.style.setProperty('--color-primary', primaryColor);
                        
                          // Convert hex to RGB for --primary-rgb
                          const hex = primaryColor.replace('#', '');
                          if (hex.length === 6) {
                            const r = parseInt(hex.substring(0, 2), 16);
                            const g = parseInt(hex.substring(2, 4), 16);
                            const b = parseInt(hex.substring(4, 6), 16);
                            if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
                              document.documentElement.style.setProperty('--primary-rgb', r + ', ' + g + ', ' + b);
                            }
                          }
                        }
                        
                        // Update favicon links immediately (only if we have a URL)
                        if (faviconUrl) {
                          var faviconLinks = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]');
                          for (var i = 0; i < faviconLinks.length; i++) {
                            faviconLinks[i].href = faviconUrl;
                          }
                        }
                      }
                    }
                  }
                } catch (e) {
                  // Silently fail if localStorage is unavailable or corrupted
                }
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <Providers>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
            {children}
            <Toaster />
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  )
}
