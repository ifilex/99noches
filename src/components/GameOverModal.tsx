import React from 'react';
import { GameEngine } from '../game/engine';

interface GameOverModalProps {
  engine: GameEngine;
  onRestart: () => void;
  onGoToMenu: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({ engine, onRestart, onGoToMenu }) => {
  const p = engine.state.player;
  const night = engine.state.currentNight;
  const kills = p.kills;
  const score = p.score;

  const handleShare = () => {
    const text = `🌲 ¡Sobreviví ${night} noches en el bosque 8-Bit (NES Edition)! ⚔️ Bajas: ${kills} | 🏆 Puntaje: ${score.toLocaleString()}. ¿Puedes superar las 99 noches?`;
    if (navigator.share) {
      navigator.share({
        title: '99 Noches en el Bosque 8-Bit',
        text,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      alert('¡Texto de récord copiado al portapapeles!');
    }
  };

  const handleTwitterShare = () => {
    const text = encodeURIComponent(
      `🌲 ¡Sobreviví ${night} noches en el bosque 8-Bit! ⚔️ Bajas: ${kills} | 🏆 Puntaje: ${score.toLocaleString()}. ¿Podrás sobrevivir 99 noches?`
    );
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(window.location.href)}`, '_blank');
  };

  const handleWhatsappShare = () => {
    const text = encodeURIComponent(
      `🌲 ¡Sobreviví ${night} noches en el bosque 8-Bit! ⚔️ Bajas: ${kills} | 🏆 Puntaje: ${score.toLocaleString()}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 font-mono select-none">
      <div className="bg-[#000000] border-4 border-[#d82800] outline outline-4 outline-[#000000] w-full max-w-lg p-5 shadow-2xl text-white text-center space-y-4">
        
        {/* Title */}
        <div className="space-y-1">
          <span className="text-4xl block animate-bounce">💀</span>
          <h2 className="text-lg md:text-xl font-bold text-[#d82800] tracking-wider">
            - GAME OVER -
          </h2>
          <p className="text-[10px] text-zinc-400">LA OSCURIDAD HA CONSUMIDO TU ALMA</p>
        </div>

        {/* Stats Card */}
        <div className="bg-[#101010] border-2 border-[#585858] p-3 grid grid-cols-3 gap-2 text-center">
          <div>
            <span className="text-[8px] text-zinc-400 block">NOCHE</span>
            <span className="text-sm sm:text-base font-bold text-[#fce000]">{night} / 99</span>
          </div>
          <div>
            <span className="text-[8px] text-zinc-400 block">BAJAS</span>
            <span className="text-sm sm:text-base font-bold text-[#d82800]">⚔️ {kills}</span>
          </div>
          <div>
            <span className="text-[8px] text-zinc-400 block">PUNTAJE</span>
            <span className="text-sm sm:text-base font-bold text-[#58d854]">{score.toLocaleString()}</span>
          </div>
        </div>

        {/* Social Share */}
        <div className="bg-[#181818] border-2 border-[#383838] p-3 space-y-2">
          <span className="text-[9px] text-[#fce000] font-bold block">
            📣 COMPARTIR RÉCORD CON AMIGOS:
          </span>
          <div className="flex justify-center gap-2">
            <button
              onClick={handleWhatsappShare}
              className="bg-[#00a800] border border-[#58d854] text-white px-2.5 py-1 text-[10px] font-bold hover:bg-[#58d854] hover:text-black active:scale-95 flex items-center gap-1"
            >
              WhatsApp
            </button>
            <button
              onClick={handleTwitterShare}
              className="bg-[#2038ec] border border-[#3cbcfc] text-white px-2.5 py-1 text-[10px] font-bold hover:bg-[#3cbcfc] hover:text-black active:scale-95 flex items-center gap-1"
            >
              X / Twitter
            </button>
            <button
              onClick={handleShare}
              className="bg-[#585858] border border-[#a4a4a4] text-white px-2.5 py-1 text-[10px] font-bold hover:bg-[#a4a4a4] hover:text-black active:scale-95 flex items-center gap-1"
            >
              📋 Copiar
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-1">
          <button
            onClick={onRestart}
            className="w-full bg-[#881400] border-4 border-[#fce000] text-white py-2.5 text-xs font-bold uppercase hover:bg-[#d82800] active:scale-95 transition-all shadow-lg"
          >
            ⚡ REINTENTAR (CONTINUE)
          </button>
          <button
            onClick={onGoToMenu}
            className="w-full bg-[#202020] border-2 border-[#585858] text-zinc-300 py-2 text-[10px] font-bold uppercase hover:bg-[#383838] active:scale-95 transition-all"
          >
            MENÚ PRINCIPAL (RETRY)
          </button>
        </div>

      </div>
    </div>
  );
};
