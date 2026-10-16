import { useState } from "react";
import { clearlyBetter, MAYHEM_QUEUE } from "@/lib/mayhem";
import type { ActionResult, ChampSelectView, MayhemStatus } from "../../../shared/types";
import { bridge } from "../bridge";
import { errorMessage, useItems, useMayhemInsights, type Champions } from "../data";
import { AugmentGroups } from "../components/augments";
import { BuildRow, finishedItems } from "../components/builds";
import { Button, ChampIcon, Section, SpellIcon } from "../components/ui";

interface Props {
  view: ChampSelectView;
  queueId: number;
  champs: Champions;
  mayhem: MayhemStatus;
}

/** ARAM / ARAM: Mayhem champion select: random champion, bench, augments; no picks or runes. */
export default function AramSelect({ view, queueId, champs, mayhem }: Props) {
  const isMayhem = queueId === MAYHEM_QUEUE;
  const ids = [view.myChampionId, ...view.benchIds].filter((id) => id > 0);
  const insights = useMayhemInsights(isMayhem ? ids : [], mayhem.games);
  const mine = insights?.find((i) => i.championId === view.myChampionId) ?? null;
  const champ = champs.byId.get(view.myChampionId);
  const items = useItems(isMayhem ? champs.version : null);
  const [spellResult, setSpellResult] = useState<ActionResult | null>(null);

  const bench = (insights ?? []).filter((i) => i.championId !== view.myChampionId);

  return (
    <div className="space-y-3 p-3">
      <div className="panel flex items-center gap-3 p-3.5 fade-in">
        <ChampIcon id={champ?.id} title={champ?.name} version={champs.version} size={44} />
        <div className="min-w-0 flex-1">
          <p className="label">{isMayhem ? "ARAM: Mayhem" : "ARAM"}</p>
          <p className="font-display text-base font-semibold text-gold-100">{champ?.name ?? "Tu campeón"}</p>
          {isMayhem && mine && mine.games > 0 && (
            <p className="text-[11px] text-gray-400">
              {mine.winrate}% de victorias en {mine.games} partidas analizadas
            </p>
          )}
        </div>
      </div>

      {!isMayhem && (
        <Section title="ARAM">
          <p className="text-xs text-gray-400">
            En ARAM normal no hay aumentos y los campeones son aleatorios: no hay picks que recomendar.
          </p>
        </Section>
      )}

      {isMayhem && (
        <Section title="Aumentos más elegidos" aside={mayhem.patch ? `parche ${mayhem.patch} · ${mayhem.games} partidas` : undefined}>
          {!insights && <p className="text-xs text-gray-500 animate-pulse">Calculando…</p>}
          {insights && (!mine || mine.augments.length === 0) && (
            <p className="text-xs text-gray-400">
              Aún no hay suficientes partidas de {champ?.name ?? "este campeón"} en tus datos. Pulsa «Analizar más partidas» en
              la pantalla de inicio para sumar más.
            </p>
          )}
          {mine && mine.augments.length > 0 && (
            <AugmentGroups augments={mine.augments} championName={champ?.name} items={items} version={champs.version} />
          )}
          <p className="mt-3 border-t border-white/5 pt-2 text-[10.5px] leading-snug text-gray-500">
            Ordenados por lo que más eligen los jugadores de {champ?.name ?? "tu campeón"}: el % es cuántas de sus partidas lo
            llevan, y los objetos son los que arma más quien lo toma. ▲ y ▼ marcan los que ganan claramente más o menos;
            hacen falta miles de partidas para verlo. En Mayhem no hay runas.
          </p>
        </Section>
      )}

      {isMayhem && mine && finishedItems(mine.build, items).length > 0 && (
        <Section title="Build más usada" aside="% de sus partidas">
          <BuildRow build={mine.build} items={items} version={champs.version} />
        </Section>
      )}

      {isMayhem && mine?.spells && (
        <Section title="Hechizos">
          <div className="flex items-center gap-3">
            <SpellIcon spellId={mine.spells.spell1Id} version={champs.version} />
            <SpellIcon spellId={mine.spells.spell2Id} version={champs.version} />
            <p className="flex-1 text-[11px] text-gray-500">
              Los más elegidos: {mine.spells.pickRate}% de sus partidas
            </p>
            <Button
              variant="ghost"
              onClick={() =>
                bridge
                  .setSpells(mine.spells!.spell1Id, mine.spells!.spell2Id)
                  .then(setSpellResult)
                  .catch((e: unknown) => setSpellResult({ ok: false, message: errorMessage(e) }))
              }
            >
              Aplicar
            </Button>
          </div>
          {spellResult && (
            <p className={`mt-1.5 text-[11px] ${spellResult.ok ? "text-emerald-300" : "text-amber-300"}`}>{spellResult.message}</p>
          )}
        </Section>
      )}

      {isMayhem && bench.length > 0 && (
        <Section title="Banquillo">
          <ul className="space-y-1.5">
            {bench.map((b) => {
              const c = champs.byId.get(b.championId);
              const better = !!mine && clearlyBetter(b, mine);
              return (
                <li key={b.championId} className="flex items-center gap-2.5">
                  <ChampIcon id={c?.id} title={c?.name} version={champs.version} size={28} />
                  <span className="flex-1 truncate text-sm text-gray-200">{c?.name ?? "—"}</span>
                  <span className="text-[11px] text-gray-400">
                    {b.winrate !== null ? `${b.winrate}% · ${b.games}` : "sin datos"}
                  </span>
                  {better && <span className="text-[11px] font-semibold text-emerald-300">mejor</span>}
                </li>
              );
            })}
          </ul>
        </Section>
      )}
    </div>
  );
}
