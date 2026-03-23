import { getItemIconUrl } from "@/lib/data-dragon";

interface Props {
  itemId: number;
  size?: number;
}

export default function ItemIcon({ itemId, size = 32 }: Props) {
  if (itemId === 0) {
    return (
      <div
        className="bg-gray-700 rounded"
        style={{ width: size, height: size }}
        role="img"
        aria-label="Espacio de item vacío"
      />
    );
  }

  return (
    <img
      src={getItemIconUrl(itemId)}
      alt={`Item de League of Legends (ID: ${itemId})`}
      width={size}
      height={size}
      className="rounded"
    />
  );
}
