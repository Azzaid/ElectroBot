const {mouse, screen, straightTo, centerOf, keyboard, Key, Region, imageResource, Point} = require("@nut-tree/nut-js");
const {screen: electronScreen, desktopCapturer } = require('electron')
const repeatPromiseUntilResolved = require('repeat-promise-until-resolved');
const { createWorker } = require('tesseract.js');
const excelWriter = require('excel4node');
const fs = require('fs')
require("@nut-tree/template-matcher");
const getExactCornerCoords = require("./utils/getExactCornerCoords");
const coordHelper = require("./utils/relativeCoordsHelper");
const isSameColourDot = require("./utils/isSameColourDot");
const { MongoClient, ServerApiVersion } = require('mongodb');
const searchForWork = require("./utils/searchForWork");
const getSignature = require("./utils/getSignature");
const { performance } = require('perf_hooks');

const initialStats = {
    totalVotes: 0,
    twinsProcessed: 0,
    white:0,
    black:0,
    leftBlack:0,
    rightBlack:0,
    leftWhite: 0,
    rightWhite: 0,
    leftStoredBlack:0,
    rightStoredBlack:0,
    leftStoredWhite: 0,
    rightStoredWhite: 0,
    leftCrossStoredBlack:0,
    rightCrossStoredBlack:0,
    leftCrossStoredWhite: 0,
    rightCrossStoredWhite: 0,
}

