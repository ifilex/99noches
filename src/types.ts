// Types for 99 Noches en el Bosque 8-Bit Survival Game

export type ItemType =
  | 'wood'
  | 'stone'
  | 'iron_ore'
  | 'iron_ingot'
  | 'berries'
  | 'raw_meat'
  | 'cooked_meat'
  | 'mushroom'
  | 'mushroom_soup'
  | 'wooden_club'
  | 'wooden_axe'
  | 'iron_axe'
  | 'hunting_spear'
  | 'machete'
  | 'slingshot'
  | 'stone_ammo'
  | 'hunting_bow'
  | 'arrow'
  | 'retro_shotgun'
  | 'shotgun_shell'
  | 'torch'
  | 'bandage'
  | 'medkit'
  | 'wooden_wall'
  | 'spike_trap'
  | 'bear_trap'
  | 'fuel_pellet'
  | 'forest_gold_coin'
  | 'ancient_relic'
  | 'moon_flower'
  | 'corrupted_essence'
  | 'ancient_tome'
  | 'cleansing_amulet'
  | 'whispering_key';

export type ItemCategory = 'resource' | 'food' | 'weapon' | 'ammo' | 'tool' | 'defense' | 'healing' | 'survival' | 'special' | 'quest';

export interface ItemDefinition {
  id: ItemType;
  name: string;
  category: ItemCategory;
  description: string;
  iconPixel: string;
  color: string;
  maxStack: number;
  damage?: number;
  range?: number;
  attackSpeed?: number;
  healHp?: number;
  hungerRestore?: number;
  warmthRestore?: number;
  fuelValue?: number;
  lightRadius?: number;
  defenseHp?: number;
  ammoRequired?: ItemType;
}

export interface InventorySlot {
  item: ItemType;
  count: number;
}

export interface CraftingRecipe {
  id: string;
  result: ItemType;
  resultCount: number;
  requiresCampfireLevel?: number;
  ingredients: { item: ItemType; count: number }[];
  category: 'tools' | 'weapons' | 'defense' | 'food' | 'survival';
  name: string;
  description: string;
}

export interface SkillNode {
  id: string;
  name: string;
  description: string;
  maxLevel: number;
  costPerLevel: number;
  icon: string;
  effect: string;
}

export type MonsterType =
  | 'shadow_walker'
  | 'corrupted_wolf'
  | 'night_stalker'
  | 'cultist_minion'
  | 'swamp_creeper'
  | 'frost_phantom'
  | 'boss_corrupted_elk' // Night 10
  | 'boss_cultist_overlord' // Night 50
  | 'boss_blood_beast' // Blood Moon
  | 'boss_ancient_wendigo'; // Night 99 Final Boss

export interface Entity {
  id: string;
  type: 'player' | 'monster' | 'animal' | 'npc_camper' | 'npc_story' | 'pet' | 'structure' | 'resource_node' | 'drop' | 'projectile' | 'interactive_prop';
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  direction: 'up' | 'down' | 'left' | 'right';
  animFrame: number;
  animTimer: number;
  footOffsetY?: number;
}

export interface MonsterEntity extends Entity {
  type: 'monster';
  subType: MonsterType;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  attackRange: number;
  attackCooldown: number;
  lastAttackTime: number;
  targetType: 'player' | 'campfire' | 'camper';
  isBoss?: boolean;
  name: string;
  color: string;
  state: 'wandering' | 'hunting' | 'attacking' | 'hurt';
  hurtTimer: number;
  path?: { x: number; y: number }[];
  pathIndex?: number;
  pathTimer?: number;
}

export interface InteriorObject {
  id: string;
  type: 'chest' | 'bed' | 'fireplace' | 'torch' | 'bookshelf' | 'altar' | 'sage_npc' | 'merchant_npc' | 'signpost';
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  interactionText?: string;
  loot?: { item: ItemType; count: number }[];
  opened?: boolean;
}

export interface InteriorLocation {
  id: string;
  type: 'cabin' | 'cave';
  name: string;
  subtitle: string;
  exteriorDoor: { x: number; y: number; width: number; height: number };
  interiorSpawn: { x: number; y: number };
  exitDoor: { x: number; y: number; width: number; height: number };
  width: number; // in tiles
  height: number; // in tiles
  objects: InteriorObject[];
  sageDialogue?: string;
  sageName?: string;
}

