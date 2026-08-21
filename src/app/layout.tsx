import type { Metadata, Viewport } from "next";
import { Nunito_Sans, Bowlby_One, Geist_Mono } from "next/font/google";
import "@/styles/globals.css";
import { ServiceWorkerRegistrar } from "@/components/pwa/ServiceWorkerRegistrar";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { HelpBubble } from "@/components/help/HelpBubble";

const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const bowlbyOne = Bowlby_One({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://circly.fun";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Circly — Perto, mesmo de longe.",
    template: "%s · Circly",
  },
  description:
    "Sua sala privada de videochamada pra estar junto com quem importa.",
  applicationName: "Circly",
  authors: [{ name: "Arthur Fernandes" }],
  keywords: [
    "videochamada",
    "sala privada",
    "amigos",
    "conversa",
    "call",
    "circly",
  ],
  openGraph: {
    title: "Circly — Perto, mesmo de longe.",
    description:
      "Sala privada de videochamada pra estar junto com quem importa.",
    siteName: "Circly",
    locale: "pt_BR",
    type: "website",
    url: SITE_URL,
    // opengraph-image.tsx é detectado automaticamente
  },
  twitter: {
    card: "summary_large_image",
    title: "Circly — Perto, mesmo de longe.",
    description:
      "Sala privada de videochamada pra estar junto com quem importa.",
    // twitter-image.tsx é detectado automaticamente
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: "/manifest.json",
  appleWebApp: {
    title: "Circly",
    statusBarStyle: "black-translucent",
    capable: true,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0C0D0F" },
    { media: "(prefers-color-scheme: light)", color: "#F5F4F0" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pt-BR"
      data-theme="dark"
      className={`${nunitoSans.variable} ${bowlbyOne.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background text-text-primary font-sans antialiased">
        <ServiceWorkerRegistrar />
        {children}
        <InstallPrompt />
        <HelpBubble />
      </body>
    </html>
  );
}
