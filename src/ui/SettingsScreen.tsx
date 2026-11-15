import React, { useState } from 'react';
import { GameSettings, GraphicsPreset } from '../data/SaveManager';

interface SettingsScreenProps {
  settings: GameSettings;
  onUpdate: (next: GameSettings) => void;
  onResetProgress: () => void;
  onBack: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  onUpdate,
  onResetProgress,
  onBack,
}) => {
  const [confirmReset, setConfirmReset] = useState(false);

  const patch = (partial: Partial<GameSettings>) => {
    onUpdate({ ...settings, ...partial });
  };

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
              Settings
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">Audio, graphics quality, and touchscreen control layout</p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pt-5">
        <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Audio Settings */}
          <section className="bg-[#131726] border border-slate-800 p-5 flex flex-col gap-4">
            <h2 className="font-display font-bold text-xl uppercase tracking-wide text-amber-400">
              Audio
            </h2>

            <label className="flex flex-col gap-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-200">Music Volume</span>
                <span className="font-mono-num text-xs text-slate-400 tabular-nums">
                  {Math.round(settings.musicVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.musicVolume}
                onChange={(e) => patch({ musicVolume: parseFloat(e.target.value) })}
                className="accent-amber-500 cursor-pointer"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-200">SFX Volume</span>
                <span className="font-mono-num text-xs text-slate-400 tabular-nums">
                  {Math.round(settings.sfxVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.sfxVolume}
                onChange={(e) => patch({ sfxVolume: parseFloat(e.target.value) })}
                className="accent-amber-500 cursor-pointer"
              />
            </label>

            <div className="flex items-center justify-between pt-1">
              <span className="text-sm text-slate-200">Mute All Audio</span>
              <button
                type="button"
                onClick={() => patch({ muted: !settings.muted })}
                className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider border cursor-pointer ${
                  settings.muted
                    ? 'bg-rose-500/20 border-rose-400 text-rose-300'
                    : 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                }`}
              >
                {settings.muted ? 'Muted' : 'Active'}
              </button>
            </div>
          </section>

          {/* Graphics & Performance */}
          <section className="bg-[#131726] border border-slate-800 p-5 flex flex-col gap-4">
            <h2 className="font-display font-bold text-xl uppercase tracking-wide text-cyan-400">
              Graphics & HUD
            </h2>

            <div className="flex flex-col gap-2">
              <span className="text-sm text-slate-200">Quality Preset</span>
              <div className="grid grid-cols-3 gap-2">
                {(['LOW', 'MEDIUM', 'HIGH'] as GraphicsPreset[]).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => patch({ graphicsPreset: preset })}
                    className={`py-2 text-xs font-bold uppercase tracking-wider border cursor-pointer ${
                      settings.graphicsPreset === preset
                        ? 'bg-cyan-500 text-slate-950 border-cyan-300'
                        : 'bg-[#090B12] text-slate-300 border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-sm text-slate-200">Floating Damage Numbers</span>
              <button
                type="button"
                onClick={() => patch({ showDamageNumbers: !settings.showDamageNumbers })}
                className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider border cursor-pointer ${
                  settings.showDamageNumbers
                    ? 'bg-cyan-500 text-slate-950 border-cyan-300'
                    : 'bg-[#090B12] text-slate-400 border-slate-700'
                }`}
              >
                {settings.showDamageNumbers ? 'Shown' : 'Hidden'}
              </button>
            </div>
          </section>

          {/* Touchscreen Control Customization */}
          <section className="bg-[#131726] border border-slate-800 p-5 flex flex-col gap-4 md:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-xl uppercase tracking-wide text-violet-400">
                Touchscreen Controls
              </h2>
              <button
                type="button"
                onClick={() => patch({ touchControlsEnabled: !settings.touchControlsEnabled })}
                className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider border cursor-pointer ${
                  settings.touchControlsEnabled
                    ? 'bg-violet-500 text-white border-violet-300'
                    : 'bg-[#090B12] text-slate-400 border-slate-700'
                }`}
              >
                {settings.touchControlsEnabled ? 'On-Screen Enabled' : 'Hidden (Keyboard)'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <label className="flex flex-col gap-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-200">Opacity</span>
                  <span className="font-mono-num text-xs text-slate-400 tabular-nums">
                    {Math.round(settings.controlOpacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.35}
                  max={1}
                  step={0.05}
                  value={settings.controlOpacity}
                  onChange={(e) => patch({ controlOpacity: parseFloat(e.target.value) })}
                  className="accent-violet-400 cursor-pointer"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-200">Button Scale</span>
                  <span className="font-mono-num text-xs text-slate-400 tabular-nums">
                    {Math.round(settings.controlScale * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.8}
                  max={1.25}
                  step={0.05}
                  value={settings.controlScale}
                  onChange={(e) => patch({ controlScale: parseFloat(e.target.value) })}
                  className="accent-violet-400 cursor-pointer"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-200">Bottom Offset</span>
                  <span className="font-mono-num text-xs text-slate-400 tabular-nums">
                    {settings.controlOffsetY}px
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={48}
                  step={4}
                  value={settings.controlOffsetY}
                  onChange={(e) => patch({ controlOffsetY: parseInt(e.target.value, 10) })}
                  className="accent-violet-400 cursor-pointer"
                />
              </label>
            </div>
          </section>

          {/* Local Save Data Reset */}
          <section className="bg-[#131726] border border-slate-800 p-5 flex items-center justify-between gap-4 md:col-span-2">
            <div>
              <div className="text-sm font-semibold text-white">Local Save Data</div>
              <div className="text-xs text-slate-400">
                Clears player level, XP, match stats, and character unlocks stored locally on this device.
              </div>
            </div>
            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-[#090B12] border border-rose-500/60 text-rose-300 hover:bg-rose-500/10 cursor-pointer whitespace-nowrap"
              >
                Reset Progress
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onResetProgress();
                    setConfirmReset(false);
                  }}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-rose-600 text-white cursor-pointer whitespace-nowrap"
                >
                  Confirm Reset
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="px-3 py-2 text-xs font-semibold uppercase bg-slate-800 text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
