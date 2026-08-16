"use strict";
/* ============ Isle of Bells — DATA ============ */
var MGX=24, MGY=18, TILE=48;
var CW=MGX*TILE, CH=MGY*TILE;
var SAVE_KEY="isleOfBells_v1";
var BAG_MAX=20;
var MIN_PER_REAL_SEC=3;

var AVATARS=["🐱","🐶","🐰","🐻","🐼","🦊"];
var AV_COLORS=["#f2b76e","#a9896a","#cfd6df","#8a6a4a","#e8e8e8","#ff9d4d"];
var SHIRTS=["🥋","🧣","🎽","🦺","👘","🧥"];

var FISH=[
 {id:"sard",e:"🐟",  name:"Sardine",    price:40,  r:1},
 {id:"tang",e:"🐠",  name:"Blue Tang",  price:90,  r:1},
 {id:"herm",e:"🦀",  name:"Hermit Crab",price:60,  r:1},
 {id:"puff",e:"🐡",  name:"Pufferfish", price:140, r:2},
 {id:"shrp",e:"🦐",  name:"Sea Shrimp", price:110, r:2},
 {id:"oct", e:"🐙",  name:"Octopus",    price:180, r:2},
 {id:"sqd", e:"🦑",  name:"Squid",      price:320, r:3},
 {id:"shrk",e:"🦈",  name:"Hammerhead", price:700, r:3},
 {id:"dolp",e:"🐬",  name:"Dolphin",    price:1500,r:4}
];
var BUGS=[
 {id:"catr",e:"🐛", name:"Caterpillar",price:20,  r:1},
 {id:"snail",e:"🐌",name:"Snail",      price:40,  r:1},
 {id:"beet",e:"🪲", name:"Beetle",     price:90,  r:1},
 {id:"bfly",e:"🦋", name:"Butterfly",  price:120, r:2},
 {id:"lady",e:"🐞", name:"Ladybug",    price:100, r:2},
 {id:"cric",e:"🦗", name:"Cricket",    price:130, r:2},
 {id:"bee", e:"🐝", name:"Honey Bee",  price:240, r:3},
 {id:"fly", e:"🪰", name:"Lantern Fly",price:400, r:3},
 {id:"moth",e:"🪱", name:"Moon Moth",  price:650, r:4}
];
var SHELLS=[
 {id:"shell",e:"🐚",name:"Cowrie Shell",price:50,  r:1},
 {id:"star", e:"⭐", name:"Starfish",   price:220, r:2},
 {id:"coral",e:"🪸", name:"Sea Fan",    price:380, r:3}
];
var FOSSILS=[
 {id:"bone", e:"🦴", name:"Old Bone",     price:300, r:1},
 {id:"wood", e:"🌳", name:"Petrified Wood",price:420,r:2},
 {id:"rex",  e:"🦕", name:"Rex Tail",     price:900, r:3},
 {id:"spin", e:"🦖", name:"Spino Skull",  price:1500,r:4}
];
var FRUITS={
 apple:{e:"🍎",name:"Apple", price:100},
 orange:{e:"🍊",name:"Orange",price:130},
 peach:{e:"🍑",name:"Peach", price:170},
 coco:{e:"🥥", name:"Coconut",price:250}
};
var CROPS=[
 {id:"carrot",e:"🥕",name:"Carrot", seed:10, grow:25,  value:38,  s1:"🌱",s2:"🌿"},
 {id:"tomato",e:"🍅",name:"Tomato", seed:28, grow:55,  value:85,  s1:"🌱",s2:"🍅"},
 {id:"pumpkin",e:"🎃",name:"Pumpkin",seed:70, grow:110, value:215, s1:"🌱",s2:"🌿"}
];
var FURN=[
 {id:"mush",e:"🍄",name:"Toadstool",   price:150, vibe:2},
 {id:"lan", e:"🏮",name:"Paper Lantern",price:180, vibe:2},
 {id:"pot", e:"🪴",name:"Potted Plant", price:220, vibe:3},
 {id:"bench",e:"🪑",name:"Garden Bench",price:260, vibe:3},
 {id:"tent",e:"⛺", name:"Tiny Tent",   price:320, vibe:4},
 {id:"bear",e:"🧸",name:"Big Bear",     price:330, vibe:4},
 {id:"tiki",e:"🗿", name:"Tiki Totem",  price:420, vibe:5},
 {id:"parasol",e:"⛱️",name:"Beach Parasol",price:450,vibe:5},
 {id:"party",e:"🪩",name:"Disco Ball",  price:950, vibe:9},
 {id:"fountain",e:"⛲",name:"Fountain",  price:1200,vibe:12}
];
var TOOLS=[
 {id:"net",e:"🪡",name:"Bug Net",     price:150},
 {id:"rod",e:"🎣",name:"Fishing Rod", price:180},
 {id:"shovel",e:"⛏️",name:"Shovel",   price:100},
 {id:"can",e:"🚿",name:"Watering Can",price:80},
 {id:"axe",e:"🪓",name:"Woodcutter Axe",price:200},
 {id:"sling",e:"🪃",name:"Slingshot",  price:320}
];
var VILLAGERS=[
 {id:"maple",name:"Maple",e:"🐻",wander:[[6,5],[7,5],[6,6]]},
 {id:"toby", name:"Toby", e:"🐰",wander:[[14,4],[15,4],[14,5]]},
 {id:"dottie",name:"Dottie",e:"🦆",wander:[[9,5],[10,5],[9,6]]},
 {id:"pig", name:"Piglet",e:"🐷",wander:[[16,5],[17,5],[16,6]]}
];
var V_CHAT=["Hello there!","Gorgeous day!","Bells well spent, friend!","The island loves you!","Cozy-cozy-cozy!","Have you seen the museum lately?","Life's better in flowy clothes.","A snack, then a nap, then a snack."];
var V_THANKS=["You're the best islander ever!","Hooray! Simply lovely!","Yesss! Thank you, thank you!","You made my whole week!"];

