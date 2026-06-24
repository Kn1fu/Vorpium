// ===== config.js — Voidbound game data =====
// All game constants, items, recipes, biomes, planets.
// Modify this file to add content without touching core logic.

const CONFIG = {

  // ---- World ----
  TILE_SIZE:    16,
  CHUNK_WIDTH:  32,   // tiles
  CHUNK_HEIGHT: 32,
  GRAVITY:      0.4,
  TERMINAL_VEL: 14,

  // ---- Player ----
  PLAYER_SPEED:   3.2,
  JUMP_FORCE:    -9.5,
  BASE_HP:       100,
  BASE_ENERGY:   100,
  BASE_OXYGEN:   100,
  OXYGEN_DRAIN:  0.08,   // per frame in space/underwater
  HP_REGEN:      0.01,

  // ---- Camera ----
  CAMERA_LERP:  0.1,

  // ---- Mining ----
  MINE_RANGE:   5,   // tiles
  PLACE_RANGE:  5,

  // ---- Save ----
  AUTOSAVE_INTERVAL: 60000,  // ms

};

// ===== TILES =====
// id: unique string, solid: blocks movement, render: emoji/color fallback
const TILES = {
  air:        { id:'air',        solid:false, color:'#000000', name:'Air'         },
  dirt:       { id:'dirt',       solid:true,  color:'#7a5230', name:'Dirt',       drop:'dirt',       hardness:1 },
  grass:      { id:'grass',      solid:true,  color:'#3d8b3d', name:'Grass',      drop:'dirt',       hardness:1 },
  stone:      { id:'stone',      solid:true,  color:'#8a8a8a', name:'Stone',      drop:'stone',      hardness:3 },
  coal_ore:   { id:'coal_ore',   solid:true,  color:'#3a3a3a', name:'Coal Ore',   drop:'coal',       hardness:4 },
  iron_ore:   { id:'iron_ore',   solid:true,  color:'#b87050', name:'Iron Ore',   drop:'iron_ore',   hardness:5 },
  gold_ore:   { id:'gold_ore',   solid:true,  color:'#d4aa00', name:'Gold Ore',   drop:'gold_ore',   hardness:6 },
  crystal_ore:{ id:'crystal_ore',solid:true,  color:'#8060d0', name:'Crystal',    drop:'crystal',    hardness:7 },
  nebulite:   { id:'nebulite',   solid:true,  color:'#40c0ff', name:'Nebulite',   drop:'nebulite',   hardness:8 },
  wood:       { id:'wood',       solid:true,  color:'#6e4a1a', name:'Wood',       drop:'wood',       hardness:2 },
  leaves:     { id:'leaves',     solid:false, color:'#2d6a2d', name:'Leaves',     drop:'leaf',       hardness:0.5 },
  sand:       { id:'sand',       solid:true,  color:'#d4c060', name:'Sand',       drop:'sand',       hardness:1 },
  lava:       { id:'lava',       solid:false, color:'#ff4400', name:'Lava',       drop:null,         damage:5 },
  water:      { id:'water',      solid:false, color:'#2060c0', name:'Water',      drop:null          },
  ice:        { id:'ice',        solid:true,  color:'#aaddff', name:'Ice',        drop:'ice',        hardness:1 },
  void_rock:  { id:'void_rock',  solid:true,  color:'#1a0a2a', name:'Void Rock',  drop:'void_stone', hardness:10 },
  // Placed blocks
  wood_plank: { id:'wood_plank', solid:true,  color:'#a06030', name:'Plank',      drop:'wood_plank', hardness:2 },
  stone_brick:{ id:'stone_brick',solid:true,  color:'#909090', name:'Stone Brick',drop:'stone_brick',hardness:4 },
  torch:      { id:'torch',      solid:false, color:'#ffaa00', name:'Torch',      drop:'torch',      light:6    },
  workbench:  { id:'workbench',  solid:true,  color:'#c08040', name:'Workbench',  drop:'workbench',  hardness:2, station:'workbench' },
  furnace:    { id:'furnace',    solid:true,  color:'#886644', name:'Furnace',    drop:'furnace',    hardness:4, station:'furnace'   },
  anvil:      { id:'anvil',      solid:true,  color:'#708090', name:'Anvil',      drop:'anvil',      hardness:5, station:'anvil'     },
};

