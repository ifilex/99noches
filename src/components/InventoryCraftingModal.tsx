import React, { useState } from 'react';
import { GameEngine } from '../game/engine';
import { CAMPFIRE_UPGRADES, CRAFTING_RECIPES, ITEM_DEFINITIONS, SKILL_NODES } from '../game/constants';
import { ItemType } from '../types';

interface InventoryCraftingModalProps {
  engine: GameEngine;
  onClose: () => void;
}

export const InventoryCraftingModal: React.FC<InventoryCraftingModalProps> = ({ engine, onClose }) => {
  const [tab, setTab] = useState<'crafting' | 'inventory' | 'campfire' | 'skills'>('crafting');
  const [craftCategory, setCraftCategory] = useState<'all' | 'tools' | 'weapons' | 'defense' | 'food' | 'survival'>('all');

  const p = engine.state.player;
  const campfire = engine.getCampfire();
  const campfireLvl = campfire?.level || 1;

  const filteredRecipes = CRAFTING_RECIPES.filter(
    r => craftCategory === 'all' || r.category === craftCategory
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-2 sm:p-4 font-mono select-none">
      <div className="bg-[#000000] border-4 border-[#ffffff] outline outline-4 outline-[#000000] w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl text-white">
        
        {/* Zelda 1 Subscreen Top Title Bar */}
        <div className="bg-[#181818] border-b-4 border-[#ffffff] p-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[#fce000] text-base">►</span>
            <span className="text-xs sm:text-sm font-bold text-[#fce000] tracking-wider">
              - SUBSCREEN / INVENTARIO -
            </span>
          </div>
          <button
            id="close-subscreen-btn"
            onClick={onClose}
            className="bg-[#881400] border-2 border-[#fce000] text-white px-2.5 py-0.5 text-xs font-bold hover:bg-[#d82800] active:scale-95"
          >
            VOLVER (ESC)
          </button>
        </div>

        {/* NES Tab Selectors */}
        <div className="grid grid-cols-4 border-b-4 border-[#585858] bg-[#101010]">
          <button
            id="subscreen-tab-crafting"
            onClick={() => setTab('crafting')}
            className={`py-2.5 text-xs sm:text-sm font-black border-r-2 border-[#585858] transition-all ${
              tab === 'crafting' ? 'bg-[#503000] text-[#fce000] border-b-4 border-b-[#fce000]' : 'text-zinc-300 hover:bg-[#202020]'
            }`}
          >
            🔨 CRAFTEO
          </button>
          <button
            id="subscreen-tab-inventory"
            onClick={() => setTab('inventory')}
            className={`py-2.5 text-xs sm:text-sm font-black border-r-2 border-[#585858] transition-all ${
              tab === 'inventory' ? 'bg-[#503000] text-[#fce000] border-b-4 border-b-[#fce000]' : 'text-zinc-300 hover:bg-[#202020]'
            }`}
          >
            🎒 BOLSA ({p.inventory.length}/16)
          </button>
          <button
            id="subscreen-tab-campfire"
            onClick={() => setTab('campfire')}
            className={`py-2.5 text-xs sm:text-sm font-black border-r-2 border-[#585858] transition-all ${
              tab === 'campfire' ? 'bg-[#503000] text-[#fce000] border-b-4 border-b-[#fce000]' : 'text-zinc-300 hover:bg-[#202020]'
            }`}
          >
            🔥 FOGATA (Lv.{campfireLvl})
          </button>
          <button
            id="subscreen-tab-skills"
            onClick={() => setTab('skills')}
            className={`py-2.5 text-xs sm:text-sm font-black transition-all ${
              tab === 'skills' ? 'bg-[#503000] text-[#fce000] border-b-4 border-b-[#fce000]' : 'text-zinc-300 hover:bg-[#202020]'
            }`}
          >
            ⭐ PERKS ({p.stats.skillPoints})
          </button>
        </div>

        {/* Subscreen Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-[#000000]">
          
          {/* TAB 1: CRAFTING */}
          {tab === 'crafting' && (
            <div>
              {/* Category Filter Chips */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {(['all', 'tools', 'weapons', 'defense', 'food', 'survival'] as const).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCraftCategory(cat)}
                    className={`px-3 py-1 text-xs uppercase font-bold border-2 transition-all ${
                      craftCategory === cat
                        ? 'bg-[#fce000] text-black border-[#fce000]'
                        : 'bg-[#181818] text-zinc-200 border-[#585858] hover:bg-[#282828]'
                    }`}
                  >
                    {cat === 'all' ? 'Todos' : cat === 'tools' ? 'Herramientas' : cat === 'weapons' ? 'Armas' : cat === 'defense' ? 'Defensas' : cat === 'food' ? 'Comida' : 'Supervivencia'}
                  </button>
                ))}
              </div>

              {/* Recipes Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {filteredRecipes.map(recipe => {
                  const resultDef = ITEM_DEFINITIONS[recipe.result];
                  const hasCampLevel = !recipe.requiresCampfireLevel || campfireLvl >= recipe.requiresCampfireLevel;
                  const canCraft =
                    hasCampLevel &&
                    recipe.ingredients.every(ing => engine.hasItem(ing.item, ing.count));

                  return (
                    <div
                      key={recipe.id}
                      className={`p-3 border-2 flex flex-col justify-between ${
                        canCraft
                          ? 'bg-[#10141c] border-white shadow-md'
                          : 'bg-[#0a0a0a] border-[#383838] opacity-80'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{resultDef?.iconPixel || '📦'}</span>
                            <span className="font-black text-sm text-[#fce000]">{recipe.name}</span>
                          </div>
                          {recipe.requiresCampfireLevel && (
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 border ${
                                hasCampLevel ? 'border-[#58d854] text-[#58d854]' : 'border-[#d82800] text-[#d82800]'
                              }`}
                            >
                              Fogata Lv.{recipe.requiresCampfireLevel}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-200 mt-1.5 leading-relaxed">
                          {resultDef?.description}
                        </p>

                        {/* Ingredients */}
                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                          {recipe.ingredients.map(ing => {
                            const ingDef = ITEM_DEFINITIONS[ing.item];
                            const currentCount = engine.getItemCount(ing.item);
                            const hasEnough = currentCount >= ing.count;

                            return (
                              <span
                                key={ing.item}
                                className={`text-[10px] sm:text-xs font-bold px-2 py-1 border flex items-center gap-1.5 ${
                                  hasEnough
                                    ? 'bg-[#003800] border-[#00a800] text-[#88f870]'
                                    : 'bg-[#380000] border-[#881400] text-[#fc7400]'
                                }`}
                              >
                                <span className="text-sm">{ingDef?.iconPixel}</span>
                                <span>
                                  {currentCount}/{ing.count}
                                </span>
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      <button
                        id={`craft-btn-${recipe.id}`}
                        disabled={!canCraft}
                        onClick={() => engine.craftRecipe(recipe.id)}
                        className={`w-full mt-3 py-2 text-xs font-black uppercase border-2 transition-all ${
                          canCraft
                            ? 'bg-[#881400] border-[#fce000] text-white hover:bg-[#d82800] active:scale-95 shadow-lg'
                            : 'bg-[#202020] border-[#404040] text-zinc-500 cursor-not-allowed'
                        }`}
                      >
                        {canCraft ? '⚡ FABRICAR' : 'MATERIALES INSUFICIENTES'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: INVENTORY */}
          {tab === 'inventory' && (
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-2">
                {p.inventory.map((slot, idx) => {
                  const def = ITEM_DEFINITIONS[slot.item];
                  const isSelected = p.selectedSlotIndex === idx;

                  return (
                    <div
                      key={idx}
                      onClick={() => (p.selectedSlotIndex = idx)}
                      className={`p-2.5 border-2 cursor-pointer relative flex flex-col items-center justify-center transition-all ${
                        isSelected
                          ? 'border-[#fce000] bg-[#383838] shadow-[0_0_12px_#fce000]'
                          : 'border-[#585858] bg-[#101010] hover:border-[#a4a4a4]'
                      }`}
                    >
                      <span className="text-3xl">{def?.iconPixel || '—'}</span>
                      <span className="text-xs font-black text-[#fce000] mt-1 text-center truncate w-full">
                        {def?.name}
                      </span>
                      <span className="absolute top-1 right-1 text-xs font-black text-white bg-black px-1.5 py-0.5 border border-zinc-500 rounded-xs">
                        x{slot.count}
                      </span>
                      {isSelected && (
                        <span className="absolute top-1 left-1 text-[9px] text-[#fce000] font-black bg-black/80 px-1 border border-[#fce000]">
                          EQUIPADO
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Selected Item Details */}
              {p.inventory[p.selectedSlotIndex] && (
                <div className="p-3 bg-[#181818] border-2 border-[#fce000] flex items-center justify-between">
                  <div>
                    <div className="font-black text-sm text-[#fce000]">
                      {ITEM_DEFINITIONS[p.inventory[p.selectedSlotIndex].item]?.name}
                    </div>
                    <div className="text-xs text-zinc-200 mt-1">
                      {ITEM_DEFINITIONS[p.inventory[p.selectedSlotIndex].item]?.description}
                    </div>
                  </div>
                  <button
                    onClick={() => engine.performActionB()}
                    className="bg-[#881400] border-2 border-white text-white px-4 py-2 text-xs font-black hover:bg-[#d82800] active:scale-95"
                  >
                    USAR (B / K)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CAMPFIRE */}
          {tab === 'campfire' && campfire && (
            <div className="space-y-3">
              <div className="p-3 bg-[#181818] border-2 border-[#fc7400] flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-[#fce000]">
                    🔥 Fogata Nivel {campfire.level} / 5
                  </div>
                  <div className="text-xs text-zinc-200 mt-1">
                    Combustible: {Math.ceil(campfire.fuel || 0)} / {campfire.maxFuel} • Radio Luz: {campfire.lightRadius}px
                  </div>
                </div>
                <button
                  onClick={() => engine.feedCampfire()}
                  className="bg-[#881400] border-2 border-[#fce000] text-white px-4 py-2 text-xs font-black hover:bg-[#d82800] active:scale-95"
                >
                  🪵 ALIMENTAR FUEGO
                </button>
              </div>

              {/* Campfire Evolution Path */}
              <div className="space-y-2">
                <div className="text-xs font-black text-[#fce000]">
                  - ÁRBOL DE MEJORA DE LA FOGATA -
                </div>
                {CAMPFIRE_UPGRADES.map(upg => {
                  const isCurrent = campfire.level === upg.level;
                  const isUnlocked = (campfire.level || 1) >= upg.level;
                  const canUpgradeNext = (campfire.level || 1) + 1 === upg.level;

                  return (
                    <div
                      key={upg.level}
                      className={`p-3 border-2 flex items-center justify-between ${
                        isCurrent
                          ? 'border-[#fce000] bg-[#302000]'
                          : isUnlocked
                          ? 'border-[#58d854] bg-[#002000] opacity-80'
                          : 'border-[#404040] bg-[#101010] opacity-60'
                      }`}
                    >
                      <div>
                        <div className="font-black text-sm text-[#fce000]">
                          Lv.{upg.level} - {upg.name}
                        </div>
                        <div className="text-xs text-zinc-300 mt-0.5">
                          Capacidad: {upg.fuelCapacity} • Luz: +{upg.lightRadius} • {upg.unlockedCrafts}
                        </div>
                      </div>

                      {canUpgradeNext && (
                        <button
                          onClick={() => engine.upgradeCampfire()}
                          className="bg-[#fce000] text-black px-3.5 py-1.5 text-xs font-black hover:bg-white active:scale-95 shadow-md"
                        >
                          SUBIR NIVEL
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: SKILLS / PERKS */}
          {tab === 'skills' && (
            <div className="space-y-2">
              <div className="text-xs font-black text-[#fce000] flex items-center justify-between">
                <span>- PERKS DEL SUPERVIVIENTE -</span>
                <span>⭐ Puntos Disponibles: {p.stats.skillPoints}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {SKILL_NODES.map(skill => {
                  const currentLvl = engine.getSkillLevel(skill.id);
                  const isMax = currentLvl >= skill.maxLevel;
                  const canUpgrade = p.stats.skillPoints >= skill.costPerLevel && !isMax;

                  return (
                    <div
                      key={skill.id}
                      className="p-3 bg-[#101010] border-2 border-[#585858] flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-black text-sm text-[#fce000]">{skill.name}</span>
                          <span className="text-xs font-bold text-zinc-400">
                            {currentLvl}/{skill.maxLevel}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-200 mt-1">{skill.description}</p>
                      </div>

                      <button
                        disabled={!canUpgrade}
                        onClick={() => engine.upgradeSkill(skill.id)}
                        className={`mt-2.5 py-1.5 text-xs font-black uppercase border transition-all ${
                          canUpgrade
                            ? 'bg-[#881400] border-[#fce000] text-white hover:bg-[#d82800] active:scale-95'
                            : 'bg-[#202020] border-[#404040] text-zinc-500 cursor-not-allowed'
                        }`}
                      >
                        {isMax ? 'MÁXIMO' : `MEJORAR (${skill.costPerLevel} ⭐)`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
