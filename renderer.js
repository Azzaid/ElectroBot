const {ipcRenderer, ipcMain, app} = require("electron");
const goals = require("./botLogick/constants/goals");
const addLoginPasswordInputPair = require("./botLogick/utils/renderer/addLoginPasswordInputPair");
const removeLoginPasswordInputPair = require("./botLogick/utils/renderer/removeLoginPasswordPair");

const totalsHolder = document.getElementById('totals');
let totalsObj = {};
const updateTotals = () => {
    totalsHolder.innerHTML='';
    Object.keys(totalsObj).forEach(totalsKey => {
        const totalRow = document.createElement("tr");
        const name = document.createElement("td");
        name.innerText = totalsKey;
        totalRow.appendChild(name);
        const value = document.createElement("td");
        value.innerText = totalsObj[totalsKey];
        totalRow.appendChild(value);
        totalsHolder.appendChild(totalRow);
    })
}

const start = document.getElementById('start');
start.onclick = () => {
    ipcRenderer.send("eye", "open");
    ipcRenderer.send("control", "start");
    ipcRenderer.send("eye", "wander");
}

const stop = document.getElementById('stop');
stop.onclick = () => {
    ipcRenderer.send("control", "stop");
}

const logFolder = document.getElementById("logFolder");
logFolder.onclick = () => {
    ipcRenderer.send("control", "logFolder");
}

const searchTarget1 = document.getElementById("searchTarget1");
searchTarget1.onchange = (event) => {
    ipcRenderer.send("control", {type:"searchTarget", payload: {index:0, value:event.target.value}});
}
const searchTarget2 = document.getElementById("searchTarget2");
searchTarget2.onchange = (event) => {
    ipcRenderer.send("control", {type:"searchTarget", payload: {index:1, value:event.target.value}});
}
const searchTarget3 = document.getElementById("searchTarget3");
searchTarget3.onchange = (event) => {
    ipcRenderer.send("control", {type:"searchTarget", payload: {index:2, value:event.target.value}});
}

const test = document.getElementById('test');
test.onclick = () => {
    ipcRenderer.send("control", "test");
    ipcRenderer.send("eye", "open");
}

const ready = document.getElementById('ready');
ready.onclick = () => {
    ipcRenderer.send("control", "ready");
    ipcRenderer.send("eye", "open");
}

const steady = document.getElementById('steady');
steady.onclick = () => {
    ipcRenderer.send("control", "steady");
    ipcRenderer.send("eye", "wander");
}

const medvedi = document.getElementById('medvedi');
medvedi.onclick = () => {
    ipcRenderer.send("control", "medvedi");
    ipcRenderer.send("eye", "stop");
}

const prepareSpy = document.getElementById('prepareSpy');
prepareSpy.onclick = () => {
    ipcRenderer.send("eye", "open");
    ipcRenderer.send("control", "prepareSpy");
}

const sendSpy = document.getElementById('sendSpy');
sendSpy.onclick = () => {
    ipcRenderer.send("eye", "wander");
    ipcRenderer.send("control", "sendSpy");
}

const withdrawSpy = document.getElementById('withdrawSpy');
withdrawSpy.onclick = () => {
    ipcRenderer.send("eye", "stop");
    ipcRenderer.send("control", "withdrawSpy");
}

const consoleNode = document.getElementById("console")
const consoleNodeClear = () => {
    console.log('/////////////////////////////////////clear console///////////////////////////////////////////')
    consoleNode.innerHTML = '';
}

const consoleNodeLog = (text) => {
    console.log(text);
    const logDiv = document.createElement("div");
    logDiv.innerText = text;
    consoleNode.appendChild(logDiv);
}

const consoleNodeAddImage = (imageUrl) => {
    const logImage = document.createElement("img");
    logImage.src = imageUrl;
    logImage.classList.add("testImage");
    consoleNode.appendChild(logImage);
}

const eye = document.getElementById("eye");

ipcRenderer.on("eye", (event, args) => {
    console.log('eye channel', args);
    //consoleNodeLog("eye chanel in renderer");
    if (args === "open") {
        eye.classList.remove("close");
    }
    if (args === "wander") {
        eye.classList.remove("close");
        eye.classList.add("wander");
    }
    if (args === "stop") {
        eye.classList.remove("wander");
    }
    if (args === "close") {
        eye.classList.add("close");
    }
});

ipcRenderer.on("log", (event, args) => {
    console.log('log channel in renderer', event, args);
    if (args.type === "clear") {
        consoleNodeClear();
    }
    if (args.type === "log") {
        consoleNodeLog(args.payload);
    }
    if (args.type === "addImage") {
        consoleNodeAddImage(args.payload);
    }
    if (args.type === "updateTotals") {
        totalsObj = {...totalsObj, ...args.payload};
        updateTotals();
    }
});

document.getElementById('LDPlayer').onchange = () => {
    ipcRenderer.send("voterControl", {type: "choosePlayer", payload: "LDPlayer"});
}
document.getElementById('Nox').onchange = () => {
    ipcRenderer.send("voterControl", {type: "choosePlayer", payload: "Nox"});
}

