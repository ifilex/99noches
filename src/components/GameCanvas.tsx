import React, { useEffect, useRef } from 'react';
import { GameEngine } from '../game/engine';
import { COSMETIC_SKINS, ITEM_DEFINITIONS } from '../game/constants';
import { soundEngine } from '../audio/soundEngine';
import { TILE_BRIDGE, TILE_CLIFF, TILE_DENSE_TREES, TILE_GRASS, TILE_PATH, TILE_WATER } from '../game/mapGenerator';
import { TILE_SIZE } from '../game/pathfinding';
import { InteriorLocation, InteriorObject } from '../types';

interface GameCanvasProps {
  engine: GameEngine;
  crtFilter: boolean;
  onCanvasClick?: (x: number, y: number) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ engine, crtFilter, onCanvasClick }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    let animationFrameId: number;
    let lastTime = performance.now();
    let lowHealthBeepTimer = 0;

    const render = (time: number) => {
      const dt = Math.min(0.1, (time - lastTime) / 1000);
      lastTime = time;

      // 1. Update Engine
      engine.update(dt);

      // Low health warning check (Zelda 1 iconic beeping when HP < 25%)
      const player = engine.state.player;
      if (player.stats.hp > 0 && player.stats.hp <= player.stats.maxHp * 0.25) {
        lowHealthBeepTimer += dt;
        if (lowHealthBeepTimer >= 0.8) {
          lowHealthBeepTimer = 0;
          soundEngine.triggerLowHealthBeep();
        }
      } else {
        lowHealthBeepTimer = 0;
      }

      const width = canvas.width;
      const height = canvas.height;
      const state = engine.state;
      const camera = state.camera;
      const isOverworld = state.currentLocation === 'overworld';

      // Screen Shake
      const shakeX = (Math.random() - 0.5) * camera.shake;
      const shakeY = (Math.random() - 0.5) * camera.shake;
      const offsetX = Math.floor(width / 2 - camera.x + shakeX);
      const offsetY = Math.floor(height / 2 - camera.y + shakeY);

      // 2. Clear Screen
      ctx.fillStyle = state.isNight ? '#001800' : '#000000';
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.translate(offsetX, offsetY);

      if (isOverworld) {
        // ==========================================
        // OVERWORLD RENDERING (ZELDA 1 8-BIT TILES)
        // ==========================================
        drawZeldaOverworldTiles(ctx, engine, camera, width, height);

        // Structures (Campfire, Crafting table, Cabins exterior, Cages)
        state.structures.forEach(st => {
          drawZeldaStructure(ctx, st, state.isNight);
        });

        // Interactive Props (Monolito de las Sombras, Pozo Alquímico, Altar del Fuego, Tumba)
        state.interactiveProps.forEach(prop => {
          drawZeldaInteractiveProp(ctx, prop);
        });

        // Resource Nodes (Trees, Boulders, Iron, Coal, Bushes, Mushrooms, Crates)
        state.resourceNodes.forEach(node => {
          if (!node.depleted) {
            drawZeldaResourceNode(ctx, node);
          }
        });

        // Drops
        state.drops.forEach(drop => {
          drawZeldaDrop(ctx, drop);
        });

        // Story NPCs (Erudito Vaelen, Bruja Morrigan, Espectro de Alden)
        state.storyNpcs.forEach(npc => {
          drawZeldaStoryNpc(ctx, npc);
        });

        // Rescued Campers & Pet
        state.campers.forEach(c => {
          if (c.state !== 'caged') {
            drawZeldaCamper(ctx, c);
          }
        });
        if (state.pet) {
          drawZeldaPet(ctx, state.pet);
        }

        // Animals
        state.animals.forEach(a => {
          drawZeldaAnimal(ctx, a);
        });

        // Monsters & Bosses
        state.monsters.forEach(m => {
          drawZeldaMonster(ctx, m);
        });
      } else {
        // ==========================================
        // INTERIOR ROOM RENDERING (CABIN OR CAVE)
        // ==========================================
        const interior = state.interiors[state.currentLocation];
        if (interior) {
          drawZeldaInterior(ctx, interior);
        }
      }

      // Player Entity
      drawZeldaPlayer(ctx, state.player);

      // Projectiles & Particles
      state.projectiles.forEach(p => {
        drawZeldaProjectile(ctx, p);
      });
      state.particles.forEach(pt => {
        drawZeldaParticle(ctx, pt);
      });

      // Floating Texts
      state.floatingTexts.forEach(ft => {
        ctx.save();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.fillStyle = ft.color;
        ctx.font = 'bold 14px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });

      ctx.restore();

      // ==========================================
      // NIGHT LIGHTING MASK & AMBIENT SHADOWS
      // ==========================================
      if (isOverworld && (state.isNight || state.isSunset)) {
        drawNightDarknessMask(ctx, width, height, offsetX, offsetY, state);
      }

      // ==========================================
      // ZELDA 1 RETRO DIALOGUE / INFORMATION BOX
      // ==========================================
      if (state.dialogueBox.active) {
        drawZeldaDialogueBox(ctx, width, height, state.dialogueBox);
      } else if (state.nearbyInteractionPrompt) {
        // Floating Context Prompt badge at bottom center
        drawInteractionPromptBadge(ctx, width, height, state.nearbyInteractionPrompt);
      }

      // Optional Scanline CRT Overlay
      if (crtFilter) {
        drawCRTScanlines(ctx, width, height);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [engine, crtFilter]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    // If dialogue box is active, handle choice selection or advance
    if (engine.state.dialogueBox.active) {
      const db = engine.state.dialogueBox;
      if (db.choices && db.choices.length > 0) {
        // Calculate choice area
        const boxW = Math.min(canvas.width - 24, 760);
        const boxH = 180;
        const boxX = (canvas.width - boxW) / 2;
        const boxY = canvas.height - boxH - 20;
        const choiceStartY = boxY + 95;

        if (clickX >= boxX && clickX <= boxX + boxW) {
          const choiceIndex = Math.floor((clickY - choiceStartY) / 24);
          if (choiceIndex >= 0 && choiceIndex < db.choices.length) {
            engine.confirmDialogueChoice(choiceIndex);
            return;
          }
        }
        engine.confirmDialogueChoice();
      } else {
        engine.advanceDialogue();
      }
      return;
    }

    if (onCanvasClick) {
      onCanvasClick(clickX, clickY);
    }
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        width={768}
        height={480}
        onClick={handleClick}
        className="w-full h-full object-contain cursor-crosshair"
        style={{
          imageRendering: 'pixelated',
        }}
      />
    </div>
  );
};

// ============================================================================
// DRAWING HELPERS: AUTHENTIC 8-BIT FAMICOM / ZELDA 1 RENDERING
// ============================================================================

function drawZeldaOverworldTiles(
  ctx: CanvasRenderingContext2D,
  engine: GameEngine,
  camera: { x: number; y: number },
  viewportWidth: number,
  viewportHeight: number
) {
  const map = engine.mapData;
  const cols = map.tileCols;
  const rows = map.tileRows;
  const tiles = map.tiles;

  const minCol = Math.max(0, Math.floor((camera.x - viewportWidth / 2) / TILE_SIZE) - 1);
  const maxCol = Math.min(cols - 1, Math.ceil((camera.x + viewportWidth / 2) / TILE_SIZE) + 1);
  const minRow = Math.max(0, Math.floor((camera.y - viewportHeight / 2) / TILE_SIZE) - 1);
  const maxRow = Math.min(rows - 1, Math.ceil((camera.y + viewportHeight / 2) / TILE_SIZE) + 1);

  const isNight = engine.state.isNight;
  const animWave = Math.floor((performance.now() / 400) % 2);

  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      const tile = tiles[r * cols + c];
      const px = c * TILE_SIZE;
      const py = r * TILE_SIZE;

      if (tile === TILE_GRASS) {
        // NES Zelda Grass
        ctx.fillStyle = isNight ? '#002800' : '#005800';
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        // Pixel grass tufts
        ctx.fillStyle = isNight ? '#004000' : '#00a800';
        ctx.fillRect(px + 6, py + 8, 4, 4);
        ctx.fillRect(px + 20, py + 22, 4, 4);
      } else if (tile === TILE_PATH) {
        // NES Dirt / Sand Path
        ctx.fillStyle = isNight ? '#503810' : '#a87830';
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        // Small path pebbles
        ctx.fillStyle = isNight ? '#302008' : '#704818';
        ctx.fillRect(px + 4, py + 12, 3, 3);
        ctx.fillRect(px + 18, py + 4, 3, 3);
        ctx.fillRect(px + 22, py + 20, 3, 3);
      } else if (tile === TILE_WATER) {
        // NES Deep Blue Water with animated ripple scanlines
        ctx.fillStyle = isNight ? '#001840' : '#005888';
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = isNight ? '#003880' : '#3cbcfc';
        const rippleX = (c + r + animWave) % 2 === 0 ? 4 : 16;
        ctx.fillRect(px + rippleX, py + 10, 10, 2);
        ctx.fillRect(px + ((rippleX + 12) % 24), py + 22, 8, 2);
      } else if (tile === TILE_CLIFF) {
        // Mountain Rock Cliff Edge
        ctx.fillStyle = isNight ? '#202020' : '#585858';
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = isNight ? '#101010' : '#303030';
        ctx.fillRect(px, py + 20, TILE_SIZE, 12);
        ctx.fillStyle = isNight ? '#383838' : '#888888';
        ctx.fillRect(px + 4, py + 4, 8, 4);
      } else if (tile === TILE_BRIDGE) {
        // Wooden Bridge Planks over Water
        ctx.fillStyle = isNight ? '#001840' : '#005888';
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = isNight ? '#482808' : '#885818';
        ctx.fillRect(px, py + 4, TILE_SIZE, TILE_SIZE - 8);
        ctx.fillStyle = isNight ? '#281404' : '#503008';
        ctx.fillRect(px, py + 4, TILE_SIZE, 2);
        ctx.fillRect(px, py + TILE_SIZE - 6, TILE_SIZE, 2);
        ctx.fillRect(px + 8, py + 6, 2, TILE_SIZE - 12);
        ctx.fillRect(px + 20, py + 6, 2, TILE_SIZE - 12);
      }
    }
  }
}

