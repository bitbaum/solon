import "./globals.css";
import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import Navigation from "@/components/ui/navigation";
import Footer from "@/components/ui/footer";

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

export const metadata: Metadata = {
  title: "Solon — Bitcoin-Native Governance",
  description: "Traceable Bitcoin treasury records and signed-vote verification primitives for organizations.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
  openGraph: {
    title: "Solon",
    description: "Traceable treasury records and signed-vote verification primitives",
    url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    siteName: "Solon",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="min-h-screen antialiased font-sans">
        <a href="#main-content" className="fixed left-4 top-3 z-[60] -translate-y-20 rounded-md bg-navy px-4 py-2 font-semibold text-white transition-transform focus:translate-y-0">
          Skip to content
        </a>
        <Navigation />
        <main id="main-content" tabIndex={-1} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 focus:outline-none">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
