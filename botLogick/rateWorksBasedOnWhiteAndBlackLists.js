const {mouse, screen, straightTo, centerOf, keyboard, Key, Region, imageResource, Point} = require("@nut-tree/nut-js");
const {screen: electronScreen } = require('electron')
const repeatPromiseUntilResolved = require('repeat-promise-until-resolved');
const { createWorker } = require('tesseract.js');
const excelWriter = require('excel4node');
const fs = require('fs')
require("@nut-tree/template-matcher");
const getExactCornerCoords = require("./utils/getExactCornerCoords");
const coordHelper = require("./utils/relativeCoordsHelper");
const isSameColourDot = require("./utils/isSameColourDot");

class whiteBlackListSeparator {
    constructor(window) {
        this.electronWindow = window;
        screen.config.resourceDirectory = `${__dirname}/temporaryAssets`;
        screen.config.autoHighlight = true;
        screen.config.highlightDurationMs = 1000;
        mouse.config.mouseSpeed = 1000;

        this.consoleNodeClear = () => {
            this.electronWindow.webContents.send("log", {type: "clear"});
        }

        this.consoleNodeLog = (text) => {
            this.electronWindow.webContents.send("log", {type: "log", payload: text});
        }

        this.consoleNodeImage = (imageUrl) => {
            this.electronWindow.webContents.send("log", {type: "addImage", payload: imageUrl});
        }

        this.isRolling = false;
        this.stopFlagSet = false;
        this.logFolder = screen.config.resourceDirectory;

        this.zeroCoords = {x: 0, y: 0};
    }

    setLogFolder = (newLogFolder => {
        this.logFolder = newLogFolder;
    })

    stop = () => {
        if (this.isRolling) this.stopFlagSet = true;
    }

