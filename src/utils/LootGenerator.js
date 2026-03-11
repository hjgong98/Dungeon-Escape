// LootGenerator.js - Pure JavaScript version of the Python loot tool
class LootGenerator {
  constructor() {
    console.log('LootGenerator initialized');
  }

  // Generate lootboxes based on parameters
  generate(rarity, size, luck, count) {
    const output_batch = [];
    
    for (let i = 0; i < count; i++) {
      const items_dict = {};
      const box_tier = rarity;
      
      // Initialize tier counts
      items_dict[box_tier + 1] = 0;
      items_dict[box_tier] = 0;
      if (box_tier - 1 > 0) items_dict[box_tier - 1] = 0;
      if (box_tier - 2 > 0) items_dict[box_tier - 2] = 0;

      const min_items = 2 * size;
      const max_items = Math.floor(2 * size + 2 * Math.sqrt(size));
      const total_items = Math.floor(Math.random() * (max_items - min_items + 1)) + min_items;
      const guaranteed_num = size;

      if (box_tier === 1) {
        items_dict[box_tier] += guaranteed_num;
        let num_items = guaranteed_num;

        const tiers = [box_tier + 1, box_tier];
        const weights = [25 + 75 * luck, 75 - 75 * luck];

        while (num_items < total_items) {
          const chosen = this.weightedRandom(tiers, weights);
          items_dict[chosen] += 1;
          num_items++;
        }
      } 
      else if (box_tier === 2) {
        items_dict[box_tier] += guaranteed_num;
        let num_items = guaranteed_num;

        const tiers = [box_tier + 1, box_tier, box_tier - 1];
        const weights = [10 + 90 * luck, 40 - 40 * luck, 50 - 50 * luck];

        while (num_items < total_items) {
          const chosen = this.weightedRandom(tiers, weights);
          items_dict[chosen] += 1;
          num_items++;
        }
      } 
      else {
        items_dict[box_tier] += guaranteed_num;
        let num_items = guaranteed_num;

        const tiers = [box_tier + 1, box_tier, box_tier - 1, box_tier - 2];
        const weights = [5 + 95 * luck, 40 - 40 * luck, 45 - 45 * luck, 10 - 10 * luck];

        while (num_items < total_items) {
          const chosen = this.weightedRandom(tiers, weights);
          items_dict[chosen] += 1;
          num_items++;
        }
      }

      const output = {
        box_tier: rarity,
        size: size,
        luck: luck,
        total_items: total_items,
        loot: {}
      };

      for (const [key, value] of Object.entries(items_dict)) {
        if (value > 0) {
          output.loot[`Tier ${key}`] = value;
        }
      }
      
      output_batch.push(output);
    }

    return output_batch;
  }

  weightedRandom(items, weights) {
    const total = weights.reduce((a, b) => a + b, 0);
    let rand = Math.random() * total;
    
    for (let i = 0; i < items.length; i++) {
      if (rand < weights[i]) return items[i];
      rand -= weights[i];
    }
    return items[items.length - 1];
  }

  // Generate loot for a specific save
  generateForSave(saveId) {
    let params;
    
    const saveParams = {
      'save_1': { rarity: 1, size: 2, luck: 0.2, count: 5 },
      'save_2': { rarity: 2, size: 3, luck: 0, count: 8 },
      'save_3': { rarity: 3, size: 4, luck: -0.1, count: 10 }
    };
    
    params = saveParams[saveId] || saveParams['save_2'];
    console.log('Generating loot with params:', params);
    return this.generate(params.rarity, params.size, params.luck, params.count);
  }
}

// Make sure it's available globally
globalThis.lootGenerator = new LootGenerator();
console.log('LootGenerator attached to global');
