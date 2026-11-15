import React, { useState } from 'react';
import { CharacterId } from '../characters/CharacterData';
import { getAllCharacters, getCharacter, isCharacterUnlocked } from '../characters/CharacterRegistry';
import { CHARACTER_PORTRAITS } from '../data/assets';
import { PlayerProgress } from '../data/SaveManager';

interface CollectionScreenProps {
  progress: PlayerProgress;
  onBack: () => void;
}

export const CollectionScreen: React.FC<CollectionScreenProps> = ({ progress, onBack }) => {
  const all = getAllCharacters();
  const [selectedId, setSelectedId] = useState<CharacterId>('kairo');
  const active = getCharacter(selectedId);
  const unlocked = isCharacterUnlocked(
    selectedId,
    progress.unlockedCharacters,
    progress.level,
    progress.totalWins
  );

  return (
    <div className="w-full h-full bg-[#090B12] text-slate-100 flex flex-col p-5 sm:p-7 overflow-hidden">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 shrink-0">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="px-3.5 py-2 text-xs font-semibold uppercase tracking-wider bg-[#131726] border border-slate-700 hover:border-slate-500 text-slate-200 cursor-pointer"
          >
            Back
          </button>
          <div>
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl uppercase tracking-wide leading-none">
              Fighter Collection
            </h1>
            <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
              {progress.unlockedCharacters.length}/6 Unlocked · {progress.totalMatches} Matches · {progress.arcadeClears} Arcade Clears · Best Combo {progress.bestCombo}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-5 pt-4">
        <div className="lg:col-span-6 grid grid-cols-3 gap-3 content-start">
          {all.map((c) => {
            const isUnl = isCharacterUnlocked(
              c.id,
              progress.unlockedCharacters,
              progress.level,
              progress.totalWins
            );
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedId(c.id)}
                className={`relative overflow-hidden border bg-[#131726] text-left cursor-pointer ${
                  selectedId === c.id ? 'border-amber-400 ring-1 ring-amber-400/70' : 'border-slate-800 hover:border-slate-600'
                }`}
              >
                <div className="aspect-square relative">
                  <img
                    src={CHARACTER_PORTRAITS[c.id]}
                    alt={c.name}
                    referrerPolicy="no-referrer"
                    className={`w-full h-full object-cover ${!isUnl ? 'grayscale opacity-50' : ''}`}
                  />
                  <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#090B12] to-transparent" />
                  <div className="absolute bottom-2 left-2.5 right-2.5">
                    <div className="font-display font-bold text-lg uppercase text-white leading-none">{c.name}</div>
                    <div className="text-[11px] text-slate-300 mt-0.5">
                      {isUnl ? c.archetype : c.unlockRequirement.label}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="lg:col-span-6 bg-[#131726] border border-slate-800 p-5 flex flex-col gap-4 overflow-y-auto">
          <div className="flex items-start gap-4">
            <img
              src={CHARACTER_PORTRAITS[active.id]}
              alt={active.name}
              referrerPolicy="no-referrer"
              className="w-24 h-24 object-cover border border-slate-700 shrink-0"
            />
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-amber-400">
                {active.title} · {unlocked ? 'Unlocked' : active.unlockRequirement.label}
              </div>
              <h2 className="font-display font-extrabold text-3xl uppercase text-white">{active.name}</h2>
              <p className="text-sm text-slate-300 mt-1 leading-relaxed">{active.bio}</p>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-3 flex flex-col gap-2.5">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Command Move List</div>
            {(['ATTACK_1', 'ATTACK_2', 'SKILL_1', 'SKILL_2', 'ULTIMATE'] as const).map((mk) => {
              const m = active.moves[mk];
              const keyMap = {
                ATTACK_1: 'J',
                ATTACK_2: 'L',
                SKILL_1: 'U',
                SKILL_2: 'I',
                ULTIMATE: 'O',
              };
              return (
                <div key={mk} className="flex items-center justify-between gap-3 bg-[#090B12] border border-slate-800/80 px-3 py-2">
                  <div>
                    <div className="text-sm font-bold text-white">
                      {m.name} <span className="text-xs font-normal text-slate-400 ml-1.5">[{keyMap[mk]}]</span>
                    </div>
                    <div className="text-xs text-slate-400">{m.description}</div>
                  </div>
                  <div className="text-right font-mono-num text-xs shrink-0">
                    <div className="text-amber-300 font-bold">{m.baseDamage} DMG</div>
                    <div className="text-cyan-300">{m.energyCost > 0 ? `${m.energyCost} EN` : '0 EN'}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
