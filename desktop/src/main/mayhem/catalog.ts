import type { LcuClient } from "../actions";
import { parseAugmentCatalog, type AugmentInfo } from "../../shared/augments";

/** Names, rarity and icons of every augment, in the client's language. */
export async function loadAugmentCatalog(client: LcuClient): Promise<Map<number, AugmentInfo>> {
  return parseAugmentCatalog(await client.get<unknown>("/lol-game-data/assets/v1/cherry-augments.json"));
}
