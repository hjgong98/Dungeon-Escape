// SaveManager.js - Handles all save file operations
class SaveManager {
  constructor() {
    this.saves = [];
    this.currentSave = null;
    console.log('SaveManager initialized with empty saves');
  }

  // Load list of saves from localStorage
  loadSaveList() {
    try {
      const saves = localStorage.getItem('dungeonSaves');
      if (saves) {
        const parsed = JSON.parse(saves);
        this.saves = Array.isArray(parsed) ? parsed : [];
        console.log('Loaded saves:', this.saves);
      } else {
        this.saves = []; // Start with empty saves
        console.log('No saves found, starting fresh');
      }
      return this.saves;
    } catch (e) {
      console.error('Error loading saves:', e);
      this.saves = [];
      return this.saves;
    }
  }

  // Save the list of saves
  saveSaveList() {
    try {
      localStorage.setItem('dungeonSaves', JSON.stringify(this.saves));
      console.log('Saved save list:', this.saves);
    } catch (e) {
      console.error('Error saving save list:', e);
    }
  }

  // Create a completely new game
  createNewGame(playerName, playerClass) {
    console.log('Creating new game:', playerName, playerClass);

    try {
      // Load current saves first
      this.loadSaveList();

      // Find first available save slot
      let saveId = null;
      for (let i = 1; i <= 3; i++) {
        const exists = this.saves.some((s) => s.id === `save_${i}`);
        if (!exists) {
          saveId = `save_${i}`;
          break;
        }
      }

      if (!saveId) {
        // All slots full, overwrite the oldest one (save_1)
        console.log('All save slots full, overwriting save_1');
        saveId = 'save_1';
        this.saves = this.saves.filter((s) => s.id !== 'save_1');
      }

      const newSave = {
        id: saveId,
        name: playerName,
        class: playerClass,
        createdAt: new Date().toISOString(),
        lastPlayed: new Date().toISOString(),
      };

      this.saves.push(newSave);
      this.saveSaveList();

      // Create the save data
      const saveData = this.createNewSaveData(playerName, playerClass);
      this.writeSaveData(saveId, saveData);

      // Generate loot for this save
      this.generateLootForSave(saveId);

      console.log('New game created with ID:', saveId);
      return saveId;
    } catch (e) {
      console.error('Error creating new game:', e);
      return null;
    }
  }

