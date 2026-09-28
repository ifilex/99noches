import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from '../game/engine';
import { ITEM_DEFINITIONS } from '../game/constants';

interface VirtualNESControllerProps {
  engine: GameEngine;
  onOpenCrafting: () => void;
  onOpenMap: () => void;
  onTogglePause: () => void;
}

export const VirtualNESController: React.FC<VirtualNESControllerProps> = ({
  engine,
  onOpenCrafting,
  onOpenMap,
  onTogglePause,
}) => {
  const [activeDpad, setActiveDpad] = useState<{ x: number; y: number } | null>(null);
  const [showVirtualControls, setShowVirtualControls] = useState(true);
  const stickBaseRef = useRef<HTMLDivElement | null>(null);
  const stickTouchIdRef = useRef<number | null>(null);

  // Auto-detect touch capability
  useEffect(() => {
    const hasTouch =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia('(pointer: coarse)').matches;
    // Keep virtual controls visible by default on mobile/touch, but toggleable anytime
    setShowVirtualControls(hasTouch || window.innerWidth < 1024);
  }, []);

  // Keyboard Event Listeners
  useEffect(() => {
    const keysPressed: Record<string, boolean> = {};

    const updateMovement = () => {
      let vx = 0;
      let vy = 0;
      if (keysPressed['KeyW'] || keysPressed['ArrowUp']) vy -= 1;
      if (keysPressed['KeyS'] || keysPressed['ArrowDown']) vy += 1;
      if (keysPressed['KeyA'] || keysPressed['ArrowLeft']) vx -= 1;
      if (keysPressed['KeyD'] || keysPressed['ArrowRight']) vx += 1;

      if (vx !== 0 && vy !== 0) {
        vx *= 0.7071;
        vy *= 0.7071;
      }

      engine.state.player.vx = vx;
      engine.state.player.vy = vy;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }

      keysPressed[e.code] = true;

      // 1. DIALOGUE SYSTEM PRIORITY:
      if (engine.state.dialogueBox.active) {
        if (engine.state.dialogueBox.choices && engine.state.dialogueBox.choices.length > 0) {
          if (e.code === 'KeyW' || e.code === 'ArrowUp') {
            e.preventDefault();
            engine.selectPrevDialogueChoice();
            return;
          }
          if (e.code === 'KeyS' || e.code === 'ArrowDown') {
            e.preventDefault();
            engine.selectNextDialogueChoice();
            return;
          }
          if (e.code === 'KeyJ' || e.code === 'KeyZ' || e.code === 'Space' || e.code === 'Enter') {
            e.preventDefault();
            engine.confirmDialogueChoice();
            return;
          }
        } else {
          // Monologue or description
          if (e.code === 'KeyJ' || e.code === 'KeyZ' || e.code === 'Space' || e.code === 'Enter') {
            e.preventDefault();
            engine.advanceDialogue();
            return;
          }
        }
      }

      updateMovement();

      // Action A: J, Z, Space, Enter
      if (e.code === 'KeyJ' || e.code === 'KeyZ' || e.code === 'Space' || e.code === 'Enter') {
        engine.performActionA();
      }

      // Action B: K, X, KeyE
      if (e.code === 'KeyK' || e.code === 'KeyX' || e.code === 'KeyE') {
        engine.performActionB();
      }

      // SELECT: Tab, KeyM
      if (e.code === 'Tab' || e.code === 'KeyM') {
        e.preventDefault();
        onOpenMap();
      }

      // CRAFTING: KeyC, KeyI
      if (e.code === 'KeyC' || e.code === 'KeyI') {
        e.preventDefault();
        onOpenCrafting();
      }

      // PAUSE / MENU: Escape
      if (e.code === 'Escape') {
        e.preventDefault();
        onTogglePause();
      }

      // Hotbar 1-6
      if (['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6'].includes(e.code)) {
        const slotIdx = parseInt(e.key) - 1;
        if (slotIdx < engine.state.player.inventory.length) {
          engine.state.player.selectedSlotIndex = slotIdx;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed[e.code] = false;
      updateMovement();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [engine, onOpenCrafting, onOpenMap, onTogglePause]);

  // Touch Handlers for Virtual NES D-Pad
  const handleStickStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.changedTouches[0];
    stickTouchIdRef.current = touch.identifier;
    handleStickProcess(touch.clientX, touch.clientY);
  };

  const handleStickMove = (e: React.TouchEvent<HTMLDivElement>) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === stickTouchIdRef.current) {
        handleStickProcess(touch.clientX, touch.clientY);
        break;
      }
    }
  };

  const handleStickProcess = (clientX: number, clientY: number) => {
    if (!stickBaseRef.current) return;
    const rect = stickBaseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);
    const maxRadius = rect.width / 2.2;

    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);

    const knobX = Math.cos(angle) * clampedDist;
    const knobY = Math.sin(angle) * clampedDist;
    setActiveDpad({ x: knobX, y: knobY });

    // Threshold deadzone
    if (dist > 10) {
      engine.state.player.vx = (dx / dist) * (clampedDist / maxRadius);
      engine.state.player.vy = (dy / dist) * (clampedDist / maxRadius);
    } else {
      engine.state.player.vx = 0;
      engine.state.player.vy = 0;
    }
  };

  const handleStickEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === stickTouchIdRef.current) {
        stickTouchIdRef.current = null;
        setActiveDpad(null);
        engine.state.player.vx = 0;
        engine.state.player.vy = 0;
        break;
      }
    }
  };

  const p = engine.state.player;
  const activeItem = engine.getActiveItem();
  const activeDef = activeItem ? ITEM_DEFINITIONS[activeItem.item] : null;

  // Heart calculation (Zelda 1 style: 20 HP per heart container)
  const totalHearts = Math.ceil(p.stats.maxHp / 20);
  const currentHeartValue = p.stats.hp / 20;

  // Campfire status
  const campfire = engine.getCampfire();
  const fuelPct = campfire ? Math.max(0, ((campfire.fuel || 0) / (campfire.maxFuel || 100)) * 100) : 0;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between select-none font-mono z-20 overflow-hidden">
      {/* ========================================================================= */}
      {/* 1. TOP 1985 NES ZELDA 1 STYLE HUD (CLEAN, SHARP, HIGH-CONTRAST TYPOGRAPHY) */}
      {/* ========================================================================= */}
      <header className="w-full bg-black/95 border-b-2 sm:border-b-4 border-white p-2 sm:p-2.5 pointer-events-auto shadow-2xl backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-white">
          
          {/* Section A: NES Mini-Radar & Day/Night Info */}
          <div className="flex items-center gap-2.5">
            <div className="w-14 h-11 sm:w-16 sm:h-12 bg-[#001800] border-2 border-white relative flex items-center justify-center overflow-hidden shrink-0 shadow">
              {/* Player beacon */}
              <div
                className="w-2.5 h-2.5 bg-[#58d854] absolute transform -translate-x-1/2 -translate-y-1/2 animate-ping"
                style={{
                  left: `${Math.max(10, Math.min(90, (p.x / engine.state.worldWidth) * 100))}%`,
                  top: `${Math.max(10, Math.min(90, (p.y / engine.state.worldHeight) * 100))}%`,
                }}
              />
              <div
                className="w-2.5 h-2.5 bg-[#fce000] absolute transform -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${Math.max(10, Math.min(90, (p.x / engine.state.worldWidth) * 100))}%`,
                  top: `${Math.max(10, Math.min(90, (p.y / engine.state.worldHeight) * 100))}%`,
                }}
              />
              {/* Central Campfire icon */}
              <div className="w-2 h-2 bg-[#d82800] absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
              <span className="absolute bottom-0 left-0.5 text-[8px] font-bold text-zinc-400">MAP</span>
            </div>

            {/* 99 Nights Info & Clock */}
            <div className="text-left space-y-0.5">
              <div className="text-sm sm:text-base font-black text-[#fce000] tracking-wider leading-none">
                NOCHE {String(engine.state.currentNight).padStart(2, '0')} / 99
              </div>
              <div className="text-xs sm:text-sm text-zinc-200 flex items-center gap-2 font-bold">
                <span>{engine.state.isNight ? '🌙 NOCHE' : engine.state.isSunset ? '🌅 OCASO' : '☀️ DÍA'}</span>
                <span>•</span>
                <span className="text-[#fce000]">🪙 x{p.stats.gold}</span>
              </div>
            </div>
          </div>

          {/* Section B: NES 6-Slot Hotbar */}
          <div className="flex items-center gap-1 bg-[#101010] border-2 border-[#585858] p-1 rounded">
            <span className="text-xs font-bold text-zinc-300 px-1 hidden md:inline">ITEM:</span>
            {Array.from({ length: 6 }).map((_, idx) => {
              const slot = p.inventory[idx];
              const def = slot ? ITEM_DEFINITIONS[slot.item] : null;
              const isSelected = p.selectedSlotIndex === idx;

              return (
                <button
                  key={idx}
                  id={`nes-hotbar-slot-${idx}`}
                  onClick={() => {
                    if (idx < p.inventory.length) {
                      p.selectedSlotIndex = idx;
                    }
                  }}
                  className={`w-9 h-9 sm:w-11 sm:h-11 flex flex-col items-center justify-center border-2 relative transition-all ${
                    isSelected
                      ? 'border-[#fce000] bg-[#383838] shadow-[0_0_10px_#fce000]'
                      : 'border-[#404040] bg-[#000000] hover:border-[#a4a4a4]'
                  }`}
                >
                  <span className="text-base sm:text-lg leading-none">{def?.iconPixel || '—'}</span>
                  {slot && (
                    <span className="absolute bottom-0 right-0.5 text-[10px] font-black text-white bg-black/90 px-1 rounded-xs">
                      {slot.count}
                    </span>
                  )}
                  <span className="absolute top-0 left-0.5 text-[9px] font-bold text-zinc-400">
                    {idx + 1}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Section C: Zelda 1 [ B ] & [ A ] Action Status Boxes */}
          <div className="flex items-center gap-2">
            {/* Box B: Action/Roll/Food */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-zinc-300 font-bold">B (K/X)</span>
              <div className="w-9 h-9 sm:w-11 sm:h-11 bg-black border-2 border-[#d82800] flex flex-col items-center justify-center p-0.5">
                <span className="text-xs sm:text-sm">
                  {activeDef?.category === 'food'
                    ? '🍖'
                    : activeDef?.fuelValue
                    ? '🪵'
                    : activeDef?.category === 'weapon' && activeDef.ammoRequired
                    ? '🏹'
                    : '🛡️'}
                </span>
                <span className="text-[8px] sm:text-[9px] text-[#d82800] uppercase font-black leading-none">
                  {activeDef?.category === 'food' ? 'COMER' : activeDef?.fuelValue ? 'FUEGO' : 'ESQUIVE'}
                </span>
              </div>
            </div>

            {/* Box A: Sword/Attack */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-[#fce000] font-bold">A (J/Z)</span>
              <div className="w-9 h-9 sm:w-11 sm:h-11 bg-black border-2 border-[#fce000] flex flex-col items-center justify-center p-0.5">
                <span className="text-xs sm:text-sm">
                  {activeDef?.category === 'weapon' ? activeDef.iconPixel : '🗡️'}
                </span>
                <span className="text-[8px] sm:text-[9px] text-[#fce000] uppercase font-black leading-none">
                  {activeDef?.category === 'weapon' ? 'ATK' : 'ACCIÓN'}
                </span>
              </div>
            </div>
          </div>

          {/* Section D: Zelda - LIFE - Hearts & Warmth Gauge */}
          <div className="flex flex-col items-end gap-0.5">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[#d82800] font-black tracking-tight">-VIDA-</span>
              <div className="flex gap-0.5">
                {Array.from({ length: totalHearts }).map((_, idx) => {
                  const val = currentHeartValue - idx;
                  const isFull = val >= 1;
                  const isHalf = val >= 0.5 && val < 1;

                  return (
                    <span
                      key={idx}
                      className={`text-sm sm:text-base leading-none font-bold ${
                        isFull
                          ? 'text-[#d82800]'
                          : isHalf
                          ? 'text-[#fc7400]'
                          : 'text-[#440000]'
                      }`}
                    >
                      ♥
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Warmth & Campfire status */}
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="text-[#fc7400]">
                🔥 CALOR: {Math.ceil(p.stats.warmth)}%
              </span>
              {campfire && (
                <span className="text-zinc-300">
                  🪵 FOGATA: {Math.ceil(fuelPct)}%
                </span>
              )}
            </div>
          </div>

          {/* Section E: Quick Subscreen Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              id="hud-map-btn"
              onClick={onOpenMap}
              className="bg-[#202020] border-2 border-[#585858] text-white px-2.5 py-1.5 text-xs font-bold hover:bg-[#383838] active:scale-95 transition-all"
            >
              🗺️ MAPA
            </button>
            <button
              id="hud-craft-btn"
              onClick={onOpenCrafting}
              className="bg-[#881400] border-2 border-[#fce000] text-white px-3 py-1.5 text-xs font-bold hover:bg-[#d82800] active:scale-95 transition-all"
            >
              🔨 CRAFTEO
            </button>
            <button
              id="hud-touch-toggle-btn"
              onClick={() => setShowVirtualControls(prev => !prev)}
              className="bg-[#18202c] border-2 border-cyan-400 text-cyan-300 px-2 py-1.5 text-xs font-bold hover:bg-[#283848] active:scale-95 transition-all"
              title="Mostrar u Ocultar Mandos Táctiles"
            >
              {showVirtualControls ? '🕹️ ON' : '🕹️ OFF'}
            </button>
            <button
              id="hud-pause-btn"
              onClick={onTogglePause}
              className="bg-[#202020] border-2 border-[#585858] text-white px-2.5 py-1.5 text-xs font-bold hover:bg-[#383838] active:scale-95"
            >
              ⚙️
            </button>
          </div>

        </div>
      </header>

      {/* Center playfield: 100% visible, fully unobstructed canvas area */}
      <div className="flex-1 pointer-events-none" />

      {/* ========================================================================= */}
      {/* 2. FLOATING TRANSLUCENT NES TOUCH CONTROLS (NO OPAQUE BAR / ZERO CANVAS SHRINK) */}
      {/* ========================================================================= */}
      {showVirtualControls && (
        <div className="absolute inset-x-0 bottom-0 pointer-events-none p-3 sm:p-5 flex items-end justify-between z-30">
          
          {/* Left: Floating Translucent NES D-Pad */}
          <div
            ref={stickBaseRef}
            onTouchStart={handleStickStart}
            onTouchMove={handleStickMove}
            onTouchEnd={handleStickEnd}
            onTouchCancel={handleStickEnd}
            className="relative w-28 h-28 sm:w-36 sm:h-36 bg-black/45 backdrop-blur-sm border-2 border-white/40 rounded-full flex items-center justify-center pointer-events-auto touch-none shadow-2xl active:border-[#fce000]"
          >
            {/* NES D-Pad Cross Shape */}
            <div className="w-20 h-8 sm:w-24 sm:h-10 bg-zinc-900/85 border border-zinc-400 rounded-xs absolute shadow flex justify-between items-center px-1.5">
              <span className="text-xs sm:text-sm text-yellow-400 font-black">◀</span>
              <span className="text-xs sm:text-sm text-yellow-400 font-black">▶</span>
            </div>
            <div className="w-8 h-20 sm:w-10 sm:h-24 bg-zinc-900/85 border border-zinc-400 rounded-xs absolute shadow flex flex-col justify-between items-center py-1.5">
              <span className="text-xs sm:text-sm text-yellow-400 font-black">▲</span>
              <span className="text-xs sm:text-sm text-yellow-400 font-black">▼</span>
            </div>
            {/* Center Knob */}
            <div
              className="w-10 h-10 sm:w-12 sm:h-12 bg-zinc-800 border-2 border-[#fce000] rounded-full z-10 flex items-center justify-center shadow-lg transition-transform"
              style={{
                transform: activeDpad
                  ? `translate(${activeDpad.x}px, ${activeDpad.y}px)`
                  : 'translate(0px, 0px)',
              }}
            >
              <div className="w-4 h-4 bg-black rounded-full border border-zinc-500" />
            </div>
          </div>

          {/* Center: Floating Semi-Transparent Pill with SELECT & START */}
          <div className="pointer-events-auto flex items-center gap-3 bg-black/70 backdrop-blur-sm border border-zinc-500 px-3.5 py-1.5 rounded-full shadow-2xl mb-1">
            <button
              id="nes-select-btn"
              onClick={onOpenMap}
              className="flex items-center gap-1 text-xs font-bold text-zinc-200 hover:text-white active:scale-95 transition-all"
            >
              <span className="w-3.5 h-1.5 bg-zinc-600 rounded-xs transform -rotate-12 inline-block border border-zinc-400" />
              <span>MAPA</span>
            </button>

            <span className="text-zinc-500">|</span>

            <button
              id="nes-start-btn"
              onClick={onOpenCrafting}
              className="flex items-center gap-1 text-xs font-bold text-[#fce000] hover:text-yellow-300 active:scale-95 transition-all"
            >
              <span className="w-3.5 h-1.5 bg-zinc-600 rounded-xs transform -rotate-12 inline-block border border-zinc-400" />
              <span>CRAFTEO</span>
            </button>

            <span className="text-zinc-500">|</span>

            <button
              id="nes-hide-pad-btn"
              onClick={() => setShowVirtualControls(false)}
              className="text-xs font-bold text-cyan-400 hover:text-cyan-300"
              title="Ocultar Mandos Táctiles"
            >
              OCULTAR
            </button>
          </div>

          {/* Right: Floating Crimson Red NES B & A Action Buttons */}
          <div className="pointer-events-auto flex items-end gap-3 sm:gap-4">
            {/* B Button */}
            <button
              id="nes-b-btn"
              onTouchStart={e => {
                e.preventDefault();
                engine.performActionB();
              }}
              onClick={() => engine.performActionB()}
              className="w-14 h-14 sm:w-16 sm:h-16 bg-[#881400]/85 backdrop-blur-sm border-2 sm:border-4 border-[#d82800] rounded-full flex flex-col items-center justify-center shadow-2xl active:bg-[#d82800] active:scale-95 transition-transform"
            >
              <span className="text-white font-black text-lg sm:text-xl leading-none">B</span>
              <span className="text-[9px] sm:text-[10px] text-zinc-100 uppercase font-black tracking-tight">
                {activeDef?.category === 'food' ? 'Comer' : activeDef?.fuelValue ? 'Fuego' : 'Esquive'}
              </span>
            </button>

            {/* A Button */}
            <button
              id="nes-a-btn"
              onTouchStart={e => {
                e.preventDefault();
                engine.performActionA();
              }}
              onClick={() => engine.performActionA()}
              className="w-16 h-16 sm:w-18 sm:h-18 bg-[#881400]/90 backdrop-blur-sm border-2 sm:border-4 border-[#fc7400] rounded-full flex flex-col items-center justify-center shadow-2xl active:bg-[#fc7400] active:scale-95 transition-transform"
            >
              <span className="text-white font-black text-xl sm:text-2xl leading-none">A</span>
              <span className="text-[10px] sm:text-xs text-[#fce000] uppercase font-black tracking-tight">
                {activeDef?.category === 'weapon' ? 'Atacar' : 'Acción'}
              </span>
            </button>
          </div>

        </div>
      )}
    </div>
  );
};

