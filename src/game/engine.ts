import { soundEngine } from '../audio/soundEngine';
import { CAMPFIRE_UPGRADES, CRAFTING_RECIPES, ITEM_DEFINITIONS, SKILL_NODES, STORY_DIALOGUE_NODES, STORY_ENDINGS_CATALOG } from './constants';
import { generateForestWorld, TILE_BRIDGE, TILE_CLIFF, TILE_DENSE_TREES, TILE_WATER, WorldMapData } from './mapGenerator';
import { PathfindingGrid, TILE_SIZE } from './pathfinding';
import {
  AnimalEntity,
  CamperEntity,
  DialogueBoxState,
  DropEntity,
  FloatingText,
  InteractivePropEntity,
  InteriorLocation,
  InteriorObject,
  ItemType,
  MonsterEntity,
  MonsterType,
  NarrativeAlignment,
  Particle,
  PetEntity,
  PlayerState,
  ProjectileEntity,
  ResourceNodeEntity,
  StoryEnding,
  StoryNpcEntity,
  StructureEntity,
} from '../types';

export interface GameEngineState {
  timeOfDay: number; // 0 to 2400 (600 = dawn, 1800 = dusk, 2000 = night)
  daySpeed: number;
  currentNight: number;
  isNight: boolean;
  isSunset: boolean;
  isBloodMoon: boolean;
  weather: 'clear' | 'fog' | 'rain' | 'blood_storm';
  currentLocation: 'overworld' | string; // 'overworld' or interior ID
  interiors: Record<string, InteriorLocation>;
  dialogueBox: DialogueBoxState;
  particles: Particle[];
  floatingTexts: FloatingText[];
  drops: DropEntity[];
  monsters: MonsterEntity[];
  animals: AnimalEntity[];
  projectiles: ProjectileEntity[];
  structures: StructureEntity[];
  resourceNodes: ResourceNodeEntity[];
  campers: CamperEntity[];
  interactiveProps: InteractivePropEntity[];
  storyNpcs: StoryNpcEntity[];
  pet: PetEntity | null;
  player: PlayerState;
  worldWidth: number;
  worldHeight: number;
  camera: { x: number; y: number; zoom: number; shake: number };
  gameWon: boolean;
  gameOver: boolean;
  dailyModifier: string;
  narrativeAlignment: NarrativeAlignment;
  unlockedLore: string[];
  unlockedEndings: string[];
  activeStoryQuests: Record<string, 'not_started' | 'active' | 'completed'>;
  nearbyInteractionPrompt: { text: string; actionName: string; targetX: number; targetY: number } | null;
  hitPauseTimer: number;
  activeEnding?: StoryEnding;
}

export class GameEngine {
  public state: GameEngineState;
  public mapData: WorldMapData;
  public pathGrid: PathfindingGrid;
  private lastUpdate: number = performance.now();
  private monsterSpawnTimer: number = 0;
  private animalSpawnTimer: number = 0;
  private autoSaveTimer: number = 0;
  private pathGridDirty: boolean = true;
  private onGameOverCallback?: () => void;
  private onVictoryCallback?: () => void;

  constructor(
    skin: string = 'classic',
    petType: string = 'none',
    activeFireStyle: string = 'classic_orange',
    dailyModifier: string = 'none',
    seed: number = Date.now()
  ) {
    this.mapData = generateForestWorld(seed);
    this.pathGrid = new PathfindingGrid(this.mapData.width, this.mapData.height);
    this.rebuildPathGrid();

    const initialPlayer: PlayerState = {
      x: this.mapData.width / 2,
      y: this.mapData.height / 2 + 50,
      vx: 0,
      vy: 0,
      direction: 'down',
      facingAngle: Math.PI / 2,
      stats: {
        hp: 100,
        maxHp: 100,
        hunger: 100,
        maxHunger: 100,
        warmth: 100,
        maxWarmth: 100,
        stamina: 100,
        maxStamina: 100,
        level: 1,
        xp: 0,
        xpToNext: 100,
        skillPoints: 0,
        gold: 50,
      },
      inventory: [
        { item: 'wooden_axe', count: 1 },
        { item: 'torch', count: 2 },
        { item: 'berries', count: 5 },
        { item: 'wood', count: 8 },
        { item: 'stone', count: 4 },
      ],
      selectedSlotIndex: 0,
      isRolling: false,
      rollTimer: 0,
      rollCooldown: 0,
      rollAngle: 0,
      isAttacking: false,
      attackTimer: 0,
      attackDuration: 0.25,
      attackCooldown: 0,
      attackSwingProgress: 0,
      attackType: 'axe',
      hurtTimer: 0,
      skin,
      activePet: petType || 'none',
      walkTimer: 0,
      walkFrame: 0,
      isMoving: false,
      kills: 0,
      nightsSurvived: 0,
      score: 0,
      timeSurvivedSeconds: 0,
      skills: {},
      dashTrail: [],
      attackTrail: [],
    };

    let initialPet: PetEntity | null = null;
    if (petType && petType !== 'none') {
      initialPet = {
        id: 'player_pet',
        type: 'pet',
        kind: petType as any,
        name: petType === 'wolf_pup' ? 'Lobo Cazador' : petType === 'forest_fox' ? 'Zorro Rastreador' : 'Compañero Fiel',
        skillText: petType === 'wolf_pup' ? 'Ataca a bestias cercanas' : 'Recoge recursos cercanos',
        barkTimer: 0,
        x: initialPlayer.x - 20,
        y: initialPlayer.y - 20,
        width: 20,
        height: 20,
        vx: 0,
        vy: 0,
        direction: 'down',
        animFrame: 0,
        animTimer: 0,
      };
    }

    this.state = {
      timeOfDay: 700, // Start in morning (7:00 AM)
      daySpeed: 10, // 240 seconds per day/night cycle
      currentNight: 1,
      isNight: false,
      isSunset: false,
      isBloodMoon: false,
      weather: 'clear',
      currentLocation: 'overworld',
      interiors: this.mapData.interiors,
      dialogueBox: {
        active: false,
        speaker: '',
        title: '',
        text: '',
        fullText: '',
        charIndex: 0,
        charTimer: 0,
        isComplete: true,
        selectedChoiceIndex: 0,
      },
      particles: [],
      floatingTexts: [],
      drops: [],
      monsters: [],
      animals: [],
      projectiles: [],
      structures: this.mapData.structures,
      resourceNodes: this.mapData.resourceNodes,
      campers: this.mapData.campers,
      interactiveProps: this.mapData.interactiveProps || [],
      storyNpcs: this.mapData.storyNpcs || [],
      pet: initialPet,
      player: initialPlayer,
      worldWidth: this.mapData.width,
      worldHeight: this.mapData.height,
      camera: {
        x: initialPlayer.x,
        y: initialPlayer.y,
        zoom: 1,
        shake: 0,
      },
      gameWon: false,
      gameOver: false,
      dailyModifier,
      narrativeAlignment: {
        fuego: 0,
        sombras: 0,
        alquimia: 0,
        vacio: 0,
      },
      unlockedLore: ['lore_origin_fog'],
      unlockedEndings: [],
      activeStoryQuests: {},
      nearbyInteractionPrompt: null,
      hitPauseTimer: 0,
    };

    soundEngine.setMusicMood('day');
  }

  public setCallbacks(onGameOver?: () => void, onVictory?: () => void) {
    this.onGameOverCallback = onGameOver;
    this.onVictoryCallback = onVictory;
  }

