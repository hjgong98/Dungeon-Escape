// Lootbox.js - Lootbox prefab
class Lootbox extends Phaser.GameObjects.Rectangle {
  constructor(scene, x, y, boxData) {
    super(scene, x, y, 16, 16, 0xffeb3b);
    this.setStrokeStyle(2, 0xb38f00);

    this.boxData = boxData || {
      box_tier: 1,
      size: 1,
      luck: 0,
      total_items: 3,
      loot: { 'Tier 1': 3 },
    };

    this.opened = false;

    scene.add.existing(this);
  }

  open() {
    if (this.opened) return;
    this.opened = true;
    this.setVisible(false);

    if (this.boxData.isTrap) {
      this.showTrapMessage();
      this.emit('lootboxOpened', []);
      return;
    }

    const items = this.generateItems();

    items.forEach((item) => {
      globalThis.gameState.player.addItem(item);
    });

    this.showLootResults(items);
    this.emit('lootboxOpened', items);
  }

  showTrapMessage() {
    const text = this.scene.add.text(
      this.x,
      this.y - 30,
      'trap chest opened!\nget out now lol',
      {
        fontSize: '16px',
        fill: '#ff4444',
        stroke: '#000',
        strokeThickness: 3,
        align: 'center',
      },
    ).setOrigin(0.5).setDepth(1100);

    this.scene.tweens.add({
      targets: text,
      y: text.y - 60,
      alpha: 0,
      duration: 3000,
      onComplete: () => text.destroy(),
    });
  }

  generateItems() {
    const items = [];

    for (const [tierStr, count] of Object.entries(this.boxData.loot)) {
      const tier = parseInt(tierStr.split(' ')[1]);
      if (isNaN(tier)) continue;

      for (let i = 0; i < count; i++) {
        const rand = Math.random();
        let itemData;

        if (rand < 0.2) {
          itemData = Weapon.generate(tier);
        } else if (rand < 0.4) {
          itemData = Armor.generate(tier);
        } else if (rand < 0.6) {
          itemData = Accessory.generate(tier);
        } else if (rand < 0.8) {
          itemData = GameItem.generateCraftingMaterial(tier);
        } else {
          itemData = GameItem.generateSellingMaterial(tier);
        }

        items.push(itemData);
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
