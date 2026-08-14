import "./globals.css";
import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import Navigation from "@/components/ui/navigation";
import Footer from "@/components/ui/footer";
import { authEnabled } from "@/lib/auth";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Display font — geometric, technical character for headlines and the SOLON wordmark
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

/**
 * Where this site actually serves. Next resolves the generated og:image against
 * `metadataBase`; without it the tag is emitted as http://localhost:3000/... —
 * present, plausible, and unfetchable by every social scraper. The fallback is
 * the real host rather than localhost so a missing env var degrades to correct.
 */
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://solon.orangecat.ch";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Solon — Bitcoin-Native Governance",
  description: "Radical transparency and cryptographic democracy for organizations.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
  openGraph: {
    title: "Solon",
    description: "Bitcoin-Native Governance for the Digital Age",
    url: SITE_URL,
    siteName: "Solon",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="min-h-screen antialiased font-sans">
        {/* Session state is fetched client-side so pages stay static;
            auth() is only called on the pages that actually need it. */}
        <SessionProvider>
          <Navigation authEnabled={authEnabled} />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
          <Footer />
        </SessionProvider>
      </body>
    </html>
  );
}

