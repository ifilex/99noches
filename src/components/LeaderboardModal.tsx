import React, { useEffect, useState } from 'react';
import { LeaderboardEntry } from '../types';

interface LeaderboardModalProps {
  onClose: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ onClose }) => {
  const [type, setType] = useState<'global' | 'daily'>('global');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/leaderboard?type=${type}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.leaderboard) {
          setEntries(data.leaderboard);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [type]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 font-mono select-none">
      <div className="bg-[#000000] border-4 border-[#ffffff] outline outline-4 outline-[#000000] w-full max-w-2xl max-h-[88vh] flex flex-col shadow-2xl text-white">
        
        {/* Header */}
        <div className="p-3 bg-[#181818] border-b-4 border-[#ffffff] flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[#fce000]">►</span>
            <h2 className="font-bold text-xs sm:text-sm text-[#fce000] tracking-wider">
              - HIGH SCORES / CLASIFICACIÓN -
            </h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setType('global')}
              className={`px-2.5 py-1 text-[9px] font-bold border-2 ${
                type === 'global' ? 'bg-[#fce000] text-black border-[#fce000]' : 'bg-[#181818] text-zinc-300 border-[#585858]'
              }`}
            >
              GLOBAL (99N)
            </button>
            <button
              onClick={() => setType('daily')}
              className={`px-2.5 py-1 text-[9px] font-bold border-2 ${
                type === 'daily' ? 'bg-[#fce000] text-black border-[#fce000]' : 'bg-[#181818] text-zinc-300 border-[#585858]'
              }`}
            >
              DIARIO
            </button>
          </div>
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-[#000000]">
          {loading ? (
            <div className="text-center py-12 text-zinc-400 text-xs">Consultando récords mundiales...</div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12 text-zinc-400 text-xs">No hay puntuaciones registradas aún.</div>
          ) : (
            <div className="space-y-1.5">
              <div className="grid grid-cols-12 text-[8px] font-bold text-zinc-400 px-2 py-1 border-b-2 border-[#585858]">
                <span className="col-span-1">#</span>
                <span className="col-span-4">HEROE</span>
                <span className="col-span-3 text-center">NOCHES</span>
                <span className="col-span-2 text-center">BAJAS</span>
                <span className="col-span-2 text-right">PUNTAJE</span>
              </div>

              {entries.map((entry, idx) => (
                <div
                  key={entry.id || idx}
                  className={`grid grid-cols-12 items-center text-[10px] p-2 border-2 ${
                    idx === 0
                      ? 'bg-[#302000] border-[#fce000] text-[#fce000]'
                      : idx === 1
                      ? 'bg-[#18202c] border-[#a4a4a4] text-zinc-200'
                      : idx === 2
                      ? 'bg-[#201408] border-[#a87830] text-[#fc7400]'
                      : 'bg-[#101010] border-[#383838] text-zinc-300'
                  }`}
                >
                  <span className="col-span-1 font-bold">
                    {idx === 0 ? '1.' : idx === 1 ? '2.' : idx === 2 ? '3.' : `${idx + 1}.`}
                  </span>
                  <span className="col-span-4 font-bold truncate flex items-center gap-1">
                    <span>{entry.playerName}</span>
                  </span>
                  <span className="col-span-3 text-center font-bold">
                    🌙 {entry.nightReached}/99
                  </span>
                  <span className="col-span-2 text-center text-zinc-400">
                    ⚔️ {entry.kills}
                  </span>
                  <span className="col-span-2 text-right font-bold text-[#58d854]">
                    {entry.score.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#181818] border-t-4 border-[#ffffff] flex justify-end">
          <button
            onClick={onClose}
            className="bg-[#881400] border-2 border-[#fce000] text-white px-4 py-1.5 text-xs font-bold hover:bg-[#d82800]"
          >
            CERRAR
          </button>
        </div>

      </div>
    </div>
  );
};