class whiteBlackListSeparator {
    constructor(window) {
        this.electronWindow = window;
        screen.config.resourceDirectory = `${__dirname}/temporaryAssets`;
        screen.config.autoHighlight = true;
        screen.config.highlightDurationMs = 1000;
        mouse.config.mouseSpeed = 2000;
        keyboard.config.autoDelayMs = 500;

        this.basePause = 500;

        this.consoleNodeClear = () => {
            this.electronWindow.webContents.send("log", {type: "clear"});
        }

        this.consoleNodeLog = (text) => {
            this.electronWindow.webContents.send("log", {type: "log", payload: text});
        }

        this.consoleNodeImage = (imageUrl) => {
            this.electronWindow.webContents.send("log", {type: "addImage", payload: imageUrl});
        }

        this.consoleNodeStats = (statObj) => {
            this.electronWindow.webContents.send("log", {type: "updateTotals", payload: statObj});
        }

        const uri = "mongodb+srv://johanasazzaid:UJdfaaCS5NjAPKGB@tpcwhiteblacklist.fsgf4va.mongodb.net/?retryWrites=true&w=majority&appName=TPCWhiteBlackList";
        this.mongoClient = new MongoClient(uri, {
            serverApi: {
                version: ServerApiVersion.v1,
            }
        });
        this.collectionName = "Release collection 4";

        this.autonomousMode = false;
        this.testMode = false;
        this.build = false;

        this.borderColourPerEmulator = {
            "Nox": {R:13, G:16, B:48},
            "LDPlayer": {top: {R:22, G:23, B:31}, left: {R:32, G:32, B:58}}
        };
        this.mediaSourceNamePerEmulator = {
            "Nox": "NoxPlayer",
            "LDPlayer": "LDPlayer"
        }
        this.selectedEmulator = "Nox";

        //current process state
        this.isRolling = false;
        this.stopFlagSet = false;
        this.logFolder = screen.config.resourceDirectory;
        this.currentAccountIndex= 0;
        this.currentCharacterIndex= 0;
        this.needToChangeAccount = false;
        this.stats = {...initialStats};
        this.times = {};

        this.zeroCoords = {x: 0, y: 0};

        this.leftTopCornerOfWorkPreview = {x: 154, y: 201};
        this.bottomRightCornerOfWorkPreview = {x: 406, y: 869}

        this.topLefCornerOfLeftWorkVote = {x:-5, y: 119};
        this.bottomRightCornerOfLeftWorkVote = {x: 266, y: 840};
        this.topLefCornerOfRightWorkVote = {x: 273, y: 119};
        this.bottomRightCornerOfRightWorkVote = {x:546, y: 840};

        this.timerStore= {};

        this.accountsForVote = [];

        this.userDecisionMade = false;
        this.userDecision = {};
        this.skipsAmountLeft = 30;
        this.votesAmountLeft = 30;

        this.screensList = {
            firstLoginScreen: [
                {position: {x: 35, y: 84}, color: {R:247, G:240, B:223}},
                {position: {x: 45, y: 166}, color: {R:247, G:240, B:223}},
                {position: {x: 479, y: 63}, color: {R:255, G:255, B:255}},
                {position: {x: 332, y: 724}, color: {R:247, G:240, B:223}},
                {position: {x: 348, y: 724}, color: {R:247, G:240, B:223}},
            ],
            firstLoginScreenWithOverlay: [
                {position: {x: 45, y: 150}, color: {R:45, G:43, B:40}},
                {position: {x: 41, y: 66}, color: {R:45, G:43, B:40}},
                {position: {x: 477, y: 62}, color: {R:47, G:47, B:47}},
                {position: {x: 333, y: 724}, color: {R:45, G:43, B:40}},
                {position: {x: 349, y: 722}, color: {R:45, G:43, B:40}},
            ],
            loginWithIggButton: [
                {position: {x: 200, y: 706}, color: {R:247, G:240, B:223}},
                {position: {x: 207, y: 703}, color: {R:247, G:240, B:223}},
                {position: {x: 214, y: 706}, color: {R:247, G:240, B:223}},
                {position: {x: 201, y: 744}, color: {R:247, G:240, B:223}},
                {position: {x: 213, y: 744}, color: {R:247, G:240, B:223}},
                {position: {x: 207, y: 736}, color: {R:247, G:240, B:223}},
                {position: {x: 206, y: 723}, color: {R:247, G:240, B:223}},
            ],
            iggInternalChangeScreen: {
                "Nox": [
                    {position: {x: 259, y: 119}, color: {R: 12, G: 12, B: 12}},
                    {position: {x: 41, y: 283}, color: {R: 255, G: 198, B: 56}},
                    {position: {x: 492, y: 283}, color: {R: 255, G: 198, B: 56}},
                    {position: {x: 268, y: 325}, color: {R: 255, G: 198, B: 56}},
                    {position: {x: 9, y: 411}, color: {R: 96, G: 96, B: 96}},
                    {position: {x: 309, y: 494}, color: {R: 60, G: 60, B: 60}},
                ],
                "LDPlayer": [
                    {position: {x: 54, y: 299}, color: {R:255, G:198, B:56}},
                    {position: {x: 473, y: 300}, color: {R:255, G:198, B:56}},
                    {position: {x: 272, y: 283}, color: {R:255, G:198, B:56}},
                    {position: {x: 257, y: 250}, color: {R:9, G:9, B:9}},
                ]
            },
            iggInternalLoginScreen: {
                "Nox": [
                {position: {x: 264, y: 107}, color: {R:157, G:157, B:157}},
                {position: {x: 267, y: 164}, color: {R:157, G:157, B:157}},
                {position: {x: 284, y: 230}, color: {R:255, G:198, B:56}},
                {position: {x: 71, y: 230}, color: {R:255, G:198, B:56}},
                ],
                "LDPlayer":[
                    {position: {x: 501, y: 140}, color: {R:157, G:157, B:157}},
                    {position: {x: 501, y: 227}, color: {R:157, G:157, B:157}},
                    {position: {x: 37, y: 323}, color: {R:255, G:198, B:56}},
                    {position: {x: 314, y: 323}, color: {R:255, G:198, B:56}},
                    {position: {x: 437, y: 69}, color: {R:34, G:34, B:34}},
                ],
            },
            iggCharacterSelectScreen: {
                "Nox": [
                {position: {x: 143, y: 257}, color: {R:51, G:51, B:51}},
                {position: {x: 188, y: 267}, color: {R:55, G:55, B:55}},
                {position: {x: 191, y: 383}, color: {R:88, G:88, B:88}},
                {position: {x: 190, y: 498}, color: {R:74, G:74, B:74}},
                {position: {x: 204, y: 555}, color: {R:78, G:78, B:78}},
                {position: {x: 181, y: 555}, color: {R:73, G:73, B:73}},
            ],"LDPlayer":[
                    {position: {x: 267, y: 323}, color: {R:13, G:13, B:13}},
                    {position: {x: 255, y: 234}, color: {R:9, G:9, B:9}},
                    {position: {x: 269, y: 132}, color: {R:9, G:9, B:9}},
                    {position: {x: 12, y: 416}, color: {R:96, G:96, B:96}},
                ],
            },
            doYouWnnaLoginPromptScreen: [
                {position: {x: 64, y: 134}, color: {R:23, G:25, B:34}},
                {position: {x: 447, y: 129}, color: {R:23, G:25, B:34}},
                {position: {x: 85, y: 373}, color: {R:240, G:235, B:231}},
                {position: {x: 425, y: 368}, color: {R:240, G:235, B:231}},
                {position: {x: 413, y: 549}, color: {R:118, G:133, B:188}},
            ],
            policyConfirmationScreen: [
                {position: {x: 72, y: 235}, color: {R:134, G:142, B:176}},
                {position: {x: 442, y: 236}, color: {R:134, G:142, B:176}},
                {position: {x: 51, y: 725}, color: {R:240, G:235, B:231}},
                {position: {x: 469, y: 726}, color: {R:240, G:235, B:231}},
                {position: {x: 268, y: 548}, color: {R:240, G:235, B:231}},
            ],
            profileScreen: [
                {position: {x: 201, y: 661}, color: {R:170, G:147, B:111}},
                {position: {x: 476, y: 579}, color: {R:244, G:238, B:223}},
                {position: {x: 17, y: 52}, color: {R:237, G:240, B:255}},
                {position: {x: 517, y: 633}, color: {R:244, G:239, B:234}},
                {position: {x: 477, y: 579}, color: {R:244, G:238, B:224}},
            ],
            profileSettingsScreen: [
                {position: {x: 172, y: 132}, color: {R:231, G:223, B:211}},
                {position: {x: 322, y: 127}, color: {R:106, G:112, B:140}},
                {position: {x: 180, y: 694}, color: {R:230, G:205, B:163}},
                {position: {x: 457, y: 445}, color: {R:240, G:235, B:231}},
                {position: {x: 420, y: 470}, color: {R:137, G:149, B:201}},
            ],
            accountScreen: [
                {position: {x: 174, y: 129}, color: {R:134, G:142, B:176}},
                {position: {x: 342, y: 347}, color: {R:134, G:143, B:186}},
                {position: {x: 330, y: 712}, color: {R:134, G:143, B:186}},
                {position: {x: 46, y: 186}, color: {R:240, G:235, B:231}},
                {position: {x: 487, y: 372}, color: {R:240, G:235, B:231}},
            ],
            accountChangeMethodSelectScreen:[
                {position: {x: 470, y: 114}, color: {R:134, G:142, B:176}},
                {position: {x: 423, y: 290}, color: {R:134, G:143, B:186}},
                {position: {x: 92, y: 300}, color: {R:227, G:161, B:48}},
                {position: {x: 402, y: 344}, color: {R:134, G:143, B:186}},
                {position: {x: 266, y: 353}, color: {R:245, G:242, B:239}},
            ],
            randomScreenWithGetButton1:[
                {position: {x: 218, y: 833}, color: {R:228, G:187, B:108}},
                {position: {x: 320, y: 834}, color: {R:224, G:175, B:97}},
                {position: {x: 273, y: 819}, color: {R:224, G:174, B:96}},
                {position: {x: 275, y: 849}, color: {R:234, G:200, B:119}},

            ],
            revardOverlayOnRandomScreenWithGetButton1: [
                {position: {x: 6, y: 9}, color: {R:2, G:1, B:1}},
                {position: {x: 529, y: 11}, color: {R:2, G:1, B:1}},
                {position: {x: 310, y: 828}, color: {R:32, G:23, B:9}},
                {position: {x: 17, y: 940}, color: {R:2, G:2, B:2}},
            ],
            playerRoom: [
                {position: {x: 52, y: 301}, color: {R:219, G:134, B:47}},
                {position: {x: 490, y: 230}, color: {R:244, G:232, B:211}},
                {position: {x: 513, y: 602}, color: {R:255, G:255, B:255}},
                {position: {x: 144, y: 34}, color: {R:253, G:129, B:145}},
                {position: {x: 117, y: 211}, color: {R:183, G:148, B:139}},
            ],
            playerRoomWithOverlay: [
                {position: {x: 173, y: 9}, color: {R:22, G:15, B:12}},
                {position: {x: 341, y: 10}, color: {R:19, G:11, B:8}},
                {position: {x: 410, y: 37}, color: {R:22, G:35, B:48}},
                {position: {x: 4, y: 890}, color: {R:40, G:33, B:32}},
                {position: {x: 518, y: 897}, color: {R:37, G:30, B:24}},
            ],
            playerRoomWithOverlay2: [
                {position: {x: 485, y: 33}, color: {R:40, G:35, B:33}},
                {position: {x: 150, y: 31}, color: {R:98, G:60, B:63}},
                {position: {x: 514, y: 851}, color: {R:96, G:92, B:85}},
                {position: {x: 21, y: 855}, color: {R:96, G:92, B:84}},
            ],
            playerRoomWithOverlay3: [
                {position: {x: 283, y: 33}, color: {R:93, G:83, B:55}},
                {position: {x: 405, y: 30}, color: {R:69, G:84, B:90}},
                {position: {x: 256, y: 34}, color: {R:41, G:36, B:34}},
                {position: {x: 528, y: 409}, color: {R:56, G:41, B:36}},
                {position: {x: 11, y: 768}, color: {R:64, G:49, B:37}},
            ],
            uploadDataPromptScreen: [
                {position: {x: 80, y: 352}, color: {R:240, G:235, B:231}},
                {position: {x: 456, y: 353}, color: {R:240, G:235, B:231}},
                {position: {x: 88, y: 603}, color: {R:240, G:235, B:231}},
                {position: {x: 448, y: 603}, color: {R:240, G:235, B:231}},
                {position: {x: 369, y: 546}, color: {R:119, G:135, B:189}},
            ],
            newItemPreviewScreen: [
                {position: {x: 38, y: 775}, color: {R:162, G:153, B:148}},
                {position: {x: 499, y: 766}, color: {R:171, G:165, B:158}},
                {position: {x: 42, y: 909}, color: {R:144, G:135, B:128}},
                {position: {x: 515, y: 913}, color: {R:144, G:134, B:127}},
                {position: {x: 254, y: 927}, color: {R:143, G:134, B:127}},
            ],
            catBubblesScreen: [
                {position: {x: 44, y: 594}, color: {R:240, G:235, B:231}},
                {position: {x: 485, y: 602}, color: {R:240, G:235, B:231}},
                {position: {x: 47, y: 797}, color: {R:240, G:235, B:231}},
                {position: {x: 493, y: 800}, color: {R:240, G:235, B:231}},
                {position: {x: 64, y: 565}, color: {R:203, G:153, B:109}},
            ],
            catBubblesPreviewScreen: [
                {position: {x: 21, y: 18}, color: {R:2, G:1, B:1}},
                {position: {x: 496, y: 24}, color: {R:2, G:1, B:1}},
                {position: {x: 36, y: 219}, color: {R:2, G:2, B:1}},
                {position: {x: 487, y: 212}, color: {R:3, G:2, B:1}},
                {position: {x: 41, y: 893}, color: {R:3, G:2, B:2}},
                {position: {x: 490, y: 891}, color: {R:2, G:2, B:2}},
                {position: {x: 484, y: 795}, color: {R:50, G:48, B:47}},
                {position: {x: 46, y: 793}, color: {R:50, G:48, B:47}},
            ],
            dailyLoginBonusScreen: [
                {position: {x: 6, y: 31}, color: {R:121, G:148, B:198}},
                {position: {x: 21, y: 766}, color: {R:255, G:245, B:236}},
                {position: {x: 511, y: 764}, color: {R:255, G:245, B:236}},
                {position: {x: 5, y: 748}, color: {R:200, G:171, B:136}},
                {position: {x: 530, y: 749}, color: {R:200, G:171, B:136}},
                {position: {x: 19, y: 356}, color: {R:255, G:255, B:255}},
            ],
            velkomeBackLetterScreen: [
                {position: {x: 69, y: 472}, color: {R:50, G:56, B:66}},
                {position: {x: 346, y: 535}, color: {R:47, G:52, B:61}},
                {position: {x: 414, y: 411}, color: {R:249, G:203, B:174}},
                {position: {x: 260, y: 665}, color: {R:106, G:89, B:68}},

            ],
            openWelkomeBackLetterScreen: [
                {position: {x: 89, y: 460}, color: {R:233, G:229, B:216}},
                {position: {x: 352, y: 90}, color: {R:233, G:229, B:216}},
                {position: {x: 261, y: 666}, color: {R:105, G:90, B:67}},
            ],
            itemsFromWelkomeBackLetterScreen: [
                {position: {x: 82, y: 59}, color: {R:49, G:47, B:44}},
                {position: {x: 375, y: 55}, color: {R:50, G:48, B:45}},
                {position: {x: 241, y: 44}, color: {R:50, G:48, B:45}},
            ],
            fantasyPromiseOverlay: [
                {position: {x: 150, y: 620}, color: {R:255, G:235, B:202}},
                {position: {x: 400, y: 619}, color: {R:255, G:235, B:202}},
                {position: {x: 274, y: 334}, color: {R:255, G:240, B:230}},
                {position: {x: 301, y: 168}, color: {R:136, G:255, B:255}},
            ],
            mailScreen: [
                {position: {x: 4, y: 31}, color: {R:121, G:150, B:199}},
                {position: {x: 269, y: 34}, color: {R:97, G:75, B:61}},
                {position: {x: 505, y: 161}, color: {R:239, G:235, B:231}},
                {position: {x: 508, y: 927}, color: {R:247, G:218, B:184}},
                {position: {x: 82, y: 916}, color: {R:209, G:195, B:188}},
                {position: {x: 340, y: 913}, color: {R:229, G:187, B:107}},
            ],
            massagesScreen: [
                {position: {x: 7, y: 33}, color: {R:121, G:146, B:199}},
                {position: {x: 492, y: 100}, color: {R:231, G:223, B:211}},
                {position: {x: 530, y: 150}, color: {R:239, G:235, B:231}},
                {position: {x: 10, y: 150}, color: {R:239, G:235, B:231}},
                {position: {x: 507, y: 927}, color: {R:247, G:218, B:184}},
            ],
            newMessageScreen:[
                {position: {x: 6, y: 35}, color: {R:121, G:149, B:199}},
                {position: {x: 531, y: 176}, color: {R:239, G:235, B:231}},
                {position: {x: 9, y: 174}, color: {R:239, G:235, B:231}},
                {position: {x: 488, y: 110}, color: {R:196, G:190, B:176}},
                {position: {x: 41, y: 799}, color: {R:209, G:203, B:197}},
                {position: {x: 514, y: 813}, color: {R:209, G:203, B:197}},
            ],
            voteScreen:[
                {position: {x: 96, y: 115}, color: {R:254, G:251, B:248}},
                {position: {x: 270, y: 116}, color: {R:254, G:253, B:251}},
                {position: {x: 268, y: 820}, color: {R:248, G:237, B:156}},
                {position: {x: 270, y: 530}, color: {R:254, G:252, B:248}},
                {position: {x: 270, y: 842}, color: {R:252, G:247, B:231}},
            ],
            voteScreenWithOverlay: [
                {position: {x: 35, y: 114}, color: {R:53, G:53, B:53}},
                {position: {x: 448, y: 116}, color: {R:53, G:52, B:52}},
                {position: {x: 164, y: 900}, color: {R:50, G:48, B:46}},
                {position: {x: 406, y: 894}, color: {R:46, G:42, B:38}},
                {position: {x: 269, y: 176}, color: {R:54, G:54, B:52}},
            ],
            preVoteScreen: [
                {position: {x: 124, y: 282}, color: {R:170, G:202, B:222}},
                {position: {x: 416, y: 739}, color: {R:179, G:172, B:205}},
                {position: {x: 136, y: 764}, color: {R:255, G:136, B:153}},
                {position: {x: 492, y: 201}, color: {R:199, G:129, B:129}},
            ],
            /*Norns_selfie: [
                {position: {x: 387, y: 319}, color: {R:5, G:43, B:46}},
                {position: {x: 164, y: 383}, color: {R:2, G:0, B:13}},
                {position: {x: 355, y: 558}, color: {R:1, G:31, B:33}},
                {position: {x: 125, y: 784}, color: {R:2, G:0, B:13}},
                {position: {x: 92, y: 535}, color: {R:109, G:32, B:24}},
            ],
            Alisas_selfie: [
                {position: {x: 287, y: 317}, color: {R:246, G:222, B:246}},
                {position: {x: 267, y: 313}, color: {R:208, G:160, B:189}},
                {position: {x: 307, y: 428}, color: {R:247, G:218, B:246}},
                {position: {x: 312, y: 746}, color: {R:59, G:45, B:62}},
                {position: {x: 230, y: 629}, color: {R:87, G:56, B:123}},
                {position: {x: 323, y: 939}, color: {R:27, G:15, B:29}},
            ],
            Liso_selfie: [
                {position: {x: 167, y: 287}, color: {R:248, G:218, B:250}},
                {position: {x: 248, y: 291}, color: {R:174, G:169, B:217}},
                {position: {x: 280, y: 184}, color: {R:149, G:97, B:145}},
                {position: {x: 199, y: 829}, color: {R:202, G:134, B:122}},
                {position: {x: 386, y: 653}, color: {R:121, G:88, B:83}},
            ],
            Kosia_selfie: [
                {position: {x: 281, y: 195}, color: {R:184, G:167, B:175}},
                {position: {x: 281, y: 417}, color: {R:154, G:99, B:104}},
                {position: {x: 253, y: 738}, color: {R:113, G:90, B:84}},
                {position: {x: 290, y: 613}, color: {R:3, G:3, B:3}},
                {position: {x: 248, y: 804}, color: {R:4, G:4, B:4}},
            ],
            Mini_selfie: [
                {position: {x: 249, y: 177}, color: {R:240, G:236, B:253}},
                {position: {x: 256, y: 300}, color: {R:235, G:218, B:245}},
                {position: {x: 243, y: 350}, color: {R:228, G:97, B:147}},
                {position: {x: 212, y: 483}, color: {R:240, G:253, B:255}},
                {position: {x: 281, y: 867}, color: {R:229, G:216, B:253}},
            ],
            Murritts_selfie: [
                {position: {x: 326, y: 271}, color: {R:218, G:209, B:200}},
                {position: {x: 301, y: 376}, color: {R:218, G:143, B:153}},
                {position: {x: 295, y: 601}, color: {R:162, G:134, B:146}},
                {position: {x: 342, y: 894}, color: {R:234, G:208, B:217}},
                {position: {x: 253, y: 316}, color: {R:151, G:142, B:196}},
            ],*/
            voteLoadingScreenStatic: [
                {position: {x: 369, y: 217}, color: {R:28, G:175, B:197}},
                {position: {x: 230, y: 796}, color: {R:99, G:180, B:158}},
                {position: {x: 315, y: 247}, color: {R:239, G:183, B:174}},
            ],
            voteLoadingScreenDynamic: [
                {position: {x: 483, y: 875}, color: {R:104, G:85, B:111}},
            ],
            voteFaeOverlay: [
                {position: {x: 126, y: 252}, color: {R:238, G:225, B:211}},
                {position: {x: 482, y: 39}, color: {R:208, G:208, B:208}},
                {position: {x: 488, y: 20}, color: {R:28, G:23, B:25}},
            ],
            voteLoadedScreen: [
                {position: {x: 488, y: 872}, color: {R:255, G:254, B:252}},
                {position: {x: 466, y: 890}, color: {R:255, G:254, B:250}},
                {position: {x: 3, y: 688}, color: {R:133, G:146, B:193}},
                {position: {x: 33, y: 223}, color: {R:254, G:246, B:229}},
            ],
            someUnknownScreenWithBackButton: [
                {position: {x: 7, y: 31}, color: {R:121, G:147, B:196}},
                {position: {x: 50, y: 35}, color: {R:117, G:130, B:186}},
                {position: {x: 17, y: 46}, color: {R:237, G:240, B:255}},
                {position: {x: 6, y: 62}, color: {R:113, G:141, B:190}},
            ]
        };

        this.shifts = {
            characterSelectButtonXShift: {
                "Nox": 60, "LDPlayer": 88
            },
        }

        this.controlsPositions = {
            lastLoginMethodButtonOnInitialLoginScreen: {x: 206, y: 724},
            otherLoginMethodsButtonOnInitialLoginScreen: {x: 333, y: 724},
            iggLoginButtonOnFirstLoginScreenWithOverlay: {x: 146, y: 626},
            okButtonOnDoYouWnnaLoginPromptScreen: {x: 361, y: 564},
            profileButtonOnRoomScreen: {x: 64, y: 57},
            mailButtonOnRoomScreen: {x: 494, y: 304},
            friendsButtonOnRoomScreen: {x: 495, y: 232},
            messagesButtonOnMailScreen: {x: 441, y: 102},
            newMessageButtonOnMailScreen: {x: 489, y: 171},
            messageRecipientFieldOnMailScreen: {x: 243, y: 123},
            messageTopicFieldOnMailScreen: {x: 237, y: 196},
            messageTextOnMailScreen: {x: 233, y: 256},
            messageSendButtonOnMailScreen: {x: 269, y: 893},
            backButtonMessageOnMailScreen: {x: 18, y: 44},
            profileSettingsButtonOnProfileScreen: {x: 476, y: 579},
            accountButtonOnProfileSettingsScreen: {x: 154, y: 692},
            changeAccountButtonOnAccountScreen: {x: 267, y: 345},
            igogoButtonOnaccountChangeMethodSelectScreen: {x: 398, y: 301},
            loginButtonOnIggInternalChangeScreen:{
                "Nox": {x: 259, y: 200},
                "LDPlayer":{x: 260, y: 298}
            },
            useOtherAccountButtonOnIggInternalChangeScreen: {
                "Nox": {x: 266, y: 255},
                "LDPlayer":{x: 253, y: 376}
            },
            emailFieldOnIggInternalLoginScreen: {
                "Nox": {x: 205, y: 104},
                "LDPlayer": {x: 251, y: 158}
            },
            passwordFieldOnIggInternalLoginScreen: {
                "Nox": {x: 276, y: 163},
                "LDPlayer": {x: 263, y: 253}
            },
            loginButtonOnIggInternalLoginScreen: {
                "Nox": {x: 150, y: 227},
                "LDPlayer": {x: 225, y: 346}
            },
            firstCharacterSelectButtonOnIggCharacterSelectScreen:{
                "Nox":  {x: 260, y: 120},
                "LDPlayer":{x: 249, y: 161}
            },
            confirmButtonOnPolicyConfirmationScreen: {x: 357, y: 696},
            randomEmptySpaceOnPlayerRoomWitOverlayScreen: {x: 279, y: 868},
            confirmButtonOnUploadDataPromptScreen: {x: 369, y: 563},
            backButtonOnDailyLoginScreen: {x: 27, y: 45},
            randomEmptyPlaceOnNewMessageScreen: {x: 277, y: 845},
            openLetterButtonOnVelkomeBackLetterScreen: {x: 234, y: 572},
            voteLeftButtonOnVoteScreen: {x: 130, y: 818},
            voteRightButtonOnVoteScreen: {x: 410, y: 818},
            voteScreenFaeskipButton: {x: 488, y: 37},
            skipButtonOnVoteScreen: {x: 268, y: 877},
            carouselButtonOnRoomScreen: {x: 71, y: 623},
            journalButtonOnPreVoteScreen: {x: 358, y: 720},
            enterVoteButtonOnVoteLoadedScreen:{x: 470, y: 888},
            getButtonOnRandomScreenWithGetButton: {x: 269, y: 834},
            backButtonOnCharacterSelectScreen: {x: 19, y: 45},
        }
    }

