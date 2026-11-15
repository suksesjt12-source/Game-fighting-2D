/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AIDifficulty } from './ai/DifficultyConfig';
import { ArenaId } from './arena/ArenaData';
import { audioManager, SfxEvent } from './audio/AudioManager';
import { CharacterId } from './characters/CharacterData';
import { getBakedSpriteSheet } from './characters/SpriteSheetBaker';
import { TouchControls } from './controls/TouchControls';
import { TouchInputHandler } from './controls/TouchInputHandler';
import {
  applyMatchRewards,
  GameSettings,
  PlayerProgress,
  SaveManager,
} from './data/SaveManager';
import { GameEngine, HudSnapshot, MatchSummary } from './game/GameEngine';
import { GameRenderer } from './game/GameRenderer';
import { GameMode, GameState, mapGameStateToBodyShellState } from './game/GameState';
import { ArenaSelect } from './ui/ArenaSelect';
import { BattleHUD } from './ui/BattleHUD';
import { CharacterSelect } from './ui/CharacterSelect';
import { CollectionScreen } from './ui/CollectionScreen';
import { MainMenu } from './ui/MainMenu';
import { MatchResultModal } from './ui/MatchResultModal';
import { PauseModal } from './ui/PauseModal';
import { SettingsScreen } from './ui/SettingsScreen';

interface RewardReport {
  xpEarned: number;
  leveledUp: boolean;
  newLevel: number;
  newlyUnlocked: CharacterId[];
}

