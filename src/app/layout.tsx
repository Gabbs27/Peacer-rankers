import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LoL Tracker",
  description: "Track your League of Legends matches and get feedback",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-gray-900 text-white min-h-screen`}>
        <a href="#main-content" className="skip-link">
          Saltar al contenido principal
        </a>
        <nav aria-label="Navegación principal" className="border-b border-gray-700 px-4 sm:px-6 py-4 flex items-center gap-4 sm:gap-6">
          <a href="/" className="text-lg sm:text-xl font-bold text-blue-400 hover:text-blue-300 transition-colors">
            LoL Tracker
          </a>
          <a href="/guides" className="text-sm text-orange-400 hover:text-orange-300 transition-colors">
            Guias
          </a>
          <a href="/planner" className="text-sm text-orange-400 hover:text-orange-300 transition-colors">
            Planner
          </a>
        </nav>
        <main id="main-content" className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
