import type { Metadata, Viewport } from "next";
import { Nunito_Sans, Bowlby_One, Geist_Mono } from "next/font/google";
import "@/styles/globals.css";

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

export const metadata: Metadata = {
  title: {
    default: "Conccord — Perto, mesmo de longe.",
    template: "%s · Conccord",
  },
  description:
    "Sua sala privada para conversar, ver e compartilhar com quem importa.",
  applicationName: "Conccord",
  authors: [{ name: "Conccord" }],
  keywords: ["videochamada", "sala privada", "amigos", "conversa"],
  openGraph: {
    title: "Conccord",
    description: "Perto, mesmo de longe.",
    siteName: "Conccord",
    locale: "pt_BR",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
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
        {children}
      </body>
    </html>
  );
}
