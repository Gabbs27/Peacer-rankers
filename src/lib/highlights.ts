// Notable feats Riot already flags per game. Purely cosmetic/bragging layer:
// we surface the ones that are rare enough to feel earned.

import type { MatchParticipant } from "./types";

export interface Highlight {
  key: string;
  label: string;
  detail: string;
  tone: "legendary" | "great" | "good";
}

/** Ordered by prestige; the UI shows the first few. */
export function highlightsFor(p: MatchParticipant): Highlight[] {
  const c = p.challenges ?? {};
  const out: Highlight[] = [];

  const push = (
    key: string,
    condition: boolean,
    label: string,
    detail: string,
    tone: Highlight["tone"]
  ) => {
    if (condition) out.push({ key, label, detail, tone });
  };

  push("pentaKill", p.pentaKills > 0, "PENTAKILL", `${p.pentaKills}× en la partida`, "legendary");
  push("perfectGame", (c.perfectGame ?? 0) > 0, "Partida perfecta", "Sin morir y con victoria dominante", "legendary");
  push("soloBaron", (c.soloBaronKills ?? 0) > 0, "Barón en solitario", "Mataste al Barón sin ayuda", "legendary");
  push("steal", (c.epicMonsterSteals ?? 0) > 0, "Robo épico", `${c.epicMonsterSteals} objetivo(s) robado(s)`, "legendary");
  push("fountainKill", (c.takedownsInEnemyFountain ?? 0) > 0, "Kill en fuente enemiga", "Entraste a su base y saliste vivo", "legendary");

  push("quadraKill", p.quadraKills > 0 && p.pentaKills === 0, "Quadrakill", `${p.quadraKills}× en la partida`, "great");
  push("flawlessAce", (c.flawlessAces ?? 0) > 0, "Ace impecable", "Aniquilaron al equipo enemigo sin bajas", "great");
  push("multiKillOneSpell", (c.multiKillOneSpell ?? 0) > 0, "Multikill de un golpe", "Varias kills con una sola habilidad", "great");
  push("deathless", p.deaths === 0, "Sin morir", "0 muertes en toda la partida", "great");
  push("earlyAce", (c.acesBefore15Minutes ?? 0) > 0, "Ace temprano", "Ace antes del minuto 15", "great");
  push("legendary", (c.legendaryCount ?? 0) > 0, "Racha legendaria", "Llegaste a legendario", "great");

  push("tripleKill", p.tripleKills > 0 && p.quadraKills === 0 && p.pentaKills === 0, "Triplekill", `${p.tripleKills}×`, "good");
  push("outnumbered", (c.outnumberedKills ?? 0) >= 2, "Kills en inferioridad", `${c.outnumberedKills} veces en desventaja numérica`, "good");
  push("clutch", (c.survivedSingleDigitHpCount ?? 0) >= 2, "Sobreviviste al límite", `${c.survivedSingleDigitHpCount} veces con vida de un dígito`, "good");
  push("soloKills", (c.soloKills ?? 0) >= 3, "Duelista", `${c.soloKills} solo kills`, "good");
  push("firstTower", p.firstTowerKill === true, "Primera torre", "Derribaste la primera torre", "good");
  push("alcove", (c.takedownsInAlcove ?? 0) > 0, "Emboscada en el recoveco", "Takedown en el alcove", "good");

  return out;
}
