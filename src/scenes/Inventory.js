class Inventory extends Phaser.Scene {
  constructor() {
    super('Inventory');
    this.selectedItem = null;
    this.selectedLocation = null; // 'bag' or 'storage'
    this.selectedIndex = null;
    this.selectedItems = new Set();
    this.bagPage = 0;
    this.storagePage = 0;
    this.bagGroup = null;
    this.storageGroup = null;
    this.actionGroup = null;
    this.detailGroup = null;
    this.goldText = null;
  }

  init(data = {}) {
    this.returnScene = data.returnScene || null;
    this.selectedItem = null;
    this.selectedLocation = null;
    this.selectedIndex = null;
    this.selectedItems = new Set();
    this.bagPage = 0;
    this.storagePage = 0;
    this.bagGroup = null;
    this.storageGroup = null;
    this.actionGroup = null;
    this.detailGroup = null;
    this.goldText = null;
  }

  preload() {
    globalThis.registerSharedSfx?.(this);
    this.load.image('inventoryBackground', './assets/forest2.png');
  }

  create() {
    globalThis.enableSceneUiClickSfx?.(this);
    const player = this.getPlayerState();
    if (!player) {
      console.warn(
        '[Inventory] Missing player state; returning to Play scene.',
      );
      this.scene.start('Play');
      return;
    }

    // Background
    if (this.textures.exists('inventoryBackground')) {
      this.background = this.add.image(0, 0, 'inventoryBackground').setOrigin(
        0,
        0,
      );
      this.background.setDisplaySize(800, 600);
    } else {
      this.cameras.main.setBackgroundColor('#101820');
    }

    // Title and gold
    this.add.text(400, 40, 'INVENTORY', {
      fontSize: '36px',
      fill: '#fff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.goldText = this.add.text(680, 40, '', {
      fontSize: '24px',
      fill: '#ff0',
      backgroundColor: '#333',
      padding: { x: 10, y: 5 },
    });
    this.refreshGoldDisplay();

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
    const player = this.getPlayerState();
    if (!player) return;
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

    const bagSelectedCount =
      bag.filter((item) => this.selectedItems.has(item)).length;
    const showBagSelectAll = bag.length > 0 && bagSelectedCount < bag.length;
    const showBagDeselectAll = bagSelectedCount > 0;

    if (showBagSelectAll) {
      const bagSelectAllBtn = this.add.text(62, 128, 'SELECT ALL', {
        fontSize: '12px',
        fill: '#fff',
        backgroundColor: '#2f5f2f',
        padding: { x: 7, y: 3 },
      }).setOrigin(0, 0.5).setInteractive();
      this.bagGroup.add(bagSelectAllBtn);

      bagSelectAllBtn.on('pointerdown', () => {
        this.selectAllInLocation('bag');
      });
    }

    if (showBagDeselectAll) {
      const bagDeselectAllBtn = this.add.text(338, 128, 'DESELECT ALL', {
        fontSize: '12px',
        fill: '#fff',
        backgroundColor: '#5f2f2f',
        padding: { x: 7, y: 3 },
      }).setOrigin(1, 0.5).setInteractive();
      this.bagGroup.add(bagDeselectAllBtn);

      bagDeselectAllBtn.on('pointerdown', () => {
        this.clearSelectionInLocation('bag');
      });
    }

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

        const itemText = this.add.text(
          80,
          y,
          this.getDisplayItemName(item),
          {
            fontSize: '16px',
            fill: color,
            fixedWidth: 220,
            align: 'left',
          },
        ).setOrigin(0, 0.5);
        this.bagGroup.add(itemText);

        if (stack.count > 1) {
          const countText = this.add.text(332, y, `${stack.count}`, {
            fontSize: '16px',
            fill: '#ddd',
            align: 'right',
          }).setOrigin(1, 0.5);
          this.bagGroup.add(countText);
        }

        // Click handler
        itemBg.on('pointerdown', () => {
          if (stack.count > 1 || this.isEquipmentType(item)) {
            this.openStackDetails(stack, 'bag');
          } else {
            this.toggleItemSelection(item, 'bag', i);
          }
        });

        // Highlight if selected
        if (this.selectedItems.has(item)) {
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
    const player = this.getPlayerState();
    if (!player) return;
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

    const storageSelectedCount =
      storage.filter((item) => this.selectedItems.has(item)).length;
    const showStorageSelectAll = storage.length > 0 &&
      storageSelectedCount < storage.length;
    const showStorageDeselectAll = storageSelectedCount > 0;

    if (showStorageSelectAll) {
      const storageSelectAllBtn = this.add.text(462, 128, 'SELECT ALL', {
        fontSize: '12px',
        fill: '#fff',
        backgroundColor: '#2f5f2f',
        padding: { x: 7, y: 3 },
      }).setOrigin(0, 0.5).setInteractive();
      this.storageGroup.add(storageSelectAllBtn);

      storageSelectAllBtn.on('pointerdown', () => {
        this.selectAllInLocation('storage');
      });
    }

    if (showStorageDeselectAll) {
      const storageDeselectAllBtn = this.add.text(738, 128, 'DESELECT ALL', {
        fontSize: '12px',
        fill: '#fff',
        backgroundColor: '#5f2f2f',
        padding: { x: 7, y: 3 },
      }).setOrigin(1, 0.5).setInteractive();
      this.storageGroup.add(storageDeselectAllBtn);

      storageDeselectAllBtn.on('pointerdown', () => {
        this.clearSelectionInLocation('storage');
      });
    }

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

        const itemText = this.add.text(
          480,
          y,
          this.getDisplayItemName(item),
          {
            fontSize: '16px',
            fill: color,
            fixedWidth: 220,
            align: 'left',
          },
        ).setOrigin(0, 0.5);
        this.storageGroup.add(itemText);

        if (stack.count > 1) {
          const countText = this.add.text(732, y, `${stack.count}`, {
            fontSize: '16px',
            fill: '#ddd',
            align: 'right',
          }).setOrigin(1, 0.5);
          this.storageGroup.add(countText);
        }

        itemBg.on('pointerdown', () => {
          if (stack.count > 1 || this.isEquipmentType(item)) {
            this.openStackDetails(stack, 'storage');
          } else {
            this.toggleItemSelection(item, 'storage', i);
          }
        });

        if (this.selectedItems.has(item)) {
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

    const selectedItems = this.getSelectedItems();

    if (selectedItems.length > 0) {
      this.updateSelectionAnchor();

      // Show selected item info
      const firstSelected = selectedItems[0];

      let selectedLabel = `Selected: ${selectedItems.length} item${
        selectedItems.length === 1 ? '' : 's'
      }`;
      if (selectedItems.length === 1) {
        const upgradeText = firstSelected.upgradeLevel > 0
          ? ` +${firstSelected.upgradeLevel}`
          : '';
        selectedLabel = `Selected: ${
          this.getDisplayItemName(firstSelected)
        }${upgradeText}`;
      }

      const selectedText = this.add.text(
        actionLeft,
        actionInfoY,
        selectedLabel,
        {
          fontSize: '14px',
          fill: '#000',
          fixedWidth: 220,
          align: 'left',
        },
      ).setOrigin(0, 0.5);
      this.actionGroup.add(selectedText);

      // Move button
      const moveText =
        selectedItems.length === 1 && this.selectedLocation === 'bag'
          ? 'MOVE TO STORAGE'
          : selectedItems.length === 1 && this.selectedLocation === 'storage'
          ? 'MOVE TO BAG'
          : 'MOVE SELECTED';
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
        this.moveSelectedItems();
      });

      // Sell button
      const sellValue = selectedItems.reduce(
        (sum, item) => sum + this.getSellValue(item),
        0,
      );
      const sellBtn = this.add.text(
        660,
        actionButtonY,
        `SELL (${sellValue}g)`,
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
        this.sellSelectedItems();
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
        this.clearSelection();
      });
    } else {
      // No item selected
      const noSelectText = this.add.text(
        actionRight,
        actionInfoY,
        'Click an item to select',
        {
          fontSize: '14px',
          fill: '#000',
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
    const player = this.getPlayerState();
    if (!player) {
      return;
    }
    if (typeof player.bagSlots !== 'number') {
      player.bagSlots = typeof player.maxInventory === 'number'
        ? player.maxInventory
        : 20;
    }
    if (typeof player.storageSlots !== 'number') {
      player.storageSlots = 40;
    } else {
      player.storageSlots = Math.max(40, player.storageSlots);
    }
    player.maxInventory = player.bagSlots;
  }

  getBagCapacity() {
    const player = this.getPlayerState();
    if (!player) {
      return 20;
    }
    return typeof player.bagSlots === 'number' ? player.bagSlots : 20;
  }

  getStorageCapacity() {
    const player = this.getPlayerState();
    if (!player) {
      return 40;
    }
    return typeof player.storageSlots === 'number' ? player.storageSlots : 40;
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

  openStackDetails(stack, location, page = 0) {
    this.closeStackDetails();

    this.detailGroup = this.add.group();

    const consumePointer = (_pointer, _localX, _localY, event) => {
      event?.stopPropagation?.();
    };

    const overlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.6)
      .setInteractive();
    overlay.on('pointerdown', consumePointer);
    overlay.on('pointerup', consumePointer);
    this.detailGroup.add(overlay);

    const panel = this.add.rectangle(400, 285, 560, 360, 0x1f1f1f, 0.95)
      .setInteractive();
    panel.setStrokeStyle(2, 0x666666);
    panel.on('pointerdown', consumePointer);
    panel.on('pointerup', consumePointer);
    this.detailGroup.add(panel);

    const title = this.add.text(
      400,
      130,
      `${this.getDisplayItemName(stack.item)} (${stack.count})`,
      {
        fontSize: '24px',
        fill: '#fff',
        fontStyle: 'bold',
      },
    ).setOrigin(0.5);
    this.detailGroup.add(title);

    const subtitle = this.add.text(400, 156, 'Toggle any items in this stack', {
      fontSize: '14px',
      fill: '#aaa',
    }).setOrigin(0.5);
    this.detailGroup.add(subtitle);

    const stackSelectedCount =
      stack.items.filter((i) => this.selectedItems.has(i)).length;
    const showStackSelectAll = stackSelectedCount < stack.items.length;
    const showStackDeselectAll = stackSelectedCount > 0;

    if (showStackSelectAll) {
      const selectAllBtn = this.add.text(140, 176, 'SELECT ALL', {
        fontSize: '13px',
        fill: '#fff',
        backgroundColor: '#2f5f2f',
        padding: { x: 8, y: 4 },
      }).setOrigin(0, 0.5).setInteractive();
      this.detailGroup.add(selectAllBtn);

      selectAllBtn.on('pointerdown', () => {
        this.selectItemsInStack(stack.items);
        this.openStackDetails(stack, location, page);
      });
    }

    if (showStackDeselectAll) {
      const deselectAllBtn = this.add.text(660, 176, 'DESELECT ALL', {
        fontSize: '13px',
        fill: '#fff',
        backgroundColor: '#5f2f2f',
        padding: { x: 8, y: 4 },
      }).setOrigin(1, 0.5).setInteractive();
      this.detailGroup.add(deselectAllBtn);

      deselectAllBtn.on('pointerdown', () => {
        this.deselectItemsInStack(stack.items);
        this.openStackDetails(stack, location, page);
      });
    }

    const closeBtn = this.add.text(660, 130, 'CLOSE', {
      fontSize: '14px',
      fill: '#f88',
      backgroundColor: '#333',
      padding: { x: 8, y: 4 },
    }).setOrigin(1, 0.5).setInteractive();
    this.detailGroup.add(closeBtn);

    closeBtn.on('pointerdown', () => this.closeStackDetails());

    const maxLines = 7;
    const totalPages = Math.max(1, Math.ceil(stack.items.length / maxLines));
    const currentPage = Phaser.Math.Clamp(page, 0, totalPages - 1);
    const pageStart = currentPage * maxLines;
    const itemsToShow = stack.items.slice(pageStart, pageStart + maxLines);

    itemsToShow.forEach((entry, idx) => {
      const y = 210 + idx * 34;
      const rowBg = this.add.rectangle(400, y, 520, 28, 0x333333, 0.9)
        .setInteractive();
      this.detailGroup.add(rowBg);

      if (this.selectedItems.has(entry)) {
        rowBg.setStrokeStyle(2, 0xff0);
      }

      const line = this.add.text(
        148,
        y,
        this.getDisplayItemName(entry),
        {
          fontSize: '14px',
          fill: '#ddd',
          fixedWidth: 500,
          align: 'left',
        },
      ).setOrigin(0, 0.5);
      this.detailGroup.add(line);

      rowBg.on('pointerdown', () => {
        this.toggleItemSelection(entry, location, null);
        this.openStackDetails(stack, location, currentPage);
      });
    });

    if (totalPages > 1) {
      const pageY = 210 + maxLines * 34;
      const prevBtn = this.add.text(320, pageY, '← PREV', {
        fontSize: '12px',
        fill: currentPage > 0 ? '#ddd' : '#666',
        backgroundColor: '#222',
        padding: { x: 6, y: 3 },
      }).setOrigin(0.5).setInteractive();
      this.detailGroup.add(prevBtn);
      if (currentPage > 0) {
        prevBtn.on('pointerdown', () => {
          this.openStackDetails(stack, location, currentPage - 1);
        });
      }

      const pageLabel = this.add.text(
        400,
        pageY,
        `${currentPage + 1}/${totalPages}`,
        {
          fontSize: '12px',
          fill: '#999',
        },
      ).setOrigin(0.5);
      this.detailGroup.add(pageLabel);

      const nextBtn = this.add.text(480, pageY, 'NEXT →', {
        fontSize: '12px',
        fill: currentPage < totalPages - 1 ? '#ddd' : '#666',
        backgroundColor: '#222',
        padding: { x: 6, y: 3 },
      }).setOrigin(0.5).setInteractive();
      this.detailGroup.add(nextBtn);
      if (currentPage < totalPages - 1) {
        nextBtn.on('pointerdown', () => {
          this.openStackDetails(stack, location, currentPage + 1);
        });
      }
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

  getSellValue(item) {
    if (!item) return 1;

    if (globalThis.GameItem?.getSellValueFor) {
      return globalThis.GameItem.getSellValueFor(
        item.tier || 1,
        item.upgradeLevel || 0,
      );
    }

    return Math.max(1, Number(item.value) || 1);
  }

  getItemStatsPreview(item) {
    if (!item || !item.stats) return 'No stats';

    const parts = [];
    if (item.stats.atkBonus) parts.push(`ATK+${item.stats.atkBonus}`);
    if (item.stats.atkPctBonus) {
      parts.push(`ATK+${Math.floor(item.stats.atkPctBonus * 100)}%`);
    }
    if (item.stats.defBonus) parts.push(`DEF+${item.stats.defBonus}`);
    if (item.stats.hpBonus) parts.push(`HP+${item.stats.hpBonus}`);
    if (item.stats.defPctBonus) {
      parts.push(`DEF+${Math.floor(item.stats.defPctBonus * 100)}%`);
    }
    if (item.stats.hpPctBonus) {
      parts.push(`HP+${Math.floor(item.stats.hpPctBonus * 100)}%`);
    }
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
    if (typeof stats.atkPctBonus === 'number') {
      return `+${Math.floor(stats.atkPctBonus * 100)}%`;
    }
    if (typeof stats.defBonus === 'number') return `+${stats.defBonus}`;
    if (typeof stats.hpBonus === 'number') return `+${stats.hpBonus}`;
    if (typeof stats.defPctBonus === 'number') {
      return `+${Math.floor(stats.defPctBonus * 100)}%`;
    }
    if (typeof stats.hpPctBonus === 'number') {
      return `+${Math.floor(stats.hpPctBonus * 100)}%`;
    }
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

  getDisplayItemName(itemOrName) {
    const rawName = typeof itemOrName === 'string'
      ? itemOrName
      : (itemOrName?.name || 'Unknown');

    return String(rawName)
      .replace(/\s*\(\s*T\d+\s*\)$/i, '')
      .replace(/\s+T\d+$/i, '')
      .replace(/\s+Tier\s*\d+$/i, '')
      .trim();
  }

  selectItem(item, location, index) {
    this.selectedItems = new Set([item]);
    this.selectedItem = item;
    this.selectedLocation = location;
    this.selectedIndex = index;
    this.createBagSection();
    this.createStorageSection();
    this.createActionButtons();
  }

  toggleItemSelection(item, location, index) {
    this.selectedIndex = index;

    if (this.selectedItems.has(item)) {
      this.selectedItems.delete(item);
    } else {
      this.selectedItems.add(item);
      this.selectedItem = item;
      this.selectedLocation = location;
    }

    this.updateSelectionAnchor();
    this.createBagSection();
    this.createStorageSection();
    this.createActionButtons();
  }

  getSelectedItems() {
    const player = this.getPlayerState();
    if (!player) {
      this.selectedItems.clear();
      return [];
    }
    const inventory = player.inventory || [];
    const storage = player.storage || [];
    const valid = [];

    this.selectedItems.forEach((item) => {
      if (inventory.includes(item) || storage.includes(item)) {
        valid.push(item);
      }
    });

    this.selectedItems = new Set(valid);
    return valid;
  }

  updateSelectionAnchor() {
    const selected = this.getSelectedItems();
    if (selected.length === 0) {
      this.selectedItem = null;
      this.selectedLocation = null;
      this.selectedIndex = null;
      return;
    }

    if (this.selectedItem && this.selectedItems.has(this.selectedItem)) {
      this.selectedLocation = this.getItemLocation(this.selectedItem);
      return;
    }

    this.selectedItem = selected[0];
    this.selectedLocation = this.getItemLocation(this.selectedItem);
  }

  getItemLocation(item) {
    const player = this.getPlayerState();
    if (!player) {
      return null;
    }
    if ((player.inventory || []).includes(item)) return 'bag';
    if ((player.storage || []).includes(item)) return 'storage';
    return null;
  }

  selectAllInLocation(location) {
    const player = this.getPlayerState();
    if (!player) return;
    const source = location === 'bag'
      ? (player.inventory || [])
      : (player.storage || []);
    source.forEach((item) => this.selectedItems.add(item));
    this.updateSelectionAnchor();
    this.createBagSection();
    this.createStorageSection();
    this.createActionButtons();
  }

  clearSelectionInLocation(location) {
    const player = this.getPlayerState();
    if (!player) return;
    const source = location === 'bag'
      ? (player.inventory || [])
      : (player.storage || []);
    source.forEach((item) => this.selectedItems.delete(item));
    this.updateSelectionAnchor();
    this.createBagSection();
    this.createStorageSection();
    this.createActionButtons();
  }

  clearSelection() {
    this.selectedItems.clear();
    this.selectedItem = null;
    this.selectedLocation = null;
    this.selectedIndex = null;
    this.createBagSection();
    this.createStorageSection();
    this.createActionButtons();
  }

  selectItemsInStack(items) {
    items.forEach((item) => this.selectedItems.add(item));
    this.updateSelectionAnchor();
    this.createBagSection();
    this.createStorageSection();
    this.createActionButtons();
  }

  deselectItemsInStack(items) {
    items.forEach((item) => this.selectedItems.delete(item));
    this.updateSelectionAnchor();
    this.createBagSection();
    this.createStorageSection();
    this.createActionButtons();
  }

  moveSelectedItems() {
    const selectedItems = this.getSelectedItems();
    if (selectedItems.length === 0) return;
    this.closeStackDetails();

    const player = this.getPlayerState();
    if (!player) return;
    if (!player.inventory) player.inventory = [];
    if (!player.storage) player.storage = [];

    const selectedFromBag = selectedItems.filter((item) =>
      player.inventory.includes(item)
    );
    const selectedFromStorage = selectedItems.filter((item) =>
      player.storage.includes(item)
    );

    selectedFromBag.forEach((item) => {
      if (
        this.canAddToContainer(player.storage, this.getStorageCapacity(), item)
      ) {
        player.storage.push(item);
        player.inventory = player.inventory.filter((i) => i !== item);
      }
    });

    selectedFromStorage.forEach((item) => {
      if (
        this.canAddToContainer(player.inventory, this.getBagCapacity(), item)
      ) {
        player.inventory.push(item);
        player.storage = player.storage.filter((i) => i !== item);
      }
    });

    this.clearSelection();
  }

  sellSelectedItems() {
    const selectedItems = this.getSelectedItems();
    if (selectedItems.length === 0) return;
    this.closeStackDetails();

    const player = this.getPlayerState();
    if (!player) return;
    const value = selectedItems.reduce(
      (sum, item) => sum + this.getSellValue(item),
      0,
    );

    // Add gold
    if (typeof player.addGold === 'function') {
      player.addGold(value);
    } else {
      player.gold = (player.gold || 0) + value;
    }

    // Remove item
    player.inventory = (player.inventory || []).filter((i) =>
      !this.selectedItems.has(i)
    );
    player.storage = (player.storage || []).filter((i) =>
      !this.selectedItems.has(i)
    );

    this.refreshGoldDisplay();
    this.clearSelection();
  }

  refreshGoldDisplay() {
    if (!this.goldText) return;
    const player = this.getPlayerState();
    const gold = Math.max(0, Number(player?.gold) || 0);
    this.goldText.setText(`💰 ${gold}`);
  }

  upgradeBagSlots() {
    const player = this.getPlayerState();
    if (!player) return;
    const cost = 50;
    if ((player.gold || 0) < cost) return;
    player.gold -= cost;
    player.bagSlots = this.getBagCapacity() + 5;
    player.maxInventory = player.bagSlots;
    this.scene.restart();
  }

  upgradeStorageSlots() {
    const player = this.getPlayerState();
    if (!player) return;
    const cost = 100;
    if ((player.gold || 0) < cost) return;
    player.gold -= cost;
    player.storageSlots = this.getStorageCapacity() + 10;
    this.scene.restart();
  }

  getPlayerState() {
    return globalThis.gameState?.player || null;
  }
}

globalThis.Inventory = Inventory;
