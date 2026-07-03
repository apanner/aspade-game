import type React from "react"
import type { Metadata } from "next"
// Using system fonts instead of Google Fonts to avoid build-time network dependency
// import { Inter } from "next/font/google"
import "../styles/globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/components/auth-provider"
import { Toaster } from "@/components/ui/toaster"
import { IOSChromeSessionManager } from "@/components/ios-chrome-session-manager"

// Use system font stack instead of Google Fonts (no network required during build)
// const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Aspade Online",
  description: "Online Scoreboard",
  generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Note: Mobile features are now handled per-component instead of globally
  // to avoid interfering with normal page scrolling in lobby and other screens

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        {/* iOS Chrome specific meta tags for better session persistence */}
        <meta name="apple-mobile-web-app-title" content="Aspade" />
        <meta name="application-name" content="Aspade" />
        <meta name="theme-color" content="#1e293b" />
        <meta name="msapplication-TileColor" content="#1e293b" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        {/* Prevent iOS from clearing session storage */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="msapplication-tap-highlight" content="no" />
      </head>
      <body className="font-sans min-h-screen bg-background" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <AuthProvider>
            <IOSChromeSessionManager />
            {children}
          </AuthProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
