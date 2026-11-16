import "./globals.css";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";

export const metadata = {
  title: "NIFTY 50 Intraday Alert | VWAP + EMA Terminal",
  description: "Personal NIFTY 50 Intraday Alert Progressive Web Application with VWAP, EMA 9 and EMA 20 strategy engine.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "NIFTY Alert",
  },
};

export const viewport = {
  themeColor: "#080c14",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: "dark" }} suppressHydrationWarning>
      <head>
        {/* Modern web guidance: declare color-scheme to avoid FOUC & theme native controls */}
        <meta name="color-scheme" content="dark" />
        <meta name="theme-color" content="#080c14" />
        {/* Android Chrome PWA meta tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="NIFTY Alert" />
        {/* iOS Safari PWA meta tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="NIFTY Alert" />
        {/* Explicit manifest and icon links */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icons/icon-512.png" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body className="min-h-screen bg-[#080c14] text-slate-100 font-sans antialiased" suppressHydrationWarning>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
