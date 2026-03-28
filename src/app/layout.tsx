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
  title: "Colony | AI-Powered CRM for Small Business",
  description: "Colony is an AI-powered CRM and small business operating system. Your business runs on conversations.",
  openGraph: {
    title: "Colony | AI-Powered CRM for Small Business",
    description: "Colony is an AI-powered CRM and small business operating system. Your business runs on conversations.",
    type: "website",
    images: [
      {
        url: "https://dummyimage.com/1200x630/1a1a1a/c9a962.png&text=COLONY",
        width: 1200,
        height: 630,
        alt: "Colony — AI-Powered CRM for Small Business",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Colony | AI-Powered CRM for Small Business",
    description: "Colony is an AI-powered CRM and small business operating system. Your business runs on conversations.",
    images: ["https://dummyimage.com/1200x630/1a1a1a/c9a962.png&text=COLONY"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("colony-theme");if(t==="light")document.documentElement.classList.add("light");else if(t==="system"){if(window.matchMedia("(prefers-color-scheme:light)").matches)document.documentElement.classList.add("light");else document.documentElement.classList.add("dark")}else document.documentElement.classList.add("dark")}catch(e){document.documentElement.classList.add("dark")}})()`,
          }}
        />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} ${geist.variable} ${spectral.variable} ${dmSans.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider defaultTheme="dark" storageKey="colony-theme">
          <ColonyThemeProvider>
            {children}
          </ColonyThemeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