// ===== ITEMS =====
// stackable: max stack size; backpack: if true, can be equipped as backpack
const ITEMS = {
  // --- Raw materials ---
  dirt:       { name:'Dirt',        icon:'🟫', stack:999, desc:'Basic soil.'         },
  stone:      { name:'Stone',       icon:'⬛', stack:999, desc:'Common stone.'       },
  wood:       { name:'Wood',        icon:'🪵', stack:999, desc:'Chopped from trees.' },
  coal:       { name:'Coal',        icon:'⚫', stack:999, desc:'Burns as fuel.'      },
  iron_ore:   { name:'Iron Ore',    icon:'🔴', stack:999, desc:'Smelt into bars.'    },
  gold_ore:   { name:'Gold Ore',    icon:'🟡', stack:999, desc:'Smelt into bars.'    },
  crystal:    { name:'Crystal',     icon:'💎', stack:200, desc:'Rare crystal.'       },
  nebulite:   { name:'Nebulite',    icon:'🔵', stack:200, desc:'From distant worlds.'},
  void_stone: { name:'Void Stone',  icon:'🟣', stack:100, desc:'Dense alien rock.'   },
  leaf:       { name:'Leaf',        icon:'🍃', stack:999  },
  sand:       { name:'Sand',        icon:'🟨', stack:999  },
  ice:        { name:'Ice',         icon:'🧊', stack:999  },

  // --- Processed ---
  iron_bar:   { name:'Iron Bar',    icon:'🔩', stack:200, desc:'Smelted iron.'       },
  gold_bar:   { name:'Gold Bar',    icon:'🥇', stack:200, desc:'Smelted gold.'       },
  wood_plank: { name:'Wood Plank',  icon:'🟫', stack:500, desc:'Crafted from wood.'  },
  stone_brick:{ name:'Stone Brick', icon:'⬛', stack:500  },
  rope:       { name:'Rope',        icon:'🪢', stack:200  },
  glass:      { name:'Glass',       icon:'🪟', stack:200  },
  circuit:    { name:'Circuit',     icon:'💡', stack:50   },

  // --- Consumables ---
  torch:      { name:'Torch',       icon:'🔦', stack:200, light:true },
  bandage:    { name:'Bandage',     icon:'🩹', stack:30,  use:'heal',  healAmt:30   },
  health_pot: { name:'Health Pot',  icon:'🧪', stack:20,  use:'heal',  healAmt:75   },
  ration:     { name:'Ration',      icon:'🥫', stack:20,  use:'energy',energyAmt:50 },
  oxygen_can: { name:'O₂ Canister', icon:'💨', stack:10,  use:'oxygen',oxygenAmt:80 },

  // --- Tools ---
  wood_pick:  { name:'Wood Pickaxe',icon:'⛏️', stack:1, tool:'pickaxe',  power:1, durability:60  },
  iron_pick:  { name:'Iron Pickaxe',icon:'⛏️', stack:1, tool:'pickaxe',  power:3, durability:200 },
  gold_pick:  { name:'Gold Pickaxe',icon:'⛏️', stack:1, tool:'pickaxe',  power:4, durability:150 },
  space_pick: { name:'Void Drill',  icon:'🔧', stack:1, tool:'pickaxe',  power:8, durability:500 },
  wood_axe:   { name:'Wood Axe',    icon:'🪓', stack:1, tool:'axe',      power:1, durability:60  },
  iron_axe:   { name:'Iron Axe',    icon:'🪓', stack:1, tool:'axe',      power:3, durability:200 },
  wood_sword: { name:'Wood Sword',  icon:'🗡️', stack:1, weapon:true, damage:8,  durability:60  },
  iron_sword: { name:'Iron Sword',  icon:'🗡️', stack:1, weapon:true, damage:20, durability:250 },
  space_gun:  { name:'Space Rifle', icon:'🔫', stack:1, weapon:true, damage:35, range:12, durability:400, ammo:'energy_cell' },
  energy_cell:{ name:'Energy Cell', icon:'🔋', stack:50 },

  // --- Armor ---
  iron_helm:  { name:'Iron Helmet', icon:'⛑️', stack:1, armor:'helmet', def:5  },
  iron_chest: { name:'Iron Chest',  icon:'🥼', stack:1, armor:'chest',  def:10 },
  iron_legs:  { name:'Iron Legs',   icon:'👖', stack:1, armor:'legs',   def:7  },

  // --- Backpacks (unique — equipped to expand inventory!) ---
  small_pack: {
    name:'Small Backpack', icon:'🎒', stack:1,
    backpack:true, extraSlots:8,
    desc:'Adds 8 extra inventory slots when equipped.'
  },
  explorer_pack: {
    name:'Explorer Pack', icon:'🎒', stack:1,
    backpack:true, extraSlots:16,
    desc:'Adds 16 extra slots. Favored by scouts.'
  },
  cargo_pack: {
    name:'Cargo Pack', icon:'🎒', stack:1,
    backpack:true, extraSlots:24,
    desc:'24 extra slots — maximum carrying capacity.',
    rarity:'rare'
  },
  void_pack: {
    name:'Void Pack', icon:'🎒', stack:1,
    backpack:true, extraSlots:36,
    desc:'Legendary pack from the void realm. 36 extra slots.',
    rarity:'legendary'
  },

  // --- Placeable structures ---
  workbench: { name:'Workbench', icon:'🪵', stack:10, place:'workbench' },
  furnace:   { name:'Furnace',   icon:'🔥', stack:5,  place:'furnace'   },
  anvil:     { name:'Anvil',     icon:'⚒️', stack:5,  place:'anvil'    },

  // --- Ship components (not carried, used in ship upgrades) ---
  engine_part: { name:'Engine Part',    icon:'⚙️', stack:20  },
  hull_plate:  { name:'Hull Plate',     icon:'🛡️', stack:20  },
  jump_coil:   { name:'Jump Coil',      icon:'🌀', stack:10  },
  nav_chip:    { name:'Nav Chip',       icon:'📡', stack:5   },
};

