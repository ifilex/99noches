import { CamperEntity, InteractivePropEntity, InteriorLocation, ResourceNodeEntity, StoryNpcEntity, StructureEntity } from '../types';
import { TILE_SIZE } from './pathfinding';

export interface WorldMapData {
  width: number;
  height: number;
  seed: number;
  tileCols: number;
  tileRows: number;
  tiles: Uint8Array; // 0=Grass, 1=Dirt Path, 2=Water, 3=Stone Cliff, 4=Dense Tree Wall, 5=Bridge
  campfire: StructureEntity;
  resourceNodes: ResourceNodeEntity[];
  structures: StructureEntity[];
  campers: CamperEntity[];
  interactiveProps: InteractivePropEntity[];
  storyNpcs: StoryNpcEntity[];
  interiors: Record<string, InteriorLocation>;
  solidRects: { x: number; y: number; width: number; height: number; type: string }[];
}

// Tile ID Constants
export const TILE_GRASS = 0;
export const TILE_PATH = 1;
export const TILE_WATER = 2;
export const TILE_CLIFF = 3;
export const TILE_DENSE_TREES = 4;
export const TILE_BRIDGE = 5;

// Seedable PRNG
function seededRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function generateForestWorld(seedNumber: number = Date.now()): WorldMapData {
  const rand = seededRandom(seedNumber);

  const MAP_WIDTH = 2560; // 80 tiles
  const MAP_HEIGHT = 2560; // 80 tiles
  const COLS = Math.floor(MAP_WIDTH / TILE_SIZE);
  const ROWS = Math.floor(MAP_HEIGHT / TILE_SIZE);

  const tiles = new Uint8Array(COLS * ROWS);
  tiles.fill(TILE_GRASS);

  const solidRects: { x: number; y: number; width: number; height: number; type: string }[] = [];

  const CENTER_X = MAP_WIDTH / 2;
  const CENTER_Y = MAP_HEIGHT / 2;
  const centerCol = Math.floor(CENTER_X / TILE_SIZE);
  const centerRow = Math.floor(CENTER_Y / TILE_SIZE);

  // 1. Boundary Cliffs (Outer borders of the NES Overworld)
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < 2; r++) {
      tiles[r * COLS + c] = TILE_CLIFF;
      tiles[(ROWS - 1 - r) * COLS + c] = TILE_CLIFF;
    }
  }
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < 2; c++) {
      tiles[r * COLS + c] = TILE_CLIFF;
      tiles[r * COLS + (COLS - 1 - c)] = TILE_CLIFF;
    }
  }
  solidRects.push({ x: 0, y: 0, width: MAP_WIDTH, height: 64, type: 'cliff' });
  solidRects.push({ x: 0, y: MAP_HEIGHT - 64, width: MAP_WIDTH, height: 64, type: 'cliff' });
  solidRects.push({ x: 0, y: 0, width: 64, height: MAP_HEIGHT, type: 'cliff' });
  solidRects.push({ x: MAP_WIDTH - 64, y: 0, width: 64, height: MAP_HEIGHT, type: 'cliff' });

  // 2. Central Campfire Crossroads (Dirt Paths in 4 Cardinal directions)
  for (let c = 4; c < COLS - 4; c++) {
    tiles[centerRow * COLS + c] = TILE_PATH;
    tiles[(centerRow - 1) * COLS + c] = TILE_PATH;
    tiles[(centerRow + 1) * COLS + c] = TILE_PATH;
  }
  for (let r = 4; r < ROWS - 4; r++) {
    tiles[r * COLS + centerCol] = TILE_PATH;
    tiles[r * COLS + (centerCol - 1)] = TILE_PATH;
    tiles[r * COLS + (centerCol + 1)] = TILE_PATH;
  }

  // 3. Winding Blue River across the east with wooden bridges
  const riverCol = centerCol + 18;
  for (let r = 2; r < ROWS - 2; r++) {
    const colOffset = Math.floor(Math.sin(r * 0.15) * 2);
    const rc = riverCol + colOffset;
    if (rc > 0 && rc < COLS - 1) {
      tiles[r * COLS + rc] = TILE_WATER;
      tiles[r * COLS + rc + 1] = TILE_WATER;
      tiles[r * COLS + rc + 2] = TILE_WATER;
    }
  }

  // Bridges over the river
  const bridgeRows = [centerRow, centerRow - 20, centerRow + 20];
  bridgeRows.forEach(br => {
    for (let r = br - 1; r <= br + 1; r++) {
      for (let c = riverCol - 3; c <= riverCol + 5; c++) {
        if (tiles[r * COLS + c] === TILE_WATER) {
          tiles[r * COLS + c] = TILE_BRIDGE;
        }
      }
    }
  });

  // Solid water rectangles (excluding bridges)
  for (let r = 2; r < ROWS - 2; r++) {
    const colOffset = Math.floor(Math.sin(r * 0.15) * 2);
    const rc = riverCol + colOffset;
    const isBridge = bridgeRows.some(br => Math.abs(br - r) <= 1);
    if (!isBridge) {
      solidRects.push({
        x: rc * TILE_SIZE,
        y: r * TILE_SIZE,
        width: TILE_SIZE * 3,
        height: TILE_SIZE,
        type: 'water',
      });
    }
  }

  // 4. Northern Mountain Ridge with Rock Formations
  const mountainRow = 12;
  for (let c = 8; c < COLS - 8; c++) {
    if (Math.abs(c - centerCol) > 3) {
      tiles[mountainRow * COLS + c] = TILE_CLIFF;
      tiles[(mountainRow + 1) * COLS + c] = TILE_CLIFF;
    }
  }
  solidRects.push({
    x: 8 * TILE_SIZE,
    y: mountainRow * TILE_SIZE,
    width: (centerCol - 11) * TILE_SIZE,
    height: TILE_SIZE * 2,
    type: 'cliff',
  });
  solidRects.push({
    x: (centerCol + 4) * TILE_SIZE,
    y: mountainRow * TILE_SIZE,
    width: (COLS - 12 - centerCol) * TILE_SIZE,
    height: TILE_SIZE * 2,
    type: 'cliff',
  });

  // 5. Central Campfire Structure
  const campfire: StructureEntity = {
    id: 'central_campfire',
    type: 'structure',
    kind: 'campfire',
    x: CENTER_X - 24,
    y: CENTER_Y - 24,
    width: 48,
    height: 48,
    vx: 0,
    vy: 0,
    direction: 'down',
    animFrame: 0,
    animTimer: 0,
    hp: 1200,
    maxHp: 1200,
    level: 1,
    fuel: 100,
    maxFuel: 100,
    lightRadius: 180,
  };

  const structures: StructureEntity[] = [campfire];
  const resourceNodes: ResourceNodeEntity[] = [];
  const campers: CamperEntity[] = [];
  const interiors: Record<string, InteriorLocation> = {};

  // Crafting table near campfire
  structures.push({
    id: 'camp_crafting_table',
    type: 'structure',
    kind: 'crafting_table',
    x: CENTER_X + 64,
    y: CENTER_Y - 24,
    width: 36,
    height: 36,
    vx: 0,
    vy: 0,
    direction: 'down',
    animFrame: 0,
    animTimer: 0,
    hp: 600,
    maxHp: 600,
  });
  solidRects.push({ x: CENTER_X + 64, y: CENTER_Y - 24, width: 36, height: 36, type: 'crafting_table' });

  // Storage chest near campfire
  structures.push({
    id: 'camp_storage_chest',
    type: 'structure',
    kind: 'storage_chest',
    x: CENTER_X - 84,
    y: CENTER_Y - 24,
    width: 36,
    height: 36,
    vx: 0,
    vy: 0,
    direction: 'down',
    animFrame: 0,
    animTimer: 0,
    hp: 500,
    maxHp: 500,
    inventory: [
      { item: 'wood', count: 12 },
      { item: 'berries', count: 6 },
      { item: 'bandage', count: 2 },
    ],
  });
  solidRects.push({ x: CENTER_X - 84, y: CENTER_Y - 24, width: 36, height: 36, type: 'chest' });

  // ==========================================
  // 6. ENTERABLE CABINS (CABAÑAS DEL BOSQUE)
  // ==========================================
  const cabinConfigs = [
    {
      id: 'cabin_west',
      name: 'Cabaña del Viejo Ermitaño',
      subtitle: 'Refugio cálido de madera 8-bit',
      x: CENTER_X - 580,
      y: CENTER_Y - 420,
      sageName: 'Viejo Ermitaño',
      sageDialogue: 'EL BOSQUE ES OSCURO Y LLENO DE BESTIAS. DESCANSA EN MI CHIMENEA Y TOMA LO QUE NECESITES DEL COFRE.',
    },
    {
      id: 'cabin_east',
      name: 'Puesto de Avanzada de Cazadores',
      subtitle: 'Antiguo albergue de tramperos',
      x: CENTER_X + 680,
      y: CENTER_Y - 380,
      sageName: 'Maestro Trampero',
      sageDialogue: 'CONSTRUYE BARRICADAS Y TRAMPAS DE OSO ALREDEDOR DE LA FOGATA. LOS LOBOS NO PODRÁN PASAR.',
    },
    {
      id: 'cabin_south',
      name: 'Cabaña del Alquimista Forestal',
      subtitle: 'Laboratorio de pociones y fuego',
      x: CENTER_X - 480,
      y: CENTER_Y + 580,
      sageName: 'Alquimista del Roble',
      sageDialogue: 'COMBINA SETAS Y AGUA PURA PARA CREAR CALDO NUTRITIVO. EL HAMBRE NO TE DEBILITARÁ.',
    },
  ];

  cabinConfigs.forEach(cab => {
    const cabWidth = 96;
    const cabHeight = 96;
    const doorX = cab.x + 36;
    const doorY = cab.y + cabHeight - 20;

    // Overworld Exterior Structure
    structures.push({
      id: cab.id,
      type: 'structure',
      kind: 'cabin_ruin',
      x: cab.x,
      y: cab.y,
      width: cabWidth,
      height: cabHeight,
      vx: 0,
      vy: 0,
      direction: 'down',
      animFrame: 0,
      animTimer: 0,
      hp: 1500,
      maxHp: 1500,
    });

    // Solid collision for cabin walls (except door opening in bottom middle)
    solidRects.push({ x: cab.x, y: cab.y, width: cabWidth, height: cabHeight - 24, type: 'cabin_wall' });
    solidRects.push({ x: cab.x, y: cab.y + cabHeight - 24, width: 32, height: 24, type: 'cabin_wall' });
    solidRects.push({ x: cab.x + 64, y: cab.y + cabHeight - 24, width: 32, height: 24, type: 'cabin_wall' });

    // Interior Definition
    interiors[cab.id] = {
      id: cab.id,
      type: 'cabin',
      name: cab.name,
      subtitle: cab.subtitle,
      exteriorDoor: { x: doorX, y: doorY, width: 24, height: 24 },
      interiorSpawn: { x: 200, y: 310 },
      exitDoor: { x: 184, y: 340, width: 32, height: 20 },
      width: 14, // 448px
      height: 12, // 384px
      sageName: cab.sageName,
      sageDialogue: cab.sageDialogue,
      objects: [
        // Fireplace (Heals warmth)
        {
          id: `${cab.id}_fireplace`,
          type: 'fireplace',
          x: 184,
          y: 48,
          width: 48,
          height: 48,
          name: 'Chimenea Cálida',
          interactionText: '🔥 Chimenea encendida. Tu calor y vida se restauran lentamente aquí dentro.',
        },
        // Bed (Sleep / Rest)
        {
          id: `${cab.id}_bed`,
          type: 'bed',
          x: 48,
          y: 64,
          width: 48,
          height: 64,
          name: 'Cama Rústica de Madera',
          interactionText: '🛏️ Descansas en la cama. Tu resistencia (estamina) se recupera al máximo.',
        },
        // Treasure Chest
        {
          id: `${cab.id}_chest`,
          type: 'chest',
          x: 330,
          y: 64,
          width: 36,
          height: 36,
          name: 'Cofre Secreto de Cabaña',
          interactionText: '📦 ¡Has abierto el cofre de la cabaña!',
          loot: [
            { item: 'iron_ingot', count: 3 },
            { item: 'bandage', count: 2 },
            { item: 'shotgun_shell', count: 4 },
            { item: 'forest_gold_coin', count: 35 },
          ],
          opened: false,
        },
        // Bookshelf / Lore
        {
          id: `${cab.id}_book`,
          type: 'bookshelf',
          x: 48,
          y: 180,
          width: 40,
          height: 48,
          name: 'Diario del Superviviente',
          interactionText: '📖 "Día 33: Las noches de Luna de Sangre traen criaturas veloces. Guarda siempre flechas y cartuchos de escopeta."',
        },
        // Sage / Hermit NPC
        {
          id: `${cab.id}_npc`,
          type: 'sage_npc',
          x: 200,
          y: 140,
          width: 32,
          height: 36,
          name: cab.sageName,
          interactionText: cab.sageDialogue,
        },
      ],
    };
  });

  // ==========================================
  // 7. ENTERABLE CAVES (CUEVAS Y MAZMORRAS 8-BIT)
  // ==========================================
  const caveConfigs = [
    {
      id: 'cave_north',
      name: 'Cueva del Sabio Ancestral',
      subtitle: 'Profundidades de roca y antorchas',
      x: CENTER_X + 220,
      y: mountainRow * TILE_SIZE - 16,
      sageName: 'Sabio de la Llama',
      sageDialogue: '¡ES PELIGROSO IR SOLO! TOMA TUS ARMAS Y MANTÉN LA LUZ DE LA FOGATA VIVA HASTA EL DÍA 99.',
    },
    {
      id: 'cave_southwest',
      name: 'Gruta de los Minerales Prohibidos',
      subtitle: 'Caverna subterránea de hierro y oro',
      x: CENTER_X - 740,
      y: CENTER_Y + 700,
      sageName: 'Minero Solitario',
      sageDialogue: 'LAS ROCAS NEGRAS CONTIENEN PELLETS DE COMBUSTIBLE. UNA SOLA PIEZA ALIMENTA EL FUEGO POR HORAS.',
    },
    {
      id: 'cave_southeast',
      name: 'Santuario Subterráneo del Wendigo',
      subtitle: 'Cueva sagrada con runas milenarias',
      x: CENTER_X + 780,
      y: CENTER_Y + 680,
      sageName: 'Chamán de las Sombras',
      sageDialogue: 'EL WENDIGO ANCESTRAL REINA EN LA NOCHE 99. SOLO QUIEN DOMINE EL ARCO Y LA ESCOPETA RETRO PODRÁ SALIR CON VIDA.',
    },
  ];

  caveConfigs.forEach(cave => {
    const caveWidth = 80;
    const caveHeight = 64;
    const entranceX = cave.x + 28;
    const entranceY = cave.y + 24;

    // Solid mountain face around cave entrance
    solidRects.push({ x: cave.x, y: cave.y, width: 28, height: caveHeight, type: 'cave_rock' });
    solidRects.push({ x: cave.x + 52, y: cave.y, width: 28, height: caveHeight, type: 'cave_rock' });

    // Interior Definition
    interiors[cave.id] = {
      id: cave.id,
      type: 'cave',
      name: cave.name,
      subtitle: cave.subtitle,
      exteriorDoor: { x: entranceX, y: entranceY, width: 24, height: 24 },
      interiorSpawn: { x: 224, y: 310 },
      exitDoor: { x: 208, y: 340, width: 32, height: 20 },
      width: 15, // 480px
      height: 12, // 384px
      sageName: cave.sageName,
      sageDialogue: cave.sageDialogue,
      objects: [
        // Left Torch
        {
          id: `${cave.id}_torch_1`,
          type: 'torch',
          x: 120,
          y: 60,
          width: 24,
          height: 32,
          name: 'Antorcha Azul de Mazmorra',
        },
        // Right Torch
        {
          id: `${cave.id}_torch_2`,
          type: 'torch',
          x: 310,
          y: 60,
          width: 24,
          height: 32,
          name: 'Antorcha Azul de Mazmorra',
        },
        // Old Sage in Center
        {
          id: `${cave.id}_sage`,
          type: 'sage_npc',
          x: 216,
          y: 110,
          width: 32,
          height: 36,
          name: cave.sageName,
          interactionText: cave.sageDialogue,
        },
        // Ancient Pedestal Chest
        {
          id: `${cave.id}_chest`,
          type: 'chest',
          x: 216,
          y: 180,
          width: 36,
          height: 36,
          name: 'Cofre Ancestral de Cueva',
          interactionText: '💎 ¡Has obtenido tesoros arcanos de la cueva!',
          loot: [
            { item: 'ancient_relic', count: 1 },
            { item: 'forest_gold_coin', count: 75 },
            { item: 'bandage', count: 3 },
            { item: 'arrow', count: 8 },
          ],
          opened: false,
        },
        // Altar / Lore Tablet
        {
          id: `${cave.id}_altar`,
          type: 'altar',
          x: 64,
          y: 80,
          width: 48,
          height: 48,
          name: 'Monolito Grabado Zelda',
          interactionText: '🗿 "AQUEL QUE ALIMENTE LA LLAMA SAGRADA VERÁ EL AMANECER DE LA NOCHE 99 Y EL BOSQUE SERÁ LIBRE."',
        },
      ],
    };
  });

  // 8. Signposts on Crossways (Carteles de Información)
  const signposts = [
    {
      x: CENTER_X + 80,
      y: CENTER_Y + 60,
      name: 'Cartel del Campamento Central',
      text: '🪧 [CAMPAMENTO CENTRAL] Mantén la fogata encendida con madera. Pulsa (A) para talar árboles y atacar.',
    },
    {
      x: CENTER_X - 160,
      y: CENTER_Y,
      name: 'Cartel Hacia Cabaña Oeste',
      text: '🪧 [OESTE] Cabaña del Viejo Ermitaño. Refugio seguro y chimenea disponible.',
    },
    {
      x: CENTER_X,
      y: mountainRow * TILE_SIZE + 64,
      name: 'Cartel de los Riscos del Norte',
      text: '🪧 [NORTE] Tierras Rocosas y Cueva del Sabio. ¡Peligro de bestias al anochecer!',
    },
  ];

  signposts.forEach((s, idx) => {
    resourceNodes.push({
      id: `sign_${idx}`,
      type: 'resource_node',
      resourceType: 'crate', // clickable node
      x: s.x,
      y: s.y,
      width: 28,
      height: 28,
      vx: 0,
      vy: 0,
      direction: 'down',
      animFrame: 0,
      animTimer: 0,
      hitsRemaining: 999,
      maxHits: 999,
      depleted: false,
      lootTable: [],
    });
  });

  // 9. Campers in Cages
  const camperConfigs = [
    {
      name: 'Tomás el Leñador',
      role: 'scavenger' as const,
      dialog: '¡Gracias por rescatarme! Cortaré leña para la fogata mientras estés fuera.',
      buff: 'Genera +1 madera por minuto en la fogata.',
      x: CENTER_X - 500,
      y: CENTER_Y - 320,
    },
    {
      name: 'Dra. Elena',
      role: 'medic' as const,
      dialog: '¡Estuve atrapada días! Te curaré periódicamente cuando estés en el campamento.',
      buff: 'Regenera +5 HP cada 10s cuando estás cerca de la fogata.',
      x: CENTER_X + 540,
      y: CENTER_Y - 260,
    },
    {
      name: 'Sargento Mateo',
      role: 'guard' as const,
      dialog: '¡Armas listas! Vigilaré el campamento y dispararé a las bestias.',
      buff: 'Dispara a los monstruos que entren en el radio del campamento.',
      x: CENTER_X - 440,
      y: CENTER_Y + 480,
    },
    {
      name: 'Chef Ramón',
      role: 'cook' as const,
      dialog: '¡Por fin libre! Cocinaré las carnes y bayas duplicando su nutrición.',
      buff: 'Tus comidas restauran +30% más de hambre y calor.',
      x: CENTER_X + 560,
      y: CENTER_Y + 440,
    },
  ];

  camperConfigs.forEach((c, idx) => {
    structures.push({
      id: `cage_${idx}`,
      type: 'structure',
      kind: 'cage',
      x: c.x - 6,
      y: c.y - 6,
      width: 44,
      height: 44,
      vx: 0,
      vy: 0,
      direction: 'down',
      animFrame: 0,
      animTimer: 0,
      hp: 100,
      maxHp: 100,
    });
    solidRects.push({ x: c.x - 6, y: c.y - 6, width: 44, height: 44, type: 'cage' });

    campers.push({
      id: `camper_${idx}`,
      type: 'npc_camper',
      name: c.name,
      role: c.role,
      rescued: false,
      hp: 150,
      maxHp: 150,
      state: 'caged',
      dialog: c.dialog,
      buffDescription: c.buff,
      x: c.x,
      y: c.y,
      width: 28,
      height: 32,
      vx: 0,
      vy: 0,
      direction: 'down',
      animFrame: 0,
      animTimer: 0,
    });
  });

  // 10. Procedural Placement of 8-Bit Trees, Rocks, Iron, Coal, Berries, Mushrooms
  let nodeCounter = 0;

  function getRandomPos(minDist = 160) {
    let x = 0;
    let y = 0;
    let tries = 0;
    let valid = false;
    do {
      x = 80 + rand() * (MAP_WIDTH - 160);
      y = 80 + rand() * (MAP_HEIGHT - 160);
      const dx = x - CENTER_X;
      const dy = y - CENTER_Y;
      const dist = Math.hypot(dx, dy);

      const tileX = Math.floor(x / TILE_SIZE);
      const tileY = Math.floor(y / TILE_SIZE);
      const t = tiles[tileY * COLS + tileX];

      // Avoid water, cliffs, path centers and very close to campfire
      if (dist >= minDist && t === TILE_GRASS) {
        valid = true;
      }
      tries++;
    } while (!valid && tries < 100);
    return { x, y };
  }

  // Trees (Zelda 1 style green round trees)
  const TOTAL_TREES = 260;
  for (let i = 0; i < TOTAL_TREES; i++) {
    const pos = getRandomPos(140);
    resourceNodes.push({
      id: `tree_${nodeCounter++}`,
      type: 'resource_node',
      resourceType: 'tree',
      x: pos.x,
      y: pos.y,
      width: 36,
      height: 48,
      vx: 0,
      vy: 0,
      direction: 'down',
      animFrame: 0,
      animTimer: 0,
      hitsRemaining: 4,
      maxHits: 4,
      depleted: false,
      lootTable: [
        { item: 'wood', min: 2, max: 4, chance: 1.0 },
        { item: 'mushroom', min: 1, max: 1, chance: 0.15 },
      ],
    });
    solidRects.push({ x: pos.x + 4, y: pos.y + 24, width: 28, height: 24, type: 'tree' });
  }

  // Stone Boulders
  const TOTAL_ROCKS = 110;
  for (let i = 0; i < TOTAL_ROCKS; i++) {
    const pos = getRandomPos(160);
    resourceNodes.push({
      id: `rock_${nodeCounter++}`,
      type: 'resource_node',
      resourceType: 'stone_rock',
      x: pos.x,
      y: pos.y,
      width: 32,
      height: 32,
      vx: 0,
      vy: 0,
      direction: 'down',
      animFrame: 0,
      animTimer: 0,
      hitsRemaining: 3,
      maxHits: 3,
      depleted: false,
      lootTable: [
        { item: 'stone', min: 2, max: 4, chance: 1.0 },
        { item: 'stone_ammo', min: 2, max: 4, chance: 0.35 },
      ],
    });
    solidRects.push({ x: pos.x, y: pos.y, width: 32, height: 32, type: 'rock' });
  }

  // Iron Ore
  const TOTAL_IRON = 40;
  for (let i = 0; i < TOTAL_IRON; i++) {
    const pos = getRandomPos(260);
    resourceNodes.push({
      id: `iron_${nodeCounter++}`,
      type: 'resource_node',
      resourceType: 'iron_rock',
      x: pos.x,
      y: pos.y,
      width: 32,
      height: 32,
      vx: 0,
      vy: 0,
      direction: 'down',
      animFrame: 0,
      animTimer: 0,
      hitsRemaining: 4,
      maxHits: 4,
      depleted: false,
      lootTable: [
        { item: 'iron_ore', min: 2, max: 3, chance: 1.0 },
        { item: 'stone', min: 1, max: 2, chance: 0.8 },
      ],
    });
    solidRects.push({ x: pos.x, y: pos.y, width: 32, height: 32, type: 'iron' });
  }

  // Coal Ore (Pellets)
  const TOTAL_COAL = 35;
  for (let i = 0; i < TOTAL_COAL; i++) {
    const pos = getRandomPos(240);
    resourceNodes.push({
      id: `coal_${nodeCounter++}`,
      type: 'resource_node',
      resourceType: 'coal_rock',
      x: pos.x,
      y: pos.y,
      width: 32,
      height: 30,
      vx: 0,
      vy: 0,
      direction: 'down',
      animFrame: 0,
      animTimer: 0,
      hitsRemaining: 3,
      maxHits: 3,
      depleted: false,
      lootTable: [
        { item: 'fuel_pellet', min: 1, max: 2, chance: 0.9 },
        { item: 'stone', min: 1, max: 2, chance: 0.7 },
      ],
    });
    solidRects.push({ x: pos.x, y: pos.y, width: 32, height: 30, type: 'coal' });
  }

  // Berry Bushes (walkable / harvested)
  const TOTAL_BERRIES = 80;
  for (let i = 0; i < TOTAL_BERRIES; i++) {
    const pos = getRandomPos(120);
    resourceNodes.push({
      id: `berry_${nodeCounter++}`,
      type: 'resource_node',
      resourceType: 'berry_bush',
      x: pos.x,
      y: pos.y,
      width: 28,
      height: 28,
      vx: 0,
      vy: 0,
      direction: 'down',
      animFrame: 0,
      animTimer: 0,
      hitsRemaining: 2,
      maxHits: 2,
      depleted: false,
      lootTable: [{ item: 'berries', min: 2, max: 4, chance: 1.0 }],
    });
  }

  // Mushrooms
  const TOTAL_SHROOMS = 70;
  for (let i = 0; i < TOTAL_SHROOMS; i++) {
    const pos = getRandomPos(150);
    resourceNodes.push({
      id: `shroom_${nodeCounter++}`,
      type: 'resource_node',
      resourceType: 'mushroom_patch',
      x: pos.x,
      y: pos.y,
      width: 24,
      height: 24,
      vx: 0,
      vy: 0,
      direction: 'down',
      animFrame: 0,
      animTimer: 0,
      hitsRemaining: 1,
      maxHits: 1,
      depleted: false,
      lootTable: [{ item: 'mushroom', min: 1, max: 2, chance: 1.0 }],
    });
  }

  // Crates
  const TOTAL_CRATES = 20;
  for (let i = 0; i < TOTAL_CRATES; i++) {
    const pos = getRandomPos(300);
    resourceNodes.push({
      id: `crate_${nodeCounter++}`,
      type: 'resource_node',
      resourceType: 'crate',
      x: pos.x,
      y: pos.y,
      width: 28,
      height: 28,
      vx: 0,
      vy: 0,
      direction: 'down',
      animFrame: 0,
      animTimer: 0,
      hitsRemaining: 1,
      maxHits: 1,
      depleted: false,
      lootTable: [
        { item: 'bandage', min: 1, max: 2, chance: 0.8 },
        { item: 'shotgun_shell', min: 2, max: 4, chance: 0.6 },
        { item: 'forest_gold_coin', min: 15, max: 35, chance: 1.0 },
      ],
    });
  }

  // Moon Flowers (Spawning near water banks and glades)
  const TOTAL_MOON_FLOWERS = 24;
  for (let i = 0; i < TOTAL_MOON_FLOWERS; i++) {
    const pos = getRandomPos(200);
    resourceNodes.push({
      id: `moon_flower_${nodeCounter++}`,
      type: 'resource_node',
      resourceType: 'ancient_shrine',
      x: pos.x,
      y: pos.y,
      width: 24,
      height: 24,
      vx: 0,
      vy: 0,
      direction: 'down',
      animFrame: 0,
      animTimer: 0,
      hitsRemaining: 1,
      maxHits: 1,
      depleted: false,
      lootTable: [
        { item: 'moon_flower', min: 1, max: 2, chance: 1.0 },
        { item: 'forest_gold_coin', min: 10, max: 20, chance: 0.5 },
      ],
    });
  }

  // ==========================================
  // 10. INTERACTIVE OVERWORLD PROPS & SHRINES
  // ==========================================
  const interactiveProps: InteractivePropEntity[] = [
    {
      id: 'prop_monolith_1',
      type: 'interactive_prop',
      propType: 'ancient_monolith',
      name: 'Monolito de las Sombras Ancestrales',
      description: 'Pilar negro de basalto grabado con jeroglíficos luminiscentes de 8-bit.',
      x: CENTER_X - 320,
      y: CENTER_Y - 260,
      width: 36,
      height: 52,
      vx: 0,
      vy: 0,
      direction: 'down',
      animFrame: 0,
      animTimer: 0,
      examined: false,
      glowColor: '#9858f8',
      dialogueNodeId: 'prop_monolith',
      interactionRadius: 48,
    },
    {
      id: 'prop_well_1',
      type: 'interactive_prop',
      propType: 'whispering_well',
      name: 'Pozo de los Susurros',
      description: 'Manantial de aguas profundas donde se escuchan ecos de tiempos remotos.',
      x: CENTER_X + 380,
      y: CENTER_Y + 280,
      width: 44,
      height: 44,
      vx: 0,
      vy: 0,
      direction: 'down',
      animFrame: 0,
      animTimer: 0,
      examined: false,
      glowColor: '#3cbcfc',
      dialogueNodeId: 'prop_well',
      interactionRadius: 52,
    },
    {
      id: 'prop_altar_1',
      type: 'interactive_prop',
      propType: 'cursed_altar',
      name: 'Altar Celestial de la Luna Azul',
      description: 'Relicario sagrado donde la energía del eclipse se condensa en materia cósmica.',
      x: CENTER_X + 540,
      y: CENTER_Y - 500,
      width: 48,
      height: 48,
      vx: 0,
      vy: 0,
      direction: 'down',
      animFrame: 0,
      animTimer: 0,
      examined: false,
      glowColor: '#fce000',
      dialogueNodeId: 'prop_altar',
      interactionRadius: 54,
    },
    {
      id: 'prop_grave_1',
      type: 'interactive_prop',
      propType: 'survivor_grave',
      name: 'Tumba del Primer Superviviente',
      description: 'Cruz rústica de madera donde yace el espíritu de Alden.',
      x: CENTER_X + 680,
      y: CENTER_Y + 120,
      width: 32,
      height: 36,
      vx: 0,
      vy: 0,
      direction: 'down',
      animFrame: 0,
      animTimer: 0,
      examined: false,
      glowColor: '#f8f8f8',
      dialogueNodeId: 'alden_intro',
      interactionRadius: 48,
    },
  ];

  // ==========================================
  // 11. ROAMING STORY & LORE NPCS
  // ==========================================
  const storyNpcs: StoryNpcEntity[] = [
    {
      id: 'story_npc_valeria',
      type: 'npc_story',
      npcId: 'valeria_ranger',
      name: 'Valeria la Guardabosques',
      role: 'Superviviente del Puesto Forestal',
      x: CENTER_X + 80,
      y: CENTER_Y - 20,
      width: 24,
      height: 28,
      vx: 0,
      vy: 0,
      direction: 'down',
      animFrame: 0,
      animTimer: 0,
      colorHead: '#f8b800',
      colorBody: '#008800',
      colorCloak: '#885818',
      dialogueNodeId: 'valeria_intro',
      interactionRadius: 56,
      questStatus: 'not_started',
    },
    {
      id: 'story_npc_vaelen',
      type: 'npc_story',
      npcId: 'scholar_vaelen',
      name: 'Erudito Vaelen',
      role: 'Cronista de las 99 Eras',
      x: CENTER_X + 160,
      y: mountainRow * TILE_SIZE + 40,
      width: 24,
      height: 28,
      vx: 0,
      vy: 0,
      direction: 'down',
      animFrame: 0,
      animTimer: 0,
      colorHead: '#f8b800',
      colorBody: '#005888',
      colorCloak: '#d82800',
      dialogueNodeId: 'vaelen_intro',
      interactionRadius: 52,
      questStatus: 'not_started',
    },
    {
      id: 'story_npc_morrigan',
      type: 'npc_story',
      npcId: 'blood_emissary',
      name: 'Morrigan',
      role: 'Emisaria de la Luna Carmesí',
      x: CENTER_X - 420,
      y: CENTER_Y + 360,
      width: 24,
      height: 28,
      vx: 0,
      vy: 0,
      direction: 'down',
      animFrame: 0,
      animTimer: 0,
      colorHead: '#f8f8f8',
      colorBody: '#881400',
      colorCloak: '#202020',
      dialogueNodeId: 'morrigan_intro',
      interactionRadius: 52,
      questStatus: 'not_started',
    },
    {
      id: 'story_npc_alden',
      type: 'npc_story',
      npcId: 'ghost_alden',
      name: 'Fantasma de Alden',
      role: 'Primer Explorador Caído',
      x: CENTER_X + 720,
      y: CENTER_Y + 140,
      width: 24,
      height: 28,
      vx: 0,
      vy: 0,
      direction: 'down',
      animFrame: 0,
      animTimer: 0,
      colorHead: '#3cbcfc',
      colorBody: '#a4e4fc',
      dialogueNodeId: 'alden_intro',
      interactionRadius: 54,
      questStatus: 'not_started',
    },
  ];

  return {
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    seed: seedNumber,
    tileCols: COLS,
    tileRows: ROWS,
    tiles,
    campfire,
    resourceNodes,
    structures,
    campers,
    interactiveProps,
    storyNpcs,
    interiors,
    solidRects,
  };
}
