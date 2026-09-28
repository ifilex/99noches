import React from 'react';
import { GameEngine } from '../game/engine';

interface VictoryModalProps {
  engine: GameEngine;
  onGoToMenu: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({ engine, onGoToMenu }) => {
  const p = engine.state.player;
  const ending = engine.state.activeEnding;
  const alignment = engine.state.narrativeAlignment;
  const loreCount = engine.state.unlockedLore.length;

  const handleShare = () => {
    const endingTitle = ending ? ending.title : 'SUPERVIVIENTE DE LAS 99 NOCHES';
    const text = `🏆 ¡FINAL DESBLOQUEADO: "${endingTitle}"! 👑 Sobreviví en el bosque retro 8-Bit. Puntaje: ${p.score.toLocaleString()} | Bajas: ${p.kills} | Lore: ${loreCount}/4`;
    if (navigator.share) {
      navigator.share({
        title: `Final: ${endingTitle}`,
        text,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      alert('¡Mensaje de victoria copiado!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 font-mono select-none">
      <div className="bg-[#000000] border-4 border-[#fce000] outline outline-4 outline-[#000000] w-full max-w-lg p-5 shadow-2xl text-white text-center space-y-4 max-h-[90vh] overflow-y-auto">
        <span className="text-4xl block animate-bounce">{ending ? ending.icon : '👑'}</span>
        <h2 className="text-xl md:text-2xl font-bold text-[#fce000] tracking-wider">
          ★ {ending ? ending.title : '¡VICTORIA SUPREMA 99 NOCHES!'} ★
        </h2>
        <p className="text-[11px] text-zinc-300 leading-relaxed italic bg-[#10141c] p-2.5 border border-[#3cbcfc]">
          "{ending ? ending.description : 'Has derrotado al Wendigo Ancestral y sobrevivido las 99 Noches en el Bosque. El amanecer dorado ilumina el bosque para siempre.'}"
        </p>

        {/* Narrative Alignment & Lore */}
        <div className="bg-[#181818] border-2 border-[#585858] p-2.5 text-left text-[10px] space-y-1.5">
          <div className="text-[#fce000] font-bold">📜 ALINEAMIENTOS NARRATIVOS DE TU DESTINO:</div>
          <div className="grid grid-cols-2 gap-2 text-zinc-300 text-[9px]">
            <div>🔥 FUEGO ETERNO: <span className="text-[#fc7400] font-bold">{alignment.fire}</span></div>
            <div>🌑 SENDA SOMBRÍA: <span className="text-[#b868f8] font-bold">{alignment.shadow}</span></div>
            <div>⚗️ ALQUIMIA OCULTA: <span className="text-[#58d854] font-bold">{alignment.alchemy}</span></div>
            <div>👻 REINO ESPECTRAL: <span className="text-[#3cbcfc] font-bold">{alignment.spectral}</span></div>
          </div>
          <div className="text-[9px] text-zinc-400 pt-1 border-t border-zinc-700">
            📖 Fragmentos de Lore Descubiertos: <span className="text-white font-bold">{loreCount} / 4</span>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-[#101010] border-2 border-[#fce000] p-3 grid grid-cols-3 gap-2">
          <div>
            <span className="text-[8px] text-zinc-400 block">NOCHES</span>
            <span className="text-sm sm:text-base font-bold text-[#fce000]">{engine.state.currentNight} / 99</span>
          </div>
          <div>
            <span className="text-[8px] text-zinc-400 block">BAJAS</span>
            <span className="text-sm sm:text-base font-bold text-[#d82800]">⚔️ {p.kills}</span>
          </div>
          <div>
            <span className="text-[8px] text-zinc-400 block">PUNTAJE</span>
            <span className="text-sm sm:text-base font-bold text-[#58d854]">{p.score.toLocaleString()}</span>
          </div>
        </div>

        {/* Share */}
        <button
          onClick={handleShare}
          className="w-full bg-[#00a800] border-2 border-[#58d854] text-black py-2.5 font-bold text-xs uppercase hover:bg-[#58d854] active:scale-95"
        >
          📣 COMPARTIR ESTE FINAL EN REDES
        </button>

        <button
          onClick={onGoToMenu}
          className="w-full bg-[#202020] border-2 border-[#585858] text-zinc-300 py-2 text-[10px] font-bold uppercase hover:bg-[#383838] active:scale-95"
        >
          MENÚ PRINCIPAL (RETRY)
        </button>
      </div>
    </div>
  );
};