// ===== RECIPES =====
// station: null=hands, 'workbench', 'furnace', 'anvil'
// result: { item, count }
// ingredients: [{ item, count }, ...]
const RECIPES = [
  // -- Hands --
  { result:{item:'wood_plank',count:4},   ingredients:[{item:'wood',count:1}],        station:null,        name:'Wood Plank' },
  { result:{item:'torch',count:4},         ingredients:[{item:'coal',count:1},{item:'wood',count:1}], station:null, name:'Torch' },
  { result:{item:'rope',count:2},          ingredients:[{item:'leaf',count:3}],        station:null,        name:'Rope' },
  { result:{item:'workbench',count:1},     ingredients:[{item:'wood_plank',count:10}], station:null,        name:'Workbench' },

  // -- Workbench --
  { result:{item:'wood_pick',count:1},     ingredients:[{item:'wood_plank',count:6},{item:'rope',count:2}],  station:'workbench', name:'Wood Pickaxe' },
  { result:{item:'wood_axe',count:1},      ingredients:[{item:'wood_plank',count:5},{item:'rope',count:2}],  station:'workbench', name:'Wood Axe' },
  { result:{item:'wood_sword',count:1},    ingredients:[{item:'wood_plank',count:8},{item:'rope',count:1}],  station:'workbench', name:'Wood Sword' },
  { result:{item:'stone_brick',count:4},   ingredients:[{item:'stone',count:4}],       station:'workbench', name:'Stone Bricks' },
  { result:{item:'furnace',count:1},       ingredients:[{item:'stone_brick',count:20},{item:'coal',count:5}],station:'workbench', name:'Furnace' },
  { result:{item:'small_pack',count:1},    ingredients:[{item:'rope',count:4},{item:'leaf',count:12},{item:'wood_plank',count:8}], station:'workbench', name:'Small Backpack' },
  { result:{item:'bandage',count:3},       ingredients:[{item:'leaf',count:5},{item:'rope',count:1}],        station:'workbench', name:'Bandage' },

  // -- Furnace --
  { result:{item:'iron_bar',count:1},      ingredients:[{item:'iron_ore',count:3},{item:'coal',count:1}],    station:'furnace',   name:'Iron Bar' },
  { result:{item:'gold_bar',count:1},      ingredients:[{item:'gold_ore',count:3},{item:'coal',count:1}],    station:'furnace',   name:'Gold Bar' },
  { result:{item:'glass',count:2},         ingredients:[{item:'sand',count:4},{item:'coal',count:1}],        station:'furnace',   name:'Glass' },

  // -- Anvil (needs iron_bar) --
  { result:{item:'anvil',count:1},         ingredients:[{item:'iron_bar',count:8},{item:'stone_brick',count:6}], station:'workbench', name:'Anvil' },
  { result:{item:'iron_pick',count:1},     ingredients:[{item:'iron_bar',count:6},{item:'wood_plank',count:4}],  station:'anvil',     name:'Iron Pickaxe' },
  { result:{item:'iron_axe',count:1},      ingredients:[{item:'iron_bar',count:5},{item:'wood_plank',count:4}],  station:'anvil',     name:'Iron Axe' },
  { result:{item:'iron_sword',count:1},    ingredients:[{item:'iron_bar',count:8},{item:'wood_plank',count:3}],  station:'anvil',     name:'Iron Sword' },
  { result:{item:'iron_helm',count:1},     ingredients:[{item:'iron_bar',count:6}],                             station:'anvil',     name:'Iron Helmet' },
  { result:{item:'iron_chest',count:1},    ingredients:[{item:'iron_bar',count:12}],                            station:'anvil',     name:'Iron Chest' },
  { result:{item:'iron_legs',count:1},     ingredients:[{item:'iron_bar',count:9}],                             station:'anvil',     name:'Iron Legs' },
  { result:{item:'explorer_pack',count:1}, ingredients:[{item:'iron_bar',count:6},{item:'rope',count:8},{item:'leaf',count:20}], station:'anvil', name:'Explorer Pack' },
  { result:{item:'health_pot',count:2},    ingredients:[{item:'crystal',count:1},{item:'glass',count:1}],       station:'anvil',     name:'Health Potion' },
  { result:{item:'circuit',count:2},       ingredients:[{item:'gold_bar',count:2},{item:'crystal',count:1}],    station:'anvil',     name:'Circuit' },
  { result:{item:'engine_part',count:1},   ingredients:[{item:'iron_bar',count:4},{item:'circuit',count:2}],    station:'anvil',     name:'Engine Part' },
  { result:{item:'hull_plate',count:1},    ingredients:[{item:'iron_bar',count:6},{item:'stone_brick',count:4}],station:'anvil',     name:'Hull Plate' },
  { result:{item:'jump_coil',count:1},     ingredients:[{item:'gold_bar',count:4},{item:'crystal',count:3},{item:'circuit',count:2}], station:'anvil', name:'Jump Coil' },
  { result:{item:'space_gun',count:1},     ingredients:[{item:'iron_bar',count:10},{item:'circuit',count:4},{item:'crystal',count:2}], station:'anvil', name:'Space Rifle' },
];