// Interior Room (Cabin or Cave)
function drawZeldaInterior(ctx: CanvasRenderingContext2D, interior: InteriorLocation) {
  const roomW = interior.width * TILE_SIZE;
  const roomH = interior.height * TILE_SIZE;

  const isCabin = interior.type === 'cabin';

  // Room Wall Borders
  for (let r = 0; r < interior.height; r++) {
    for (let c = 0; c < interior.width; c++) {
      const px = c * TILE_SIZE;
      const py = r * TILE_SIZE;
      const isBorder = r === 0 || r === interior.height - 1 || c === 0 || c === interior.width - 1;

      if (isBorder) {
        if (isCabin) {
          // Wooden Log Cabin Wall
          ctx.fillStyle = '#503008';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.fillStyle = '#885818';
          ctx.fillRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        } else {
          // Dungeon Stone Wall
          ctx.fillStyle = '#202020';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.fillStyle = '#404040';
          ctx.fillRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
          ctx.fillStyle = '#101010';
          ctx.fillRect(px + 4, py + 14, TILE_SIZE - 8, 2);
        }
      } else {
        if (isCabin) {
          // Parquet Wooden Floor
          ctx.fillStyle = '#704818';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.fillStyle = '#503008';
          ctx.fillRect(px, py + TILE_SIZE - 1, TILE_SIZE, 1);
          ctx.fillRect(px + TILE_SIZE - 1, py, 1, TILE_SIZE);
        } else {
          // Cave Stone Floor
          ctx.fillStyle = '#181818';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.fillStyle = '#282828';
          ctx.fillRect(px + 4, py + 4, 3, 3);
          ctx.fillRect(px + 20, py + 18, 3, 3);
        }
      }
    }
  }

  // Exit Door Portal
  const exit = interior.exitDoor;
  ctx.fillStyle = '#fce000';
  ctx.fillRect(exit.x - 2, exit.y - 2, exit.width + 4, exit.height + 4);
  ctx.fillStyle = '#000000';
  ctx.fillRect(exit.x, exit.y, exit.width, exit.height);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 9px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('SALIDA', exit.x + exit.width / 2, exit.y + 12);

  // Interior Objects
  interior.objects.forEach(obj => {
    drawZeldaInteriorObject(ctx, obj, isCabin);
  });
}

