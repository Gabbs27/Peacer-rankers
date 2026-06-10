import SearchBar from "@/components/SearchBar";
import QuickAccess from "@/components/QuickAccess";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-8">
      <div className="text-center rise">
        <p className="text-xs uppercase tracking-[0.35em] text-[#c8aa6e] mb-3">
          Analiza · Aprende · Sube
        </p>
        <h1 className="font-display text-5xl sm:text-6xl font-bold mb-4 text-[#f0e6d2]">
          LoL <span className="text-transparent bg-clip-text bg-gradient-to-b from-[#f0e6d2] via-[#e3c98a] to-[#c8aa6e]">Tracker</span>
        </h1>
        <p className="text-gray-300 text-lg max-w-xl mx-auto">
          Busca tu perfil, revisa tus partidas con análisis minuto a minuto y
          descubre qué está costándote partidas.
        </p>
      </div>
      <div className="w-full max-w-2xl panel p-4 sm:p-5 rise rise-2">
        <SearchBar />
      </div>
      <div className="rise rise-3 w-full max-w-2xl">
        <QuickAccess />
      </div>
    </div>
  );
}
