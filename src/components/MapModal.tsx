import React from 'react';
import { GameEngine } from '../game/engine';

interface MapModalProps {
  engine: GameEngine;
  onClose: () => void;
}

export const MapModal: React.FC<MapModalProps> = ({ engine, onClose }) => {
  const state = engine.state;
  const mapW = state.worldWidth;
  const mapH = state.worldHeight;
  const p = state.player;

  // Map viewport dimensions
  const miniW = 340;
  const miniH = 340;
  const scaleX = miniW / mapW;
  const scaleY = miniH / mapH;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 font-mono select-none">
      <div className="bg-[#000000] border-4 border-[#ffffff] outline outline-4 outline-[#000000] w-full max-w-md p-4 shadow-2xl text-white flex flex-col items-center">
        
        {/* Title */}
        <div className="w-full bg-[#181818] border-b-4 border-[#ffffff] pb-2 mb-3 flex items-center justify-between">
          <span className="text-xs sm:text-sm font-bold text-[#fce000] tracking-wider">
            - OVERWORLD MAP (NOCHE {state.currentNight}) -
          </span>
          <button
            onClick={onClose}
            className="bg-[#881400] border-2 border-[#fce000] text-white px-2 py-0.5 text-xs font-bold hover:bg-[#d82800]"
          >
            CERRAR (M)
          </button>
        </div>

        {/* 8-Bit Mini-Map Display (Zelda 1 Grid Style) */}
        <div
          className="relative bg-[#001800] border-4 border-[#585858] overflow-hidden shadow-inner"
          style={{ width: `${miniW}px`, height: `${miniH}px` }}
        >
          {/* Overworld Grid Lines */}
          <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 border border-[#003800] pointer-events-none opacity-40">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="border border-[#003800]" />
            ))}
          </div>

          {/* Central Camp Circle */}
          <div
            className="absolute rounded-none border-2 border-[#fc7400] bg-[#503000]/60 flex items-center justify-center"
            style={{
              left: `${(mapW / 2) * scaleX - 18}px`,
              top: `${(mapH / 2) * scaleY - 18}px`,
              width: '36px',
              height: '36px',
            }}
          >
            <span className="text-xs">🔥</span>
          </div>

          {/* Structures (Cabins, Cages, Shrines) */}
          {state.structures.map(st => {
            if (st.kind === 'cabin_ruin') {
              return (
                <div
                  key={st.id}
                  className="absolute text-xs"
                  style={{ left: `${st.x * scaleX - 6}px`, top: `${st.y * scaleY - 6}px` }}
                  title="Cabaña Abandonada"
                >
                  🏚️
                </div>
              );
            }
            if (st.kind === 'cage' && st.hp > 0) {
              return (
                <div
                  key={st.id}
                  className="absolute text-xs"
                  style={{ left: `${st.x * scaleX - 6}px`, top: `${st.y * scaleY - 6}px` }}
                  title="Campista Atrapado"
                >
                  🔒
                </div>
              );
            }
            return null;
          })}

          {/* Shrines */}
          {state.resourceNodes.map(node => {
            if (node.resourceType === 'ancient_shrine' && !node.depleted) {
              return (
                <div
                  key={node.id}
                  className="absolute text-xs"
                  style={{ left: `${node.x * scaleX - 6}px`, top: `${node.y * scaleY - 6}px` }}
                  title="Santuario Ancestral"
                >
                  🔮
                </div>
              );
            }
            return null;
          })}

          {/* Boss Blinking Red Marker (if active) */}
          {state.monsters
            .filter(m => m.isBoss)
            .map(b => (
              <div
                key={b.id}
                className="absolute w-4 h-4 bg-[#d82800] border-2 border-white rounded-none shadow-lg animate-ping"
                style={{ left: `${b.x * scaleX - 8}px`, top: `${b.y * scaleY - 8}px` }}
              />
            ))}

          {/* Player Beacon Pin */}
          <div
            className="absolute w-3 h-3 bg-[#58d854] border-2 border-[#000000] rounded-none animate-ping"
            style={{ left: `${p.x * scaleX - 6}px`, top: `${p.y * scaleY - 6}px` }}
          />
          <div
            className="absolute w-3 h-3 bg-[#fce000] border-2 border-[#000000] rounded-none"
            style={{ left: `${p.x * scaleX - 6}px`, top: `${p.y * scaleY - 6}px` }}
          />
        </div>

        {/* Legend */}
        <div className="w-full mt-3 grid grid-cols-2 gap-1.5 text-[8px] text-zinc-300 border-t-2 border-[#383838] pt-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-[#fce000] border border-black inline-block" />
            <span>[JUGADOR HEROE]</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>🔥</span>
            <span>[FOGATA CENTRAL]</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>🔒</span>
            <span>[CAMPISTA ATRAPADO]</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>🔮</span>
            <span>[SANTUARIO ANCESTRAL]</span>
          </div>
        </div>

      </div>
    </div>
  );
};