  // Create fresh save data with starter items
  createNewSaveData(playerName, playerClass) {
    try {
      // Create starter items with null checks
      let starterWeapon = null;
      let starterArmor = null;

      if (globalThis.Weapon) {
        starterWeapon = Weapon.generate(1);
        console.log('Created starter weapon:', starterWeapon);
      } else {
        console.error('Weapon class not found');
      }

      if (globalThis.Armor) {
        starterArmor = Armor.generate(1);
        console.log('Created starter armor:', starterArmor);
      } else {
        console.error('Armor class not found');
      }

      const starterPotion = {
        id: `potion_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        name: 'Health Potion',
        type: 'consumable',
        tier: 1,
        value: 10,
        stats: { hpRestore: 30 },
      };

      const inventory = [];
      if (starterWeapon) inventory.push(starterWeapon);
      if (starterArmor) inventory.push(starterArmor);
      inventory.push(starterPotion);

      return {
        player: {
          name: playerName,
          class: playerClass,
          level: 1,
          hp: 100,
          maxHp: 100,
          atk: 10,
          def: 5,
          luck: 0,
          exp: 0,
          expToNext: 100,
          gold: 50,
          inventory: inventory,
          equipment: {
            weapon: starterWeapon,
            armor: starterArmor,
            accessory: null,
          },
        },
        dungeon: {
          currentFloor: 0,
          exploredFloors: [],
          openedLootboxes: [],
        },
        settings: {
          sound: true,
          music: true,
        },
        lastSaved: new Date().toISOString(),
      };
    } catch (e) {
      console.error('Error creating save data:', e);
      return null;
    }
  }

  // Generate loot for a save
  generateLootForSave(saveId) {
    try {
      if (!globalThis.lootGenerator) {
        console.error('LootGenerator not found');
        return [];
      }

      const lootData = globalThis.lootGenerator.generateForSave(saveId);
      localStorage.setItem(`loot_${saveId}`, JSON.stringify(lootData));
      console.log(`Generated loot for ${saveId}:`, lootData);

      if (this.currentSave && this.currentSave.id === saveId) {
        globalThis.lootTables = lootData;
      }

      return lootData;
    } catch (e) {
      console.error('Error generating loot:', e);
      return [];
    }
  }

  // Write save data to localStorage
  writeSaveData(saveId, data) {
    try {
      localStorage.setItem(saveId, JSON.stringify(data));
      console.log(`Saved data for ${saveId}`);
    } catch (e) {
      console.error('Error writing save data:', e);
    }
  }

  // Read save data from localStorage
  readSaveData(saveId) {
    try {
      const data = localStorage.getItem(saveId);

      // Backwards compatibility for older broken key format: save_save_X
      if (!data) {
        const legacyData = localStorage.getItem(`save_${saveId}`);
        if (legacyData) {
          return JSON.parse(legacyData);
        }
      }

      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Error reading save data:', e);
      return null;
    }
  }

  createRuntimePlayer(playerData = {}) {
    const player = {
      name: playerData.name || 'Adventurer',
      level: playerData.level || 1,
      hp: playerData.hp || 100,
      maxHP: playerData.maxHP || playerData.maxHp || 100,
      atk: playerData.atk || 10,
      def: playerData.def || 5,
      luck: playerData.luck || 0,
      exp: playerData.exp || 0,
      expToNext: playerData.expToNext || 100,
      gold: playerData.gold || 0,
      inventory: Array.isArray(playerData.inventory)
        ? playerData.inventory
        : [],
      equipment: playerData.equipment || {
        weapon: null,
        armor: null,
        accessory: null,
      },
    };

    player.addItem = function addItem(itemData) {
      if (!Array.isArray(this.inventory)) {
        this.inventory = [];
      }
      this.inventory.push(itemData);
      return true;
    };

    return player;
  }

  serializePlayerForSave(player) {
    const base = typeof player.toJSON === 'function' ? player.toJSON() : player;

    return {
      name: base?.name || 'Adventurer',
      level: base?.level || 1,
      hp: base?.hp || 100,
      maxHP: base?.maxHP || base?.maxHp || 100,
      atk: base?.atk || 10,
      def: base?.def || 5,
      luck: base?.luck || 0,
      exp: base?.exp || 0,
      expToNext: base?.expToNext || 100,
      gold: base?.gold || 0,
      inventory: Array.isArray(base?.inventory) ? base.inventory : [],
      equipment: base?.equipment || {
        weapon: null,
        armor: null,
        accessory: null,
      },
    };
  }

  // Load a save into the game
  loadSave(saveId) {
    console.log('Loading save:', saveId);
    try {
      const saveData = this.readSaveData(saveId);
      if (!saveData) {
        console.error('Save data not found for:', saveId);
        return null;
      }

      // Supports both structured saves ({ player }) and legacy flat saves.
      const playerData = saveData.player || {
        name: saveData.name,
        level: saveData.level,
        hp: saveData.hp,
        maxHP: saveData.maxHP,
        atk: saveData.atk,
        def: saveData.def,
        luck: saveData.luck,
        exp: saveData.exp,
        expToNext: saveData.expToNext,
        gold: saveData.gold,
        inventory: saveData.inventory,
        equipment: saveData.equipment,
      };

      // Update gameState
      globalThis.gameState.player = this.createRuntimePlayer(playerData);
      globalThis.gameState.currentSaveId = saveId;

      // Load loot tables from save data first, then legacy loot key fallback.
      if (saveData.lootTables) {
        globalThis.lootTables = saveData.lootTables;
      } else {
        const lootData = localStorage.getItem(`loot_${saveId}`);
        globalThis.lootTables = lootData ? JSON.parse(lootData) : {};
      }

      // Update last played
      const saveInfo = this.saves.find((s) => s.id === saveId);
      if (saveInfo) {
        saveInfo.lastPlayed = new Date().toISOString();
        saveInfo.level = globalThis.gameState.player.level || saveInfo.level ||
          1;
        saveInfo.name = globalThis.gameState.player.name || saveInfo.name ||
          'Adventurer';
        this.saveSaveList();
      }

      this.currentSave = {
        id: saveId,
        data: saveData,
      };

      console.log('Save loaded successfully:', playerData.name || 'Adventurer');
      return saveData;
    } catch (e) {
      console.error('Error loading save:', e);
      return null;
    }
  }

  // Save current game state to its save file
  saveCurrentGame() {
    if (!this.currentSave || !globalThis.gameState.player) return false;

    try {
      const playerData = this.serializePlayerForSave(
        globalThis.gameState.player,
      );
      const saveData = {
        id: this.currentSave.id,
        name: playerData.name,
        level: playerData.level,
        player: playerData,
        lootTables: globalThis.lootTables || {},
        dungeon: this.currentSave.data.dungeon,
        settings: this.currentSave.data.settings,
        lastSaved: new Date().toISOString(),
      };

      this.writeSaveData(this.currentSave.id, saveData);
      this.currentSave.data = saveData;

      return true;
    } catch (e) {
      console.error('Error saving current game:', e);
      return false;
    }
  }

  // Save current game to a specific save slot
  saveToSlot(saveId) {
    if (!globalThis.gameState.player) return false;

    try {
      // Load current saves
      this.loadSaveList();

      let saveInfo = this.saves.find((s) => s.id === saveId);
      const playerData = this.serializePlayerForSave(
        globalThis.gameState.player,
      );
      const now = new Date().toISOString();
      const isOverwrite = Boolean(saveInfo);

      if (!saveInfo) {
        saveInfo = {
          id: saveId,
          name: playerData.name || 'Adventurer',
          level: playerData.level || 1,
          createdAt: now,
          lastPlayed: now,
        };
        this.saves.push(saveInfo);
      } else {
        saveInfo.lastPlayed = now;
        saveInfo.level = playerData.level || saveInfo.level || 1;
        saveInfo.name = playerData.name || saveInfo.name;
      }

      this.saveSaveList();

      // Overwrite should replace old payload entirely for this slot.
      if (isOverwrite) {
        localStorage.removeItem(saveId);
        localStorage.removeItem(`save_${saveId}`);
      }

      // Only reuse in-memory dungeon/settings if they belong to this slot.
      const sameSlotContext = this.currentSave &&
        this.currentSave.id === saveId;
      const dungeonState = sameSlotContext
        ? this.currentSave?.data.dungeon
        : null;
      const settingsState = sameSlotContext
        ? this.currentSave?.data.settings
        : null;

      const saveData = {
        id: saveId,
        name: playerData.name,
        level: playerData.level,
        player: playerData,
        lootTables: globalThis.lootTables || {},
        dungeon: dungeonState ||
          { currentFloor: 0, exploredFloors: [], openedLootboxes: [] },
        settings: settingsState ||
          { sound: true, music: true },
        lastSaved: now,
        lastPlayed: now,
      };

      this.writeSaveData(saveId, saveData);
      localStorage.setItem(
        `loot_${saveId}`,
        JSON.stringify(globalThis.lootTables || {}),
      );

      this.currentSave = {
        id: saveId,
        data: saveData,
      };
      globalThis.gameState.currentSaveId = saveId;

      return true;
    } catch (e) {
      console.error('Error saving to slot:', e);
      return false;
    }
  }

  // Delete a save
  deleteSave(saveId) {
    try {
      this.loadSaveList();
      this.saves = this.saves.filter((s) => s.id !== saveId);
      this.saveSaveList();
      localStorage.removeItem(saveId);
      // Clean up legacy key format too.
      localStorage.removeItem(`save_${saveId}`);
      localStorage.removeItem(`loot_${saveId}`);
      console.log(`Deleted save: ${saveId}`);

      if (this.currentSave && this.currentSave.id === saveId) {
        this.currentSave = null;
        globalThis.gameState.currentSaveId = null;
      }
    } catch (e) {
      console.error('Error deleting save:', e);
    }
  }
}

// Create global instance
globalThis.saveManager = new SaveManager();
console.log('SaveManager attached to global');
