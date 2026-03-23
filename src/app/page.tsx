import SearchBar from "@/components/SearchBar";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-8">
      <div className="text-center">
        <h1 className="text-5xl font-bold mb-4">
          <span className="text-blue-400">LoL</span> Tracker
        </h1>
        <p className="text-gray-400 text-lg">
          Busca tu perfil, revisa tus partidas y mejora tu juego
        </p>
      </div>
      <SearchBar />
    </div>
  );
}
