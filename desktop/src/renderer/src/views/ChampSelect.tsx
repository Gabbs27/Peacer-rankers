import { useState } from "react";
import type { MatchData } from "@/lib/types";
import { recommendPicks, ROLE_LABELS } from "@/lib/draft";
import { bestRunePage, bestSpells } from "@/lib/rune-pages";
import { analyzeChampionComp, getDefensiveRecommendations } from "@/lib/builds";
import type { ActionResult, ChampSelectView } from "../../../shared/types";
import { bridge } from "../bridge";
import { errorMessage, useRunes, type Champions } from "../data";
import { Bullets, Button, ChampIcon, ItemIcon, Section, SpellIcon } from "../components/ui";

interface Props {
  /** Riot API PUUID. */
  puuid: string;
  view: ChampSelectView;
  champs: Champions;
  matches: MatchData[] | null;
  historyError: string | null;
}

function TeamRow({ label, ids, champs }: { label: string; ids: number[]; champs: Champions }) {
  return (
    <div className="flex items-center gap-2">
      <span className="label w-14 shrink-0">{label}</span>
      <div className="flex flex-wrap gap-1">
        {ids.length === 0 && <span className="text-[11px] text-gray-500">—</span>}
        {ids.map((id, i) => {
          const c = champs.byId.get(id);
          return <ChampIcon key={`${id}-${i}`} id={c?.id} title={c?.name} version={champs.version} size={26} />;
        })}
      </div>
    </div>
  );
}

function useAction() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);
  const run = (action: () => Promise<ActionResult>) => {
    setBusy(true);
    setResult(null);
    action()
      .then(setResult)
      .catch((e: unknown) => setResult({ ok: false, message: errorMessage(e) }))
      .finally(() => setBusy(false));
  };
  return { busy, result, run };
}

function ActionNote({ result }: { result: ActionResult | null }) {
  if (!result) return null;
  return <p className={`mt-1.5 text-[11px] ${result.ok ? "text-emerald-300" : "text-amber-300"}`}>{result.message}</p>;
}

