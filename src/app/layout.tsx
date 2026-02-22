import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Geist, Spectral, DM_Sans } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { ColonyThemeProvider } from "@/lib/chat-theme-context";
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

const spectral = Spectral({
  variable: "--font-spectral",
  subsets: ["latin"],
  weight: ["200", "300", "400"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
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
        url: "https://dummyimage.com/1200x630/1a1a1a/c9a962.png&text=COLONY+Real+Estate+CRM",
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
    images: ["https://dummyimage.com/1200x630/1a1a1a/c9a962.png&text=COLONY+Real+Estate+CRM"],
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
        className={`${inter.variable} ${jetbrainsMono.variable} ${geist.variable} ${spectral.variable} ${dmSans.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider defaultTheme="system" storageKey="colony-theme">
          <ColonyThemeProvider>
            {children}
          </ColonyThemeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