const testWB = document.getElementById('testWB');
testWB.onclick = () => {
    ipcRenderer.send("voterControl", {type: "testWB"});
}

const learnWB = document.getElementById('learnWB');
learnWB.onclick = () => {
    ipcRenderer.send("voterControl", {type: "startWB", payload: false});
}

const startWB = document.getElementById('startWB');
startWB.onclick = () => {
    ipcRenderer.send("voterControl", {type: "startWB", payload: true});
}

const stopWB = document.getElementById('stopWB');
stopWB.onclick = () => {
    ipcRenderer.send("voterControl", {type: "stop"});
}

const addVoteCredentials = document.getElementById('addVoteCredentials');
addVoteCredentials.onclick = () => {
    ipcRenderer.send("voterControl", {type: "addAccount"});
}

const removeVoteCredentials = document.getElementById('removeVoteCredentials');
removeVoteCredentials.onclick = () => {
    ipcRenderer.send("voterControl", {type: "removeAccount"});
}

//setBlack/white list and name for left work
document.getElementById('toggleLeftBlack').onchange = () => {
    ipcRenderer.send("voterControl", {type: "setWorkDecision", payload: {work: "left", fieldName: "list", value: "black"}});
}
document.getElementById('toggleLeftZero').onchange = () => {
    ipcRenderer.send("voterControl", {type: "setWorkDecision", payload: {work: "left", fieldName: "list", value: ""}});
}
document.getElementById('toggleLeftWhite').onchange = () => {
    ipcRenderer.send("voterControl", {type: "setWorkDecision", payload: {work: "left", fieldName: "list", value: "white"}});
}
document.getElementById('leftWorkName').onchange = (event) => {
    ipcRenderer.send("voterControl", {type: "setWorkDecision", payload: {work: "left", fieldName: "name", value: event.target.value}});
}

//setBlack/white list and name for right work
document.getElementById('toggleRightBlack').onchange = () => {
    ipcRenderer.send("voterControl", {type: "setWorkDecision", payload: {work: "right", fieldName: "list", value: "black"}});
}
document.getElementById('toggleRightZero').onchange = () => {
    ipcRenderer.send("voterControl", {type: "setWorkDecision", payload: {work: "right", fieldName: "list", value: ""}});
}
document.getElementById('toggleRightWhite').onchange = () => {
    ipcRenderer.send("voterControl", {type: "setWorkDecision", payload: {work: "right", fieldName: "list", value: "white"}});
}
document.getElementById('rightWorkName').onchange = (event) => {
    ipcRenderer.send("voterControl", {type: "setWorkDecision", payload: {work: "right", fieldName: "name", value: event.target.value}});
}

document.getElementById('submitDecision').onclick = (event) => {
    ipcRenderer.send("voterControl", {type: "submitDecision"});
}

document.getElementById('justVoteLeft').onclick = (event) => {
    ipcRenderer.send("voterControl", {type: "voteWithoutDecision", payload:{decision: "left"}});
}
document.getElementById('justSkip').onclick = (event) => {
    ipcRenderer.send("voterControl", {type: "voteWithoutDecision", payload:{decision: "skip"}});
}
document.getElementById('jusVoteRight').onclick = (event) => {
    ipcRenderer.send("voterControl", {type: "voteWithoutDecision", payload:{decision: "right"}});
}

ipcRenderer.on("voterControl", (event, args) => {
    console.log('voterControl channel', args);
    //consoleNodeLog(`voter control chanel in renderer ${args.type}`);
    switch (args.type) {
        case "rendererAddAccount": {
            addLoginPasswordInputPair.call(this, args.payload.index);
            return true;
        }
        case "rendererRemoveAccount": {
            removeLoginPasswordInputPair.call(this, args.payload.index);
            return true;
        }
        case "rendererResetWorkDecisionState": {
            document.getElementById('toggleRightZero').checked = true;
            document.getElementById('toggleLeftZero').checked = true;
            document.getElementById('rightWorkName').value = "";
            document.getElementById('leftWorkName').value = "";
            document.getElementById("voteControlWrapper").classList.remove("expanded");
            return true
        }
        case "renderedCloseInstructionsDropdown": {
            document.getElementById("instructionWrapper3").classList.remove("expanded");
            return true
        }
        case "renderedSetVoteImage": {
            document.getElementById("voteControlWrapper").classList.add("expanded");
            document.getElementById("voteHelpImage").src = args.payload.imageUrl;
            return true
        }
        case "rendererUpdateTimer": {
            document.getElementById("voterDecisionTimer").innerText = args.payload.time;
            return true
        }
        default: {
            consoleNodeLog(`unfair vote unhandled command ${args.type}`);
            return true;
        }
    }
});

document.getElementById("instructionHeader1").addEventListener("click",
  () => {
    console.log("run expanded");
    document.getElementById("instructionWrapper1").classList.toggle("expanded")
})

document.getElementById("instructionHeader2").addEventListener("click",
  () => {
      console.log("run expanded");
      document.getElementById("instructionWrapper2").classList.toggle("expanded")
  }
)

document.getElementById("instructionHeader3").addEventListener("click",
    () => {
        console.log("run expanded");
        document.getElementById("instructionWrapper3").classList.toggle("expanded")
    })