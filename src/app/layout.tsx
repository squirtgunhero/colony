import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Geist } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL('https://mycolonyhq.com'),
  title: "Colony | Real Estate CRM",
  description: "Modern real estate CRM for managing contacts, properties, and deals",
  openGraph: {
    title: "Colony | Real Estate CRM",
    description: "Modern real estate CRM for managing contacts, properties, and deals",
    type: "website",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "Colony Real Estate CRM",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Colony | Real Estate CRM",
    description: "Modern real estate CRM for managing contacts, properties, and deals",
    images: ["/api/og"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} ${geist.variable} font-sans antialiased`}
      >
        <ThemeProvider defaultTheme="system" storageKey="colony-theme">
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
