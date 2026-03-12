class Saves extends Phaser.Scene {
  constructor() {
    super('Saves');
    this.saves = [];
    this.mode = 'load'; // 'load' when coming from Menu, 'save' when coming from Play
    this.returnScene = 'Menu';
    this.slotGroup = null;
  }

  init(data) {
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
    // Load saves from localStorage - should be empty on first play
    const saved = localStorage.getItem('dungeonSaves');
    this.saves = saved ? JSON.parse(saved) : [];
    console.log('Loaded saves:', this.saves);
  }

  saveSaves() {
    localStorage.setItem('dungeonSaves', JSON.stringify(this.saves));
  }

  createSaveSlots() {
    // Clear existing slots if they exist
    if (this.slotGroup) {
      this.slotGroup.clear(true, true);
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
    this.add.text(150, y - 20, `SAVE SLOT ${index + 1}`, {
      fontSize: '20px',
      fill: '#aaa',
    });

    if (saveInfo) {
      // EXISTING SAVE - show save details
      this.add.text(250, y - 10, saveInfo.name, {
        fontSize: '24px',
        fill: '#fff',
        fontStyle: 'bold',
      });

      const date = new Date(saveInfo.lastPlayed).toLocaleDateString();
      this.add.text(250, y + 20, `Level ${saveInfo.level || 1} • ${date}`, {
        fontSize: '16px',
        fill: '#0ff',
      });

      if (this.mode === 'load') {
        // LOAD MODE - from Menu: show PLAY button to start game with this save
        const playBtn = this.add.text(520, y - 10, 'PLAY', {
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
        const deleteBtn = this.add.text(520, y + 25, 'DELETE', {
          fontSize: '16px',
          fill: '#f00',
          backgroundColor: '#444',
          padding: { x: 15, y: 5 },
        }).setInteractive();
        this.slotGroup.add(deleteBtn);

        deleteBtn.on('pointerdown', () => {
          this.deleteSave(saveId);
        });
      } else {
        // SAVE MODE - from Play: show OVERWRITE button
        const overwriteBtn = this.add.text(520, y, 'OVERWRITE', {
          fontSize: '20px',
          fill: '#ff0',
          backgroundColor: '#444',
          padding: { x: 15, y: 8 },
        }).setInteractive();
        this.slotGroup.add(overwriteBtn);

        overwriteBtn.on('pointerdown', () => {
          this.saveToSlot(saveId);
        });

        // Delete button
        const deleteBtn = this.add.text(520, y + 35, 'DELETE', {
          fontSize: '16px',
          fill: '#f00',
          backgroundColor: '#444',
          padding: { x: 15, y: 5 },
        }).setInteractive();
        this.slotGroup.add(deleteBtn);

        deleteBtn.on('pointerdown', () => {
          this.deleteSave(saveId);
        });
      }
    } else {
      // EMPTY SLOT
      this.add.text(400, y, 'EMPTY', {
        fontSize: '24px',
        fill: '#666',
        fontStyle: 'italic',
      }).setOrigin(0.5);

      if (this.mode === 'load') {
        // LOAD MODE - from Menu: empty slot does nothing (can't load nothing)
        this.add.text(520, y, 'NO SAVE', {
          fontSize: '18px',
          fill: '#666',
          fontStyle: 'italic',
        });
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

    // Return to Play
    this.scene.start('Play');
  }

  loadSave(saveId) {
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
    // Remove from localStorage
    localStorage.removeItem(saveId);

    // Remove from saves list
    this.saves = this.saves.filter((s) => s.id !== saveId);
    this.saveSaves();

    // Refresh slots
    this.createSaveSlots();
  }
}

globalThis.Saves = Saves;