// ===== BIOMES =====
const BIOMES = {
  forest:  { name:'Forest',     sky:'#5080c0', underground:'#5a3a1a', tiles:['grass','dirt','stone','coal_ore','iron_ore'],      mobs:['slime','bird'],          loot:['wood','leaf','iron_ore'] },
  desert:  { name:'Desert',     sky:'#d09a40', underground:'#c08030', tiles:['sand','stone','gold_ore','crystal_ore'],           mobs:['scorpion','sandworm'],    loot:['sand','gold_ore','crystal'] },
  tundra:  { name:'Tundra',     sky:'#8090b0', underground:'#303858', tiles:['ice','stone','iron_ore','crystal_ore'],            mobs:['ice_golem','yeti'],       loot:['ice','crystal'] },
  volcanic:{ name:'Volcanic',   sky:'#804020', underground:'#3a1008', tiles:['stone','coal_ore','iron_ore','gold_ore'],          mobs:['fire_bat','lava_slime'],  loot:['coal','iron_ore','gold_ore'] },
  void:    { name:'Void Realm', sky:'#0a0015', underground:'#050010', tiles:['void_rock','crystal_ore','nebulite'],              mobs:['void_shade','shadow_beast'],loot:['void_stone','nebulite','crystal'] },
};

// ===== PLANETS =====
const PLANETS = [
  {
    id: 'terra_prime', name: 'Terra Prime',
    icon: '🌍', distance: 0,
    biomes: ['forest','desert'],
    desc: 'Lush starting world.',
    unlocked: true,
    requiredEngine: 0,
  },
  {
    id: 'frostara', name: 'Frostara',
    icon: '❄️', distance: 1,
    biomes: ['tundra'],
    desc: 'Frozen planet. Bring warm gear.',
    unlocked: false,
    requiredEngine: 1,
  },
  {
    id: 'ignis', name: 'Ignis',
    icon: '🌋', distance: 2,
    biomes: ['volcanic'],
    desc: 'Volcanic hellscape. Rich in metals.',
    unlocked: false,
    requiredEngine: 2,
  },
  {
    id: 'nebulos', name: 'Nebulos',
    icon: '🪐', distance: 3,
    biomes: ['void'],
    desc: 'Alien void realm. Endgame resources.',
    unlocked: false,
    requiredEngine: 3,
  },
];

