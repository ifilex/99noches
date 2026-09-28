import React from 'react';
import { GameSettings } from '../types';
import { soundEngine } from '../audio/soundEngine';

interface SettingsModalProps {
  settings: GameSettings;
  onUpdateSettings: (settings: GameSettings) => void;
  onClose: () => void;
  onExitGame?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onClose,
  onExitGame,
}) => {
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 font-mono select-none">
      <div className="bg-[#000000] border-4 border-[#ffffff] outline outline-4 outline-[#000000] w-full max-w-md p-4 shadow-2xl text-white space-y-3">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b-4 border-[#ffffff] pb-2 bg-[#181818] p-2">
          <div className="flex items-center gap-2">
            <span className="text-[#fce000]">►</span>
            <h2 className="font-bold text-xs sm:text-sm text-[#fce000] tracking-wider">
              - CONFIGURACIÓN NES -
            </h2>
          </div>
          <button
            onClick={onClose}
            className="bg-[#881400] border-2 border-[#fce000] text-white px-2 py-0.5 text-xs font-bold hover:bg-[#d82800]"
          >
            VOLVER
          </button>
        </div>

        {/* Options */}
        <div className="space-y-2 text-[10px]">
          {/* CRT Scanlines */}
          <div className="flex items-center justify-between bg-[#101010] p-2 border-2 border-[#383838]">
            <span>Filtro CRT Scanlines:</span>
            <button
              onClick={() => onUpdateSettings({ ...settings, crtFilter: !settings.crtFilter })}
              className={`px-2.5 py-1 font-bold border-2 ${
                settings.crtFilter
                  ? 'bg-[#00a800] border-[#58d854] text-white'
                  : 'bg-[#202020] border-[#585858] text-zinc-400'
              }`}
            >
              {settings.crtFilter ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Spanish Voice */}
          <div className="flex items-center justify-between bg-[#101010] p-2 border-2 border-[#383838]">
            <span>Voz de Arcade en Español:</span>
            <button
              onClick={() => {
                const next = !settings.spanishVoice;
                onUpdateSettings({ ...settings, spanishVoice: next });
                soundEngine.setVolumes(settings.soundVolume, settings.musicVolume, settings.voiceVolume, next);
                if (next) soundEngine.speakSpanish('Voz en español activada.');
              }}
              className={`px-2.5 py-1 font-bold border-2 ${
                settings.spanishVoice
                  ? 'bg-[#00a800] border-[#58d854] text-white'
                  : 'bg-[#202020] border-[#585858] text-zinc-400'
              }`}
            >
              {settings.spanishVoice ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* SFX Volume */}
          <div className="bg-[#101010] p-2 border-2 border-[#383838] space-y-1">
            <div className="flex justify-between">
              <span>Efectos SFX (2A03 Chiptune):</span>
              <span className="text-[#fce000]">{Math.round(settings.soundVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.soundVolume}
              onChange={e => {
                const val = parseFloat(e.target.value);
                onUpdateSettings({ ...settings, soundVolume: val });
                soundEngine.setVolumes(val, settings.musicVolume, settings.voiceVolume, settings.spanishVoice);
              }}
              className="w-full accent-[#fce000]"
            />
          </div>

          {/* Music Volume */}
          <div className="bg-[#101010] p-2 border-2 border-[#383838] space-y-1">
            <div className="flex justify-between">
              <span>Música Chiptune 8-Bit:</span>
              <span className="text-[#fce000]">{Math.round(settings.musicVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.musicVolume}
              onChange={e => {
                const val = parseFloat(e.target.value);
                onUpdateSettings({ ...settings, musicVolume: val });
                soundEngine.setVolumes(settings.soundVolume, val, settings.voiceVolume, settings.spanishVoice);
              }}
              className="w-full accent-[#fce000]"
            />
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="w-full bg-[#181818] border-2 border-[#585858] text-white py-2 font-bold uppercase hover:bg-[#303030] active:scale-95"
          >
            📺 PANTALLA COMPLETA (FULLSCREEN)
          </button>
        </div>

        {/* Exit Game / Resume */}
        <div className="pt-2 flex flex-col gap-1.5 border-t-2 border-[#383838]">
          <button
            onClick={onClose}
            className="w-full bg-[#881400] border-2 border-[#fce000] text-white py-2 font-bold text-xs uppercase hover:bg-[#d82800]"
          >
            CONTINUAR JUGANDO
          </button>
          {onExitGame && (
            <button
              onClick={onExitGame}
              className="w-full bg-[#202020] border-2 border-[#585858] text-zinc-300 py-1.5 font-bold text-[10px] uppercase hover:bg-[#383838]"
            >
              SALIR AL MENÚ PRINCIPAL
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
