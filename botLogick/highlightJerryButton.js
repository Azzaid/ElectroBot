const {mouse, screen, straightTo, centerOf, left, right, up, down, Region, FileType } = require("@nut-tree/nut-js");
const {screen: electronScreen } = require('electron')
const repeatPromiseUntilResolved = require('repeat-promise-until-resolved');
const goals = require("./constants/goals");

class JerryRoller {
  constructor(window) {
    this.electronWindow = window;
    screen.config.resourceDirectory = `${__dirname}/assets`;
    screen.config.autoHighlight = true;
    screen.config.highlightDurationMs = 1000;
    mouse.config.mouseSpeed = 1000;

    this.firsStarSearchRegion = new Region(40, 130, 150, 150);
    this.sixsStarSearchRegion = new Region(330, 710, 40, 40);
    this.dressIconSearchRegion = new Region(85, 650, 60, 60);
    this.buttonSearchRegion = new Region(20, 30, 555, 960);

    this.consoleNodeClear = () => {
      this.electronWindow.webContents.send("log", {type: "clear"});
    }

    this.consoleNodeLog = (text) => {
      this.electronWindow.webContents.send("log", {type: "log", payload: text});
    }

    this.totalsObj = {
      totalRolls:0,
      totalNew:0,
      emptyRolls: 0,
      singleNewRolls: 0,
      doubleNewRolls: 0,
      tripleNewRolls: 0,
      NPR: 0,
      singleDressRolls:0,
      rollsTillNewDress:0,
      twoDressRolls:0,
      rollsTillTwoNewDress:0,
      prognosedRollsTillThreedDess: 0,
    };

    this.attemptNumber = 0;

    this.isRolling = false;
    this.stopFlagSet = false;
    this.serverPostfix = '';
    this.searchTarget = {
      sixStarNewDress:3,
      newDress:0,
      sixStarNew:0,
      new:0
    };
    this.logFolder = null;
    this.targetsList = ["sixStarNew", "sixStarNew", "sixStarNew"];
  }

  checkSearchTarget = (stepTotals) => {
    //this.consoleNodeLog(`check new ${stepTotals.new} aganist ${this.searchTarget.new}`);
    return !!(stepTotals.new >= this.searchTarget.new &&
        stepTotals.newDress >= this.searchTarget.newDress &&
        stepTotals.sixStarNew >= this.searchTarget.sixStarNew &&
        stepTotals.sixStarNewDress >= this.searchTarget.sixStarNewDress)
  }
  
  setSearchTarget = ({index, value}) => {
    this.targetsList[index] = value;
    this.searchTarget = {
      sixStarNewDress:0,
      newDress:0,
      sixStarNew:0,
      new:0
    };
    this.targetsList.forEach(target => {this.searchTarget[target]++})
  }

  setLogFolder = (newLogFolder => {
    this.logFolder = newLogFolder;
  })

  setServer = (newServerPostfix) => {
    this.serverPostfix = newServerPostfix;
  }

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