function drawZeldaInteriorObject(ctx: CanvasRenderingContext2D, obj: InteriorObject, isCabin: boolean) {
  const ox = obj.x;
  const oy = obj.y;

  if (obj.type === 'fireplace') {
    // Brick Fireplace with animated flames
    ctx.fillStyle = '#881400';
    ctx.fillRect(ox, oy, obj.width, obj.height);
    ctx.fillStyle = '#181818';
    ctx.fillRect(ox + 8, oy + 16, obj.width - 16, obj.height - 16);
    // Fire flames
    const flameH = 12 + Math.floor(Math.sin(performance.now() * 0.01) * 4);
    ctx.fillStyle = '#fc7400';
    ctx.fillRect(ox + 12, oy + obj.height - flameH, obj.width - 24, flameH);
    ctx.fillStyle = '#fce000';
    ctx.fillRect(ox + 16, oy + obj.height - flameH + 4, obj.width - 32, flameH - 4);
  } else if (obj.type === 'bed') {
    // Rustic Bed
    ctx.fillStyle = '#885818';
    ctx.fillRect(ox, oy, obj.width, obj.height);
    ctx.fillStyle = '#d82800'; // Red blanket
    ctx.fillRect(ox + 4, oy + 16, obj.width - 8, obj.height - 20);
    ctx.fillStyle = '#f8f8f8'; // White pillow
    ctx.fillRect(ox + 8, oy + 4, obj.width - 16, 10);
  } else if (obj.type === 'chest') {
    // Zelda Chest
    ctx.fillStyle = obj.opened ? '#404040' : '#885818';
    ctx.fillRect(ox, oy, obj.width, obj.height);
    ctx.fillStyle = obj.opened ? '#202020' : '#fce000';
    ctx.fillRect(ox + obj.width / 2 - 4, oy + obj.height / 2 - 4, 8, 8);
  } else if (obj.type === 'torch') {
    // Blue/Red Torch on Wall Sconce
    ctx.fillStyle = '#585858';
    ctx.fillRect(ox + 8, oy + 12, 8, 16);
    const torchColor = Math.random() > 0.5 ? '#3cbcfc' : '#0088ff';
    ctx.fillStyle = torchColor;
    ctx.fillRect(ox + 4, oy + 4, 16, 10);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(ox + 8, oy + 6, 8, 6);
  } else if (obj.type === 'sage_npc') {
    // Old Sage Hermit (Zelda 1 style with robes and long white beard)
    ctx.fillStyle = '#d82800'; // Red robe
    ctx.fillRect(ox + 4, oy + 12, 24, 20);
    ctx.fillStyle = '#f8b800'; // Face
    ctx.fillRect(ox + 8, oy + 4, 16, 12);
    ctx.fillStyle = '#f8f8f8'; // Beard
    ctx.fillRect(ox + 8, oy + 12, 16, 12);
    ctx.fillStyle = '#000000'; // Eyes
    ctx.fillRect(ox + 10, oy + 8, 3, 3);
    ctx.fillRect(ox + 19, oy + 8, 3, 3);
  } else if (obj.type === 'bookshelf' || obj.type === 'altar') {
    ctx.fillStyle = '#503008';
    ctx.fillRect(ox, oy, obj.width, obj.height);
    ctx.fillStyle = '#3cbcfc';
    ctx.fillRect(ox + 4, oy + 6, obj.width - 8, 8);
    ctx.fillStyle = '#d82800';
    ctx.fillRect(ox + 4, oy + 18, obj.width - 8, 8);
  }
}

// Structures (Campfire, Crafting table, Cabins exterior, Cages)
function drawZeldaStructure(ctx: CanvasRenderingContext2D, st: any, isNight: boolean) {
  const sx = st.x;
  const sy = st.y;

  if (st.kind === 'campfire') {
    // Campfire with stone ring and dancing fire
    ctx.fillStyle = '#585858';
    ctx.fillRect(sx + 4, sy + 4, st.width - 8, st.height - 8);
    ctx.fillStyle = '#885818';
    ctx.fillRect(sx + 10, sy + 18, st.width - 20, 10);

    if (st.fuel > 0) {
      const flameH = 16 + Math.floor(Math.sin(performance.now() * 0.015) * 6);
      ctx.fillStyle = '#fc7400';
      ctx.fillRect(sx + 14, sy + st.height - 12 - flameH, st.width - 28, flameH);
      ctx.fillStyle = '#fce000';
      ctx.fillRect(sx + 18, sy + st.height - 8 - flameH, st.width - 36, flameH - 6);
    }
  } else if (st.kind === 'cabin_ruin') {
    // Overworld Wooden Cabin Structure with Enterable Door
    // Roof
    ctx.fillStyle = '#503008';
    ctx.fillRect(sx, sy, st.width, 36);
    ctx.fillStyle = '#881400'; // Red tiled shingles
    ctx.fillRect(sx + 4, sy + 4, st.width - 8, 28);
    // Chimney with pixel smoke
    ctx.fillStyle = '#404040';
    ctx.fillRect(sx + st.width - 24, sy - 12, 14, 16);
    ctx.fillStyle = '#d8d8d8';
    ctx.fillRect(sx + st.width - 22, sy - 18 - (Math.floor(performance.now() * 0.005) % 8), 6, 6);

    // Cabin Log Walls
    ctx.fillStyle = '#885818';
    ctx.fillRect(sx + 4, sy + 36, st.width - 8, st.height - 36);
    ctx.fillStyle = '#503008';
    ctx.fillRect(sx + 4, sy + 52, st.width - 8, 2);
    ctx.fillRect(sx + 4, sy + 68, st.width - 8, 2);

    // Glowing Doorway
    ctx.fillStyle = '#fce000'; // Yellow interior glow
    ctx.fillRect(sx + 36, sy + st.height - 24, 24, 24);
    ctx.fillStyle = '#000000';
    ctx.fillRect(sx + 38, sy + st.height - 22, 20, 22);

    // Window
    ctx.fillStyle = '#3cbcfc';
    ctx.fillRect(sx + 12, sy + 44, 14, 14);
    ctx.fillRect(sx + st.width - 26, sy + 44, 14, 14);
  } else if (st.kind === 'crafting_table') {
    ctx.fillStyle = '#885818';
    ctx.fillRect(sx, sy, st.width, st.height);
    ctx.fillStyle = '#503008';
    ctx.fillRect(sx + 4, sy + 4, st.width - 8, 4);
    ctx.fillStyle = '#fce000';
    ctx.fillRect(sx + 8, sy + 14, 8, 8);
  } else if (st.kind === 'storage_chest') {
    ctx.fillStyle = '#885818';
    ctx.fillRect(sx, sy, st.width, st.height);
    ctx.fillStyle = '#fce000';
    ctx.fillRect(sx + st.width / 2 - 3, sy + st.height / 2 - 3, 6, 6);
  } else if (st.kind === 'cage') {
    ctx.fillStyle = '#585858';
    ctx.fillRect(sx, sy, st.width, st.height);
    ctx.fillStyle = '#000000';
    ctx.fillRect(sx + 4, sy + 4, st.width - 8, st.height - 8);
    ctx.fillStyle = '#888888';
    for (let bx = sx + 8; bx < sx + st.width - 6; bx += 8) {
      ctx.fillRect(bx, sy + 4, 3, st.height - 8);
    }
  } else if (st.kind === 'wooden_wall') {
    ctx.fillStyle = '#885818';
    ctx.fillRect(sx, sy, st.width, st.height);
    ctx.fillStyle = '#503008';
    ctx.fillRect(sx + 4, sy + 4, st.width - 8, st.height - 8);
  } else if (st.kind === 'spike_trap' || st.kind === 'bear_trap') {
    ctx.fillStyle = '#585858';
    ctx.fillRect(sx + 4, sy + 4, st.width - 8, st.height - 8);
    ctx.fillStyle = '#fc7400';
    ctx.fillRect(sx + 8, sy + 8, st.width - 16, st.height - 16);
  }
}

