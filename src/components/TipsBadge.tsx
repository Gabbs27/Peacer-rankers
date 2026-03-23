import { Tip } from "@/lib/types";

interface Props {
  tip: Tip;
}

const levelColors = {
  good: "bg-green-800/40 text-green-200 border-green-600",
  ok: "bg-yellow-800/40 text-yellow-200 border-yellow-600",
  bad: "bg-red-800/40 text-red-200 border-red-600",
};

const levelIcons = {
  good: "\u2713",
  ok: "~",
  bad: "!",
};

export default function TipsBadge({ tip }: Props) {
  return (
    <div
      className={`px-3 py-2 rounded-lg border text-sm ${levelColors[tip.level]}`}
    >
      <span className="font-mono mr-2">{levelIcons[tip.level]}</span>
      {tip.message}
    </div>
  );
}