function MyChampion({ puuid, view, champs, matches, enemies }: Props & { enemies: string[] }) {
  const champ = champs.byId.get(view.myChampionId)!;
  const runes = useRunes(champs.version);
  const runeAction = useAction();
  const spellAction = useAction();

  const page = matches ? bestRunePage(matches, puuid, champ.id) : null;
  const spells = matches ? bestSpells(matches, puuid, champ.id) : null;
  const build =
    enemies.length >= 2 ? getDefensiveRecommendations(analyzeChampionComp(enemies), view.role ?? "", champ.id) : null;
  const keystone = page ? runes?.get(page.selectedPerkIds[0]) : undefined;

  return (
    <Section title={`Con ${champ.name}`} aside={view.myChampionLocked ? "bloqueado" : "elegido"}>
      <div className="space-y-3.5">
        <div>
          <p className="label mb-1.5">Tus runas con mejor récord</p>
          {!matches && <p className="text-xs text-gray-500 animate-pulse">Leyendo tu historial…</p>}
          {matches && !page && (
            <p className="text-xs text-gray-400">No tienes partidas recientes con {champ.name}: no hay página tuya que copiar.</p>
          )}
          {page && (
            <div className="flex items-center gap-3">
              {keystone && <img src={keystone.icon} alt="" width={34} height={34} draggable={false} />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-gray-100">
                  {keystone?.name ?? "Página"} · {runes?.get(page.subStyleId)?.name ?? "secundaria"}
                </p>
                <p className="text-[11px] text-gray-500">
                  {page.wins}V-{page.games - page.wins}D con esta página
                </p>
              </div>
              <Button
                disabled={runeAction.busy}
                onClick={() =>
                  runeAction.run(() =>
                    bridge.importRunePage({
                      name: `LoL Tracker · ${champ.name}`.slice(0, 40),
                      primaryStyleId: page.primaryStyleId,
                      subStyleId: page.subStyleId,
                      selectedPerkIds: page.selectedPerkIds,
                    })
                  )
                }
              >
                Aplicar runas
              </Button>
            </div>
          )}
          <ActionNote result={runeAction.result} />
        </div>

        {spells && (
          <div>
            <p className="label mb-1.5">Tus hechizos</p>
            <div className="flex items-center gap-3">
              <SpellIcon spellId={spells.spell1Id} version={champs.version} />
              <SpellIcon spellId={spells.spell2Id} version={champs.version} />
              <p className="flex-1 text-[11px] text-gray-500">
                {spells.wins}V-{spells.games - spells.wins}D en este orden
              </p>
              <Button
                variant="ghost"
                disabled={spellAction.busy}
                onClick={() => spellAction.run(() => bridge.setSpells(spells.spell1Id, spells.spell2Id))}
              >
                Aplicar
              </Button>
            </div>
            <ActionNote result={spellAction.result} />
          </div>
        )}

        {build && build.items.length > 0 && (
          <div>
            <p className="label mb-1.5">Contra su composición</p>
            <p className="mb-2 text-xs text-gray-300">{build.title}</p>
            <ul className="space-y-1.5">
              {build.items.slice(0, 3).map((item) => (
                <li key={item.itemId} className="flex items-center gap-2">
                  <ItemIcon itemId={item.itemId} version={champs.version} size={26} title={item.name} />
                  <span className="min-w-0">
                    <span className="block truncate text-xs text-gray-100">{item.name}</span>
                    <span className="block truncate text-[11px] text-gray-500">{item.reason}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Section>
  );
}

export default function ChampSelect(props: Props) {
  const { puuid, view, champs, matches, historyError } = props;
  const names = (ids: number[]) => ids.map((id) => champs.byId.get(id)?.id).filter((n): n is string => !!n);
  const allies = names(view.allyChampionIds);
  const enemies = names(view.enemyChampionIds);
  const bans = names(view.banIds);

  const picks = matches
    ? recommendPicks(matches, puuid, {
        role: view.role,
        allies,
        enemies,
        unavailable: [...bans, ...allies, ...enemies],
        pickable: view.pickableIds ? names(view.pickableIds) : undefined,
      })
    : null;

  return (
    <div className="space-y-3 p-3">
      <div className="panel space-y-2 p-3.5 fade-in">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[13px] font-semibold tracking-wide text-gold-100">Selección de campeones</h2>
          {view.role && (
            <span className="rounded-full bg-gold-500/10 px-2 py-0.5 text-[11px] text-gold-400 ring-1 ring-gold-500/30">
              {ROLE_LABELS[view.role]}
            </span>
          )}
        </div>
        <TeamRow label="Aliados" ids={view.allyChampionIds} champs={champs} />
        <TeamRow label="Rivales" ids={view.enemyChampionIds} champs={champs} />
        {view.banIds.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="label w-14 shrink-0">Bans</span>
            <div className="flex flex-wrap gap-1 opacity-60 grayscale">
              {view.banIds.map((id) => {
                const c = champs.byId.get(id);
                return <ChampIcon key={id} id={c?.id} title={c?.name} version={champs.version} size={20} />;
              })}
            </div>
          </div>
        )}
      </div>

      {view.myChampionId > 0 && champs.byId.has(view.myChampionId) && <MyChampion {...props} enemies={enemies} />}

      {!view.myChampionLocked && (
        <Section title="Recomendados para ti" aside={matches ? `con tus ${matches.length} partidas` : undefined}>
          {historyError && <p className="text-xs text-red-300">{historyError}</p>}
          {!matches && !historyError && <p className="text-xs text-gray-500 animate-pulse">Leyendo tu historial…</p>}
          {picks && picks.length === 0 && (
            <p className="text-xs text-gray-400">
              No hay campeones de tu historial disponibles en este draft. Juega unas partidas con otros campeones para tener
              alternativas.
            </p>
          )}
          {picks && picks.length > 0 && (
            <ol className="space-y-3">
              {picks.map((pick, i) => {
                const display = [...champs.byId.values()].find((c) => c.id === pick.championName)?.name ?? pick.championName;
                return (
                  <li key={pick.championName} className="flex gap-2.5">
                    <ChampIcon id={pick.championName} title={display} version={champs.version} size={38} />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-baseline gap-2 text-sm font-semibold text-gray-100">
                        <span className="text-[11px] font-normal text-gray-500">{i + 1}.</span>
                        {display}
                      </p>
                      <Bullets items={pick.reasons} tone="good" />
                      <Bullets items={pick.cautions} tone="warn" />
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
          <p className="mt-3 border-t border-white/5 pt-2 text-[10.5px] leading-snug text-gray-500">
            Basado solo en tus partidas recientes, no en estadísticas globales.
          </p>
        </Section>
      )}
    </div>
  );
}