// Resource Nodes (Zelda 1 Trees, Boulders, Ores, Bushes)
function drawZeldaResourceNode(ctx: CanvasRenderingContext2D, node: any) {
  const nx = node.x;
  const ny = node.y;

  if (node.resourceType === 'tree') {
    // Zelda 1 Iconic Round Tree
    // Trunk
    ctx.fillStyle = '#885818';
    ctx.fillRect(nx + 12, ny + 24, 12, 20);
    // Green Foliage
    ctx.fillStyle = '#004000';
    ctx.fillRect(nx, ny + 2, 36, 26);
    ctx.fillStyle = '#00a800';
    ctx.fillRect(nx + 4, ny + 4, 28, 20);
    ctx.fillStyle = '#58d854';
    ctx.fillRect(nx + 8, ny + 8, 8, 8);
  } else if (node.resourceType === 'stone_rock') {
    // Zelda Boulders
    ctx.fillStyle = '#585858';
    ctx.fillRect(nx, ny, node.width, node.height);
    ctx.fillStyle = '#888888';
    ctx.fillRect(nx + 4, ny + 4, node.width - 8, node.height - 8);
    ctx.fillStyle = '#303030';
    ctx.fillRect(nx + 8, ny + node.height - 8, node.width - 12, 4);
  } else if (node.resourceType === 'iron_rock') {
    // Iron Ore with silver sparkles
    ctx.fillStyle = '#585858';
    ctx.fillRect(nx, ny, node.width, node.height);
    ctx.fillStyle = '#3cbcfc';
    ctx.fillRect(nx + 6, ny + 6, 6, 6);
    ctx.fillRect(nx + 18, ny + 14, 8, 6);
  } else if (node.resourceType === 'coal_rock') {
    // Coal Rock with black/ember flecks
    ctx.fillStyle = '#181818';
    ctx.fillRect(nx, ny, node.width, node.height);
    ctx.fillStyle = '#fc7400';
    ctx.fillRect(nx + 6, ny + 6, 4, 4);
    ctx.fillRect(nx + 16, ny + 16, 4, 4);
  } else if (node.resourceType === 'berry_bush') {
    ctx.fillStyle = '#005800';
    ctx.fillRect(nx, ny, node.width, node.height);
    ctx.fillStyle = '#d82800'; // Red berries
    ctx.fillRect(nx + 4, ny + 4, 6, 6);
    ctx.fillRect(nx + 16, ny + 8, 6, 6);
    ctx.fillRect(nx + 10, ny + 16, 6, 6);
  } else if (node.resourceType === 'mushroom_patch') {
    ctx.fillStyle = '#d82800';
    ctx.fillRect(nx + 4, ny + 4, 16, 12);
    ctx.fillStyle = '#f8f8f8';
    ctx.fillRect(nx + 6, ny + 6, 4, 4);
    ctx.fillRect(nx + 14, ny + 6, 4, 4);
    ctx.fillRect(nx + 9, ny + 16, 6, 6);
  } else if (node.resourceType === 'crate') {
    // Signpost or Wooden Crate
    ctx.fillStyle = '#885818';
    ctx.fillRect(nx, ny, node.width, node.height);
    ctx.fillStyle = '#f8b800';
    ctx.fillRect(nx + 4, ny + 4, node.width - 8, node.height - 8);
    ctx.fillStyle = '#000000';
    ctx.fillRect(nx + 8, ny + 10, node.width - 16, 2);
  }
}

// Drops
function drawZeldaDrop(ctx: CanvasRenderingContext2D, drop: any) {
  const dx = drop.x;
  const dy = drop.y + (drop.bobOffset || 0);

  if (drop.item === 'forest_gold_coin') {
    // Zelda Gold Rupee / Coin
    ctx.fillStyle = '#fce000';
    ctx.fillRect(dx + 4, dy + 2, 12, 16);
    ctx.fillStyle = '#fc7400';
    ctx.fillRect(dx + 6, dy + 4, 8, 12);
  } else if (drop.item === 'cooked_meat') {
    ctx.fillStyle = '#d82800';
    ctx.fillRect(dx + 2, dy + 4, 16, 12);
    ctx.fillStyle = '#f8f8f8';
    ctx.fillRect(dx + 16, dy + 8, 4, 4);
  } else {
    ctx.fillStyle = '#58d854';
    ctx.fillRect(dx + 4, dy + 4, 12, 12);
    ctx.fillStyle = '#f8f8f8';
    ctx.fillRect(dx + 6, dy + 6, 8, 8);
  }
}

// Rescued Campers
function drawZeldaCamper(ctx: CanvasRenderingContext2D, c: any) {
  const cx = c.x;
  const cy = c.y;

  ctx.fillStyle = '#005888'; // Blue shirt
  ctx.fillRect(cx + 4, cy + 10, 20, 16);
  ctx.fillStyle = '#f8b800'; // Face
  ctx.fillRect(cx + 6, cy + 2, 16, 10);
  ctx.fillStyle = '#000000'; // Eyes
  ctx.fillRect(cx + 9, cy + 5, 2, 3);
  ctx.fillRect(cx + 17, cy + 5, 2, 3);
}

// Pet Companion
function drawZeldaPet(ctx: CanvasRenderingContext2D, pet: any) {
  const px = pet.x;
  const py = pet.y;

  if (pet.kind === 'wolf_pup') {
    ctx.fillStyle = '#585858';
    ctx.fillRect(px + 2, py + 6, 16, 12);
    ctx.fillStyle = '#d82800';
    ctx.fillRect(px + 4, py + 8, 2, 2);
  } else if (pet.kind === 'forest_fox') {
    ctx.fillStyle = '#fc7400';
    ctx.fillRect(px + 2, py + 6, 16, 12);
    ctx.fillStyle = '#f8f8f8';
    ctx.fillRect(px + 14, py + 10, 4, 4);
  }
}

// Animals
function drawZeldaAnimal(ctx: CanvasRenderingContext2D, a: any) {
  const ax = a.x - a.width / 2;
  const ay = a.y - a.height / 2;

  if (a.kind === 'rabbit') {
    ctx.fillStyle = '#f8f8f8';
    ctx.fillRect(ax + 4, ay + 6, 12, 12);
    ctx.fillRect(ax + 6, ay, 3, 6);
    ctx.fillRect(ax + 11, ay, 3, 6);
  } else if (a.kind === 'deer') {
    ctx.fillStyle = '#885818';
    ctx.fillRect(ax + 4, ay + 8, 24, 20);
    ctx.fillStyle = '#f8b800';
    ctx.fillRect(ax + 18, ay + 2, 10, 10);
    ctx.fillStyle = '#503008';
    ctx.fillRect(ax + 20, ay - 4, 6, 6); // Antlers
  } else {
    ctx.fillStyle = '#503008';
    ctx.fillRect(ax + 4, ay + 8, 24, 18);
    ctx.fillStyle = '#f8f8f8';
    ctx.fillRect(ax + 2, ay + 14, 4, 4); // Tusk
  }
}