    clickOn = async (point) => {
        if (!this.stopFlagSet) {
            await mouse.move(straightTo(centerOf(point)));
            await mouse.leftClick();
        } else {
            throw ("Wont click, master sad stop")
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    massVote = async () => {
        this.consoleNodeLog("operation started");
        this.attemptNumber = 0;
        this.changesAmount = 0;
        this.excelLogWorkBook = new excelWriter.Workbook();
        this.guildsList = [];
        this.guildNamesList.forEach(guildName => {
            const guildData = {
                name: guildName,
                place: 1,
                changesAmount: 0,
                lastAttemptResult:"",
                //attemptWorkSheet:this.excelLogWorkBook.addWorksheet(`${guildName}Attempts`),
                resultWorkSheet:this.excelLogWorkBook.addWorksheet(`${guildName}Results`),
            }

            /*guildData.attemptWorkSheet.cell(1, 1).string("Attempt");
            guildData.attemptWorkSheet.cell(1, 2).string("Result number");
            guildData.attemptWorkSheet.cell(1, 3).string("Result image");
            guildData.attemptWorkSheet.cell(1, 4).string("Example number");
            guildData.attemptWorkSheet.cell(1, 5).string("Example image");*/

            guildData.resultWorkSheet.cell(1, 1).string('Place');
            guildData.resultWorkSheet.cell(1, 2).string('New result');
            guildData.resultWorkSheet.cell(1, 3).string('Time');

            this.guildsList.push(guildData);
        })

        try {
            this.teseractWorker = await createWorker({
                corePath: "../node_modules/tesseract.js-core/",
                langPath: `./resources/app/botLogick/langData`,
                logger: m => console.log(m),
                gzip: false,
                workerBlobURL: false
            });
            /*this.teseractWorker = await createWorker({
                workerPath: "./node_modules/tesseract.js/dist/worker.min.js",
                // Unlike when used in a browser, corePath and langPath are resolved relative the worker using Electron.
                corePath: "../node_modules/tesseract.js-core/",
                langPath: "./lang-data",
                logger: m => console.log(m),
                // Disable gzip since the eng.traineddata file we are using is already uncompressed
                gzip: false,
                workerBlobURL: false
            });*/

            await this.teseractWorker.load();
            await this.teseractWorker.loadLanguage('eng');
            await this.teseractWorker.initialize('eng');
        } catch (e) {
            this.consoleNodeLog(e);
        }

        await this.highlightSearchRegion();
        screen.config.autoHighlight = false;
        screen.config.highlightDurationMs = 1;

        this.isRolling = true;
        const onError = (error, attempt) => {
            this.consoleNodeLog(`attemp number ${attempt} failed ${error}`);
        }

        const onAttempt = (attempt) => {
            this.consoleNodeClear();
            this.attemptNumber = attempt;
            this.consoleNodeLog(`start roll number ${attempt}`);
        }

        const shouldStop = (error) => {
            if (this.stopFlagSet) {
                this.isRolling = false;
                this.stopFlagSet = false;
                return true
            }
            return false
        }

        try {
            await repeatPromiseUntilResolved( this.rollJerry,
                { maxAttempts: 5000, delay: 30000, timeout:500000000, onAttempt, onError, shouldStop}
            );
            this.excelLogWorkBook.write('Excel.xlsx');
            this.consoleNodeLog('Victory!')
            this.electronWindow.webContents.send("eye", "stop");
            await this.teseractWorker.terminate();
        } catch (error) {
            this.excelLogWorkBook.write('Excel.xlsx');
            this.consoleNodeLog('final fail', error)
            this.electronWindow.webContents.send("eye", "stop");
            await this.teseractWorker.terminate();
        }
    }

    voteForWorks = async () => {
        this.consoleNodeLog(`Attempt nr${this.attemptNumber}`);

        //const firstWorkIs = await this.checkWork(firstWorkInitialCoords);

        //const secondWorkIs = await this.checkWork(firstWorkInitialCoords);

        //await this.clickOn(this.refreshButtonClickRegion);
        this.consoleNodeLog("Sleep");
        throw new Error("and again");
    }

    typeIn = async () => {
        await keyboard.type("calculator");
    }

    recognizeScreen = async () => {
        this.screensList = {
            loginScreen: [
                {position: {x: 350, y: 307}, color: {R:252, G:233, B:254}},
                {position: {x: 320, y: 36}, color: {R:24, G:21, B:21}},
                {position: {x: 43, y: 321}, color: {R:239, G:208, B:239}},
                {position: {x: 84, y: 301}, color: {R:161, G:232, B:244}},
            ],
            mailScreen: [
                {position: {x: 280, y: 237}, color: {R:187, G:156, B:127}},
                {position: {x: 170, y: 100}, color: {R:231, G:223, B:211}},
                {position: {x: 349, y: 932}, color: {R:236, G:202, B:121}},
                {position: {x: 520, y: 920}, color: {R:247, G:218, B:184}},
                {position: {x: 511, y: 157}, color: {R:239, G:235, B:231}},
            ],
            Norns_selfie: [
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
            ]
        };
        const screensNamesList = Object.keys(this.screensList);
        let currentScreen = null;
        let indexOfScreenToCheck = 0;

        while (indexOfScreenToCheck < screensNamesList.length && !currentScreen) {
            console.log(`Check signature for ${screensNamesList[indexOfScreenToCheck]}`)
            this.consoleNodeLog(`Check signature for ${screensNamesList[indexOfScreenToCheck]}`);
            if (await this.checkSignature(this.screensList[screensNamesList[indexOfScreenToCheck]])) {
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
            const colorAtPoint = await screen.colorAt(coordHelper.relativeToAbsolute(signature[currentDotIndex].position, this.zeroCoords))
            this.consoleNodeLog(`Check color for {x: ${signature[currentDotIndex].position.x}, y: ${signature[currentDotIndex].position.y}} expected (R:${signature[currentDotIndex].color.R}, G:${signature[currentDotIndex].color.G}, B:${signature[currentDotIndex].color.B}) got: (R:${colorAtPoint.R}, G:${colorAtPoint.G}, B:${colorAtPoint.B})`);
            isValid = await isSameColourDot(
                signature[currentDotIndex].color,
                await screen.colorAt(coordHelper.relativeToAbsolute(signature[currentDotIndex].position, this.zeroCoords))
            )
            currentDotIndex = currentDotIndex + 1;
        }
        return isValid
    }

    getDotInfo = async () => {
        const position = await mouse.getPosition();
        const relativePOsition = coordHelper.absoluteToRelative(position, this.zeroCoords);
        const color = await screen.colorAt(position);

        this.consoleNodeLog(`{position: {x: ${relativePOsition.x}, y: ${relativePOsition.y}}, color: {R:${color.R}, G:${color.G}, B:${color.B}}}, `);
    }

    adjustIntialPosition = async (searchStartPosition, proposedDPI) => {
        this.zeroCoords = {x: searchStartPosition.x, y: searchStartPosition.y};
        this.proposedPlayerRegion = new Region(searchStartPosition.x, searchStartPosition.y, 540/proposedDPI, 960/proposedDPI);

        await screen.highlight(this.proposedPlayerRegion);

        /*for (let placeKey in this.zones) {
            for (let itemKey in this.zones[placeKey]) {
                this.consoleNodeLog(`this is ${placeKey} ${itemKey}`);
                await screen.highlight(this.zones[placeKey][itemKey]);
            }
        }*/
    }

    adjustIntialColours = async (searchStartPosition, proposedDPI) => {
        const beepBlue = await screen.colorAt(new Point(searchStartPosition.x+5, searchStartPosition.y+5))

        this.consoleNodeLog(`Got deep blue dot: (R:${beepBlue.R}, G:${beepBlue.G}, B:${beepBlue.B})`);
    }

    initializeSearchParameters = async (searchStartPosition, proposedDPI) => {
        await this.adjustIntialPosition(searchStartPosition, proposedDPI);
        await this.adjustIntialColours(searchStartPosition, proposedDPI);
        await this.recognizeScreen();
    }

    findSearchRegion = async () => {
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
        screen.config.highlightDurationMs = 2000;
        const proposedDPI = 1;
        this.consoleNodeLog(`DPI check got ${proposedDPI}`);

        this.consoleNodeLog("manual search for corner");
        let searchStartPosition = null;

        try {
            searchStartPosition = await getExactCornerCoords(await mouse.getPosition(), "bottomLeft");
        } catch (logoError) {
            this.consoleNodeLog(`failed to find corner ${logoError}`);
        }

        searchStartPosition.x = searchStartPosition.x+2/proposedDPI;
        searchStartPosition.y = searchStartPosition.y;

        await this.initializeSearchParameters(searchStartPosition, proposedDPI);

        return true;
    }
}



module.exports = whiteBlackListSeparator;