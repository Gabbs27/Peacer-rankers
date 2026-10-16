import { Sigil } from "../components/ui";

const FEATURES = [
  "Recomendaciones de pick con tu propio historial",
  "Tus runas y hechizos con mejor récord, con un clic",
  "Scouting de los 10 jugadores al cargar la partida",
  "Tu plan y tu build en un overlay discreto",
];

export default function Searching() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center fade-in">
      <Sigil className="h-14 w-14 animate-pulse" />
      <div>
        <h1 className="font-display text-xl font-bold text-gold-100">Esperando a League of Legends</h1>
        <p className="mt-2 text-sm text-gray-400">Abre el cliente y la app se conectará sola.</p>
      </div>
      <ul className="space-y-1.5 text-left text-xs text-gray-400">
        {FEATURES.map((f) => (
          <li key={f} className="flex items-center gap-2">
            <span aria-hidden className="h-1 w-1 rounded-full bg-gold-500" />
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}
