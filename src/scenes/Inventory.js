class Inventory extends Phaser.Scene {
  constructor() {
    super('Inventory');
    this.selectedItem = null;
    this.selectedLocation = null; // 'bag' or 'storage'
    this.selectedIndex = null;
    this.bagPage = 0;
    this.storagePage = 0;
    this.bagGroup = null;
    this.storageGroup = null;
    this.actionGroup = null;
    this.detailGroup = null;
  }

  init(data = {}) {
    this.returnScene = data.returnScene || null;
    this.selectedItem = null;
    this.selectedLocation = null;
    this.selectedIndex = null;
    this.bagPage = 0;
    this.storagePage = 0;
    this.bagGroup = null;
    this.storageGroup = null;
    this.actionGroup = null;
    this.detailGroup = null;
  }

  preload() {
    this.load.image('background', './assets/game_background_3.1.png');
  }

  create() {
    // Background
    this.background = this.add.image(0, 0, 'background').setOrigin(0, 0);
    this.background.setDisplaySize(800, 600);

    // Title and gold
    this.add.text(400, 40, 'INVENTORY', {
      fontSize: '36px',
      fill: '#fff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const player = globalThis.gameState.player;
    const gold = player.gold || 0;
    this.add.text(680, 40, `💰 ${gold}`, {
      fontSize: '24px',
      fill: '#ff0',
      backgroundColor: '#333',
      padding: { x: 10, y: 5 },
    });

    this.ensureCapacityFields();

    // Bag Section (left)
    this.createBagSection();

    // Storage Section (right)
    this.createStorageSection();

    // Action buttons (bottom)
    this.createActionButtons();

    // Back button
    const backButton = this.add.text(100, 550, '← BACK TO PLAY', {
      fontSize: '24px',
      fill: '#fff',
      backgroundColor: '#333',
      padding: { x: 15, y: 8 },
    }).setInteractive();

    backButton.on('pointerdown', () => {
      if (this.returnScene) {
        this.scene.wake(this.returnScene);
        this.scene.stop();
      } else {
        this.scene.start('Play');
      }
    });
  }

  createBagSection() {
    const player = globalThis.gameState.player;
    const bag = player.inventory || [];
    const bagStacks = this.getItemStacks(bag);
    const maxItems = 8;
    const totalPages = Math.max(1, Math.ceil(bagStacks.length / maxItems));
    this.bagPage = Math.min(this.bagPage, totalPages - 1);
    const start = this.bagPage * maxItems;
    const pageStacks = bagStacks.slice(start, start + maxItems);

    // Clear old bag group first so all previously rendered section objects are destroyed.
    if (this.bagGroup) this.bagGroup.clear(true, true);
    this.bagGroup = this.add.group();

    // Section header
    const bagHeader = this.add.text(
      200,
      95,
      `BAG ${bagStacks.length}/${this.getBagCapacity()}`,
      {
        fontSize: '24px',
        fill: '#ff0',
        fontStyle: 'bold',
      },
    ).setOrigin(0.5);
    this.bagGroup.add(bagHeader);

    // Background panel
    const bagPanel = this.add.rectangle(200, 280, 300, 330, 0x222222, 0.8);
    bagPanel.setStrokeStyle(2, 0x666666);
    this.bagGroup.add(bagPanel);

    // Show bag items
    const startY = 160;

    for (let i = 0; i < maxItems; i++) {
      const y = startY + i * 35;
      const stack = pageStacks[i];
      const item = stack?.item;

      // Item background (clickable)
      const itemBg = this.add.rectangle(200, y, 280, 35, 0x333333, 0.9)
        .setInteractive();
      this.bagGroup.add(itemBg);

      if (item) {
        // Get tier color
        const tierColors = ['#888', '#8f8', '#88f', '#f8f', '#ff8', '#f88'];
        const color = tierColors[(item.tier || 1) - 1] || '#fff';

        const stackText = stack.count > 1 ? ` (${stack.count})` : '';
        const itemText = this.add.text(
          80,
          y,
          `${item.name}${stackText}`,
          {
            fontSize: '16px',
            fill: color,
            fixedWidth: 200,
            align: 'left',
          },
        ).setOrigin(0, 0.5);
        this.bagGroup.add(itemText);

        // Click handler
        itemBg.on('pointerdown', () => {
          if (stack.count > 1 || this.isEquipmentType(item)) {
            this.openStackDetails(stack, 'bag');
          } else {
            this.selectItem(item, 'bag', i);
          }
        });

        // Highlight if selected
        if (this.selectedItem === item && this.selectedLocation === 'bag') {
          itemBg.setStrokeStyle(2, 0xff0);
        }
      } else {
        // Empty slot
        const emptyText = this.add.text(200, y, '[EMPTY]', {
          fontSize: '16px',
          fill: '#444',
        }).setOrigin(0.5);
        this.bagGroup.add(emptyText);
      }
    }

    if (totalPages > 1) {
      const prevBtn = this.add.text(150, 462, '← PREV', {
        fontSize: '12px',
        fill: this.bagPage > 0 ? '#ddd' : '#666',
        backgroundColor: '#222',
        padding: { x: 6, y: 3 },
      }).setOrigin(0.5).setInteractive();
      this.bagGroup.add(prevBtn);

      if (this.bagPage > 0) {
        prevBtn.on('pointerdown', () => this.changeBagPage(-1));
      }

      const pageLabel = this.add.text(
        200,
        462,
        `${this.bagPage + 1}/${totalPages}`,
        {
          fontSize: '12px',
          fill: '#aaa',
        },
      ).setOrigin(0.5);
      this.bagGroup.add(pageLabel);

      const nextBtn = this.add.text(250, 462, 'NEXT →', {
        fontSize: '12px',
        fill: this.bagPage < totalPages - 1 ? '#ddd' : '#666',
        backgroundColor: '#222',
        padding: { x: 6, y: 3 },
      }).setOrigin(0.5).setInteractive();
      this.bagGroup.add(nextBtn);

      if (this.bagPage < totalPages - 1) {
        nextBtn.on('pointerdown', () => this.changeBagPage(1));
      }
    }
  }

  createStorageSection() {
    const player = globalThis.gameState.player;
    const storage = player.storage || [];
    const storageStacks = this.getItemStacks(storage);
    const maxItems = 8;
    const totalPages = Math.max(1, Math.ceil(storageStacks.length / maxItems));
    this.storagePage = Math.min(this.storagePage, totalPages - 1);
    const start = this.storagePage * maxItems;
    const pageStacks = storageStacks.slice(start, start + maxItems);

    // Clear old storage group first so all previously rendered section objects are destroyed.
    if (this.storageGroup) this.storageGroup.clear(true, true);
    this.storageGroup = this.add.group();

    // Section header
    const storageHeader = this.add.text(
      600,
      95,
      `STORAGE ${storageStacks.length}/${this.getStorageCapacity()}`,
      {
        fontSize: '24px',
        fill: '#0ff',
        fontStyle: 'bold',
      },
    ).setOrigin(0.5);
    this.storageGroup.add(storageHeader);

    // Background panel
    const storagePanel = this.add.rectangle(600, 280, 300, 330, 0x222222, 0.8);
    storagePanel.setStrokeStyle(2, 0x666666);
    this.storageGroup.add(storagePanel);

    // Show storage items
    const startY = 160;

    for (let i = 0; i < maxItems; i++) {
      const y = startY + i * 35;
      const stack = pageStacks[i];
      const item = stack?.item;

      const itemBg = this.add.rectangle(600, y, 280, 35, 0x333333, 0.9)
        .setInteractive();
      this.storageGroup.add(itemBg);

      if (item) {
        const tierColors = ['#888', '#8f8', '#88f', '#f8f', '#ff8', '#f88'];
        const color = tierColors[(item.tier || 1) - 1] || '#fff';

        const stackText = stack.count > 1 ? ` (${stack.count})` : '';
        const itemText = this.add.text(
          480,
          y,
          `${item.name}${stackText}`,
          {
            fontSize: '16px',
            fill: color,
            fixedWidth: 200,
            align: 'left',
          },
        ).setOrigin(0, 0.5);
        this.storageGroup.add(itemText);

        itemBg.on('pointerdown', () => {
          if (stack.count > 1 || this.isEquipmentType(item)) {
            this.openStackDetails(stack, 'storage');
          } else {
            this.selectItem(item, 'storage', i);
          }
        });

        if (this.selectedItem === item && this.selectedLocation === 'storage') {
          itemBg.setStrokeStyle(2, 0xff0);
        }
      } else {
        const emptyText = this.add.text(600, y, '[EMPTY]', {
          fontSize: '16px',
          fill: '#444',
        }).setOrigin(0.5);
        this.storageGroup.add(emptyText);
      }
    }

    if (totalPages > 1) {
      const prevBtn = this.add.text(550, 462, '← PREV', {
        fontSize: '12px',
        fill: this.storagePage > 0 ? '#ddd' : '#666',
        backgroundColor: '#222',
        padding: { x: 6, y: 3 },
      }).setOrigin(0.5).setInteractive();
      this.storageGroup.add(prevBtn);

      if (this.storagePage > 0) {
        prevBtn.on('pointerdown', () => this.changeStoragePage(-1));
      }

      const pageLabel = this.add.text(
        600,
        462,
        `${this.storagePage + 1}/${totalPages}`,
        {
          fontSize: '12px',
          fill: '#aaa',
        },
      ).setOrigin(0.5);
      this.storageGroup.add(pageLabel);

      const nextBtn = this.add.text(650, 462, 'NEXT →', {
        fontSize: '12px',
        fill: this.storagePage < totalPages - 1 ? '#ddd' : '#666',
        backgroundColor: '#222',
        padding: { x: 6, y: 3 },
      }).setOrigin(0.5).setInteractive();
      this.storageGroup.add(nextBtn);

      if (this.storagePage < totalPages - 1) {
        nextBtn.on('pointerdown', () => this.changeStoragePage(1));
      }
    }
  }

  createActionButtons() {
    // Clear old action group
    if (this.actionGroup) this.actionGroup.clear(true, true);
    this.actionGroup = this.add.group();

    const actionButtonY = 534;
    const actionInfoY = 560;
    const actionRight = 780;
    const moveButtonWidth = 150;
    const sellButtonWidth = 120;
    const actionLeft = 500;

    if (this.selectedItem) {
      // Show selected item info
      const tierColors = ['#888', '#8f8', '#88f', '#f8f', '#ff8', '#f88'];
      const color = tierColors[(this.selectedItem.tier || 1) - 1] || '#fff';

      const upgradeText = this.selectedItem.upgradeLevel > 0
        ? ` +${this.selectedItem.upgradeLevel}`
        : '';
      const selectedText = this.add.text(
        actionLeft,
        actionInfoY,
        `Selected: ${this.selectedItem.name}${upgradeText}`,
        {
          fontSize: '14px',
          fill: color,
          fixedWidth: 220,
          align: 'left',
        },
      ).setOrigin(0, 0.5);
      this.actionGroup.add(selectedText);

      // Move button
      const moveText = this.selectedLocation === 'bag'
        ? 'MOVE TO STORAGE'
        : 'MOVE TO BAG';
      const moveBtn = this.add.text(actionLeft, actionButtonY, moveText, {
        fontSize: '13px',
        fill: '#0ff',
        backgroundColor: '#444',
        padding: { x: 8, y: 4 },
        fixedWidth: moveButtonWidth,
        align: 'center',
      }).setOrigin(0, 0.5).setInteractive();
      this.actionGroup.add(moveBtn);

      moveBtn.on('pointerdown', () => {
        this.moveSelectedItem();
      });

      // Sell button
      const sellBtn = this.add.text(
        660,
        actionButtonY,
        `SELL (${this.selectedItem.value}g)`,
        {
          fontSize: '13px',
          fill: '#ff0',
          backgroundColor: '#444',
          padding: { x: 8, y: 4 },
          fixedWidth: sellButtonWidth,
          align: 'center',
        },
      ).setOrigin(0, 0.5).setInteractive();
      this.actionGroup.add(sellBtn);

      sellBtn.on('pointerdown', () => {
        this.sellSelectedItem();
      });

      // Cancel selection
      const cancelBtn = this.add.text(actionRight, actionInfoY, 'CANCEL', {
        fontSize: '13px',
        fill: '#f88',
        fixedWidth: 80,
        align: 'right',
      }).setOrigin(1, 0.5).setInteractive();
      this.actionGroup.add(cancelBtn);

      cancelBtn.on('pointerdown', () => {
        this.closeStackDetails();
        this.selectedItem = null;
        this.selectedLocation = null;
        this.createBagSection();
        this.createStorageSection();
        this.createActionButtons();
      });
    } else {
      // No item selected
      const noSelectText = this.add.text(
        actionRight,
        actionInfoY,
        'Click an item to select',
        {
          fontSize: '14px',
          fill: '#aaa',
          fontStyle: 'italic',
          fixedWidth: 280,
          align: 'right',
        },
      ).setOrigin(1, 0.5);
      this.actionGroup.add(noSelectText);
    }

    // Upgrade buttons under each section panel
    const bagUpgradeBtn = this.add.text(200, 490, 'UPGRADE BAG (50g)', {
      fontSize: '16px',
      fill: '#ff0',
      backgroundColor: '#333',
      padding: { x: 10, y: 5 },
    }).setOrigin(0.5, 0).setInteractive();
    this.actionGroup.add(bagUpgradeBtn);

    bagUpgradeBtn.on('pointerdown', () => {
      this.upgradeBagSlots();
    });

    const storageUpgradeBtn = this.add.text(
      600,
      490,
      'UPGRADE STORAGE (100g)',
      {
        fontSize: '16px',
        fill: '#0ff',
        backgroundColor: '#333',
        padding: { x: 10, y: 5 },
      },
    ).setOrigin(0.5, 0).setInteractive();
    this.actionGroup.add(storageUpgradeBtn);

    storageUpgradeBtn.on('pointerdown', () => {
      this.upgradeStorageSlots();
    });
  }

  ensureCapacityFields() {
    const player = globalThis.gameState.player;
    if (typeof player.bagSlots !== 'number') {
      player.bagSlots = typeof player.maxInventory === 'number'
        ? player.maxInventory
        : 20;
    }
    if (typeof player.storageSlots !== 'number') {
      player.storageSlots = 20;
    }
    player.maxInventory = player.bagSlots;
  }

  getBagCapacity() {
    const player = globalThis.gameState.player;
    return typeof player.bagSlots === 'number' ? player.bagSlots : 20;
  }

  getStorageCapacity() {
    const player = globalThis.gameState.player;
    return typeof player.storageSlots === 'number' ? player.storageSlots : 20;
  }

  getItemStacks(items) {
    const stacks = [];
    const byName = new Map();

    items.forEach((item) => {
      const key = item?.name || 'Unknown';
      const existing = byName.get(key);
      if (existing) {
        existing.count++;
        existing.items.push(item);
      } else {
        const stack = { item, count: 1, items: [item] };
        byName.set(key, stack);
        stacks.push(stack);
      }
    });

    return stacks;
  }

  openStackDetails(stack, location) {
    this.closeStackDetails();

    this.detailGroup = this.add.group();

    const overlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.6)
      .setInteractive();
    this.detailGroup.add(overlay);

    const panel = this.add.rectangle(400, 285, 560, 360, 0x1f1f1f, 0.95);
    panel.setStrokeStyle(2, 0x666666);
    this.detailGroup.add(panel);

    const title = this.add.text(
      400,
      130,
      `${stack.item.name} (${stack.count})`,
      {
        fontSize: '24px',
        fill: '#fff',
        fontStyle: 'bold',
      },
    ).setOrigin(0.5);
    this.detailGroup.add(title);

    const subtitle = this.add.text(400, 156, 'Pick one item from the stack', {
      fontSize: '14px',
      fill: '#aaa',
    }).setOrigin(0.5);
    this.detailGroup.add(subtitle);

    const closeBtn = this.add.text(660, 130, 'CLOSE', {
      fontSize: '14px',
      fill: '#f88',
      backgroundColor: '#333',
      padding: { x: 8, y: 4 },
    }).setOrigin(1, 0.5).setInteractive();
    this.detailGroup.add(closeBtn);

    closeBtn.on('pointerdown', () => this.closeStackDetails());
    overlay.on('pointerdown', () => this.closeStackDetails());

    const maxLines = 7;
    const itemsToShow = stack.items.slice(0, maxLines);

    itemsToShow.forEach((entry, idx) => {
      const y = 190 + idx * 34;
      const rowBg = this.add.rectangle(400, y, 520, 28, 0x333333, 0.9)
        .setInteractive();
      this.detailGroup.add(rowBg);

      const line = this.add.text(
        148,
        y,
        entry.name,
        {
          fontSize: '14px',
          fill: '#ddd',
          fixedWidth: 500,
          align: 'left',
        },
      ).setOrigin(0, 0.5);
      this.detailGroup.add(line);

      rowBg.on('pointerdown', () => {
        this.closeStackDetails();
        this.selectItem(entry, location, null);
      });
    });

    if (stack.items.length > maxLines) {
      const moreText = this.add.text(
        400,
        190 + maxLines * 34,
        `+${stack.items.length - maxLines} more items in stack`,
        {
          fontSize: '12px',
          fill: '#999',
        },
      ).setOrigin(0.5);
      this.detailGroup.add(moreText);
    }
  }

  closeStackDetails() {
    if (this.detailGroup) {
      this.detailGroup.clear(true, true);
      this.detailGroup = null;
    }
  }

  changeBagPage(delta) {
    this.closeStackDetails();
    this.bagPage = Math.max(0, this.bagPage + delta);
    this.createBagSection();
  }

  changeStoragePage(delta) {
    this.closeStackDetails();
    this.storagePage = Math.max(0, this.storagePage + delta);
    this.createStorageSection();
  }

  canAddToContainer(containerItems, capacity, itemToAdd) {
    const stacks = this.getItemStacks(containerItems);
    const matchesExistingStack = stacks.some((stack) =>
      stack.item?.name === itemToAdd?.name
    );
    if (matchesExistingStack) return true;
    return stacks.length < capacity;
  }

  isEquipmentType(item) {
    return ['weapon', 'armor', 'accessory'].includes(item?.type);
  }

  getItemStatsPreview(item) {
    if (!item || !item.stats) return 'No stats';

    const parts = [];
    if (item.stats.atkBonus) parts.push(`ATK+${item.stats.atkBonus}`);
    if (item.stats.defBonus) parts.push(`DEF+${item.stats.defBonus}`);
    if (item.stats.hpBonus) parts.push(`HP+${item.stats.hpBonus}`);
    if (item.stats.luckBonus) {
      parts.push(`LCK+${Math.floor(item.stats.luckBonus * 100)}%`);
    }
    if (item.stats.expBonus) {
      parts.push(`EXP+${Math.floor(item.stats.expBonus * 100)}%`);
    }
    if (item.stats.goldBonus) {
      parts.push(`GLD+${Math.floor(item.stats.goldBonus * 100)}%`);
    }
    return parts.join(' ') || 'No stats';
  }

  getItemCompactBonus(item) {
    if (!item || !item.stats) return '';

    const stats = item.stats;
    if (typeof stats.atkBonus === 'number') return `+${stats.atkBonus}`;
    if (typeof stats.defBonus === 'number') return `+${stats.defBonus}`;
    if (typeof stats.hpBonus === 'number') return `+${stats.hpBonus}`;
    if (typeof stats.luckBonus === 'number') {
      return `+${Math.floor(stats.luckBonus * 100)}%`;
    }
    if (typeof stats.expBonus === 'number') {
      return `+${Math.floor(stats.expBonus * 100)}%`;
    }
    if (typeof stats.goldBonus === 'number') {
      return `+${Math.floor(stats.goldBonus * 100)}%`;
    }

    return '';
  }

  selectItem(item, location, index) {
    this.closeStackDetails();
    this.selectedItem = item;
    this.selectedLocation = location;
    this.selectedIndex = index;
    this.createBagSection();
    this.createStorageSection();
    this.createActionButtons();
  }

  moveSelectedItem() {
    if (!this.selectedItem) return;
    this.closeStackDetails();

    const player = globalThis.gameState.player;

    if (this.selectedLocation === 'bag') {
      // Move from bag to storage
      if (!player.storage) player.storage = [];
      if (
        !this.canAddToContainer(
          player.storage,
          this.getStorageCapacity(),
          this.selectedItem,
        )
      ) {
        return;
      }
      player.storage.push(this.selectedItem);
      player.inventory = player.inventory.filter((i) =>
        i !== this.selectedItem
      );
    } else {
      // Move from storage to bag
      if (!player.inventory) player.inventory = [];
      if (
        !this.canAddToContainer(
          player.inventory,
          this.getBagCapacity(),
          this.selectedItem,
        )
      ) {
        return;
      }
      player.inventory.push(this.selectedItem);
      player.storage = player.storage.filter((i) => i !== this.selectedItem);
    }

    this.selectedItem = null;
    this.selectedLocation = null;
    this.createBagSection();
    this.createStorageSection();
    this.createActionButtons();
  }

  sellSelectedItem() {
    if (!this.selectedItem) return;
    this.closeStackDetails();

    const player = globalThis.gameState.player;
    const value = this.selectedItem.value || 1;

    // Add gold
    player.gold = (player.gold || 0) + value;

    // Remove item
    if (this.selectedLocation === 'bag') {
      player.inventory = player.inventory.filter((i) =>
        i !== this.selectedItem
      );
    } else {
      player.storage = player.storage.filter((i) => i !== this.selectedItem);
    }

    this.selectedItem = null;
    this.selectedLocation = null;
    this.createBagSection();
    this.createStorageSection();
    this.createActionButtons();
  }

  upgradeBagSlots() {
    const player = globalThis.gameState.player;
    const cost = 50;
    if ((player.gold || 0) < cost) return;
    player.gold -= cost;
    player.bagSlots = this.getBagCapacity() + 5;
    player.maxInventory = player.bagSlots;
    this.scene.restart();
  }

  upgradeStorageSlots() {
    const player = globalThis.gameState.player;
    const cost = 100;
    if ((player.gold || 0) < cost) return;
    player.gold -= cost;
    player.storageSlots = this.getStorageCapacity() + 10;
    this.scene.restart();
  }
}

globalThis.Inventory = Inventory;
