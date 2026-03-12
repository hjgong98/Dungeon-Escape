class Inventory extends Phaser.Scene {
  constructor() {
    super('Inventory');
    this.currentPage = 0;
    this.itemsPerPage = 10;
    this.listGroup = null;
  }

  init() {
    // Scene instances are reused by Phaser; transient groups must reset.
    this.listGroup = null;
    this.currentPage = 0;
  }

  preload() {
    this.load.image('background', './assets/game_background_3.1.png');
  }

  create() {
    // Background
    this.background = this.add.image(0, 0, 'background').setOrigin(0, 0);
    this.background.setDisplaySize(800, 600);

    // Title
    this.add.text(400, 50, 'INVENTORY', {
      fontSize: '48px',
      fill: '#fff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Get inventory from gameState
    const inventory = globalThis.gameState.player.inventory || [];

    // Show inventory count
    this.add.text(400, 100, `${inventory.length} items`, {
      fontSize: '20px',
      fill: '#aaa',
    }).setOrigin(0.5);

    // Create inventory list
    this.createInventoryList(inventory);

    // Back button
    const backButton = this.add.text(400, 550, '← BACK TO PLAY', {
      fontSize: '24px',
      fill: '#fff',
      backgroundColor: '#333',
      padding: { x: 15, y: 8 },
    }).setInteractive();

    backButton.on('pointerdown', () => {
      this.scene.start('Play');
    });
  }

  createInventoryList(inventory) {
    const startY = 150;
    const startX = 200;

    // Calculate which items to show based on page
    const startIdx = this.currentPage * this.itemsPerPage;
    const pageItems = inventory.slice(startIdx, startIdx + this.itemsPerPage);

    // Clear old list if it exists and is still valid.
    const canReuseGroup = Boolean(
      this.listGroup &&
        this.listGroup.scene === this &&
        this.listGroup.children &&
        typeof this.listGroup.clear === 'function',
    );

    if (canReuseGroup) {
      try {
        this.listGroup.clear(true, true);
      } catch (_error) {
        this.listGroup = this.add.group();
      }
    } else {
      this.listGroup = this.add.group();
    }

    // Show items
    pageItems.forEach((item, index) => {
      const y = startY + index * 30;

      // Item background
      const bg = this.add.rectangle(startX + 200, y, 400, 25, 0x333333, 0.8);

      // Item name with tier color
      const tierColors = ['#888', '#8f8', '#88f', '#f8f', '#ff8', '#f88'];
      const color = tierColors[item.tier - 1] || '#fff';

      const itemText = this.add.text(startX, y, `${item.name}`, {
        fontSize: '18px',
        fill: color,
      });

      // Item type and tier
      this.add.text(startX + 300, y, `${item.type} T${item.tier}`, {
        fontSize: '16px',
        fill: '#aaa',
      });

      this.listGroup.addMultiple([bg, itemText]);
    });

    // Show empty message if no items
    if (pageItems.length === 0) {
      this.add.text(400, 300, 'Inventory is empty', {
        fontSize: '24px',
        fill: '#666',
        fontStyle: 'italic',
      }).setOrigin(0.5);
    }

    // Page controls
    if (inventory.length > this.itemsPerPage) {
      const totalPages = Math.ceil(inventory.length / this.itemsPerPage);

      if (this.currentPage > 0) {
        const prevBtn = this.add.text(300, 500, '← PREV', {
          fontSize: '20px',
          fill: '#fff',
          backgroundColor: '#333',
          padding: { x: 10, y: 5 },
        }).setInteractive();

        prevBtn.on('pointerdown', () => {
          this.currentPage--;
          this.createInventoryList(inventory);
        });
      }

      if (this.currentPage < totalPages - 1) {
        const nextBtn = this.add.text(500, 500, 'NEXT →', {
          fontSize: '20px',
          fill: '#fff',
          backgroundColor: '#333',
          padding: { x: 10, y: 5 },
        }).setInteractive();

        nextBtn.on('pointerdown', () => {
          this.currentPage++;
          this.createInventoryList(inventory);
        });
      }

      this.add.text(400, 530, `Page ${this.currentPage + 1}/${totalPages}`, {
        fontSize: '16px',
        fill: '#aaa',
      }).setOrigin(0.5);
    }
  }
}

globalThis.Inventory = Inventory;
