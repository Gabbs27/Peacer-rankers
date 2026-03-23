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
        <nav className="border-b border-gray-800 px-6 py-4">
          <a href="/" className="text-xl font-bold text-blue-400 hover:text-blue-300">
            LoL Tracker
          </a>
        </nav>
        <main className="container mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
