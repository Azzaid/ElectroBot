const {app, ipcMain, BrowserWindow, dialog} = require('electron')
const {mouse, screen, straightTo, centerOf, left, right, up, down} = require("@nut-tree/nut-js");
const path = require('path')
const JerryRoller = require("./botLogick/highlightJerryButton");
const PorryGater = require("./botLogick/PorryGatter");
let mainWindow = '';
let jerryRollEngine = null;
let poryGatterEngine = null;

const consoleNodeClear = () => {
    mainWindow.webContents.send("log", {type: "clear"});
}

const consoleNodeLog = (text) => {
    mainWindow.webContents.send("log", {type: "log", payload: text});
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 900,
        height: 900,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            preload: path.join(__dirname, 'preload.js')
        }
    })
    mainWindow.setMenu(null);
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
}



ipcMain.on("main", (event, args) => {
    //console.log('main channel');
    //consoleNodeLog('main channel command received');
    if (args === "quit") {
        app.quit();
    }
});

ipcMain.on("control", (event, args) => {
    console.log('control channel', args);
    consoleNodeLog(`control channel ${args.type ? args.type : args} command received`);
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
})

app.on('window-all-closed', function () {
    console.log("Bye!");
    app.quit();
})
