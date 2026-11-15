import React from 'react';
import { CharacterId } from '../characters/CharacterData';
import { getCharacter } from '../characters/CharacterRegistry';
import { MatchSummary } from '../game/GameEngine';

interface MatchResultModalProps {
  summary: MatchSummary;
  xpEarned: number;
  leveledUp: boolean;
  newLevel: number;
  newlyUnlocked: CharacterId[];
  onNextArcadeStage: () => void;
  onPlayAgain: () => void;
  onMainMenu: () => void;
}

export const MatchResultModal: React.FC<MatchResultModalProps> = ({
  summary,
  xpEarned,
  leveledUp,
  newLevel,
  newlyUnlocked,
  onNextArcadeStage,
  onPlayAgain,
  onMainMenu,
}) => {
  const p1 = getCharacter(summary.p1Id);
  const p2 = getCharacter(summary.p2Id);
  const hasNextArcade =
    summary.mode === 'ARCADE' &&
    summary.playerWon &&
    summary.arcadeStageIndex + 1 < summary.arcadeTotalStages;

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(6, 8, 14, 0.86)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Match Result"
    >
      <div className="w-full max-w-md bg-[#131726] border border-slate-700 p-6 flex flex-col gap-5 shadow-2xl">
        <div className="border-b border-slate-800 pb-3">
          <div
            className={`text-xs font-bold uppercase tracking-widest ${
              summary.playerWon ? 'text-amber-400' : 'text-rose-400'
            }`}
          >
            {summary.isArcadeClear
              ? 'Arcade Gauntlet Cleared'
              : summary.mode === 'ARCADE'
                ? `Arcade Stage ${summary.arcadeStageIndex + 1}/${summary.arcadeTotalStages}`
                : 'Versus Match Complete'}
          </div>
          <h2 className="font-display font-extrabold text-5xl uppercase tracking-wide text-white mt-0.5">
            {summary.playerWon ? 'Victory' : 'Defeat'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {p1.name} vs {p2.name} · Rounds {summary.p1Rounds} - {summary.p2Rounds}
          </p>
        </div>

        {/* Mastery Metrics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#090B12] border border-slate-800 p-3">
            <div className="text-[11px] uppercase tracking-wider text-slate-400">Max Combo</div>
            <div className="font-mono-num text-xl font-bold text-amber-300 mt-1 tabular-nums">
              {summary.maxCombo}
            </div>
          </div>
          <div className="bg-[#090B12] border border-slate-800 p-3">
            <div className="text-[11px] uppercase tracking-wider text-slate-400">Damage</div>
            <div className="font-mono-num text-xl font-bold text-cyan-300 mt-1 tabular-nums">
              {summary.damageDealt}
            </div>
          </div>
          <div className="bg-[#090B12] border border-slate-800 p-3">
            <div className="text-[11px] uppercase tracking-wider text-slate-400">XP Earned</div>
            <div className="font-mono-num text-xl font-bold text-violet-300 mt-1 tabular-nums">
              +{xpEarned}
            </div>
          </div>
        </div>

        {(leveledUp || newlyUnlocked.length > 0) && (
          <div className="bg-amber-500/10 border border-amber-400/50 p-3 flex flex-col gap-1 text-xs">
            {leveledUp && (
              <div className="font-bold text-amber-300">Rank Up! Reached Player Level {newLevel}</div>
            )}
            {newlyUnlocked.map((id) => (
              <div key={id} className="font-semibold text-white">
                Fighter Unlocked: {getCharacter(id).name} ({getCharacter(id).title})
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          {hasNextArcade ? (
            <button
              type="button"
              data-start="true"
              onClick={onNextArcadeStage}
              className="w-full py-3.5 px-5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-extrabold text-2xl uppercase tracking-wider cursor-pointer"
            >
              Next Challenger
            </button>
          ) : (
            <button
              type="button"
              data-start="true"
              onClick={onPlayAgain}
              className="w-full py-3.5 px-5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-extrabold text-2xl uppercase tracking-wider cursor-pointer"
            >
              Play Again
            </button>
          )}
          <button
            type="button"
            onClick={onMainMenu}
            className="w-full py-2.5 px-5 bg-[#090B12] hover:bg-slate-900 border border-slate-800 text-slate-300 font-semibold text-sm uppercase tracking-wider cursor-pointer"
          >
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
};
