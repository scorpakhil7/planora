import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/NavBar";
import { ToastProvider } from "@/components/Toast";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import LanguageToggle from "@/components/LanguageToggle";
import Image from "next/image";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Planora — Bharat ka Smart Travel Companion",
  description: "AI-powered travel planning for India. Trains, buses, flights, hotels, pilgrimage — one app.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>
        <LanguageProvider>
          <ToastProvider>
            {/* Header */}
            <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
              <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 shrink-0">
                  <Image
                    src="/planora-logo.png"
                    alt="Planora"
                    width={36}
                    height={36}
                    className="object-contain"
                    priority
                  />
                  <span className="font-black text-xl text-indigo-600 tracking-tight">Planora</span>
                </Link>

                {/* Nav links */}
                <div className="flex items-center gap-3">
                  <NavBar />
                  <LanguageToggle />
                </div>
              </div>
            </header>

            {/* Page content */}
            <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
              {children}
            </main>

            {/* Footer */}
            <footer className="border-t border-gray-100 py-6 text-center text-xs text-gray-400">
              © {new Date().getFullYear()} Planora. All rights reserved.
            </footer>
          </ToastProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
