const {ipcRenderer, ipcMain, app} = require("electron");
const goals = require("./botLogick/constants/goals");

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
    consoleNode.appendChild(logImage);
}

const eye = document.getElementById("eye");

ipcRenderer.on("eye", (event, args) => {
    console.log('eye channel', args);
    consoleNodeLog("eye chanel in renderer");
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