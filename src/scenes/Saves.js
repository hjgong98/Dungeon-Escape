
class Saves extends Phaser.Scene {
  constructor() {
    super('Saves');
    this.saves = [];
    this.mode = 'load';
    this.returnScene = 'Menu';
  }

  init(data) {
    this.mode = data.mode || 'load';
    this.playerName = data.playerName || 'Adventurer';
    this.playerStats = data.playerStats || null;
    this.returnScene = data.returnScene || 'Menu';
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

    // Load saves from localStorage (empty for now)
    this.loadSaves();

    // Create save slots
    this.createSaveSlots();

    // Back button
    const backButton = this.add.text(400, 550, '← BACK', {
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
    // For now, just create empty array
    // Later this will load from localStorage
    this.saves = [];
  }

  createSaveSlots() {
    // Create 3 empty save slots
    for (let i = 0; i < 3; i++) {
      const y = 180 + i * 100;
      
      // Slot background
      const slotBg = this.add.rectangle(400, y, 600, 80, 0x333333, 0.8);
      slotBg.setStrokeStyle(2, 0x666666);

      // Slot number
      this.add.text(150, y - 20, `SAVE SLOT ${i + 1}`, {
        fontSize: '20px',
        fill: '#aaa',
      });

      // Empty text
      this.add.text(400, y, 'EMPTY', {
        fontSize: '24px',
        fill: '#666',
        fontStyle: 'italic',
      }).setOrigin(0.5);

      if (this.mode === 'save') {
        // Save button for empty slot
        const saveBtn = this.add.text(600, y - 10, 'SAVE', {
          fontSize: '18px',
          fill: '#0f0',
          backgroundColor: '#444',
          padding: { x: 10, y: 5 },
        }).setInteractive();

        saveBtn.on('pointerdown', () => {
          // For now just go back to play
          // Later this will actually save
          this.scene.start('Play');
        });
      }
    }
  }
}

globalThis.Saves = Saves;