// ===== SHIP UPGRADES =====
const SHIP_UPGRADES = [
  {
    id: 'engine',
    name: 'Engine Tier',
    desc: 'Unlocks travel to further planets.',
    maxLevel: 4,
    costs: [
      [{item:'engine_part',count:3},{item:'iron_bar',count:8}],
      [{item:'engine_part',count:6},{item:'gold_bar',count:4}],
      [{item:'engine_part',count:10},{item:'jump_coil',count:2}],
      [{item:'engine_part',count:16},{item:'jump_coil',count:4},{item:'nebulite',count:5}],
    ]
  },
  {
    id: 'hull',
    name: 'Hull Capacity',
    desc: 'More ship storage slots.',
    maxLevel: 3,
    costs: [
      [{item:'hull_plate',count:6},{item:'iron_bar',count:4}],
      [{item:'hull_plate',count:12},{item:'gold_bar',count:4}],
      [{item:'hull_plate',count:20},{item:'crystal',count:8}],
    ]
  },
  {
    id: 'shields',
    name: 'Shield System',
    desc: 'Reduces damage from planet hazards.',
    maxLevel: 3,
    costs: [
      [{item:'circuit',count:4},{item:'iron_bar',count:6}],
      [{item:'circuit',count:8},{item:'crystal',count:4}],
      [{item:'circuit',count:14},{item:'nebulite',count:3}],
    ]
  },
  {
    id: 'crew',
    name: 'Crew Quarters',
    desc: 'Increases max co-op player slots.',
    maxLevel: 3,
    costs: [
      [{item:'wood_plank',count:20},{item:'rope',count:10}],
      [{item:'iron_bar',count:10},{item:'circuit',count:2}],
      [{item:'gold_bar',count:8},{item:'crystal',count:4}],
    ]
  },
];

// ===== ENTITIES (mobs) =====
const ENTITY_TYPES = {
  slime:       { name:'Green Slime',  hp:20,  damage:5,  speed:1.2, icon:'🟢', xp:5,  drops:[{item:'rope',chance:0.5,count:1}]  },
  bird:        { name:'Space Bird',   hp:15,  damage:3,  speed:2.5, icon:'🐦', xp:3,  drops:[{item:'leaf',chance:0.8,count:2}]  },
  scorpion:    { name:'Scorpion',     hp:35,  damage:12, speed:1.5, icon:'🦂', xp:12, drops:[{item:'iron_ore',chance:0.4,count:2}] },
  sandworm:    { name:'Sand Worm',    hp:80,  damage:20, speed:0.8, icon:'🐛', xp:25, drops:[{item:'sand',chance:1,count:5},{item:'gold_ore',chance:0.3,count:1}] },
  ice_golem:   { name:'Ice Golem',    hp:120, damage:25, speed:0.5, icon:'🧊', xp:35, drops:[{item:'ice',chance:1,count:8},{item:'crystal',chance:0.5,count:2}] },
  fire_bat:    { name:'Fire Bat',     hp:30,  damage:15, speed:3.0, icon:'🦇', xp:10, drops:[{item:'coal',chance:0.6,count:2}] },
  void_shade:  { name:'Void Shade',   hp:200, damage:40, speed:2.0, icon:'👾', xp:60, drops:[{item:'void_stone',chance:0.8,count:3},{item:'crystal',chance:0.5,count:2}] },
};
