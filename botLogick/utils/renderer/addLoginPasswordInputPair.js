const {ipcRenderer} = require("electron");
const addLoginPasswordInputPair = (index) => {
    console.log("add pair");
    const loginInput = document.createElement("input");
    loginInput.placeholder = `mail ${index}`;
    loginInput.id = `voterMail${index}`;
    loginInput.addEventListener('change', (event) => {
        ipcRenderer.send("voterControl", {type: "editAccount", payload: {fieldName: "email", index: index, value: event.target.value}});
    });

    const passwordInput = document.createElement("input");
    passwordInput.placeholder = `password ${index}`;
    passwordInput.id = `voterPassword${index}`;
    passwordInput.addEventListener('change',(event) => {
        ipcRenderer.send("voterControl", {type: "editAccount", payload: {fieldName: "password", index: index, value: event.target.value}});
    });

    const holder = document.getElementById("voteCredencialsHolder");
    holder.appendChild(loginInput);
    holder.appendChild(passwordInput);
    holder.appendChild(document.createElement("br"));
}

module.exports = addLoginPasswordInputPair