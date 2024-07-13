const {app, ipcMain, BrowserWindow, dialog, globalShortcut} = require('electron')
const {mouse, screen, straightTo, centerOf, left, right, up, down} = require("@nut-tree/nut-js");
const path = require('path')
const JerryRoller = require("./botLogick/highlightJerryButton");
const PorryGater = require("./botLogick/PorryGatter");
const leatherboardScreener = require("./botLogick/screenAllLeatherboardLikeShit");
const whiteBlackListSeparator = require("./botLogick/rateWorksBasedOnWhiteAndBlackLists");
let mainWindow = '';
let jerryRollEngine = null;
let poryGatterEngine = null;
let screenerEngine = null;
let unfairVoteEngine = null;

const consoleNodeClear = () => {
    mainWindow.webContents.send("log", {type: "clear"});
}

const consoleNodeLog = (text) => {
    mainWindow.webContents.send("log", {type: "log", payload: text});
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 1200,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            preload: path.join(__dirname, 'preload.js')
        }
    })
    //mainWindow.setMenu(null);
    mainWindow.loadFile(path.join(__dirname, "index.html"))

    try {
        jerryRollEngine = new JerryRoller(mainWindow);
    } catch (createError) {
        consoleNodeLog(`engine creation error ${createError}`);
    }

    try {
        poryGatterEngine = new PorryGater(mainWindow);
    } catch (createError) {
        consoleNodeLog(`poryGatterEngine engine creation error ${createError}`);
    }

    try {
        screenerEngine = new leatherboardScreener(mainWindow);
    } catch (createError) {
        consoleNodeLog(`screenerEngine engine creation error ${createError}`);
    }

    try {
        unfairVoteEngine = new whiteBlackListSeparator(mainWindow);
    } catch (createError) {
        consoleNodeLog(`unfairVoteEngine engine creation error ${createError}`);
    }
}



ipcMain.on("main", (event, args) => {
    //console.log('main channel');
    //consoleNodeLog('main channel command received');
    if (args === "quit") {
        app.quit();
    }
});
ipcMain.on("voterControl", (event, args) => {
    console.log('voter control channel', args);
    //consoleNodeLog(`voter control channel ${args.type} command received`);
    switch (args.type) {
        case "testWB": {
            try {
                unfairVoteEngine.voteFromOneAccount(args.payload);
            } catch (error) {
                consoleNodeLog(`unfair vote engine error ${error}`);
            }
            return true;
        }
        case "startWB": {
            try {
                unfairVoteEngine.voteFromEveryAccount(args.payload);
            } catch (error) {
                consoleNodeLog(`unfair vote engine error ${error}`);
            }
            return true;
        }
        case "choosePlayer": {
            unfairVoteEngine.setSelectedEmulator(args.payload);
            return true
        }
        case "addAccount": {
            try {
                unfairVoteEngine.addAccount(args.payload);
            } catch (error) {
                consoleNodeLog(`unfair vote engine error ${error}`);
            }
            return true;
        }
        case "editAccount": {
            try {
                unfairVoteEngine.editAccount(args.payload);
            } catch (error) {
                consoleNodeLog(`unfair vote engine error ${error}`);
            }
            return true;
        }
        case "removeAccount": {
            try {
                unfairVoteEngine.removeAccount();
            } catch (error) {
                consoleNodeLog(`unfair vote engine error ${error}`);
            }
            return true;
        }
        case "setWorkDecision": {
            try {
                unfairVoteEngine.setWorkDecision(args.payload);
            } catch (error) {
                consoleNodeLog(`unfair vote engine error ${error}`);
            }
            return true;
        }
        case "submitDecision": {
            try {
                unfairVoteEngine.submitDecision();
            } catch (error) {
                consoleNodeLog(`unfair vote engine error ${error}`);
            }
            return true;
        }
        case "voteWithoutDecision": {
            try {
                unfairVoteEngine.voteWithoutDecision(args.payload);
            } catch (error) {
                consoleNodeLog(`unfair vote engine error ${error}`);
            }
            return true;
        }
        case "stop": {
            unfairVoteEngine.stop();
            return true;
        }
        default: {
            consoleNodeLog(`unfair vote unhandled command ${args.type}`);
            return true;
        }
    }
});


ipcMain.on("control", (event, args) => {
    console.log('control channel', args);
    //consoleNodeLog(`control channel ${args.type ? args.type : args} command received`);
    if (args === "barrelRoll") {
        (async () => {
            console.log('roll', args);
            await mouse.move(left(500));
            await mouse.move(up(500));
            await mouse.move(right(500));
            await mouse.move(down(500))
        })();
    }
    if (args === "test") {
        try {
            jerryRollEngine.testDressRecognition();
        } catch (testError) {
            consoleNodeLog(`test engine error ${error}`);
        }

    }
    if (args === "start") {
        try {
            jerryRollEngine.rollower();
        } catch (testError) {
            consoleNodeLog(`main engine error ${error}`);
        }
    }
    if (args === "stop") {
        jerryRollEngine.stop()
    }
    if (args === "logFolder") {
        const { dialog } = require('electron')
        dialog.showOpenDialog({ properties: ['openDirectory'] })
        .then(someData => {
            console.log("folderSelected", someData);
            if (!someData.canceled) {
                jerryRollEngine.setLogFolder(someData.filePaths[0])
            }
        })
    }
    if (args === "ready") {
        try {
            poryGatterEngine.highlightLetterRegion();
        } catch (testError) {
            consoleNodeLog(`test engine error ${error}`);
        }

    }
    if (args === "steady") {
        try {
            poryGatterEngine.rollower();
        } catch (testError) {
            consoleNodeLog(`test engine error ${error}`);
        }

    }
    if (args === "medvedi") {
        try {
            jerryRollEngine.stop();
        } catch (testError) {
            consoleNodeLog(`test engine error ${error}`);
        }

    }
    if (args === "prepareSpy") {
        try {
            screenerEngine.highlightSearchRegion();
        } catch (testError) {
            consoleNodeLog(`test engine error ${error}`);
        }

    }
    if (args === "sendSpy") {
        try {
            screenerEngine.rollower();
        } catch (testError) {
            consoleNodeLog(`test engine error ${error}`);
        }

    }
    if (args === "withdrawSpy") {
        try {
            screenerEngine.stop();
        } catch (testError) {
            consoleNodeLog(`test engine error ${error}`);
        }

    }
    if (args.type && args.type === "server") {
        jerryRollEngine.stop();
        jerryRollEngine.setServer(args.payload);
    }
    if (args.type && args.type === "searchTarget") {
        jerryRollEngine.stop();
        jerryRollEngine.setSearchTarget(args.payload);
    }
});

ipcMain.on("eye", (event, args) => {
    mainWindow.webContents.send("eye", args);
});

app.whenReady().then(() => {
    createWindow()

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })

    globalShortcut.register('{', () => {
        unfairVoteEngine.manualFindSearchRegion();
    });

    globalShortcut.register('Shift+s', () => {
        unfairVoteEngine.getDotInfo();
    })

    globalShortcut.register('Shift+3', () => {
        unfairVoteEngine.testWorks();
    })

    globalShortcut.register('Shift+4', () => {
        unfairVoteEngine.getTopMargin();
    })

    globalShortcut.register('Shift+5', () => {
        unfairVoteEngine.getBottomMargin();
    })

    globalShortcut.register('Shift+b', () => {
        unfairVoteEngine.stop();
    })
})

app.on('window-all-closed', function () {
    console.log("Bye!");
    app.quit();
})
