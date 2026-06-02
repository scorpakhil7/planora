import type { Metadata } from "next";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Planora",
  description: "AI-powered travel planning platform",
};


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl text-indigo-600 hover:text-indigo-700 transition-colors">
              <span className="text-2xl">✈</span>
              Planora
            </Link>

            <NavBar />
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
          {children}
        </main>

        <footer className="border-t border-gray-200 mt-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 text-center text-sm text-gray-400">
            © {new Date().getFullYear()} Planora. All rights reserved.
          </div>
        </footer>
      </body>
    </html>
  );
}
