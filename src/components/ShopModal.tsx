import React, { useState } from 'react';
import { COSMETIC_PETS, COSMETIC_SKINS, FIRE_STYLES } from '../game/constants';
import { UserProfile } from '../types';

interface ShopModalProps {
  profile: UserProfile;
  onUpdateProfile: (updated: UserProfile) => void;
  onClose: () => void;
}

export const ShopModal: React.FC<ShopModalProps> = ({ profile, onUpdateProfile, onClose }) => {
  const [shopTab, setShopTab] = useState<'skins' | 'pets' | 'fire'>('skins');

  const buyOrEquipSkin = (skinId: string, price: number) => {
    const isUnlocked = profile.unlockedSkins.includes(skinId);
    if (isUnlocked) {
      onUpdateProfile({ ...profile, activeSkin: skinId });
    } else if (profile.gold >= price) {
      onUpdateProfile({
        ...profile,
        gold: profile.gold - price,
        unlockedSkins: [...profile.unlockedSkins, skinId],
        activeSkin: skinId,
      });
    }
  };

  const buyOrEquipPet = (petId: string, price: number) => {
    const isUnlocked = profile.unlockedPets.includes(petId);
    if (isUnlocked) {
      onUpdateProfile({ ...profile, activePet: petId });
    } else if (profile.gold >= price) {
      onUpdateProfile({
        ...profile,
        gold: profile.gold - price,
        unlockedPets: [...profile.unlockedPets, petId],
        activePet: petId,
      });
    }
  };

  const buyOrEquipFire = (fireId: string, price: number) => {
    const isUnlocked = profile.unlockedFireStyles.includes(fireId);
    if (isUnlocked) {
      onUpdateProfile({ ...profile, activeFireStyle: fireId });
    } else if (profile.gold >= price) {
      onUpdateProfile({
        ...profile,
        gold: profile.gold - price,
        unlockedFireStyles: [...profile.unlockedFireStyles, fireId],
        activeFireStyle: fireId,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 font-mono select-none">
      <div className="bg-[#000000] border-4 border-[#ffffff] outline outline-4 outline-[#000000] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl text-white">
        
        {/* Header */}
        <div className="p-3 bg-[#181818] border-b-4 border-[#ffffff] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[#fce000]">►</span>
            <h2 className="font-bold text-xs sm:text-sm text-[#fce000] tracking-wider">
              TIENDA DE ACCESORIOS (NES 1985)
            </h2>
          </div>
          <div className="bg-[#000000] border-2 border-[#fce000] px-2.5 py-1 flex items-center gap-1.5 text-xs font-bold text-[#fce000]">
            <span>🪙</span>
            <span>{profile.gold} ORO</span>
          </div>
        </div>

        {/* Sub Tabs */}
        <div className="grid grid-cols-3 border-b-4 border-[#585858] bg-[#101010]">
          <button
            id="shop-tab-skins"
            onClick={() => setShopTab('skins')}
            className={`py-2 text-[10px] sm:text-xs font-bold border-r-2 border-[#585858] transition-all ${
              shopTab === 'skins' ? 'bg-[#503000] text-[#fce000] border-b-2 border-b-[#fce000]' : 'text-zinc-400 hover:bg-[#202020]'
            }`}
          >
            👕 TRAJES 8-BIT
          </button>
          <button
            id="shop-tab-pets"
            onClick={() => setShopTab('pets')}
            className={`py-2 text-[10px] sm:text-xs font-bold border-r-2 border-[#585858] transition-all ${
              shopTab === 'pets' ? 'bg-[#503000] text-[#fce000] border-b-2 border-b-[#fce000]' : 'text-zinc-400 hover:bg-[#202020]'
            }`}
          >
            🐾 MASCOTAS
          </button>
          <button
            id="shop-tab-fire"
            onClick={() => setShopTab('fire')}
            className={`py-2 text-[10px] sm:text-xs font-bold transition-all ${
              shopTab === 'fire' ? 'bg-[#503000] text-[#fce000] border-b-2 border-b-[#fce000]' : 'text-zinc-400 hover:bg-[#202020]'
            }`}
          >
            🔥 LLAMAS
          </button>
        </div>

        {/* Catalog Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-[#000000]">
          
          {/* TAB 1: SKINS */}
          {shopTab === 'skins' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {COSMETIC_SKINS.map(skin => {
                const isUnlocked = profile.unlockedSkins.includes(skin.id);
                const isEquipped = profile.activeSkin === skin.id;
                const canAfford = profile.gold >= skin.priceGold;

                return (
                  <div
                    key={skin.id}
                    className={`p-3 border-2 flex flex-col justify-between ${
                      isEquipped
                        ? 'bg-[#302000] border-[#fce000]'
                        : isUnlocked
                        ? 'bg-[#10141c] border-[#585858]'
                        : 'bg-[#0a0a0a] border-[#383838]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-[#fce000]">{skin.name}</span>
                        {isEquipped ? (
                          <span className="text-[8px] bg-[#00a800] text-black px-1.5 py-0.5 font-bold">
                            EQUIPADO
                          </span>
                        ) : isUnlocked ? (
                          <span className="text-[8px] text-[#58d854]">DESBLOQUEADO</span>
                        ) : (
                          <span className="text-[8px] text-[#fc7400] font-bold">🪙 {skin.priceGold} ORO</span>
                        )}
                      </div>
                      <p className="text-[9px] text-zinc-300 mt-1 leading-relaxed">{skin.description}</p>
                    </div>

                    <button
                      onClick={() => buyOrEquipSkin(skin.id, skin.priceGold)}
                      disabled={!isUnlocked && !canAfford}
                      className={`w-full mt-2.5 py-1.5 text-[9px] font-bold uppercase border-2 transition-all ${
                        isEquipped
                          ? 'bg-[#383838] border-[#787878] text-zinc-400 cursor-default'
                          : isUnlocked
                          ? 'bg-[#503000] border-[#fce000] text-white hover:bg-[#885818] active:scale-95'
                          : canAfford
                          ? 'bg-[#881400] border-[#fce000] text-white hover:bg-[#d82800] active:scale-95'
                          : 'bg-[#1c1c1c] border-[#383838] text-zinc-500 cursor-not-allowed'
                      }`}
                    >
                      {isEquipped ? 'EQUIPADO' : isUnlocked ? 'EQUIPAR' : `COMPRAR (${skin.priceGold} 🪙)`}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: PETS */}
          {shopTab === 'pets' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {COSMETIC_PETS.map(pet => {
                const isUnlocked = profile.unlockedPets.includes(pet.id);
                const isEquipped = profile.activePet === pet.id;
                const canAfford = profile.gold >= pet.priceGold;

                return (
                  <div
                    key={pet.id}
                    className={`p-3 border-2 flex flex-col justify-between ${
                      isEquipped
                        ? 'bg-[#302000] border-[#fce000]'
                        : isUnlocked
                        ? 'bg-[#10141c] border-[#585858]'
                        : 'bg-[#0a0a0a] border-[#383838]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-base">{pet.icon}</span>
                          <span className="font-bold text-xs text-[#fce000]">{pet.name}</span>
                        </div>
                        {isEquipped ? (
                          <span className="text-[8px] bg-[#00a800] text-black px-1.5 py-0.5 font-bold">
                            ACTIVO
                          </span>
                        ) : isUnlocked ? (
                          <span className="text-[8px] text-[#58d854]">OBTENIDO</span>
                        ) : (
                          <span className="text-[8px] text-[#fc7400] font-bold">🪙 {pet.priceGold} ORO</span>
                        )}
                      </div>
                      <p className="text-[9px] text-zinc-300 mt-1 leading-relaxed">{pet.description}</p>
                    </div>

                    <button
                      onClick={() => buyOrEquipPet(pet.id, pet.priceGold)}
                      disabled={!isUnlocked && !canAfford}
                      className={`w-full mt-2.5 py-1.5 text-[9px] font-bold uppercase border-2 transition-all ${
                        isEquipped
                          ? 'bg-[#383838] border-[#787878] text-zinc-400 cursor-default'
                          : isUnlocked
                          ? 'bg-[#503000] border-[#fce000] text-white hover:bg-[#885818] active:scale-95'
                          : canAfford
                          ? 'bg-[#881400] border-[#fce000] text-white hover:bg-[#d82800] active:scale-95'
                          : 'bg-[#1c1c1c] border-[#383838] text-zinc-500 cursor-not-allowed'
                      }`}
                    >
                      {isEquipped ? 'ACTIVO' : isUnlocked ? 'EQUIPAR' : `COMPRAR (${pet.priceGold} 🪙)`}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 3: FIRE STYLES */}
          {shopTab === 'fire' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {FIRE_STYLES.map(fire => {
                const isUnlocked = profile.unlockedFireStyles.includes(fire.id);
                const isEquipped = profile.activeFireStyle === fire.id;
                const canAfford = profile.gold >= fire.priceGold;

                return (
                  <div
                    key={fire.id}
                    className={`p-3 border-2 flex flex-col justify-between ${
                      isEquipped
                        ? 'bg-[#302000] border-[#fce000]'
                        : isUnlocked
                        ? 'bg-[#10141c] border-[#585858]'
                        : 'bg-[#0a0a0a] border-[#383838]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-[#fce000]">{fire.name}</span>
                        {isEquipped ? (
                          <span className="text-[8px] bg-[#00a800] text-black px-1.5 py-0.5 font-bold">
                            ACTIVO
                          </span>
                        ) : isUnlocked ? (
                          <span className="text-[8px] text-[#58d854]">DESBLOQUEADO</span>
                        ) : (
                          <span className="text-[8px] text-[#fc7400] font-bold">🪙 {fire.priceGold} ORO</span>
                        )}
                      </div>
                      <p className="text-[9px] text-zinc-300 mt-1 leading-relaxed">{fire.description}</p>
                    </div>

                    <button
                      onClick={() => buyOrEquipFire(fire.id, fire.priceGold)}
                      disabled={!isUnlocked && !canAfford}
                      className={`w-full mt-2.5 py-1.5 text-[9px] font-bold uppercase border-2 transition-all ${
                        isEquipped
                          ? 'bg-[#383838] border-[#787878] text-zinc-400 cursor-default'
                          : isUnlocked
                          ? 'bg-[#503000] border-[#fce000] text-white hover:bg-[#885818] active:scale-95'
                          : canAfford
                          ? 'bg-[#881400] border-[#fce000] text-white hover:bg-[#d82800] active:scale-95'
                          : 'bg-[#1c1c1c] border-[#383838] text-zinc-500 cursor-not-allowed'
                      }`}
                    >
                      {isEquipped ? 'ACTIVO' : isUnlocked ? 'EQUIPAR' : `COMPRAR (${fire.priceGold} 🪙)`}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 bg-[#181818] border-t-4 border-[#ffffff] flex justify-end">
          <button
            onClick={onClose}
            className="bg-[#881400] border-2 border-[#fce000] text-white px-4 py-1.5 text-xs font-bold hover:bg-[#d82800] active:scale-95"
          >
            CERRAR
          </button>
        </div>

      </div>
    </div>
  );
};
