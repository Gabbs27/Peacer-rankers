import type { Metadata } from "next";
import { Cinzel, IBM_Plex_Sans } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { getDDragonVersion } from "@/lib/data-dragon";
import { DDragonProvider } from "@/components/DDragonProvider";
import NavLinks from "@/components/NavLinks";

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-cinzel",
});

const plex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex",
});

export const metadata: Metadata = {
  title: "LoL Tracker",
  description: "Analiza tus partidas de League of Legends y mejora tu juego",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ddragonVersion = await getDDragonVersion();

  return (
    <html lang="es" className={`${cinzel.variable} ${plex.variable}`}>
      <body className="text-white min-h-screen">
        <DDragonProvider version={ddragonVersion}>
          <a href="#main-content" className="skip-link">
            Saltar al contenido principal
          </a>
          <nav
            aria-label="Navegación principal"
            className="sticky top-0 z-40 border-b border-[#c8aa6e]/20 bg-gray-950/80 backdrop-blur-md px-4 sm:px-6 py-4 flex items-center gap-4 sm:gap-6"
          >
            <Link
              href="/"
              className="font-display text-lg sm:text-xl font-bold text-[#f0e6d2] hover:text-[#e3c98a] transition-colors focus-ring rounded flex items-center gap-2"
            >
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                className="w-5 h-5"
                fill="none"
                stroke="#c8aa6e"
                strokeWidth="1.6"
              >
                <path d="M12 2 L20 7 V17 L12 22 L4 17 V7 Z" />
                <path d="M12 6.5 L16.2 9 V14.5 L12 17 L7.8 14.5 V9 Z" fill="#c8aa6e" fillOpacity="0.25" />
              </svg>
              LoL Tracker
            </Link>
            <NavLinks />
          </nav>
          <main id="main-content" className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
            {children}
          </main>
          <footer className="border-t border-[#c8aa6e]/10 mt-12 py-6 text-center text-xs text-gray-500">
            LoL Tracker no está respaldado por Riot Games. Datos vía Riot Games API y Data Dragon.
          </footer>
        </DDragonProvider>
      </body>
    </html>
  );
}
