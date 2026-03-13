// Lootbox.js - Lootbox prefab
class Lootbox extends Phaser.GameObjects.Sprite {
  constructor(scene, x, y, boxData) {
    super(scene, x, y, 'lootbox');

    this.boxData = boxData || {
      box_tier: 1,
      size: 1,
      luck: 0,
      total_items: 3,
      loot: { 'Tier 1': 3 },
    };

    this.opened = false;

    // Add to scene
    scene.add.existing(this);
    this.setInteractive();

    // Hover effect
    this.on('pointerover', () => {
      if (!this.opened) this.setTint(0xffff00);
    });

    this.on('pointerout', () => {
      if (!this.opened) this.clearTint();
    });

    // Click to open
    this.on('pointerdown', () => {
      if (!this.opened) this.open();
    });
  }

  open() {
    this.opened = true;
    this.setTint(0x888888);

    // Generate items from loot data
    const items = this.generateItems();

    // Add to player inventory
    items.forEach((item) => {
      globalThis.gameState.player.addItem(item);
    });

    // Show what you got
    this.showLootResults(items);

    // Emit event
    this.emit('lootboxOpened', items);
  }

  generateItems() {
    const items = [];

    for (const [tierStr, count] of Object.entries(this.boxData.loot)) {
      const tier = parseInt(tierStr.split(' ')[1]);

      for (let i = 0; i < count; i++) {
        // Randomly choose item type
        const rand = Math.random();
        let item;

        if (rand < 0.2) {
          item = new Weapon(this.scene, 0, 0, tier);
        } else if (rand < 0.4) {
          item = new Armor(this.scene, 0, 0, tier);
        } else if (rand < 0.6) {
          item = new Accessory(this.scene, 0, 0, tier);
        } else if (rand < 0.8) {
          item = { itemData: GameItem.generateCraftingMaterial(tier) };
        } else {
          item = { itemData: GameItem.generateSellingMaterial(tier) };
        }

        items.push(item.itemData);
      }
    }

    return items;
  }

  showLootResults(items) {
    // Create floating text for each item
    items.forEach((item, index) => {
      const yOffset = index * 20;
      const text = this.scene.add.text(
        this.x,
        this.y - 30 - yOffset,
        `+ ${item.name}`,
        {
          fontSize: '14px',
          fill: '#0f0',
          stroke: '#000',
          strokeThickness: 2,
        },
      ).setOrigin(0.5);

      // Fade out and float up
      this.scene.tweens.add({
        targets: text,
        y: text.y - 50,
        alpha: 0,
        duration: 2000,
        onComplete: () => text.destroy(),
      });
    });
  }
}

globalThis.Lootbox = Lootbox;
