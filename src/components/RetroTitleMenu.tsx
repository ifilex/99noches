import React, { useEffect, useState } from 'react';
import { UserProfile } from '../types';
import { soundEngine } from '../audio/soundEngine';

interface RetroTitleMenuProps {
  profile: UserProfile;
  onStartSurvival: () => void;
  onOpenStoryLore: () => void;
  onOpenDaily: () => void;
  onOpenShop: () => void;
  onOpenLeaderboard: () => void;
  onOpenSettings: () => void;
  onOpenCloudSync: () => void;
}

export const RetroTitleMenu: React.FC<RetroTitleMenuProps> = ({
  profile,
  onStartSurvival,
  onOpenStoryLore,
  onOpenDaily,
  onOpenShop,
  onOpenLeaderboard,
  onOpenSettings,
  onOpenCloudSync,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const menuOptions = [
    { id: 'survive', label: 'SOBREVIVIR (99 NOCHES)', icon: '🔥', action: onStartSurvival },
    { id: 'lore', label: 'HISTORIA Y LORE DEL VALLE', icon: '📜', action: onOpenStoryLore },
    { id: 'daily', label: 'DESAFÍO DIARIO', icon: '📅', action: onOpenDaily },
    { id: 'shop', label: 'TIENDA DE ASPECTOS', icon: '🏪', action: onOpenShop },
    { id: 'leaderboard', label: 'CLASIFICACIÓN GLOBAL', icon: '🏆', action: onOpenLeaderboard },
    { id: 'settings', label: 'OPCIONES (AUDIO / CRT)', icon: '⚙️', action: onOpenSettings },
  ];

  // Start 8-bit title music on mount / first interaction
  useEffect(() => {
    soundEngine.startMusic('title');
    const handleFirstGesture = () => {
      soundEngine.initCtx();
      soundEngine.setMusicMood('title');
    };
    window.addEventListener('click', handleFirstGesture, { once: true });
    window.addEventListener('keydown', handleFirstGesture, { once: true });

    return () => {
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };
  }, []);

  // Keyboard navigation for classic NES Title Screen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        soundEngine.playMenuMove();
        setSelectedIndex(prev => (prev - 1 + menuOptions.length) % menuOptions.length);
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        soundEngine.playMenuMove();
        setSelectedIndex(prev => (prev + 1) % menuOptions.length);
      } else if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyJ' || e.code === 'KeyZ') {
        e.preventDefault();
        soundEngine.playMenuSelect();
        menuOptions[selectedIndex]?.action();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, menuOptions]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-between p-4 sm:p-6 bg-gradient-to-b from-[#02050e] via-[#080d1a] to-[#041208] text-white select-none font-mono overflow-hidden">
      
      {/* Background Retro Pixel Stars & Pine Silhouettes */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-8 left-12 w-2 h-2 bg-white animate-ping" />
        <div className="absolute top-20 right-24 w-1.5 h-1.5 bg-[#fce000] animate-pulse" />
        <div className="absolute top-36 left-1/3 w-1 h-1 bg-[#3cbcfc]" />
        <div className="absolute top-16 right-1/4 w-2 h-2 bg-white" />
        <div className="absolute bottom-0 w-full h-32 bg-gradient-to-t from-black to-transparent" />
      </div>

      {/* Top Bar: Profile, Gold, and Cloud Sync */}
      <div className="relative z-10 w-full max-w-4xl flex items-center justify-between bg-[#10141c]/90 border-2 border-[#585858] p-2.5 sm:p-3 shadow-2xl">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-xl sm:text-2xl">🌲</span>
          <div>
            <span className="font-bold text-xs sm:text-sm text-[#fce000]">{profile.playerName}</span>
            <span className="text-[10px] text-zinc-400 block">Récord: Noche {profile.highestNight} / 99</span>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="bg-black/80 border border-[#fce000] px-2.5 py-1 text-[11px] sm:text-xs font-bold text-[#fce000] flex items-center gap-1">
            <span>🪙</span> {profile.gold} ORO
          </div>
          <button
            id="menu-cloud-btn"
            onClick={() => {
              soundEngine.playMenuSelect();
              onOpenCloudSync();
            }}
            className="bg-[#2038ec] border border-[#3cbcfc] px-2.5 py-1 text-[11px] sm:text-xs font-bold text-white hover:bg-[#3cbcfc] hover:text-black active:scale-95 transition-all shadow"
          >
            ☁️ NUBE
          </button>
        </div>
      </div>

      {/* Central 8-Bit Title & Campfire Banner */}
      <div className="relative z-10 text-center my-auto space-y-3">
        {/* Pixel Campfire Graphic */}
        <div className="flex justify-center items-center gap-2 text-2xl sm:text-3xl animate-bounce">
          <span>🌲</span>
          <span className="text-3xl sm:text-4xl">🔥</span>
          <span>🌲</span>
        </div>

        {/* Big Retro Box Title */}
        <div className="inline-block bg-[#881400] border-4 border-[#fc7400] px-6 sm:px-10 py-3 sm:py-4 shadow-[0_0_25px_rgba(252,116,0,0.6)]">
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-widest text-[#fce000] drop-shadow-[2px_2px_0px_#000]">
            99 NOCHES
          </h1>
          <h2 className="text-xs sm:text-base font-bold text-white tracking-[0.2em] mt-1 drop-shadow-[1px_1px_0px_#000]">
            EN EL BOSQUE MALDITO
          </h2>
          <div className="mt-2 pt-1 border-t border-[#fce000]/40 text-[9px] sm:text-[11px] text-[#f8d878] font-bold tracking-wider">
            ★ SISTEMA RETRO FAMICOM 1986 ★
          </div>
        </div>

        {/* Blinking "Press Start" Prompt */}
        <div className="pt-2">
          <span className="text-xs sm:text-sm font-black text-[#fce000] tracking-widest animate-pulse">
            ★ PRESIONA START O ENTER ★
          </span>
        </div>
      </div>

      {/* 8-Bit Interactive Menu Selector */}
      <div className="relative z-10 w-full max-w-md bg-[#0c1018]/95 border-4 border-[#3cbcfc] p-3 sm:p-4 shadow-2xl space-y-1.5">
        <div className="text-[10px] text-[#3cbcfc] font-bold uppercase tracking-wider pb-1 border-b border-[#3cbcfc]/40 text-center">
          MENÚ PRINCIPAL (FLECHAS / WASD + ENTER)
        </div>

        {menuOptions.map((opt, idx) => {
          const isSelected = selectedIndex === idx;
          return (
            <button
              key={opt.id}
              id={`title-menu-${opt.id}`}
              onMouseEnter={() => {
                if (selectedIndex !== idx) {
                  soundEngine.playMenuMove();
                  setSelectedIndex(idx);
                }
              }}
              onClick={() => {
                soundEngine.playMenuSelect();
                opt.action();
              }}
              className={`w-full text-left px-3 py-2 text-xs sm:text-sm font-bold flex items-center justify-between border-2 transition-all ${
                isSelected
                  ? 'bg-[#881400] border-[#fce000] text-white translate-x-1 shadow-lg'
                  : 'bg-[#18202c] border-transparent text-zinc-300 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-[#fce000]">{isSelected ? '►' : '  '}</span>
                <span>{opt.icon}</span>
                <span>{opt.label}</span>
              </div>
              {isSelected && (
                <span className="text-[10px] text-[#fce000] font-black animate-pulse">
                  [A / ENTER]
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Controls & Lore Hint */}
      <div className="relative z-10 text-center text-[10px] text-zinc-400 pt-3 flex flex-col items-center gap-1">
        <div>
          Controles: <strong>WASD / Flechas</strong> mover • <strong>J / Z / Espacio</strong> (Botón A) • <strong>K / X</strong> (Botón B) • <strong>C / I</strong> (Crafteo)
        </div>
        <div className="text-zinc-500">
          En móviles y tablets se activará automáticamente el pad virtual 8-bit.
        </div>
      </div>
    </div>
  );
};