// Monsters & Bosses (8-bit Zelda monsters)
function drawZeldaMonster(ctx: CanvasRenderingContext2D, m: any) {
  const mx = m.x - m.width / 2;
  const my = m.y - m.height / 2;

  if (m.hurtTimer > 0) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(mx, my, m.width, m.height);
    return;
  }

  if (m.isBoss) {
    // Multi-tile Boss
    ctx.fillStyle = m.color;
    ctx.fillRect(mx, my, m.width, m.height);
    ctx.fillStyle = '#d82800'; // Glowing red eyes
    ctx.fillRect(mx + 12, my + 16, 10, 8);
    ctx.fillRect(mx + m.width - 22, my + 16, 10, 8);
    ctx.fillStyle = '#000000';
    ctx.fillRect(mx + 16, my + 36, m.width - 32, 10);
  } else {
    // Standard 8-bit Monster (Octorok / Moblin / Shadow Wolf)
    ctx.fillStyle = m.color;
    ctx.fillRect(mx + 4, my + 6, m.width - 8, m.height - 10);
    ctx.fillStyle = '#d82800'; // Eyes
    ctx.fillRect(mx + 8, my + 10, 4, 4);
    ctx.fillRect(mx + m.width - 12, my + 10, 4, 4);
  }

  // Health bar above monster
  if (m.hp < m.maxHp) {
    const barW = m.width;
    const hpPct = Math.max(0, m.hp / m.maxHp);
    ctx.fillStyle = '#000000';
    ctx.fillRect(mx, my - 8, barW, 4);
    ctx.fillStyle = '#d82800';
    ctx.fillRect(mx, my - 8, barW * hpPct, 4);
  }
}
// Story NPCs (Valeria, Erudito Vaelen, Bruja Morrigan, Espectro de Alden)
function drawZeldaStoryNpc(ctx: CanvasRenderingContext2D, npc: any) {
  const nx = npc.x - npc.width / 2;
  const ny = npc.y - npc.height / 2;
  const bob = Math.floor(Math.sin(performance.now() * 0.004) * 2);

  const npcKey = (npc.npcId || npc.id || '').toLowerCase();

  if (npcKey.includes('valeria')) {
    // Valeria la Guardabosques: Green Forest Tunic, Leather Belt, Auburn Hair, Hunter Bow
    ctx.fillStyle = '#008800'; // Forest green tunic
    ctx.fillRect(nx + 2, ny + 10 + bob, 20, 16);
    ctx.fillStyle = '#885818'; // Leather belt & quiver
    ctx.fillRect(nx + 4, ny + 14 + bob, 16, 4);
    ctx.fillStyle = '#f8b800'; // Face
    ctx.fillRect(nx + 6, ny + 6 + bob, 12, 6);
    ctx.fillStyle = '#b84400'; // Auburn Hair
    ctx.fillRect(nx + 4, ny + 2 + bob, 16, 6);
    ctx.fillStyle = '#ffffff'; // Feather in hair
    ctx.fillRect(nx + 16, ny - 2 + bob, 4, 6);
    ctx.fillStyle = '#885818'; // Bow on back
    ctx.fillRect(nx - 2, ny + 4 + bob, 4, 20);
  } else if (npcKey.includes('vaelen')) {
    // Erudito Vaelen: Blue Robe, White Long Beard, Holding Ancient Glowing Tome
    ctx.fillStyle = '#003880'; // Dark blue robe
    ctx.fillRect(nx + 2, ny + 10 + bob, 20, 16);
    ctx.fillStyle = '#3cbcfc'; // Light blue cowl trim
    ctx.fillRect(nx + 4, ny + 2 + bob, 16, 10);
    ctx.fillStyle = '#f8b800'; // Face
    ctx.fillRect(nx + 6, ny + 6 + bob, 12, 6);
    ctx.fillStyle = '#f8f8f8'; // White Beard
    ctx.fillRect(nx + 6, ny + 12 + bob, 12, 8);
    ctx.fillStyle = '#fce000'; // Golden Tome
    ctx.fillRect(nx + 18, ny + 14 + bob, 8, 10);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(nx + 20, ny + 16 + bob, 4, 6);
  } else if (npcKey.includes('morrigan') || npcKey.includes('blood_emissary')) {
    // Bruja Morrigan: Deep Purple Cloak, Emerald Brooch, Occult Aura
    ctx.fillStyle = '#481868'; // Purple robe
    ctx.fillRect(nx + 2, ny + 10 + bob, 20, 16);
    ctx.fillStyle = '#200830'; // Hood
    ctx.fillRect(nx + 4, ny + 2 + bob, 16, 10);
    ctx.fillStyle = '#f8d878'; // Pale face
    ctx.fillRect(nx + 7, ny + 6 + bob, 10, 6);
    ctx.fillStyle = '#000000'; // Dark eyes
    ctx.fillRect(nx + 8, ny + 8 + bob, 2, 2);
    ctx.fillRect(nx + 14, ny + 8 + bob, 2, 2);
    ctx.fillStyle = '#58d854'; // Glowing green brooch
    ctx.fillRect(nx + 10, ny + 13 + bob, 4, 4);
  } else {
    // Espectro de Alden: Cyan Ethereal Ghost with Translucency and Broken Blade
    ctx.fillStyle = 'rgba(60, 188, 252, 0.75)'; // Ghost cyan
    ctx.fillRect(nx + 2, ny + 4 + bob, 20, 22);
    ctx.fillStyle = 'rgba(248, 248, 248, 0.9)'; // Spectral eyes
    ctx.fillRect(nx + 6, ny + 8 + bob, 3, 3);
    ctx.fillRect(nx + 15, ny + 8 + bob, 3, 3);
    ctx.fillStyle = '#fce000'; // Broken phantom dagger
    ctx.fillRect(nx + 18, ny + 16 + bob, 3, 10);
  }

  // Floating Indicator above head ([💬 HABLAR])
  const pulse = Math.floor((performance.now() / 250) % 2);
  ctx.save();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;
  ctx.fillStyle = pulse === 0 ? '#fce000' : '#ffffff';
  ctx.font = 'bold 12px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.strokeText('💬 [HABLAR]', npc.x, ny - 8);
  ctx.fillText('💬 [HABLAR]', npc.x, ny - 8);
  ctx.restore();
}

