const {mouse, screen, straightTo, centerOf, left, right, up, down, Region, FileType } = require("@nut-tree/nut-js");
const {screen: electronScreen } = require('electron')
const repeatPromiseUntilResolved = require('repeat-promise-until-resolved');
const { createWorker } = require('tesseract.js');
const excelWriter = require('excel4node');

class leatherboardScreener {
    constructor(window) {
        this.electronWindow = window;
        screen.config.resourceDirectory = `${__dirname}/temporaryAssets`;
        screen.config.autoHighlight = true;
        screen.config.highlightDurationMs = 1000;
        mouse.config.mouseSpeed = 1000;

        this.firstPlaceDickPickArea = new Region(40, 130, 150, 150);
        this.secondPlaceDickPickArea = new Region(40, 130, 150, 150);

        this.firstPlaceScoreScreenRegion = new Region(40, 130, 150, 150);
        this.secondPlaceScoreScreenRegion = new Region(330, 710, 40, 40);

        this.firstPlaceScoreSearchRegion = new Region(40, 130, 150, 150);
        this.secondPlaceScoreSearchRegion = new Region(330, 710, 40, 40);

        this.refreshButtonClickRegion =  new Region(330, 710, 40, 40);

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
        this.guildNamesList = ["sleepless", "lotus"];
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

    uploadToExcell(fileName = 'Excel.xlsx') {
        // Create a new instance of a Workbook class
        const workBook = new excelWriter.Workbook();

        // Add Worksheets to the workbook
        const worksheet = workBook.addWorksheet('Sheet 1');

        worksheet.cell(1, 1)
            .string('Place');
        worksheet.cell(1, 2)
            .string('New result');
        worksheet.cell(1, 3)
            .string('Time');

        this.resultsList.forEach((result, index) => {
            worksheet.cell(index + 2, 1)
                .number(result.place);
            worksheet.cell(index + 2, 2)
                .string(result.newResult);
            worksheet.cell(index + 2, 3)
                .string(result.time);
        })

        workBook.write('Excel.xlsx');
    }

    rollower = async () => {
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
                attemptWorkSheet:this.excelLogWorkBook.addWorksheet(`${guildName}Results`),
                resultWorkSheet:this.excelLogWorkBook.addWorksheet(`${guildName}Atttempts`),
            }

            guildData.attemptWorkSheet.cell(1, 1).string("Attempt");
            guildData.attemptWorkSheet.cell(1, 2).string("Result number");
            guildData.attemptWorkSheet.cell(1, 3).string("Result image");
            guildData.attemptWorkSheet.cell(1, 4).string("Example number");
            guildData.attemptWorkSheet.cell(1, 5).string("Example image");

            guildData.resultWorkSheet.cell(1, 1).string('Place');
            guildData.resultWorkSheet.cell(1, 2).string('New result');
            guildData.resultWorkSheet.cell(1, 3).string('Time');

            this.guildsList.push(guildData);
        })

        try {
            this.teseractWorker = await createWorker({
                langPath: `./langData`,
                logger: m => console.log(m),
                gzip: false,
                workerBlobURL: false
            });
            /*this.teseractWorker = await createWorker({
                workerPath: "./node_modules/tesseract.js/dist/worker.min.js",
                // Unlike when used in a browser, corePath and langPath are resolved relative the worker using Electron.
                corePath: "./node_modules/tesseract.js-core/",
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

    checkGuildPlace = async (guildData) => {
        try {
            await screen.find(`${guildData.name}DickPick.png`, {searchRegion: this.firstPlaceDickPickArea});
            this.consoleNodeLog(`${guildData.name} is first`);
            guildData.place = 1;
        } catch (error) {
            this.consoleNodeLog(`${guildData.name} not first`);
            try {
                await screen.find(`${guildData.name}DickPick.png`, {searchRegion: this.secondPlaceDickPickArea});
                this.consoleNodeLog(`${guildData.name} is second`);
                guildData.place = 2;
            } catch (error) {
                this.consoleNodeLog(`Where is ${guildData.name}?`);
                throw new Error(`${guildData.name} fucking lost`);
            }
        }
    }

    checkGuildState = async (guildData) => {
        await screen.captureRegion(`${guildData.name}_comparedScore_${this.attemptNumber}`, guildData.place === 1 ? this.firstPlaceScoreScreenRegion : this.secondPlaceScoreScreenRegion, ".png", screen.config.resourceDirectory);
        const { data: { text : currentValue } } = await this.teseractWorker.recognize(`./botLogick/temporaryAssets/${guildData.name}_comparedScore_${this.attemptNumber}.png`);

        guildData.attemptWorkSheet.cell(this.attemptNumber + 2, 1).number(this.attemptNumber);
        guildData.attemptWorkSheet.cell(this.attemptNumber + 2, 2).string(currentValue);
        guildData.attemptWorkSheet.addImage({
            path: `./botLogick/temporaryAssets/${guildData.name}_comparedScore_${this.attemptNumber}.png`,
            type: 'picture',
            position: {
                type: 'oneCellAnchor',
                from: {
                    col: 3,
                    colOff: 0,
                    row: this.attemptNumber + 2,
                    rowOff: 0,
                },
            },
        });
        guildData.attemptWorkSheet.cell(this.attemptNumber + 2, 4).string(guildData.lastAttemptResult);
        guildData.attemptWorkSheet.addImage({
            path: `./botLogick/temporaryAssets/${guildData.name}_previousScore_${guildData.changesAmount}.png`,
            type: 'picture',
            position: {
                type: 'oneCellAnchor',
                from: {
                    col: 5,
                    colOff: 0,
                    row: this.attemptNumber + 2,
                    rowOff: 0,
                },
            },
        });

        try {
            await screen.find(`${guildData.name}_previousScore_${guildData.changesAmount}.png`, {searchRegion: guildData.place === 1 ? this.firstPlaceScoreSearchRegion : this.secondPlaceScoreSearchRegion});
            if (guildData.lastAttemptResult !== currentValue) throw new Error("");
            this.consoleNodeLog(`${guildData.name} score is same ${guildData.lastAttemptResult} vs ${currentValue}`);
            this.consoleNodeLog("Compared");
            this.consoleNodeImage(`botLogick/temporaryAssets/${guildData.name}_comparedScore_${this.attemptNumber}.png`);
            this.consoleNodeLog("with");
            this.consoleNodeImage(`botLogick/temporaryAssets/${guildData.name}_previousScore_${guildData.changesAmount}.png`);
        } catch (error) {
            this.consoleNodeLog(`${guildData.name} score is new ${guildData.lastAttemptResult} vs ${currentValue}`);
            this.consoleNodeImage(`botLogick/temporaryAssets/${guildData.name}_comparedScore_${this.attemptNumber}.png`);
            this.consoleNodeLog("with");
            this.consoleNodeImage(`botLogick/temporaryAssets/${guildData.name}_previousScore_${guildData.changesAmount}.png`);
            guildData.changesAmount = guildData.changesAmount + 1;
            guildData.lastAttemptResult = currentValue;
            await screen.captureRegion(`${guildData.name}_previousScore_${guildData.changesAmount}`, guildData.place === 1 ? this.firstPlaceScoreScreenRegion : this.secondPlaceScoreScreenRegion, ".png", screen.config.resourceDirectory);
            const { data: { text } } = await this.teseractWorker.recognize(`./botLogick/temporaryAssets/${guildData.name}_previousScore_${guildData.changesAmount}.png`);

            guildData.resultWorkSheet.cell(guildData.changesAmount + 2, 1).number(guildData.place);
            guildData.resultWorkSheet.cell(guildData.changesAmount + 2, 2).string(text);
            guildData.resultWorkSheet.cell(guildData.changesAmount + 2, 3).string((new Date()).toString());

            this.consoleNodeLog(`Numbers is ${text}`);
            await screen.captureRegion(`${guildData.name}_change_${guildData.changesAmount}`, this.proposedPlayerRegion, ".png", this.logFolder);
        }
    };

    rollJerry = async () => {
        this.consoleNodeLog(`Attempt nr${this.attemptNumber} so far got ${this.changesAmount} changes`);

        /*await Promise.all(this.guildsList.map(async (guildData, index) => {
            await this.checkGuildPlace(guildData);
            await this.checkGuildState(guildData)
        }));*/

        await this.checkGuildPlace(this.guildsList[0]);
        await this.checkGuildPlace(this.guildsList[1]);

        await this.checkGuildState(this.guildsList[0]);
        await this.checkGuildState(this.guildsList[1]);

        await this.clickOn(this.refreshButtonClickRegion);
        this.consoleNodeLog("Sleep");
        throw new Error("and again");
    }

    highlightSearchRegion = async () => {
        screen.config.highlightDurationMs = 2000;
        const proposedDPI = 1;
        this.consoleNodeLog(`DPI check got ${proposedDPI}`);

        this.consoleNodeLog("slls search for nox logo");
        let logo = null;

        try {
            logo = await centerOf(screen.find(`Nox.png`));
        } catch (logoError) {
            this.consoleNodeLog("slls failed to find nox logo");
        }

        this.proposedPlayerRegion = new Region(logo.x-20/proposedDPI, logo.y+17/proposedDPI, 540/proposedDPI, 960/proposedDPI);
        this.firstPlaceDickPickArea = new Region(logo.x+215/proposedDPI, logo.y+260/proposedDPI, 80/proposedDPI, 80/proposedDPI);
        this.secondPlaceDickPickArea = new Region(logo.x+70/proposedDPI, logo.y+295/proposedDPI, 80/proposedDPI, 80/proposedDPI);
        this.firstPlaceScoreScreenRegion = new Region(logo.x+205/proposedDPI, logo.y+504/proposedDPI, 80/proposedDPI, 22/proposedDPI);
        this.secondPlaceScoreScreenRegion = new Region(logo.x+63/proposedDPI, logo.y+512/proposedDPI, 80/proposedDPI, 22/proposedDPI);
        this.firstPlaceScoreSearchRegion = new Region(logo.x+195/proposedDPI, logo.y+495/proposedDPI, 100/proposedDPI, 40/proposedDPI);
        this.secondPlaceScoreSearchRegion = new Region(logo.x+55/proposedDPI, logo.y+505/proposedDPI, 100/proposedDPI, 40/proposedDPI);
        this.refreshButtonClickRegion = new Region(logo.x+5/proposedDPI, logo.y+175/proposedDPI, 30/proposedDPI, 30/proposedDPI);

        await screen.highlight(this.proposedPlayerRegion);
        await screen.highlight(this.firstPlaceDickPickArea);
        await screen.highlight(this.secondPlaceDickPickArea);
        await screen.highlight(this.firstPlaceScoreSearchRegion);
        await screen.highlight(this.secondPlaceScoreSearchRegion);
        await screen.highlight(this.refreshButtonClickRegion);

        return true;
    }
}



module.exports = leatherboardScreener;