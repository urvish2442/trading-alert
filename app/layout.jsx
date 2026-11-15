import "./globals.css";

export const metadata = {
  title: "NIFTY 50 Intraday Alert | VWAP + EMA Terminal",
  description: "Personal NIFTY 50 Intraday Alert Progressive Web Application with VWAP, EMA 9 and EMA 20 strategy engine.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
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
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="min-h-screen bg-[#080c14] text-slate-100 font-sans antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