// Interactive Props (Monolito, Pozo, Altar, Tumba)
function drawZeldaInteractiveProp(ctx: CanvasRenderingContext2D, prop: any) {
  const px = prop.x - prop.width / 2;
  const py = prop.y - prop.height / 2;
  const propType = (prop.propType || prop.kind || '').toLowerCase();

  if (propType.includes('monolith')) {
    // Monolito de las Sombras: Obsidian pillar with glowing purple runes
    ctx.fillStyle = '#181818';
    ctx.fillRect(px + 4, py, 24, 36);
    ctx.fillStyle = '#303030';
    ctx.fillRect(px + 6, py + 2, 20, 32);
    // Glowing purple runes
    const runeGlow = Math.floor((performance.now() / 300) % 2);
    ctx.fillStyle = runeGlow === 0 ? '#b868f8' : '#d82800';
    ctx.fillRect(px + 14, py + 8, 4, 6);
    ctx.fillRect(px + 10, py + 18, 12, 3);
    ctx.fillRect(px + 14, py + 24, 4, 6);
  } else if (propType.includes('well')) {
    // Pozo Alquímico: Stone well with glowing green waters
    ctx.fillStyle = '#585858';
    ctx.fillRect(px, py + 8, 32, 24);
    ctx.fillStyle = '#303030';
    ctx.fillRect(px + 2, py + 10, 28, 20);
    // Luminescent green water pool
    ctx.fillStyle = '#58d854';
    ctx.fillRect(px + 6, py + 14, 20, 12);
    // Wooden roof support
    ctx.fillStyle = '#885818';
    ctx.fillRect(px + 2, py, 4, 10);
    ctx.fillRect(px + 26, py, 4, 10);
    ctx.fillRect(px, py - 2, 32, 4);
  } else if (propType.includes('altar')) {
    // Altar del Fuego Eterno: Golden Brazier with blazing sacred fire
    ctx.fillStyle = '#503008';
    ctx.fillRect(px + 4, py + 16, 24, 16);
    ctx.fillStyle = '#fce000';
    ctx.fillRect(px + 6, py + 12, 20, 6);
    // Animated Holy Fire Flame
    const flameFlicker = (Math.floor(performance.now() / 100) % 3);
    ctx.fillStyle = '#fc7400';
    ctx.fillRect(px + 8, py + 4 - flameFlicker, 16, 10);
    ctx.fillStyle = '#fce000';
    ctx.fillRect(px + 11, py + 2 - flameFlicker, 10, 8);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px + 14, py - flameFlicker, 4, 4);
  } else {
    // Tumba / Grave: Mossy stone tombstone with cross/sword
    ctx.fillStyle = '#585858';
    ctx.fillRect(px + 4, py + 8, 24, 24);
    ctx.fillStyle = '#383838';
    ctx.fillRect(px + 6, py + 4, 20, 6);
    // Sword engraving
    ctx.fillStyle = '#000000';
    ctx.fillRect(px + 15, py + 12, 2, 14);
    ctx.fillRect(px + 11, py + 16, 10, 2);
  }

  // Floating Indicator above prop
  if (!prop.examined && !prop.isActivated) {
    const pulse = Math.floor((performance.now() / 300) % 2);
    ctx.save();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.fillStyle = pulse === 0 ? '#3cbcfc' : '#ffffff';
    ctx.font = 'bold 11px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.strokeText('✨ [EXAMINAR]', prop.x, py - 6);
    ctx.fillText('✨ [EXAMINAR]', prop.x, py - 6);
    ctx.restore();
  }
}