export interface DialogueChoice {
  id: string;
  text: string;
  description?: string;
  nextNodeId?: string;
  action?: 'none' | 'accept_quest' | 'give_item' | 'shift_alignment' | 'trigger_ending' | 'heal' | 'trade' | 'unlock_lore';
  faction?: 'fuego' | 'sombras' | 'alquimia' | 'vacio';
  alignmentValue?: number;
  requiredItem?: ItemType;
  rewardItem?: ItemType;
  rewardCount?: number;
  endingId?: string;
}

export interface DialogueNode {
  id: string;
  speaker: string;
  title: string;
  text: string;
  icon?: string;
  choices?: DialogueChoice[];
  isAiOracle?: boolean;
  onChoice?: (choiceId: string) => void;
}

export interface DialogueBoxState {
  active: boolean;
  speaker: string;
  title: string;
  text: string;
  fullText: string;
  charIndex: number;
  charTimer: number;
  isComplete: boolean;
  icon?: string;
  locationId?: string;
  choices?: DialogueChoice[];
  selectedChoiceIndex: number;
  currentNodeId?: string;
}

export interface InteractivePropEntity extends Entity {
  type: 'interactive_prop';
  propType: 'ancient_monolith' | 'whispering_well' | 'cursed_altar' | 'survivor_grave' | 'starfall_fragment' | 'celestial_statue';
  name: string;
  description: string;
  examined: boolean;
  isActivated?: boolean;
  glowColor: string;
  dialogueNodeId: string;
  interactionRadius: number;
}

export type MusicMood = 'title' | 'cabin' | 'day' | 'night' | 'boss';

export interface StoryNpcEntity extends Entity {
  type: 'npc_story';
  npcId: 'valeria_ranger' | 'scholar_vaelen' | 'blood_emissary' | 'ghost_alden' | 'blind_alchemist' | 'wandering_hermit';
  name: string;
  role: string;
  colorHead: string;
  colorBody: string;
  colorCloak?: string;
  dialogueNodeId: string;
  interactionRadius: number;
  questStatus?: 'not_started' | 'active' | 'completed';
  hasTalked?: boolean;
}

export interface AnimalEntity extends Entity {
  type: 'animal';
  kind: 'rabbit' | 'deer' | 'boar';
  hp: number;
  maxHp: number;
  speed: number;
  fleeing: boolean;
  fleeTimer: number;
  meatDrop: number;
}

export interface CamperEntity extends Entity {
  type: 'npc_camper';
  name: string;
  role: 'scavenger' | 'medic' | 'guard' | 'cook';
  rescued: boolean;
  hp: number;
  maxHp: number;
  state: 'caged' | 'following' | 'in_camp';
  dialog: string;
  buffDescription: string;
}

export interface PetEntity extends Entity {
  type: 'pet';
  kind: 'wolf_pup' | 'night_owl' | 'forest_fox' | 'mini_golem';
  name: string;
  skillText: string;
  barkTimer: number;
}

export interface StructureEntity extends Entity {
  type: 'structure';
  kind: 'campfire' | 'crafting_table' | 'wooden_wall' | 'spike_trap' | 'bear_trap' | 'watchtower' | 'cooking_pot' | 'storage_chest' | 'cabin_ruin' | 'cage';
  hp: number;
  maxHp: number;
  level?: number;
  fuel?: number;
  maxFuel?: number;
  inventory?: InventorySlot[];
  lightRadius?: number;
  trapDamage?: number;
  trapTriggered?: boolean;
}

export interface ResourceNodeEntity extends Entity {
  type: 'resource_node';
  resourceType: 'tree' | 'iron_rock' | 'stone_rock' | 'coal_rock' | 'berry_bush' | 'mushroom_patch' | 'crate' | 'ancient_shrine';
  hitsRemaining: number;
  maxHits: number;
  lootTable: { item: ItemType; min: number; max: number; chance: number }[];
  depleted: boolean;
  respawnTime?: number;
}

export interface DropEntity extends Entity {
  type: 'drop';
  item: ItemType;
  count: number;
  lifeTime: number;
  bobOffset: number;
}

