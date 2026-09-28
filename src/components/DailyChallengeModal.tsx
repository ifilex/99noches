import React, { useEffect, useState } from 'react';
import { DailyChallenge } from '../types';

interface DailyChallengeModalProps {
  onStartDaily: (challenge: DailyChallenge) => void;
  onClose: () => void;
}

export const DailyChallengeModal: React.FC<DailyChallengeModalProps> = ({ onStartDaily, onClose }) => {
  const [dailyData, setDailyData] = useState<DailyChallenge | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetch('/api/daily-challenge')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.challenge) {
          setDailyData(data.challenge);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 font-mono select-none">
      <div className="bg-[#000000] border-4 border-[#ffffff] outline outline-4 outline-[#000000] w-full max-w-lg p-4 shadow-2xl text-white flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b-4 border-[#ffffff] pb-2 mb-3 bg-[#181818] p-2">
          <div className="flex items-center gap-2">
            <span className="text-[#fce000]">►</span>
            <h2 className="font-bold text-xs sm:text-sm text-[#fce000] tracking-wider">
              - DESAFÍO DIARIO (EVENTO) -
            </h2>
          </div>
          <button
            onClick={onClose}
            className="bg-[#881400] border-2 border-[#fce000] text-white px-2 py-0.5 text-xs font-bold hover:bg-[#d82800]"
          >
            CERRAR
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-zinc-400 text-xs">Cargando desafío diario...</div>
        ) : dailyData ? (
          <div className="space-y-3">
            {/* Challenge Card */}
            <div className="bg-[#101010] border-2 border-[#fc7400] p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[#fc7400]">{dailyData.title}</span>
                <span className="text-[8px] bg-[#881400] border border-[#d82800] text-[#fce000] font-bold px-1.5 py-0.5">
                  {dailyData.difficulty}
                </span>
              </div>
              <p className="text-[9px] text-zinc-300 leading-relaxed">{dailyData.description}</p>
            </div>

            {/* Target & Rewards */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-[#101010] border border-[#585858] p-2.5 text-center">
                <span className="text-[8px] text-zinc-400 block">OBJETIVO:</span>
                <span className="text-xs font-bold text-[#fce000] mt-0.5 block">
                  🌙 Noche {dailyData.targetNight}
                </span>
              </div>
              <div className="bg-[#101010] border border-[#585858] p-2.5 text-center">
                <span className="text-[8px] text-zinc-400 block">RECOMPENSA:</span>
                <span className="text-xs font-bold text-[#58d854] mt-0.5 block">
                  🪙 +{dailyData.rewardGold} Oro
                </span>
              </div>
            </div>

            {/* Launch Button */}
            <button
              onClick={() => onStartDaily(dailyData)}
              className="w-full bg-[#881400] border-4 border-[#fce000] text-white py-2.5 font-bold text-xs uppercase hover:bg-[#d82800] active:scale-95 transition-all shadow-lg"
            >
              ⚔️ INICIAR DESAFÍO DIARIO
            </button>
          </div>
        ) : (
          <div className="py-8 text-center text-zinc-400 text-xs">Error cargando desafío.</div>
        )}

      </div>
    </div>
  );
};
