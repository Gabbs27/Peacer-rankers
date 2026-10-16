import type { Role } from "@/lib/draft";
import type { ChampSelectView } from "../../shared/types";

const POSITIONS: Record<string, Role> = {
  top: "TOP",
  jungle: "JUNGLE",
  middle: "MIDDLE",
  bottom: "BOTTOM",
  utility: "UTILITY",
};

interface Member {
  cellId: number;
  championId?: number;
  championPickIntent?: number;
  assignedPosition?: string;
}

interface Action {
  actorCellId: number;
  championId: number;
  completed: boolean;
  type: string;
}

interface Session {
  localPlayerCellId: number;
  myTeam: Member[];
  theirTeam: Member[];
  actions?: Action[][];
  bans?: { myTeamBans?: number[]; theirTeamBans?: number[] };
}

function isSession(value: unknown): value is Session {
  const s = value as Session | null;
  return !!s && typeof s.localPlayerCellId === "number" && Array.isArray(s.myTeam) && Array.isArray(s.theirTeam);
}

/** Reduces the client's champion-select session to what the draft assistant needs. */
export function toChampSelectView(session: unknown, pickableIds: number[] | null): ChampSelectView | null {
  if (!isSession(session)) return null;
  const me = session.myTeam.find((m) => m.cellId === session.localPlayerCellId);
  if (!me) return null;

  const actions = (session.actions ?? []).flat().filter((a) => a && typeof a.championId === "number");
  const choice = (m: Member) => m.championId || m.championPickIntent || 0;
  const banIds = new Set<number>([
    ...actions.filter((a) => a.type === "ban" && a.completed).map((a) => a.championId),
    ...(session.bans?.myTeamBans ?? []),
    ...(session.bans?.theirTeamBans ?? []),
  ]);
  banIds.delete(0);

  return {
    role: POSITIONS[(me.assignedPosition ?? "").toLowerCase()] ?? null,
    myChampionId: choice(me),
    myChampionLocked:
      (me.championId ?? 0) > 0 &&
      actions.some((a) => a.actorCellId === me.cellId && a.type === "pick" && a.completed),
    allyChampionIds: session.myTeam
      .filter((m) => m.cellId !== me.cellId)
      .map(choice)
      .filter((id) => id > 0),
    enemyChampionIds: session.theirTeam.map((m) => m.championId ?? 0).filter((id) => id > 0),
    banIds: [...banIds],
    pickableIds,
  };
}
