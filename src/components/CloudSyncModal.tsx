import React, { useState } from 'react';
import { UserProfile } from '../types';

interface CloudSyncModalProps {
  profile: UserProfile;
  onProfileLoaded: (loaded: UserProfile) => void;
  onClose: () => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({ profile, onProfileLoaded, onClose }) => {
  const [inputCode, setInputCode] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const handleSaveToCloud = async () => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/cloud/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncCode: profile.syncCode, profile }),
      });
      const data = await res.json();
      if (data.success) {
        setIsError(false);
        setStatusMessage('¡Progreso sincronizado exitosamente en la nube!');
      } else {
        setIsError(true);
        setStatusMessage(data.error || 'Error al guardar');
      }
    } catch {
      setIsError(true);
      setStatusMessage('Error de conexión con el servidor en la nube.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadFromCloud = async () => {
    if (!inputCode.trim()) return;
    setLoading(true);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/cloud/load/${inputCode.trim().toUpperCase()}`);
      const data = await res.json();
      if (data.success && data.profile) {
        setIsError(false);
        setStatusMessage('¡Partida cargada exitosamente desde la nube!');
        onProfileLoaded(data.profile);
      } else {
        setIsError(true);
        setStatusMessage(data.error || 'Código de sincronización no encontrado.');
      }
    } catch {
      setIsError(true);
      setStatusMessage('Error al consultar el código en la nube.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 font-mono select-none">
      <div className="bg-[#000000] border-4 border-[#ffffff] outline outline-4 outline-[#000000] w-full max-w-lg p-4 shadow-2xl text-white flex flex-col space-y-3">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b-4 border-[#ffffff] pb-2 bg-[#181818] p-2">
          <div className="flex items-center gap-2">
            <span className="text-[#fce000]">►</span>
            <h2 className="font-bold text-xs sm:text-sm text-[#fce000] tracking-wider">
              - GUARDADO EN NUBE (CROSS-PLAY) -
            </h2>
          </div>
          <button
            onClick={onClose}
            className="bg-[#881400] border-2 border-[#fce000] text-white px-2 py-0.5 text-xs font-bold hover:bg-[#d82800]"
          >
            VOLVER
          </button>
        </div>

        {/* Current Sync Code */}
        <div className="bg-[#101010] border-2 border-[#585858] p-3 space-y-1.5">
          <span className="text-[9px] text-[#fce000] block font-bold">TU CÓDIGO DE SINCRONIZACIÓN:</span>
          <div className="flex items-center justify-between bg-black border-2 border-[#fce000] p-2">
            <span className="text-xs font-bold text-[#fce000] tracking-widest">{profile.syncCode}</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(profile.syncCode);
                setStatusMessage('¡Código copiado al portapapeles!');
                setIsError(false);
              }}
              className="bg-[#503000] border border-[#fce000] text-[9px] px-2 py-1 text-white hover:bg-[#885818] active:scale-95"
            >
              COPIAR
            </button>
          </div>
          <p className="text-[8px] text-zinc-400">
            Ingresa este código en cualquier PC o celular para continuar tu partida sin perder progreso.
          </p>
          <button
            onClick={handleSaveToCloud}
            disabled={loading}
            className="w-full bg-[#00a800] border-2 border-[#58d854] text-black py-2 text-xs font-bold uppercase hover:bg-[#58d854] active:scale-95"
          >
            {loading ? 'GUARDANDO...' : '☁️ GUARDAR AHORA EN NUBE'}
          </button>
        </div>

        {/* Load From Cloud */}
        <div className="bg-[#101010] border-2 border-[#585858] p-3 space-y-2">
          <span className="text-[9px] text-[#fce000] block font-bold">
            RESTAURAR PARTIDA DESDE OTRO DISPOSITIVO:
          </span>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="NES-XXXX-XXXX"
              value={inputCode}
              onChange={e => setInputCode(e.target.value.toUpperCase())}
              className="flex-1 bg-black border-2 border-[#787878] px-2 py-1 text-xs text-white uppercase focus:border-[#fce000] outline-none"
            />
            <button
              onClick={handleLoadFromCloud}
              disabled={loading || !inputCode.trim()}
              className="bg-[#881400] border-2 border-[#fce000] text-white px-3 py-1 text-xs font-bold hover:bg-[#d82800] active:scale-95 disabled:opacity-50"
            >
              CARGAR
            </button>
          </div>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div
            className={`p-2 border text-[9px] font-bold ${
              isError
                ? 'bg-[#380000] border-[#d82800] text-[#fc7400]'
                : 'bg-[#003800] border-[#00a800] text-[#88f870]'
            }`}
          >
            {statusMessage}
          </div>
        )}

      </div>
    </div>
  );
};
