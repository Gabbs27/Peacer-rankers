import { Tip } from "@/lib/types";

interface Props {
  tip: Tip;
}

const levelColors = {
  good: "bg-green-900/50 text-green-300 border-green-700",
  ok: "bg-yellow-900/50 text-yellow-300 border-yellow-700",
  bad: "bg-red-900/50 text-red-300 border-red-700",
};

const levelIcons = {
  good: "^",
  ok: "~",
  bad: "v",
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
