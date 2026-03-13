import random
import json
import os

# PARAMETERS:
# Rarity - int representing the tier of the lootbox. Has to be atleast 1
# Size - int that determines total loot. Has to be atleast 1
# Luck - Value between 0 and 1 that skews the drop rate distribution towards higher tiers. 0 is default, 1 is max luck.
# Count - Number of lootboxes to generate (for batch generation)
def generate(rarity, size, luck, count):
    output_batch = []
    for i in range(count):
        items_dict = {}
        box_tier = rarity
        items_dict[box_tier + 1] = 0
        items_dict[box_tier] = 0
        if (box_tier - 1 > 0):
            items_dict[box_tier - 1] = 0
        if (box_tier - 2 > 0):
            items_dict[box_tier - 2] = 0

        min_items = 2 * size
        max_items = int(2 * size + 2 * (size ** 0.5))
        total_items = random.randint(min_items, max_items)
        guaranteed_num_of_matching_rarity = size

        # Tiers 1 and 2 are unique cases
        if box_tier == 1:
            items_dict[box_tier] += guaranteed_num_of_matching_rarity
            num_items = guaranteed_num_of_matching_rarity

            tiers = [box_tier + 1, box_tier]
            weights = [25 + 75 * luck, 75 - 75 * luck]

            while num_items < total_items:
                chosen_tier = random.choices(tiers, weights=weights, k=1)[0]
                items_dict[chosen_tier] += 1
                num_items += 1


        elif box_tier == 2:
            items_dict[box_tier] += guaranteed_num_of_matching_rarity
            num_items = guaranteed_num_of_matching_rarity

            tiers = [box_tier + 1, box_tier, box_tier - 1]
            weights = [10 + 90 * luck, 40 - 40 * luck, 50 - 50 * luck]

            while num_items < total_items:
                chosen_tier = random.choices(tiers, weights=weights, k=1)[0]
                items_dict[chosen_tier] += 1
                num_items += 1

        else:
            items_dict[box_tier] += guaranteed_num_of_matching_rarity
            num_items = guaranteed_num_of_matching_rarity

            tiers = [box_tier + 1, box_tier, box_tier - 1, box_tier - 2]
            weights = [5 + 95 * luck, 40 - 40 * luck, 45 - 45 * luck, 10 - 10 * luck]

            while num_items < total_items:
                chosen_tier = random.choices(tiers, weights=weights, k=1)[0]
                items_dict[chosen_tier] += 1
                num_items += 1


        output = {
            "box_tier": rarity,
            "size": size,
            "luck": luck,
            "total_items": total_items,
            "loot": {}
        }

        for key, value in items_dict.items():
            if value > 0:
                output["loot"][f"Tier {key}"] = value
        
        output_batch.append(output)

    return output_batch

# --- USER INPUT --- #
YOUR_RARITY = 1 # Tier of the lootbox, can be any number that's 1 or higher
YOUR_SIZE = 1 # Size of the lootbox, can be any number that's 1 or higher
YOUR_LUCK = 0 # Luck value between 0 and 1, where 0 is default and 1 is max luck
BATCH_SIZE = 1 # Number of lootboxes to generate (for batch generation)
# --- END OF USER INPUT --- #

data = generate(YOUR_RARITY, YOUR_SIZE, YOUR_LUCK, BATCH_SIZE)

with open("lootbox_output.json", "w") as f:
    json.dump(data, f, indent=4)


def generate_all_rarity_files(output_dir="saves/rarities"):
    os.makedirs(output_dir, exist_ok=True)

    rarity_profiles = {
        1: {"size": 2, "luck": 0.2, "count": 8},
        2: {"size": 3, "luck": 0.15, "count": 8},
        3: {"size": 4, "luck": 0.1, "count": 7},
        4: {"size": 5, "luck": 0.05, "count": 6},
        5: {"size": 6, "luck": 0, "count": 5},
        6: {"size": 7, "luck": -0.05, "count": 4},
    }

    for rarity in range(1, 7):
        profile = rarity_profiles[rarity]
        rarity_data = generate(
            rarity,
            profile["size"],
            profile["luck"],
            profile["count"],
        )
        filepath = os.path.join(output_dir, f"rarity_{rarity}.json")
        with open(filepath, "w") as f:
            json.dump(rarity_data, f, indent=4)


generate_all_rarity_files()