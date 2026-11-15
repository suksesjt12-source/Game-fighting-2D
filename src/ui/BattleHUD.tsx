import React from 'react';
import { CHARACTER_PORTRAITS } from '../data/assets';
import { HudSnapshot } from '../game/GameEngine';

interface BattleHUDProps {
  hud: HudSnapshot;
  muted: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  onToggleUnlimitedHp: () => void;
  onResetTraining: () => void;
}

export const BattleHUD: React.FC<BattleHUDProps> = ({
  hud,
  muted,
  onToggleMute,
  onPause,
  onToggleUnlimitedHp,
  onResetTraining,
}) => {
  const p1Pct = Math.max(0, Math.min(100, (hud.p1.hp / hud.p1.maxHp) * 100));
  const p1TrailPct = Math.max(0, Math.min(100, (hud.p1.trailHp / hud.p1.maxHp) * 100));
  const p2Pct = Math.max(0, Math.min(100, (hud.p2.hp / hud.p2.maxHp) * 100));
  const p2TrailPct = Math.max(0, Math.min(100, (hud.p2.trailHp / hud.p2.maxHp) * 100));

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-3 sm:p-5">
      {/* Top Fighting HUD Bar */}
      <div className="w-full max-w-6xl mx-auto flex flex-col gap-1.5">
        <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3 sm:gap-5">
          {/* Player 1 Cluster */}
          <div className="flex items-center gap-2.5">
            <img
              src={CHARACTER_PORTRAITS[hud.p1.id]}
              alt={hud.p1.name}
              referrerPolicy="no-referrer"
              className="w-11 h-11 sm:w-13 sm:h-13 object-cover border-2 border-amber-400 shrink-0 bg-slate-900"
            />
            <div className="flex-1 min-w-0 flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-display font-extrabold text-lg sm:text-xl uppercase tracking-wide text-white hud-stroke truncate">
                  {hud.p1.name}
                </span>
                <span className="font-mono-num text-xs font-bold text-amber-300 hud-stroke tabular-nums">
                  {hud.p1.hp}/{hud.p1.maxHp}
                </span>
              </div>

              {/* Health Bar with delayed drain trail */}
              <div className="relative h-4 sm:h-5 bg-[#090B12]/90 border border-slate-700 overflow-hidden -skew-x-12">
                <div
                  className="absolute inset-y-0 right-0 bg-amber-200/80 transition-none"
                  style={{ width: `${p1TrailPct}%` }}
                />
                <div
                  className="absolute inset-y-0 right-0 bg-gradient-to-l from-amber-400 via-amber-500 to-rose-600 transition-none"
                  style={{ width: `${p1Pct}%` }}
                />
              </div>

              {/* Energy & Round Pips Row */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 flex-1">
                  <div className="h-2 flex-1 bg-[#090B12]/90 border border-slate-700/80 overflow-hidden">
                    <div
                      className={`h-full transition-none ${
                        hud.p1.energy >= 100 ? 'bg-amber-400' : 'bg-cyan-400'
                      }`}
                      style={{ width: `${hud.p1.energy}%` }}
                    />
                  </div>
                  <span className="font-mono-num text-[11px] font-bold text-cyan-300 hud-stroke tabular-nums">
                    {hud.p1.energy >= 100 ? 'ULT READY' : `${hud.p1.energy} EN`}
                  </span>
                </div>
                {hud.mode !== 'TRAINING' && (
                  <div className="flex items-center gap-1" aria-label="Player 1 round wins">
                    {[0, 1].map((idx) => (
                      <span
                        key={idx}
                        className={`w-2.5 h-2.5 rotate-45 border ${
                          hud.p1Rounds > idx ? 'bg-amber-400 border-amber-200' : 'bg-slate-900 border-slate-600'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Center Timer / Mode Plaque */}
          <div className="flex flex-col items-center justify-center px-2">
            <div className="px-3.5 py-1 bg-[#090B12]/90 border border-amber-500/60 flex flex-col items-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 leading-none">
                {hud.mode === 'TRAINING'
                  ? 'TRAINING'
                  : hud.mode === 'ARCADE'
                    ? `STAGE ${hud.arcadeStageIndex + 1}/${hud.arcadeTotalStages}`
                    : `ROUND ${hud.roundNumber}`}
              </span>
              <span className="font-display font-extrabold text-3xl sm:text-4xl text-white tabular-nums leading-none mt-0.5">
                {hud.mode === 'TRAINING' ? '∞' : hud.roundTimer}
              </span>
            </div>

            {/* Compact Pause & Mute Utility Icons */}
            <div className="flex items-center gap-1.5 mt-1.5 pointer-events-auto">
              <button
                type="button"
                aria-label={muted ? 'Unmute audio' : 'Mute audio'}
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onToggleMute();
                }}
                className="w-8 h-8 bg-[#090B12]/85 border border-slate-700 hover:border-amber-400 flex items-center justify-center text-slate-200 cursor-pointer"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2">
                  <path d="M11 5L6 9H2v6h4l5 4V5z" />
                  {muted ? (
                    <path d="M23 9l-6 6M17 9l6 6" />
                  ) : (
                    <path d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14" />
                  )}
                </svg>
              </button>
              <button
                type="button"
                aria-label="Pause game"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onPause();
                }}
                className="w-8 h-8 bg-[#090B12]/85 border border-slate-700 hover:border-amber-400 flex items-center justify-center text-slate-200 cursor-pointer"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Player 2 / AI Cluster */}
          <div className="flex items-center gap-2.5 flex-row-reverse">
            <img
              src={CHARACTER_PORTRAITS[hud.p2.id]}
              alt={hud.p2.name}
              referrerPolicy="no-referrer"
              className="w-11 h-11 sm:w-13 sm:h-13 object-cover border-2 border-cyan-400 shrink-0 bg-slate-900"
            />
            <div className="flex-1 min-w-0 flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-2 flex-row-reverse">
                <span className="font-display font-extrabold text-lg sm:text-xl uppercase tracking-wide text-white hud-stroke truncate">
                  {hud.p2.name}
                </span>
                <span className="font-mono-num text-xs font-bold text-cyan-300 hud-stroke tabular-nums">
                  {hud.p2.hp}/{hud.p2.maxHp}
                </span>
              </div>

              <div className="relative h-4 sm:h-5 bg-[#090B12]/90 border border-slate-700 overflow-hidden skew-x-12">
                <div
                  className="absolute inset-y-0 left-0 bg-cyan-200/80 transition-none"
                  style={{ width: `${p2TrailPct}%` }}
                />
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-400 via-violet-500 to-purple-600 transition-none"
                  style={{ width: `${p2Pct}%` }}
                />
              </div>

              <div className="flex items-center justify-between gap-3 flex-row-reverse">
                <div className="flex items-center gap-1.5 flex-1 flex-row-reverse">
                  <div className="h-2 flex-1 bg-[#090B12]/90 border border-slate-700/80 overflow-hidden">
                    <div
                      className="h-full bg-violet-400 ml-auto transition-none"
                      style={{ width: `${hud.p2.energy}%` }}
                    />
                  </div>
                  <span className="font-mono-num text-[11px] font-bold text-violet-300 hud-stroke tabular-nums">
                    {hud.p2.energy} EN
                  </span>
                </div>
                {hud.mode !== 'TRAINING' && (
                  <div className="flex items-center gap-1" aria-label="Opponent round wins">
                    {[0, 1].map((idx) => (
                      <span
                        key={idx}
                        className={`w-2.5 h-2.5 rotate-45 border ${
                          hud.p2Rounds > idx ? 'bg-cyan-400 border-cyan-200' : 'bg-slate-900 border-slate-600'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Training Mode Quick Bar */}
        {hud.mode === 'TRAINING' && (
          <div className="flex items-center justify-between gap-3 pt-1 pointer-events-auto">
            <div className="flex items-center gap-2">
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onToggleUnlimitedHp();
                }}
                className={`px-3 py-1 text-xs font-bold uppercase tracking-wider border cursor-pointer ${
                  hud.trainingUnlimitedHp
                    ? 'bg-cyan-500 text-slate-950 border-cyan-300'
                    : 'bg-[#090B12]/90 text-slate-300 border-slate-700'
                }`}
              >
                Auto-Heal: {hud.trainingUnlimitedHp ? 'ON' : 'OFF'}
              </button>
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onResetTraining();
                }}
                className="px-3 py-1 text-xs font-bold uppercase tracking-wider bg-[#090B12]/90 text-slate-200 border border-slate-700 hover:border-amber-400 cursor-pointer"
              >
                Reset Positions
              </button>
            </div>
            <div className="font-mono-num text-xs text-amber-300 hud-stroke">
              Last Hit: {hud.lastHitDamage} DMG
            </div>
          </div>
        )}
      </div>

      {/* Center Combo Callouts & Round Countdown Banner */}
      <div className="relative flex-1 flex items-center justify-between px-4 sm:px-10">
        {hud.p1.combo >= 2 ? (
          <div className="flex flex-col items-start">
            <span className="font-display font-extrabold italic text-4xl sm:text-5xl text-amber-400 hud-stroke leading-none tabular-nums">
              {hud.p1.combo} HITS
            </span>
            <span className="font-mono-num text-xs font-bold text-white hud-stroke tabular-nums">
              {hud.p1.comboDamage} DMG
            </span>
          </div>
        ) : (
          <div />
        )}

        {hud.countdownBanner && (
          <div className="font-display font-extrabold italic text-6xl sm:text-7xl tracking-wider text-amber-400 hud-stroke uppercase text-center">
            {hud.countdownBanner}
          </div>
        )}

        {hud.p2.combo >= 2 ? (
          <div className="flex flex-col items-end">
            <span className="font-display font-extrabold italic text-4xl sm:text-5xl text-cyan-400 hud-stroke leading-none tabular-nums">
              {hud.p2.combo} HITS
            </span>
            <span className="font-mono-num text-xs font-bold text-white hud-stroke tabular-nums">
              {hud.p2.comboDamage} DMG
            </span>
          </div>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
};