    removeAllFiles = async (directory) => {
        await fs.readdir(directory, {}, async (err, files) => {
            if (!err) {
                for (const file of files) {
                    const filePath = path.join(directory, file);
                    await fs.unlink(filePath);
                }
            }
        });

        return true
    }

    toggleAutonomousMode = (mode) => {
        this.autonomousMode = mode !== undefined ? mode : !this.autonomousMode;
        mouse.config.mouseSpeed = this.autonomousMode ? 10000 : 2000;
        keyboard.config.autoDelayMs = this.autonomousMode ? 100 : 500;
    }

    setLogFolder = (newLogFolder) => {
        this.logFolder = newLogFolder;
    };

    stop = () => {
        if (this.isRolling) this.stopFlagSet = true;
    }

    moveTo = async (point) => {
        if (!this.stopFlagSet) {
            await mouse.move(straightTo(new Point(point.x ,point.y)));
        } else {
            this.stopFlagSet = false;
            this.consoleNodeLog("Master commanded stop")
        }
    }

    clickOn = async (point) => {
        this.timer.start("clickOn");
        if (!this.stopFlagSet) {
            await mouse.move(straightTo(new Point(point.x ,point.y)));
            await mouse.leftClick();
        } else {
            this.consoleNodeLog("Wont click, master sad stop")
        }
        this.timer.stop("clickOn");
    }

