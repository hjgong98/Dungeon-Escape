let config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: "arcade",
        arcade: {
            // set to true when testing collisions
            debug: false
        }
    },
    zoom: 2,
    scene: [
        Menu,
        Instructions,
        Play,
        Credits,
        Saves,
    ]
} 

let game = new Phaser.Game(config)

// ui sizing constants
let borderUISize = game.config.height / 15
let borderPadding = borderUISize / 3

// Game state
let gameSate = {
    player: {
        level: 1,
        hp: 100,
        maxHP: 100,
        atk: 10,
        exp: 0,
        inventory: [],
        armor: null
    },
    settings: {
        sound: true,
        music: true
    }
}