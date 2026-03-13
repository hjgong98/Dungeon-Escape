class Saves extends Phaser.Scene {
  constructor() {
    super('Saves');
    this.saves = [];
    this.mode = 'load'; // 'load' when coming from Menu, 'save' when coming from Play
    this.returnScene = 'Menu';
    this.slotGroup = null;
  }

  init(data) {
    // Scene instances are reused by Phaser. Reset transient display groups
    // here so create() never touches a destroyed group from a prior run.
    this.slotGroup = null;

    this.mode = data.mode || 'load';
    this.returnScene = data.returnScene || 'Menu';
    console.log(
      'Saves scene - mode:',
      this.mode,
      'return to:',
      this.returnScene,
    );
  }

  preload() {
    this.load.image('background', './assets/game_background_3.1.png');
  }

  create() {
    this.background = this.add.image(0, 0, 'background').setOrigin(0, 0);
    this.background.setDisplaySize(800, 600);

    const title = this.mode === 'load' ? 'LOAD SAVE' : 'SAVE GAME';
    this.add.text(400, 80, title, {
      fontSize: '48px',
      fill: '#fff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Load saves from localStorage (starts empty)
    this.loadSaves();

    // Create save slots
    this.createSaveSlots();

    // Back button - returns to appropriate scene
    const backText = this.returnScene === 'Play'
      ? '← BACK TO PLAY'
      : '← BACK TO MENU';
    const backButton = this.add.text(400, 550, backText, {
      fontSize: '24px',
      fill: '#fff',
      backgroundColor: '#333',
      padding: { x: 15, y: 8 },
    }).setInteractive();

    backButton.on('pointerdown', () => {
      if (this.returnScene === 'Play') {
        this.scene.resume('Play');
        this.scene.stop();
      } else {
        this.scene.start('Menu');
      }
    });
  }

  loadSaves() {
    if (globalThis.saveManager) {
      this.saves = globalThis.saveManager.loadSaveList();
      return;
    }

    // Load saves from localStorage - should be empty on first play
    const saved = localStorage.getItem('dungeonSaves');

    try {
      const parsed = saved ? JSON.parse(saved) : [];
      this.saves = Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Failed to parse dungeonSaves from localStorage:', error);
      this.saves = [];
    }

    console.log('Loaded saves:', this.saves);
  }

  saveSaves() {
    if (globalThis.saveManager) {
      globalThis.saveManager.saves = this.saves;
      globalThis.saveManager.saveSaveList();
      return;
    }

    localStorage.setItem('dungeonSaves', JSON.stringify(this.saves));
  }

  createSaveSlots() {
    // Recreate group if missing or previously destroyed by scene shutdown.
    const canReuseGroup = Boolean(
      this.slotGroup &&
        this.slotGroup.scene === this &&
        this.slotGroup.children &&
        typeof this.slotGroup.clear === 'function',
    );

    if (canReuseGroup) {
      try {
        this.slotGroup.clear(true, true);
      } catch (_error) {
        this.slotGroup = this.add.group();
      }
    } else {
      this.slotGroup = this.add.group();
    }

    // Create 3 save slots
    for (let i = 0; i < 3; i++) {
      this.createSaveSlot(i, 180 + i * 100);
    }
  }

  createSaveSlot(index, y) {
    const saveId = `save_${index + 1}`;
    const saveInfo = this.saves.find((s) => s.id === saveId);

    // Slot background
    const slotBg = this.add.rectangle(400, y, 600, 80, 0x333333, 0.8);
    slotBg.setStrokeStyle(2, 0x666666);
    this.slotGroup.add(slotBg);

    // Slot number
    const slotNumberText = this.add.text(
      150,
      y - 28,
      `SAVE SLOT ${index + 1}`,
      {
        fontSize: '14px',
        fill: '#aaa',
      },
    );
    this.slotGroup.add(slotNumberText);

    if (saveInfo) {
      // EXISTING SAVE - show save details
      const saveNameText = this.add.text(150, y - 10, saveInfo.name, {
        fontSize: '22px',
        fill: '#fff',
        fontStyle: 'bold',
      });
      this.slotGroup.add(saveNameText);

      const date = new Date(saveInfo.lastPlayed).toLocaleDateString();
      const saveDetailText = this.add.text(
        150,
        y + 16,
        `Level ${saveInfo.level || 1} • ${date}`,
        {
          fontSize: '14px',
          fill: '#0ff',
        },
      );
      this.slotGroup.add(saveDetailText);

      if (this.mode === 'load') {
        // LOAD MODE - from Menu: show LOAD button to start game with this save
        const playBtn = this.add.text(560, y - 34, 'LOAD', {
          fontSize: '20px',
          fill: '#0f0',
          backgroundColor: '#444',
          padding: { x: 20, y: 8 },
        }).setInteractive();
        this.slotGroup.add(playBtn);

        playBtn.on('pointerdown', () => {
          this.loadSave(saveId);
        });

        // Delete button
        const deleteBtn = this.add.text(560, y + 8, 'DELETE', {
          fontSize: '16px',
          fill: '#f00',
          backgroundColor: '#444',
          padding: { x: 15, y: 5 },
        }).setInteractive();
        this.slotGroup.add(deleteBtn);

        deleteBtn.on('pointerdown', () => {
          this.confirmDeleteSave(saveId, saveInfo.name);
        });
      } else {
        // SAVE MODE - from Play: show OVERWRITE button
        const overwriteBtn = this.add.text(560, y - 33, 'OVERWRITE', {
          fontSize: '18px',
          fill: '#ff0',
          backgroundColor: '#444',
          padding: { x: 12, y: 8 },
        }).setInteractive();
        this.slotGroup.add(overwriteBtn);

        overwriteBtn.on('pointerdown', () => {
          this.saveToSlot(saveId);
        });

        // Delete button
        const deleteBtn = this.add.text(560, y + 8, 'DELETE', {
          fontSize: '16px',
          fill: '#f00',
          backgroundColor: '#444',
          padding: { x: 15, y: 5 },
        }).setInteractive();
        this.slotGroup.add(deleteBtn);

        deleteBtn.on('pointerdown', () => {
          this.confirmDeleteSave(saveId, saveInfo.name);
        });
      }
    } else {
      // EMPTY SLOT
      const emptyText = this.add.text(400, y, 'EMPTY', {
        fontSize: '24px',
        fill: '#666',
        fontStyle: 'italic',
      }).setOrigin(0.5);
      this.slotGroup.add(emptyText);

      if (this.mode === 'load') {
        // LOAD MODE - from Menu: empty slot does nothing (can't load nothing)
        const noSaveText = this.add.text(520, y, 'NO SAVE', {
          fontSize: '18px',
          fill: '#666',
          fontStyle: 'italic',
        });
        this.slotGroup.add(noSaveText);
      } else {
        // SAVE MODE - from Play: show CREATE NEW button
        const createBtn = this.add.text(520, y, 'CREATE NEW', {
          fontSize: '20px',
          fill: '#0f0',
          backgroundColor: '#444',
          padding: { x: 15, y: 8 },
        }).setInteractive();
        this.slotGroup.add(createBtn);

        createBtn.on('pointerdown', () => {
          this.saveToSlot(saveId);
        });
      }
    }
  }

  saveToSlot(saveId) {
    if (globalThis.saveManager) {
      const success = globalThis.saveManager.saveToSlot(saveId);
      if (!success) {
        console.error('Failed to save game to slot:', saveId);
        return;
      }

      this.loadSaves();
      this.createSaveSlots();

      // Return to paused Play when launched from it; otherwise fall back to start.
      if (this.returnScene === 'Play' && this.scene.isPaused('Play')) {
        this.scene.resume('Play');
        this.scene.stop();
      } else {
        this.scene.start('Play');
      }
      return;
    }

    // Get current player data
    const player = globalThis.gameState.player;

    // Create save data
    const saveData = {
      id: saveId,
      name: player.name,
      level: player.level,
      hp: player.hp,
      maxHP: player.maxHP,
      atk: player.atk,
      def: player.def,
      luck: player.luck || 0,
      exp: player.exp,
      expToNext: player.expToNext,
      gold: player.gold || 0,
      inventory: player.inventory,
      equipment: player.equipment,
      lootTables: globalThis.lootTables,
      lastPlayed: new Date().toISOString(),
    };

    // Save to localStorage
    localStorage.setItem(saveId, JSON.stringify(saveData));

    // Update saves list
    const existingIndex = this.saves.findIndex((s) => s.id === saveId);
    const saveInfo = {
      id: saveId,
      name: player.name,
      level: player.level,
      lastPlayed: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      this.saves[existingIndex] = saveInfo;
    } else {
      this.saves.push(saveInfo);
    }

    this.saveSaves();
    console.log('Game saved to', saveId);

    // Return to paused Play when launched from it; otherwise fall back to start.
    if (this.returnScene === 'Play' && this.scene.isPaused('Play')) {
      this.scene.resume('Play');
      this.scene.stop();
    } else {
      this.scene.start('Play');
    }
  }

  loadSave(saveId) {
    if (globalThis.saveManager) {
      const loaded = globalThis.saveManager.loadSave(saveId);
      if (loaded) {
        console.log('Game loaded from', saveId);

        // Ensure load always starts an unpaused fresh Play scene.
        if (this.scene.isPaused('Play') || this.scene.isActive('Play')) {
          this.scene.stop('Play');
        }

        this.scene.start('Play');
      }
      return;
    }

    const saveData = localStorage.getItem(saveId);
    if (saveData) {
      const data = JSON.parse(saveData);

      // Load into gameState
      globalThis.gameState.player = {
        name: data.name,
        level: data.level,
        hp: data.hp,
        maxHP: data.maxHP,
        atk: data.atk,
        def: data.def,
        luck: data.luck || 0,
        exp: data.exp,
        expToNext: data.expToNext,
        gold: data.gold || 0,
        inventory: data.inventory || [],
        equipment: data.equipment || {
          weapon: null,
          armor: null,
          accessory: null,
        },
      };

      // Load loot tables
      globalThis.lootTables = data.lootTables || {};

      console.log('Game loaded from', saveId);

      // Go to Play scene
      this.scene.start('Play');
    }
  }

  deleteSave(saveId) {
    if (globalThis.saveManager) {
      globalThis.saveManager.deleteSave(saveId);
      this.loadSaves();
      this.createSaveSlots();
      return;
    }

    // Remove from localStorage
    localStorage.removeItem(saveId);

    // Remove from saves list
    this.saves = this.saves.filter((s) => s.id !== saveId);
    this.saveSaves();

    // Refresh slots
    this.createSaveSlots();
  }

  confirmDeleteSave(saveId, saveName = 'this save') {
    const confirmed = globalThis.confirm(
      `Delete ${saveName}? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    this.deleteSave(saveId);
  }
}

globalThis.Saves = Saves;