    typeIn = async (text) => {
        await keyboard.type(text);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    timer = {
        start: (name) => {
            this.timerStore[name] = performance.now();
        },
        stop: (name) => {
            if (this.times[name] === undefined) this.times[name] = 0;
            this.times[name] = this.times[name] + (performance.now() - this.timerStore[name])/1000;
        }
    }

    formatTime = (secondsAmount) => {
        if (!secondsAmount) return "In progress"
        const seconds = secondsAmount % 60;
        const minutes = Math.floor((secondsAmount % 3600) / 60);
        const hours = Math.floor(secondsAmount / 3600);
        return `${hours}h ${minutes}m ${seconds}s`
    }

    logStatistics = () => {
        const detailsObject = {
            "found black list works": this.stats.black,
            "found white list works": this.stats.white,
            "times voted": this.stats.totalVotes,
            "twins processed": this.stats.twinsProcessed,
            "time spent voting": this.formatTime(this.times.voteForWorks),
            "time spent closing pop-ups": this.formatTime(this.times.closeAllPopUps),
            "time spent loggin in": this.formatTime(this.times.login),
            "time spent loggin out": this.formatTime(this.times.logOut),
            "total time spend": this.formatTime(this.times.voteFromEveryAccount),
        }

        this.consoleNodeStats(detailsObject);
    }

    changeAccount = async () => {
        this.timer.start("changeAccount");
        this.currentAccountIndex++;
        this.currentCharacterIndex = 0;
        await this.followPath([
            {screenToLoad: this.screensList.iggInternalChangeScreen[this.selectedEmulator], buttonToPush: this.controlsPositions.useOtherAccountButtonOnIggInternalChangeScreen[this.selectedEmulator], stepName:"click use other account button"},
            {screenToLoad: this.screensList.iggInternalLoginScreen, buttonToPush: this.controlsPositions.emailFieldOnIggInternalLoginScreen, textToInput: this.accountsForVote[this.currentAccountIndex].email, stepName:"input email"},
            {screenToLoad: this.screensList.iggInternalLoginScreen, buttonToPush: this.controlsPositions.passwordFieldOnIggInternalLoginScreen, stepName:"defocus email field"},
            {screenToLoad: this.screensList.iggInternalLoginScreen, buttonToPush: this.controlsPositions.passwordFieldOnIggInternalLoginScreen, textToInput: this.accountsForVote[this.currentAccountIndex].password, stepName:"input password"},
            {screenToLoad: this.screensList.iggInternalLoginScreen, buttonToPush: this.controlsPositions.loginButtonOnIggInternalLoginScreen, stepName:"defocus password field"},
            {screenToLoad: this.screensList.iggInternalLoginScreen, buttonToPush: this.controlsPositions.loginButtonOnIggInternalLoginScreen, stepName:"click login button"},
        ])

        this.timer.stop("changeAccount");
        return true
    }

    logIn = async () => {
        this.timer.start("login");
        this.consoleNodeClear();
        this.consoleNodeLog("Log in");
        if (await this.checkSignature(this.screensList.playerRoom)
            ||
            await this.checkSignature(this.screensList.randomScreenWithGetButton1)
            ||
            await this.checkSignature(this.screensList.playerRoomWithOverlay)
            ||
            await this.checkSignature(this.screensList.playerRoomWithOverlay2)
            ||
            await this.checkSignature(this.screensList.playerRoomWithOverlay3)
            ||
            await this.checkSignature(this.screensList.fantasyPromiseOverlay)
            ||
            await this.checkSignature(this.screensList.newItemPreviewScreen)
            ||
            await this.checkSignature(this.screensList.catBubblesPreviewScreen)
            ||
            await this.checkSignature(this.screensList.someUnknownScreenWithBackButton)
            ||
            await this.checkSignature(this.screensList.velkomeBackLetterScreen)
            ||
            await this.checkSignature(this.screensList.revardOverlayOnRandomScreenWithGetButton1)) {
            this.consoleNodeLog("Already logged in");

            return true
        }

        const isScreenInitial = await this.checkSignature(this.screensList.firstLoginScreen);
        const loginWithIggIsOutsideDropdown = await this.checkSignature(this.screensList.loginWithIggButton);
        if (isScreenInitial) {
            if (loginWithIggIsOutsideDropdown) {
                await this.followPath([
                    {screenToLoad: this.screensList.firstLoginScreen, buttonToPush: this.controlsPositions.lastLoginMethodButtonOnInitialLoginScreen, stepName:"Click on login with IGG"},
                ]);
            } else {
                await this.followPath([
                    {screenToLoad: this.screensList.firstLoginScreen, buttonToPush: this.controlsPositions.otherLoginMethodsButtonOnInitialLoginScreen, stepName:"Click on use other login"},
                    {screenToLoad: this.screensList.firstLoginScreenWithOverlay, buttonToPush: this.controlsPositions.iggLoginButtonOnFirstLoginScreenWithOverlay, stepName:"Click on login with IGG"}
                ]);
            }

        }

        if (this.needToChangeAccount) {
            await this.changeAccount();
            this.needToChangeAccount = false;
        }

        await this.followPath([
            {screenToLoad: this.screensList.iggInternalChangeScreen[this.selectedEmulator], buttonToPush: this.controlsPositions.loginButtonOnIggInternalChangeScreen[this.selectedEmulator], stepName:"click on login"},
            {screenToLoad: this.screensList.iggCharacterSelectScreen[this.selectedEmulator], buttonToPush: {x: this.controlsPositions.firstCharacterSelectButtonOnIggCharacterSelectScreen[this.selectedEmulator].x, y: this.controlsPositions.firstCharacterSelectButtonOnIggCharacterSelectScreen[this.selectedEmulator].y + this.shifts.characterSelectButtonXShift[this.selectedEmulator] * this.currentCharacterIndex, stepName:"Click on twin button"}},
        ])

        try {
            this.consoleNodeLog("wait for prompt do you wanna login with this");
            await this.waitForScreenToLoad(this.screensList.doYouWnnaLoginPromptScreen, 3000, false, "No login prompt on screen");
            await this.followPath([
                {screenToLoad: this.screensList.doYouWnnaLoginPromptScreen, buttonToPush: this.controlsPositions.okButtonOnDoYouWnnaLoginPromptScreen, stepName:"wait for prompt do you wanna login with this"},
            ])
        } catch (error) {
            try {
                this.consoleNodeLog("wait for player room to load");
                await this.waitForScreenToLoad([this.screensList.playerRoom, this.screensList.velkomeBackLetterScreen, this.screensList.fantasyPromiseOverlay, this.screensList.revardOverlayOnRandomScreenWithGetButton1, this.screensList.catBubblesScreen, this.screensList.catBubblesPreviewScreen, this.screensList.randomScreenWithGetButton1, this.screensList.playerRoomWithOverlay, this.screensList.playerRoomWithOverlay2, this.screensList.playerRoomWithOverlay3, this.screensList.fantasyPromiseOverlay, this.screensList.newItemPreviewScreen, this.screensList.someUnknownScreenWithBackButton, this.screensList.policyConfirmationScreen], 30000, true, "Looks like player screen is not loading");
            } catch (error) {
                this.consoleNodeLog("no more twins on this account?");
                await this.clickOn(coordHelper.relativeToAbsolute(this.controlsPositions.backButtonOnCharacterSelectScreen, this.zeroCoords));
                await this.changeAccount();
                await this.followPath([
                    {screenToLoad: this.screensList.iggInternalChangeScreen[this.selectedEmulator], buttonToPush: this.controlsPositions.loginButtonOnIggInternalChangeScreen[this.selectedEmulator], stepName:"click on login"},
                    {screenToLoad: this.screensList.iggCharacterSelectScreen[this.selectedEmulator], buttonToPush: {x: this.controlsPositions.firstCharacterSelectButtonOnIggCharacterSelectScreen[this.selectedEmulator].x, y: this.controlsPositions.firstCharacterSelectButtonOnIggCharacterSelectScreen[this.selectedEmulator].y + this.shifts.characterSelectButtonXShift[this.selectedEmulator] * this.currentCharacterIndex}, stepName:"Click on twin button"},
                ])
            }
        }

        this.consoleNodeLog("wait for player room to load");
        await this.waitForScreenToLoad([this.screensList.playerRoom, this.screensList.velkomeBackLetterScreen, this.screensList.fantasyPromiseOverlay, this.screensList.revardOverlayOnRandomScreenWithGetButton1, this.screensList.catBubblesScreen, this.screensList.catBubblesPreviewScreen, this.screensList.randomScreenWithGetButton1, this.screensList.playerRoomWithOverlay, this.screensList.playerRoomWithOverlay2, this.screensList.playerRoomWithOverlay3, this.screensList.fantasyPromiseOverlay, this.screensList.newItemPreviewScreen, this.screensList.someUnknownScreenWithBackButton, this.screensList.policyConfirmationScreen], 30000, true);

        const additionalPopUpGenerated = await this.checkSignature(this.screensList.policyConfirmationScreen);
        if (additionalPopUpGenerated) {
            this.consoleNodeLog("Click on policy confirmation screen");
            await this.followPath([
                {screenToLoad: this.screensList.policyConfirmationScreen, buttonToPush: this.controlsPositions.confirmButtonOnPolicyConfirmationScreen}
            ])
        }

        this.timer.stop("login");
        return true
    }

    closeAllPopUps = async () => {
        this.timer.start("closeAllPopUps");
        this.consoleNodeClear();
        this.consoleNodeLog("closeAllPopUps");

        await this.waitForScreenToLoad([this.screensList.playerRoom, this.screensList.velkomeBackLetterScreen, this.screensList.revardOverlayOnRandomScreenWithGetButton1, this.screensList.fantasyPromiseOverlay, this.screensList.catBubblesScreen, this.screensList.catBubblesPreviewScreen, this.screensList.randomScreenWithGetButton1, this.screensList.playerRoomWithOverlay, this.screensList.playerRoomWithOverlay2, this.screensList.playerRoomWithOverlay3, this.screensList.newItemPreviewScreen, this.screensList.someUnknownScreenWithBackButton], 30000, true);

        let playerRoomIsVisible = await this.checkSignature(this.screensList.playerRoom);
        while (!playerRoomIsVisible) {
            if (await this.checkSignature( this.screensList.randomScreenWithGetButton1)) {
                await this.clickOn(coordHelper.relativeToAbsolute(this.controlsPositions.getButtonOnRandomScreenWithGetButton, this.zeroCoords));
            }

            if (await this.checkSignature(this.screensList.revardOverlayOnRandomScreenWithGetButton1)) {
                await this.clickOn(coordHelper.relativeToAbsolute(this.controlsPositions.randomEmptySpaceOnPlayerRoomWitOverlayScreen, this.zeroCoords));
                await this.sleep(500);
                await this.clickOn(coordHelper.relativeToAbsolute(this.controlsPositions.randomEmptySpaceOnPlayerRoomWitOverlayScreen, this.zeroCoords));
            }

            if (await this.checkSignature(this.screensList.fantasyPromiseOverlay)) {
                await this.clickOn(coordHelper.relativeToAbsolute(this.controlsPositions.randomEmptySpaceOnPlayerRoomWitOverlayScreen, this.zeroCoords));
            }

            if (await this.checkSignature(this.screensList.playerRoomWithOverlay)) {
                await this.clickOn(coordHelper.relativeToAbsolute(this.controlsPositions.randomEmptySpaceOnPlayerRoomWitOverlayScreen, this.zeroCoords));
            }

            if (await this.checkSignature(this.screensList.playerRoomWithOverlay2)) {
                await this.clickOn(coordHelper.relativeToAbsolute(this.controlsPositions.randomEmptySpaceOnPlayerRoomWitOverlayScreen, this.zeroCoords));
            }

            if (await this.checkSignature(this.screensList.playerRoomWithOverlay3)) {
                await this.clickOn(coordHelper.relativeToAbsolute(this.controlsPositions.randomEmptySpaceOnPlayerRoomWitOverlayScreen, this.zeroCoords));
            }

            if (await this.checkSignature(this.screensList.uploadDataPromptScreen)) {
                await this.clickOn(coordHelper.relativeToAbsolute(this.controlsPositions.confirmButtonOnUploadDataPromptScreen, this.zeroCoords));
            }

            if (await this.checkSignature(this.screensList.catBubblesPreviewScreen)) {
                await this.clickOn(coordHelper.relativeToAbsolute(this.controlsPositions.randomEmptySpaceOnPlayerRoomWitOverlayScreen, this.zeroCoords));
            }

            if (await this.checkSignature(this.screensList.catBubblesScreen)) {
                await this.clickOn(coordHelper.relativeToAbsolute(this.controlsPositions.randomEmptySpaceOnPlayerRoomWitOverlayScreen, this.zeroCoords));
            }

            if (await this.checkSignature(this.screensList.someUnknownScreenWithBackButton)) {
                await this.clickOn(coordHelper.relativeToAbsolute(this.controlsPositions.backButtonOnDailyLoginScreen, this.zeroCoords));
            }

            if (await this.checkSignature(this.screensList.velkomeBackLetterScreen)) {
                await this.clickOn(coordHelper.relativeToAbsolute(this.controlsPositions.openLetterButtonOnVelkomeBackLetterScreen, this.zeroCoords));
            }

            if (await this.checkSignature(this.screensList.openWelkomeBackLetterScreen)) {
                await this.clickOn(coordHelper.relativeToAbsolute(this.controlsPositions.openLetterButtonOnVelkomeBackLetterScreen, this.zeroCoords));
            }

            if (await this.checkSignature(this.screensList.itemsFromWelkomeBackLetterScreen)) {
                await this.clickOn(coordHelper.relativeToAbsolute(this.controlsPositions.randomEmptySpaceOnPlayerRoomWitOverlayScreen, this.zeroCoords));
            }

            await this.sleep(1000);
            playerRoomIsVisible = await this.checkSignature(this.screensList.playerRoom);
        }

        this.timer.stop("closeAllPopUps");
        return true
    }

    senMessage = async () => {
        this.consoleNodeClear();
        this.consoleNodeLog("senMessage");
        await this.followPath([
            {screenToLoad: this.screensList.playerRoom, buttonToPush: this.controlsPositions.mailButtonOnRoomScreen},
            {screenToLoad: this.screensList.mailScreen, buttonToPush: this.controlsPositions.messagesButtonOnMailScreen},
            {screenToLoad: this.screensList.massagesScreen, buttonToPush: this.controlsPositions.newMessageButtonOnMailScreen},
            {screenToLoad: this.screensList.newMessageScreen, buttonToPush: this.controlsPositions.messageRecipientFieldOnMailScreen, textToInput:`lilnorn`},
            {screenToLoad: this.screensList.newMessageScreen, buttonToPush: this.controlsPositions.messageTopicFieldOnMailScreen},
            {screenToLoad: this.screensList.newMessageScreen, buttonToPush: this.controlsPositions.messageTopicFieldOnMailScreen, textToInput:`Test_${this.accountsForVote[this.currentAccountIndex].email}_${this.currentCharacterIndex}`},
            {screenToLoad: this.screensList.newMessageScreen, buttonToPush: this.controlsPositions.messageTextOnMailScreen},
            {screenToLoad: this.screensList.newMessageScreen, buttonToPush: this.controlsPositions.messageTextOnMailScreen, textToInput:"Wake up Neo!"},
            {screenToLoad: this.screensList.newMessageScreen, buttonToPush: this.controlsPositions.randomEmptyPlaceOnNewMessageScreen},
            {screenToLoad: this.screensList.newMessageScreen, buttonToPush: this.controlsPositions.messageSendButtonOnMailScreen},
            {screenToLoad: this.screensList.massagesScreen, buttonToPush: this.controlsPositions.backButtonMessageOnMailScreen},
        ])

        return true
    }

    logOut = async () => {
        this.timer.start("logOut");
        this.consoleNodeClear();
        this.consoleNodeLog("log out");
        this.stats.twinsProcessed++;
        await this.followPath([
            {screenToLoad: this.screensList.playerRoom, buttonToPush: this.controlsPositions.profileButtonOnRoomScreen},
            {screenToLoad: this.screensList.profileScreen, buttonToPush: this.controlsPositions.profileSettingsButtonOnProfileScreen},
            {screenToLoad: this.screensList.profileSettingsScreen, buttonToPush: this.controlsPositions.accountButtonOnProfileSettingsScreen},
            {screenToLoad: this.screensList.accountScreen, buttonToPush: this.controlsPositions.changeAccountButtonOnAccountScreen},
            {screenToLoad: this.screensList.accountChangeMethodSelectScreen, buttonToPush: this.controlsPositions.igogoButtonOnaccountChangeMethodSelectScreen},
        ])

        this.timer.stop("logOut");
        return true
    }

    massSendMessages = async () => {
        this.consoleNodeLog("massSendMessages started");
        while (this.currentAccountIndex < this.accountsForVote.length) {
            this.consoleNodeLog(`massSendMessages step currentCharacterIndex ${this.currentCharacterIndex} currentAccountIndex ${this.currentAccountIndex}`);
            await this.logIn();
            await this.closeAllPopUps();
            await this.senMessage();
            await this.logOut();
            this.currentCharacterIndex++;
            if (this.currentCharacterIndex === 10) {
                this.needToChangeAccount = true;
            }
        }
    }

    enterVoteScreen = async () => {
        this.timer.start("enterVoteScreen");
        this.consoleNodeLog("Enter vote screen");
        await this.followPath([
            {screenToLoad: this.screensList.playerRoom, buttonToPush: this.controlsPositions.carouselButtonOnRoomScreen},
            {screenToLoad: this.screensList.preVoteScreen, buttonToPush: this.controlsPositions.journalButtonOnPreVoteScreen},
            {screenToLoad:this.screensList.voteLoadingScreenStatic, stepName:"wait for static to load"},
            {screenToHide:this.screensList.voteLoadingScreenStatic, stepName:"wait for static to hide"},
        ]);

        if (await this.checkSignature(this.screensList.voteFaeOverlay)) await this.clickOn(coordHelper.relativeToAbsolute(this.controlsPositions.voteScreenFaeskipButton, this.zeroCoords));

        await this.followPath([
            {screenToLoad: this.screensList.voteLoadedScreen, buttonToPush: this.controlsPositions.enterVoteButtonOnVoteLoadedScreen, stepName:"wait for dynamick to load"},
        ]);

        let voteScreenLoaded = await this.checkSignature(this.screensList.voteScreen);
        while (!voteScreenLoaded) {
            this.consoleNodeLog("Waiting for vote tick");
            voteScreenLoaded = await this.checkSignature(this.screensList.voteScreen);
            await this.clickOn(coordHelper.relativeToAbsolute(this.controlsPositions.enterVoteButtonOnVoteLoadedScreen, this.zeroCoords));
            await this.sleep(500);
        }

        this.timer.stop("enterVoteScreen");
        return true;
    };

    leaveVoteScreen = async () => {
        this.timer.start("leaveVoteScreen");
        this.consoleNodeLog("Leave vote screen");
        await this.followPath([
            {screenToLoad: this.screensList.voteScreen, buttonToPush: this.controlsPositions.backButtonOnDailyLoginScreen},
            {screenToLoad: this.screensList.voteLoadedScreen, buttonToPush: this.controlsPositions.backButtonOnDailyLoginScreen},
            {screenToLoad: this.screensList.preVoteScreen, buttonToPush: this.controlsPositions.backButtonOnDailyLoginScreen},
            {screenToLoad: this.screensList.playerRoom},
        ]);

        this.timer.stop("leaveVoteScreen");
        return true;
    };

    voteFromEveryAccount = async (autonomousMode) => {
        this.timer.start("voteFromEveryAccount");
        this.electronWindow.webContents.send("eye", "wander");
        this.consoleNodeLog("vote from every account started");
        this.toggleAutonomousMode(autonomousMode);
        this.stats = {...initialStats};
        this.times = {};

        this.removeAllFiles(`./${this.build ? "resources/app/" : ""}botLogick/temporaryAssets`);

        if (this.isRolling) {
            this.consoleNodeLog("Process already started");
        } else if (this.zeroCoords.x == 0 && this.zeroCoords.y == 0) {
            this.consoleNodeLog("Please set initial coordinates first");
        } else if (!this.accountsForVote.length) {
            this.consoleNodeLog("Please fill in accounts to vote from");
        } else {
            this.isRolling = true;
            await this.startTesseractWorker();

            while (this.currentAccountIndex < this.accountsForVote.length && !this.stopFlagSet) {
                this.consoleNodeLog(`voteFromEveryAccount step currentCharacterIndex ${this.currentCharacterIndex} currentAccountIndex ${this.currentAccountIndex}`);
                await this.logIn();
                await this.closeAllPopUps();
                await this.enterVoteScreen();
                await this.voteFromEveryCharacter();
                await this.leaveVoteScreen();
                await this.logOut();
                this.currentCharacterIndex++;
                if (this.currentCharacterIndex === 10) {
                    this.currentAccountIndex++;
                    this.needToChangeAccount = true;
                    this.currentCharacterIndex = 0;
                }
                this.logStatistics();
            }

            await this.stopTesseractWorker();
            this.toggleAutonomousMode(false);
            this.isRolling = false;
            this.stopFlagSet = false;
        }

        this.consoleNodeLog("vote from every account ended");

        this.stopFlagSet = false;
        this.electronWindow.webContents.send("eye", "stop");
        this.timer.stop("voteFromEveryAccount");
        this.logStatistics();
        return true
    }

    voteFromEveryCharacter = async () => {
        this.timer.start("voteFromEveryCharacter");
        this.worksList = await this.downloadAllWorksFroDB();
        this.consoleNodeClear();
        this.consoleNodeLog("vote started");
        this.attemptNumber = 0;

        this.skipsAmountLeft = await this.checkSkipsAmount();
        this.votesAmountLeft = await this.checkVotesAmount();

        while (this.votesAmountLeft && !this.stopFlagSet && !(this.testMode && (this.votesAmountLeft < 30 || this.skipsAmountLeft < 30))) {
            this.consoleNodeLog(`vote once, votes left:${this.votesAmountLeft}, skips left:${this.skipsAmountLeft}`);
            await this.voteForWorks();
            await this.waitForScreenToLoad(this.screensList.voteScreen);
            console.log("results is", this.stats, this.times);
        }

        this.consoleNodeLog("vote ended");
        this.timer.stop("voteFromEveryCharacter");
        this.logStatistics();
        return true
    }

    voteFromOneAccount = async () => {
        if (this.isRolling) {
            this.consoleNodeLog("Process already started");
        } else if (this.zeroCoords.x == 0 && this.zeroCoords.y == 0) {
            this.consoleNodeLog("Please set initial coordinates first");
        } else {
            await this.startTesseractWorker();
            this.stats = {...initialStats};
            this.times = {};

            this.isRolling = true;
            this.electronWindow.webContents.send("eye", "wander");
            this.consoleNodeClear();
            this.consoleNodeLog("vote started");
            console.log("vote started")

            this.skipsAmountLeft = await this.checkSkipsAmount();
            this.votesAmountLeft = await this.checkVotesAmount();

            while (this.votesAmountLeft && !this.stopFlagSet && !(this.testMode && (this.votesAmountLeft < 30 || this.skipsAmountLeft < 30))) {
                this.consoleNodeLog(`vote once, votes left:${this.votesAmountLeft}, skips left:${this.skipsAmountLeft}`);
                this.worksList = await this.downloadAllWorksFroDB();
                await this.voteForWorks();
                if (!this.stopFlagSet) await this.waitForScreenToLoad(this.screensList.voteScreen);
                console.log("results is", this.stats, this.times);
                this.logStatistics();
            }

            await this.stopTesseractWorker();

            this.consoleNodeLog("vote ended");
            this.stopFlagSet = false;
            this.electronWindow.webContents.send("eye", "stop");
            this.isRolling = false;
            this.logStatistics();
            return true
        }
    }

    checkWorksOnce = async () => {
        const leftWork = await searchForWork(this.worksList, coordHelper.relativeToAbsolute(this.topLefCornerOfLeftWorkVote, this.zeroCoords));
        const rightWork = await searchForWork(this.worksList, coordHelper.relativeToAbsolute(this.topLefCornerOfRightWorkVote, this.zeroCoords));

        let leftWorkIs = leftWork[0]?.list;
        let rightWorkIs = rightWork[0]?.list;

        this.consoleNodeLog(`Left is ${leftWork[0] ? leftWork[0].name : ""} ${leftWorkIs ? `${leftWorkIs}listed` : "new"} from ${leftWork[0] ? leftWork[0].side : "left"}, right work is ${rightWork[0] ? rightWork[0].name : ""} ${rightWorkIs ? `${rightWorkIs}listed` : "new"} from ${rightWork[0] ? rightWork[0].side : "right"}`);

        this.topLefCornerOfRightWorkVote = {x: 272, y: 119};
    }

    testWorks = async () => {
        this.worksList = await this.downloadAllWorksFroDB();

        await this.checkWorksOnce();

        this.topLefCornerOfRightWorkVote = {x: 272, y: 119};
        this.topLefCornerOfLeftWorkVote = {x:-7, y: 119};
        await this.checkWorksOnce();

        this.topLefCornerOfRightWorkVote = {x: 271, y: 119};
        this.topLefCornerOfLeftWorkVote = {x:-8, y: 119};
        await this.checkWorksOnce();

        this.topLefCornerOfRightWorkVote = {x: 270, y: 119};
        this.topLefCornerOfLeftWorkVote = {x:-9, y: 119};
        await this.checkWorksOnce();

        this.topLefCornerOfRightWorkVote = {x: 274, y: 119};
        this.topLefCornerOfLeftWorkVote = {x:-5, y: 119};
        await this.checkWorksOnce();

        this.topLefCornerOfRightWorkVote = {x: 275, y: 119};
        this.topLefCornerOfLeftWorkVote = {x:-4, y: 119};
        await this.checkWorksOnce();

        this.topLefCornerOfRightWorkVote = {x: 276, y: 119};
        this.topLefCornerOfLeftWorkVote = {x:-3, y: 119};
        await this.checkWorksOnce();

    }

    voteForWorks = async () => {
        this.timer.start("voteForWorks");
        this.consoleNodeClear();
        this.consoleNodeLog(`Ready to vote skips:${this.skipsAmountLeft}, votes:${this.votesAmountLeft}`);

/*        //TEMPORARY
        const leftList = this.worksList.filter(work => work.side === "left");
        const rightList = this.worksList.filter(work => work.side === "right");

        let leftWork = await searchForWork(rightList, coordHelper.relativeToAbsolute(this.topLefCornerOfLeftWorkVote, this.zeroCoords));
        let rightWork = await searchForWork(rightList, coordHelper.relativeToAbsolute(this.topLefCornerOfRightWorkVote, this.zeroCoords));

        if (!leftWork.length) leftWork = await searchForWork(leftList, coordHelper.relativeToAbsolute({x: this.topLefCornerOfLeftWorkVote.x - 1, y: this.topLefCornerOfLeftWorkVote.y}, this.zeroCoords));
        if (!rightWork.length) rightWork = await searchForWork(leftList, coordHelper.relativeToAbsolute({x: this.topLefCornerOfRightWorkVote.x - 1, y: this.topLefCornerOfRightWorkVote.y}, this.zeroCoords));*/
        this.timer.start("recognizeWorks");
        const leftWork = await searchForWork(this.worksList, coordHelper.relativeToAbsolute(this.topLefCornerOfLeftWorkVote, this.zeroCoords));
        const rightWork = await searchForWork(this.worksList, coordHelper.relativeToAbsolute(this.topLefCornerOfRightWorkVote, this.zeroCoords));
        this.timer.stop("recognizeWorks");

        let leftWorkIs = leftWork[0]?.list;
        let rightWorkIs = rightWork[0]?.list;

        if (!leftWorkIs && !rightWorkIs && !this.autonomousMode) {
            await this.getUserDecision();
            if (this.userDecision?.right?.list || this.userDecision?.left?.list) {
                let {leftWorkDecision, rightWorkDecision} = await this.captureNewWorks();
                leftWorkIs = leftWorkDecision;
                rightWorkIs = rightWorkDecision;
            } else if (this.userDecision?.justVoteFlag) {
                if (this.userDecision.justVoteFlag === "left") leftWorkIs = "white";
                if (this.userDecision.justVoteFlag === "right") rightWorkIs = "white";
            }
        }

        this.updateStatistics(leftWork, rightWork, leftWorkIs, rightWorkIs);

        this.consoleNodeLog(`Left is ${leftWork[0] ? leftWork[0].name : ""} ${leftWorkIs ? `${leftWorkIs}listed` : "new"} from ${leftWork[0] ? leftWork[0].side : "left"}, right work is ${rightWork[0] ? rightWork[0].name : ""} ${rightWorkIs ? `${rightWorkIs}listed` : "new"} from ${rightWork[0] ? rightWork[0].side : "right"}`);
        if (leftWorkIs === "white" && rightWorkIs === "white") {
            if (this.skipsAmountLeft) {
                await this.skipVote();
            } else {
                await this.voteRandom();
            }
        } else if (leftWorkIs === "white") {
            await this.voteLeft();
        } else if (rightWorkIs === "white") {
            await this.voteRight();
        } else if (leftWorkIs === "black" && rightWorkIs === "black") {
            await this.voteRandom()
        } else if (leftWorkIs === "black") {
            await this.voteRight();
        } else if (rightWorkIs === "black") {
            await this.voteLeft();
        } else {
            if (this.skipsAmountLeft) {
                await this.skipVote();
            } else {
                await this.voteRandom();
            }
        }

        this.resetUserDecision();
        this.timer.stop("voteForWorks");
        this.logStatistics();
        return true
    }

    updateStatistics = (dbLeftWork, dbRightWork, decisionLeftWork, decisionRightWork) => {
        this.stats.totalVotes++;
        
        if (dbLeftWork) {
            if (dbLeftWork.list === "white") {
                this.stats.white++;
                this.stats.leftStoredWhite++;
                if (dbLeftWork.side === "right") this.stats.leftCrossStoredWhite++;
            } else if (dbLeftWork.list === "black") {
                this.stats.black++;
                this.stats.leftStoredBlack++;
                if (dbLeftWork.side === "right") this.stats.leftCrossStoredBlack++;
            }
        } else if (decisionLeftWork) {
            if (decisionLeftWork === "white") {
                this.stats.white++;
                this.stats.leftWhite++;
            } else if (decisionLeftWork === "black") {
                this.stats.black++;
                this.stats.leftBlack++;
            }
        }

        if (dbRightWork) {
            if (dbRightWork.list === "white") {
                this.stats.white++;
                this.stats.rightStoredWhite++;
                if (dbRightWork.side === "left") this.stats.rightCrossStoredWhite++;
            } else if (dbRightWork.list === "black") {
                this.stats.black++;
                this.stats.rightStoredBlack++;
                if (dbRightWork.side === "left") this.stats.rightCrossStoredBlack++;
            }
        } else if (decisionRightWork) {
            if (decisionRightWork === "white") {
                this.stats.white++;
                this.stats.rightWhite++;
            } else if (decisionRightWork === "black") {
                this.stats.black++;
                this.stats.rightBlack++;
            }
        }
    }

    getUserDecision = async () => {
        this.timer.start("getUserDecision");
        this.electronWindow.webContents.send("voterControl", {type: "renderedCloseInstructionsDropdown"});
        this.consoleNodeLog("Works not recognized, waiting 30 sec for user to choose");
        await this.quickTestImage();
        await this.waitForUserInput();
        this.electronWindow.webContents.send("voterControl", {type: "rendererResetWorkDecisionState"});

        this.timer.start("getUserDecision");
        return true
    }

    captureNewWorks = async () => {
        this.timer.start("captureNewWorks");
        const leftWorkDecision = this.userDecision?.left?.list;
        const rightWorkDecision = this.userDecision?.right?.list;

        if (leftWorkDecision == "white" || leftWorkDecision == "black") {
            const workSignature = await getSignature(coordHelper.relativeToAbsolute(this.topLefCornerOfLeftWorkVote, this.zeroCoords), coordHelper.relativeToAbsolute(this.bottomRightCornerOfLeftWorkVote, this.zeroCoords));
            await this.uploadToDB({
                name: this.userDecision.left.name,
                signature: workSignature,
                list: leftWorkDecision,
                side: "left",
                trackingData: `${new Date().toJSON().replaceAll(":", "_").slice(0,19)}_${this.accountsForVote[this.currentAccountIndex]?.email || "oldVersion"}`
            })
        }

        if (rightWorkDecision == "white" || rightWorkDecision == "black") {
            const workSignature = await getSignature(coordHelper.relativeToAbsolute(this.topLefCornerOfRightWorkVote, this.zeroCoords), coordHelper.relativeToAbsolute(this.bottomRightCornerOfRightWorkVote, this.zeroCoords));
            await this.uploadToDB({
                name: this.userDecision.right.name,
                signature: workSignature,
                list: rightWorkDecision,
                side: "right",
                trackingData: `${new Date().toJSON().replaceAll(":", "_").slice(0,19)}_${this.accountsForVote[this.currentAccountIndex]?.email || "oldVersion"}`
            })
        }

        this.timer.stop("captureNewWorks");
        return {leftWorkDecision, rightWorkDecision}
    }

    voteWithoutDecision = (args) => {
        this.userDecision.justVoteFlag = args.decision;
        this.userDecisionMade = true;
    }

    voteRandom = async () => {
        if (Math.random() > 0.5) {
            await this.voteLeft();
        } else {
            await this.voteRight();
        }
        return true
    }

    voteLeft = async () => {
        if (this.stopFlagSet) return true
        if (this.testMode) {
            await this.moveTo(coordHelper.relativeToAbsolute(this.controlsPositions.voteLeftButtonOnVoteScreen, this.zeroCoords))
        } else {
            await this.clickOn(coordHelper.relativeToAbsolute(this.controlsPositions.voteLeftButtonOnVoteScreen, this.zeroCoords));
            if (!this.stopFlagSet) await this.waitForScreenToLoad(this.screensList.voteScreenWithOverlay);
            await this.clickOn(coordHelper.relativeToAbsolute(this.controlsPositions.randomEmptySpaceOnPlayerRoomWitOverlayScreen, this.zeroCoords));
        }
        this.votesAmountLeft = this.votesAmountLeft - 1;

        return true
    }

    voteRight = async () => {
        if (this.stopFlagSet) return true
        if (this.testMode) {
            await this.moveTo(coordHelper.relativeToAbsolute(this.controlsPositions.voteRightButtonOnVoteScreen, this.zeroCoords))
        } else {
            await this.clickOn(coordHelper.relativeToAbsolute(this.controlsPositions.voteRightButtonOnVoteScreen, this.zeroCoords));
            if (!this.stopFlagSet) await this.waitForScreenToLoad(this.screensList.voteScreenWithOverlay);
            await this.clickOn(coordHelper.relativeToAbsolute(this.controlsPositions.randomEmptySpaceOnPlayerRoomWitOverlayScreen, this.zeroCoords));
        }
        this.votesAmountLeft = this.votesAmountLeft - 1;

        return true
    }

    skipVote = async () => {
        if (this.stopFlagSet) return true
        if (this.testMode) {
            await this.moveTo(coordHelper.relativeToAbsolute(this.controlsPositions.skipButtonOnVoteScreen, this.zeroCoords))
        } else {
            await this.clickOn(coordHelper.relativeToAbsolute(this.controlsPositions.skipButtonOnVoteScreen, this.zeroCoords));
        }
        this.skipsAmountLeft = this.skipsAmountLeft - 1;
        return true
    }

    cleanUpNumberString = (inputString) => {
        let newString = inputString;
        newString = newString.replace("g", 9);
        newString = newString.replace("o", 0);
        newString = newString.replace("O", 0);
        newString = newString.replace(/\D/g, "");
        return newString
    }

    checkSkipsAmount = async () => {
        if (!this.teseractWorker) return 30
        const imageName = `skipAmountCheck_${new Date().toJSON().replaceAll(":", "_").slice(0,19)}`;
        await screen.captureRegion(imageName, this.skipsAmountTwoDigitsRegion, ".png", screen.config.resourceDirectory);
        let { data: { text : skipsAmount } } = await this.teseractWorker.recognize(`./${this.build ? "resources/app/" : ""}botLogick/temporaryAssets/${imageName}.png`);
        skipsAmount = this.cleanUpNumberString(skipsAmount);
        this.consoleNodeLog(`Check skips amount, got ${skipsAmount}`);
        console.log(`Check skips amount, got ${skipsAmount}`);

        if (isNaN(+skipsAmount)) {
            const imageName2 = `skipAmountCheck2_${new Date().toJSON().replaceAll(":", "_").slice(0,19)}`;
            await screen.captureRegion(imageName2, this.skipsAmountSingleDigitRegion, ".png", screen.config.resourceDirectory);
            let { data: { text : skipsAmount2 } } = await this.teseractWorker.recognize(`./${this.build ? "resources/app/" : ""}botLogick/temporaryAssets/${imageName}.png`);
            skipsAmount2 = this.cleanUpNumberString(skipsAmount2);
            this.consoleNodeLog(`Check skips amount, got ${skipsAmount2}`);
            console.log(`Check votes amount, got ${skipsAmount2}`);
            return +skipsAmount2
        }

        return +skipsAmount
    }

    checkVotesAmount = async () => {
        if (!this.teseractWorker) return 30
        const imageName = `voteAmountCheck_${new Date().toJSON().replaceAll(":", "_").slice(0,19)}`;
        await screen.captureRegion(imageName, this.voteAmountTwoDigitsRegion, ".png", screen.config.resourceDirectory);
        let { data: { text : votesAmount } } = await this.teseractWorker.recognize(`./${this.build ? "resources/app/" : ""}botLogick/temporaryAssets/${imageName}.png`);
        votesAmount = this.cleanUpNumberString(votesAmount);
        this.consoleNodeLog(`Check votes amount, got ${votesAmount}`);
        console.log(`Check votes amount, got ${votesAmount}`);

        if (isNaN(+votesAmount)) {
            const imageName2 = `skipAmountCheck2_${new Date().toJSON().replaceAll(":", "_").slice(0,19)}`;
            await screen.captureRegion(imageName2, this.voteAmountSingleDigitRegion, ".png", screen.config.resourceDirectory);
            let { data: { text : votesAmount2 } } = await this.teseractWorker.recognize(`./${this.build ? "resources/app/" : ""}botLogick/temporaryAssets/${imageName}.png`);
            votesAmount2 = this.cleanUpNumberString(votesAmount2);
            this.consoleNodeLog(`Check votes amount, got ${votesAmount2}`);
            console.log(`Check votes amount, got ${votesAmount2}`);
            return +votesAmount2
        }

        return +votesAmount
    }

    quickTestImage = async () => {
        const sources  = await desktopCapturer.getSources({ types: ['window'], thumbnailSize:{width: 300, height: 300}});
        console.log("sources", sources);
        const noxSource = sources.find(source => source.name === this.mediaSourceNamePerEmulator[this.selectedEmulator]);
        this.electronWindow.webContents.send("voterControl", {type: "renderedSetVoteImage", payload:{imageUrl: noxSource.thumbnail.toDataURL()}});
    }

    testImage = async () => {
        const imageName = `voteFile_${new Date().toJSON().replaceAll(":", "_").slice(0,19)}`;
        await screen.captureRegion(imageName, new Region(this.zeroCoords.x, this.zeroCoords.y+112, 540, 733), ".png", screen.config.resourceDirectory);
        this.electronWindow.webContents.send("voterControl", {type: "renderedSetVoteImage", payload:{imageUrl:`./botLogick/temporaryAssets/${imageName}.png`}});
    }

    setWorkDecision = (payload) => {
        console.log("update decision");
        if (!this.userDecision[payload.work]) this.userDecision[payload.work] = {};
        this.userDecision[payload.work][payload.fieldName] = payload.value;
    }

    submitDecision = () => {
        console.log("submit decision");
        this.userDecisionMade = true;
    }

    resetUserDecision = () => {
        this.userDecisionMade = false;
        this.userDecision = {};
    }

    waitForUserInput = async (waitTime=30000) => {
        let waitStartTime = Date.now();
        while (!this.userDecisionMade && Date.now()-waitStartTime < waitTime && !this.stopFlagSet) {
            this.electronWindow.webContents.send("voterControl", {type: "rendererUpdateTimer", payload:{time:`Time left: ${Math.floor((waitTime-(Date.now()-waitStartTime))/1000)}`}});
            await this.sleep(1000);
        }
        if (Date.now()-waitStartTime > waitTime && !this.userDecisionMade) console.log("user decision timeout");
        return true
    }

    uploadToDB = async (data) => {
        this.consoleNodeLog("upload works to DB");
        try {
            // Connect the client to the server	(optional starting in v4.7)
            await this.mongoClient.connect();

            // Send a ping to confirm a successful connection
            const db = this.mongoClient.db("TPCWhiteBlackList");
            const col = db.collection(this.collectionName);

            await col.insertOne(data);
            this.consoleNodeLog("data loaded to db");
        } catch (e) {
            this.consoleNodeLog(`error ${e}`);
            console.log("got error", e);
        } finally {

            // Ensures that the client will close when you finish/error
            await this.mongoClient.close();
        }
    }

    downloadAllWorksFroDB = async () => {
        this.consoleNodeLog("download works from DB");
        let works = [];
        try {
            // Connect the client to the server	(optional starting in v4.7)
            await this.mongoClient.connect();

            // Send a ping to confirm a successful connection
            const db = this.mongoClient.db("TPCWhiteBlackList");
            const col = db.collection(this.collectionName);

            works = await col.find().toArray(); // empty query
            this.worksList = works;
            console.log("retrieved works", works);
        } catch (e) {
            this.consoleNodeLog(`error ${e}`);
        } finally {
            // Ensures that the client will close when you finish/error
            await this.mongoClient.close();
        }

        return works
    }


    followPath = async (path) => {
        //path is a list of objects something like [{screenToLoad: signature, waiTime: , buttonToPush: coordinates, textToInput: }]
        let stepIndex = 0;
        while (stepIndex < path.length) {
            if (path[stepIndex].stepName) this.consoleNodeLog(`path step ${path[stepIndex].stepName}`);
            if (path[stepIndex].screenToHide) {
                await this.waitForScreenToDisappear(path[stepIndex].screenToHide[this.selectedEmulator] || path[stepIndex].screenToHide);
            }
            if (path[stepIndex].screenToLoad) {
                if (!path[stepIndex].screenToHide ||
                    !(await this.checkSignature(path[stepIndex].screenToHide[this.selectedEmulator] || path[stepIndex].screenToHide))) await this.waitForScreenToLoad(path[stepIndex].screenToLoad[this.selectedEmulator] || path[stepIndex].screenToLoad);
            }
            if (path[stepIndex].buttonToPush) {
                //this.consoleNodeLog(`Click on (x: ${path[stepIndex].buttonToPush.x}, y: ${path[stepIndex].buttonToPush.y})`)
                await this.clickOn(coordHelper.relativeToAbsolute(path[stepIndex].buttonToPush[this.selectedEmulator] || path[stepIndex].buttonToPush, this.zeroCoords));
            }
            if (path[stepIndex].textToInput) {
                await this.typeIn(path[stepIndex].textToInput)
            }
            stepIndex = stepIndex + 1;
        }
        await this.sleep(this.basePause);
        return true
    }

    waitForScreenToLoad = async (signature, waitTime=30000, multipleScreens, customError) => {
        let isLoaded = false;
        let waitStartTime = Date.now();
        while (!isLoaded) {
            if (multipleScreens) {
                for (let i = 0; i < signature.length; i++) {
                    console.log("something may be invalid here", i, isLoaded);
                    isLoaded = isLoaded || await this.checkSignature(signature[i]);
                }
            } else {
                isLoaded = await this.checkSignature(signature);
            }
            //if (!isLoaded) this.consoleNodeLog(`Waiting for screen ${this.getScreenName(multipleScreens ? signature[0] : signature)}`);
            if ((Date.now() - waitStartTime) > waitTime) {
                this.consoleNodeLog(customError || "Screen load took too long, I'ma booooored!");
                throw("Screen load took too long, I'ma booooored!");
            }
            await this.sleep(500);
        }
        return true;
    }

    waitForScreenToDisappear = async (signature, waitTime=10000, multipleScreens) => {
        let isDiappeared = false;
        let waitStartTime = Date.now();
        while (!isDiappeared) {
            if (multipleScreens) {
                for (let i = 0; i < signature.length; i++) {
                    console.log("something may be invalid here", i, isLoaded);
                    isDiappeared = isDiappeared || !(await this.checkSignature(signature[i]));
                }
            } else {
                isDiappeared = !(await this.checkSignature(signature));
            }
            //if (!isDiappeared) this.consoleNodeLog(`Waiting for screen ${this.getScreenName(multipleScreens ? signature[0] : signature)}`);
            if ((Date.now() - waitStartTime) > waitTime) throw("Screen load took too long, I'ma booooored!");
            await this.sleep(500);
        }
        return true;
    }

    addAccount = () => {
        this.accountsForVote.push({email: "", password:""});
        this.electronWindow.webContents.send("voterControl", {type: "rendererAddAccount", payload: {index: this.accountsForVote.length - 1}});
    }

    editAccount = (accountDetails) => {
        this.accountsForVote[accountDetails.index][accountDetails.fieldName] = accountDetails.value;
        console.log("some details", accountDetails, this.accountsForVote);
    }

    removeAccount = () => {
        this.accountsForVote.pop();
        this.electronWindow.webContents.send("voterControl", {type: "rendererRemoveAccount", payload: {index: this.accountsForVote.length}});
    }

    startTesseractWorker = async () => {
        try {
            this.teseractWorker = await createWorker("eng", 1, {
                corePath: "../node_modules/tesseract.js-core/",
                langPath: `./${this.build ? "resources/app/" : ""}botLogick/langData`,
                logger: m => console.log(m),
                workerBlobURL: false
            });
        } catch (e) {
            this.consoleNodeLog(`tesseract error ${e}`);
        }

        return true
    }

    stopTesseractWorker = async () => {
        await this.teseractWorker.terminate();
    }

    recognizeScreen = async () => {
        const screensNamesList = Object.keys(this.screensList);
        let currentScreen = null;
        let indexOfScreenToCheck = 0;

        while (indexOfScreenToCheck < screensNamesList.length && !currentScreen) {
            console.log(`Check signature for ${screensNamesList[indexOfScreenToCheck]}`)
            this.consoleNodeLog(`Check signature for ${screensNamesList[indexOfScreenToCheck]}`);
            if (await this.checkSignature(this.screensList[screensNamesList[indexOfScreenToCheck]][this.selectedEmulator] || this.screensList[screensNamesList[indexOfScreenToCheck]])) {
                currentScreen = screensNamesList[indexOfScreenToCheck];
            }
            indexOfScreenToCheck = indexOfScreenToCheck + 1;
        }

        if (currentScreen) {
            this.consoleNodeLog(`Miay? Master I'm currently looking on ${currentScreen}`);
        } else {
            this.consoleNodeLog(`Sorry master. Either I see this screen first time in my life or I'm lost again`);
        }
        return true
    }

    checkSignature = async (signature) => {
        let isValid = true;
        let currentDotIndex = 0;
        while (isValid && currentDotIndex < signature.length) {
            const position = coordHelper.relativeToAbsolute(signature[currentDotIndex].position, this.zeroCoords);
            const colorAtPoint = await screen.colorAt(position)
            this.consoleNodeLog(`Check color for {x: ${position.x}, y: ${position.y}} expected (R:${signature[currentDotIndex].color.R}, G:${signature[currentDotIndex].color.G}, B:${signature[currentDotIndex].color.B}) got: (R:${colorAtPoint.R}, G:${colorAtPoint.G}, B:${colorAtPoint.B})`);
            isValid = await isSameColourDot(
                signature[currentDotIndex].color,
                await screen.colorAt(coordHelper.relativeToAbsolute(signature[currentDotIndex].position, this.zeroCoords))
            )
            currentDotIndex = currentDotIndex + 1;
        }
        return isValid
    }

    getScreenName = (signature) => {
        Object.keys(this.screensList).find(screenName => this.screensList[screenName] === signature);
    }

    getDotInfo = async () => {
        const position = await mouse.getPosition();
        console.log("dot position", position);
        const relativePOsition = coordHelper.absoluteToRelative(position, this.zeroCoords);
        const color = await screen.colorAt(position);

        this.consoleNodeLog(`{position: {x: ${relativePOsition.x}, y: ${relativePOsition.y}}, color: {R:${color.R}, G:${color.G}, B:${color.B}}}, `);
    }

    getCorner = async () => {
        const searchStartPosition = await getExactCornerCoords(await mouse.getPosition(), "bottomRightLeft",  {R:255, G:253, B:252});
        this.consoleNodeLog(`{x: ${searchStartPosition.x}, y: ${searchStartPosition.y}},`);
    }

    getTopMargin = async () => {
        const searchStartPosition = coordHelper.absoluteToRelative(await getExactCornerCoords(await mouse.getPosition(), "topLeftRight",  {R:255, G:253, B:252}), this.zeroCoords);
        this.consoleNodeLog(`{x: ${searchStartPosition.x}, y: ${searchStartPosition.y}},`);
    }

    getBottomMargin = async () => {
        const searchStartPosition = coordHelper.absoluteToRelative(await getExactCornerCoords(await mouse.getPosition(), "bottomLeftRight",  {R:255, G:253, B:252}), this.zeroCoords);
        this.consoleNodeLog(`{x: ${searchStartPosition.x}, y: ${searchStartPosition.y}},`);
    }

    adjustIntialPosition = async (searchStartPosition, proposedDPI) => {
        this.zeroCoords = {x: searchStartPosition.x, y: searchStartPosition.y};
        this.proposedPlayerRegion = new Region(searchStartPosition.x, searchStartPosition.y, 540/proposedDPI, 960/proposedDPI);
        this.voteAmountTwoDigitsRegion = new Region(searchStartPosition.x + 493, searchStartPosition.y + 921, 21/proposedDPI, 16/proposedDPI);
        this.voteAmountSingleDigitRegion = new Region(searchStartPosition.x + 498, searchStartPosition.y + 921, 16/proposedDPI, 16/proposedDPI);
        this.skipsAmountTwoDigitsRegion = new Region(searchStartPosition.x + 328, searchStartPosition.y + 902, 21/proposedDPI, 13/proposedDPI);
        this.skipsAmountSingleDigitRegion = new Region(searchStartPosition.x + 332, searchStartPosition.y + 902, 13/proposedDPI, 13/proposedDPI);

        await screen.highlight(this.proposedPlayerRegion);

        /*for (let placeKey in this.zones) {
            for (let itemKey in this.zones[placeKey]) {
                this.consoleNodeLog(`this is ${placeKey} ${itemKey}`);
                await screen.highlight(this.zones[placeKey][itemKey]);
            }
        }*/
    }

    initializeSearchParameters = async (searchStartPosition, proposedDPI) => {
        await this.adjustIntialPosition(searchStartPosition, proposedDPI);
        await this.recognizeScreen();
    }

    findSearchRegion = async () => {
        this.consoleNodeClear();
        screen.config.highlightDurationMs = 2000;
        const proposedDPI = 1;
        this.consoleNodeLog(`DPI check got ${proposedDPI}`);

        this.consoleNodeLog("slls search for nox logo");
        let searchStartPosition = null;

        try {
            searchStartPosition = await centerOf(screen.find(imageResource(`Nox.png`)));
        } catch (logoError) {
            this.consoleNodeLog(`failed to find nox logo ${logoError}`);
        }

        searchStartPosition.x = searchStartPosition.x-20/proposedDPI;
        searchStartPosition.y = searchStartPosition.y+17/proposedDPI;

        await this.initializeSearchParameters(searchStartPosition, proposedDPI);

        return true;
    }

    manualFindSearchRegion = async () => {
        this.consoleNodeClear();
        screen.config.highlightDurationMs = 2000;
        const proposedDPI = 1;
        this.consoleNodeLog(`DPI check got ${proposedDPI}`);

        this.consoleNodeLog("manual search for corner");
        let searchStartPosition = null;

        try {
            searchStartPosition = await getExactCornerCoords(await mouse.getPosition(), "topLeft",  this.borderColourPerEmulator[this.selectedEmulator]);
        } catch (logoError) {
            this.consoleNodeLog(`failed to find corner ${logoError}`);
        }

        await this.initializeSearchParameters(searchStartPosition, proposedDPI);

        this.electronWindow.webContents.send("eye", "open");
        return true;
    }

    setSelectedEmulator = (name) => {
        this.selectedEmulator = name;
    }
}



module.exports = whiteBlackListSeparator;