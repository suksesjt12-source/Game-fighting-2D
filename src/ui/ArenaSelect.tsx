import React, { useState } from 'react';
import { ARENAS, ARENA_ORDER, ArenaId } from '../arena/ArenaData';
import { ARENA_IMAGES } from '../data/assets';

interface ArenaSelectProps {
  initialArena: ArenaId;
  onConfirm: (arenaId: ArenaId) => void;
  onBack: () => void;
}

export const ArenaSelect: React.FC<ArenaSelectProps> = ({ initialArena, onConfirm, onBack }) => {
  const [selected, setSelected] = useState<ArenaId>(initialArena);
  const active = ARENAS[selected];

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
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl tracking-wide uppercase leading-none">
              Select Arena
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">Choose battleground stage</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onConfirm(selected)}
          className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-extrabold text-xl uppercase tracking-wider transition-colors cursor-pointer"
        >
          Enter Arena
        </button>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-5 pt-4">
        <div className="lg:col-span-7 grid grid-cols-2 gap-3.5">
          {ARENA_ORDER.map((id) => {
            const arena = ARENAS[id];
            const isSelected = selected === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSelected(id)}
                className={`relative overflow-hidden border text-left bg-[#131726] transition-all cursor-pointer group ${
                  isSelected ? 'border-amber-400 ring-1 ring-amber-400/70' : 'border-slate-800 hover:border-slate-600'
                }`}
              >
                <img
                  src={ARENA_IMAGES[id]}
                  alt={arena.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#090B12] via-[#090B12]/35 to-transparent" />
                <div className="absolute bottom-3 left-3.5 right-3.5">
                  <div className="font-display font-extrabold text-xl uppercase tracking-wide text-white leading-none">
                    {arena.name}
                  </div>
                  <div className="text-xs text-slate-300 mt-0.5">{arena.subtitle}</div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="lg:col-span-5 bg-[#131726] border border-slate-800/90 p-5 flex flex-col justify-between gap-4">
          <div className="flex flex-col gap-4">
            <div className="aspect-video w-full overflow-hidden border border-slate-700/80">
              <img
                src={ARENA_IMAGES[selected]}
                alt={active.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-amber-400">
                {active.subtitle}
              </div>
              <h2 className="font-display font-extrabold text-3xl uppercase text-white mt-0.5">
                {active.name}
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed mt-2">{active.description}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onConfirm(selected)}
            className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-extrabold text-2xl uppercase tracking-wider transition-colors cursor-pointer"
          >
            Start Battle
          </button>
        </div>
      </div>
    </div>
  );
};
