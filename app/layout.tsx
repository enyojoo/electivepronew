import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { cookies } from "next/headers"
import "./globals.css"
import { Providers } from "./providers"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { getRawBrandSettings } from "@/lib/supabase/brand-settings"
import { DEFAULT_FAVICON_URL, DEFAULT_PRIMARY_COLOR, DEFAULT_PLATFORM_NAME } from "@/lib/constants"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "", // Empty title - will be set synchronously via script
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
  // Fetch raw brand settings server-side
  const { platformSettings, hasCustomBranding } = await getRawBrandSettings()

  // Read language from cookie (server-side)
  const cookieStore = await cookies()
  const languageCookie = cookieStore.get("epro-language")
  const initialLanguage = languageCookie?.value === "ru" ? "ru" : "en"

  // Prepare initial settings data for client
  const initialSettingsData = {
    platformSettings,
    hasCustomBranding,
    confirmed: true,
  }

  // Determine values for synchronous script (only if we have custom branding)
  const primaryColor = hasCustomBranding && platformSettings?.primary_color 
    ? platformSettings.primary_color 
    : null
  const faviconUrl = hasCustomBranding && platformSettings?.favicon_url 
    ? platformSettings.favicon_url 
    : null
  const nameEn = hasCustomBranding ? (platformSettings?.name || "") : ""
  const nameRu = hasCustomBranding ? (platformSettings?.name_ru || "") : ""
  
  // Note: titleName will be set in the inline script after checking both cookie and localStorage
  // This ensures we use the correct language even if cookie isn't set yet

  // Note: lang attribute will be set immediately by inline script based on localStorage
  // Using initialLanguage here as fallback, but script will override it immediately
  return (
    <html lang={initialLanguage} suppressHydrationWarning style={{ "--primary": primaryColor || DEFAULT_PRIMARY_COLOR } as React.CSSProperties}>
      <head>
        <meta name="theme-color" content={primaryColor || DEFAULT_PRIMARY_COLOR} />
        <link rel="icon" href={faviconUrl || DEFAULT_FAVICON_URL} />
        <link rel="shortcut icon" href={faviconUrl || DEFAULT_FAVICON_URL} />
        <link rel="apple-touch-icon" href={faviconUrl || DEFAULT_FAVICON_URL} />
        {/* CRITICAL: This script runs FIRST, before any other scripts or React hydration */}
        {/* It sets lang attribute and title immediately to prevent any flicker */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // Server-side initial data
                  const serverData = ${JSON.stringify(initialSettingsData)};
                  const initialLang = ${JSON.stringify(initialLanguage)};
                  
                  // Check localStorage for language preference (may be more up-to-date than cookie)
                  let currentLang = initialLang;
                  try {
                    const storedLang = localStorage.getItem('epro-language');
                    if (storedLang === 'ru' || storedLang === 'en') {
                      currentLang = storedLang;
                    }
                  } catch (e) {
                    // Ignore localStorage errors
                  }
                  
                  // STEP 1: Set HTML lang attribute IMMEDIATELY before anything else to prevent flicker
                  document.documentElement.lang = currentLang;
                  
                  // STEP 2: Store server data in data attributes for client access
                  document.documentElement.setAttribute('data-initial-settings', JSON.stringify(serverData));
                  document.documentElement.setAttribute('data-initial-language', currentLang);
                  
                  // STEP 3: Determine platform names (ALWAYS set title, even if no custom branding)
                  let nameEn = '';
                  let nameRu = '';
                  let finalNameEn = 'ElectivePRO';
                  let finalNameRu = 'ElectivePRO';
                  
                  if (serverData.hasCustomBranding && serverData.platformSettings) {
                    const s = serverData.platformSettings;
                    nameEn = s.name || '';
                    nameRu = s.name_ru || '';
                    finalNameEn = nameEn || 'ElectivePRO';
                    finalNameRu = nameRu || 'ElectivePRO';
                  }
                  
                  // STEP 4: Always set platform names in data attributes
                  document.documentElement.setAttribute('data-platform-name-en', finalNameEn);
                  document.documentElement.setAttribute('data-platform-name-ru', finalNameRu);
                  
                  // STEP 5: Set title IMMEDIATELY based on CURRENT language to prevent flicker
                  // Use Russian name when language is Russian, English name when English
                  // If language-specific name is not set, fallback to the other language's name
                  const titleName = currentLang === 'ru' 
                    ? (finalNameRu || finalNameEn || 'ElectivePRO')
                    : (finalNameEn || finalNameRu || 'ElectivePRO');
                  
                  document.documentElement.setAttribute('data-platform-name', titleName);
                  document.title = titleName;
                  
                  // STEP 6: Apply custom branding settings (only if we have custom branding)
                  if (serverData.hasCustomBranding && serverData.platformSettings) {
                    const s = serverData.platformSettings;
                    
                    // Apply primary color
                    if (s.primary_color) {
                      document.documentElement.style.setProperty('--primary', s.primary_color);
                      document.documentElement.style.setProperty('--color-primary', s.primary_color);
                      
                      // Convert hex to RGB
                      const hex = s.primary_color.replace('#', '');
                      if (hex.length === 6) {
                        const r = parseInt(hex.substring(0, 2), 16);
                        const g = parseInt(hex.substring(2, 4), 16);
                        const b = parseInt(hex.substring(4, 6), 16);
                        if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
                          document.documentElement.style.setProperty('--primary-rgb', r + ', ' + g + ', ' + b);
                        }
                      }
                    }
                    
                    // Apply favicon
                    if (s.favicon_url && /^https?:\\/\\//.test(s.favicon_url)) {
                      var faviconLinks = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]');
                      for (var i = 0; i < faviconLinks.length; i++) {
                        faviconLinks[i].href = s.favicon_url;
                      }
                    }
                    
                    // Platform names already set above, just apply branding settings
                    
                    // Store logo URLs
                    if (s.logo_url_en) {
                      document.documentElement.setAttribute('data-logo-url-en', s.logo_url_en);
                    }
                    if (s.logo_url_ru) {
                      document.documentElement.setAttribute('data-logo-url-ru', s.logo_url_ru);
                    }
                    if (s.logo_url) {
                      document.documentElement.setAttribute('data-logo-url', s.logo_url);
                    }
                  }
                  
                  // Also check localStorage cache for faster subsequent loads
                  const cached = localStorage.getItem('epro-brand-settings');
                  if (cached) {
                    try {
                      const parsed = JSON.parse(cached);
                      if (parsed.version === '1' && parsed.settings) {
                        const s = parsed.settings;
                        const hasCustom = !!(s.name || s.name_ru || s.primary_color || s.logo_url || s.logo_url_en || s.logo_url_ru || s.favicon_url);
                        
                        // Only use cache if server hasn't provided data yet (shouldn't happen, but fallback)
                        if (!serverData.confirmed && hasCustom) {
                          // Apply cached settings as fallback
                          if (s.primary_color) {
                            document.documentElement.style.setProperty('--primary', s.primary_color);
                            document.documentElement.style.setProperty('--color-primary', s.primary_color);
                          }
                          
                          if (s.favicon_url && /^https?:\\/\\//.test(s.favicon_url)) {
                            var cachedFaviconLinks = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]');
                            for (var j = 0; j < cachedFaviconLinks.length; j++) {
                              cachedFaviconLinks[j].href = s.favicon_url;
                            }
                          }
                          
                          const cachedNameEn = s.name || '';
                          const cachedNameRu = s.name_ru || '';
                          const cachedHasCustom = !!(cachedNameEn || cachedNameRu || s.primary_color || s.logo_url || s.logo_url_en || s.logo_url_ru || s.favicon_url);
                          const cachedFinalNameEn = cachedHasCustom ? cachedNameEn : 'ElectivePRO';
                          const cachedFinalNameRu = cachedHasCustom ? cachedNameRu : 'ElectivePRO';
                          
                          if (cachedFinalNameEn || cachedFinalNameRu) {
                            document.documentElement.setAttribute('data-platform-name-en', cachedFinalNameEn);
                            document.documentElement.setAttribute('data-platform-name-ru', cachedFinalNameRu);
                            
                            // Use currentLang which already checked localStorage
                            // Use Russian name when language is Russian, English name when English
                            // If language-specific name is not set, fallback to the other language's name
                            const cachedTitleName = currentLang === 'ru' 
                              ? (cachedFinalNameRu || cachedFinalNameEn || 'ElectivePRO')
                              : (cachedFinalNameEn || cachedFinalNameRu || 'ElectivePRO');
                            
                            if (cachedTitleName) {
                              document.documentElement.setAttribute('data-platform-name', cachedTitleName);
                              document.title = cachedTitleName;
                            }
                          }
                        }
                      }
                    } catch (e) {
                      // Ignore cache parse errors
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