  // Rebuild the Pathfinding Obstacle Grid
  public rebuildPathGrid() {
    this.pathGrid.resetGrid();
    const cols = this.mapData.tileCols;
    const rows = this.mapData.tileRows;
    const tiles = this.mapData.tiles;

    // Tile-based impassables (water, cliffs, dense trees)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const t = tiles[r * cols + c];
        if (t === TILE_WATER || t === TILE_CLIFF || t === TILE_DENSE_TREES) {
          this.pathGrid.setBlocked(c, r, true);
        }
      }
    }

    // Static solid rectangles (cabin walls, cliffs, cages)
    this.mapData.solidRects.forEach(sr => {
      this.pathGrid.setRectBlocked(sr.x, sr.y, sr.width, sr.height, true);
    });

    this.pathGridDirty = false;
  }

  // Dynamic Collision Checking
  public checkSolidCollision(x: number, y: number, width: number, height: number, ignoreStructureId?: string): boolean {
    const isOverworld = this.state.currentLocation === 'overworld';

    if (!isOverworld) {
      // Inside an interior room (cabin or cave)
      const interior = this.state.interiors[this.state.currentLocation];
      if (!interior) return false;

      const roomWidth = interior.width * TILE_SIZE;
      const roomHeight = interior.height * TILE_SIZE;

      // Room border walls
      if (x < 32 || x + width > roomWidth - 32 || y < 32 || y + height > roomHeight - 32) {
        return true;
      }

      // Interior furniture & objects
      for (const obj of interior.objects) {
        if (obj.type !== 'torch' && obj.type !== 'sage_npc') {
          if (
            x < obj.x + obj.width &&
            x + width > obj.x &&
            y < obj.y + obj.height &&
            y + height > obj.y
          ) {
            return true;
          }
        }
      }
      return false;
    }

    // Overworld boundary
    if (x < 64 || x + width > this.state.worldWidth - 64 || y < 64 || y + height > this.state.worldHeight - 64) {
      return true;
    }

    // Tile collision (Water, Cliffs)
    const startGX = Math.floor(x / TILE_SIZE);
    const endGX = Math.floor((x + width - 1) / TILE_SIZE);
    const startGY = Math.floor(y / TILE_SIZE);
    const endGY = Math.floor((y + height - 1) / TILE_SIZE);

    const cols = this.mapData.tileCols;
    for (let gy = startGY; gy <= endGY; gy++) {
      for (let gx = startGX; gx <= endGX; gx++) {
        const t = this.mapData.tiles[gy * cols + gx];
        if (t === TILE_WATER || t === TILE_CLIFF || t === TILE_DENSE_TREES) {
          return true;
        }
      }
    }

    // Solid structures (Cabin exterior walls, Campfire, Walls, Cages)
    for (const st of this.state.structures) {
      if (st.id === ignoreStructureId) continue;
      if (st.kind === 'campfire' || st.kind === 'wooden_wall' || st.kind === 'crafting_table' || st.kind === 'storage_chest' || st.kind === 'cage') {
        if (x < st.x + st.width && x + width > st.x && y < st.y + st.height && y + height > st.y) {
          return true;
        }
      }
      if (st.kind === 'cabin_ruin') {
        // Cabin main walls except door opening in center bottom
        const isNearDoor = x + width > st.x + 32 && x < st.x + 64 && y + height >= st.y + st.height - 24;
        if (!isNearDoor) {
          if (x < st.x + st.width && x + width > st.x && y < st.y + st.height && y + height > st.y) {
            return true;
          }
        }
      }
    }

    // Resource Nodes (Trees, Boulders, Iron, Coal)
    for (const node of this.state.resourceNodes) {
      if (!node.depleted) {
        if (node.resourceType === 'tree') {
          // Tree trunk collision
          const trunkX = node.x + 6;
          const trunkY = node.y + 24;
          const trunkW = 24;
          const trunkH = 20;
          if (x < trunkX + trunkW && x + width > trunkX && y < trunkY + trunkH && y + height > trunkY) {
            return true;
          }
        } else if (node.resourceType === 'stone_rock' || node.resourceType === 'iron_rock' || node.resourceType === 'coal_rock') {
          if (x < node.x + node.width && x + width > node.x && y < node.y + node.height && y + height > node.y) {
            return true;
          }
        }
      }
    }

    return false;
  }

  // Master Engine Update Tick
  public update(dt: number) {
    if (this.state.gameOver || this.state.gameWon) return;

    // Update Dialogue Box Typewriter
    if (this.state.dialogueBox.active && !this.state.dialogueBox.isComplete) {
      const db = this.state.dialogueBox;
      db.charTimer += dt;
      if (db.charTimer >= 0.025) {
        db.charTimer = 0;
        if (db.charIndex < db.fullText.length) {
          db.charIndex++;
          db.text = db.fullText.substring(0, db.charIndex);
          if (db.charIndex % 3 === 0) soundEngine.playBlip();
        } else {
          db.isComplete = true;
        }
      }
    }

    // 24h Day/Night Cycle
    this.updateTimeOfDay(dt);

    // Player Logic & Stats
    this.updatePlayer(dt);

    // Check Door / Cave Entrance Interactions
    this.checkDoorTransitions();

    // Interaction Prompts
    this.updateInteractionPrompt();

    // Structures & Campfire
    this.updateStructures(dt);

    // Rescued Campers AI
    this.updateCampers(dt);

    // Pet Companion AI
    this.updatePet(dt);

    // Animals AI (Wander & Flee)
    this.updateAnimals(dt);

    // Monsters AI (A* Pathfinding & Attack)
    if (this.state.currentLocation === 'overworld') {
      this.updateMonsters(dt);
      this.updateSpawning(dt);
    }

    // Projectiles
    this.updateProjectiles(dt);

    // Drops, Particles, Floating Texts
    this.updateDrops(dt);
    this.updateParticles(dt);
    this.updateFloatingTexts(dt);

    // Camera smoothing
    this.updateCamera(dt);

    this.state.player.timeSurvivedSeconds += dt;
    this.state.player.score += Math.floor(dt * 5);
  }

  // Door and Portal Transitions (Overworld <-> Cabin / Cave Interiors)
  private checkDoorTransitions() {
    const p = this.state.player;
    const isOverworld = this.state.currentLocation === 'overworld';

    if (isOverworld) {
      // Check if stepping into any cabin or cave entrance
      for (const [id, interior] of Object.entries(this.state.interiors)) {
        const door = interior.exteriorDoor;
        if (
          p.x + 8 > door.x &&
          p.x - 8 < door.x + door.width &&
          p.y + 8 > door.y &&
          p.y - 8 < door.y + door.height
        ) {
          // Enter Interior Room!
          this.enterInterior(id);
          return;
        }
      }
    } else {
      // Inside an interior room: check if stepping onto exit door
      const currentInterior = this.state.interiors[this.state.currentLocation];
      if (currentInterior) {
        const exit = currentInterior.exitDoor;
        if (
          p.x + 8 > exit.x &&
          p.x - 8 < exit.x + exit.width &&
          p.y + 8 > exit.y &&
          p.y - 8 < exit.y + exit.height
        ) {
          // Exit back to Overworld!
          this.exitInterior();
          return;
        }
      }
    }
  }

  public updateMusicByEnvironment() {
    if (this.state.currentLocation !== 'overworld') {
      soundEngine.setMusicMood('cabin');
      return;
    }
    const hasAliveBoss = this.state.monsters.some(m => m.isBoss && m.hp > 0);
    if (hasAliveBoss || this.state.isBloodMoon) {
      soundEngine.setMusicMood('boss');
    } else if (this.state.isNight) {
      soundEngine.setMusicMood('night');
    } else {
      soundEngine.setMusicMood('day');
    }
  }

  public enterInterior(interiorId: string) {
    const interior = this.state.interiors[interiorId];
    if (!interior) return;

    this.state.currentLocation = interiorId;
    this.state.player.x = interior.interiorSpawn.x;
    this.state.player.y = interior.interiorSpawn.y;
    this.state.player.vx = 0;
    this.state.player.vy = 0;

    soundEngine.playStairs();
    soundEngine.setMusicMood('cabin');
    this.addFloatingText(`🚪 Entrando a: ${interior.name}`, this.state.player.x, this.state.player.y - 30, '#fce000');

    // Trigger Old Sage Dialogue if available
    if (interior.sageDialogue) {
      this.showDialogue(interior.sageName || 'Sabio del Refugio', interior.name, interior.sageDialogue, '🧙');
    }
  }

  public exitInterior() {
    const currentInterior = this.state.interiors[this.state.currentLocation];
    if (!currentInterior) return;

    this.state.currentLocation = 'overworld';
    this.state.player.x = currentInterior.exteriorDoor.x + currentInterior.exteriorDoor.width / 2;
    this.state.player.y = currentInterior.exteriorDoor.y + currentInterior.exteriorDoor.height + 16;
    this.state.player.vx = 0;
    this.state.player.vy = 0;

    soundEngine.playStairs();
    this.updateMusicByEnvironment();
    this.addFloatingText('🌲 De regreso al bosque', this.state.player.x, this.state.player.y - 30, '#58d854');
  }

  // Dialogue & Information Box Display
  public showDialogue(speaker: string, title: string, text: string, icon?: string) {
    this.state.dialogueBox = {
      active: true,
      speaker,
      title,
      text: '',
      fullText: text,
      charIndex: 0,
      charTimer: 0,
      isComplete: false,
      icon,
      selectedChoiceIndex: 0,
    };
    soundEngine.playDialogueBeep();
  }

  public showDialogueNode(nodeId: string) {
    const node = STORY_DIALOGUE_NODES[nodeId];
    if (!node) return;

    this.state.dialogueBox = {
      active: true,
      speaker: node.speaker,
      title: node.title,
      text: '',
      fullText: node.text,
      charIndex: 0,
      charTimer: 0,
      isComplete: false,
      icon: node.icon,
      choices: node.choices,
      selectedChoiceIndex: 0,
      currentNodeId: nodeId,
    };
    soundEngine.playDialogueBeep();
  }

  public selectNextDialogueChoice() {
    const db = this.state.dialogueBox;
    if (!db.active || !db.choices || db.choices.length === 0) return;
    db.selectedChoiceIndex = (db.selectedChoiceIndex + 1) % db.choices.length;
    soundEngine.playBlip();
  }

  public selectPrevDialogueChoice() {
    const db = this.state.dialogueBox;
    if (!db.active || !db.choices || db.choices.length === 0) return;
    db.selectedChoiceIndex = (db.selectedChoiceIndex - 1 + db.choices.length) % db.choices.length;
    soundEngine.playBlip();
  }

  public confirmDialogueChoice(choiceIndex?: number) {
    const db = this.state.dialogueBox;
    if (!db.active) return;

    if (!db.isComplete) {
      // Instant text reveal
      db.charIndex = db.fullText.length;
      db.text = db.fullText;
      db.isComplete = true;
      return;
    }

    if (!db.choices || db.choices.length === 0) {
      db.active = false;
      soundEngine.playBlip();
      return;
    }

    const idx = choiceIndex !== undefined ? choiceIndex : db.selectedChoiceIndex;
    const choice = db.choices[idx];
    if (!choice) {
      db.active = false;
      return;
    }

    // Apply choice effects
    if (choice.faction && choice.alignmentValue) {
      this.state.narrativeAlignment[choice.faction] += choice.alignmentValue;
      const factionNames: Record<string, string> = {
        fuego: 'DEL FUEGO ETERNO',
        sombras: 'DE LAS SOMBRAS',
        alquimia: 'DE LA ALQUIMIA',
        vacio: 'DEL VACÍO',
      };
      this.addFloatingText(`✨ +${choice.alignmentValue} SENDA ${factionNames[choice.faction] || choice.faction.toUpperCase()}`, this.state.player.x, this.state.player.y - 45, '#fce000');
    }

    if (choice.action === 'accept_quest' && db.currentNodeId) {
      this.state.activeStoryQuests[db.currentNodeId] = 'active';
      soundEngine.playLevelUp();
      this.addFloatingText('📜 ¡NUEVA MISIÓN SECUNDARIA INICIADA!', this.state.player.x, this.state.player.y - 35, '#3cbcfc');
    }

    if (choice.action === 'trade' && choice.requiredItem && choice.rewardItem) {
      if (this.hasItem(choice.requiredItem, 1)) {
        this.consumeItem(choice.requiredItem, 1);
        this.addItemToInventory(choice.rewardItem, choice.rewardCount || 1);
        soundEngine.playPickup();
        this.addFloatingText(`+${choice.rewardCount || 1} ${ITEM_DEFINITIONS[choice.rewardItem]?.name || choice.rewardItem}`, this.state.player.x, this.state.player.y - 30, '#58d854');
      } else {
        this.addFloatingText(`¡Necesitas ${ITEM_DEFINITIONS[choice.requiredItem]?.name || choice.requiredItem}!`, this.state.player.x, this.state.player.y - 30, '#d82800');
        soundEngine.playHitPlayer();
        return;
      }
    }

    if (choice.action === 'give_item' && choice.requiredItem) {
      if (this.hasItem(choice.requiredItem, 1)) {
        this.consumeItem(choice.requiredItem, 1);
        if (choice.rewardItem) {
          this.addItemToInventory(choice.rewardItem, choice.rewardCount || 1);
        }
        soundEngine.playLevelUp();
        this.addFloatingText('🎁 ¡OBJETO ENTREGADO CON ÉXITO!', this.state.player.x, this.state.player.y - 30, '#58d854');
      } else {
        this.addFloatingText(`¡No posees ${ITEM_DEFINITIONS[choice.requiredItem]?.name || choice.requiredItem}!`, this.state.player.x, this.state.player.y - 30, '#d82800');
        soundEngine.playHitPlayer();
        return;
      }
    }

    if (choice.action === 'heal') {
      this.state.player.stats.hp = this.state.player.stats.maxHp;
      this.state.player.stats.warmth = this.state.player.stats.maxWarmth;
      this.state.player.stats.stamina = this.state.player.stats.maxStamina;
      soundEngine.playLevelUp();
      this.addFloatingText('❤️ ¡SALUD, CALOR Y ESTAMINA RESTAURADOS!', this.state.player.x, this.state.player.y - 35, '#58d854');
    }

    if (choice.action === 'unlock_lore') {
      this.addPlayerXp(75);
      soundEngine.playLevelUp();
      this.addFloatingText('📜 ¡NUEVO LORE REGISTRADO EN EL CÓDICE!', this.state.player.x, this.state.player.y - 35, '#3cbcfc');
    }

    if (choice.action === 'trigger_ending' && choice.endingId) {
      this.triggerStoryEnding(choice.endingId);
      return;
    }

    if (choice.nextNodeId) {
      this.showDialogueNode(choice.nextNodeId);
    } else {
      db.active = false;
      soundEngine.playBlip();
    }
  }

  public triggerStoryEnding(endingId: string) {
    const ending = STORY_ENDINGS_CATALOG.find(e => e.id === endingId);
    if (!ending) return;

    if (!this.state.unlockedEndings.includes(endingId)) {
      this.state.unlockedEndings.push(endingId);
    }

    this.state.activeEnding = ending;
    this.state.gameWon = true;
    this.state.dialogueBox.active = false;
    soundEngine.setMusicMood('boss');
    soundEngine.playDawnChime();
    soundEngine.speakSpanish(`¡Final desbloqueado! ${ending.title}. ${ending.description}`, 'story_ending', 25000);

    if (this.onVictoryCallback) {
      this.onVictoryCallback();
    }
  }

  public advanceDialogue() {
    const db = this.state.dialogueBox;
    if (!db.active) return;

    if (!db.isComplete) {
      // Instant reveal
      db.charIndex = db.fullText.length;
      db.text = db.fullText;
      db.isComplete = true;
    } else {
      if (db.choices && db.choices.length > 0) {
        this.confirmDialogueChoice();
      } else {
        // Close box
        db.active = false;
        soundEngine.playBlip();
      }
    }
  }

  // Fetch AI Wisdom / Prophecies from Gemini Server API
  private async fetchAiOracle(locationType: 'cabin' | 'cave', npcName: string) {
    try {
      const res = await fetch('/api/sage-oracle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          npcName,
          locationType,
          night: this.state.currentNight,
          hp: Math.round(this.state.player.stats.hp),
          warmth: Math.round(this.state.player.stats.warmth),
          inventoryItems: this.state.player.inventory.map(i => ITEM_DEFINITIONS[i.item]?.name || i.item),
        }),
      });
      const data = await res.json();
      if (data.success && data.text && this.state.dialogueBox.active) {
        this.showDialogue(npcName, 'Consejo Ancestral de la IA', data.text, '🔮');
      }
    } catch {}
  }

  // 24-Hour Cycle Logic
  private updateTimeOfDay(dt: number) {
    const prevTime = this.state.timeOfDay;
    this.state.timeOfDay = (this.state.timeOfDay + dt * this.state.daySpeed) % 2400;

    const time = this.state.timeOfDay;
    const isNowNight = time >= 2000 || time < 600;
    const isNowSunset = time >= 1750 && time < 2000;

    // Sunset Warning
    if (!this.state.isSunset && isNowSunset) {
      this.state.isSunset = true;
      soundEngine.playNightWarning();
      soundEngine.speakSpanish('¡Cuidado! El sol se oculta. Regresa a la fogata antes de que caiga la noche.', 'sunset_warn', 15000);
      this.addFloatingText('⚠️ ¡EL SOL SE OCULTA! REGRESA AL FUEGO', this.state.player.x, this.state.player.y - 40, '#f8b800');
    } else if (!isNowSunset) {
      this.state.isSunset = false;
    }

    // Night Transition
    if (!this.state.isNight && isNowNight) {
      this.state.isNight = true;
      const isBossNight = this.state.currentNight === 10 || this.state.currentNight === 50 || this.state.currentNight === 99;
      const isBloodMoon = this.state.currentNight % 5 === 0 && !isBossNight;
      this.state.isBloodMoon = isBloodMoon;

      if (isBossNight) {
        soundEngine.setMusicMood('boss');
        soundEngine.playBossRoar();
        if (this.state.currentNight === 99) {
          soundEngine.speakSpanish('¡Noche 99! ¡El Wendigo Ancestral ha despertado en el corazón del bosque!', 'wendigo_99', 30000);
          this.spawnBoss('boss_ancient_wendigo');
        } else if (this.state.currentNight === 10) {
          soundEngine.speakSpanish('¡Noche 10! ¡El Ciervo Maldito emerge de las sombras!', 'boss_10', 30000);
          this.spawnBoss('boss_corrupted_elk');
        } else if (this.state.currentNight === 50) {
          soundEngine.speakSpanish('¡Noche 50! ¡El Cultista Supremo ataca el campamento!', 'boss_50', 30000);
          this.spawnBoss('boss_cultist_overlord');
        }
      } else if (isBloodMoon) {
        soundEngine.setMusicMood('boss');
        soundEngine.playNightWarning();
        soundEngine.speakSpanish('¡Luna de Sangre! Las bestias atacarán en hordas voraces.', 'blood_moon', 20000);
        this.addFloatingText('🩸 ¡LUNA DE SANGRE ACTIVA!', this.state.player.x, this.state.player.y - 50, '#d82800');
      } else {
        soundEngine.setMusicMood('night');
        soundEngine.playNightWarning();
        soundEngine.speakSpanish(`Noche ${this.state.currentNight}. ¡Mantén el fuego encendido y defiéndete!`, 'night_start', 15000);
      }
    }

    // Dawn Transition (Survived the night!)
    if (this.state.isNight && time >= 600 && prevTime < 600) {
      this.state.isNight = false;
      this.state.isBloodMoon = false;
      this.state.currentNight++;
      this.state.player.nightsSurvived++;

      // Check Victory at Night 99 completion
      if (this.state.player.nightsSurvived >= 99) {
        this.state.gameWon = true;
        soundEngine.speakSpanish('¡Increíble! ¡Has sobrevivido a las 99 noches en el bosque!', 'win_99');
        if (this.onVictoryCallback) this.onVictoryCallback();
        return;
      }

      soundEngine.setMusicMood('day');
      soundEngine.playDawnChime();
      soundEngine.speakSpanish(`¡Amanecer! Has sobrevivido la noche ${this.state.currentNight - 1}.`, 'dawn_chime', 10000);

      // Survival rewards
      const goldReward = 20 + this.state.currentNight * 5;
      const xpReward = 50 + this.state.currentNight * 10;
      this.state.player.stats.gold += goldReward;
      this.addPlayerXp(xpReward);

      this.addFloatingText(`☀️ ¡NOCHE ${this.state.currentNight - 1} SUPERADA! +${goldReward} ORO`, this.state.player.x, this.state.player.y - 40, '#fce000');

      // Burn remaining overworld monsters with daylight
      this.state.monsters.forEach(m => {
        if (!m.isBoss) {
          m.hp = 0;
          this.createExplosionParticles(m.x, m.y, '#fc7400', 12);
        }
      });
      this.state.monsters = this.state.monsters.filter(m => m.hp > 0);
    }
  }

  // Player Update & Movement with strict collision and animation
  private updatePlayer(dt: number) {
    const p = this.state.player;
    const stats = p.stats;

    // Hit Pause timer
    if (this.state.hitPauseTimer > 0) {
      this.state.hitPauseTimer -= dt;
      return; // Freeze movement briefly for punchy game feel
    }

    // Roll cooldown & timers
    if (p.rollTimer > 0) {
      p.rollTimer -= dt;
      p.rollAngle += dt * 20;
      if (p.rollTimer <= 0) {
        p.isRolling = false;
        p.rollAngle = 0;
      }
    }
    if (p.rollCooldown > 0) p.rollCooldown -= dt;

    // Attack Swing Progress
    if (p.attackTimer > 0) {
      p.attackTimer -= dt;
      p.attackSwingProgress = 1 - Math.max(0, p.attackTimer / p.attackDuration);
      if (p.attackTimer <= 0) {
        p.isAttacking = false;
        p.attackSwingProgress = 0;
      }
    }
    if (p.attackCooldown > 0) p.attackCooldown -= dt;
    if (p.hurtTimer > 0) p.hurtTimer -= dt;

    // Movement calculation with X and Y separate collision checks (slide along walls)
    const moveSpeed = p.isRolling ? 240 : 130;
    const newX = p.x + p.vx * moveSpeed * dt;
    const newY = p.y + p.vy * moveSpeed * dt;

    const pWidth = 20;
    const pHeight = 24;

    // Test X move
    if (!this.checkSolidCollision(newX - pWidth / 2, p.y - pHeight / 2, pWidth, pHeight)) {
      p.x = newX;
    }

    // Test Y move
    if (!this.checkSolidCollision(p.x - pWidth / 2, newY - pHeight / 2, pWidth, pHeight)) {
      p.y = newY;
    }

    // Walking animation & directional perspective
    const isMoving = Math.hypot(p.vx, p.vy) > 0.05;
    p.isMoving = isMoving;
    if (isMoving) {
      p.facingAngle = Math.atan2(p.vy, p.vx);
      if (Math.abs(p.vx) > Math.abs(p.vy)) {
        p.direction = p.vx > 0 ? 'right' : 'left';
      } else {
        p.direction = p.vy > 0 ? 'down' : 'up';
      }
      p.walkTimer += dt * 10; // Stepping frequency
      p.walkFrame = Math.floor(p.walkTimer) % 4; // 0, 1, 2, 3
    } else {
      p.walkTimer = 0;
      p.walkFrame = 0;
    }

    // Dash trail when rolling
    if (p.isRolling && Math.random() < 0.6) {
      p.dashTrail.push({
        x: p.x,
        y: p.y,
        alpha: 0.65,
        direction: p.direction,
        frame: p.walkFrame,
      });
    }
    p.dashTrail.forEach(t => (t.alpha -= dt * 3.5));
    p.dashTrail = p.dashTrail.filter(t => t.alpha > 0);

    // Attack trail decay
    p.attackTrail.forEach(t => (t.alpha -= dt * 4.5));
    p.attackTrail = p.attackTrail.filter(t => t.alpha > 0);

    // Stamina regeneration
    if (p.stats.stamina < p.stats.maxStamina && !p.isRolling) {
      p.stats.stamina = Math.min(p.stats.maxStamina, p.stats.stamina + dt * 25);
    }

    // Hunger drain
    const hungerDrain = this.state.dailyModifier === 'scarcity' ? 0.9 : 0.45;
    stats.hunger = Math.max(0, stats.hunger - dt * hungerDrain);

    // Warmth & Cold Calculations
    const campfire = this.getCampfire();
    const distToCamp = campfire ? Math.hypot(p.x - campfire.x, p.y - campfire.y) : 9999;
    const activeItem = this.getActiveItem();
    const isHoldingTorch = activeItem?.item === 'torch';
    const isInsideInterior = this.state.currentLocation !== 'overworld';
    const isNearCampfire = campfire && campfire.fuel! > 0 && distToCamp < (campfire.lightRadius || 180);

    if (isInsideInterior || isNearCampfire || (!this.state.isNight && !this.state.isSunset)) {
      // Warmth recharges safely
      stats.warmth = Math.min(stats.maxWarmth, stats.warmth + dt * 20);
    } else if (isHoldingTorch) {
      // Torch maintains warmth
      stats.warmth = Math.max(30, stats.warmth - dt * 0.4);
    } else if (this.state.isNight) {
      // Draining warmth in freezing night
      const warmthDrain = this.state.dailyModifier === 'polar_freeze' ? 2.5 : 1.2;
      stats.warmth = Math.max(0, stats.warmth - dt * warmthDrain);

      if (stats.warmth <= 0) {
        // Freezing damage!
        stats.hp = Math.max(0, stats.hp - dt * 4);
        soundEngine.speakSpanish('¡Te estás congelando! Busca una cabaña o la fogata.', 'freeze_warn', 12000);
        if (Math.random() < 0.1) {
          this.addFloatingText('❄️ ¡CONGELACIÓN!', p.x, p.y - 20, '#3cbcfc');
        }
      }
    }

    // Starvation damage
    if (stats.hunger <= 0) {
      stats.hp = Math.max(0, stats.hp - dt * 3);
      soundEngine.speakSpanish('¡Estás hambriento! Come bayas o carne asada.', 'starve_warn', 15000);
    }

    // Check Death
    if (stats.hp <= 0 && !this.state.gameOver) {
      this.triggerGameOver();
    }
  }

  // Update nearby interaction prompt
  private updateInteractionPrompt() {
    const p = this.state.player;
    this.state.nearbyInteractionPrompt = null;

    if (this.state.dialogueBox.active) return;

    if (this.state.currentLocation === 'overworld') {
      // Story NPCs
      for (const npc of this.state.storyNpcs) {
        if (Math.hypot(p.x - npc.x, p.y - npc.y) < npc.interactionRadius) {
          this.state.nearbyInteractionPrompt = {
            text: `Hablar con ${npc.name}`,
            actionName: 'HABLAR',
            targetX: npc.x,
            targetY: npc.y,
          };
          return;
        }
      }

      // Interactive Props
      for (const prop of this.state.interactiveProps) {
        if (Math.hypot(p.x - prop.x, p.y - prop.y) < prop.interactionRadius) {
          this.state.nearbyInteractionPrompt = {
            text: `Examinar ${prop.name}`,
            actionName: 'EXAMINAR',
            targetX: prop.x,
            targetY: prop.y,
          };
          return;
        }
      }

      // Caged Campers
      const caged = this.state.campers.find(c => c.state === 'caged' && Math.hypot(p.x - c.x, p.y - c.y) < 55);
      if (caged) {
        this.state.nearbyInteractionPrompt = {
          text: `Rescatar a ${caged.name}`,
          actionName: 'RESCATAR',
          targetX: caged.x,
          targetY: caged.y,
        };
        return;
      }
    } else {
      // Interior Objects
      const interior = this.state.interiors[this.state.currentLocation];
      if (interior) {
        for (const obj of interior.objects) {
          if (Math.hypot(p.x - (obj.x + obj.width / 2), p.y - (obj.y + obj.height / 2)) < 48) {
            this.state.nearbyInteractionPrompt = {
              text: `${obj.name}`,
              actionName: 'INTERACTUAR',
              targetX: obj.x + obj.width / 2,
              targetY: obj.y + obj.height / 2,
            };
            return;
          }
        }
      }
    }
  }

  // Structures & Campfire
  private updateStructures(dt: number) {
    const campfire = this.getCampfire();
    if (campfire) {
      const fuelBurnRate = (this.state.isNight ? 1.0 : 0.35);
      campfire.fuel = Math.max(0, campfire.fuel! - dt * fuelBurnRate);

      // Warning when campfire is nearly dead
      if (campfire.fuel <= 15 && campfire.fuel > 0 && this.state.isNight) {
        soundEngine.speakSpanish('¡El fuego se apaga! Añade madera a la fogata.', 'fire_dying', 15000);
        if (Math.random() < 0.05) {
          this.addFloatingText('🔥 ¡FUEGO AGONIZANTE!', campfire.x + 24, campfire.y - 10, '#d82800');
        }
      }

      // Campfire spark particles
      if (campfire.fuel > 0 && Math.random() < 0.3) {
        this.state.particles.push({
          x: campfire.x + 16 + Math.random() * 16,
          y: campfire.y + 16 + Math.random() * 16,
          vx: (Math.random() - 0.5) * 20,
          vy: -30 - Math.random() * 40,
          color: Math.random() > 0.5 ? '#fc7400' : '#fce000',
          size: 3,
          life: 0,
          maxLife: 0.6,
          alpha: 1,
          shape: 'flame',
        });
      }
    }
  }

  // Rescued Campers AI & Perks
  private updateCampers(dt: number) {
    const campfire = this.getCampfire();
    const p = this.state.player;

    this.state.campers.forEach(camper => {
      if (camper.state === 'in_camp' && campfire) {
        const targetX = campfire.x + 24 + Math.sin(camper.id.charCodeAt(0)) * 60;
        const targetY = campfire.y + 24 + Math.cos(camper.id.charCodeAt(0)) * 60;
        const dx = targetX - camper.x;
        const dy = targetY - camper.y;
        if (Math.hypot(dx, dy) > 10) {
          camper.x += Math.sign(dx) * 25 * dt;
          camper.y += Math.sign(dy) * 25 * dt;
        }

        // Perks
        if (camper.role === 'scavenger' && Math.random() < 0.008) {
          this.addItemToInventory('wood', 1);
          this.addFloatingText('+1 Madera (Tomás)', camper.x, camper.y - 20, '#885818');
        }
        if (camper.role === 'medic' && Math.hypot(p.x - camper.x, p.y - camper.y) < 140) {
          if (p.stats.hp < p.stats.maxHp && Math.random() < 0.05) {
            p.stats.hp = Math.min(p.stats.maxHp, p.stats.hp + 2);
          }
        }
        if (camper.role === 'guard' && this.state.isNight && this.state.currentLocation === 'overworld') {
          const nearbyMonster = this.state.monsters.find(m => Math.hypot(m.x - camper.x, m.y - camper.y) < 180);
          if (nearbyMonster && Math.random() < 0.04) {
            nearbyMonster.hp -= 25;
            soundEngine.playGunshot();
            this.addFloatingText('-25 (Mateo)', nearbyMonster.x, nearbyMonster.y - 15, '#fce000');
          }
        }
      }
    });
  }

  // Pet Companion Update
  private updatePet(dt: number) {
    const pet = this.state.pet;
    const p = this.state.player;
    if (!pet) return;

    const dx = p.x - pet.x;
    const dy = p.y - pet.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 40) {
      pet.x += (dx / dist) * 160 * dt;
      pet.y += (dy / dist) * 160 * dt;
    }

    if (pet.kind === 'forest_fox' && this.state.drops.length > 0) {
      const nearDrop = this.state.drops.find(d => Math.hypot(d.x - pet.x, d.y - pet.y) < 120);
      if (nearDrop) {
        nearDrop.x += (pet.x - nearDrop.x) * 4 * dt;
        nearDrop.y += (pet.y - nearDrop.y) * 4 * dt;
      }
    }

    if (pet.kind === 'wolf_pup' && this.state.monsters.length > 0 && this.state.currentLocation === 'overworld') {
      const nearMonster = this.state.monsters.find(m => Math.hypot(m.x - pet.x, m.y - pet.y) < 90);
      if (nearMonster && Math.random() < 0.03) {
        nearMonster.hp -= 15;
        this.addFloatingText('🐺 -15', nearMonster.x, nearMonster.y - 20, '#d82800');
        soundEngine.playAttack();
      }
    }
  }

  // Animals AI (Wander & Flee)
  private updateAnimals(dt: number) {
    if (this.state.currentLocation !== 'overworld') return;

    const p = this.state.player;

    this.state.animals.forEach(animal => {
      const distToPlayer = Math.hypot(p.x - animal.x, p.y - animal.y);

      // Flee from player if close
      if (distToPlayer < 100) {
        animal.fleeing = true;
        animal.fleeTimer = 3;
      }

      if (animal.fleeTimer > 0) {
        animal.fleeTimer -= dt;
        if (animal.fleeTimer <= 0) animal.fleeing = false;
      }

      let vx = 0;
      let vy = 0;

      if (animal.fleeing) {
        const dx = animal.x - p.x;
        const dy = animal.y - p.y;
        const dist = Math.hypot(dx, dy) || 1;
        vx = (dx / dist) * animal.speed;
        vy = (dy / dist) * animal.speed;
      } else {
        // Slow wandering
        if (Math.random() < 0.02) {
          const angle = Math.random() * Math.PI * 2;
          animal.vx = Math.cos(angle) * (animal.speed * 0.4);
          animal.vy = Math.sin(angle) * (animal.speed * 0.4);
        }
        vx = animal.vx || 0;
        vy = animal.vy || 0;
      }

      const nextX = animal.x + vx * dt;
      const nextY = animal.y + vy * dt;

      if (!this.checkSolidCollision(nextX - animal.width / 2, animal.y - animal.height / 2, animal.width, animal.height)) {
        animal.x = nextX;
      }
      if (!this.checkSolidCollision(animal.x - animal.width / 2, nextY - animal.height / 2, animal.width, animal.height)) {
        animal.y = nextY;
      }

      if (Math.abs(vx) > Math.abs(vy)) {
        animal.direction = vx > 0 ? 'right' : 'left';
      } else if (Math.abs(vy) > 0) {
        animal.direction = vy > 0 ? 'down' : 'up';
      }
    });
  }

  // Monsters AI with A* Pathfinding Navigation & Collision Detection
  private updateMonsters(dt: number) {
    const p = this.state.player;
    const campfire = this.getCampfire();

    this.state.monsters.forEach(m => {
      if (m.hurtTimer > 0) m.hurtTimer -= dt;

      // Determine Target (Player or Campfire)
      let targetX = p.x;
      let targetY = p.y;
      if (m.targetType === 'campfire' && campfire && campfire.fuel! > 0) {
        targetX = campfire.x + 24;
        targetY = campfire.y + 24;
      }

      const distToTarget = Math.hypot(targetX - m.x, targetY - m.y);

      // Pathfinding Update
      m.pathTimer = (m.pathTimer || 0) + dt;
      if (!m.path || m.path.length === 0 || m.pathTimer > 1.0) {
        m.pathTimer = 0;
        // Check line of sight first
        const hasLOS = this.pathGrid.hasLineOfSight(m.x, m.y, targetX, targetY);
        if (hasLOS) {
          m.path = [{ x: targetX, y: targetY }];
          m.pathIndex = 0;
        } else {
          // A* pathfinding calculation
          const calculatedPath = this.pathGrid.findPath(m.x, m.y, targetX, targetY, 250);
          m.path = calculatedPath.length > 0 ? calculatedPath : [{ x: targetX, y: targetY }];
          m.pathIndex = 0;
        }
      }

      // Follow Waypoints
      if (m.path && m.path.length > 0) {
        const currentWaypoint = m.path[m.pathIndex || 0];
        if (currentWaypoint) {
          const wdx = currentWaypoint.x - m.x;
          const wdy = currentWaypoint.y - m.y;
          const wdist = Math.hypot(wdx, wdy);

          if (wdist < 16) {
            // Next waypoint
            m.pathIndex = (m.pathIndex || 0) + 1;
            if (m.pathIndex >= m.path.length) {
              m.path = undefined;
            }
          } else {
            const mvx = (wdx / wdist) * m.speed;
            const mvy = (wdy / wdist) * m.speed;

            const nextX = m.x + mvx * dt;
            const nextY = m.y + mvy * dt;

            // Strict collision for monsters
            if (!this.checkSolidCollision(nextX - m.width / 2, m.y - m.height / 2, m.width, m.height)) {
              m.x = nextX;
            }
            if (!this.checkSolidCollision(m.x - m.width / 2, nextY - m.height / 2, m.width, m.height)) {
              m.y = nextY;
            }

            if (Math.abs(mvx) > Math.abs(mvy)) {
              m.direction = mvx > 0 ? 'right' : 'left';
            } else {
              m.direction = mvy > 0 ? 'down' : 'up';
            }
          }
        }
      }

      // Attack player or campfire
      if (distToTarget <= m.attackRange) {
        const now = performance.now();
        if (now - m.lastAttackTime >= m.attackCooldown) {
          m.lastAttackTime = now;
          if (m.targetType === 'player' || distToTarget <= 32) {
            if (!p.isRolling) {
              p.stats.hp = Math.max(0, p.stats.hp - m.damage);
              p.hurtTimer = 0.3;
              soundEngine.playHitPlayer();
              this.addFloatingText(`-${m.damage} HP`, p.x, p.y - 30, '#d82800');
              this.createBloodParticles(p.x, p.y, 6);
            }
          } else if (m.targetType === 'campfire' && campfire) {
            campfire.fuel = Math.max(0, campfire.fuel! - m.damage * 0.5);
            soundEngine.playFireFeed();
            this.addFloatingText(`-${Math.floor(m.damage * 0.5)} Fuego`, campfire.x + 24, campfire.y - 20, '#d82800');
          }
        }
      }
    });

    // Cleanup dead monsters
    this.state.monsters = this.state.monsters.filter(m => m.hp > 0);
  }

  // Periodic Spawning (Animals in Day, Monsters in Night)
  private updateSpawning(dt: number) {
    if (this.state.currentLocation !== 'overworld') return;

    this.animalSpawnTimer += dt;
    if (this.animalSpawnTimer >= 15 && this.state.animals.length < 12) {
      this.animalSpawnTimer = 0;
      this.spawnAnimal();
    }

    if (this.state.isNight) {
      this.monsterSpawnTimer += dt;
      const spawnInterval = this.state.isBloodMoon ? 3 : Math.max(4, 9 - this.state.currentNight * 0.1);
      const maxMonsters = 8 + this.state.currentNight * 2;

      if (this.monsterSpawnTimer >= spawnInterval && this.state.monsters.length < maxMonsters) {
        this.monsterSpawnTimer = 0;
        this.spawnMonster();
      }
    }
  }

  private spawnMonster() {
    const p = this.state.player;
    const angle = Math.random() * Math.PI * 2;
    const dist = 380 + Math.random() * 150;
    const spawnX = Math.max(100, Math.min(this.state.worldWidth - 100, p.x + Math.cos(angle) * dist));
    const spawnY = Math.max(100, Math.min(this.state.worldHeight - 100, p.y + Math.sin(angle) * dist));

    const night = this.state.currentNight;
    const roll = Math.random();

    let subType: MonsterType = 'corrupted_wolf';
    let name = 'Lobo Corrupto';
    let color = '#383838';
    let speed = 80;
    let hp = 40 + night * 5;
    let damage = 12;

    if (night >= 4 && roll > 0.6) {
      subType = 'shadow_walker';
      name = 'Caminante de Sombras';
      color = '#881400';
      speed = 95;
      hp = 70 + night * 8;
      damage = 18;
    } else if (night >= 8 && roll > 0.75) {
      subType = 'cultist_minion';
      name = 'Cultista del Bosque';
      color = '#6820a0';
      speed = 70;
      hp = 95 + night * 10;
      damage = 24;
    } else if (night >= 15 && roll > 0.85) {
      subType = 'night_stalker';
      name = 'Acechador Nocturno';
      color = '#440068';
      speed = 110;
      hp = 140 + night * 12;
      damage = 35;
    }

    this.state.monsters.push({
      id: `monster_${Date.now()}_${Math.random()}`,
      type: 'monster',
      subType,
      name,
      x: spawnX,
      y: spawnY,
      width: 32,
      height: 36,
      vx: 0,
      vy: 0,
      direction: 'down',
      animFrame: 0,
      animTimer: 0,
      hp,
      maxHp: hp,
      speed,
      damage,
      attackRange: 28,
      attackCooldown: 1000,
      lastAttackTime: 0,
      targetType: Math.random() < 0.65 ? 'player' : 'campfire',
      color,
      state: 'hunting',
      hurtTimer: 0,
    });
  }

  private spawnBoss(bossType: MonsterType) {
    const p = this.state.player;
    let name = 'Jefe del Bosque';
    let hp = 1000;
    let damage = 40;
    let speed = 75;
    let color = '#d82800';

    if (bossType === 'boss_corrupted_elk') {
      name = 'El Ciervo Maldito (Noche 10)';
      hp = 850;
      damage = 35;
      speed = 90;
      color = '#881400';
    } else if (bossType === 'boss_cultist_overlord') {
      name = 'Cultista Supremo (Noche 50)';
      hp = 2200;
      damage = 60;
      speed = 80;
      color = '#6820a0';
    } else if (bossType === 'boss_ancient_wendigo') {
      name = 'WENDIGO ANCESTRAL (Noche 99)';
      hp = 6000;
      damage = 90;
      speed = 105;
      color = '#f8f8f8';
    }

    this.state.monsters.push({
      id: `boss_${bossType}`,
      type: 'monster',
      subType: bossType,
      name,
      x: p.x + 280,
      y: p.y - 280,
      width: 64,
      height: 72,
      vx: 0,
      vy: 0,
      direction: 'down',
      animFrame: 0,
      animTimer: 0,
      hp,
      maxHp: hp,
      speed,
      damage,
      attackRange: 45,
      attackCooldown: 1200,
      lastAttackTime: 0,
      targetType: 'player',
      isBoss: true,
      color,
      state: 'hunting',
      hurtTimer: 0,
    });
  }

  private spawnAnimal() {
    const x = 100 + Math.random() * (this.state.worldWidth - 200);
    const y = 100 + Math.random() * (this.state.worldHeight - 200);
    const kindRoll = Math.random();
    const kind = kindRoll < 0.5 ? 'rabbit' : kindRoll < 0.85 ? 'deer' : 'boar';

    this.state.animals.push({
      id: `animal_${Date.now()}_${Math.random()}`,
      type: 'animal',
      kind,
      x,
      y,
      width: kind === 'rabbit' ? 20 : 36,
      height: kind === 'rabbit' ? 20 : 36,
      vx: 0,
      vy: 0,
      direction: 'down',
      animFrame: 0,
      animTimer: 0,
      hp: kind === 'rabbit' ? 20 : kind === 'deer' ? 50 : 80,
      maxHp: kind === 'rabbit' ? 20 : kind === 'deer' ? 50 : 80,
      speed: kind === 'rabbit' ? 85 : kind === 'deer' ? 110 : 70,
      fleeing: false,
      fleeTimer: 0,
      meatDrop: kind === 'rabbit' ? 1 : kind === 'deer' ? 3 : 2,
    });
  }

  public spawnDrop(item: ItemType, count: number, x: number, y: number) {
    this.state.drops.push({
      id: `drop_${Date.now()}_${Math.random()}`,
      type: 'drop',
      item,
      count,
      x,
      y,
      width: 20,
      height: 20,
      vx: 0,
      vy: 0,
      direction: 'down',
      animFrame: 0,
      animTimer: 0,
      lifeTime: 120,
      bobOffset: 0,
    });
  }

  // Player Actions (A / B Buttons, NES Controls)
  public performActionA() {
    // Attack / Chop / Mine / Fire Weapon or Advance Dialogue
    if (this.state.dialogueBox.active) {
      if (this.state.dialogueBox.choices && this.state.dialogueBox.choices.length > 0) {
        this.confirmDialogueChoice();
      } else {
        this.advanceDialogue();
      }
      return;
    }

    const p = this.state.player;
    if (p.attackCooldown > 0 || p.isRolling) return;

    // Check interaction with Overworld Story NPCs (Vaelen, Morrigan, Alden's Ghost)
    if (this.state.currentLocation === 'overworld') {
      const nearStoryNpc = this.state.storyNpcs.find(npc => Math.hypot(p.x - npc.x, p.y - npc.y) < npc.interactionRadius);
      if (nearStoryNpc) {
        nearStoryNpc.hasTalked = true;
        this.showDialogueNode(nearStoryNpc.dialogueNodeId);
        return;
      }

      // Check interaction with Overworld Interactive Props (Monolito, Pozo, Altar, Tumba)
      const nearProp = this.state.interactiveProps.find(prop => Math.hypot(p.x - prop.x, p.y - prop.y) < prop.interactionRadius);
      if (nearProp) {
        nearProp.isActivated = true;
        this.showDialogueNode(nearProp.dialogueNodeId);
        return;
      }
    }

    // Check interaction with Interior Objects (Chests, Fireplaces, Sages, Bookshelves)
    if (this.state.currentLocation !== 'overworld') {
      const interior = this.state.interiors[this.state.currentLocation];
      if (interior) {
        for (const obj of interior.objects) {
          if (Math.hypot(p.x - (obj.x + obj.width / 2), p.y - (obj.y + obj.height / 2)) < 48) {
            this.interactWithInteriorObject(obj);
            return;
          }
        }
      }
    }

    // Check interaction with Overworld caged campers
    const nearCamper = this.state.campers.find(c => c.state === 'caged' && Math.hypot(p.x - c.x, p.y - c.y) < 55);
    if (nearCamper) {
      nearCamper.state = 'in_camp';
      nearCamper.rescued = true;
      soundEngine.playLevelUp();
      soundEngine.speakSpanish(`¡Has rescatado a ${nearCamper.name}! ${nearCamper.buffDescription}`, 'rescue_camper');
      this.showDialogue(nearCamper.name, '¡SUPERVIVIENTE RESCATADO!', nearCamper.dialog + ' ' + nearCamper.buffDescription, '🏕️');
      return;
    }

    const activeItem = this.getActiveItem();
    const itemDef = activeItem ? ITEM_DEFINITIONS[activeItem.item] : null;

    // Set Attack animation characteristics
    p.isAttacking = true;
    p.attackDuration = itemDef?.category === 'weapon' ? 0.22 : 0.28;
    p.attackTimer = p.attackDuration;
    p.attackSwingProgress = 0;
    p.attackCooldown = (itemDef?.attackSpeed || 350) / 1000;

    // Detect weapon sub-type for rendering
    const itemName = activeItem?.item || '';
    if (itemName.includes('sword') || itemName === 'machete' || itemName === 'hunting_spear' || itemName === 'wooden_club') {
      p.attackType = 'sword';
    } else if (itemName.includes('pickaxe') || itemName.includes('axe')) {
      p.attackType = 'axe';
    } else if (itemName.includes('bow') || itemName === 'slingshot') {
      p.attackType = 'bow';
    } else if (itemName.includes('shotgun')) {
      p.attackType = 'shotgun';
    } else if (itemName.includes('staff') || itemName === 'ancient_relic' || itemName === 'corrupted_essence') {
      p.attackType = 'magic';
    } else {
      p.attackType = 'fist';
    }

    // Ranged Weapons
    if (itemDef?.category === 'weapon' && itemDef.ammoRequired) {
      const hasAmmo = this.hasItem(itemDef.ammoRequired, 1);
      if (!hasAmmo) {
        soundEngine.playAttack();
        this.addFloatingText(`¡Sin ${ITEM_DEFINITIONS[itemDef.ammoRequired]?.name}!`, p.x, p.y - 30, '#d82800');
        return;
      }

      this.consumeItem(itemDef.ammoRequired, 1);

      if (activeItem?.item === 'retro_shotgun') {
        soundEngine.playGunshot();
        this.state.camera.shake = 12;
        [-0.2, 0, 0.2].forEach(spread => {
          this.fireProjectile('bullet', itemDef.damage || 120, spread);
        });
      } else if (activeItem?.item === 'hunting_bow') {
        soundEngine.playBowShot();
        this.fireProjectile('arrow', itemDef.damage || 60, 0);
      } else {
        soundEngine.playBowShot();
        this.fireProjectile('pellet', itemDef.damage || 25, 0);
      }
      return;
    }

    // Melee swing / Gathering
    soundEngine.playSlash();
    const baseDamage = itemDef?.damage || 15;
    const range = itemDef?.range || 45;

    let targetX = p.x;
    let targetY = p.y;
    if (p.direction === 'right') targetX += range;
    else if (p.direction === 'left') targetX -= range;
    else if (p.direction === 'down') targetY += range;
    else if (p.direction === 'up') targetY -= range;

    this.createSlashParticle(targetX, targetY, p.direction);

    // Register attack trail arc
    p.attackTrail.push({
      x: targetX,
      y: targetY,
      angle: p.facingAngle,
      radius: 36,
      alpha: 0.85,
      color: p.attackType === 'sword' ? '#3cbcfc' : p.attackType === 'magic' ? '#b868f8' : '#f8b800',
    });

    // Hit monsters
    let hitAny = false;
    this.state.monsters.forEach(m => {
      const dist = Math.hypot(targetX - m.x, targetY - m.y);
      if (dist < 42) {
        hitAny = true;
        m.hp -= baseDamage;
        m.hurtTimer = 0.2;
        this.state.hitPauseTimer = 0.04; // 40ms micro hitpause
        soundEngine.playHitMonster();
        this.addFloatingText(`-${baseDamage}`, m.x, m.y - 20, '#fce000');
        this.createExplosionParticles(m.x, m.y, '#fc7400', 6);

        if (m.hp <= 0) {
          p.kills++;
          this.addPlayerXp(m.isBoss ? 500 : 30);
          this.spawnDrop('forest_gold_coin', m.isBoss ? 150 : 15, m.x, m.y);
          if (Math.random() < 0.5) this.spawnDrop('bandage', 1, m.x, m.y);
          if (m.subType === 'corrupted_wolf') this.spawnDrop('cooked_meat', 1, m.x, m.y);
        }
      }
    });

    // Hit animals
    this.state.animals.forEach(a => {
      const dist = Math.hypot(targetX - a.x, targetY - a.y);
      if (dist < 35) {
        hitAny = true;
        a.hp -= baseDamage;
        soundEngine.playHitMonster();
        this.addFloatingText(`-${baseDamage}`, a.x, a.y - 20, '#d82800');

        if (a.hp <= 0) {
          this.spawnDrop('cooked_meat', a.meatDrop, a.x, a.y);
          this.spawnDrop('forest_gold_coin', 10, a.x, a.y);
        }
      }
    });
    this.state.animals = this.state.animals.filter(a => a.hp > 0);

    // Harvest Resource Nodes (Trees, Rocks, Iron, Coal, Bushes)
    this.state.resourceNodes.forEach(node => {
      if (!node.depleted) {
        const dist = Math.hypot(targetX - (node.x + node.width / 2), targetY - (node.y + node.height / 2));
        if (dist < 38) {
          hitAny = true;
          node.hitsRemaining--;

          if (node.resourceType === 'tree') soundEngine.playChop();
          else if (node.resourceType === 'berry_bush' || node.resourceType === 'mushroom_patch') soundEngine.playBushRustle();
          else soundEngine.playMine();

          this.createExplosionParticles(node.x + node.width / 2, node.y + node.height / 2, '#a87830', 4);

          if (node.hitsRemaining <= 0) {
            node.depleted = true;
            this.addPlayerXp(10);
            node.lootTable.forEach(loot => {
              if (Math.random() <= loot.chance) {
                const count = Math.floor(loot.min + Math.random() * (loot.max - loot.min + 1));
                this.spawnDrop(loot.item, count, node.x + node.width / 2, node.y + node.height / 2);
              }
            });
          }
        }
      }
    });
  }

  // Interact with objects inside cabins and caves
  private interactWithInteriorObject(obj: InteriorObject) {
    if (obj.type === 'chest') {
      if (obj.opened) {
        this.showDialogue('Cofre', 'Cofre Abierto', 'Este cofre ya ha sido saqueado por completo.', '📦');
        return;
      }
      obj.opened = true;
      soundEngine.playChest();
      if (obj.loot) {
        obj.loot.forEach(l => {
          this.addItemToInventory(l.item, l.count);
          this.addFloatingText(`+${l.count} ${ITEM_DEFINITIONS[l.item]?.name || l.item}`, this.state.player.x, this.state.player.y - 30, '#fce000');
        });
      }
      this.showDialogue('Cofre', '¡TESORO ENCONTRADO!', obj.interactionText || '¡Has obtenido valiosos recursos!', '💎');
    } else if (obj.type === 'fireplace') {
      this.state.player.stats.warmth = this.state.player.stats.maxWarmth;
      this.state.player.stats.hp = Math.min(this.state.player.stats.maxHp, this.state.player.stats.hp + 20);
      soundEngine.playFireFeed();
      this.showDialogue('Chimenea', 'FUEGO Y CALOR', obj.interactionText || 'Te calientas al fuego de la chimenea.', '🔥');
    } else if (obj.type === 'bed') {
      this.state.player.stats.stamina = this.state.player.stats.maxStamina;
      this.state.player.stats.hp = Math.min(this.state.player.stats.maxHp, this.state.player.stats.hp + 30);
      soundEngine.playEat();
      this.showDialogue('Cama', 'DESCANSO REPARADOR', obj.interactionText || 'Has descansado profundamente.', '🛏️');
    } else if (obj.type === 'sage_npc') {
      this.showDialogue(obj.name, 'SABIO ANCESTRAL', obj.interactionText || '¡Mantén la llama viva!', '🧙');
      this.fetchAiOracle('cave', obj.name);
    } else if (obj.type === 'bookshelf' || obj.type === 'altar') {
      this.showDialogue(obj.name, 'LORE Y PROFECÍAS', obj.interactionText || 'Antiguas escrituras sobre las 99 noches.', '📜');
    }
  }

  public performActionB() {
    if (this.state.dialogueBox.active) {
      this.advanceDialogue();
      return;
    }

    const p = this.state.player;
    if (p.rollCooldown > 0 || p.isRolling || p.stats.stamina < 20) return;

    // Dodge Roll
    p.isRolling = true;
    p.rollTimer = 0.25;
    p.rollCooldown = 0.6;
    p.stats.stamina -= 20;

    soundEngine.playRoll();
    this.createRollDustParticles(p.x, p.y);
  }

  private fireProjectile(bulletType: any, damage: number, spreadAngle: number) {
    const p = this.state.player;
    let baseAngle = 0;
    if (p.direction === 'right') baseAngle = 0;
    else if (p.direction === 'down') baseAngle = Math.PI / 2;
    else if (p.direction === 'left') baseAngle = Math.PI;
    else if (p.direction === 'up') baseAngle = -Math.PI / 2;

    const angle = baseAngle + spreadAngle;
    const speed = bulletType === 'bullet' ? 420 : 320;

    this.state.projectiles.push({
      id: `proj_${Date.now()}_${Math.random()}`,
      type: 'projectile',
      bulletType,
      source: 'player',
      damage,
      x: p.x,
      y: p.y,
      width: 12,
      height: 12,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      direction: p.direction,
      animFrame: 0,
      animTimer: 0,
      lifeTime: 0.8,
      angle,
    });
  }

  public feedCampfire() {
    const campfire = this.getCampfire();
    if (!campfire) return;
    const activeItem = this.getActiveItem();
    if (!activeItem) return;

    const def = ITEM_DEFINITIONS[activeItem.item];
    if (!def?.fuelValue) return;

    if (campfire.fuel! >= campfire.maxFuel!) {
      this.addFloatingText('🔥 ¡Fogata llena!', campfire.x + 24, campfire.y - 20, '#fc7400');
      return;
    }

    this.consumeItem(activeItem.item, 1);
    campfire.fuel = Math.min(campfire.maxFuel!, campfire.fuel! + def.fuelValue);
    soundEngine.playFireFeed();
    this.addFloatingText(`+${def.fuelValue} Fuego`, campfire.x + 24, campfire.y - 25, '#fce000');
  }

  public placeDefenseStructure(itemType: ItemType) {
    const p = this.state.player;
    const has = this.hasItem(itemType, 1);
    if (!has) return;

    let placeX = p.x;
    let placeY = p.y;
    if (p.direction === 'right') placeX += 36;
    else if (p.direction === 'left') placeX -= 36;
    else if (p.direction === 'down') placeY += 36;
    else if (p.direction === 'up') placeY -= 36;

    this.consumeItem(itemType, 1);

    if (itemType === 'wooden_wall') {
      this.state.structures.push({
        id: `wall_${Date.now()}`,
        type: 'structure',
        kind: 'wooden_wall',
        x: placeX - 16,
        y: placeY - 16,
        width: 32,
        height: 32,
        vx: 0,
        vy: 0,
        direction: 'down',
        animFrame: 0,
        animTimer: 0,
        hp: 200,
        maxHp: 200,
      });
      soundEngine.playCraft();
      this.addFloatingText('🪵 Barricada colocada', placeX, placeY - 20, '#885818');
      this.pathGrid.setRectBlocked(placeX - 16, placeY - 16, 32, 32, true);
    } else if (itemType === 'spike_trap') {
      this.state.structures.push({
        id: `spike_${Date.now()}`,
        type: 'structure',
        kind: 'spike_trap',
        x: placeX - 16,
        y: placeY - 16,
        width: 32,
        height: 32,
        vx: 0,
        vy: 0,
        direction: 'down',
        animFrame: 0,
        animTimer: 0,
        hp: 100,
        maxHp: 100,
      });
      soundEngine.playCraft();
      this.addFloatingText('📐 Trampa de estacas', placeX, placeY - 20, '#fc7400');
    } else if (itemType === 'bear_trap') {
      this.state.structures.push({
        id: `bear_trap_${Date.now()}`,
        type: 'structure',
        kind: 'bear_trap',
        x: placeX - 16,
        y: placeY - 16,
        width: 32,
        height: 32,
        vx: 0,
        vy: 0,
        direction: 'down',
        animFrame: 0,
        animTimer: 0,
        hp: 200,
        maxHp: 200,
        trapTriggered: false,
      });
      soundEngine.playCraft();
      this.addFloatingText('⛓️ Trampa de oso', placeX, placeY - 20, '#585858');
    }
  }

  public useSelectedConsumable() {
    const p = this.state.player;
    const activeItem = this.getActiveItem();
    if (!activeItem) return;

    const def = ITEM_DEFINITIONS[activeItem.item];
    if (!def) return;

    let used = false;
    if (def.healHp) {
      p.stats.hp = Math.min(p.stats.maxHp, Math.max(0, p.stats.hp + def.healHp));
      this.addFloatingText(`+${def.healHp} HP`, p.x, p.y - 25, '#58d854');
      used = true;
    }
    if (def.hungerRestore) {
      p.stats.hunger = Math.min(p.stats.maxHunger, p.stats.hunger + def.hungerRestore);
      this.addFloatingText(`+${def.hungerRestore} Hambre`, p.x, p.y - 40, '#f8b800');
      used = true;
    }
    if (def.warmthRestore) {
      p.stats.warmth = Math.min(p.stats.maxWarmth, p.stats.warmth + def.warmthRestore);
      this.addFloatingText(`+${def.warmthRestore} Calor`, p.x, p.y - 55, '#fc7400');
      used = true;
    }

    if (used) {
      soundEngine.playEat();
      this.consumeItem(activeItem.item, 1);
    }
  }

  // Inventory & Crafting
  public getActiveItem() {
    const p = this.state.player;
    return p.inventory[p.selectedSlotIndex] || null;
  }

  public hasItem(item: ItemType, count: number): boolean {
    const total = this.getItemCount(item);
    return total >= count;
  }

  public getItemCount(item: ItemType): number {
    if (!this.state.player.inventory) return 0;
    return this.state.player.inventory
      .filter(s => s.item === item)
      .reduce((sum, s) => sum + s.count, 0);
  }

  public addItemToInventory(item: ItemType, count: number): boolean {
    const p = this.state.player;
    const def = ITEM_DEFINITIONS[item];
    if (!def) return false;

    const existing = p.inventory.find(s => s.item === item && s.count < def.maxStack);
    if (existing) {
      const space = def.maxStack - existing.count;
      const toAdd = Math.min(space, count);
      existing.count += toAdd;
      count -= toAdd;
    }

    if (count > 0 && p.inventory.length < 16) {
      p.inventory.push({ item, count });
      return true;
    }

    return count === 0;
  }

  public consumeItem(item: ItemType, count: number): boolean {
    const p = this.state.player;
    const slot = p.inventory.find(s => s.item === item);
    if (!slot || slot.count < count) return false;

    slot.count -= count;
    if (slot.count <= 0) {
      p.inventory = p.inventory.filter(s => s.count > 0);
      if (p.selectedSlotIndex >= p.inventory.length) {
        p.selectedSlotIndex = Math.max(0, p.inventory.length - 1);
      }
    }
    return true;
  }

  public craftItem(recipeId: string): boolean {
    const recipe = CRAFTING_RECIPES.find(r => r.id === recipeId);
    if (!recipe) return false;

    const campfire = this.getCampfire();
    if (recipe.requiresCampfireLevel && (!campfire || (campfire.level || 1) < recipe.requiresCampfireLevel)) {
      this.addFloatingText('🔥 Requiere Fogata Lvl superior', this.state.player.x, this.state.player.y - 30, '#d82800');
      return false;
    }

    for (const ing of recipe.ingredients) {
      if (!this.hasItem(ing.item, ing.count)) {
        this.addFloatingText('❌ Faltan materiales', this.state.player.x, this.state.player.y - 30, '#d82800');
        return false;
      }
    }

    for (const ing of recipe.ingredients) {
      this.consumeItem(ing.item, ing.count);
    }

    this.addItemToInventory(recipe.result, recipe.resultCount);
    soundEngine.playCraft();
    this.addPlayerXp(25);
    this.addFloatingText(`✨ ¡${recipe.name} fabricado!`, this.state.player.x, this.state.player.y - 35, '#58d854');
    return true;
  }

  public craftRecipe(recipeId: string): boolean {
    return this.craftItem(recipeId);
  }

  public upgradeCampfire(): boolean {
    const campfire = this.getCampfire();
    if (!campfire) return false;

    const currentLvl = campfire.level || 1;
    const nextUpgrade = CAMPFIRE_UPGRADES.find(u => u.level === currentLvl + 1);
    if (!nextUpgrade) return false;

    for (const ing of nextUpgrade.cost) {
      if (!this.hasItem(ing.item, ing.count)) {
        this.addFloatingText('❌ Faltan recursos para mejorar fogata', campfire.x + 24, campfire.y - 20, '#d82800');
        return false;
      }
    }

    for (const ing of nextUpgrade.cost) {
      this.consumeItem(ing.item, ing.count);
    }

    campfire.level = nextUpgrade.level;
    campfire.maxFuel = nextUpgrade.fuelCapacity;
    campfire.fuel = nextUpgrade.fuelCapacity;
    campfire.lightRadius = nextUpgrade.lightRadius;

    soundEngine.playLevelUp();
    soundEngine.speakSpanish(`¡Fogata mejorada a nivel ${campfire.level}! ${nextUpgrade.name}`, 'fire_upgraded');
    this.addFloatingText(`🔥 ¡FOGATA NIVEL ${campfire.level}!`, campfire.x + 24, campfire.y - 35, '#fce000');
    this.addPlayerXp(200);
    return true;
  }

  public addPlayerXp(amount: number) {
    const stats = this.state.player.stats;
    stats.xp += amount;
    if (stats.xp >= stats.xpToNext) {
      stats.level++;
      stats.xp -= stats.xpToNext;
      stats.xpToNext = Math.floor(stats.xpToNext * 1.4);
      stats.skillPoints++;
      stats.maxHp += 10;
      stats.hp = stats.maxHp;
      soundEngine.playLevelUp();
      soundEngine.speakSpanish(`¡Nivel ${stats.level}! Puntos de habilidad disponibles.`, 'lvl_up');
      this.addFloatingText(`⭐ ¡NIVEL ${stats.level}! +1 PUNTO HABILIDAD`, this.state.player.x, this.state.player.y - 45, '#fce000');
    }
  }

  public getSkillLevel(skillId: string): number {
    const skills = this.state.player.skills || {};
    return skills[skillId] || 0;
  }

  public upgradeSkill(skillId: string): boolean {
    const p = this.state.player;
    if (!p.skills) p.skills = {};
    const skill = SKILL_NODES.find(s => s.id === skillId);
    if (!skill) return false;

    const currentLvl = p.skills[skillId] || 0;
    if (currentLvl >= skill.maxLevel) return false;
    if (p.stats.skillPoints < skill.costPerLevel) {
      this.addFloatingText('❌ Puntos insuficientes', p.x, p.y - 30, '#d82800');
      return false;
    }

    p.stats.skillPoints -= skill.costPerLevel;
    p.skills[skillId] = currentLvl + 1;
    soundEngine.playLevelUp();
    soundEngine.speakSpanish(`¡Perk ${skill.name} mejorado a nivel ${p.skills[skillId]}!`, 'skill_upgraded');
    this.addFloatingText(`⭐ ¡${skill.name} Lv.${p.skills[skillId]}!`, p.x, p.y - 35, '#fce000');
    return true;
  }

  private updateProjectiles(dt: number) {
    this.state.projectiles.forEach(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.lifeTime -= dt;

      // Check collision with solid tiles or obstacles
      if (this.checkSolidCollision(p.x - 4, p.y - 4, 8, 8)) {
        p.lifeTime = 0;
        this.createExplosionParticles(p.x, p.y, '#ffffff', 3);
        return;
      }

      // Check hit monsters
      if (p.source === 'player') {
        this.state.monsters.forEach(m => {
          if (Math.hypot(p.x - m.x, p.y - m.y) < 28) {
            m.hp -= p.damage;
            m.hurtTimer = 0.2;
            p.lifeTime = 0;
            soundEngine.playHitMonster();
            this.addFloatingText(`-${p.damage}`, m.x, m.y - 20, '#fce000');
            this.createExplosionParticles(p.x, p.y, '#fc7400', 6);

            if (m.hp <= 0) {
              this.state.player.kills++;
              this.addPlayerXp(m.isBoss ? 500 : 30);
              this.spawnDrop('forest_gold_coin', m.isBoss ? 150 : 15, m.x, m.y);
            }
          }
        });
      }
    });
    this.state.projectiles = this.state.projectiles.filter(p => p.lifeTime > 0);
  }

  private updateDrops(dt: number) {
    const p = this.state.player;
    this.state.drops.forEach(d => {
      d.lifeTime -= dt;
      d.bobOffset = Math.sin(performance.now() * 0.005) * 3;

      // Auto pickup when near player
      const dist = Math.hypot(p.x - d.x, p.y - d.y);
      if (dist < 32) {
        const added = this.addItemToInventory(d.item, d.count);
        if (added) {
          d.lifeTime = 0;
          soundEngine.playPickup();
          const def = ITEM_DEFINITIONS[d.item];
          this.addFloatingText(`+${d.count} ${def?.name || d.item}`, p.x, p.y - 20, '#58d854');
        }
      }
    });
    this.state.drops = this.state.drops.filter(d => d.lifeTime > 0);
  }

  private updateParticles(dt: number) {
    this.state.particles.forEach(pt => {
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.life += dt;
      pt.alpha = Math.max(0, 1 - pt.life / pt.maxLife);
    });
    this.state.particles = this.state.particles.filter(pt => pt.life < pt.maxLife);
  }

  private updateFloatingTexts(dt: number) {
    this.state.floatingTexts.forEach(ft => {
      ft.y += ft.vy * dt;
      ft.life += dt;
    });
    this.state.floatingTexts = this.state.floatingTexts.filter(ft => ft.life < ft.maxLife);
  }

  private updateCamera(dt: number) {
    const p = this.state.player;
    const isOverworld = this.state.currentLocation === 'overworld';

    if (isOverworld) {
      // Smooth lerp to player position
      this.state.camera.x += (p.x - this.state.camera.x) * 8 * dt;
      this.state.camera.y += (p.y - this.state.camera.y) * 8 * dt;
    } else {
      // Fixed / Centered camera in interior room
      const interior = this.state.interiors[this.state.currentLocation];
      if (interior) {
        const targetCenterX = (interior.width * TILE_SIZE) / 2;
        const targetCenterY = (interior.height * TILE_SIZE) / 2;
        this.state.camera.x += (targetCenterX - this.state.camera.x) * 10 * dt;
        this.state.camera.y += (targetCenterY - this.state.camera.y) * 10 * dt;
      }
    }

    if (this.state.camera.shake > 0) {
      this.state.camera.shake = Math.max(0, this.state.camera.shake - dt * 25);
    }
  }

  private createExplosionParticles(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 80;
      this.state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: 3 + Math.random() * 3,
        life: 0,
        maxLife: 0.4 + Math.random() * 0.3,
        alpha: 1,
        shape: 'spark',
      });
    }
  }

  private createBloodParticles(x: number, y: number, count: number) {
    for (let i = 0; i < count; i++) {
      this.state.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 50,
        vy: (Math.random() - 0.5) * 50,
        color: '#881400',
        size: 3,
        life: 0,
        maxLife: 0.5,
        alpha: 1,
        shape: 'blood',
      });
    }
  }

  private createRollDustParticles(x: number, y: number) {
    for (let i = 0; i < 6; i++) {
      this.state.particles.push({
        x: x + (Math.random() - 0.5) * 16,
        y: y + (Math.random() - 0.5) * 16,
        vx: (Math.random() - 0.5) * 20,
        vy: -10 - Math.random() * 20,
        color: '#a87830',
        size: 4,
        life: 0,
        maxLife: 0.4,
        alpha: 0.8,
        shape: 'smoke',
      });
    }
  }

  private createSlashParticle(x: number, y: number, dir: string) {
    this.state.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      color: '#ffffff',
      size: 16,
      life: 0,
      maxLife: 0.15,
      alpha: 1,
      shape: 'spark',
    });
  }

  public addFloatingText(text: string, x: number, y: number, color: string) {
    this.state.floatingTexts.push({
      id: `ft_${Date.now()}_${Math.random()}`,
      text,
      x,
      y,
      color,
      life: 0,
      maxLife: 1.2,
      vy: -25,
    });
  }

  public getCampfire(): StructureEntity | undefined {
    return this.state.structures.find(s => s.kind === 'campfire');
  }

  private triggerGameOver() {
    this.state.gameOver = true;
    soundEngine.stopMusic();
    soundEngine.playHitPlayer();
    soundEngine.speakSpanish('Has caído en la oscuridad del bosque. Fin de la partida.', 'game_over');
    if (this.onGameOverCallback) this.onGameOverCallback();
  }
}