// Classic Zelda Hero Link-style Sprite with enhanced 8-bit leg walking & weapon swing arcs
function drawZeldaPlayer(ctx: CanvasRenderingContext2D, player: any) {
  const px = player.x - 10;
  const py = player.y - 12;

  // 1. Render Dash Ghost Trails
  if (player.dashTrail && player.dashTrail.length > 0) {
    player.dashTrail.forEach((trail: any) => {
      ctx.save();
      ctx.globalAlpha = trail.alpha * 0.5;
      ctx.fillStyle = '#3cbcfc';
      ctx.fillRect(trail.x - 10, trail.y - 12, 20, 24);
      ctx.restore();
    });
  }

  // 2. Render Attack Trail Arc (crescent swing swoosh)
  if (player.attackTrail && player.attackTrail.length > 0) {
    player.attackTrail.forEach((t: any) => {
      ctx.save();
      ctx.globalAlpha = t.alpha;
      ctx.strokeStyle = t.color || '#3cbcfc';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(player.x, player.y, t.radius || 32, t.angle - 0.6, t.angle + 0.6);
      ctx.stroke();
      ctx.restore();
    });
  }

  if (player.hurtTimer > 0 && Math.floor(performance.now() * 0.02) % 2 === 0) {
    return; // Hurt blink
  }

  const skin = COSMETIC_SKINS.find(s => s.id === player.skin);
  const tunicColor = skin?.colorBody || '#00a800'; // Zelda Green Tunic
  const hatColor = skin?.colorHead || '#005800';

  if (player.isRolling) {
    // Spinning ball / roll puff
    const rollAngle = (performance.now() * 0.02);
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(rollAngle);
    ctx.fillStyle = tunicColor;
    ctx.fillRect(-10, -10, 20, 20);
    ctx.fillStyle = '#f8b800';
    ctx.fillRect(-6, -6, 12, 12);
    ctx.fillStyle = '#885818';
    ctx.fillRect(-8, -2, 16, 4);
    ctx.restore();
    return;
  }

  // Walking Frame calculation (0, 1, 2, 3)
  const walkFrame = player.isMoving ? player.walkFrame : 0;
  const isMoving = player.isMoving;
  const bobY = isMoving && (walkFrame === 1 || walkFrame === 3) ? -1 : 0;

  // LEGS / BOOTS ANIMATION
  ctx.fillStyle = '#503008'; // Brown boots
  if (player.direction === 'down') {
    if (walkFrame === 1) {
      // Left foot forward, right foot back
      ctx.fillRect(px + 3, py + 22 + bobY, 5, 5);
      ctx.fillRect(px + 12, py + 20 + bobY, 4, 4);
    } else if (walkFrame === 3) {
      // Right foot forward, left foot back
      ctx.fillRect(px + 4, py + 20 + bobY, 4, 4);
      ctx.fillRect(px + 12, py + 22 + bobY, 5, 5);
    } else {
      // Idle / Neutral step
      ctx.fillRect(px + 3, py + 21 + bobY, 5, 4);
      ctx.fillRect(px + 12, py + 21 + bobY, 5, 4);
    }
  } else if (player.direction === 'up') {
    if (walkFrame === 1) {
      ctx.fillRect(px + 3, py + 22 + bobY, 5, 4);
      ctx.fillRect(px + 12, py + 19 + bobY, 4, 4);
    } else if (walkFrame === 3) {
      ctx.fillRect(px + 4, py + 19 + bobY, 4, 4);
      ctx.fillRect(px + 12, py + 22 + bobY, 5, 4);
    } else {
      ctx.fillRect(px + 3, py + 21 + bobY, 5, 4);
      ctx.fillRect(px + 12, py + 21 + bobY, 5, 4);
    }
  } else if (player.direction === 'right') {
    if (walkFrame === 1) {
      ctx.fillRect(px + 10, py + 22 + bobY, 6, 4); // Front foot forward
      ctx.fillRect(px + 2, py + 19 + bobY, 5, 4);  // Back foot back
    } else if (walkFrame === 3) {
      ctx.fillRect(px + 4, py + 22 + bobY, 5, 4);
      ctx.fillRect(px + 10, py + 19 + bobY, 5, 4);
    } else {
      ctx.fillRect(px + 5, py + 21 + bobY, 6, 4);
      ctx.fillRect(px + 11, py + 21 + bobY, 4, 4);
    }
  } else if (player.direction === 'left') {
    if (walkFrame === 1) {
      ctx.fillRect(px + 4, py + 22 + bobY, 6, 4);  // Front foot forward
      ctx.fillRect(px + 13, py + 19 + bobY, 5, 4); // Back foot back
    } else if (walkFrame === 3) {
      ctx.fillRect(px + 11, py + 22 + bobY, 5, 4);
      ctx.fillRect(px + 5, py + 19 + bobY, 5, 4);
    } else {
      ctx.fillRect(px + 9, py + 21 + bobY, 6, 4);
      ctx.fillRect(px + 5, py + 21 + bobY, 4, 4);
    }
  }

  // Cap / Hat with directional floppy point
  ctx.fillStyle = hatColor;
  ctx.fillRect(px + 2, py + bobY, 16, 6);
  if (player.direction === 'right') {
    ctx.fillRect(px - 1, py + 1 + bobY, 3, 4);
  } else if (player.direction === 'left') {
    ctx.fillRect(px + 18, py + 1 + bobY, 3, 4);
  } else if (player.direction === 'up') {
    ctx.fillRect(px + 7, py - 2 + bobY, 6, 3);
  }

  // Face & Eyes (or Back of head when facing UP)
  if (player.direction !== 'up') {
    ctx.fillStyle = '#f8b800'; // Face
    ctx.fillRect(px + 4, py + 6 + bobY, 12, 8);

    ctx.fillStyle = '#000000'; // Eyes
    if (player.direction === 'right') {
      ctx.fillRect(px + 12, py + 8 + bobY, 2, 3);
    } else if (player.direction === 'left') {
      ctx.fillRect(px + 6, py + 8 + bobY, 2, 3);
    } else if (player.direction === 'down') {
      ctx.fillRect(px + 6, py + 8 + bobY, 2, 3);
      ctx.fillRect(px + 12, py + 8 + bobY, 2, 3);
    }
  } else {
    // Back of Head (Hair/Hat covering)
    ctx.fillStyle = hatColor;
    ctx.fillRect(px + 3, py + 4 + bobY, 14, 9);
    ctx.fillStyle = '#885818'; // Hair peeking
    ctx.fillRect(px + 4, py + 12 + bobY, 12, 3);
  }

  // Green Tunic Body
  ctx.fillStyle = tunicColor;
  ctx.fillRect(px + 2, py + 14 + bobY, 16, 8);

  // Brown Belt
  ctx.fillStyle = '#885818';
  ctx.fillRect(px + 2, py + 18 + bobY, 16, 2);
  ctx.fillStyle = '#fce000'; // Belt buckle
  ctx.fillRect(px + 8, py + 18 + bobY, 4, 2);

  // Shield on arm
  ctx.fillStyle = '#585858';
  if (player.direction === 'right') {
    ctx.fillRect(px + 1, py + 12 + bobY, 4, 10);
    ctx.fillStyle = '#3cbcfc';
    ctx.fillRect(px + 2, py + 14 + bobY, 2, 6);
  } else if (player.direction === 'left' || player.direction === 'down') {
    ctx.fillRect(px + 15, py + 12 + bobY, 4, 10);
    ctx.fillStyle = '#3cbcfc';
    ctx.fillRect(px + 16, py + 14 + bobY, 2, 6);
  }

  // WEAPON ACTION & SWING ANIMATIONS
  if (player.isAttacking) {
    const swingProg = player.attackSwingProgress || 0.5;
    const attackType = player.attackType || 'sword';

    if (attackType === 'sword' || attackType === 'axe' || attackType === 'pickaxe') {
      const bladeColor = attackType === 'sword' ? '#f8f8f8' : attackType === 'pickaxe' ? '#3cbcfc' : '#888888';
      const hiltColor = '#fce000';
      const swingOffset = Math.sin(swingProg * Math.PI) * 10;

      if (player.direction === 'right') {
        const sx = px + 18 + swingOffset;
        const sy = py + 10 + (swingProg - 0.5) * 12;
        ctx.fillStyle = bladeColor;
        ctx.fillRect(sx, sy, 18, 4);
        ctx.fillStyle = hiltColor;
        ctx.fillRect(sx - 2, sy - 2, 3, 8);
      } else if (player.direction === 'left') {
        const sx = px - 18 - swingOffset;
        const sy = py + 10 + (swingProg - 0.5) * 12;
        ctx.fillStyle = bladeColor;
        ctx.fillRect(sx, sy, 18, 4);
        ctx.fillStyle = hiltColor;
        ctx.fillRect(sx + 17, sy - 2, 3, 8);
      } else if (player.direction === 'down') {
        const sx = px + 8 + (swingProg - 0.5) * 12;
        const sy = py + 22 + swingOffset;
        ctx.fillStyle = bladeColor;
        ctx.fillRect(sx, sy, 4, 18);
        ctx.fillStyle = hiltColor;
        ctx.fillRect(sx - 2, sy - 2, 8, 3);
      } else if (player.direction === 'up') {
        const sx = px + 8 - (swingProg - 0.5) * 12;
        const sy = py - 16 - swingOffset;
        ctx.fillStyle = bladeColor;
        ctx.fillRect(sx, sy, 4, 18);
        ctx.fillStyle = hiltColor;
        ctx.fillRect(sx - 2, sy + 17, 8, 3);
      }
    } else if (attackType === 'bow') {
      ctx.fillStyle = '#885818';
      if (player.direction === 'right') {
        ctx.fillRect(px + 18, py + 8, 3, 14);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px + 21, py + 9, 1, 12);
      } else if (player.direction === 'left') {
        ctx.fillRect(px - 3, py + 8, 3, 14);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px - 4, py + 9, 1, 12);
      }
    } else if (attackType === 'shotgun') {
      ctx.fillStyle = '#303030';
      if (player.direction === 'right') {
        ctx.fillRect(px + 16, py + 12, 14, 4);
        // Muzzle Flash
        ctx.fillStyle = '#fce000';
        ctx.fillRect(px + 30, py + 10, 8, 8);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px + 32, py + 12, 4, 4);
      } else if (player.direction === 'left') {
        ctx.fillRect(px - 12, py + 12, 14, 4);
        ctx.fillStyle = '#fce000';
        ctx.fillRect(px - 20, py + 10, 8, 8);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px - 18, py + 12, 4, 4);
      }
    }
  }
}

// Projectiles
function drawZeldaProjectile(ctx: CanvasRenderingContext2D, p: any) {
  if (p.bulletType === 'arrow') {
    ctx.fillStyle = '#885818';
    ctx.fillRect(p.x - 4, p.y - 1, 8, 3);
    ctx.fillStyle = '#f8f8f8';
    ctx.fillRect(p.x + 4, p.y - 2, 3, 5);
  } else {
    ctx.fillStyle = '#fce000';
    ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
  }
}

// Particles
function drawZeldaParticle(ctx: CanvasRenderingContext2D, pt: any) {
  ctx.fillStyle = pt.color;
  ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
}

