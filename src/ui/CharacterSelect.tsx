import React, { useState } from 'react';
import { AIDifficulty } from '../ai/DifficultyConfig';
import { CharacterId } from '../characters/CharacterData';
import { getAllCharacters, getCharacter, isCharacterUnlocked } from '../characters/CharacterRegistry';
import { CHARACTER_PORTRAITS } from '../data/assets';
import { PlayerProgress } from '../data/SaveManager';
import { GameMode } from '../game/GameState';

interface CharacterSelectProps {
  mode: GameMode;
  initialP1: CharacterId;
  initialP2: CharacterId;
  initialDifficulty: AIDifficulty;
  progress: PlayerProgress;
  onConfirm: (p1: CharacterId, p2: CharacterId, difficulty: AIDifficulty) => void;
  onBack: () => void;
}

export const CharacterSelect: React.FC<CharacterSelectProps> = ({
  mode,
  initialP1,
  initialP2,
  initialDifficulty,
  progress,
  onConfirm,
  onBack,
}) => {
  const all = getAllCharacters();
  const [selectedP1, setSelectedP1] = useState<CharacterId>(initialP1);
  const [selectedP2, setSelectedP2] = useState<CharacterId>(initialP2);
  const [difficulty, setDifficulty] = useState<AIDifficulty>(initialDifficulty);

  const activeDef = getCharacter(selectedP1);
  const unlocked = isCharacterUnlocked(
    selectedP1,
    progress.unlockedCharacters,
    progress.level,
    progress.totalWins
  );

  return (
    <div className="w-full h-full bg-[#090B12] text-slate-100 flex flex-col p-5 sm:p-7 overflow-hidden">
      {/* Header Row */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-800/80 shrink-0">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="px-3.5 py-2 text-xs font-semibold uppercase tracking-wider bg-[#131726] border border-slate-700 hover:border-slate-500 text-slate-200 cursor-pointer whitespace-nowrap"
          >
            Back
          </button>
          <div>
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl tracking-wide uppercase leading-none">
              Select Fighter
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {mode === 'ARCADE'
                ? 'Arcade Gauntlet · 4 Sequential Challengers'
                : mode === 'TRAINING'
                  ? 'Training Dojo · Practice Combos & Specials'
                  : 'Versus Battle · Best of 3 Rounds'}
            </p>
          </div>
        </div>

        {/* Difficulty Toggle (for Versus) */}
        {mode === 'VERSUS' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 mr-1 hidden sm:inline">AI Difficulty</span>
            {(['EASY', 'NORMAL', 'HARD'] as AIDifficulty[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDifficulty(d)}
                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border transition-colors cursor-pointer ${
                  difficulty === d
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-[#131726] text-slate-300 border-slate-800 hover:border-slate-600'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Content Split: 6-Character Grid + Selected Fighter Preview */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-5 pt-4">
        {/* Left: 6 Selectable Fighters */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-4 min-h-0">
          <div className="grid grid-cols-3 gap-3">
            {all.map((char) => {
              const isSelected = selectedP1 === char.id;
              const charUnlocked = isCharacterUnlocked(
                char.id,
                progress.unlockedCharacters,
                progress.level,
                progress.totalWins
              );
              return (
                <button
                  key={char.id}
                  type="button"
                  onClick={() => setSelectedP1(char.id)}
                  className={`group relative overflow-hidden border text-left transition-all cursor-pointer bg-[#131726] ${
                    isSelected
                      ? 'border-amber-400 ring-1 ring-amber-400/70'
                      : 'border-slate-800 hover:border-slate-600'
                  }`}
                >
                  <div className="aspect-square w-full overflow-hidden bg-slate-900 relative">
                    <img
                      src={CHARACTER_PORTRAITS[char.id]}
                      alt={`${char.name} portrait`}
                      referrerPolicy="no-referrer"
                      className={`w-full h-full object-cover transition-transform duration-200 group-hover:scale-105 ${
                        !charUnlocked ? 'grayscale opacity-55' : ''
                      }`}
                    />
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#090B12] via-[#090B12]/70 to-transparent" />
                    {!charUnlocked && (
                      <div className="absolute top-2 right-2 px-2 py-0.5 bg-slate-950/90 border border-slate-700 text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                        Locked
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2.5 right-2.5">
                      <div className="font-display font-extrabold text-xl uppercase tracking-wide leading-none text-white">
                        {char.name}
                      </div>
                      <div className="text-[11px] text-slate-300 truncate mt-0.5">{char.archetype}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Opponent Selector for Versus / Training */}
          {mode !== 'ARCADE' && (
            <div className="flex items-center justify-between gap-3 bg-[#131726] border border-slate-800/90 px-4 py-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 shrink-0">
                Opponent
              </span>
              <div className="flex items-center gap-2 overflow-x-auto">
                {all.map((opp) => (
                  <button
                    key={opp.id}
                    type="button"
                    onClick={() => setSelectedP2(opp.id)}
                    className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border transition-colors cursor-pointer whitespace-nowrap ${
                      selectedP2 === opp.id
                        ? 'bg-cyan-500 text-slate-950 border-cyan-300'
                        : 'bg-[#090B12] text-slate-300 border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    {opp.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Selected Fighter Dossier & Confirm */}
        <div className="lg:col-span-5 bg-[#131726] border border-slate-800/90 p-5 flex flex-col justify-between gap-4 min-h-0">
          <div className="flex flex-col gap-3.5 overflow-y-auto pr-1">
            <div className="flex items-start gap-4">
              <img
                src={CHARACTER_PORTRAITS[activeDef.id]}
                alt={activeDef.name}
                referrerPolicy="no-referrer"
                className="w-24 h-24 object-cover border border-slate-700 shrink-0"
              />
              <div>
                <div className="text-xs text-amber-400 font-semibold uppercase tracking-widest">
                  {activeDef.title} · {activeDef.archetype}
                </div>
                <h2 className="font-display font-extrabold text-3xl uppercase tracking-wide text-white leading-tight">
                  {activeDef.name}
                </h2>
                <p className="text-xs text-slate-300 leading-relaxed mt-1">{activeDef.bio}</p>
              </div>
            </div>

            {/* Attribute Bars */}
            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-800">
              <StatMeter label="Attack" value={activeDef.stats.attackRating} color="bg-amber-400" />
              <StatMeter label="Speed" value={activeDef.stats.speedRating} color="bg-cyan-400" />
              <StatMeter label="Defense" value={activeDef.stats.defenseRating} color="bg-violet-400" />
            </div>

            {/* Special Skills & Ultimate */}
            <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Signature Abilities
              </div>
              {(['SKILL_1', 'SKILL_2', 'ULTIMATE'] as const).map((mk) => {
                const mv = activeDef.moves[mk];
                return (
                  <div key={mk} className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="font-bold text-slate-100">
                      {mv.name}
                      <span className="font-normal text-slate-400 ml-2">{mv.description}</span>
                    </span>
                    <span className="font-mono-num text-amber-300 shrink-0">{mv.energyCost} EN</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 flex flex-col gap-2 shrink-0">
            {!unlocked && (
              <div className="text-xs text-amber-300 font-medium">
                Unlock Requirement: {activeDef.unlockRequirement.label}
              </div>
            )}
            <button
              type="button"
              disabled={!unlocked}
              onClick={() => onConfirm(selectedP1, selectedP2, difficulty)}
              className={`w-full py-3 px-5 font-display font-extrabold text-xl uppercase tracking-wider transition-colors cursor-pointer ${
                unlocked
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              {unlocked ? (mode === 'ARCADE' ? 'Start Arcade Gauntlet' : 'Confirm Fighter') : 'Fighter Locked'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatMeter: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div className="flex flex-col gap-1">
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-400">{label}</span>
      <span className="font-mono-num font-bold text-slate-100">{value}/10</span>
    </div>
    <div className="h-1.5 bg-slate-800 overflow-hidden">
      <div className={`h-full ${color}`} style={{ width: `${value * 10}%` }} />
    </div>
  </div>
);
