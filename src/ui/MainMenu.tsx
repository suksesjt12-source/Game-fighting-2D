import React from 'react';
import { TITLE_BG_URL } from '../data/assets';
import { PlayerProgress, xpRequiredForLevel } from '../data/SaveManager';

interface MainMenuProps {
  progress: PlayerProgress;
  onPlayVersus: () => void;
  onArcadeMode: () => void;
  onTrainingMode: () => void;
  onCharacterSelect: () => void;
  onCollection: () => void;
  onSettings: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  progress,
  onPlayVersus,
  onArcadeMode,
  onTrainingMode,
  onCharacterSelect,
  onCollection,
  onSettings,
}) => {
  const reqXp = xpRequiredForLevel(progress.level);
  const xpPct = Math.min(100, Math.round((progress.xp / reqXp) * 100));

  return (
    <main className="relative w-full h-full overflow-hidden bg-[#090B12] flex flex-col justify-between p-6 sm:p-10">
      {/* Illustrated Key-Art Backdrop */}
      <img
        src={TITLE_BG_URL}
        alt="Eclipse Shrine key artwork"
        referrerPolicy="no-referrer"
        className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none"
      />
      {/* Measured scrim keeping left 40% calm negative space legible */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(95deg, rgba(9,11,18,0.92) 0%, rgba(9,11,18,0.72) 44%, rgba(9,11,18,0.22) 100%)',
        }}
      />

      {/* Top Strip: Progression Summary & Utility */}
      <div className="relative z-10 flex items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="flex items-baseline gap-2">
            <span className="text-xs uppercase tracking-widest text-slate-400">Rank</span>
            <span className="font-display font-extrabold text-2xl text-amber-400 tabular-nums">
              LV.{progress.level}
            </span>
          </div>
          <div className="w-32 sm:w-44 h-2 bg-slate-800/90 overflow-hidden border border-slate-700/70">
            <div
              className="h-full bg-amber-400 transition-all duration-300"
              style={{ width: `${xpPct}%` }}
            />
          </div>
          <span className="font-mono-num text-xs text-slate-300 tabular-nums">
            {progress.xp}/{reqXp} XP · {progress.totalWins} Wins
          </span>
        </div>

        <button
          type="button"
          onClick={onSettings}
          className="px-4 py-2 text-xs font-semibold tracking-wider uppercase text-slate-200 bg-[#131726]/90 border border-slate-700/80 hover:border-amber-400/70 hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Settings
        </button>
      </div>

      {/* Left-Third Lockup & Primary Navigation */}
      <div className="relative z-10 max-w-lg my-auto flex flex-col items-start gap-6">
        {/* Custom Inline SVG Title Emblem */}
        <svg
          viewBox="0 0 480 128"
          className="w-full max-w-[440px] h-auto overflow-visible"
          role="img"
          aria-label="Eclipse Arena"
        >
          <defs>
            <linearGradient id="eclipseRing" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="55%" stopColor="#A855F7" />
              <stop offset="100%" stopColor="#22D3EE" />
            </linearGradient>
          </defs>
          {/* Eclipse solar ring behind emblem */}
          <circle cx="52" cy="64" r="42" fill="none" stroke="url(#eclipseRing)" strokeWidth="4" />
          <circle cx="56" cy="64" r="35" fill="#090B12" />
          <path d="M22 64 L88 46 L72 64 L92 78 Z" fill="#F59E0B" opacity="0.92" />
          <text
            x="112"
            y="62"
            fill="#F8FAFC"
            fontFamily="Barlow Condensed, sans-serif"
            fontWeight="800"
            fontStyle="italic"
            fontSize="58"
            letterSpacing="2"
          >
            ECLIPSE
          </text>
          <text
            x="114"
            y="108"
            fill="#F59E0B"
            fontFamily="Barlow Condensed, sans-serif"
            fontWeight="700"
            fontSize="38"
            letterSpacing="10"
          >
            ARENA
          </text>
        </svg>

        {/* Primary Play CTA + Mode List */}
        <div className="w-full max-w-sm flex flex-col gap-3">
          <button
            type="button"
            data-start="true"
            onClick={onPlayVersus}
            className="w-full py-3.5 px-6 bg-amber-500 hover:bg-amber-400 active:translate-y-0.5 text-slate-950 font-display font-extrabold text-2xl tracking-wider uppercase flex items-center justify-between transition-colors cursor-pointer shadow-lg shadow-amber-500/20"
          >
            <span>Play Versus</span>
            <span className="font-mono-num text-xs font-bold tracking-normal">ENTER</span>
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onArcadeMode}
              className="py-3 px-4 bg-[#131726]/95 hover:bg-[#1C2238] border border-slate-700/80 hover:border-violet-400/80 text-slate-100 font-display font-bold text-lg tracking-wide uppercase text-left transition-colors cursor-pointer"
            >
              Arcade Mode
            </button>
            <button
              type="button"
              onClick={onTrainingMode}
              className="py-3 px-4 bg-[#131726]/95 hover:bg-[#1C2238] border border-slate-700/80 hover:border-cyan-400/80 text-slate-100 font-display font-bold text-lg tracking-wide uppercase text-left transition-colors cursor-pointer"
            >
              Training Mode
            </button>
            <button
              type="button"
              onClick={onCharacterSelect}
              className="py-2.5 px-4 bg-[#131726]/90 hover:bg-[#1C2238] border border-slate-800 hover:border-amber-400/70 text-slate-200 font-semibold text-sm tracking-wide transition-colors cursor-pointer text-left"
            >
              Fighter Select
            </button>
            <button
              type="button"
              onClick={onCollection}
              className="py-2.5 px-4 bg-[#131726]/90 hover:bg-[#1C2238] border border-slate-800 hover:border-amber-400/70 text-slate-200 font-semibold text-sm tracking-wide transition-colors cursor-pointer text-left"
            >
              Collection ({progress.unlockedCharacters.length}/6)
            </button>
          </div>
        </div>
      </div>

      {/* Single Flat Bottom Control Hint */}
      <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 tracking-wide">
        <span>A/D Move · W Jump · S/K Guard · J/L Attack · U/I Skills · O Ultimate · Esc Pause</span>
      </div>
    </main>
  );
};