  rollower = async () => {
    this.consoleNodeLog("operation started");
    await this.highlightSearchRegion();
    screen.config.autoHighlight = false;
    screen.config.highlightDurationMs = 1;

    this.isRolling = true;
    const onError = (error, attempt) => {
      this.consoleNodeLog(`attemp number ${attempt} failed ${error}`);
    }

    const onAttempt = (attempt) => {
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
        { maxAttempts: 5000, delay: 1000, timeout:500000000, onAttempt, onError, shouldStop}
      );
      this.consoleNodeLog('Victory!')
      this.electronWindow.webContents.send("eye", "stop");
    } catch (error) {
      this.consoleNodeLog('final fail', error)
      this.electronWindow.webContents.send("eye", "stop");
    }
  }

  rollJerry = async () => {
    this.totalsObj.emptyRolls = this.totalsObj.totalRolls -
      (this.totalsObj.singleNewRolls + this.totalsObj.doubleNewRolls + this.totalsObj.tripleNewRolls);
    this.totalsObj.rollsTillNewDress = (this.totalsObj.totalRolls / this.totalsObj.singleDressRolls).toFixed(2);
    this.totalsObj.rollsTillTwoNewDress = (this.totalsObj.totalRolls / this.totalsObj.twoDressRolls).toFixed(2);
    this.totalsObj.prognosedRollsTillThreedDess = this.totalsObj.rollsTillNewDress * this.totalsObj.rollsTillTwoNewDress;
    this.totalsObj.NPR = this.totalsObj.totalRolls / this.totalsObj.totalNew;
    this.electronWindow.webContents.send("log", {type: "updateTotals", payload: this.totalsObj});
    this.totalsObj.totalRolls = this.totalsObj.totalRolls + 1;
    this.consoleNodeClear();
    this.consoleNodeLog(`start another roll aim for ${this.searchTarget.name}`);
    let tryAgainButton = centerOf(this.buttonSearchRegion);





    try {
      tryAgainButton = await screen.find("tryAgainButton.png", {searchRegion: this.buttonSearchRegion});
    } catch (error) {
      this.consoleNodeLog("Not found try again button");
      throw new Error("Try again button not found");
    }




    this.consoleNodeLog("click try again");
    await this.clickOn(tryAgainButton);

    this.consoleNodeLog("wait for jerry to pop");
    await this.sleep(7000);
    let stepTotals = {
      sixStarNewDress:3,
      newDress:0,
      sixStarNew:0,
      new:0,
    }





    this.consoleNodeLog("first check");
    await screen.find("StarCenter.png", {searchRegion: this.firsStarSearchRegion});
    stepTotals.new++;
    this.totalsObj.totalNew = this.totalsObj.totalNew + 1;
    this.totalsObj.singleNewRolls = this.totalsObj.singleNewRolls + 1;
    this.consoleNodeLog("found new");

    let sixStar = false;
    try {
      await screen.find("StarCenter.png", {searchRegion: this.sixsStarSearchRegion});
      this.consoleNodeLog("found six star");
      stepTotals.sixStarNew++;
      sixStar = true;
    } catch (e) {
      this.consoleNodeLog("error! not a six star");
    }

    try {
      await screen.find("dressIcon.png", {searchRegion: this.dressIconSearchRegion});
      this.consoleNodeLog("found dress");

      this.totalsObj.singleDressRolls = this.totalsObj.singleDressRolls + 1;
      stepTotals.newDress++;
      if (sixStar) {
        stepTotals.sixStarNewDress++;
      }
    } catch (e) {
      this.consoleNodeLog("error! not a dress");
    }


    if (this.checkSearchTarget(stepTotals)) return true


    this.consoleNodeLog("dismiss new screen");
    await this.clickOn(tryAgainButton);

    this.consoleNodeLog("wait for second new screen");
    await this.sleep(6000);







    this.consoleNodeLog("second check");
    await screen.find("StarCenter.png", {searchRegion: this.firsStarSearchRegion});
    stepTotals.new++;
    this.totalsObj.totalNew = this.totalsObj.totalNew + 1;
    this.totalsObj.doubleNewRolls = this.totalsObj.doubleNewRolls + 1;
    this.totalsObj.singleNewRolls = this.totalsObj.singleNewRolls - 1;
    this.consoleNodeLog("found second new");





    sixStar = false;
    try {
      await screen.find("StarCenter.png", {searchRegion: this.sixsStarSearchRegion});
      this.consoleNodeLog("found six star");
      stepTotals.sixStarNew++;
      sixStar = true;
    } catch (e) {
      this.consoleNodeLog("error! not a six star");
    }

    try {
      await screen.find("dressIcon.png", {searchRegion: this.dressIconSearchRegion});
      this.consoleNodeLog("found dress");

      this.totalsObj.singleDressRolls = this.totalsObj.singleDressRolls + 1;
      stepTotals.newDress++;

      if (sixStar) {
        stepTotals.sixStarNewDress++;
        if (stepTotals.sixStarNewDress === 1) {
          this.totalsObj.twoDressRolls = this.totalsObj.twoDressRolls + 1;
          this.totalsObj.singleDressRolls = this.totalsObj.singleDressRolls - 1;
          this.consoleNodeLog("this is second dress");
        } else {
          this.totalsObj.singleDressRolls = this.totalsObj.singleDressRolls + 1;
        }
      }
    } catch (e) {
      this.consoleNodeLog("error! not a dress");
    }


    if (this.checkSearchTarget(stepTotals)) return true



    this.consoleNodeLog("dismiss second new screen");
    await this.clickOn(tryAgainButton);

    this.consoleNodeLog("wait for third new screen");
    await this.sleep(6000);


    if (stepTotals.sixStarNewDress === 2) {
      if (this.logFolder) {
        await screen.captureRegion(`twoDressRoll_${this.attemptNumber}`, this.proposedPlayerRegion, ".png", this.logFolder)
      }
    }




    await screen.find("StarCenter.png", {searchRegion: this.firsStarSearchRegion});
    stepTotals.sixStarNew++;
    this.totalsObj.totalNew = this.totalsObj.totalNew + 1;
    this.totalsObj.tripleNewRolls = this.totalsObj.tripleNewRolls + 1;
    this.totalsObj.doubleNewRolls = this.totalsObj.doubleNewRolls - 1;
    this.consoleNodeLog("found third new");




    sixStar = false;
    try {
      await screen.find("StarCenter.png", {searchRegion: this.sixsStarSearchRegion});
      this.consoleNodeLog("found six star");
      stepTotals.sixStarNew++;
      sixStar = true;
    } catch (e) {
      this.consoleNodeLog("error! not a six star");
    }

    try {
      await screen.find("dressIcon.png", {searchRegion: this.dressIconSearchRegion});
      this.consoleNodeLog("found dress");

      this.totalsObj.singleDressRolls = this.totalsObj.singleDressRolls + 1;
      stepTotals.newDress++;

      if (sixStar) {
        stepTotals.sixStarNewDress++;
        if (stepTotals.sixStarNewDress === 2) {
          this.consoleNodeLog("this is third dress");
        } else if (stepTotals.sixStarNewDress === 1) {
          this.totalsObj.twoDressRolls = this.totalsObj.twoDressRolls + 1;
          this.totalsObj.singleDressRolls = this.totalsObj.singleDressRolls - 1;
          this.consoleNodeLog("this is second dress");
        } else {
          this.totalsObj.singleDressRolls = this.totalsObj.singleDressRolls + 1;
          this.consoleNodeLog("this is first dress");
        }
      }
    } catch (e) {
      this.consoleNodeLog("error! not a dress");
    }



    this.consoleNodeLog("dismiss third new screen");
    await this.clickOn(tryAgainButton);

    this.consoleNodeLog("wait for finish");
    await this.sleep(4000);



    if (stepTotals.sixStarNewDress === 2 || stepTotals.sixStarNewDress === 3) {
      if (this.logFolder) {
        await screen.captureRegion(`twoDressRoll_${this.attemptNumber}`, this.proposedPlayerRegion, ".png", this.logFolder)
      }
    }
    if (this.logFolder) {
      await screen.captureRegion(`threeNewRoll_${this.attemptNumber}`, this.proposedPlayerRegion, ".png", this.logFolder)
    }

    if (this.checkSearchTarget(stepTotals)) return true

    throw new Error(`found only ${stepTotals.sixStarNewDress} dresses`);
  }

  highlightSearchRegion = async () => {
    const proposedDPI = 1;    this.consoleNodeLog(`DPI check got ${proposedDPI}`);

    this.consoleNodeLog("search for nox logo");
    let logo = null;

    try {
      logo = await centerOf(screen.find(`Nox.png`));
    } catch (logoError) {
      this.consoleNodeLog("failed to find nox logo");
    }

    this.proposedPlayerRegion = new Region(logo.x-20/proposedDPI, logo.y+17/proposedDPI, 540/proposedDPI, 960/proposedDPI);
    this.buttonSearchRegion = new Region(logo.x+450/proposedDPI, logo.y+880/proposedDPI, 30/proposedDPI, 30/proposedDPI);
    this.firsStarSearchRegion = new Region(logo.x+140/proposedDPI, logo.y+700/proposedDPI, 40/proposedDPI, 40/proposedDPI);
    this.sixsStarSearchRegion = new Region(logo.x+317/proposedDPI, logo.y+700/proposedDPI, 40/proposedDPI, 40/proposedDPI);
    this.dressIconSearchRegion = new Region(logo.x+100/proposedDPI, logo.y+697/proposedDPI, 40/proposedDPI, 40/proposedDPI);

    await screen.highlight(this.proposedPlayerRegion);

    return true;
  }

  testDressRecognition = async () => {
    this.consoleNodeClear();
    await this.highlightSearchRegion();

    this.consoleNodeLog("check try again recognition");

    await screen.highlight(this.buttonSearchRegion);

    try {
      await screen.find("tryAgainButton.png", {searchRegion: this.buttonSearchRegion});
      this.consoleNodeLog("found try again button");
    } catch (e) {
      this.consoleNodeLog("failed to detect try again button");
    }

    this.consoleNodeLog("check dress recognition");

    await screen.highlight(this.firsStarSearchRegion);

    try {
      await screen.find("StarCenter.png", {searchRegion: this.firsStarSearchRegion});
      this.consoleNodeLog("found first star");
    } catch (e) {
      this.consoleNodeLog("failed to first star");
    }

    await screen.highlight(this.sixsStarSearchRegion);

    try {
      await screen.find("StarCenter.png", {searchRegion: this.sixsStarSearchRegion});
      this.consoleNodeLog("found six star");
    } catch (e) {
      this.consoleNodeLog("failed to detect six star");
    }

    await screen.highlight(this.dressIconSearchRegion);

    try {
      await screen.find("dressIcon.png", {searchRegion: this.dressIconSearchRegion});
      this.consoleNodeLog("found dress");
    } catch (e) {
      this.consoleNodeLog("failed to detect dress icon");
    }
  }
}



module.exports = JerryRoller;