// Dynamic Night Darkness Mask with Circular Cutouts for Fire & Torches
function drawNightDarknessMask(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  offsetX: number,
  offsetY: number,
  state: any
) {
  const darknessAlpha = state.isBloodMoon ? 0.88 : state.isSunset ? 0.5 : 0.85;

  ctx.save();
  const gradCanvas = document.createElement('canvas');
  gradCanvas.width = width;
  gradCanvas.height = height;
  const gctx = gradCanvas.getContext('2d');
  if (!gctx) {
    ctx.restore();
    return;
  }

  // Base darkness
  gctx.fillStyle = state.isBloodMoon ? `rgba(40, 0, 0, ${darknessAlpha})` : `rgba(0, 5, 10, ${darknessAlpha})`;
  gctx.fillRect(0, 0, width, height);

  // Cutout lights
  gctx.globalCompositeOperation = 'destination-out';

  // 1. Campfire Light
  const campfire = state.structures.find((s: any) => s.kind === 'campfire');
  if (campfire && campfire.fuel > 0) {
    const cx = campfire.x + 24 + offsetX;
    const cy = campfire.y + 24 + offsetY;
    const radius = campfire.lightRadius || 180;
    const radGrad = gctx.createRadialGradient(cx, cy, 10, cx, cy, radius);
    radGrad.addColorStop(0, 'rgba(0, 0, 0, 1)');
    radGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0.7)');
    radGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    gctx.fillStyle = radGrad;
    gctx.beginPath();
    gctx.arc(cx, cy, radius, 0, Math.PI * 2);
    gctx.fill();
  }

  // 2. Player Torch / Vision Light
  const px = state.player.x + offsetX;
  const py = state.player.y + offsetY;
  const isTorch = state.player.inventory[state.player.selectedSlotIndex]?.item === 'torch';
  const pRadius = isTorch ? 160 : 70;
  const pGrad = gctx.createRadialGradient(px, py, 5, px, py, pRadius);
  pGrad.addColorStop(0, 'rgba(0, 0, 0, 1)');
  pGrad.addColorStop(0.8, 'rgba(0, 0, 0, 0.5)');
  pGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  gctx.fillStyle = pGrad;
  gctx.beginPath();
  gctx.arc(px, py, pRadius, 0, Math.PI * 2);
  gctx.fill();

  ctx.drawImage(gradCanvas, 0, 0);
  ctx.restore();
}

// Iconic Zelda 1 Dialogue & Information Box with Branching Choices
function drawZeldaDialogueBox(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  dialogue: any
) {
  const hasChoices = dialogue.choices && dialogue.choices.length > 0;
  const boxW = Math.min(width - 24, 760);
  const boxH = hasChoices ? 180 : 140;
  const boxX = (width - boxW) / 2;
  const boxY = height - boxH - 20;

  ctx.save();

  // Double Pixel Border (Zelda 1 style)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.96)';
  ctx.fillRect(boxX, boxY, boxW, boxH);

  // Outer Gold & White Border
  ctx.fillStyle = '#fce000';
  ctx.fillRect(boxX, boxY, boxW, 3);
  ctx.fillRect(boxX, boxY + boxH - 3, boxW, 3);
  ctx.fillRect(boxX, boxY, 3, boxH);
  ctx.fillRect(boxX + boxW - 3, boxY, 3, boxH);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(boxX + 3, boxY + 3, boxW - 6, 2);
  ctx.fillRect(boxX + 3, boxY + boxH - 5, boxW - 6, 2);
  ctx.fillRect(boxX + 3, boxY + 3, 2, boxH - 6);
  ctx.fillRect(boxX + boxW - 5, boxY + 3, 2, boxH - 6);

  // Inner dark background
  ctx.fillStyle = '#08080c';
  ctx.fillRect(boxX + 5, boxY + 5, boxW - 10, boxH - 10);

  // Speaker Title & Icon
  ctx.fillStyle = '#fce000';
  ctx.font = 'bold 16px "Courier New", monospace';
  ctx.textAlign = 'left';
  const speakerLabel = `${dialogue.icon || '📜'} ${dialogue.speaker} - ${dialogue.title}`;
  ctx.fillText(speakerLabel, boxX + 18, boxY + 28);

  // Divider line under speaker
  ctx.fillStyle = '#484848';
  ctx.fillRect(boxX + 18, boxY + 34, boxW - 36, 1);

  // Typewriter Revealed Text (Word wrapped with large legible font)
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px "Courier New", monospace';

  const maxLineWidth = boxW - 44;
  const words = dialogue.text.split(' ');
  let line = '';
  let lineY = boxY + 56;

  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxLineWidth && i > 0) {
      ctx.fillText(line, boxX + 18, lineY);
      line = words[i] + ' ';
      lineY += 22;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, boxX + 18, lineY);

  // Render Interactive Dialogue Choices
  if (hasChoices) {
    const choiceStartY = Math.max(lineY + 20, boxY + 95);
    dialogue.choices.forEach((choice: any, index: number) => {
      const isSelected = index === dialogue.selectedChoiceIndex;
      const cy = choiceStartY + index * 24;

      if (isSelected) {
        // Selection highlight bar
        ctx.fillStyle = 'rgba(252, 224, 0, 0.22)';
        ctx.fillRect(boxX + 16, cy - 16, boxW - 32, 22);
        ctx.fillStyle = '#fce000';
        ctx.font = 'bold 15px "Courier New", monospace';
        ctx.fillText(`► ${choice.text}`, boxX + 22, cy);
      } else {
        ctx.fillStyle = '#c8c8c8';
        ctx.font = 'bold 14px "Courier New", monospace';
        ctx.fillText(`   ${choice.text}`, boxX + 22, cy);
      }
    });

    // Control hint for choices
    ctx.fillStyle = '#3cbcfc';
    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.fillText('▲▼ [ARRIBA/ABAJO]: ELEGIR  •  [A / ENTER / TOCAR]: CONFIRMAR', boxX + 18, boxY + boxH - 12);
  } else {
    // Blinking Prompt Indicator (▼)
    if (dialogue.isComplete && Math.floor(performance.now() * 0.004) % 2 === 0) {
      ctx.fillStyle = '#fce000';
      ctx.font = 'bold 14px "Courier New", monospace';
      ctx.fillText('▼ [A / ENTER / TOCAR]', boxX + boxW - 190, boxY + boxH - 14);
    }
  }

  ctx.restore();
}

// Floating Context Interaction Prompt Badge
function drawInteractionPromptBadge(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  prompt: string
) {
  const badgeW = Math.min(width - 32, 540);
  const badgeH = 34;
  const bx = (width - badgeW) / 2;
  const by = height - 52;

  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
  ctx.fillRect(bx, by, badgeW, badgeH);

  ctx.fillStyle = '#fce000';
  ctx.fillRect(bx, by, badgeW, 2);
  ctx.fillRect(bx, by + badgeH - 2, badgeW, 2);
  ctx.fillRect(bx, by, 2, badgeH);
  ctx.fillRect(bx + badgeW - 2, by, 2, badgeH);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(prompt, width / 2, by + 22);
  ctx.restore();
}

// CRT Scanlines
function drawCRTScanlines(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  for (let y = 0; y < height; y += 3) {
    ctx.fillRect(0, y, width, 1);
  }
  ctx.restore();
}