export default function App() {
  const [progress, setProgress] = useState<PlayerProgress>(() => SaveManager.loadProgress());
  const [settings, setSettings] = useState<GameSettings>(() => SaveManager.loadSettings());
  const [uiState, setUiState] = useState<GameState>('MAIN_MENU');
  const [pendingMode, setPendingMode] = useState<GameMode>('VERSUS');
  const [selectedP1, setSelectedP1] = useState<CharacterId>('kairo');
  const [selectedP2, setSelectedP2] = useState<CharacterId>('reina');
  const [selectedArena, setSelectedArena] = useState<ArenaId>('moon_temple');
  const [selectedDifficulty, setSelectedDifficulty] = useState<AIDifficulty>('NORMAL');
  const [settingsReturnTo, setSettingsReturnTo] = useState<'MAIN_MENU' | 'PAUSED'>('MAIN_MENU');
  const [rewardReport, setRewardReport] = useState<RewardReport>({
    xpEarned: 0,
    leveledUp: false,
    newLevel: 1,
    newlyUnlocked: [],
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const rendererRef = useRef<GameRenderer | null>(null);
  const inputRef = useRef<TouchInputHandler>(new TouchInputHandler());
  const settingsRef = useRef<GameSettings>(settings);
  const progressRef = useRef<PlayerProgress>(progress);

  if (!engineRef.current) {
    engineRef.current = new GameEngine();
  }
  if (!rendererRef.current) {
    rendererRef.current = new GameRenderer();
  }

  const [hud, setHud] = useState<HudSnapshot>(() => engineRef.current!.getHudSnapshot());

  // Keep refs synced for 60fps loop
  useEffect(() => {
    settingsRef.current = settings;
    SaveManager.saveSettings(settings);
    audioManager.configure(settings.musicVolume, settings.sfxVolume, settings.muted);
    if (engineRef.current) {
      engineRef.current.showDamageNumbers = settings.showDamageNumbers;
      engineRef.current.particleDensity =
        settings.graphicsPreset === 'LOW' ? 0.45 : settings.graphicsPreset === 'MEDIUM' ? 0.75 : 1.0;
    }
  }, [settings]);

  useEffect(() => {
    progressRef.current = progress;
    SaveManager.saveProgress(progress);
  }, [progress]);

  // Sync body dataset attributes & music track with GameState
  useEffect(() => {
    document.body.dataset.state = mapGameStateToBodyShellState(uiState);
    document.body.dataset.gameState = uiState;

    const inBattle =
      uiState === 'COUNTDOWN' ||
      uiState === 'FIGHTING' ||
      uiState === 'ROUND_RESULT' ||
      uiState === 'TRAINING';
    if (inBattle) {
      audioManager.startMusic('battle');
    } else if (uiState === 'PAUSED') {
      audioManager.stopMusic();
    } else {
      audioManager.startMusic('menu');
    }
  }, [uiState]);

  const syncHudSnapshot = useCallback(() => {
    if (engineRef.current) {
      setHud(engineRef.current.getHudSnapshot());
    }
  }, []);

  // Wire Engine callbacks
  useEffect(() => {
    const engine = engineRef.current!;
    engine.setCallbacks({
      onStateChange: (next) => {
        setUiState(next);
        setHud(engine.getHudSnapshot());
      },
      onSfx: (ev: SfxEvent) => {
        audioManager.playSfx(ev);
      },
      onMatchFinish: (summary: MatchSummary) => {
        const applied = applyMatchRewards(progressRef.current, {
          won: summary.playerWon,
          isArcadeClear: summary.isArcadeClear,
          maxCombo: summary.maxCombo,
        });
        progressRef.current = applied.next;
        setProgress(applied.next);
        setRewardReport({
          xpEarned: applied.xpEarned,
          leveledUp: applied.leveledUp,
          newLevel: applied.next.level,
          newlyUnlocked: applied.newlyUnlocked,
        });
      },
    });
  }, []);

  // Pre-bake sprite sheets & handle ?autostart=1
  useEffect(() => {
    // Bake starter fighters immediately, defer others slightly
    getBakedSpriteSheet('kairo');
    getBakedSpriteSheet('reina');

    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      const engine = engineRef.current!;
      engine.startVersus('kairo', 'reina', 'moon_temple', 'NORMAL');
      setUiState(engine.state);
      syncHudSnapshot();
    }
  }, [syncHudSnapshot]);

  // Start Handlers
  const launchQuickVersus = useCallback(() => {
    audioManager.unlock();
    audioManager.playSfx('click');
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    inputRef.current.clearAll();
    const engine = engineRef.current!;
    engine.startVersus(selectedP1, selectedP2, selectedArena, selectedDifficulty);
    setUiState(engine.state);
    syncHudSnapshot();
  }, [selectedP1, selectedP2, selectedArena, selectedDifficulty, syncHudSnapshot]);

  // Global keyboard & focus hygiene listeners
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      audioManager.unlock();
      const engine = engineRef.current!;

      if (engine.state === 'MAIN_MENU' && (e.code === 'Enter' || e.code === 'Space')) {
        e.preventDefault();
        launchQuickVersus();
        return;
      }

      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (engine.state === 'FIGHTING' || engine.state === 'COUNTDOWN' || engine.state === 'TRAINING') {
          e.preventDefault();
          inputRef.current.clearAll();
          engine.pause();
          return;
        }
        if (engine.state === 'PAUSED') {
          e.preventDefault();
          inputRef.current.clearAll();
          engine.resume();
          return;
        }
      }

      if (
        engine.state === 'FIGHTING' ||
        engine.state === 'TRAINING' ||
        engine.state === 'COUNTDOWN'
      ) {
        if (
          e.code === 'Space' ||
          e.code === 'ArrowUp' ||
          e.code === 'ArrowDown' ||
          e.code === 'ArrowLeft' ||
          e.code === 'ArrowRight'
        ) {
          e.preventDefault();
        }
        inputRef.current.onKeyDown(e.code);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      inputRef.current.onKeyUp(e.code);
    };

    const onBlur = () => {
      inputRef.current.clearAll();
    };

    const onVis = () => {
      if (document.hidden) inputRef.current.clearAll();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [launchQuickVersus]);

  const isSimulating =
    uiState === 'COUNTDOWN' ||
    uiState === 'FIGHTING' ||
    uiState === 'ROUND_RESULT' ||
    uiState === 'MATCH_RESULT' ||
    uiState === 'TRAINING';

  // Isolated 60fps Game Loop & Canvas ResizeObserver
  useEffect(() => {
    const canvas = canvasRef.current;
    const engine = engineRef.current!;
    const renderer = rendererRef.current!;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let cssW = canvas.clientWidth || window.innerWidth;
    let cssH = canvas.clientHeight || window.innerHeight;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      cssW = Math.max(320, rect.width || window.innerWidth);
      cssH = Math.max(200, rect.height || window.innerHeight);
      const preset = settingsRef.current.graphicsPreset;
      const maxDpr = preset === 'LOW' ? 1 : preset === 'MEDIUM' ? 1.25 : Math.min(1.5, window.devicePixelRatio || 1);
      canvas.width = Math.round(cssW * maxDpr);
      canvas.height = Math.round(cssH * maxDpr);
      ctx.setTransform(maxDpr, 0, 0, maxDpr, 0, 0);
      if (!isSimulating && engine.state === 'PAUSED') {
        renderer.render(ctx, cssW, cssH, engine, settingsRef.current.graphicsPreset);
      }
    };

    resizeCanvas();
    const ro = new ResizeObserver(resizeCanvas);
    ro.observe(canvas);

    if (!isSimulating) {
      if (engine.state === 'PAUSED') {
        renderer.render(ctx, cssW, cssH, engine, settingsRef.current.graphicsPreset);
      }
      return () => {
        ro.disconnect();
      };
    }

    let rafId = 0;
    let timerId = 0;
    let disposed = false;
    let lastTime = performance.now();
    let hudSyncAccum = 0;
    let lastHudSignature = '';

    const scheduleNext = (renderMs: number) => {
      if (disposed) return;
      if (renderMs > 12) {
        timerId = window.setTimeout(() => {
          if (!disposed) rafId = requestAnimationFrame(frame);
        }, 16);
      } else {
        rafId = requestAnimationFrame(frame);
      }
    };

    const frame = (now: number) => {
      const t0 = performance.now();
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(Math.max(rawDt, 0), 0.05);

      const p1Input = inputRef.current.consumeFrameInput();
      engine.step(dt, p1Input);
      renderer.update(dt, engine);
      renderer.render(ctx, cssW, cssH, engine, settingsRef.current.graphicsPreset);

      hudSyncAccum += dt;
      if (hudSyncAccum >= 0.045) {
        hudSyncAccum = 0;
        const sig = `${engine.state}|${Math.round(engine.p1.hp)}|${Math.round(engine.p1.trailHp)}|${Math.floor(engine.p1.energy)}|${engine.p1.comboCount}|${Math.round(engine.p2.hp)}|${Math.round(engine.p2.trailHp)}|${Math.floor(engine.p2.energy)}|${engine.p2.comboCount}|${Math.ceil(engine.roundTimer)}|${engine.countdownBanner}|${engine.lastHitDamage}`;
        if (sig !== lastHudSignature) {
          lastHudSignature = sig;
          setHud(engine.getHudSnapshot());
        }
      }

      const renderMs = performance.now() - t0;
      scheduleNext(renderMs);
    };

    rafId = requestAnimationFrame(frame);
    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      clearTimeout(timerId);
      ro.disconnect();
    };
  }, [isSimulating]);

  const isBattleScreen =
    uiState === 'COUNTDOWN' ||
    uiState === 'FIGHTING' ||
    uiState === 'ROUND_RESULT' ||
    uiState === 'MATCH_RESULT' ||
    uiState === 'TRAINING' ||
    uiState === 'PAUSED';

  const activePlayerDef = engineRef.current!.p1.def;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#090B12]">
      {/* Isolated Battle Canvas Viewport */}
      <canvas
        ref={canvasRef}
        data-testid="battle-canvas"
        className={`absolute inset-0 w-full h-full block ${isBattleScreen ? 'visible' : 'invisible pointer-events-none'}`}
      />

      {/* Active Battle HUD & Multi-Touch Landscape Controls */}
      {isBattleScreen && (
        <>
          <BattleHUD
            hud={hud}
            muted={settings.muted}
            onToggleMute={() => setSettings((s) => ({ ...s, muted: !s.muted }))}
            onPause={() => {
              audioManager.playSfx('click');
              engineRef.current!.pause();
            }}
            onToggleUnlimitedHp={() => {
              audioManager.playSfx('click');
              engineRef.current!.trainingUnlimitedHp = !engineRef.current!.trainingUnlimitedHp;
              syncHudSnapshot();
            }}
            onResetTraining={() => {
              audioManager.playSfx('click');
              engineRef.current!.resetTrainingPositions();
              syncHudSnapshot();
            }}
          />

          {(uiState === 'FIGHTING' || uiState === 'TRAINING') && (
            <TouchControls
              inputHandler={inputRef.current}
              settings={settings}
              energy={hud.p1.energy}
              cooldowns={hud.p1.cooldowns}
              accentColor={activePlayerDef.palette.accent}
            />
          )}
        </>
      )}

      {/* Main Menu */}
      {uiState === 'MAIN_MENU' && (
        <MainMenu
          progress={progress}
          onPlayVersus={launchQuickVersus}
          onArcadeMode={() => {
            audioManager.unlock();
            audioManager.playSfx('click');
            setPendingMode('ARCADE');
            engineRef.current!.setState('CHARACTER_SELECT');
          }}
          onTrainingMode={() => {
            audioManager.unlock();
            audioManager.playSfx('click');
            setPendingMode('TRAINING');
            engineRef.current!.setState('CHARACTER_SELECT');
          }}
          onCharacterSelect={() => {
            audioManager.unlock();
            audioManager.playSfx('click');
            setPendingMode('VERSUS');
            engineRef.current!.setState('CHARACTER_SELECT');
          }}
          onCollection={() => {
            audioManager.unlock();
            audioManager.playSfx('click');
            engineRef.current!.setState('COLLECTION');
          }}
          onSettings={() => {
            audioManager.unlock();
            audioManager.playSfx('click');
            setSettingsReturnTo('MAIN_MENU');
            engineRef.current!.setState('SETTINGS');
          }}
        />
      )}

      {/* Character Select */}
      {uiState === 'CHARACTER_SELECT' && (
        <CharacterSelect
          mode={pendingMode}
          initialP1={selectedP1}
          initialP2={selectedP2}
          initialDifficulty={selectedDifficulty}
          progress={progress}
          onConfirm={(p1, p2, diff) => {
            audioManager.playSfx('click');
            setSelectedP1(p1);
            setSelectedP2(p2);
            setSelectedDifficulty(diff);
            getBakedSpriteSheet(p1);
            getBakedSpriteSheet(p2);
            if (pendingMode === 'ARCADE') {
              inputRef.current.clearAll();
              engineRef.current!.startArcade(p1);
              syncHudSnapshot();
            } else {
              engineRef.current!.setState('ARENA_SELECT');
            }
          }}
          onBack={() => {
            audioManager.playSfx('click');
            engineRef.current!.setState('MAIN_MENU');
          }}
        />
      )}

      {/* Arena Select */}
      {uiState === 'ARENA_SELECT' && (
        <ArenaSelect
          initialArena={selectedArena}
          onConfirm={(arenaId) => {
            audioManager.playSfx('click');
            setSelectedArena(arenaId);
            inputRef.current.clearAll();
            if (pendingMode === 'TRAINING') {
              engineRef.current!.startTraining(selectedP1, selectedP2, arenaId);
            } else {
              engineRef.current!.startVersus(selectedP1, selectedP2, arenaId, selectedDifficulty);
            }
            syncHudSnapshot();
          }}
          onBack={() => {
            audioManager.playSfx('click');
            engineRef.current!.setState('CHARACTER_SELECT');
          }}
        />
      )}

      {/* Collection */}
      {uiState === 'COLLECTION' && (
        <CollectionScreen
          progress={progress}
          onBack={() => {
            audioManager.playSfx('click');
            engineRef.current!.setState('MAIN_MENU');
          }}
        />
      )}

      {/* Settings */}
      {uiState === 'SETTINGS' && (
        <SettingsScreen
          settings={settings}
          onUpdate={(next) => setSettings(next)}
          onResetProgress={() => {
            audioManager.playSfx('click');
            const fresh = SaveManager.resetProgress();
            setProgress(fresh);
          }}
          onBack={() => {
            audioManager.playSfx('click');
            engineRef.current!.setState(settingsReturnTo);
          }}
        />
      )}

      {/* Pause Modal */}
      {uiState === 'PAUSED' && (
        <PauseModal
          onResume={() => {
            audioManager.playSfx('click');
            inputRef.current.clearAll();
            engineRef.current!.resume();
          }}
          onRestart={() => {
            audioManager.playSfx('click');
            inputRef.current.clearAll();
            engineRef.current!.restartCurrentMatch();
            syncHudSnapshot();
          }}
          onSettings={() => {
            audioManager.playSfx('click');
            setSettingsReturnTo('PAUSED');
            engineRef.current!.setState('SETTINGS');
          }}
          onMainMenu={() => {
            audioManager.playSfx('click');
            inputRef.current.clearAll();
            engineRef.current!.setState('MAIN_MENU');
          }}
        />
      )}

      {/* Match Result Modal */}
      {uiState === 'MATCH_RESULT' && hud.matchSummary && (
        <MatchResultModal
          summary={hud.matchSummary}
          xpEarned={rewardReport.xpEarned}
          leveledUp={rewardReport.leveledUp}
          newLevel={rewardReport.newLevel}
          newlyUnlocked={rewardReport.newlyUnlocked}
          onNextArcadeStage={() => {
            audioManager.playSfx('click');
            inputRef.current.clearAll();
            engineRef.current!.advanceArcadeStage();
            syncHudSnapshot();
          }}
          onPlayAgain={() => {
            audioManager.playSfx('click');
            inputRef.current.clearAll();
            engineRef.current!.restartCurrentMatch();
            syncHudSnapshot();
          }}
          onMainMenu={() => {
            audioManager.playSfx('click');
            inputRef.current.clearAll();
            engineRef.current!.setState('MAIN_MENU');
          }}
        />
      )}
    </div>
  );
}

