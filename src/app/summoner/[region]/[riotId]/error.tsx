"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="text-center py-20">
      <h1 className="text-2xl text-red-400">Algo salió mal</h1>
      <p className="text-gray-400 mt-2">{error.message}</p>
      <div className="flex gap-4 justify-center mt-6">
        <button
          onClick={reset}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
        >
          Reintentar
        </button>
        <a
          href="/"
          className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
        >
          Volver al inicio
        </a>
      </div>
    </div>
  );
}
