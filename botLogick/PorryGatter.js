const {mouse, screen, straightTo, centerOf, left, right, up, down, Region, FileType } = require("@nut-tree/nut-js");
const repeatPromiseUntilResolved = require('repeat-promise-until-resolved');
const {performance} = require('perf_hooks');

class PorryGatter {
  constructor(window) {
    this.electronWindow = window;
    screen.config.resourceDirectory = `${__dirname}/assets`;
    screen.config.autoHighlight = true;
    screen.config.highlightDurationMs = 1000;
    mouse.config.autoDelayMs = 20;
    mouse.config.mouseSpeed = 70000;

    this.letterSearchRegion = new Region(40, 130, 150, 150);
    this.screenCaptureRegion = new Region(20, 30, 555, 960);

    this.consoleNodeClear = () => {
      this.electronWindow.webContents.send("log", {type: "clear"});
    }

    this.consoleNodeLog = (text) => {
      this.electronWindow.webContents.send("log", {type: "log", payload: text});
    }

    this.attemptNumber = 0;

    this.logFolder = "C:\\\\Users\\\\Johanas Azzaid\\\\Documents"

    this.isRolling = false;
    this.searchList = ["lion, tiger"];
    this.stopFlags = {};
  }


  setLogFolder = (newLogFolder => {
    this.logFolder = newLogFolder;
  })

  stop = () => {
    if (this.isRolling) {
      this.searchList.forEach((searchInstanceName) => {
        this.stopFlags[searchInstanceName] = true;
      })
      this.electronWindow.webContents.send("eye", "stop");
    }
  }

  stopOthers = () => {
    this.searchList.forEach((searchInstanceName) => {
      if (this.winnerSearchInstanceName !== searchInstanceName) this.stopFlags[searchInstanceName] = true;
    })
    this.winnerSearchInstanceName = null;
    this.electronWindow.webContents.send("eye", "stop");
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  rollower = async () => {
    this.consoleNodeClear();
    this.consoleNodeLog("waiting for a letter");
    screen.config.autoHighlight = false;
    screen.config.highlightDurationMs = 1;

    await mouse.move(straightTo(centerOf(this.letterSearchRegion)));

    this.isRolling = true;
    const onError = (error, attempt) => {
    }

    const onAttempt = (attempt) => {
      ++this.attemptNumber;
    }

    const shouldStop = (searchInstanceName) => (error) => {
      if (this.stopFlags[searchInstanceName]) {
        this.isRolling = false;
        this.stopFlags[searchInstanceName] = false;
        this.consoleNodeLog(`${searchInstanceName} stopped`);
        return true
      }
      return false
    }

    const searchInstances = this.searchList.map(searchInstanceName => {
      return (
        repeatPromiseUntilResolved( this.giveMeALetter(searchInstanceName),
          { maxAttempts: 5000000, delay: 100, timeout:5000000, onAttempt, onError, shouldStop: shouldStop(searchInstanceName)}
        )
      )
    })

    Promise.race(searchInstances).then(() => {
      this.stopOthers();
      this.consoleNodeLog('Victory!');
    }).catch(() => {
      this.consoleNodeLog('final fail', error);
    })
  }

  giveMeALetter = (searchInstanceName) => async () => {
    const start = performance.now();
    const foundSpot = await screen.find(`${searchInstanceName}letter.png`, {searchRegion: this.letterSearchRegion})
    const foundDuration = performance.now();
    await mouse.move(straightTo(centerOf(foundSpot)));
    const mouseMoveDuration = performance.now();
    //await screen.captureRegion(`gotLion_${this.attemptNumber}`, this.screenCaptureRegion, ".png", this.logFolder)
    await mouse.leftClick();
    const firstClickDuration = performance.now();
    //await mouse.move(straightTo(centerOf(this.xenter)));
    //await screen.captureRegion(`open_lion_${this.attemptNumber}`, this.screenCaptureRegion, ".png", this.logFolder)
    await mouse.leftClick();
    const secondClickDuration = performance.now();
    this.consoleNodeLog(`search took ${foundDuration - start}`);
    this.consoleNodeLog(`mouse move took ${mouseMoveDuration - foundDuration}`);
    this.consoleNodeLog(`click took ${firstClickDuration - mouseMoveDuration}`);
    this.consoleNodeLog(`second click took ${secondClickDuration - firstClickDuration}`);
    this.winnerSearchInstanceName = searchInstanceName;
  }

  highlightLetterRegion = async () => {
    screen.config.autoHighlight = true;
    screen.config.highlightDurationMs = 1000;

    if (false) {
      this.consoleNodeLog("search for blueStack logo");
      let logo = null;

      try {
        logo = await centerOf(screen.find(`blueStackLogo.png`));
      } catch (logoError) {
        this.consoleNodeLog("failed to find bluestack logo");
        this.consoleNodeLog(logoError);
      }

      this.letterSearchRegion = new Region(logo.x+130, logo.y+700, 80, 100);
      this.xenter = new Region(logo.x+210, logo.y+410, 10, 10);
      this.screenCaptureRegion = new Region(logo.x-10, logo.y-10, 500, 880);

      await screen.highlight(this.letterSearchRegion);
      await screen.highlight(this.xenter);

      this.consoleNodeLog("all found, ready to go");
      return true;
    } else {
      this.consoleNodeLog("search for chat logo");
      let logo = null;

      try {
        logo = await centerOf(screen.find(`chatLogo.png`));
      } catch (logoError) {
        this.consoleNodeLog("failed to find chat logo");
        this.consoleNodeLog(logoError);
      }

      this.letterSearchRegion = new Region(logo.x-350, logo.y+670, 80, 100);

      await screen.highlight(this.letterSearchRegion);

      this.consoleNodeLog("all found, ready to go");
      return true;
    }

  }
}

module.exports = PorryGatter;