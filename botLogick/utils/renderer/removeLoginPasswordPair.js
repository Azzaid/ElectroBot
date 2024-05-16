const removeLoginPasswordInputPair = (index) => {
    console.log("remove pair");
    const loginInput = document.getElementById(`voterMail${index}`);
    const passwordInput = document.getElementById(`voterPassword${index}`);
    const holder = document.getElementById("voteCredencialsHolder");
    holder.removeChild(loginInput);
    holder.removeChild(passwordInput);
}

module.exports = removeLoginPasswordInputPair