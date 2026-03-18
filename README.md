# Dungeon-Escape

This game is a roguelike in which the player explores a procedurally generated dungeon, searches for chests, gathers resources, and attempts to escape alive. The core gameplay loop follows the structure: Explore -> Loot -> Craft -> Risk -> Escape.

# Final Project Check-in 2

added the procedural maze generator for the dungeon as well as a way

to do list:

- add item/chest/monster placements
- figure out a monster movement pattern (moves around a certain area around their spawn spot, doesnt leave the designated room its in until trap chest is triggered)
- update inventory and upgrades sections
- add more backgound images

risks:

- since this is a dungeon, we'll need to figure out a way to limit how much of the generated dungeon maze that the player can see
- need to figure out the combat ai
- leveling up ai and how that affects the dungeon difficulty levels

# Final Project Submission

Short description of the procedural systems used in the game
The dungeon is generated using a couple things, first it generates 1 - 4 floors for the dungeon, and then for each floor it'll generate 2 - 4 rooms. the floors are connected by staircases, and the entrance is at a random spot in the first floor of the maze, and the exit is a random spot at the bottom of the maze (or a different room on the same floor if there's only one floor). 
Each room then has 1 to 2 mini chambers placed inside of it, and then the code uses a recursive backtracking algorithm to make a maze within the space leftover. There's a pathfinding algorithm to make sure that the maze inside connects to the mini rooms and to the paths between the rooms. The paths also have at least one dead end path thats to make exploration more interesting. 
There are one monster assigned to each room plus an extra one placed randomly on that floor. The lootboxes are placed using perlin noise, and then it generates a rarity tier for the box using weighted probabilites, which then determins which json file to use to generate a list of items for its contents.

Explanation of the Midterm tool(s) used and how they contributed to development
-  used tristen chen's lootbox generator (https://github.com/TristanChenUCSC/Lotbox-Generator) for the lootbox json files. we had to convert his file to js. Basically, whenever the new game button is clicked, it generates a new set of json files for each rarity tier of lootboxes.
-  inho yoo item placement for chests (perlin noise)
-  hannah gong's maze generation logic for making paths in the rooms - modified because i wanted to add the chambers to make the maze more interesting but the general idea is still the same.

Team member contribution summary (if a team)
hannah - made the base structural code and the dungeon generating logic
inho - added sprites, sfx, dungeon hud

Credits including external content and midterm tools. This can be as a doc or a credits menu in game.
-  theres a credits page in the game about where all the sprites and background pngs came from. 
-  used ai to help with the ui designs (centering text and buttons and stuff) as well as checking the code for places that could crash during a playthrough
-  also used ai to fix the math for hp gain per level as well calculations for the player base stats combined with the gear stats