var QUEST_POOL=[
 {t:"bugs",   text:"Catch {n} bugs! Bring the buzz back.",   goal:3, bells:300, furn:"pot"},
 {t:"fish",   text:"Reel in {n} fish. Any fish. Big fish happy.",goal:2, bells:250, furn:"lan"},
 {t:"fruit",  text:"Bring me {n} fruit. I'm parched!" ,        goal:1, bells:200, furn:null},
 {t:"harvest",text:"Harvest {n} garden crops!",               goal:5, bells:350, furn:"bear"},
 {t:"dig",    text:"Dig up {n} fossils. Old friends!",        goal:2, bells:400, furn:"tiki"},
 {t:"shake",  text:"Shake {n} trees — gently, please!",       goal:3, bells:150, furn:null},
 {t:"furn",   text:"Decorate! Place {n} pieces of furniture.",goal:3, bells:250, furn:"party"}
];

/* terrain: W ocean · ~ water · s sand · _ path · . grass */
var MAP_ROWS=[
"WWWWWWWWWWWWWWWWWWWWWWWW",
"WWWWWWWWWWWWWWWWWWWWWWWW",
"WWssssssssssssssssssssWW",
"WW....................WW",
"WW....................WW",
"WW..........~~........WW",
"WW..........~~........WW",
"WW..........~~........WW",
"WW..........~~........WW",
"WW..........~~........WW",
"WW..........~~........WW",
"WW..........~~........WW",
"WW..........~~........WW",
"WW..........~~........WW",
"WW..........~~........WW",
"WW..........~~........WW",
"WW..........~~........WW",
"WWWWWWWWWWWWWWWWWWWWWWWW"
];
var PLAN={
 home:[3,3], shop:[7,3], museum:[12,3],
 trees:[[3,11,"apple"],[6,8,"apple"],[7,13,"apple"],[16,6,"apple"],[20,7,"apple"],
        [19,4,"orange"],[15,10,"orange"],[8,16,"orange"],[18,13,"orange"],[6,15,"orange"],
        [11,3,"peach"],[4,15,"peach"],[20,11,"peach"],[14,14,"peach"],
        [21,2,"coco"],[17,2,"coco"],[3,2,"coco"]],
 rocks:[[4,12],[15,7],[9,10],[19,14],[12,5],[16,9]],
 flowers:[[5,10],[5,4],[14,4],[20,5],[7,12],[10,15],[18,2],[6,7],[13,10],[17,13]],
 soil:[[4,5],[5,5],[6,5],[4,6],[5,6],[6,6],[4,7],[5,7],[6,7],
       [16,14],[17,14],[18,14],[16,15],[17,15],[18,15]],
 pond:[[11,16],[11,17],[11,18],[12,16],[12,17],[12,18],[13,16],[13,17],[13,18]],
 bridge:[[9,11],[9,12]],
 paths:[[10,2],[10,3],[10,4],[10,5],[10,6],[10,7],[10,8],[10,9],[10,10],[10,11],[10,12],[10,13],[10,14],[10,15],[10,16],
        [3,4],[4,4],[5,4],[6,4],[7,4],[8,4],[9,4],[11,4],[12,4],[13,4]]
};
var FURN_BY_ID={}; FURN.forEach(function(f){FURN_BY_ID[f.id]=f;});
var TOOL_BY_ID={}; TOOLS.forEach(function(t){TOOL_BY_ID[t.id]=t;});
var CROP_BY_ID={}; CROPS.forEach(function(c){CROP_BY_ID[c.id]=c;});