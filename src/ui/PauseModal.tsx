import React from 'react';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onSettings: () => void;
  onMainMenu: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onSettings,
  onMainMenu,
}) => {
  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(6, 8, 14, 0.84)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Game Paused"
    >
      <div className="w-full max-w-sm bg-[#131726] border border-slate-700 p-6 flex flex-col gap-5 shadow-2xl">
        <div className="border-b border-slate-800 pb-3">
          <div className="text-xs font-semibold uppercase tracking-widest text-amber-400">Battle Suspended</div>
          <h2 className="font-display font-extrabold text-4xl uppercase tracking-wide text-white mt-0.5">
            Paused
          </h2>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onResume}
            className="w-full py-3 px-5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-extrabold text-xl uppercase tracking-wider cursor-pointer"
          >
            Resume Battle
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="w-full py-2.5 px-5 bg-[#1B2136] hover:bg-[#232B45] border border-slate-700 text-slate-100 font-semibold text-sm uppercase tracking-wider cursor-pointer"
          >
            Restart Match
          </button>
          <button
            type="button"
            onClick={onSettings}
            className="w-full py-2.5 px-5 bg-[#1B2136] hover:bg-[#232B45] border border-slate-700 text-slate-100 font-semibold text-sm uppercase tracking-wider cursor-pointer"
          >
            Settings
          </button>
          <button
            type="button"
            onClick={onMainMenu}
            className="w-full py-2.5 px-5 bg-[#090B12] hover:bg-slate-900 border border-slate-800 text-slate-300 font-semibold text-sm uppercase tracking-wider cursor-pointer"
          >
            Return to Main Menu
          </button>
        </div>

        <div className="text-xs text-slate-400 text-center">
          Press Esc or P to resume
        </div>
      </div>
    </div>
  );
};
