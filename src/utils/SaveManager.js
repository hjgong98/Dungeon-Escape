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
        starterWeapon = globalThis.Weapon.generate(1, 0); // Tier 1, upgrade level 0
        console.log('Created starter weapon:', starterWeapon);
      } else {
        console.error('Weapon class not found');
      }

      if (globalThis.Armor) {
        starterArmor = globalThis.Armor.generate(1, 0); // Tier 1, upgrade level 0
        console.log('Created starter armor:', starterArmor);
      } else {
        console.error('Armor class not found');
      }

      const starterMaterial = globalThis.GameItem
        ? globalThis.GameItem.generateCraftingMaterial(
          Math.floor(Math.random() * 3) + 1,
        )
        : {
          id: `craft_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          name: 'Crafting Material T1',
          type: 'crafting_material',
          tier: 1,
          value: 8,
          sellable: true,
          stats: {},
          use: 'crafting',
          upgradeLevel: 0,
          maxUpgradeLevel: 0,
        };

      const starterSword = {
        id: 'starter_sword',
        name: 'Rusty Sword',
        type: 'weapon',
        tier: 1,
        value: 10,
        stats: { atkBonus: 3 },
        upgradeLevel: 0,
        maxUpgradeLevel: 5,
      };

      const inventory = [];
      const storage = []; // Empty storage initially

      inventory.push(starterSword);
      if (starterArmor) inventory.push(starterArmor);
      inventory.push(starterMaterial);

      return {
        player: {
          name: playerName,
          class: playerClass,
          level: 1,
          hp: 50,
          maxHp: 50,
          atk: 10,
          def: 5,
          luck: 0,
          exp: 0,
          expToNext: 10,
          gold: 50,
          selectedSpriteId: globalThis.getPlayerSpriteOption?.()?.id || 'owlet',
          inventory: inventory,
          storage: storage,
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

  // Create runtime player object from saved data
  createRuntimePlayer(playerData = {}) {
    const baseMaxHp = 50;
    const hpPerLevel = 10;
    const safeLevel = Math.max(1, Number(playerData.level) || 1);
    const getMaxHpForLevel = (level) =>
      baseMaxHp + (Math.max(1, Number(level) || 1) - 1) * hpPerLevel;
    const getRequiredExpForLevel = (level) =>
      10 * Math.pow(2, Math.max(1, Number(level) || 1) - 1);
    const defaultSpriteId = globalThis.getPlayerSpriteOption?.()?.id ||
      'owlet';
    const resolvedMaxHp = Math.max(
      1,
      Number(playerData.maxHP ?? playerData.maxHp) ||
        getMaxHpForLevel(safeLevel),
    );
    const resolvedHp = Number(playerData.hp ?? resolvedMaxHp);
    const player = {
      name: playerData.name || 'Adventurer',
      level: safeLevel,
      hp: Math.max(
        0,
        Math.min(
          resolvedMaxHp,
          Number.isFinite(resolvedHp) ? resolvedHp : resolvedMaxHp,
        ),
      ),
      maxHP: resolvedMaxHp,
      atk: playerData.atk || 10,
      def: playerData.def || 5,
      luck: playerData.luck || 0,
      exp: Number(playerData.exp ?? 0) || 0,
      expToNext: getRequiredExpForLevel(safeLevel),
      gold: Number(playerData.gold ?? 0) || 0,
      selectedSpriteId: playerData.selectedSpriteId || defaultSpriteId,
      maxInventory: playerData.maxInventory || playerData.bagSlots || 20,
      bagSlots: playerData.bagSlots || playerData.maxInventory || 20,
      storageSlots: Math.max(40, Number(playerData.storageSlots) || 0),
      inventory: Array.isArray(playerData.inventory)
        ? playerData.inventory
        : [],
      storage: Array.isArray(playerData.storage) ? playerData.storage : [],
      equipment: playerData.equipment || {
        weapon: null,
        armor: null,
        accessory: null,
      },
    };

    // Add helper methods
    player.addItem = function addItem(itemData) {
      if (!Array.isArray(this.inventory)) {
        this.inventory = [];
      }
      this.inventory.push(itemData);
      return true;
    };

    player.addToStorage = function addToStorage(itemData) {
      if (!Array.isArray(this.storage)) {
        this.storage = [];
      }
      this.storage.push(itemData);
      return true;
    };

    player.removeItem = function removeItem(itemId) {
      const index = this.inventory.findIndex((i) => i.id === itemId);
      if (index !== -1) {
        return this.inventory.splice(index, 1)[0];
      }
      return null;
    };

    player.removeFromStorage = function removeFromStorage(itemId) {
      const index = this.storage.findIndex((i) => i.id === itemId);
      if (index !== -1) {
        return this.storage.splice(index, 1)[0];
      }
      return null;
    };

    player.getLevelScalingMultiplier = function getLevelScalingMultiplier() {
      return 1 + Math.max(0, (this.level || 1) - 1) * 0.1;
    };

    player.getRequiredExpForLevel = function runtimeRequiredExpForLevel(level) {
      return getRequiredExpForLevel(level || this.level || 1);
    };

    player.addGold = function addGold(amount) {
      const safeAmount = Math.max(0, Math.floor(Number(amount) || 0));
      this.gold = Math.max(0, Number(this.gold) || 0) + safeAmount;
      return safeAmount;
    };

    player.setSelectedSprite = function setSelectedSprite(spriteId) {
      this.selectedSpriteId =
        globalThis.getPlayerSpriteOption?.(spriteId)?.id ||
        defaultSpriteId;
      return this.selectedSpriteId;
    };

    player.levelUp = function levelUp() {
      const previousMaxHp = getMaxHpForLevel(this.level);
      const previousHp = Phaser.Math.Clamp(
        Number(this.hp) || 0,
        0,
        previousMaxHp,
      );
      this.level = Math.max(1, Number(this.level) || 1) + 1;
      this.maxHP = getMaxHpForLevel(this.level);
      this.maxHp = this.maxHP;
      const hpGainFromMaxIncrease = Math.max(0, this.maxHP - previousMaxHp);
      this.hp = Math.min(this.maxHP, previousHp + hpGainFromMaxIncrease);
      this.atk = Math.max(1, Number(this.atk) || 10) + 1;
      this.def = Math.max(0, Number(this.def) || 5) + 1;
      this.expToNext = this.getRequiredExpForLevel(this.level);
      return this.level;
    };

    player.addExp = function addExp(amount) {
      const safeAmount = Math.max(0, Math.floor(Number(amount) || 0));
      let levelsGained = 0;

      this.exp = Math.max(0, Number(this.exp) || 0) + safeAmount;
      this.expToNext = this.getRequiredExpForLevel(this.level);

      while (this.exp >= this.expToNext) {
        this.exp -= this.expToNext;
        this.levelUp();
        levelsGained += 1;
      }

      this.expToNext = this.getRequiredExpForLevel(this.level);
      return { gained: safeAmount, levelsGained };
    };

    player.getTotalStats = function getTotalStats() {
      const total = {
        atk: this.atk || 10,
        def: this.def || 5,
        luck: this.luck || 0,
        maxHP: this.maxHP || 100,
      };

      if (this.equipment.weapon?.stats) {
        const weaponBaseAtk = Number(this.equipment.weapon.stats.atkBonus) || 0;
        const weaponAtkPct = Number(this.equipment.weapon.stats.atkPctBonus) ||
          0;

        if (weaponAtkPct > 0) {
          total.atk = Math.floor(
            (total.atk + weaponBaseAtk) * (1 + weaponAtkPct),
          );
        } else {
          total.atk += weaponBaseAtk;
        }

        total.luck += this.equipment.weapon.stats.luckBonus || 0;
      }

      if (this.equipment.armor?.stats) {
        const armorBaseDef = Number(this.equipment.armor.stats.defBonus) || 0;
        const armorBaseHp = Number(this.equipment.armor.stats.hpBonus) || 0;
        const armorDefPct = Number(this.equipment.armor.stats.defPctBonus) ||
          0;
        const armorHpPct = Number(this.equipment.armor.stats.hpPctBonus) || 0;

        if (armorDefPct > 0) {
          total.def = Math.floor(
            (total.def + armorBaseDef) * (1 + armorDefPct),
          );
        } else {
          total.def += armorBaseDef;
        }

        if (armorHpPct > 0) {
          total.maxHP = Math.floor(
            (total.maxHP + armorBaseHp) * (1 + armorHpPct),
          );
        } else {
          total.maxHP += armorBaseHp;
        }

        total.luck += this.equipment.armor.stats.luckBonus || 0;
      }

      if (this.equipment.accessory?.stats) {
        total.luck += this.equipment.accessory.stats.luckBonus || 0;
      }

      return total;
    };

    player.maxHp = player.maxHP;
    player.expToNext = player.getRequiredExpForLevel(player.level);
    if (player.exp >= player.expToNext) {
      player.addExp(0);
    }

    return player;
  }

  // Serialize player for saving
  serializePlayerForSave(player) {
    const base = player && typeof player.toJSON === 'function'
      ? player.toJSON()
      : (player || {});
    const serializedMaxHp = Math.max(
      1,
      Number(base?.maxHP ?? base?.maxHp) || 50,
    );
    const serializedHp = Number(base?.hp ?? serializedMaxHp);

    return {
      name: base?.name || 'Adventurer',
      level: base?.level || 1,
      hp: Math.max(
        0,
        Math.min(
          serializedMaxHp,
          Number.isFinite(serializedHp) ? serializedHp : serializedMaxHp,
        ),
      ),
      maxHP: serializedMaxHp,
      atk: base?.atk || 10,
      def: base?.def || 5,
      luck: base?.luck || 0,
      exp: Number(base?.exp ?? 0) || 0,
      expToNext: base?.expToNext ||
        (10 * Math.pow(2, Math.max(1, Number(base?.level) || 1) - 1)),
      gold: Number(base?.gold ?? 0) || 0,
      selectedSpriteId: base?.selectedSpriteId ||
        globalThis.getPlayerSpriteOption?.()?.id || 'owlet',
      maxInventory: base?.maxInventory || base?.bagSlots || 20,
      bagSlots: base?.bagSlots || base?.maxInventory || 20,
      storageSlots: Math.max(40, Number(base?.storageSlots) || 0),
      inventory: Array.isArray(base?.inventory) ? base.inventory : [],
      storage: Array.isArray(base?.storage) ? base.storage : [],
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
        selectedSpriteId: saveData.selectedSpriteId,
        maxInventory: saveData.maxInventory || saveData.bagSlots || 20,
        bagSlots: saveData.bagSlots || saveData.maxInventory || 20,
        storageSlots: saveData.storageSlots || 20,
        inventory: saveData.inventory,
        storage: saveData.storage || [],
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
        if (!lootData) {
          globalThis.lootTables = {};
        } else {
          try {
            globalThis.lootTables = JSON.parse(lootData);
          } catch (error) {
            console.error('Error parsing loot data for save:', saveId, error);
            globalThis.lootTables = {};
          }
        }
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
