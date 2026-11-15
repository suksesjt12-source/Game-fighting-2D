import React, { useRef, useState } from 'react';
import { GameSettings } from '../data/SaveManager';
import { TouchButtonAction, TouchInputHandler } from './TouchInputHandler';

interface TouchControlsProps {
  inputHandler: TouchInputHandler;
  settings: GameSettings;
  energy: number;
  cooldowns: {
    ATTACK_1: number;
    ATTACK_2: number;
    SKILL_1: number;
    SKILL_2: number;
    ULTIMATE: number;
  };
  accentColor: string;
}

interface GameButtonProps {
  label: string;
  keyHint: string;
  action: TouchButtonAction;
  inputHandler: TouchInputHandler;
  disabled?: boolean;
  highlightColor?: string;
  sizeClass?: string;
  costLabel?: string;
}

const GameButton: React.FC<GameButtonProps> = ({
  label,
  keyHint,
  action,
  inputHandler,
  disabled = false,
  highlightColor = '#F59E0B',
  sizeClass = 'w-14 h-14',
  costLabel,
}) => {
  const [pressed, setPressed] = useState(false);

  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        setPressed(true);
        inputHandler.pressButton(action);
      }}
      onPointerUp={(e) => {
        e.preventDefault();
        setPressed(false);
        inputHandler.releaseButton(action);
      }}
      onPointerCancel={() => {
        setPressed(false);
        inputHandler.releaseButton(action);
      }}
      style={{
        touchAction: 'none',
        borderColor: pressed ? '#FFFFFF' : disabled ? 'rgba(148,163,184,0.28)' : highlightColor,
        backgroundColor: pressed ? highlightColor : 'rgba(9, 11, 18, 0.72)',
      }}
      className={`${sizeClass} relative rounded-full border-2 flex flex-col items-center justify-center transition-transform duration-75 select-none pointer-events-auto focus-visible:outline-2 focus-visible:outline-amber-400 ${
        pressed ? 'scale-92 text-slate-950' : disabled ? 'opacity-45 text-slate-400' : 'text-slate-100'
      }`}
    >
      <span className="font-display font-bold text-xs tracking-wider leading-none uppercase">{label}</span>
      <span className="font-mono-num text-[10px] opacity-75 leading-none mt-0.5">
        {costLabel ? costLabel : keyHint}
      </span>
    </button>
  );
};

export const TouchControls: React.FC<TouchControlsProps> = ({
  inputHandler,
  settings,
  energy,
  cooldowns,
  accentColor,
}) => {
  const joyBaseRef = useRef<HTMLDivElement | null>(null);
  const activePointerId = useRef<number | null>(null);
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });

  if (!settings.touchControlsEnabled) return null;

  const updateStick = (clientX: number, clientY: number) => {
    const el = joyBaseRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width * 0.5;
    const cy = rect.top + rect.height * 0.5;
    const maxR = rect.width * 0.38;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxR && dist > 0) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }
    setKnobOffset({ x: dx, y: dy });
    inputHandler.setJoystick(dx / maxR, dy / maxR);
  };

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-20 pointer-events-none flex items-end justify-between px-4 sm:px-6"
      style={{
        opacity: settings.controlOpacity,
        paddingBottom: `calc(${settings.controlOffsetY}px + env(safe-area-inset-bottom, 0px))`,
        paddingLeft: 'calc(16px + env(safe-area-inset-left, 0px))',
        paddingRight: 'calc(16px + env(safe-area-inset-right, 0px))',
      }}
    >
      {/* Left Side: Virtual Directional Joystick */}
      <div
        ref={joyBaseRef}
        data-testid="virtual-joystick"
        aria-label="Movement Joystick"
        onPointerDown={(e) => {
          e.preventDefault();
          activePointerId.current = e.pointerId;
          e.currentTarget.setPointerCapture(e.pointerId);
          updateStick(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (activePointerId.current !== e.pointerId) return;
          updateStick(e.clientX, e.clientY);
        }}
        onPointerUp={(e) => {
          if (activePointerId.current !== e.pointerId) return;
          activePointerId.current = null;
          setKnobOffset({ x: 0, y: 0 });
          inputHandler.setJoystick(0, 0);
        }}
        onPointerCancel={() => {
          activePointerId.current = null;
          setKnobOffset({ x: 0, y: 0 });
          inputHandler.setJoystick(0, 0);
        }}
        style={{
          touchAction: 'none',
          transform: `scale(${settings.controlScale})`,
          transformOrigin: 'bottom left',
        }}
        className="w-32 h-32 rounded-full border-2 border-slate-400/40 bg-[#090B12]/65 relative flex items-center justify-center pointer-events-auto"
      >
        <div className="w-20 h-20 rounded-full border border-slate-400/20 pointer-events-none" />
        <div
          style={{
            transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`,
            borderColor: accentColor,
          }}
          className="w-12 h-12 rounded-full bg-slate-800/90 border-2 shadow-lg pointer-events-none absolute"
        />
        <span className="absolute top-1.5 text-[9px] font-mono-num text-slate-400 pointer-events-none">JUMP</span>
        <span className="absolute bottom-1.5 text-[9px] font-mono-num text-slate-400 pointer-events-none">GUARD</span>
      </div>

      {/* Right Side: Landscape Combat Action Cluster */}
      <div
        className="flex flex-col items-end gap-2.5 pointer-events-none"
        style={{
          transform: `scale(${settings.controlScale})`,
          transformOrigin: 'bottom right',
        }}
      >
        <div className="flex items-center gap-2.5">
          <GameButton
            label="Skill 1"
            keyHint="U"
            costLabel="25 EN"
            action="skill1"
            inputHandler={inputHandler}
            disabled={energy < 25 || cooldowns.SKILL_1 > 0}
            highlightColor="#38BDF8"
            sizeClass="w-13 h-13"
          />
          <GameButton
            label="Skill 2"
            keyHint="I"
            costLabel="35 EN"
            action="skill2"
            inputHandler={inputHandler}
            disabled={energy < 35 || cooldowns.SKILL_2 > 0}
            highlightColor="#A855F7"
            sizeClass="w-13 h-13"
          />
          <GameButton
            label="Ult"
            keyHint="O"
            costLabel={energy >= 100 ? 'READY' : '100 EN'}
            action="ultimate"
            inputHandler={inputHandler}
            disabled={energy < 100 || cooldowns.ULTIMATE > 0}
            highlightColor="#F59E0B"
            sizeClass="w-15 h-15"
          />
        </div>
        <div className="flex items-center gap-2.5">
          <GameButton
            label="Guard"
            keyHint="K"
            action="guard"
            inputHandler={inputHandler}
            highlightColor="#94A3B8"
            sizeClass="w-13 h-13"
          />
          <GameButton
            label="Jump"
            keyHint="W"
            action="jump"
            inputHandler={inputHandler}
            highlightColor="#34D399"
            sizeClass="w-13 h-13"
          />
          <GameButton
            label="Heavy"
            keyHint="L"
            action="attack2"
            inputHandler={inputHandler}
            highlightColor="#FB7185"
            sizeClass="w-13 h-13"
          />
          <GameButton
            label="Attack"
            keyHint="J"
            action="attack1"
            inputHandler={inputHandler}
            highlightColor={accentColor}
            sizeClass="w-16 h-16"
          />
        </div>
      </div>
    </div>
  );
};