export interface ProjectileEntity extends Entity {
  type: 'projectile';
  damage: number;
  source: 'player' | 'monster' | 'tower';
  bulletType: 'arrow' | 'pellet' | 'bullet' | 'fireball' | 'slash';
  lifeTime: number;
  angle: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  alpha: number;
  shape?: 'pixel' | 'flame' | 'spark' | 'smoke' | 'blood' | 'snow' | 'arc_slash';
}

export interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  life: number;
  maxLife: number;
  vy: number;
}

export interface PlayerStats {
  hp: number;
  maxHp: number;
  hunger: number;
  maxHunger: number;
  warmth: number;
  maxWarmth: number;
  stamina: number;
  maxStamina: number;
  level: number;
  xp: number;
  xpToNext: number;
  skillPoints: number;
  gold: number;
}

export interface NarrativeAlignment {
  fuego: number;     // Llama Sagrada / Esperanza de la Humanidad
  sombras: number;   // Pacto con la Oscuridad / Poder Oculto
  alquimia: number;  // Ciencia Antigua / Mutación de Recursos
  vacio: number;     // Fusión Cósmica / Trascendencia del Eclipse
}

export interface StoryEnding {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  epilogue: string;
  epilogueQuote?: string;
  category: 'fuego' | 'sombras' | 'alquimia' | 'vacio' | 'supervivencia';
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface LoreEntry {
  id: string;
  title: string;
  subtitle: string;
  category: 'antigua_civilizacion' | 'maldicion_wendigo' | 'eclipse_cosmico' | 'diario_superviviente' | 'alquimia';
  content: string;
  unlocked: boolean;
}

export interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  direction: 'up' | 'down' | 'left' | 'right';
  facingAngle: number;
  stats: PlayerStats;
  inventory: InventorySlot[];
  selectedSlotIndex: number;
  isRolling: boolean;
  rollTimer: number;
  rollCooldown: number;
  rollAngle: number;
  isAttacking: boolean;
  attackTimer: number;
  attackDuration: number;
  attackCooldown: number;
  attackSwingProgress: number; // 0 to 1 for continuous smooth arc
  attackType: 'sword' | 'axe' | 'pickaxe' | 'bow' | 'shotgun' | 'fist' | 'magic';
  hurtTimer: number;
  skin: string;
  activePet: string;
  walkTimer: number;
  walkFrame: number; // 0: Neutral, 1: Step Left, 2: Neutral, 3: Step Right
  isMoving: boolean;
  kills: number;
  nightsSurvived: number;
  score: number;
  timeSurvivedSeconds: number;
  skills?: Record<string, number>;
  // Visual FX trails
  dashTrail: { x: number; y: number; alpha: number; direction: string; frame: number }[];
  attackTrail: { x: number; y: number; angle: number; radius: number; alpha: number; color: string }[];
}

export interface GameSettings {
  crtFilter: boolean;
  soundVolume: number;
  musicVolume: number;
  voiceVolume: number;
  spanishVoice: boolean;
  touchControls: boolean;
  dpadType: 'stick' | 'dpad';
}

export interface UserProfile {
  syncCode: string;
  playerName: string;
  highestNight: number;
  totalKills: number;
  gold: number;
  unlockedSkins: string[];
  unlockedPets: string[];
  unlockedFireStyles: string[];
  activeSkin: string;
  activePet: string;
  activeFireStyle: string;
  skills: Record<string, number>;
  lastSaved: string;
  dailyStreak: number;
  lastDailyDate: string;
}

export interface DailyChallenge {
  id: string;
  date: string;
  title: string;
  description: string;
  modifier: string;
  difficulty: string;
  rewardGold: number;
  rewardSkin: string;
  targetNight: number;
}

export interface LeaderboardEntry {
  id: string;
  playerName: string;
  nightReached: number;
  score: number;
  kills: number;
  timeSurvivedSeconds: number;
  skin: string;
  date: string;
  isDaily?: boolean;
}

export type GamePhase =
  | 'menu'
  | 'playing'
  | 'paused'
  | 'inventory_craft'
  | 'map'
  | 'shop'
  | 'leaderboard'
  | 'daily_challenge'
  | 'cloud_sync'
  | 'game_over'
  | 'victory_99'
  | 'story_ending'
  | 'codex';
