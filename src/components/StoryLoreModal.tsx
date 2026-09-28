import React, { useState } from 'react';
import { LORE_CODEX_ENTRIES, STORY_ENDINGS_CATALOG } from '../game/constants';
import { soundEngine } from '../audio/soundEngine';

interface StoryLoreModalProps {
  onClose: () => void;
}

export const StoryLoreModal: React.FC<StoryLoreModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'lore' | 'endings' | 'prologue'>('prologue');
  const [selectedLoreId, setSelectedLoreId] = useState<string>(LORE_CODEX_ENTRIES[0]?.id || '');

  const selectedLore = LORE_CODEX_ENTRIES.find(l => l.id === selectedLoreId) || LORE_CODEX_ENTRIES[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-3 select-none">
      <div className="relative w-full max-w-3xl bg-[#10141c] border-4 border-[#3cbcfc] text-white flex flex-col max-h-[92vh] shadow-2xl font-mono">
        {/* Retro 8-bit Header */}
        <div className="bg-[#003880] border-b-4 border-[#3cbcfc] px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">📜</span>
            <div>
              <h2 className="text-sm sm:text-base font-black text-[#fce000] tracking-wider">
                HISTORIA Y CÓDICE DEL VALLE DE SAN TELMO
              </h2>
              <span className="text-[10px] text-[#3cbcfc] block">
                Edición 1986 • Archivos Secretos de las 99 Noches
              </span>
            </div>
          </div>
          <button
            id="close-lore-btn"
            onClick={() => {
              soundEngine.playBlip();
              onClose();
            }}
            className="w-8 h-8 bg-[#881400] border-2 border-white text-white font-black hover:bg-[#d82800] active:scale-95 flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-[#080c14] border-b-2 border-[#585858]">
          <button
            id="tab-prologue-btn"
            onClick={() => {
              soundEngine.playMenuMove();
              setActiveTab('prologue');
            }}
            className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider transition-colors ${
              activeTab === 'prologue'
                ? 'bg-[#2038ec] text-[#fce000] border-b-4 border-[#fce000]'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            📖 El Prólogo
          </button>
          <button
            id="tab-chapters-btn"
            onClick={() => {
              soundEngine.playMenuMove();
              setActiveTab('lore');
            }}
            className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider transition-colors ${
              activeTab === 'lore'
                ? 'bg-[#2038ec] text-[#fce000] border-b-4 border-[#fce000]'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            📜 Capítulos del Códice ({LORE_CODEX_ENTRIES.length})
          </button>
          <button
            id="tab-endings-btn"
            onClick={() => {
              soundEngine.playMenuMove();
              setActiveTab('endings');
            }}
            className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider transition-colors ${
              activeTab === 'endings'
                ? 'bg-[#2038ec] text-[#fce000] border-b-4 border-[#fce000]'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            🌌 Finales de la Historia ({STORY_ENDINGS_CATALOG.length})
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === 'prologue' && (
            <div className="space-y-4 text-xs sm:text-sm leading-relaxed text-zinc-200">
              <div className="p-3 bg-[#001830] border-2 border-[#3cbcfc]">
                <h3 className="text-[#fce000] font-black text-sm uppercase mb-1">
                  ★ CONTEXTO HISTÓRICO: VALLE DE SAN TELMO (1986)
                </h3>
                <p className="text-zinc-300">
                  En el otoño de 1986, durante un eclipse solar total no predicho por los astrónomos,
                  una densa niebla luminiscente cubrió por completo el Valle de San Telmo. Quienes
                  quedaron atrapados dentro descubrieron que las noches duran una eternidad y que el
                  tiempo solo avanza cuando la <strong>Llama Sagrada del Campamento</strong> permanece encendida.
                </p>
              </div>

              <div className="p-3 bg-[#201000] border-2 border-[#fc7400]">
                <h3 className="text-[#fce000] font-black text-sm uppercase mb-1">
                  🔥 LA REGLA DE LAS 99 NOCHES
                </h3>
                <p className="text-zinc-300">
                  La maldición impone un ciclo de 99 noches consecutivas. Cada noche, criaturas
                  sombrías, lobos de tiniebla y cultistas antiguos intentan apagar la fogata. Si el
                  fuego se extingue, el frío y las bestias devoran a los supervivientes. Si logras
                  llegar al amanecer de la <strong>Noche 99</strong>, el Wendigo Ancestral despertará
                  y tendrás la oportunidad de romper la maldición para siempre o trascender como el nuevo señor del bosque.
                </p>
              </div>

              <div className="p-3 bg-[#180820] border-2 border-[#b868f8]">
                <h3 className="text-[#fce000] font-black text-sm uppercase mb-1">
                  👥 LOS SUPERVIVIENTES DEL VALLE
                </h3>
                <ul className="space-y-1.5 text-zinc-300 list-disc list-inside">
                  <li><strong>Valeria la Guardabosques:</strong> Tu compañera en el campamento central. Te enseña cómo talar, minar y defender la fogata.</li>
                  <li><strong>Dra. Elena la Botánica:</strong> Elabora medicinas y estudia las raras Flores de Luna.</li>
                  <li><strong>Sargento Mateo:</strong> Experto en combate táctico y defensa contra hordas.</li>
                  <li><strong>Erudito Vaelen:</strong> Anciano cronista que reside en las ruinas y conoce el origen alquímico de la niebla.</li>
                  <li><strong>Morrigan la Emisaria Carmesí:</strong> Una mujer misteriosa que ofrece pactos arcanos en las noches de Luna Roja.</li>
                  <li><strong>El Espíritu de Alden:</strong> El primer explorador que cayó ante el frío y busca redención.</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'lore' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Chapters list */}
              <div className="space-y-2">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                  CAPÍTULOS DESBLOQUEADOS
                </span>
                {LORE_CODEX_ENTRIES.map((entry, idx) => (
                  <button
                    key={entry.id}
                    onClick={() => {
                      soundEngine.playMenuMove();
                      setSelectedLoreId(entry.id);
                    }}
                    className={`w-full text-left p-2.5 border-2 text-xs transition-all ${
                      selectedLoreId === entry.id
                        ? 'bg-[#2038ec] border-[#fce000] text-white font-bold'
                        : 'bg-[#18202c] border-[#585858] text-zinc-300 hover:border-zinc-400'
                    }`}
                  >
                    <span className="text-[9px] text-[#fce000] block">TOMO {idx + 1}</span>
                    <span className="truncate block">{entry.title}</span>
                  </button>
                ))}
              </div>

              {/* Chapter Detail */}
              <div className="md:col-span-2 bg-[#001020] border-2 border-[#3cbcfc] p-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="border-b border-[#3cbcfc]/40 pb-2">
                    <span className="text-[10px] text-[#3cbcfc] font-bold uppercase block">
                      {selectedLore.subtitle}
                    </span>
                    <h3 className="text-base font-black text-[#fce000]">
                      {selectedLore.title}
                    </h3>
                  </div>
                  <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed">
                    "{selectedLore.content}"
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#585858] flex justify-between items-center text-[10px] text-zinc-400">
                  <span>Categoría: {selectedLore.category}</span>
                  <span className="text-[#58d854] font-bold">✓ REGISTRADO EN EL CÓDICE</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'endings' && (
            <div className="space-y-3">
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                CATÁLOGO DE FINALES Y RAMIFICACIONES DE HISTORIA
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {STORY_ENDINGS_CATALOG.map(ending => (
                  <div
                    key={ending.id}
                    className="p-3 bg-[#18202c] border-2 border-[#585858] space-y-1.5 hover:border-[#fce000] transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-[#fce000]">
                        {ending.title}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 bg-black/60 border border-zinc-500 uppercase font-bold text-zinc-300">
                        {ending.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-300">
                      {ending.description}
                    </p>
                    <div className="text-[9px] text-[#3cbcfc] font-bold pt-1">
                      Epílogo: {ending.epilogueQuote}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#080c14] border-t-2 border-[#585858] p-3 flex justify-between items-center text-xs">
          <span className="text-[10px] text-zinc-400">
            Tus elecciones con los supervivientes desbloquean diferentes epílogos al amanecer.
          </span>
          <button
            id="close-lore-bottom-btn"
            onClick={() => {
              soundEngine.playBlip();
              onClose();
            }}
            className="bg-[#202020] border-2 border-white px-4 py-1 font-bold hover:bg-[#383838] active:scale-95"
          >
            VOLVER AL MENÚ
          </button>
        </div>
      </div>
    </div>
  );
};
